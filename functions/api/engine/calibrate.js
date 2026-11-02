// Cloudflare Pages Function: Motor de Calibração Autônoma de Painéis e Guias CRIVOS
// Transforma edital + cargo + banca + rotina em um Painel e Guia 100% calibrados em segundos via IA

import { getCorsHeaders, supabaseRest, sendResendEmail, renderEmailPanelReady } from '../_supabase.js';
import { callExperientialAI } from '../_ai.js';

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

    // 2. Prompt Mestre de Calibração da Engenharia Tática CRIVOS
    const systemPrompt = `Você é o Engenheiro-Chefe Tático e Editorial do ecossistema CRIVOS.
Sua missão é gerar a calibração COMPLETA, matematicamente perfeita e metodologicamente blindada do Painel de Estudos Pós-Edital do aluno.

ESTRUTURA RIGOROSA DO JSON DE SAÍDA:
{
  "header_config": {
    "title": "${finalConcurso}",
    "subtitle": "${finalCargo}",
    "badge": "// SISTEMA CRIVOS ${finalTier.toUpperCase()}",
    "dates": [
      ["STATUS", "PAINEL CALIBRADO"],
      ["BANCA", "${finalBanca}"],
      ["CARGA", "${availabilityHours}H / DIA"]
    ]
  },
  "content_data": {
    "sched": [
      {
        "d": "YYYY-MM-DD",
        "h": number,
        "t": "<span class=\\"tag adm\\">ADM</span> Planejamento e organização..."
      }
      // Gerar cronograma sequencial de estudo para os primeiros 30 a 60 dias com tags (ADM, REV, ÁREA, ESCRITA) e ciclos SM-2 D+1 e D+7
    ],
    "textos": [
      {
        "id": "t1",
        "t": "Nome do Tópico 1",
        "autor": "${finalBanca} / Legislação",
        "p": "Conceito essencial e núcleo da tese do tema...",
        "tese": "Síntese em um parágrafo da posição da banca...",
        "crivo": "O que você precisa saber no domingo da prova...",
        "conceitos": [
          { "termo": "Termo 1", "def": "Definição precisa..." },
          { "termo": "Termo 2", "def": "Definição precisa..." }
        ],
        "conexoes": [
          ["Tópico Correlato", "Relação lógica..."]
        ]
      }
      // Gerar ao menos 6 a 10 tópicos centrais prioritários do edital
    ],
    "cards": [
      {
        "id": "c1",
        "f": "Pergunta do Flashcard SM-2?",
        "v": "Resposta objetiva e cirúrgica para memorização ativa.",
        "cat": "Direito / Matéria"
      }
      // Gerar ao menos 15 a 20 flashcards de alto impacto
    ],
    "sim": [
      {
        "id": "sim_1",
        "titulo": "SIMULADO DISSERTATIVO #01 // ${finalBanca}",
        "comando": "Comando dissertativo detalhado com situação hipotética...",
        "eixos": ["Eixo 1", "Eixo 2", "Eixo 3"]
      }
    ],
    "arg": [
      {
        "id": "arg_1",
        "q": "Pergunta de arguição viva-voce sobre ponto nevrálgico do edital?",
        "alvo": "Foco crítico da resposta",
        "resp": "Roteiro de defesa recomendado em tópicos...",
        "cat": "Conhecimentos Específicos"
      },
      {
        "id": "arg_2",
        "q": "Pergunta de confronto de teses ou jurisprudência da banca?",
        "alvo": "Diferenciação conceitual",
        "resp": "Roteiro de defesa recomendado...",
        "cat": "Legislação Aplicada"
      }
    ]
  }
}`;

    const userPrompt = `DADOS PARA CALIBRAÇÃO IMEDIATA:
- Aluno: ${targetUserId}
- Concurso: ${finalConcurso}
- Cargo: ${finalCargo}
- Banca Organizadora: ${finalBanca}
- Plano: ${finalTier}
- Carga Horária Disponível: ${availabilityHours} horas líquidas/dia
- Data Estimada da Prova: ${examDate || '60 dias pós-edital'}

Gere a calibração com rigor editorial suíço, sem floreios, pronta para uso imediato no painel.`;

    const aiResponse = await callExperientialAI(env, {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      maxTokens: 8000,
      responseFormat: { type: 'json_object' }
    });

    const calibratedData = JSON.parse(aiResponse);

    // 3. Persiste a calibração em `public.user_panels` e muda status para 'ready'
    await supabaseRest(env, `/user_panels?id=eq.${panel.id}`, {
      method: 'PATCH',
      body: {
        status: 'ready',
        concurso: finalConcurso,
        cargo: finalCargo,
        header_config: calibratedData.header_config,
        content_data: calibratedData.content_data,
        updated_at: new Date().toISOString(),
      },
    });

    // 4. Atualiza a ordem para 'delivered'
    if (panel.order_id) {
      await supabaseRest(env, `/orders?id=eq.${encodeURIComponent(panel.order_id)}`, {
        method: 'PATCH',
        body: {
          status: 'delivered',
          updated_at: new Date().toISOString(),
        },
      });
    }

    // 5. Envia o E-mail #2 avisando que o painel está calibrado e liberado
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
        console.warn('[calibrate] Falha não impeditiva no disparo do e-mail:', emailErr.message);
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
