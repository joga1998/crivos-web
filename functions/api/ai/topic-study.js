// Cloudflare Pages Function: Motor Just-In-Time de Estudo de Tópicos e Geração de Flashcards
// Endpoint: POST /api/ai/topic-study

import { getCorsHeaders } from '../_supabase.js';
import { callExperientialAI } from '../_ai.js';

function extractJson(text) {
  if (!text) return null;
  if (typeof text === 'object') return text;
  
  // Limpeza de possíveis blocos markdown ```json ... ```
  let cleaned = String(text).trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
  }

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Tenta capturar o primeiro objeto {} balanceado
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
    const { concurso, cargo, banca = 'AOCP', materia, topico } = body;

    if (!materia || !topico) {
      return new Response(JSON.stringify({ error: 'Materia e Topico são obrigatórios.' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const systemPrompt = `Você é o Engenheiro Tático-Pedagógico da CRIVOS.
Sua missão é produzir um dossiê cirúrgico de estudo e fixação Just-in-Time sobre um tópico específico do edital para o aluno, finalizando com um lote de Flashcards de memorização ativa para repetição espaçada SM-2.

Retorne ESTRITAMENTE um objeto JSON válido no formato:
{
  "resumo_tatico": "Síntese em 2 a 3 parágrafos objetivos sobre o núcleo essencial deste assunto para a banca...",
  "tese_banca": "Posição doutrinária, jurisprudencial ou entendimento predominante da banca...",
  "pontos_atencao": [
    "Regra de ouro 1 ou dispositivo legal crítico...",
    "Regra de ouro 2 ou exceção frequente...",
    "Regra de ouro 3..."
  ],
  "pegadinha_banca": {
    "como_induz": "Como a banca monta a pegadinha na questão para enganar o candidato...",
    "blindagem": "Regra binária ou mnemônica para o candidato gabaritar com certeza."
  },
  "cards": [
    {
      "f": "Pergunta cirúrgica de Active Recall sobre o tema?",
      "v": "Resposta objetiva, direta e memorizável.",
      "cat": "${materia}"
    },
    {
      "f": "Pergunta sobre a exceção ou pegadinha da banca?",
      "v": "Resposta com o fundamento exato.",
      "cat": "${materia}"
    },
    {
      "f": "Pergunta de aplicação prática ou prazo legal?",
      "v": "Resposta precisa.",
      "cat": "${materia}"
    },
    {
      "f": "Pergunta de diferenciação conceitual?",
      "v": "Resposta contrastando os dois conceitos.",
      "cat": "${materia}"
    }
  ]
}`;

    const userPrompt = `DADOS DO TÓPICO PARA ESTUDO JUST-IN-TIME:
- Concurso: ${concurso || 'Concurso Público'}
- Cargo: ${cargo || 'Candidato'}
- Banca Examinadora: ${banca}
- Disciplina: ${materia}
- Assunto Específico do Edital: ${topico}

Gere o dossiê técnico e os flashcards com máximo rigor tático e concisão suíça.`;

    const aiResponse = await callExperientialAI(env, {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      maxTokens: 2500,
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
      error: 'Falha ao processar estudo do assunto via IA.',
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
