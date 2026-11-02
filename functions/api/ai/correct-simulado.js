// Cloudflare Pages Function: Correção de Prova Discursiva / Redação via Banca IA
import { getCorsHeaders } from '../_supabase.js';
import { callExperientialAI } from '../_ai.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const corsHeaders = getCorsHeaders(request);

  try {
    const body = await request.json();
    const {
      titulo,
      comando,
      eixos,
      textoAluno,
      rubric,
      banca = 'Banca Examinadora Oficial',
      concurso = 'Concurso Público'
    } = body;

    if (!textoAluno || !textoAluno.trim()) {
      return new Response(JSON.stringify({ error: 'O texto do candidato não pode estar vazio.' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const defaultRubric = rubric || [
      { item: 'Tese e Enquadramento Teórico', max: 25, desc: 'Clareza na resposta e articulação dos eixos da banca.' },
      { item: 'Domínio Conceitual e Autores', max: 35, desc: 'Uso rigoroso dos conceitos fundamentais e dispositivos legais/teóricos.' },
      { item: 'Coesão, Estrutura e Escrita', max: 40, desc: 'Progressão argumentativa, clareza e conclusão sólida.' }
    ];

    const systemPrompt = `Você é o Presidente da Banca Examinadora Oficial de Concursos Públicos do ecossistema CRIVOS.
Sua missão é avaliar a resposta discursiva do candidato com o mais estrito rigor editorial suíço, sem complacência, espelhando critérios de bancas examinadoras de elite (como Cebraspe, FGV, Vunesp, FCC).

DIRETRIZES DE AVALIAÇÃO:
1. Analise se o candidato enfrentou de forma completa todos os pontos do comando.
2. Identifique omissões doutrinárias, normativas, constitucionais ou jurisprudenciais que o candidato deixou de citar.
3. Avalie cada item da régua pontuando rigorosamente de 0 até o valor máximo do critério.
4. Forneça uma minuta ou modelo de reescrita tática gabarito demonstrando como um parágrafo nota 100/100 deveria ter sido formulado.

ESTRUTURA DO JSON DE RETORNO OBRIGATÓRIA:
{
  "nota_final": number (soma de todas as notas dos quesitos, de 0 a 100),
  "diagnostico": "Parecer sucinto, incisivo e formal da banca sobre o desempenho geral do candidato.",
  "quesitos": [
    {
      "nome": "string",
      "nota": number,
      "max": number,
      "parecer": "justificativa objetiva da nota atribuída neste critério."
    }
  ],
  "pontos_fortes": ["ponto técnico 1 que o candidato acertou", "ponto técnico 2"],
  "omissoes_criticas": ["conceito, artigo de lei, autor ou tese omitida pelo candidato", "..."],
  "minuta_gabarito": "Exemplo conciso e modelar de redação que atenderia com perfeição à expectativa da banca."
}`;

    const userPrompt = `DADOS DO CERTAME:
- Concurso: ${concurso}
- Banca: ${banca}
- Enunciado da Prova: ${titulo || ''}
${comando ? `COMANDO DA QUESTÃO:\n${comando}\n` : ''}
${eixos && eixos.length ? `EIXOS TEMÁTICOS EXIGIDOS: ${eixos.join(' · ')}\n` : ''}
RÉGUA DE PONTUAÇÃO:
${JSON.stringify(defaultRubric, null, 2)}

RESPOSTA REDIGIDA PELO CANDIDATO:
"""
${textoAluno}
"""`;

    const aiResponse = await callExperientialAI(env, {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.15,
      responseFormat: { type: 'json_object' }
    });

    const parsedResult = JSON.parse(aiResponse);

    return new Response(JSON.stringify({
      success: true,
      banca,
      concurso,
      result: parsedResult,
      evaluated_at: new Date().toISOString()
    }), {
      status: 200,
      headers: corsHeaders,
    });

  } catch (err) {
    console.error('[correct-simulado] Erro ao processar:', err);
    return new Response(JSON.stringify({
      error: 'Falha ao processar a correção da banca.',
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
