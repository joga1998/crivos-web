// Cloudflare Pages Function: Motor de Calibração Autônoma de Painéis e Guias CRIVOS
// Transforma edital + cargo + banca + rotina em um Painel e Guia 100% calibrados em segundos via IA

import { getCorsHeaders, supabaseRest, sendResendEmail, renderEmailPanelReady } from '../_supabase.js';
import { callExperientialAI } from '../_ai.js';

function generateTacticalSchedule(unidades, availabilityHours = 4, startDate = new Date()) {
  const sched = [];
  let currentDate = new Date(startDate);
  
  const d0Str = currentDate.toISOString().slice(0, 10);
  sched.push({
    d: d0Str,
    h: availabilityHours,
    t: '<span class="tag adm">ADM</span> Leitura do Edital e montagem do caderno de fichas. Organização do ambiente de estudos e auditoria da matriz de pesos.'
  });

  const studyDates = [];

  unidades.forEach((u, i) => {
    currentDate.setDate(currentDate.getDate() + 1);
    const dStr = currentDate.toISOString().slice(0, 10);
    studyDates.push({ date: dStr, unit: u.titulo, index: i + 1 });

    sched.push({
      d: dStr,
      h: availabilityHours,
      t: `<span class="tag ar">ÁREA</span> <b>${u.titulo}</b> (${u.materia}): Estudo da teoria e conceitos-chave. Resolução de questões de fixação da banca.`
    });

    if (i > 0) {
      const prev = studyDates[i - 1];
      sched[sched.length - 1].t += ` <span class="tag rev">REV</span> ${prev.unit} D+1 (15 min).`;
    }

    if ((i + 1) % 3 === 0) {
      currentDate.setDate(currentDate.getDate() + 1);
      const simDateStr = currentDate.toISOString().slice(0, 10);
      sched.push({
        d: simDateStr,
        h: availabilityHours,
        t: `<span class="tag esc">ESCRITA</span> <b>Simulado Tático de Bloco #${Math.ceil((i+1)/3)}</b>: Resolução de questões sem consulta. Correção com espelho oficial da banca.`
      });
    }
  });

  return sched;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const corsHeaders = getCorsHeaders(request);

  try {
    const body = await request.json();
    const { orderId, userId, concurso, cargo, banca, planTier, availabilityHours = 4, examDate } = body;

    if (!orderId && !userId) {
      return new Response(JSON.stringify({ error: 'orderId ou userId obrigatório para calibração.' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // 1. Localiza a ordem e o painel correspondente no Supabase
    let orderFilter = orderId ? `/orders?id=eq.${encodeURIComponent(orderId)}` : `/orders?user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=1`;
    const orders = await supabaseRest(env, orderFilter);
    const order = Array.isArray(orders) && orders.length > 0 ? orders[0] : null;

    let panelFilter = orderId ? `/user_panels?order_id=eq.${encodeURIComponent(orderId)}` : `/user_panels?user_id=eq.${encodeURIComponent(userId)}`;
    const panels = await supabaseRest(env, panelFilter);
    const panel = Array.isArray(panels) && panels.length > 0 ? panels[0] : null;

    if (!panel) {
      return new Response(JSON.stringify({ error: 'Painel do usuário não encontrado para calibração.' }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    const targetUserId = panel.user_id;
    const finalConcurso = concurso || panel.concurso || order?.concurso_nome || 'Concurso Público';
    const finalCargo = cargo || panel.cargo || order?.cargo || 'Cargo Pretendido';
    const finalTier = (planTier || panel.plan_tier || order?.plan_tier || 'tatico').toLowerCase();
    const finalBanca = banca || 'VUNESP';

    // 2. Prompt Estruturado focado em conteúdo pedagógico (sem sobrecarga de datas manuais)
    const systemPrompt = `Você é o Engenheiro Tático da CRIVOS.
Gere o conteúdo pedagógico estruturado para o pós-edital do aluno em formato JSON rigoroso:
{
  "unidades": [
    { "titulo": "string", "materia": "string", "topicos": ["topico 1", "topico 2"] }
  ],
  "textos": [
    { "id": "t1", "t": "string", "autor": "string", "p": "string", "tese": "string", "crivo": "string", "conceitos": [{ "termo": "string", "def": "string" }] }
  ],
  "cards": [
    { "id": "c1", "f": "string", "v": "string", "cat": "string" }
  ],
  "sim": [
    { "id": "sim_1", "titulo": "string", "comando": "string", "eixos": ["eixo 1", "eixo 2"] }
  ],
  "arg": [
    { "id": "arg_1", "q": "string", "alvo": "string", "resp": "string", "cat": "string" }
  ]
}`;

    const userPrompt = `DADOS PARA CALIBRAÇÃO IMEDIATA:
- Concurso: ${finalConcurso}
- Cargo: ${finalCargo}
- Banca: ${finalBanca}
- Plano: ${finalTier}
- Carga: ${availabilityHours}h/dia
Gere 6 unidades curriculares prioritárias do edital, 3 textos de aprofundamento, 8 flashcards SM-2 cirúrgicos, 1 simulado discursivo e 2 questões de arguição viva-voce no padrão da banca.`;

    const aiResponse = await callExperientialAI(env, {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      maxTokens: 16000,
      responseFormat: { type: 'json_object' }
    });

    const aiData = JSON.parse(aiResponse);

    // 3. Monta cronograma tático determinístico e estrutura do cabeçalho
    const sched = generateTacticalSchedule(aiData.unidades || [], availabilityHours, new Date());

    const headerConfig = {
      title: finalConcurso.toUpperCase(),
      subtitle: finalCargo.toUpperCase(),
      badge: `// SISTEMA CRIVOS ${finalTier.toUpperCase()}`,
      dates: [
        ['STATUS', 'PAINEL CALIBRADO'],
        ['BANCA', finalBanca.toUpperCase()],
        ['CARGA', `${availabilityHours}H / DIA`]
      ]
    };

    const contentData = {
      sched,
      textos: aiData.textos || [],
      cards: aiData.cards || [],
      sim: aiData.sim || [],
      arg: aiData.arg || []
    };

    // 4. Persiste a calibração em `public.user_panels` e muda status para 'ready'
    await supabaseRest(env, `/user_panels?id=eq.${panel.id}`, {
      method: 'PATCH',
      body: {
        status: 'ready',
        concurso: finalConcurso,
        cargo: finalCargo,
        header_config: headerConfig,
        content_data: contentData,
        updated_at: new Date().toISOString(),
      },
    });

    // 5. Atualiza a ordem para 'delivered'
    if (panel.order_id) {
      await supabaseRest(env, `/orders?id=eq.${encodeURIComponent(panel.order_id)}`, {
        method: 'PATCH',
        body: {
          status: 'delivered',
          updated_at: new Date().toISOString(),
        },
      });
    }

    // 6. Envia o E-mail avisando que o painel está calibrado e liberado
    const profiles = await supabaseRest(env, `/profiles?id=eq.${targetUserId}`);
    const profile = Array.isArray(profiles) && profiles.length > 0 ? profiles[0] : null;
    const email = profile?.email || order?.email;

    if (email) {
      try {
        const htmlEmail = renderEmailPanelReady({
          email,
          concurso: finalConcurso,
          cargo: finalCargo,
          planTitle: finalTier.toUpperCase(),
          panelUrl: env?.PANEL_URL || 'https://app.crivos.me',
        });
        await sendResendEmail(env, {
          to: email,
          subject: `Painel Liberado e Calibrado // ${finalConcurso} - ${finalCargo}`,
          html: htmlEmail,
        });
      } catch (emailErr) {
        console.warn('[calibrate] Falha no disparo do e-mail:', emailErr.message);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      panelId: panel.id,
      status: 'ready',
      message: 'Painel calibrado e liberado com sucesso em tempo real.',
    }), {
      status: 200,
      headers: corsHeaders,
    });

  } catch (err) {
    console.error('[calibrate] Erro na calibração autônoma:', err);
    return new Response(JSON.stringify({
      error: 'Falha ao calibrar o painel do aluno.',
      details: err.message
    }), {
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
