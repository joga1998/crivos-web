// Cloudflare Pages Function: Processamento de Cartão de Crédito transparente via Mercado Pago
export async function onRequestPost(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  try {
    const body = await request.json();
    const {
      token,
      issuer_id,
      payment_method_id,
      installments,
      plan,
      email,
      docType,
      docNumber,
    } = body;

    const planPrices = {
      tatico: { amount: 67.00, title: 'CRIVOS // Nível 1 · Tático' },
      arsenal: { amount: 124.00, title: 'CRIVOS // Nível 2 · Arsenal (SM-2)' },
      elite: { amount: 221.00, title: 'CRIVOS // Nível 3 · Elite (Completo)' },
    };

    const selected = planPrices[plan];
    if (!selected) {
      return new Response(JSON.stringify({ error: 'Plano inválido selecionado.' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    if (!token) {
      return new Response(JSON.stringify({ error: 'Token do cartão não gerado.' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    if (!email) {
      return new Response(JSON.stringify({ error: 'E-mail é obrigatório.' }), {
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

    const cleanDocNumber = docNumber ? String(docNumber).replace(/\D/g, '') : '';
    const cleanDocType = docType || 'CPF';

    const idempotencyKey = `card-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const mpPayload = {
      token,
      transaction_amount: selected.amount,
      description: selected.title,
      installments: Number(installments) || 1,
      payment_method_id,
      issuer_id: issuer_id ? String(issuer_id) : undefined,
      payer: {
        email: email.trim(),
        identification: cleanDocNumber
          ? {
              type: cleanDocType,
              number: cleanDocNumber,
            }
          : undefined,
      },
    };

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(mpPayload),
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error('Erro Mercado Pago Cartão:', mpData);
      return new Response(
        JSON.stringify({
          error: mpData.message || 'Falha ao processar pagamento com cartão.',
          status: mpData.status || 'rejected',
          status_detail: mpData.status_detail,
          details: mpData,
        }),
        { status: mpResponse.status, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({
        id: mpData.id,
        status: mpData.status,
        status_detail: mpData.status_detail,
        transaction_amount: mpData.transaction_amount,
        installments: mpData.installments,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    console.error('Exceção ao processar cartão:', err);
    return new Response(
      JSON.stringify({ error: 'Erro interno ao processar pagamento.', message: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
