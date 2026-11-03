// Cloudflare Pages Function: Motor Just-In-Time de Estudo de Tópicos e Geração de Flashcards
// Endpoint: POST /api/ai/topic-study

import { getCorsHeaders } from '../_supabase.js';
import { callExperientialAI } from '../_ai.js';

function extractJson(text) {
  if (!text) return null;
  if (typeof text === 'object') return text;
  
  let cleaned = String(text).trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
  }

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (err) {}
    }
    throw new Error('Falha ao interpretar resposta da IA: ' + e.message);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const corsHeaders = getCorsHeaders(request);

  try {
    const body = await request.json();
    const { concurso, cargo, banca = 'Banca Examinadora', materia, topico, quantidade = 20 } = body;

    if (!materia || !topico) {
      return new Response(JSON.stringify({ error: 'Materia e Topico são obrigatórios.' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const cardCount = Math.max(3, Math.min(25, Number(quantidade) || 20));

    const systemPrompt = `Você é o Engenheiro Tático-Pedagógico da CRIVOS.
Produza um dossiê conciso e cirúrgico com exatamente ${cardCount} Flashcards SM-2 de alta precisão sobre o tópico do edital para o concurso "${concurso}" (${banca}).
Retorne ESTRITAMENTE um objeto JSON válido (sem tags markdown):
{
  "resumo_tatico": "Síntese em 2 parágrafos objetivos sobre o núcleo essencial deste assunto...",
  "tese_banca": "Posição e jurisprudência da banca...",
  "pontos_atencao": [
    "Regra de ouro 1...",
    "Regra de ouro 2..."
  ],
  "pegadinha_banca": {
    "como_induz": "Como a banca induz ao erro...",
    "blindagem": "Regra binária de certeza..."
  },
  "cards": [
    {
      "f": "Pergunta cirúrgica de Active Recall (exatamente ${cardCount} cards)?",
      "v": "Resposta direta e memorizável com dispositivo legal ou súmula.",
      "cat": "${materia}"
    }
  ]
}`;

    const userPrompt = `DADOS DO TÓPICO:
- Concurso: ${concurso || 'Concurso Público'}
- Cargo: ${cargo || 'Candidato'}
- Banca Examinadora: ${banca}
- Disciplina: ${materia}
- Assunto: ${topico}
- Solicitação: Dossiê tático + exatamente ${cardCount} flashcards inéditos e cirúrgicos de active recall cobrindo regras, prazos, exceções e pegadinhas da banca.`;

    const aiResponse = await callExperientialAI(env, {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      maxTokens: 4000,
      responseFormat: { type: 'json_object' }
    });

    const parsedData = extractJson(aiResponse);

    return new Response(JSON.stringify({
      success: true,
      materia,
      topico,
      data: parsedData
    }), {
      status: 200,
      headers: corsHeaders,
    });

  } catch (err) {
    console.error('[topic-study] Erro no processamento JIT:', err);
    return new Response(JSON.stringify({
      error: 'Falha ao processar estudo do assunto.',
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
