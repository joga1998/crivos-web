import { getCorsHeaders, supabaseRest, supabaseStorageUpload } from './_supabase.js';

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

    const filename = file.name || 'material_candidato.pdf';
    const sanitizedFileName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${userId}/${Date.now()}_${sanitizedFileName}`;
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

    const { url } = {
      url: env?.SUPABASE_URL || 'https://dmmtmfjlieqeqwlhtgrr.supabase.co'
    };
    const publicUrl = `${url.replace(/\/+$/, '')}/storage/v1/object/public/user-materials/${storagePath}`;

    // Cadastra o registro em user_files
    const insertPayload = {
      user_id: userId,
      panel_id: panelId || null,
      category: category,
      title: title || filename.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
      filename: filename,
      storage_path: `user-materials/${storagePath}`,
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
      JSON.stringify({ error: 'Falha interna ao processar upload do arquivo.', details: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}
