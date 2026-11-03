import { getCorsHeaders, getSupabaseConfig, supabaseRest, supabaseStorageUpload } from './_supabase.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const corsHeaders = getCorsHeaders(request);

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const userId = formData.get('userId');
    const panelId = formData.get('panelId');
    const category = formData.get('category') || 'material';
    const title = formData.get('title');

    if (!file || !userId) {
      return new Response(JSON.stringify({ error: 'Arquivo e identificador do usuário são obrigatórios.' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Validação estrita de plano: o upload autônomo no painel é restrito ao plano Prime
    let userPanel = null;
    if (panelId && panelId !== 'default-panel') {
      try {
        const panels = await supabaseRest(env, `/user_panels?id=eq.${encodeURIComponent(panelId)}`);
        if (Array.isArray(panels) && panels.length > 0) userPanel = panels[0];
      } catch (_) {}
    }
    if (!userPanel && userId && userId !== 'default-user') {
      try {
        const panels = await supabaseRest(env, `/user_panels?user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=1`);
        if (Array.isArray(panels) && panels.length > 0) userPanel = panels[0];
      } catch (_) {}
    }

    // Se ainda não encontrou o painel, busca na tabela de ordens de pagamento
    let userOrder = null;
    if (!userPanel && userId && userId !== 'default-user') {
      try {
        const orders = await supabaseRest(env, `/orders?user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=1`);
        if (Array.isArray(orders) && orders.length > 0) userOrder = orders[0];
      } catch (_) {}
    }

    const planTier = (userPanel?.plan_tier || userOrder?.plan_tier || '').toLowerCase();
    const isEditalCategory = String(category || '').toLowerCase() === 'edital';
    if (planTier !== 'prime' && !isEditalCategory) {
      return new Response(JSON.stringify({ 
        error: 'O envio de apostilas e materiais pessoais pelo painel é um recurso exclusivo do Plano CRIVOS PRIME. O envio de Editais (PDF) é liberado para todos os planos.' 
      }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    const resolvedUserId = (userId && userId !== 'default-user') ? userId : (userPanel?.user_id || userOrder?.user_id || userId);
    const resolvedPanelId = (panelId && panelId !== 'default-panel') ? panelId : (userPanel?.id || null);

    const filename = file.name || 'material_candidato.pdf';
    const sanitizedFileName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${resolvedUserId}/${Date.now()}_${sanitizedFileName}`;
    const mimeType = file.type || 'application/pdf';
    const buffer = await file.arrayBuffer();
    const fileBytes = new Uint8Array(buffer);

    // Upload seguro para o bucket público user-materials
    await supabaseStorageUpload(
      env,
      'user-materials',
      storagePath,
      fileBytes,
      mimeType
    );

    const { url } = getSupabaseConfig(env);
    const publicUrl = `${url.replace(/\/+$/, '')}/storage/v1/object/public/user-materials/${storagePath}`;

    // Cadastra o registro em user_files
    const insertPayload = {
      user_id: resolvedUserId,
      panel_id: resolvedPanelId,
      category: category,
      title: title || filename.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
      filename: filename,
      storage_path: storagePath,
      storage_url: publicUrl,
      priority: 'ESSENCIAL',
      file_size_bytes: file.size || buffer.byteLength || 0,
      page_offset: 0,
      sort_order: 10
    };

    const inserted = await supabaseRest(env, '/user_files', {
      method: 'POST',
      body: insertPayload,
      prefer: 'return=representation'
    });

    return new Response(
      JSON.stringify({
        success: true,
        file: Array.isArray(inserted) && inserted.length > 0 ? inserted[0] : insertPayload
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    console.error('[upload-student-file] Erro ao enviar arquivo:', err);
    return new Response(
      JSON.stringify({ 
        error: err.message || 'Falha interna ao processar upload do arquivo.', 
        details: err.stack || err.details || err.message 
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function onRequestOptions(context) {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(context.request),
  });
}
