// Cloudflare Pages Function: Processamento de PIX transparente via Mercado Pago
function getCorsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const isAllowed =
    origin === 'https://crivos.me' ||
    origin.endsWith('.crivos.me') ||
    origin === 'https://crivos.com.br' ||
    origin.endsWith('.crivos.com.br') ||
    origin === 'https://crivos-web.pages.dev' ||
    origin.endsWith('.crivos-web.pages.dev') ||
    origin.endsWith('.pages.dev') ||
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:');

  const defaultOrigin = origin.includes('crivos.me') ? origin : 'https://crivos.me';

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : defaultOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
  };
}

import { supabaseRest } from './_supabase.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const corsHeaders = getCorsHeaders(request);

  try {
    const body = await request.json();
    const { plan, email, firstName, lastName, docType, docNumber, orderId } = body;

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

    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanDocNumber = String(docNumber || '').replace(/\D/g, '');

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return new Response(JSON.stringify({ error: 'Formato de e-mail inválido.', user_message: 'Por favor, informe um endereço de e-mail válido.' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    if (!cleanDocNumber || cleanDocNumber.length < 11 || cleanDocNumber.length > 14) {
      return new Response(JSON.stringify({ error: 'CPF ou CNPJ inválido.', user_message: 'Por favor, confira o número de CPF informado.' }), {
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
          error: 'Configuração incompleta: Variável MP_ACCESS_TOKEN não definida no servidor.',
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Tipo do documento
    const cleanDocType = docType || 'CPF';

    // Chave única de idempotência para evitar cobranças duplicadas em requisições repetidas
    const idempotencyKey = `pix-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const mpPayload = {
      transaction_amount: selected.amount,
      description: selected.title,
      payment_method_id: 'pix',
      external_reference: orderId ? String(orderId) : undefined,
      notification_url: 'https://crivos.me/api/webhook-mp',
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
      let friendlyError = 'Não foi possível gerar a cobrança Pix no momento.';

      if (Array.isArray(mpData.cause) && mpData.cause.length > 0) {
        const causes = mpData.cause.map(c => {
          const desc = String(c.description || '').toLowerCase();
          if (desc.includes('identification') || desc.includes('docnumber')) return 'CPF ou CNPJ informado é inválido.';
          if (desc.includes('email')) return 'E-mail informado é inválido.';
          return c.description;
        }).filter(Boolean);
        if (causes.length > 0) friendlyError = causes.join(' ');
      } else if (mpData.message) {
        const msg = String(mpData.message).toLowerCase();
        if (msg.includes('identification')) friendlyError = 'O CPF informado é inválido. Por favor, confira o número.';
        else if (msg.includes('unauthorized')) friendlyError = 'Credencial de pagamento não autorizada.';
        else friendlyError = mpData.message;
      }

      return new Response(
        JSON.stringify({
          error: friendlyError,
          user_message: friendlyError,
        }),
        { status: mpResponse.status >= 500 ? 500 : 400, headers: corsHeaders }
      );
    }

    // Se temos orderId, vincula mp_payment_id e full_name na tabela orders
    if (orderId && mpData?.id) {
      try {
        const fullName = `${firstName || ''} ${lastName || ''}`.trim() || undefined;
        await supabaseRest(env, `/orders?id=eq.${orderId}`, {
          method: 'PATCH',
          body: {
            mp_payment_id: String(mpData.id),
            full_name: fullName,
            doc_number: cleanDocNumber,
            payment_method: 'pix',
          },
        });
      } catch (patchErr) {
        console.warn('[process-pix] Falha ao atualizar orders com mp_payment_id:', patchErr.message);
      }
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
      JSON.stringify({ error: 'Erro temporário ao processar cobrança Pix.', user_message: 'Instabilidade momentânea ao gerar o Pix. Por favor, tente novamente.' }),
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
