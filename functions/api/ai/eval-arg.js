// Cloudflare Pages Function: Avaliação de Resposta de Arguição Oral / Treino Feynman
import { getCorsHeaders } from '../_supabase.js';
import { callOpenRouterJSON } from '../_ai.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const corsHeaders = getCorsHeaders(request);

  try {
    const body = await request.json();
    const {
      pergunta,
      alvoCritico,
      diretrizBanca,
      respostaAluno,
      banca = 'Banca Examinadora',
      concurso = 'Concurso Público'
    } = body;

    if (!respostaAluno || !respostaAluno.trim()) {
      return new Response(JSON.stringify({ error: 'A resposta do candidato não pode estar vazia.' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const systemPrompt = `Você é o Examinador Titular da Banca Oral da CRIVOS.
Seu papel é ouvir/ler a sustentação oral do candidato e realizar uma arguição imediata com altíssimo rigor.

CRITÉRIOS DE AVALIAÇÃO:
1. Firmeza e Segurança Conceitual: O candidato foi direto ao ponto ou tergiversou?
2. Precisão Terminológica: Usou os vocábulos técnicos adequados e conceitos doutrinários/legais?
3. Tréplica do Examinador: Formule uma pergunta imediata de pressão (tréplica) que o examinador faria na hora para colocar o candidato em contradição ou testar sua profundidade.

ESTRUTURA DO JSON DE RETORNO OBRIGATÓRIA:
{
  "nota_oral": number (de 0 a 10, com uma casa decimal, ex: 7.5),
  "veredito": "APROVADO NA ARGUIÇÃO" ou "NECESSITA RETIFICAÇÃO" ou "REPROVADO POR OMISSÃO CRÍTICA",
  "analise_firmeza": "Diagnóstico cirúrgico sobre a postura, início da resposta e domínio do conceito central.",
  "pontos_acertados": ["ponto 1 que o candidato sustentou bem", "..."],
  "pontos_falhos": ["fraqueza argumentativa ou termo incorreto", "..."],
  "treplica_banca": "Pergunta contundente do examinador testando a exceção da regra ou exigindo aprofundamento imediato.",
  "roteiro_ideal": "Como o candidato deveria ter aberto e estruturado a resposta em 60 segundos."
}`;

    const userPrompt = `DADOS DA ARGUIÇÃO:
- Concurso: ${concurso}
- Banca: ${banca}
- Pergunta da Bancada: "${pergunta}"
${alvoCritico ? `- Foco Crítico Exigido: ${alvoCritico}\n` : ''}
${diretrizBanca ? `- Diretriz Padrão de Resposta da Banca: ${diretrizBanca}\n` : ''}

SUSTENTAÇÃO DO CANDIDATO:
"""
${respostaAluno}
"""`;

    const parsedResult = await callOpenRouterJSON(env, {
      systemPrompt,
      userPrompt,
      temperature: 0.2,
    });

    return new Response(JSON.stringify({
      success: true,
      result: parsedResult,
      evaluated_at: new Date().toISOString()
    }), {
      status: 200,
      headers: corsHeaders,
    });

  } catch (err) {
    console.error('[eval-arg] Erro ao processar:', err);
    return new Response(JSON.stringify({
      error: 'Falha ao avaliar arguição.',
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
