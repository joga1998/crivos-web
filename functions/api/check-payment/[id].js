// Cloudflare Pages Function: Consulta status de pagamento no Mercado Pago
function getCorsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const isAllowed =
    origin === 'https://crivos.com.br' ||
    origin === 'https://www.crivos.com.br' ||
    origin === 'https://crivos-web.pages.dev' ||
    origin.endsWith('.crivos-web.pages.dev') ||
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:');

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'https://crivos-web.pages.dev',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
  };
}

export async function onRequestGet(context) {
  const { params, request, env } = context;
  const paymentId = String(params.id || '').trim();
  const corsHeaders = getCorsHeaders(request);

  if (!paymentId || !/^\d+$/.test(paymentId)) {
    return new Response(JSON.stringify({ error: 'Identificador de pagamento inválido.' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const rawToken = env?.MP_ACCESS_TOKEN || (typeof MP_ACCESS_TOKEN !== 'undefined' ? MP_ACCESS_TOKEN : null);
  const accessToken = rawToken ? String(rawToken).trim() : null;
  if (!accessToken) {
    return new Response(
      JSON.stringify({
        error: 'Configuração incompleta: Variável MP_ACCESS_TOKEN não definida no servidor.',
      }),
      { status: 500, headers: corsHeaders }
    );
  }

  try {
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error('Falha ao consultar Mercado Pago:', mpData);
      return new Response(
        JSON.stringify({ error: 'Pagamento não encontrado ou ainda não processado.' }),
        { status: mpResponse.status === 404 ? 404 : 400, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({
        id: mpData.id,
        status: mpData.status,
        status_detail: mpData.status_detail,
        payment_method_id: mpData.payment_method_id,
        payment_type_id: mpData.payment_type_id,
        transaction_amount: mpData.transaction_amount,
        date_approved: mpData.date_approved,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    console.error('Exceção ao consultar status:', err);
    return new Response(
      JSON.stringify({ error: 'Erro temporário ao consultar status da transação.' }),
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
