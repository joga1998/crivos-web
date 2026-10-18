// Cloudflare Pages Function: Processamento de PIX transparente via Mercado Pago
export async function onRequestPost(context) {
  const { request, env } = context;

  // Cabeçalhos CORS para permitir requisições seguras
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  try {
    const body = await request.json();
    const { plan, email, firstName, lastName, docType, docNumber } = body;

    // Tabela oficial de preços no servidor (anti-adulteração de preços no frontend)
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

    if (!email || !docNumber) {
      return new Response(JSON.stringify({ error: 'E-mail e CPF são obrigatórios para emissão do PIX.' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Token secreto do Mercado Pago configurado no Cloudflare Pages Secrets
    const rawToken = env?.MP_ACCESS_TOKEN || (typeof MP_ACCESS_TOKEN !== 'undefined' ? MP_ACCESS_TOKEN : null);
    const accessToken = rawToken ? String(rawToken).trim() : null;
    if (!accessToken) {
      return new Response(
        JSON.stringify({
          error: 'Configuração incompleta: Variável MP_ACCESS_TOKEN não definida nas variáveis de ambiente do Cloudflare Pages (verifique se foi adicionada em Production e Preview em Settings > Variables and Secrets).',
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Limpeza de pontuação do documento
    const cleanDocNumber = String(docNumber).replace(/\D/g, '');
    const cleanDocType = docType || 'CPF';

    // Chave única de idempotência para evitar cobranças duplicadas em requisições repetidas
    const idempotencyKey = `pix-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const mpPayload = {
      transaction_amount: selected.amount,
      description: selected.title,
      payment_method_id: 'pix',
      payer: {
        email: email.trim(),
        first_name: firstName ? firstName.trim() : 'Candidato',
        last_name: lastName ? lastName.trim() : 'CRIVOS',
        identification: {
          type: cleanDocType,
          number: cleanDocNumber,
        },
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
      console.error('Erro Mercado Pago PIX:', mpData);
      return new Response(
        JSON.stringify({
          error: mpData.message || 'Falha ao gerar cobrança PIX no Mercado Pago.',
          details: mpData,
        }),
        { status: mpResponse.status, headers: corsHeaders }
      );
    }

    const txData = mpData.point_of_interaction?.transaction_data;

    return new Response(
      JSON.stringify({
        id: mpData.id,
        status: mpData.status,
        status_detail: mpData.status_detail,
        qr_code: txData?.qr_code || null,
        qr_code_base64: txData?.qr_code_base64 || null,
        ticket_url: txData?.ticket_url || null,
        transaction_amount: mpData.transaction_amount,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    console.error('Exceção ao gerar PIX:', err);
    return new Response(
      JSON.stringify({ error: 'Erro interno ao processar PIX.', message: err.message }),
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
