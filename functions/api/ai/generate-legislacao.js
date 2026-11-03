// Cloudflare Pages Function: Gerador de Legislação Ativa (Cloze Deletion & Fraudes)
import { getCorsHeaders } from '../_supabase.js';
import { callExperientialAI } from '../_ai.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const corsHeaders = getCorsHeaders(request);

  try {
    const body = await request.json();
    const {
      diploma = 'CF/88 e Legislação do Cargo',
      banca = 'Banca Examinadora',
      concurso = 'Concurso Público',
      cargo = 'Candidato',
      quantidade = 15
    } = body;

    const systemPrompt = `Você é o Auditor Sênior de Legislação e Provas da Banca CRIVOS.
Sua missão é extrair e dissecar exatamente ${quantidade} dispositivos legais reais (artigos, parágrafos e incisos) de altíssima incidência nas provas da banca ${banca} para o concurso ${concurso}.

REGRAS OBRIGATÓRIAS DE FORMATAÇÃO CLOZE (Modo Auditoria):
No texto de CADA artigo, você DEVE envolver as palavras-gatilho que as bancas usam para montar pegadinhas com marcações estritas:
- Prazos, números e frações: {{PRAZO:termo}} (ex: {{PRAZO:5 dias}}, {{PRAZO:maioria absoluta}})
- Exceções e condicionantes: {{EXCECAO:termo}} (ex: {{EXCECAO:salvo}}, {{EXCECAO:independentemente de}}, {{EXCECAO:vedada}})
- Competências e sujeitos: {{COMPETENCIA:termo}} (ex: {{COMPETENCIA:Presidente da República}}, {{COMPETENCIA:privativamente}})
- Condições e requisitos: {{CONDICAO:termo}} (ex: {{CONDICAO:após o trânsito em julgado}}, {{CONDICAO:em flagrante delito}})

ESTRUTURA DO JSON DE RETORNO OBRIGATÓRIA (sem markdown, retorne JSON puro):
{
  "artigos": [
    {
      "id": "leg_custom_1",
      "diploma": "${diploma}",
      "artigo": "Art. X, § Y",
      "prioridade": "CRITICO",
      "tema": "Tema Central do Dispositivo",
      "texto": "Texto literal do artigo com as marcações {{PRAZO:...}}, {{EXCECAO:...}}, {{COMPETENCIA:...}} e {{CONDICAO:...}}"
    }
  ],
  "fraudes": [
    {
      "id": "fr_custom_1",
      "diploma": "${diploma} - Art. X",
      "frase": "Frase do dispositivo com 1 palavra adulterada cirurgicamente no estilo da banca",
      "integro": false,
      "palavra_fraudada": "palavra_errada",
      "gabarito_correto": "palavra_certa",
      "justificativa": "Explicação da pegadinha da banca."
    }
  ]
}`;

    const userPrompt = `EXTRAIR E DISSECAR ${quantidade} ARTIGOS PRIORITÁRIOS DA LEGISLAÇÃO:
- Diploma Legal Solicitado: ${diploma}
- Concurso: ${concurso}
- Cargo: ${cargo}
- Banca Examinadora: ${banca}
- Enfoque: Artigos e parágrafos de alta incidência estatística (Filtro Pareto 80/20) com marcações cloze para memorização ativa. Inclua também 3 frases para o Caçador de Fraudes.`;

    const aiResponse = await callExperientialAI(env, {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.25,
      responseFormat: { type: 'json_object' }
    });

    let parsedResult;
    try {
      parsedResult = JSON.parse(aiResponse);
    } catch (e) {
      const match = aiResponse.match(/\{[\s\S]*\}/);
      if (match) parsedResult = JSON.parse(match[0]);
      else throw e;
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
    console.error('[generate-legislacao] Erro ao processar:', err);
    return new Response(JSON.stringify({
      error: 'Falha ao dissecar legislação ativa.',
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
