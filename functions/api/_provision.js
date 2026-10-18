// Helper de provisionamento de conta, painel inicial e envio de credenciais pós-pagamento
import {
  supabaseRest,
  supabaseAdminCreateUser,
  sendResendEmail,
  generateTacticalPassword,
  renderEmailCredentials,
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
  let orderFilter = orderId ? `/orders?id=eq.${orderId}` : `/orders?mp_payment_id=eq.${mpPaymentId}`;
  const orders = await supabaseRest(env, orderFilter);
  const order = Array.isArray(orders) && orders.length > 0 ? orders[0] : null;

  if (!order) {
    console.warn(`[Provision] Ordem não encontrada para orderId=${orderId}, mpPaymentId=${mpPaymentId}`);
    return { success: false, reason: 'order_not_found' };
  }

  // 2. Trava de Idempotência: Se credenciais já foram enviadas, ignora
  if (order.credentials_sent_at) {
    console.log(`[Provision] Credenciais já enviadas anteriormente para ordem ${order.id}.`);
    return { success: true, alreadyProvisioned: true, userId: order.user_id };
  }

  const email = order.email.trim().toLowerCase();
  const tempPassword = generateTacticalPassword();

  // 3. Cria ou obtém o usuário no Supabase Auth
  const authUser = await supabaseAdminCreateUser(env, {
    email,
    password: tempPassword,
    userMetadata: {
      full_name: order.full_name || 'Candidato CRIVOS',
      plan_tier: order.plan_tier,
      concurso: order.concurso,
      cargo: order.cargo,
    },
  });

  const userId = authUser.id;

  // 4. Cria/Atualiza o perfil em `public.profiles`
  await supabaseRest(env, '/profiles', {
    method: 'POST',
    body: {
      id: userId,
      email,
      full_name: order.full_name || 'Candidato CRIVOS',
      role: 'student',
      must_change_password: true,
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

  const panelPayload = {
    user_id: userId,
    order_id: order.id,
    status: 'calibrating',
    plan_tier: order.plan_tier,
    enabled_modules: enabledModules,
    header_config: {
      title: order.concurso,
      subtitle: order.cargo,
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
    prefer: 'resolution=merge-duplicates,return=representation',
  });

  const panel = Array.isArray(panels) ? panels[0] : panels;

  // 6. Inicializa o `user_progress` vazio
  if (panel?.id) {
    await supabaseRest(env, '/user_progress', {
      method: 'POST',
      body: {
        user_id: userId,
        panel_id: panel.id,
        state_data: {},
      },
      prefer: 'resolution=merge-duplicates',
    });
  }

  // 7. Atualiza o status da ordem para `paid`
  const now = new Date().toISOString();
  await supabaseRest(env, `/orders?id=eq.${order.id}`, {
    method: 'PATCH',
    body: {
      user_id: userId,
      status: 'paid',
      paid_at: now,
      payment_method: paymentMethod || order.payment_method || 'pix',
      mp_payment_id: mpPaymentId || order.mp_payment_id,
      credentials_sent_at: now,
    },
  });

  // 8. Dispara E-mail #1 via Resend com as credenciais provisórias
  try {
    const htmlEmail = renderEmailCredentials({
      email,
      password: tempPassword,
      planTitle,
      concurso: order.concurso,
      cargo: order.cargo,
      panelUrl: 'https://painel.crivos.me',
    });

    await sendResendEmail(env, {
      to: email,
      subject: `CRIVOS // Suas Credenciais de Acesso — ${order.concurso}`,
      html: htmlEmail,
      text: `Olá! Seu acesso ao CRIVOS está garantido. Concurso: ${order.concurso}. Login: ${email}. Senha Temporária: ${tempPassword}. Acesse: https://painel.crivos.me`,
    });
    console.log(`[Provision] E-mail de credenciais enviado com sucesso para ${email}`);
  } catch (emailErr) {
    console.error(`[Provision] Erro ao disparar e-mail de credenciais para ${email}:`, emailErr);
  }

  return {
    success: true,
    userId,
    panelId: panel?.id,
    orderId: order.id,
  };
}
