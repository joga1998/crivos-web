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
      quantidade = 5,
      formato = 'multipla_escolha' // 'multipla_escolha' ou 'certo_errado'
    } = body;

    const isCebraspe = (banca || '').toUpperCase().includes('CEBRASPE') || formato === 'certo_errado';

    const systemPrompt = `Você é o Elaborador Sênior de Questões da Banca Oficial CRIVOS.
Sua missão é formular questões inéditas, de alto nível, rigorosamente calibradas no estilo de cobrança, vocabulário e pegadinhas da banca examinadora solicitada (${banca}).

FORMATO DE COBRANÇA:
${isCebraspe
  ? `- Estilo CEBRASPE: Itens de CERTO ou ERRADO. O enunciado apresenta uma situação fática ou comando assertivo e o candidato julga o item.`
  : `- Estilo Tradicional (${banca}): Múltipla escolha com exatamente 5 alternativas (A, B, C, D, E). Apenas UMA correta. As incorretas devem conter distrationers reais e pegadinhas típicas da banca.`}

ESTRUTURA DO JSON DE RETORNO OBRIGATÓRIA:
{
  "banca": "${banca}",
  "topico": "${topico || 'Geral'}",
  "formato": "${isCebraspe ? 'certo_errado' : 'multipla_escolha'}",
  "questoes": [
    {
      "id": "q1",
      "enunciado": "Texto integral da questão contextualizada...",
      ${isCebraspe
        ? `"gabarito": "CERTO" ou "ERRADO",`
        : `"alternativas": [
             { "letra": "A", "texto": "..." },
             { "letra": "B", "texto": "..." },
             { "letra": "C", "texto": "..." },
             { "letra": "D", "texto": "..." },
             { "letra": "E", "texto": "..." }
           ],
           "gabarito": "A" (ou B, C, D, E),`}
      "justificativa_gabarito": "Explicação doutrinária/legal completa demonstrando por que o gabarito é o correto.",
      "comentario_itens": {
        ${isCebraspe
          ? `"analise": "Dissecação detalhada da pegadinha da assertiva."`
          : `"A": "Por que está certa/errada", "B": "...", "C": "...", "D": "...", "E": "..."`}
      }
    }
  ]
}`;

    const userPrompt = `ELABORAR ${quantidade} QUESTÕES INÉDITAS:
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
      responseFormat: { type: 'json_object' }
    });

    const parsedResult = JSON.parse(aiResponse);

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
