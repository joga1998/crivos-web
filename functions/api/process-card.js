// Cloudflare Pages Function: Processamento de Cartão de Crédito transparente via Mercado Pago
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

  const defaultOrigin = origin.includes('pages.dev')
    ? origin
    : origin.includes('crivos.me')
    ? origin
    : 'https://crivos-web.pages.dev';

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
import { provisionUserOrder } from './_provision.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const corsHeaders = getCorsHeaders(request);

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
      orderId,
      orderBump,
    } = body;

    const planPrices = {
      tatico: { amount: 67.00, title: 'CRIVOS // Nível 1 · Tático' },
      arsenal: { amount: 124.00, title: 'CRIVOS // Nível 2 · Arsenal (SM-2)' },
      elite: { amount: 221.00, title: 'CRIVOS // Nível 3 · Elite (Completo)' },
    
      prime: { amount: 288.00, title: 'CRIVOS // Nível 4 · Prime (Máxima Personalização)' },
};

    const selected = planPrices[plan];
    if (!selected) {
      return new Response(JSON.stringify({ error: 'Plano inválido selecionado.' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const orderBumpPrice = 27.00;
    const finalAmount = orderBump ? (selected.amount + orderBumpPrice) : selected.amount;
    const finalDesc = orderBump ? `${selected.title} + Dossiê D-7` : selected.title;

    if (!token || typeof token !== 'string' || token.length < 10) {
      return new Response(JSON.stringify({ error: 'Token de cartão inválido ou ausente.', user_message: 'Por favor, revise os dados do cartão de crédito.' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return new Response(JSON.stringify({ error: 'Formato de e-mail inválido.', user_message: 'Por favor, informe um e-mail válido.' }), {
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

    const cleanDocNumber = docNumber ? String(docNumber).replace(/\D/g, '') : '';
    const cleanDocType = docType || (cleanDocNumber.length > 11 ? 'CNPJ' : 'CPF');

    const idempotencyKey = `card-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const mpPayload = {
      token,
      transaction_amount: finalAmount,
      description: finalDesc,
      installments: Number(installments) || 1,
      payment_method_id,
      issuer_id: issuer_id ? String(issuer_id) : undefined,
      external_reference: orderId ? String(orderId) : undefined,
      notification_url: `${(env?.API_BASE_URL || 'https://crivos.me').replace(/\/+$/, '')}/api/webhook-mp`,
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

    const STATUS_DETAIL_MESSAGES = {
      cc_rejected_bad_filled_card_number: 'Número do cartão inválido ou incompleto. Por favor, confira os números digitados.',
      cc_rejected_bad_filled_date: 'Data de validade incorreta. Verifique o mês e ano informados no cartão.',
      cc_rejected_bad_filled_security_code: 'Código de segurança (CVV) inválido. Verifique os 3 ou 4 dígitos no verso do cartão.',
      cc_rejected_bad_filled_other: 'Dados do cartão preenchidos incorretamente. Verifique as informações digitadas.',
      cc_rejected_insufficient_amount: 'Saldo ou limite insuficiente no seu cartão de crédito.',
      cc_rejected_call_for_authorize: 'Transação não autorizada pelo seu banco. Ligue para o número da operadora no verso do seu cartão para autorizar a compra, ou conclua via Pix.',
      cc_rejected_card_disabled: 'Este cartão está bloqueado ou inativo. Desbloqueie no aplicativo do seu banco ou use outro cartão.',
      cc_rejected_card_error: 'Não foi possível processar a transação com este cartão. Tente outro cartão ou opte pelo Pix.',
      cc_rejected_duplicated_payment: 'Identificamos um pagamento idêntico recente. Aguarde alguns minutos ou utilize outro cartão.',
      cc_rejected_high_risk: 'Transação recusada pelas políticas preventivas de segurança do emissor. Recomendamos pagar via Pix.',
      cc_rejected_max_attempts: 'Você atingiu o limite de tentativas com este cartão. Aguarde alguns minutos ou realize o pagamento via Pix.',
      cc_rejected_blacklist: 'Não foi possível processar com este cartão. Por favor, tente outro cartão ou utilize o Pix.',
      cc_rejected_invalid_installments: 'A quantidade de parcelas selecionada não é permitida para este cartão.',
      rejected_by_bank: 'O banco emissor do cartão recusou a autorização do pagamento.',
      rejected_by_regulations: 'O pagamento não foi autorizado de acordo com as normas do banco emissor.',
    };

    function getFriendlyCardErrorMessage(data) {
      if (!data) return 'Não foi possível processar o pagamento com cartão.';

      if (data.status_detail && STATUS_DETAIL_MESSAGES[data.status_detail]) {
        return STATUS_DETAIL_MESSAGES[data.status_detail];
      }

      if (Array.isArray(data.cause) && data.cause.length > 0) {
        const causes = data.cause.map(c => {
          const desc = String(c.description || '').toLowerCase();
          const code = String(c.code || '');
          if (code === '205' || desc.includes('parameter cardnumber')) return 'Número do cartão inválido.';
          if (code === '208' || desc.includes('parameter cardexpirationmonth')) return 'Mês de validade inválido.';
          if (code === '209' || desc.includes('parameter cardexpirationyear')) return 'Ano de validade inválido.';
          if (code === '212' || desc.includes('parameter doctype')) return 'Tipo de documento inválido.';
          if (code === '214' || desc.includes('parameter docnumber')) return 'CPF ou CNPJ do titular inválido.';
          if (code === '220' || desc.includes('parameter cardissuerid')) return 'Emissor do cartão não identificado.';
          if (code === '221' || desc.includes('parameter cardholdername')) return 'Nome do titular incompleto.';
          if (code === '224' || desc.includes('parameter securitycode')) return 'Código CVV incorreto.';
          if (code === 'E301' || desc.includes('invalid card_number_length')) return 'Quantidade de dígitos do cartão incorreta.';
          if (code === 'E302' || desc.includes('invalid security_code')) return 'Código de segurança (CVV) inválido.';
          if (code === '325' || desc.includes('invalid cardexpirationmonth')) return 'Mês de vencimento inválido.';
          if (code === '326' || desc.includes('invalid cardexpirationyear')) return 'Ano de vencimento expirado ou inválido.';
          return c.description || null;
        }).filter(Boolean);

        if (causes.length > 0) return causes.join(' ');
      }

      const rawMsg = String(data.message || data.error || '').toLowerCase();
      if (rawMsg.includes('unauthorized') || rawMsg.includes('invalid credentials')) {
        return 'Falha na autenticação do gateway de pagamento. Entre em contato com o suporte.';
      }
      if (rawMsg.includes('payer') && rawMsg.includes('identification')) {
        return 'O CPF ou CNPJ informado do titular é inválido.';
      }

      return data.message || 'Pagamento recusado pela operadora do cartão.';
    }

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
      const friendlyError = getFriendlyCardErrorMessage(mpData);
      return new Response(
        JSON.stringify({
          error: friendlyError,
          user_message: friendlyError,
          status: mpData.status || 'rejected',
          status_detail: mpData.status_detail,
        }),
        { status: mpResponse.status >= 500 ? 500 : 400, headers: corsHeaders }
      );
    }

    // Mesmo com HTTP 200/201, o pagamento pode ter sido recusado pelo emissor
    if (mpData.status === 'rejected') {
      const friendlyError = getFriendlyCardErrorMessage(mpData);
      return new Response(
        JSON.stringify({
          id: mpData.id,
          status: 'rejected',
          status_detail: mpData.status_detail,
          error: friendlyError,
          user_message: friendlyError,
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Se temos orderId, vincula payment_id na tabela orders preservando notes anteriores
    // e já marca a ordem como aprovada para evitar corrida concorrente com o webhook assíncrono
    if (orderId && mpData?.id) {
      try {
        let existingNotes = {};
        try {
          const currentOrderRes = await supabaseRest(env, `/orders?id=eq.${encodeURIComponent(orderId)}&select=notes`);
          if (Array.isArray(currentOrderRes) && currentOrderRes[0]?.notes) {
            existingNotes = JSON.parse(currentOrderRes[0].notes);
          }
        } catch (readNotesErr) {}

        const mergedNotes = {
          ...existingNotes,
          cpf: cleanDocNumber || existingNotes.cpf,
          order_bump: !!orderBump,
          order_bump_title: orderBump ? 'Dossiê de Véspera D-7 & Pegadinhas da Banca' : null,
        };

        const isApproved = (mpData.status === 'approved' || mpData.status === 'in_process');

        await supabaseRest(env, `/orders?id=eq.${encodeURIComponent(orderId)}`, {
          method: 'PATCH',
          body: {
            payment_id: String(mpData.id),
            payment_method: 'credit_card',
            status: isApproved ? 'approved' : 'pending',
            notes: JSON.stringify(mergedNotes),
            updated_at: new Date().toISOString(),
          },
        });
      } catch (patchErr) {
        console.warn('[process-card] Falha ao atualizar orders com payment_id:', patchErr.message);
      }
    }

    // Provisiona diretamente o usuário para entrega imediata sem esperar o webhook
    if (mpData.status === 'approved' || mpData.status === 'in_process') {
      try {
        await provisionUserOrder(env, {
          orderId: orderId || null,
          mpPaymentId: String(mpData.id),
          paymentMethod: 'credit_card',
        });
      } catch (provErr) {
        console.warn('[process-card] Falha no provisionamento imediato:', provErr.message);
      }
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
      JSON.stringify({ error: 'Erro temporário ao processar pagamento.', user_message: 'Instabilidade de conexão ao processar seu pagamento. Por favor, tente novamente.' }),
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
