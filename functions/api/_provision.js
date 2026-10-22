// Helper de provisionamento de conta, painel inicial e envio de credenciais pós-pagamento
import {
  supabaseRest,
  supabaseAdminCreateUser,
  sendResendEmail,
  generateTacticalPassword,
  renderEmailCredentials,
  sendAdminSaleNotification,
} from './_supabase.js';

export function getModulesByTier(planTier) {
  const tier = (planTier || 'tatico').toLowerCase();
  
  const baseTatico = {
    home: 'enabled',
    crono: 'enabled',
    textos: 'enabled',
    pomo: 'enabled',
    links: 'enabled',
    dicas: 'enabled',
    dados: 'enabled',
    perfil: 'enabled',
    cards: 'locked_upsell',
    mapa: 'locked_upsell',
    sim: 'locked_upsell',
    arg: 'locked_upsell',
  };

  if (tier === 'arsenal') {
    return {
      ...baseTatico,
      cards: 'enabled',
      mapa: 'enabled',
      sim: 'locked_upsell',
      arg: 'locked_upsell',
    };
  }

  if (tier === 'elite') {
    return {
      ...baseTatico,
      cards: 'enabled',
      mapa: 'enabled',
      sim: 'enabled',
      arg: 'enabled',
    };
  }

  return baseTatico;
}

export async function provisionUserOrder(env, { orderId, mpPaymentId, paymentMethod }) {
  if (!orderId && !mpPaymentId) {
    throw new Error('Identificador de pedido ou pagamento ausente para provisionamento.');
  }

  // 1. Busca a ordem no Supabase
  let orderFilter = orderId
    ? `/orders?id=eq.${encodeURIComponent(orderId)}`
    : `/orders?payment_id=eq.${encodeURIComponent(mpPaymentId)}`;
  let orders = await supabaseRest(env, orderFilter);
  let order = Array.isArray(orders) && orders.length > 0 ? orders[0] : null;

  if (!order && orderId && mpPaymentId) {
    orders = await supabaseRest(env, `/orders?payment_id=eq.${encodeURIComponent(mpPaymentId)}`);
    order = Array.isArray(orders) && orders.length > 0 ? orders[0] : null;
  }

  if (!order) {
    console.warn(`[Provision] Ordem não encontrada para orderId=${orderId}, mpPaymentId=${mpPaymentId}`);
    return { success: false, reason: 'order_not_found' };
  }

  // 2. Trava de Idempotência: Se já foi provisionada para um usuário e está em calibração ou entregue, ignora
  if (order.user_id && ['approved', 'in_calibration', 'delivered'].includes(order.status)) {
    console.log(`[Provision] Ordem ${order.id} já provisionada anteriormente para user_id=${order.user_id}.`);
    return { success: true, alreadyProvisioned: true, userId: order.user_id };
  }

  // Se a ordem já estiver em "provisioning" há MENOS de 30 segundos, evita corrida simultânea.
  // Se estiver travada em "provisioning" há mais de 30s (ex: falha temporária anterior), libera a tentativa.
  if (order.status === 'provisioning') {
    const updatedAt = order.updated_at ? new Date(order.updated_at).getTime() : 0;
    const isRecent = (Date.now() - updatedAt) < 30000;
    if (isRecent) {
      console.log(`[Provision] Ordem ${order.id} já está em processo de provisionamento recente.`);
      return { success: true, inProgress: true };
    }
  }

  try {
    await supabaseRest(env, `/orders?id=eq.${encodeURIComponent(order.id)}`, {
      method: 'PATCH',
      body: {
        status: 'provisioning',
        updated_at: new Date().toISOString(),
      },
    });
  } catch (lockErr) {
    console.warn(`[Provision] Falha ao definir lock 'provisioning' na ordem ${order.id}:`, lockErr.message);
  }

  const email = order.email.trim().toLowerCase();
  const tempPassword = generateTacticalPassword();
  const concursoNome = order.concurso_nome || order.concurso || 'Concurso CRIVOS';
  const cargoNome = order.cargo || 'Cargo Pretendido';

  let parsedNotes = {};
  if (order.notes) {
    try {
      parsedNotes = JSON.parse(order.notes);
    } catch (e) {
      parsedNotes = {};
    }
  }
  const candidateName = parsedNotes.full_name || order.full_name || 'Candidato CRIVOS';
  const candidateCpf = parsedNotes.cpf || order.doc_number || '';

  // 3. Cria ou obtém o usuário no Supabase Auth
  const authUser = await supabaseAdminCreateUser(env, {
    email,
    password: tempPassword,
    userMetadata: {
      full_name: candidateName,
      plan_tier: order.plan_tier,
      concurso: concursoNome,
      cargo: cargoNome,
    },
  });

  const userId = authUser.id;

  // 4. Cria/Atualiza o perfil em `public.profiles`
  await supabaseRest(env, '/profiles?on_conflict=id', {
    method: 'POST',
    body: {
      id: userId,
      email,
      full_name: candidateName,
      cpf: candidateCpf,
      role: 'student',
    },
    prefer: 'resolution=merge-duplicates',
  });

  // 5. Configura e cria o `user_panels` em status `calibrating`
  const enabledModules = getModulesByTier(order.plan_tier);
  const planTitles = {
    tatico: 'Nível 1 · Tático',
    arsenal: 'Nível 2 · Arsenal (SM-2)',
    elite: 'Nível 3 · Elite (Completo)',
  };
  const planTitle = planTitles[order.plan_tier] || 'Plano Tático';

  // Prazo de 48 horas úteis (estimativa de 2 dias corridos)
  const deadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  // Verifica se já existe painel para esta ordem
  const existingPanels = await supabaseRest(env, `/user_panels?order_id=eq.${encodeURIComponent(order.id)}`);
  let panel = Array.isArray(existingPanels) && existingPanels.length > 0 ? existingPanels[0] : null;

  if (!panel) {
    const panelPayload = {
      user_id: userId,
      order_id: order.id,
      status: 'calibrating',
      plan_tier: order.plan_tier,
      concurso: concursoNome,
      cargo: cargoNome,
      enabled_modules: enabledModules,
      header_config: {
        title: concursoNome,
        subtitle: cargoNome,
        badge: `// SISTEMA ${order.plan_tier.toUpperCase()}`,
        dates: [
          ['Entrega Prevista', deadline.slice(0, 16).replace('T', ' ')]
        ],
      },
      content_data: {},
      delivery_deadline_at: deadline,
    };

    const panels = await supabaseRest(env, '/user_panels', {
      method: 'POST',
      body: panelPayload,
      prefer: 'return=representation',
    });

    panel = Array.isArray(panels) ? panels[0] : panels;
  }

  // 6. Inicializa o `user_progress` vazio caso o usuário ainda não possua registro
  if (panel?.id) {
    const existingProg = await supabaseRest(env, `/user_progress?user_id=eq.${encodeURIComponent(userId)}&select=id`);
    if (!Array.isArray(existingProg) || existingProg.length === 0) {
      await supabaseRest(env, '/user_progress', {
        method: 'POST',
        body: {
          user_id: userId,
          panel_id: panel.id,
          state_data: {},
          last_tab: 'home',
        },
      });
    }
  }

  // 7. Atualiza o status da ordem para `approved`
  const now = new Date().toISOString();
  await supabaseRest(env, `/orders?id=eq.${encodeURIComponent(order.id)}`, {
    method: 'PATCH',
    body: {
      user_id: userId,
      status: 'approved',
      payment_method: paymentMethod || order.payment_method || 'pix',
      payment_id: String(mpPaymentId || order.payment_id || ''),
      updated_at: now,
    },
  });

  // 8. Dispara E-mail #1 via Resend com as credenciais provisórias
  try {
    const targetPanelUrl = (env?.PANEL_URL || 'https://app.crivos.me').replace(/\/+$/, '');
    const htmlEmail = renderEmailCredentials({
      email,
      password: tempPassword,
      planTitle,
      concurso: concursoNome,
      cargo: cargoNome,
      panelUrl: targetPanelUrl,
    });

    await sendResendEmail(env, {
      to: email,
      subject: `CRIVOS // Suas Credenciais de Acesso — ${concursoNome}`,
      html: htmlEmail,
      text: `Olá! Seu acesso ao CRIVOS está garantido. Concurso: ${concursoNome}. Login: ${email}. Senha Temporária: ${tempPassword}. Acesse: ${targetPanelUrl}`,
    });
    console.log(`[Provision] E-mail de credenciais enviado com sucesso para ${email}`);
  } catch (emailErr) {
    console.error(`[Provision] Erro ao disparar e-mail de credenciais para ${email}:`, emailErr);
  }

  // 9. Dispara Notificação Imediata de Venda para o Administrador (joga8991@gmail.com)
  try {
    const planPrices = {
      tatico: '67,00',
      arsenal: '124,00',
      elite: '221,00',
    };
    const formattedPrice = planPrices[order.plan_tier] || (order.amount_cents ? (order.amount_cents / 100).toFixed(2).replace('.', ',') : '0,00');

        const hasOrderBump = !!(parsedNotes.order_bump || (order.amount_cents && [9400, 15100, 24800].includes(order.amount_cents)));
    const bumpTitle = hasOrderBump ? (parsedNotes.order_bump_title || 'Dossiê de Véspera D-7 & Pegadinhas da Banca (+ R$ 27,00)') : 'Nenhum';

    await sendAdminSaleNotification(env, {
      plan_title: planTitle,
      amount: formattedPrice,
      candidate_name: candidateName,
      email,
      cpf: candidateCpf,
      concurso: concursoNome,
      cargo: cargoNome,
      availability: parsedNotes.availability || (order.horas_semanais ? `${order.horas_semanais} horas semanais` : 'Não informada'),
      payment_method: paymentMethod || order.payment_method || 'pix',
      order_id: order.id,
      payment_id: String(mpPaymentId || order.payment_id || ''),
      temp_password: tempPassword,
      edital_url: order.edital_file_url || null,
      order_bump: hasOrderBump ? 'SIM' : 'NÃO',
      order_bump_title: bumpTitle,
      upsell: hasOrderBump ? 'SIM (+ R$ 27,00)' : 'NÃO',
    });
    console.log(`[Provision] Notificação enviada para o admin (joga8991@gmail.com) da ordem ${order.id}`);
  } catch (adminErr) {
    console.error('[Provision] Erro ao notificar administrador sobre a venda:', adminErr);
  }

  // 10. Disparo Server-Side Meta Conversions API (CAPI) para Registro Confiavel de Compras PIX / Cartao
  try {
    const metaPixelId = env?.META_PIXEL_ID || env?.PIXEL_ID;
    const metaCapiToken = env?.META_CAPI_TOKEN || env?.META_ACCESS_TOKEN;
    if (metaPixelId && metaCapiToken) {
      const emailNormalized = email.trim().toLowerCase();
      const emailBuffer = new TextEncoder().encode(emailNormalized);
      const emailHashBuffer = await crypto.subtle.digest("SHA-256", emailBuffer);
      const emailHashHex = Array.from(new Uint8Array(emailHashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      const orderValue = order.amount_cents ? (order.amount_cents / 100) : 67.0;
      const capiPayload = {
        data: [{
          event_name: "Purchase",
          event_time: Math.floor(Date.now() / 1000),
          event_id: order.id,
          action_source: "website",
          user_data: {
            em: [emailHashHex],
            external_id: [userId],
          },
          custom_data: {
            currency: "BRL",
            value: orderValue,
            content_ids: [order.plan_tier],
            content_name: concursoNome,
            content_type: "product",
          },
        }],
      };
      await fetch("https://graph.facebook.com/v19.0/" + metaPixelId + "/events?access_token=" + metaCapiToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(capiPayload),
      });
      console.log("[Provision CAPI] Evento Purchase disparado via Server-Side para order " + order.id);
    }
  } catch (capiError) {
    console.warn("[Provision CAPI] Excecao no disparo Meta CAPI:", capiError.message);
  }

  return {
    success: true,
    userId,
    panelId: panel?.id,
    orderId: order.id,
  };
}
