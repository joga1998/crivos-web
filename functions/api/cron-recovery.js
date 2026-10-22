// Cloudflare Pages Function: Rotina de verificação e disparo de recuperação
// 1. Clientes que geraram PIX mas não pagaram após 5 minutos (envia QR code funcional + cópia tática)
// 2. Clientes que abandonaram a Etapa 2 do Checkout após 15 minutos (personalizado com concurso e cargo)

import {
  getCorsHeaders,
  supabaseRest,
  sendResendEmail,
  renderEmailPixPending,
  renderEmailCheckoutAbandoned,
} from './_supabase.js';

export async function onRequestGet(context) {
  return handleRecovery(context);
}

export async function onRequestPost(context) {
  return handleRecovery(context);
}

async function handleRecovery(context) {
  const { request, env } = context;
  const corsHeaders = getCorsHeaders(request);

  const planTitles = {
    tatico: { title: 'Nível 1 · Tático', formatted: '67,00' },
    arsenal: { title: 'Nível 2 · Arsenal (SM-2)', formatted: '124,00' },
    elite: { title: 'Nível 3 · Elite (Completo)', formatted: '221,00' },
  
    prime: { title: 'Nível 4 · Prime (Completo + Materiais)', formatted: '288,00' },
};

  const results = {
    pixRecovered: 0,
    checkoutRecovered: 0,
    pixFound: 0,
    checkoutFound: 0,
    errors: [],
  };

  try {
    const now = Date.now();
    const fiveMinutesAgo = new Date(now - 5 * 60 * 1000).toISOString();
    const fifteenMinutesAgo = new Date(now - 15 * 60 * 1000).toISOString();
    const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();

    // =========================================================================
    // 1. RECUPERAÇÃO DE PIX GERADO E PENDENTE (> 5 MINUTOS, < 24 HORAS)
    // =========================================================================
    const pixFilter = `/orders?status=eq.pending&payment_method=eq.pix&created_at=lte.${fiveMinutesAgo}&created_at=gte.${twentyFourHoursAgo}&select=id,status,payment_id,email,concurso_nome,cargo,plan_tier,created_at,notes&order=created_at.desc&limit=20`;
    
    let pixOrders = [];
    try {
      pixOrders = await supabaseRest(env, pixFilter);
      results.pixFound = Array.isArray(pixOrders) ? pixOrders.length : 0;
    } catch (e) {
      console.warn('[recovery] Falha ao consultar ordens pix:', e.message);
    }

    if (Array.isArray(pixOrders)) {
      results.pixOrdersDetail = [];
      for (const order of pixOrders) {
        let notes = {};
        try {
          notes = typeof order.notes === 'string' ? JSON.parse(order.notes) : (order.notes || {});
        } catch (e) {
          notes = {};
        }

        const debugInfo = {
          orderId: order.id,
          sentAlready: !!notes.pix_recovery_email_sent,
          status: order.status,
          hasEmail: !!order.email,
          hasQrCode: !!notes.qr_code,
          paymentId: order.payment_id
        };
        results.pixOrdersDetail.push(debugInfo);

        // Se já disparou o e-mail de recuperação de Pix, pula
        if (notes.pix_recovery_email_sent) {
          debugInfo.skippedReason = 'already_sent';
          continue;
        }

        // Se a ordem já foi aprovada em outra verificação, pula
        if (order.status !== 'pending') {
          debugInfo.skippedReason = 'status_not_pending';
          continue;
        }

        const email = order.email;
        if (!email || !email.includes('@')) {
          debugInfo.skippedReason = 'invalid_email';
          continue;
        }

        const planKey = (order.plan_tier || 'tatico').toLowerCase();
        const planInfo = planTitles[planKey] || planTitles.tatico;
        const concurso = order.concurso_nome || 'Concurso Selecionado';
        const cargo = order.cargo || 'Cargo';

        let qrCodeStr = notes.qr_code || '';
        let ticketUrl = notes.ticket_url || '';

        // Se não tiver qrCodeStr nos notes, tenta buscar direto no Mercado Pago caso tenhamos o payment_id
        if (!qrCodeStr && order.payment_id) {
          try {
            const rawToken = env?.MP_ACCESS_TOKEN || (typeof MP_ACCESS_TOKEN !== 'undefined' ? MP_ACCESS_TOKEN : null);
            if (rawToken) {
              const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${order.payment_id}`, {
                headers: { 'Authorization': `Bearer ${String(rawToken).trim()}` }
              });
              if (mpRes.ok) {
                const mpData = await mpRes.json();
                // Se já estiver aprovado no Mercado Pago, não manda abandono
                if (mpData.status === 'approved') continue;
                qrCodeStr = mpData.point_of_interaction?.transaction_data?.qr_code || '';
                ticketUrl = mpData.point_of_interaction?.transaction_data?.ticket_url || '';
              }
            }
          } catch (mpErr) {
            console.warn(`[recovery] Erro ao consultar MP para payment ${order.payment_id}:`, mpErr.message);
          }
        }

        if (!qrCodeStr) {
          // Se não houver dados de PIX para remontar o QR Code, pula
          continue;
        }

        // Gera a imagem do QR Code em alta definição via API universal pública
        const qrCodeImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrCodeStr)}`;

        const html = renderEmailPixPending({
          email,
          planTitle: planInfo.title,
          concurso,
          cargo,
          formattedPrice: planInfo.formatted,
          qrCodeStr,
          qrCodeImgUrl,
          ticketUrl,
        });

        try {
          results.pixAttempted = (results.pixAttempted || 0) + 1;
          const emailRes = await sendResendEmail(env, {
            to: email,
            subject: `CRIVOS // Chave Pix Gerada — Seu Slot Está Reservado em ${concurso}`,
            html,
            text: `Olá! Você gerou uma cobrança Pix para ${concurso} (${cargo}), mas ainda não identificamos o pagamento. Pague com o Pix Copia e Cola: ${qrCodeStr}`,
          });

          // Marca nos notes para evitar disparos repetidos
          notes.pix_recovery_email_sent = true;
          notes.pix_recovery_sent_at = new Date().toISOString();
          notes.pix_recovery_resend_id = emailRes?.id;

          await supabaseRest(env, `/orders?id=eq.${encodeURIComponent(order.id)}`, {
            method: 'PATCH',
            body: { notes: JSON.stringify(notes), updated_at: new Date().toISOString() },
          });

          results.pixRecovered++;
        } catch (sendErr) {
          console.error(`[recovery] Falha ao enviar email pix para ${email}:`, sendErr.message);
          results.errors.push({ orderId: order.id, type: 'pix', error: sendErr.message, stack: sendErr.stack });
        }
      }
    }

    // =========================================================================
    // 2. RECUPERAÇÃO DE CHECKOUT ABANDONADO (> 15 MINUTOS, < 24 HORAS)
    // =========================================================================
    const abandonedFilter = `/orders?status=eq.pending&payment_method=is.null&created_at=lte.${fifteenMinutesAgo}&created_at=gte.${twentyFourHoursAgo}&select=id,status,payment_method,email,concurso_nome,cargo,plan_tier,created_at,notes&order=created_at.desc&limit=20`;

    let abandonedOrders = [];
    try {
      abandonedOrders = await supabaseRest(env, abandonedFilter);
      results.checkoutFound = Array.isArray(abandonedOrders) ? abandonedOrders.length : 0;
    } catch (e) {
      console.warn('[recovery] Falha ao consultar ordens abandonadas:', e.message);
    }

    if (Array.isArray(abandonedOrders)) {
      for (const order of abandonedOrders) {
        let notes = {};
        try {
          notes = typeof order.notes === 'string' ? JSON.parse(order.notes) : (order.notes || {});
        } catch (e) {
          notes = {};
        }

        // Se já disparou o e-mail de abandono de checkout, pula
        if (notes.abandoned_checkout_email_sent) continue;

        // Se a ordem já mudou de status ou ganhou payment_method, pula
        if (order.status !== 'pending' || order.payment_method) continue;

        const email = order.email;
        if (!email || !email.includes('@')) continue;

        const planKey = (order.plan_tier || 'tatico').toLowerCase();
        const planInfo = planTitles[planKey] || planTitles.tatico;
        const concurso = order.concurso_nome || 'Concurso Selecionado';
        const cargo = order.cargo || 'Cargo';

        // Link direto para voltar com os parâmetros pré-preenchidos
        const baseUrl = (env?.API_BASE_URL || 'https://crivos.me').replace(/\/+$/, '');
        const checkoutUrl = `${baseUrl}/payment.html?produto=${encodeURIComponent(planKey)}&concurso=${encodeURIComponent(concurso)}&cargo=${encodeURIComponent(cargo)}`;

        const html = renderEmailCheckoutAbandoned({
          email,
          planTitle: planInfo.title,
          concurso,
          cargo,
          checkoutUrl,
        });

        try {
          await sendResendEmail(env, {
            to: email,
            subject: `CRIVOS // Seu Diagnóstico Tático Ficou Salvo — ${concurso}`,
            html,
            text: `Olá! Você preencheu seu diagnóstico para ${concurso} (${cargo}), mas não finalizou a inscrição. Retome seu plano em: ${checkoutUrl}`,
          });

          // Marca nos notes para evitar disparos repetidos
          notes.abandoned_checkout_email_sent = true;
          notes.abandoned_checkout_sent_at = new Date().toISOString();

          await supabaseRest(env, `/orders?id=eq.${encodeURIComponent(order.id)}`, {
            method: 'PATCH',
            body: { notes: JSON.stringify(notes), updated_at: new Date().toISOString() },
          });

          results.checkoutRecovered++;
        } catch (sendErr) {
          console.error(`[recovery] Falha ao enviar email abandono para ${email}:`, sendErr.message);
          results.errors.push({ orderId: order.id, type: 'checkout', error: sendErr.message });
        }
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (err) {
    console.error('[recovery] Erro geral:', err);
    return new Response(JSON.stringify({ error: err.message, results }), {
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
