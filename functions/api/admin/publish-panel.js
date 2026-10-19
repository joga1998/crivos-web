// Cloudflare Pages Function: Endpoint Administrativo para publicar o painel calibrado e enviar E-mail #2
import {
  getCorsHeaders,
  supabaseRest,
  sendResendEmail,
  renderEmailPanelReady,
} from '../_supabase.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const corsHeaders = getCorsHeaders(request);

  try {
    // Verificação de autenticação administrativa
    const adminKey = env?.ADMIN_API_KEY || (typeof ADMIN_API_KEY !== 'undefined' ? ADMIN_API_KEY : null) || 'crivos_secret_adm_2026_x89p';
    const authHeader = request.headers.get('Authorization') || '';
    const providedKey = authHeader.replace(/^Bearer\s+/i, '').trim() || request.headers.get('x-admin-key');

    if (!adminKey || providedKey !== adminKey) {
      return new Response(JSON.stringify({ error: 'Acesso não autorizado. Chave administrativa inválida.' }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const body = await request.json();
    const { userId, orderId, contentData, headerConfig, userFiles, enabledModules } = body;

    if (!userId && !orderId) {
      return new Response(JSON.stringify({ error: 'É necessário informar userId ou orderId.' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // 1. Localiza o painel correspondente
    let filter = userId ? `/user_panels?user_id=eq.${userId}` : `/user_panels?order_id=eq.${orderId}`;
    const panels = await supabaseRest(env, filter);
    const panel = Array.isArray(panels) && panels.length > 0 ? panels[0] : null;

    if (!panel) {
      return new Response(JSON.stringify({ error: 'Painel do usuário não encontrado.' }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    const targetUserId = panel.user_id;

    // 2. Atualiza o painel com os dados finais de engenharia e muda status para 'ready'
    const now = new Date().toISOString();
    const updatePayload = {
      status: 'ready',
      published_at: now,
    };

    if (contentData && typeof contentData === 'object') {
      updatePayload.content_data = contentData;
    }
    if (headerConfig && typeof headerConfig === 'object') {
      updatePayload.header_config = headerConfig;
    }
    if (enabledModules && typeof enabledModules === 'object') {
      updatePayload.enabled_modules = enabledModules;
    }

    await supabaseRest(env, `/user_panels?id=eq.${panel.id}`, {
      method: 'PATCH',
      body: updatePayload,
    });

    // 3. Cadastra os arquivos do aluno em `user_files`, se fornecidos
    const validCategories = ['edital', 'material', 'bibliografia', 'simulado', 'projeto', 'outro'];
    if (Array.isArray(userFiles) && userFiles.length > 0) {
      for (const file of userFiles) {
        if (file.filename && (file.storage_path || file.storage_url)) {
          const rawCat = String(file.category || 'bibliografia').toLowerCase();
          const safeCategory = validCategories.includes(rawCat) ? rawCat : 'bibliografia';
          await supabaseRest(env, '/user_files', {
            method: 'POST',
            body: {
              user_id: targetUserId,
              panel_id: panel.id,
              category: safeCategory,
              title: file.title || file.filename,
              filename: file.filename,
              storage_path: file.storage_path || file.storage_url,
              storage_url: file.storage_url || file.storage_path,
              priority: file.priority || 'ESSENCIAL',
              page_offset: file.page_offset || 0,
              sort_order: file.sort_order || 0,
            },
          });
        }
      }
    }

    // 4. Busca os dados do usuário para o disparo do E-mail #2 e atualiza a ordem para 'delivered'
    const profiles = await supabaseRest(env, `/profiles?id=eq.${targetUserId}`);
    const profile = Array.isArray(profiles) && profiles.length > 0 ? profiles[0] : null;

    if (panel.order_id) {
      try {
        await supabaseRest(env, `/orders?id=eq.${encodeURIComponent(panel.order_id)}`, {
          method: 'PATCH',
          body: { status: 'delivered', updated_at: now },
        });
      } catch (e) {}
    }

    const orders = panel.order_id ? await supabaseRest(env, `/orders?id=eq.${encodeURIComponent(panel.order_id)}`) : [];
    const order = Array.isArray(orders) && orders.length > 0 ? orders[0] : null;

    const email = profile?.email || order?.email;
    const concurso = order?.concurso_nome || order?.concurso || panel.concurso || panel.header_config?.title || 'Seu Concurso';
    const cargo = order?.cargo || panel.cargo || panel.header_config?.subtitle || '';
    const planTier = panel.plan_tier || order?.plan_tier || 'tatico';

    const planTitles = {
      tatico: 'Nível 1 · Tático',
      arsenal: 'Nível 2 · Arsenal (SM-2)',
      elite: 'Nível 3 · Elite (Completo)',
    };

    let emailSent = false;
    if (email) {
      try {
        const targetPanelUrl = (env?.PANEL_URL || 'https://crivos-painel.pages.dev').replace(/\/+$/, '');
        const htmlEmail = renderEmailPanelReady({
          email,
          planTitle: planTitles[planTier] || 'Sistema CRIVOS',
          concurso,
          cargo,
          panelUrl: targetPanelUrl,
        });

        await sendResendEmail(env, {
          to: email,
          subject: `CRIVOS // Seu Sistema Operacional de Estudos está Pronto — ${concurso}`,
          html: htmlEmail,
          text: `Seu Sistema Operacional de Estudos para ${concurso} foi concluído! Acesse agora: ${targetPanelUrl}`,
        });
        emailSent = true;
      } catch (errEmail) {
        console.error('[publish-panel] Erro ao enviar E-mail #2:', errEmail);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        panelId: panel.id,
        userId: targetUserId,
        status: 'ready',
        publishedAt: now,
        emailSent,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    console.error('[publish-panel] Erro interno:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

export async function onRequestOptions(context) {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(context.request),
  });
}
