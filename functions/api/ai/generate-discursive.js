// Cloudflare Pages Function: Gerador de Propostas Discursivas e Redações Inéditas por Banca
import { getCorsHeaders } from '../_supabase.js';
import { callExperientialAI } from '../_ai.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const corsHeaders = getCorsHeaders(request);

  try {
    const body = await request.json();
    const {
      materia = 'Conhecimentos Específicos',
      topico = '',
      banca = 'Banca Examinadora',
      concurso = 'Concurso Público',
      cargo = 'Candidato',
      tipo = 'dissertativa' // 'dissertativa' | 'estudo_caso' | 'redacao_ordem_publica' | 'peca_tecnica'
    } = body;

    const systemPrompt = `Você é o Elaborador Sênior de Provas Discursivas e Redações Oficiais da CRIVOS.
Sua missão é formular uma proposta de PROVA DISCURSIVA / REDAÇÃO inédita, de alto rigor, perfeitamente alinhada ao estilo de cobrança, vocabulário e padrão de espelho da banca examinadora (${banca}) para o cargo de ${cargo} no concurso ${concurso}.

DIRETRIZES DA BANCA (${banca}):
- Se CEBRASPE: Tema contemporâneo ou estudo de caso com 3 tópicos obrigatórios enumerados (1, 2 e 3) para o candidato responder em até 30 linhas.
- Se FGV: Enunciado denso com problema prático exigindo posicionamento técnico fundamentado, precisão vernacular e conexão com a jurisprudência.
- Se FCC: Tema dissertativo-argumentativo ou estudo de caso técnico com divisão rigorosa de pontuação por aspecto temático e jurídico.
- Se VUNESP: Proposta dissertativa com textos motivadores antagônicos ou questão discursiva técnica sobre a legislação do edital.
- Outras Bancas: Proposta estruturada com situação-problema prática ligada às atribuições do cargo de ${cargo}.

ESTRUTURA DO JSON DE RETORNO OBRIGATÓRIA:
{
  "titulo": "Título técnico da proposta (ex: Simulado Discursivo Inédito - [Tema] // [Banca])",
  "tipo": "Dissertação Técnica (ou Estudo de Caso / Redação)",
  "materia": "${materia}",
  "comando": "Texto motivador completo, contextualização e o comando imperativo da prova indicando extensão (20 a 30 linhas) e os aspectos exigidos.",
  "eixos": [
    "Aspecto 1: Fundamento normativo/legal e conceitos essenciais",
    "Aspecto 2: Análise crítica, desdobramentos ou posicionamento jurisprudencial",
    "Aspecto 3: Aplicação prática, solução tática ou conclusão técnica"
  ],
  "padrao_resposta": "Síntese dos elementos que a banca exige encontrar na resposta para atribuir nota máxima (100 pontos)."
}`;

    const userPrompt = `ELABORAR PROPOSTA DISCURSIVA INÉDITA:
- Concurso: ${concurso}
- Cargo Pretendido: ${cargo}
- Banca Organizadora: ${banca}
- Disciplina / Eixo: ${materia}
- Ponto do Edital / Tópico: ${topico || 'Tópico prioritário de maior peso'}
- Formato: ${tipo}`;

    const aiResponse = await callExperientialAI(env, {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.35,
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
    console.error('[generate-discursive] Erro ao processar:', err);
    return new Response(JSON.stringify({
      error: 'Falha ao gerar proposta discursiva.',
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
