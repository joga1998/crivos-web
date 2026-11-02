// Cloudflare Pages Function: Motor de Calibração Autônoma de Painéis e Guias CRIVOS
// Extrai o conteúdo real do edital submetido (PDF / Texto / Storage) e calibra integralmente
// todas as 12 abas do Sistema Operacional CRIVOS (Início, Cronograma, Assuntos, Flashcards,
// Pomodoro, Simulado, Arguição, Conexões, Arquivos, Dicas, Suporte, Perfil).

import { getCorsHeaders, getSupabaseConfig, supabaseRest, sendResendEmail, renderEmailPanelReady } from '../_supabase.js';
import { callExperientialAI } from '../_ai.js';
import { getModulesByTier } from '../_provision.js';

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
  } catch (_) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (__) {
        return null;
      }
    }
    return null;
  }
}

// Decodifica escapes octais e literais básicos de strings PDF (...) Tj / [...] TJ
function decodePdfLiteralString(str) {
  return str
    .replace(/\\(\d{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, ' ')
    .replace(/\\t/g, ' ')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\');
}

function extractTextFromPdfStringChunk(chunk) {
  const out = [];
  const tjRegex = /\(([^()\\]*(?:\\.[^()\\]*)*)\)\s*Tj/g;
  let m;
  while ((m = tjRegex.exec(chunk)) !== null) {
    const s = decodePdfLiteralString(m[1]).trim();
    if (s) out.push(s);
  }
  const tjArrRegex = /\[([^\]]+)\]\s*TJ/g;
  while ((m = tjArrRegex.exec(chunk)) !== null) {
    const inner = m[1];
    const litRegex = /\(([^()\\]*(?:\\.[^()\\]*)*)\)/g;
    let lm;
    const parts = [];
    while ((lm = litRegex.exec(inner)) !== null) {
      parts.push(decodePdfLiteralString(lm[1]));
    }
    if (parts.length) out.push(parts.join(''));
  }
  return out.join(' ');
}

// Extrator nativo de texto de PDF para Cloudflare Workers (suporta streams planos e FlateDecode via DecompressionStream)
async function extractTextFromPdfBuffer(uint8Array) {
  try {
    const decoder = new TextDecoder('latin1');
    const raw = decoder.decode(uint8Array);

    if (!raw.startsWith('%PDF')) {
      return new TextDecoder('utf-8', { fatal: false }).decode(uint8Array).trim();
    }

    const extractedChunks = [];

    const plainText = extractTextFromPdfStringChunk(raw);
    if (plainText && plainText.length > 80) {
      extractedChunks.push(plainText);
    }

    if (typeof DecompressionStream !== 'undefined') {
      const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
      let match;
      let count = 0;
      while ((match = streamRegex.exec(raw)) !== null && count < 180) {
        count++;
        const streamBody = match[1];
        if (!streamBody || streamBody.length < 10 || streamBody.length > 500000) continue;

        const bytes = new Uint8Array(streamBody.length);
        for (let i = 0; i < streamBody.length; i++) {
          bytes[i] = streamBody.charCodeAt(i) & 0xff;
        }

        for (const format of ['deflate', 'deflate-raw']) {
          try {
            const ds = new DecompressionStream(format);
            const writer = ds.writable.getWriter();
            writer.write(bytes).catch(() => {});
            writer.close().catch(() => {});
            const decompressedBuf = await new Response(ds.readable).arrayBuffer();
            const decompressedStr = decoder.decode(new Uint8Array(decompressedBuf));
            const txt = extractTextFromPdfStringChunk(decompressedStr);
            if (txt && txt.trim().length > 15) {
              extractedChunks.push(txt.trim());
            }
            break;
          } catch (_) {}
        }
      }
    }

    const joined = extractedChunks.join('\n').replace(/\s{2,}/g, ' ').trim();
    return joined;
  } catch (err) {
    console.warn('[calibrate] Aviso ao extrair texto de buffer PDF:', err.message);
    return '';
  }
}

export function extractHighSignalEditalSections(rawText, cargo = '') {
  if (!rawText || typeof rawText !== 'string') return '';
  const cleaned = rawText.replace(/\r\n/g, '\n').replace(/[ \t]{2,}/g, ' ').trim();
  if (cleaned.length <= 28000) return cleaned;

  const cargoTokens = String(cargo || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(w => w.length >= 4 && !['para', 'area', 'cargo', 'nivel', 'linha', 'especialidade'].includes(w));

  const chunkSize = 1800;
  const chunks = [];
  for (let i = 0; i < cleaned.length; i += chunkSize) {
    chunks.push({
      index: i,
      text: cleaned.slice(i, i + chunkSize)
    });
  }

  const dateBuckets = [];
  const examBuckets = [];
  const syllabusBuckets = [];

  for (const chunk of chunks) {
    const norm = chunk.text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    let dateScore = 0;
    if (/cronograma|calendario|datas|eventos|inscric|isenc|aplicacao das provas|divulgacao/.test(norm)) dateScore += 4;
    const dateMatches = norm.match(/\b\d{2}\/\d{2}\/\d{4}\b/g);
    if (dateMatches) dateScore += Math.min(6, dateMatches.length);

    let examScore = 0;
    if (/quadro de provas|etapas do concurso|provas objetivas|prova discursiva|redacao|arguicao|carater eliminatorio|peso|pontuacao|numero de questoes/.test(norm)) examScore += 5;

    let syllabusScore = 0;
    if (/conteudo programatico|conhecimentos basicos|conhecimentos especificos|bibliografia|ementa|anexo/.test(norm)) syllabusScore += 5;
    for (const tk of cargoTokens) {
      if (norm.includes(tk)) syllabusScore += 4;
    }

    if (dateScore >= 4) dateBuckets.push({ ...chunk, score: dateScore });
    if (examScore >= 4) examBuckets.push({ ...chunk, score: examScore });
    if (syllabusScore >= 4) syllabusBuckets.push({ ...chunk, score: syllabusScore });
  }

  dateBuckets.sort((a, b) => b.score - a.score || a.index - b.index);
  examBuckets.sort((a, b) => b.score - a.score || a.index - b.index);
  syllabusBuckets.sort((a, b) => b.score - a.score || a.index - b.index);

  const selected = new Map();
  if (chunks[0]) selected.set(chunks[0].index, chunks[0].text);
  if (chunks[1]) selected.set(chunks[1].index, chunks[1].text);

  dateBuckets.slice(0, 3).forEach(c => selected.set(c.index, c.text));
  examBuckets.slice(0, 4).forEach(c => selected.set(c.index, c.text));
  syllabusBuckets.slice(0, 9).forEach(c => selected.set(c.index, c.text));

  const ordered = Array.from(selected.entries())
    .sort((a, b) => a[0] - b[0])
    .map(e => e[1]);

  return ordered.join('\n\n--- [TRECHO DO EDITAL] ---\n\n').slice(0, 30000);
}

async function fetchEditalTextFromStorage(env, order, userPanel, userId) {
  const { url, serviceKey } = getSupabaseConfig(env);
  if (!url || !serviceKey) return '';

  const extractedParts = [];

  if (order?.notes) {
    try {
      const notesObj = typeof order.notes === 'string' ? JSON.parse(order.notes) : order.notes;
      if (notesObj?.edital_text && String(notesObj.edital_text).trim().length > 40) {
        extractedParts.push(String(notesObj.edital_text).trim());
      }
    } catch (_) {}
  }

  if (extractedParts.length === 0 && order?.edital_file_url) {
    try {
      const cleanPath = String(order.edital_file_url).replace(/^intake-editais\//, '');
      const fileRes = await fetch(`${url}/storage/v1/object/intake-editais/${cleanPath}`, {
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`
        }
      });
      if (fileRes.ok) {
        const buf = await fileRes.arrayBuffer();
        const txt = await extractTextFromPdfBuffer(new Uint8Array(buf));
        if (txt && txt.length > 40) {
          extractedParts.push(txt);
        }
      }
    } catch (e) {
      console.warn('[calibrate] Aviso ao ler intake-editais:', e.message);
    }
  }

  try {
    let files = [];
    if (userPanel?.id && userPanel.id !== 'default-panel') {
      const resFiles = await supabaseRest(env, `/user_files?panel_id=eq.${encodeURIComponent(userPanel.id)}&order=created_at.desc&limit=5`);
      if (Array.isArray(resFiles)) files = resFiles;
    }
    if (files.length === 0 && userId && userId !== 'default-user') {
      const resFiles = await supabaseRest(env, `/user_files?user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=5`);
      if (Array.isArray(resFiles)) files = resFiles;
    }

    if (files.length > 0) {
      const fileTitles = files.map(f => `[${(f.category || 'material').toUpperCase()}] ${f.title || f.filename}`).join(' | ');
      extractedParts.push(`ARQUIVOS ANEXADOS PELO CANDIDATO: ${fileTitles}`);

      for (const f of files.slice(0, 2)) {
        if (f.storage_url && (!f.file_size_bytes || f.file_size_bytes < 6 * 1024 * 1024)) {
          try {
            const fRes = await fetch(f.storage_url);
            if (fRes.ok) {
              const fBuf = await fRes.arrayBuffer();
              const fTxt = await extractTextFromPdfBuffer(new Uint8Array(fBuf));
              if (fTxt && fTxt.length > 50) {
                extractedParts.push(`CONTEÚDO EXTRAÍDO DO ARQUIVO (${f.title || f.filename}):\n${fTxt.slice(0, 18000)}`);
              }
            }
          } catch (_) {}
        }
      }
    }
  } catch (_) {}

  return extractedParts.join('\n\n');
}

function generateTacticalSchedule(unidades, availabilityHours = 4, startDate = new Date(), examDateStr = null) {
  const sched = [];
  let currentDate = new Date(startDate);
  const hours = Number(availabilityHours) > 0 ? Number(availabilityHours) : 4;

  const d0Str = currentDate.toISOString().slice(0, 10);
  sched.push({
    d: d0Str,
    h: hours,
    f: 'SEMANA 01',
    a: 'Auditoria Inicial do Edital e Matriz de Pesos',
    obs: 'Configuração do ambiente, leitura estratégica das regras da banca e mapeamento dos tópicos de maior incidência.',
    t: '<span class="tag adm">ADM</span> Leitura estratégica do Edital, verificação dos marcos temporais e auditoria da matriz de pesos por disciplina.'
  });

  const studyDates = [];
  const list = Array.isArray(unidades) && unidades.length > 0 ? unidades : [];

  list.forEach((u, i) => {
    currentDate.setDate(currentDate.getDate() + 1);
    const dStr = currentDate.toISOString().slice(0, 10);
    const weekNum = String(Math.floor((i + 1) / 5) + 1).padStart(2, '0');
    studyDates.push({ date: dStr, unit: u.titulo, materia: u.materia, index: i + 1 });

    const topicosList = Array.isArray(u.topicos) && u.topicos.length > 0 ? u.topicos.join(' · ') : '';
    let taskHtml = `<span class="tag ar">ÁREA</span> <b>${u.titulo}</b> (${u.materia}): Estudo dirigido da teoria e conceitos essenciais do edital${topicosList ? ` (${topicosList})` : ''}. Resolução de bateria de questões da banca.`;
    if (i > 0) {
      const prev = studyDates[i - 1];
      taskHtml += ` <span class="tag rev">REV</span> Revisão ativa D+1: ${prev.unit} (15 min).`;
    }
    if (i >= 3) {
      const prev3 = studyDates[i - 3];
      taskHtml += ` <span class="tag sm">FLASH</span> Reciclagem SM-2: ${prev3.materia} (15 min).`;
    }

    sched.push({
      d: dStr,
      h: hours,
      f: `SEMANA ${weekNum}`,
      a: `${u.materia} — ${u.titulo}`,
      obs: topicosList ? `Subtópicos do edital: ${topicosList}` : 'Estudo teórico + bateria de questões comentadas da banca.',
      t: taskHtml
    });

    if ((i + 1) % 3 === 0) {
      currentDate.setDate(currentDate.getDate() + 1);
      const simDateStr = currentDate.toISOString().slice(0, 10);
      const simWeekNum = String(Math.floor((sched.length) / 6) + 1).padStart(2, '0');
      sched.push({
        d: simDateStr,
        h: hours,
        f: `SEMANA ${simWeekNum}`,
        a: `Simulado Tático de Bloco #${Math.ceil((i + 1) / 3)} (${u.materia})`,
        obs: 'Bateria cronometrada sem consulta + diagnóstico de lacunas e caderno de erros.',
        t: `<span class="tag esc">ESCRITA</span> <b>Simulado Tático de Bloco #${Math.ceil((i + 1) / 3)}</b>: Resolução cronometrada sem consulta cobrindo os blocos estudados. Correção com espelho oficial da banca e criação de novos Flashcards SM-2 para cada erro.`
      });
    }
  });

  currentDate.setDate(currentDate.getDate() + 1);
  const revDateStr = currentDate.toISOString().slice(0, 10);
  const finalWeekNum = String(Math.floor(sched.length / 6) + 1).padStart(2, '0');
  sched.push({
    d: revDateStr,
    h: hours,
    f: `SEMANA ${finalWeekNum}`,
    a: 'Revisão Geral de Véspera (Protocolo 80/20 & Blindagem de Pegadinhas)',
    obs: examDateStr ? `Reta final rumo à prova (${examDateStr}) — Foco exclusivo nos tópicos ESSENCIAIS e Flashcards SM-2 vencidos.` : 'Consolidação final dos tópicos ESSENCIAIS e bateria de revisão SM-2.',
    t: '<span class="tag rev">REV</span> <b>Protocolo de Véspera D-7</b>: Revisão panorâmica das fichas essenciais, leitura das pegadinhas clássicas da banca e zeramento da fila de Flashcards SM-2.'
  });

  return sched;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const corsHeaders = getCorsHeaders(request);

  try {
    const body = await request.json();
    const {
      orderId,
      userId,
      panelId,
      concurso,
      cargo,
      banca,
      planTier,
      availabilityHours = 4,
      routineText = '',
      examDate = '',
      editalText = ''
    } = body;

    if (!orderId && !userId) {
      return new Response(JSON.stringify({ error: 'orderId ou userId obrigatório para calibração.' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    let order = null;
    let panel = null;
    try {
      if (orderId) {
        const orders = await supabaseRest(env, `/orders?id=eq.${encodeURIComponent(orderId)}`);
        order = Array.isArray(orders) && orders.length > 0 ? orders[0] : null;
      } else if (userId && userId !== 'default-user') {
        const orders = await supabaseRest(env, `/orders?user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=1`);
        order = Array.isArray(orders) && orders.length > 0 ? orders[0] : null;
      }

      if (panelId && panelId !== 'default-panel') {
        const panels = await supabaseRest(env, `/user_panels?id=eq.${encodeURIComponent(panelId)}`);
        panel = Array.isArray(panels) && panels.length > 0 ? panels[0] : null;
      }
      if (!panel && orderId) {
        const panels = await supabaseRest(env, `/user_panels?order_id=eq.${encodeURIComponent(orderId)}`);
        panel = Array.isArray(panels) && panels.length > 0 ? panels[0] : null;
      }
      if (!panel && userId && userId !== 'default-user') {
        const panels = await supabaseRest(env, `/user_panels?user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=1`);
        panel = Array.isArray(panels) && panels.length > 0 ? panels[0] : null;
      }
    } catch (dbErr) {
      console.warn('[calibrate] Aviso ao consultar Supabase:', dbErr.message);
    }

    const targetUserId = panel?.user_id || userId;
    const finalConcurso = (concurso || panel?.concurso || order?.concurso_nome || 'Concurso Público').trim();
    const finalCargo = (cargo || panel?.cargo || order?.cargo || 'Cargo Pretendido').trim();
    const finalTier = (planTier || panel?.plan_tier || order?.plan_tier || 'tatico').toLowerCase();
    const finalBanca = (banca || panel?.header_config?.banca || '').trim();

    let orderAvailabilityText = routineText || '';
    let effectiveHours = Number(availabilityHours) || 4;
    if (order?.notes) {
      try {
        const notesObj = typeof order.notes === 'string' ? JSON.parse(order.notes) : order.notes;
        if (!orderAvailabilityText && notesObj?.availability) {
          orderAvailabilityText = notesObj.availability;
        }
        const dailyMatch = String(orderAvailabilityText).match(/Meta Di[áa]ria:\s*([\d.]+)/i);
        if (dailyMatch && dailyMatch[1]) {
          effectiveHours = parseFloat(dailyMatch[1]) || effectiveHours;
        }
      } catch (_) {}
    }

    let rawEditalContent = String(editalText || '').trim();
    if (!rawEditalContent) {
      rawEditalContent = await fetchEditalTextFromStorage(env, order, panel, targetUserId);
    }
    const filteredEditalContent = rawEditalContent
      ? extractHighSignalEditalSections(rawEditalContent, finalCargo)
      : '';

    const hasSubmittedEdital = filteredEditalContent.length > 60;

    const systemPrompt = `Você é o Engenheiro Pedagógico Chefe da CRIVOS.
Sua missão é extrair os dados reais do edital submetido (ou da estrutura oficial do certame informado) e calibrar integralmente TODAS AS 12 ABAS do Sistema Operacional de Estudos CRIVOS para o candidato.

REGRAS DE FIDELIDADE AO EDITAL:
1. Se houver TEXTO DO EDITAL SUBMETIDO abaixo, você DEVE extrair FIELMENTE dele:
   - O nome exato da Banca Examinadora / Comissão Organizadora;
   - As datas reais do cronograma do edital (inscrição, isenção, etapas, prova objetiva/discursiva/oral, resultado) no formato YYYY-MM-DD;
   - As disciplinas exatas e os subtópicos reais do Conteúdo Programático / Bibliografia específicos para o cargo "${finalCargo}";
   - Os pesos, critérios de avaliação discursiva/redação e regras de aprovação da banca.
2. Jamais invente disciplinas genéricas que não pertençam ao cargo "${finalCargo}" no concurso "${finalConcurso}".
3. Retorne EXCLUSIVAMENTE um objeto JSON válido (sem blocos markdown) seguindo rigorosamente esta estrutura:
{
  "banca_identificada": "Nome exato da Banca Examinadora",
  "resumo_auditoria_edital": "Síntese executiva em 2 frases do que foi extraído do edital (total de disciplinas, foco de peso e formato da prova).",
  "marcos_temporais": [
    ["INSCRIÇÕES (ENCERRAMENTO)", "YYYY-MM-DD"],
    ["SOLICITAÇÃO DE ISENÇÃO", "YYYY-MM-DD"],
    ["PROVA OBJETIVA / ESCRITA", "YYYY-MM-DD"],
    ["ETAPA DISCURSIVA / ARGUIÇÃO", "YYYY-MM-DD"]
  ],
  "unidades": [
    {
      "titulo": "Título específico da Unidade Tática extraída do edital",
      "materia": "Nome exato da Disciplina no Edital",
      "topicos": ["Subtópico real 1 do edital", "Subtópico real 2 do edital"]
    }
  ],
  "assuntos": [
    {
      "materia": "Nome exato da Disciplina no Edital",
      "topicos": [
        { "id": "top_1", "t": "Nome exato do Tópico do Edital", "prio": "ESSENCIAL", "peso": "ALTO" },
        { "id": "top_2", "t": "Nome exato do Tópico do Edital", "prio": "IMPORTANTE", "peso": "MÉDIO" }
      ]
    }
  ],
  "textos": [
    {
      "id": "top_1",
      "materia": "Nome da Disciplina",
      "titulo": "Título do Tópico / Obra do Edital",
      "t": "Título do Tópico / Obra do Edital",
      "autor": "Base Legal, Jurisprudência ou Autor de Referência do Edital",
      "prio": "ESSENCIAL",
      "sec": "area",
      "tese": "Síntese densa e direta do núcleo teórico cobrado pela banca neste ponto do edital.",
      "crivo": "Como a banca cobra este ponto e qual é a pegadinha clássica de prova.",
      "conceitos": [
        ["Conceito / Dispositivo 1", "Definição técnica cirúrgica para prova"],
        ["Conceito / Dispositivo 2", "Definição técnica cirúrgica para prova"],
        ["Conceito / Dispositivo 3", "Definição técnica cirúrgica para prova"]
      ]
    }
  ],
  "cards": [
    {
      "id": "dc_1",
      "t": "top_1",
      "cat": "Nome da Disciplina",
      "f": "Pergunta direta de recuperação ativa sobre o ponto do edital?",
      "v": "Resposta objetiva, fundamentada e blindada contra pegadinhas da banca."
    }
  ],
  "sim": [
    {
      "id": "sim_1",
      "titulo": "Proposta #01 — Tema Quente do Edital",
      "comando": "Enunciado completo no padrão oficial da banca examinadora cobrando os tópicos essenciais do cargo.",
      "eixos": ["Eixo de avaliação exigido 1", "Eixo de avaliação exigido 2", "Eixo de avaliação exigido 3"]
    }
  ],
  "rubric": [
    { "item": "Domínio Técnico e Atendimento aos Eixos do Edital", "max": 40, "desc": "Rigor conceitual/normativo e enfrentamento integral do comando." },
    { "item": "Articulação Argumentativa e Coerência", "max": 30, "desc": "Progressão lógica e estruturação clara dos parágrafos." },
    { "item": "Modalidade Escrita e Precisão Terminológica", "max": 30, "desc": "Correção gramatical e emprego do vocabulário técnico da área." }
  ],
  "arg": [
    {
      "id": "arg_1",
      "cat": "Nome da Disciplina",
      "q": "Pergunta incisiva de arguição / explicação ativa (Método Feynman) sobre ponto crítico do edital",
      "alvo": "Conceito, distinção ou exceção que o examinador quer testar",
      "resp": "Diretriz de resposta padrão-ouro em 60 segundos"
    }
  ],
  "mapa": {
    "nodes": [
      { "id": "n1", "label": "Conceito/Eixo 1", "materia": "Disciplina", "prio": "ESSENCIAL", "desc": "Papel central deste eixo no edital." }
    ],
    "edges": [
      ["n1", "n2", "Conexão de Prova", "Como a banca cruza esses dois temas do edital em questões complexas."]
    ]
  },
  "tabs": [
    {
      "t": "Matriz de Incidência e Perfil da Banca no Edital",
      "intro": "Mapeamento tático das disciplinas e diretrizes de cobrança extraídas do edital.",
      "rows": [
        ["Disciplina / Eixo do Edital", "Peso, perfil de cobrança da banca e foco prioritário"]
      ]
    }
  ],
  "checklist": [
    "Item 1 de verificação para o dia da prova conforme regras do edital",
    "Item 2 de verificação"
  ],
  "vespera": "Protocolo tático de revisão de véspera (D-7 e D-1) focado nos pontos 80/20 de maior peso deste edital.",
  "escrita": "Guia prático de estruturação discursiva / resolução de prova calibrado para a banca deste edital."
}`;

    const userPrompt = `CALIBRAÇÃO INTEGRAL DO SISTEMA PELO EDITAL:
- Concurso / Exame: ${finalConcurso}
- Cargo / Linha / Especialidade Alvo: ${finalCargo}
- Banca Informada: ${finalBanca || 'Identificar no edital / certame'}
- Nível do Plano: ${finalTier.toUpperCase()}
- Disponibilidade Diária: ${effectiveHours}h líquidas/dia
${orderAvailabilityText ? `- Rotina Detalhada do Candidato:\n${orderAvailabilityText}` : ''}
${examDate ? `- Data da Prova Informada: ${examDate}` : ''}
- Data de Hoje (Referência para o Cronograma): ${new Date().toISOString().slice(0, 10)}

${hasSubmittedEdital ? `====================================================================
TEXTO REAL EXTRAÍDO DO EDITAL / DOCUMENTO SUBMETIDO PELO CANDIDATO:
"""
${filteredEditalContent}
"""
====================================================================
ATENÇÃO: Extraia FIELMENTE as disciplinas, os tópicos do conteúdo programático para o cargo "${finalCargo}", a banca e as datas diretamente do texto do edital acima!` : `ATENÇÃO: O PDF não foi anexado na requisição. Utilize o conteúdo programático oficial vigente e a estrutura real da banca para o concurso "${finalConcurso}" e cargo "${finalCargo}".`}

Dimensione o retorno JSON com:
- 9 a 12 unidades táticas em "unidades" cobrindo todas as disciplinas do cargo;
- Todas as disciplinas do cargo em "assuntos" (mínimo 4 a 6 disciplinas com 4 a 6 tópicos reais cada, numerados top_1, top_2...);
- 5 a 6 fichas táticas completas em "textos" cobrindo os tópicos ESSENCIAIS (com "conceitos" como pares ["Termo", "Definição"]);
- 10 a 12 flashcards SM-2 em "cards" (id "dc_1" a "dc_12");
- 2 temas de simulado em "sim" + "rubric";
- 4 questões de arguição em "arg";
- 6 nós ("n1" a "n6") e 6 conexões em "mapa";
- 1 quadro comparativo completo em "tabs";
- 8 itens em "checklist" + textos densos em "vespera" e "escrita".`;

    const aiResponse = await callExperientialAI(env, {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      maxTokens: 12000,
      responseFormat: { type: 'json_object' }
    });

    const aiData = extractJson(aiResponse);
    if (!aiData) {
      throw new Error('Falha ao decodificar matriz JSON gerada pelo motor de IA.');
    }

    const detectedBanca = aiData.banca_identificada || finalBanca || 'Banca Oficial';
    const marcos = Array.isArray(aiData.marcos_temporais) && aiData.marcos_temporais.length > 0
      ? aiData.marcos_temporais
      : (examDate ? [['PROVA OFICIAL', examDate]] : []);

    const detectedExamMarco = marcos.find(([label]) => /prova|exame|objetiva|escrita/i.test(String(label || '')));
    const resolvedExamDate = examDate || (detectedExamMarco ? detectedExamMarco[1] : null);

    const sched = generateTacticalSchedule(aiData.unidades || [], effectiveHours, new Date(), resolvedExamDate);

    const headerConfig = {
      title: finalConcurso.toUpperCase(),
      subtitle: `${finalCargo.toUpperCase()} · ${detectedBanca.toUpperCase()}`,
      badge: `// ${finalTier.toUpperCase()}`,
      banca: detectedBanca,
      edital_extracted: hasSubmittedEdital,
      edital_audit_summary: aiData.resumo_auditoria_edital || '',
      dates: marcos.length > 0 ? marcos : undefined
    };

    const contentData = {
      meta: {
        concurso: finalConcurso,
        cargo: finalCargo,
        banca: detectedBanca,
        tier: finalTier,
        hoursPerDay: effectiveHours,
        editalExtracted: hasSubmittedEdital,
        auditSummary: aiData.resumo_auditoria_edital || '',
        calibratedAt: new Date().toISOString()
      },
      sched,
      dates: headerConfig.dates,
      assuntos: aiData.assuntos || [],
      texts: aiData.textos || [],
      textos: aiData.textos || [],
      cards: aiData.cards || [],
      sim: aiData.sim || [],
      rubric: aiData.rubric || [],
      arg: aiData.arg || [],
      mapa: aiData.mapa || { nodes: [], edges: [] },
      tabs: aiData.tabs || [],
      checklist: aiData.checklist || [],
      vespera: aiData.vespera || '',
      escrita: aiData.escrita || ''
    };

    let savedPanelId = panel?.id || null;
    if (panel && panel.id && panel.id !== 'default-panel') {
      await supabaseRest(env, `/user_panels?id=eq.${encodeURIComponent(panel.id)}`, {
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
    } else if (targetUserId && targetUserId !== 'default-user') {
      try {
        const createdPanels = await supabaseRest(env, '/user_panels', {
          method: 'POST',
          body: {
            user_id: targetUserId,
            order_id: order?.id || null,
            status: 'ready',
            plan_tier: finalTier,
            concurso: finalConcurso,
            cargo: finalCargo,
            enabled_modules: getModulesByTier(finalTier),
            header_config: headerConfig,
            content_data: contentData,
          },
          prefer: 'return=representation',
        });
        const created = Array.isArray(createdPanels) ? createdPanels[0] : createdPanels;
        if (created?.id) savedPanelId = created.id;
      } catch (createErr) {
        console.warn('[calibrate] Aviso ao criar user_panel:', createErr.message);
      }
    }

    if (panel?.order_id || order?.id) {
      const targetOrdId = panel?.order_id || order?.id;
      try {
        await supabaseRest(env, `/orders?id=eq.${encodeURIComponent(targetOrdId)}`, {
          method: 'PATCH',
          body: {
            status: 'delivered',
            updated_at: new Date().toISOString(),
          },
        });
      } catch (_) {}
    }

    if (targetUserId && targetUserId !== 'default-user') {
      try {
        const profiles = await supabaseRest(env, `/profiles?id=eq.${encodeURIComponent(targetUserId)}`);
        const profile = Array.isArray(profiles) && profiles.length > 0 ? profiles[0] : null;
        const email = profile?.email || order?.email;

        if (email) {
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
        }
      } catch (emailErr) {
        console.warn('[calibrate] Falha no disparo do e-mail:', emailErr.message);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      panelId: savedPanelId || 'calibrated-local',
      status: 'ready',
      editalExtracted: hasSubmittedEdital,
      auditSummary: aiData.resumo_auditoria_edital || '',
      headerConfig,
      contentData,
      message: hasSubmittedEdital
        ? 'Edital dissecado e painel calibrado integralmente em todas as abas!'
        : 'Painel calibrado integralmente em todas as abas!'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[engine/calibrate] Erro fatal:', err);
    return new Response(JSON.stringify({
      error: 'Erro durante a calibração autônoma do painel.',
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
