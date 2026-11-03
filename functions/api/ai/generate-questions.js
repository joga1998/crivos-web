// Cloudflare Pages Function: Gerador de Questões Objetivas Adaptativas por Banca
import { getCorsHeaders } from '../_supabase.js';
import { callExperientialAI } from '../_ai.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const corsHeaders = getCorsHeaders(request);

  try {
    const body = await request.json();
    const {
      topico,
      materia,
      banca = 'VUNESP',
      concurso = 'Concurso Público',
      quantidade = 15,
      formato = 'multipla_escolha' // 'multipla_escolha' ou 'certo_errado'
    } = body;

    const isCebraspe = (banca || '').toUpperCase().includes('CEBRASPE') || formato === 'certo_errado';

    const systemPrompt = `Você é o Elaborador Sênior de Questões da Banca Oficial CRIVOS.
Sua missão é formular questões inéditas, de alto nível, rigorosamente calibradas no estilo de cobrança, vocabulário e pegadinhas da banca examinadora solicitada (${banca}).

FORMATO DE COBRANÇA:
${isCebraspe
  ? `- Estilo CEBRASPE: Itens de CERTO ou ERRADO. O enunciado apresenta uma situação fática ou comando assertivo e o candidato julga o item.`
  : `- Estilo Tradicional (${banca}): Múltipla escolha com exatamente 5 alternativas (A, B, C, D, E). Apenas UMA correta. As incorretas devem conter distratores reais e pegadinhas típicas da banca.`}

ESTRUTURA DO JSON DE RETORNO OBRIGATÓRIA (sem markdown, retorne estritamente o objeto JSON):
{
  "banca": "${banca}",
  "topico": "${topico || 'Geral'}",
  "formato": "${isCebraspe ? 'certo_errado' : 'multipla_escolha'}",
  "questoes": [
    {
      "id": "q1",
      "enunciado": "Texto integral da questão contextualizada...",
      ${isCebraspe
        ? `"gabarito": "CERTO",`
        : `"alternativas": [
             { "letra": "A", "texto": "..." },
             { "letra": "B", "texto": "..." },
             { "letra": "C", "texto": "..." },
             { "letra": "D", "texto": "..." },
             { "letra": "E", "texto": "..." }
           ],
           "gabarito": "A",`}
      "justificativa_gabarito": "Fundamentação jurídica/doutrinária concisa da resposta (1 a 2 frases)."
    }
  ]
}`;

    const userPrompt = `ELABORAR EXATAMENTE ${quantidade} QUESTÕES INÉDITAS:
- Concurso: ${concurso}
- Banca Organizadora: ${banca}
- Disciplina: ${materia || 'Conhecimentos Específicos'}
- Tópico Específico: ${topico || 'Tópico prioritário do edital'}
- Grau de Rigor: Médio para Difícil (Pós-Edital de Alta Concorrência)`;

    const aiResponse = await callExperientialAI(env, {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      maxTokens: 5500,
      reasoning: 'off',
      responseFormat: { type: 'json_object' }
    });

    let parsedResult;
    try {
      parsedResult = JSON.parse(aiResponse);
    } catch (e) {
      const match = aiResponse.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsedResult = JSON.parse(match[0]);
        } catch (innerErr) {}
      }

      // Se a resposta JSON foi cortada por limite de buffer, recupera as questões completas
      if (!parsedResult || !Array.isArray(parsedResult.questoes)) {
        const items = [];
        const itemRegex = /\{\s*"id"\s*:\s*"[^"]+"[\s\S]*?"justificativa_gabarito"\s*:\s*"(?:[^"\\]|\\.)*"[\s\S]*?\}(?=\s*,\s*\{|\s*\])/g;
        let m;
        while ((m = itemRegex.exec(aiResponse)) !== null) {
          try {
            items.push(JSON.parse(m[0]));
          } catch (err) {}
        }
        if (items.length > 0) {
          parsedResult = {
            banca,
            topico,
            formato: isCebraspe ? 'certo_errado' : 'multipla_escolha',
            questoes: items
          };
        } else {
          throw e;
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      result: parsedResult,
      generated_at: new Date().toISOString()
    }), {
      status: 200,
      headers: corsHeaders,
    });

  } catch (err) {
    console.error('[generate-questions] Erro ao processar:', err);
    return new Response(JSON.stringify({
      error: 'Falha ao gerar questões.',
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
