// Cloudflare Pages Function: Webhook oficial para receber notificações do Mercado Pago
import { getCorsHeaders, supabaseRest } from './_supabase.js';
import { provisionUserOrder } from './_provision.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const corsHeaders = getCorsHeaders(request);

  try {
    const rawToken = env?.MP_ACCESS_TOKEN || (typeof MP_ACCESS_TOKEN !== 'undefined' ? MP_ACCESS_TOKEN : null);
    const accessToken = rawToken ? String(rawToken).trim() : null;

    let body = {};
    try {
      body = await request.json();
    } catch (e) {
      body = {};
    }

    const url = new URL(request.url);
    const paymentId = body?.data?.id || body?.id || url.searchParams.get('id') || url.searchParams.get('data.id');
    const topic = body?.type || body?.topic || url.searchParams.get('topic') || url.searchParams.get('type') || 'payment';

    console.log(`[Webhook MP] Notificação recebida: topic=${topic}, paymentId=${paymentId}`);

    // Salva o evento em `webhook_events` para auditoria se Supabase estiver acessível
    const eventId = `mp-${paymentId || Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    try {
      await supabaseRest(env, '/webhook_events', {
        method: 'POST',
        body: {
          gateway: 'mercadopago',
          event_type: String(topic || 'payment'),
          external_event_id: String(paymentId || eventId),
          payload: { body, query: Object.fromEntries(url.searchParams) },
          processed: false,
        },
      });
    } catch (logErr) {
      console.warn('[Webhook MP] Não foi possível registrar em webhook_events:', logErr.message);
    }

    if (!paymentId || !accessToken) {
      // Retorna 200 para evitar que o Mercado Pago fique reenviando em loop caso falte id
      return new Response(JSON.stringify({ received: true, note: 'Payment ID ou Token ausente' }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    // Consulta os detalhes oficiais do pagamento na API do Mercado Pago
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!mpRes.ok) {
      const errText = await mpRes.text();
      console.error(`[Webhook MP] Erro ao consultar pagamento ${paymentId}:`, errText);
      return new Response(JSON.stringify({ received: true, error: 'Falha ao consultar MP' }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    const paymentData = await mpRes.json();
    const status = paymentData.status;
    const orderId = paymentData.external_reference;
    const paymentMethod = paymentData.payment_type_id === 'credit_card' ? 'credit_card' : 'pix';

    console.log(`[Webhook MP] Pagamento ${paymentId}: status=${status}, orderId=${orderId}`);

    if (status === 'approved') {
      const provisionResult = await provisionUserOrder(env, {
        orderId: orderId || null,
        mpPaymentId: String(paymentId),
        paymentMethod,
      });

      console.log(`[Webhook MP] Resultado do provisionamento:`, provisionResult);
    }

    return new Response(JSON.stringify({ received: true, status }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (err) {
    console.error('[Webhook MP] Exceção:', err);
    // Sempre retorna 200 para webhooks para evitar retries desnecessários após processar
    return new Response(JSON.stringify({ received: true, error: err.message }), {
      status: 200,
      headers: corsHeaders,
    });
  }
}

export async function onRequestGet(context) {
  // Mercado Pago às vezes faz ping GET para testar o endpoint
  return new Response(JSON.stringify({ status: 'active', service: 'crivos-webhook-mp' }), {
    status: 200,
    headers: getCorsHeaders(context.request),
  });
}
