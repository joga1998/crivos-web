// Cloudflare Pages Function: Consulta status de pagamento no Mercado Pago
export async function onRequestGet(context) {
  const { params, env } = context;
  const paymentId = params.id;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (!paymentId) {
    return new Response(JSON.stringify({ error: 'ID do pagamento não informado.' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const accessToken = env?.MP_ACCESS_TOKEN || (typeof MP_ACCESS_TOKEN !== 'undefined' ? MP_ACCESS_TOKEN : null);
  if (!accessToken) {
    return new Response(
      JSON.stringify({
        error: 'Configuração incompleta: Variável MP_ACCESS_TOKEN não definida nas variáveis de ambiente do Cloudflare Pages (verifique se foi adicionada em Production e Preview em Settings > Variables and Secrets).',
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
      return new Response(
        JSON.stringify({ error: 'Falha ao buscar dados do pagamento.', details: mpData }),
        { status: mpResponse.status, headers: corsHeaders }
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
    return new Response(
      JSON.stringify({ error: 'Erro ao consultar status.', message: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
