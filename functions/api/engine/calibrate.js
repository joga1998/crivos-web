// Cloudflare Pages Function: Motor de Calibração Autônoma 100% via API (DeepSeek V4.1 Flash 1017)
// Gera integralmente via API: Matriz de Assuntos, Dossiês Táticos, Cronograma alinhado até a Data da Última Prova,
// Marcos Temporais sincronizados, Flashcards SM-2, Simulados (Objetivos + Discursivos), Arguição Oral,
// Mapa de Conexões e Guia de Estudos Pós-Edital (PDF/HTML A4) + Dossiê D-7.

import { getCorsHeaders, getSupabaseConfig, supabaseRest, supabaseStorageUpload, sendResendEmail, renderEmailPanelReady } from '../_supabase.js';
import { callExperientialAI, searchLiveEditalWeb } from '../_ai.js';
import { getModulesByTier } from '../_provision.js';
import { buildFullSwissGuideDocument } from './guide-builder.js';
import { findCanonicalExam, findCanonicalCargoDetails, buildCanonicalContextText } from '../data/canonical-index.js';

// Calendário de referência de editais abertos (usado como âncora caso o candidato não anexe PDF)
const OFFICIAL_EDITAL_CALENDAR = [
  {
    match: /pm\s*sc|pol[ií]cia\s*militar.*santa\s*catarina/i,
    banca: 'Instituto AOCP',
    inscricoesFim: '2026-11-27',
    provaObjetiva: '2027-01-17',
    ultimaProva: '2027-01-17',
    etapaComplementar: ['Teste de Aptidão Física (TAF)', '2027-02-21']
  },
  {
    match: /tjsp|tribunal\s*de\s*justi[cç]a.*s[aã]o\s*paulo/i,
    banca: 'VUNESP',
    inscricoesFim: '2026-11-25',
    provaObjetiva: '2027-01-10',
    ultimaProva: '2027-01-10',
    etapaComplementar: ['Prova Prática / Títulos', '2027-02-14']
  },
  {
    match: /pc\s*pe|pol[ií]cia\s*civil.*pernambuco/i,
    banca: 'CEBRASPE',
    inscricoesFim: '2026-11-30',
    provaObjetiva: '2027-01-24',
    ultimaProva: '2027-01-24',
    etapaComplementar: ['TAF e Avaliação Psicológica', '2027-02-28']
  },
  {
    match: /pm\s*pe|cbm\s*pe|for[cç]as\s*de\s*seguran[cç]a.*pernambuco/i,
    banca: 'Instituto AOCP',
    inscricoesFim: '2026-11-28',
    provaObjetiva: '2027-01-31',
    ultimaProva: '2027-01-31',
    etapaComplementar: ['Exame de Aptidão Física (EAF)', '2027-03-07']
  },
  {
    match: /trt[-\s]*4|trt[-\s]*rs|tribunal\s*regional\s*do\s*trabalho.*4/i,
    banca: 'FCC',
    inscricoesFim: '2026-11-24',
    provaObjetiva: '2027-01-17',
    ultimaProva: '2027-01-17'
  },
  {
    match: /trt[-\s]*8|trt[-\s]*pa|tribunal\s*regional\s*do\s*trabalho.*8/i,
    banca: 'FCC',
    inscricoesFim: '2026-11-26',
    provaObjetiva: '2027-01-24',
    ultimaProva: '2027-01-24'
  },
  {
    match: /\bcgu\b|controladoria[-\s]*geral\s*da\s*uni[aã]o/i,
    banca: 'CEBRASPE',
    inscricoesFim: '2026-12-04',
    provaObjetiva: '2027-01-31',
    ultimaProva: '2027-01-31'
  },
  {
    match: /c[aâ]mara\s*dos\s*deputados/i,
    banca: 'CEBRASPE',
    inscricoesFim: '2026-12-02',
    provaObjetiva: '2027-01-24',
    ultimaProva: '2027-01-31',
    segundaProvaLabel: 'Prova Discursiva (Última Prova)'
  },
  {
    match: /dpe[-\s]*sp|defensoria.*s[aã]o\s*paulo/i,
    banca: 'FCC',
    inscricoesFim: '2026-11-29',
    provaObjetiva: '2027-01-17',
    ultimaProva: '2027-02-07',
    segundaProvaLabel: 'Provas Discursivas Especializadas (Última Prova)'
  },
  {
    match: /sefaz[-\s]*sp|secretaria\s*da\s*fazenda.*s[aã]o\s*paulo|apofp/i,
    banca: 'FCC',
    inscricoesFim: '2026-11-27',
    provaObjetiva: '2027-01-24',
    ultimaProva: '2027-01-24'
  },
  {
    match: /tce[-\s]*go|tribunal\s*de\s*contas.*goi[aá]s/i,
    banca: 'FCC',
    inscricoesFim: '2026-11-25',
    provaObjetiva: '2027-01-17',
    ultimaProva: '2027-01-17'
  },
  {
    match: /alepa|assembleia\s*legislativa.*par[aá]/i,
    banca: 'Fundação CETAP',
    inscricoesFim: '2026-11-30',
    provaObjetiva: '2027-01-24',
    ultimaProva: '2027-01-24'
  },
  {
    match: /abdi|desenvolvimento\s*industrial/i,
    banca: 'FGV',
    inscricoesFim: '2026-11-26',
    provaObjetiva: '2027-01-17',
    ultimaProva: '2027-01-17'
  },
  {
    match: /\binb\b|ind[uú]strias\s*nucleares/i,
    banca: 'FGV',
    inscricoesFim: '2026-11-28',
    provaObjetiva: '2027-01-24',
    ultimaProva: '2027-01-24'
  },
  {
    match: /pol[ií]cia\s*federal|\bpf\b/i,
    banca: 'CEBRASPE',
    inscricoesFim: '2026-12-01',
    provaObjetiva: '2027-01-24',
    ultimaProva: '2027-01-24',
    etapaComplementar: ['Exame de Aptidão Física (TAF)', '2027-02-28']
  },
  {
    match: /trf[-\s]*3|tribunal\s*regional\s*federal.*3/i,
    banca: 'VUNESP',
    inscricoesFim: '2026-11-23',
    provaObjetiva: '2027-01-31',
    ultimaProva: '2027-01-31'
  }
];

function findCatalogCalendar(concursoName = '') {
  const s = String(concursoName || '');
  return OFFICIAL_EDITAL_CALENDAR.find(item => item.match.test(s)) || null;
}

function addDaysIso(baseDateStr, days) {
  const dt = new Date(baseDateStr + 'T12:00:00Z');
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function diffDaysIso(fromIso, toIso) {
  const d1 = new Date(fromIso + 'T12:00:00Z');
  const d2 = new Date(toIso + 'T12:00:00Z');
  return Math.round((d2.getTime() - d1.getTime()) / 86400000);
}

function isValidIsoDate(str) {
  return typeof str === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(str.trim());
}

// Consolida a data da última prova do edital e os marcos temporais sincronizados
function resolveExamDatesAndMarcos(aiData, explicitExamDate, catalogEntry, todayIso) {
  let ultimaProva = '';
  if (isValidIsoDate(explicitExamDate) && diffDaysIso(todayIso, explicitExamDate.trim()) >= 7) {
    ultimaProva = explicitExamDate.trim();
  }

  const aiUltima = String(aiData?.data_ultima_prova || '').trim().slice(0, 10);
  const aiObjetiva = String(aiData?.data_prova_objetiva || '').trim().slice(0, 10);

  if (!ultimaProva && isValidIsoDate(aiUltima) && diffDaysIso(todayIso, aiUltima) >= 14 && diffDaysIso(todayIso, aiUltima) <= 240) {
    ultimaProva = aiUltima;
  }

  // Verifica se há marcos_temporais retornados pela IA com datas de prova futuras
  const rawAiMarcos = Array.isArray(aiData?.marcos_temporais) ? aiData.marcos_temporais : [];
  const examMarcosFromAi = rawAiMarcos
    .filter(m => Array.isArray(m) && m.length >= 2 && /prova|exame|objetiva|discursiva|redac|2ª fase/i.test(String(m[0])) && !/inscri|isenc|local|locais|taf|f[ií]sic|t[ií]tulo/i.test(String(m[0])))
    .map(m => String(m[1]).trim().slice(0, 10))
    .filter(d => isValidIsoDate(d) && diffDaysIso(todayIso, d) >= 14 && diffDaysIso(todayIso, d) <= 240)
    .sort();

  if (!ultimaProva && examMarcosFromAi.length > 0) {
    ultimaProva = examMarcosFromAi[examMarcosFromAi.length - 1];
  }

  if (!ultimaProva && catalogEntry?.ultimaProva && diffDaysIso(todayIso, catalogEntry.ultimaProva) >= 14) {
    ultimaProva = catalogEntry.ultimaProva;
  }

  if (!ultimaProva) {
    // Fallback dinâmico: 75 dias a partir de hoje (alinhado ao domingo mais próximo)
    const fallbackDt = new Date(todayIso + 'T12:00:00Z');
    fallbackDt.setUTCDate(fallbackDt.getUTCDate() + 75);
    const dayOfWeek = fallbackDt.getUTCDay();
    if (dayOfWeek !== 0) {
      fallbackDt.setUTCDate(fallbackDt.getUTCDate() + (7 - dayOfWeek));
    }
    ultimaProva = fallbackDt.toISOString().slice(0, 10);
  }

  let provaObjetiva = (isValidIsoDate(aiObjetiva) && diffDaysIso(todayIso, aiObjetiva) >= 14 && aiObjetiva <= ultimaProva)
    ? aiObjetiva
    : (catalogEntry?.provaObjetiva && catalogEntry.provaObjetiva <= ultimaProva ? catalogEntry.provaObjetiva : ultimaProva);

  // Calcula marcos sincronizados com a data da última prova
  const totalDaysToExam = diffDaysIso(todayIso, ultimaProva);
  let inscricoesFim = catalogEntry?.inscricoesFim || '';
  const aiInscMarco = rawAiMarcos.find(m => Array.isArray(m) && /inscri/i.test(String(m[0])));
  if (aiInscMarco && isValidIsoDate(String(aiInscMarco[1]).slice(0, 10))) {
    const candInsc = String(aiInscMarco[1]).slice(0, 10);
    if (candInsc >= todayIso && candInsc < provaObjetiva) {
      inscricoesFim = candInsc;
    }
  }
  if (!inscricoesFim || inscricoesFim < todayIso || inscricoesFim >= provaObjetiva) {
    inscricoesFim = addDaysIso(todayIso, Math.max(7, Math.min(28, Math.floor(totalDaysToExam * 0.32))));
  }

  const locaisProvaDate = addDaysIso(provaObjetiva, -10);
  const vesperaD7Date = addDaysIso(ultimaProva, -7);

  const marcos = [
    ['Início do Cronograma', `${todayIso}T08:00`],
    ['Término das Inscrições', `${inscricoesFim}T23:59`],
    ['Divulgação dos Locais de Prova', `${locaisProvaDate > todayIso ? locaisProvaDate : addDaysIso(provaObjetiva, -5)}T14:00`],
    ['Protocolo de Véspera D-7', `${vesperaD7Date > todayIso ? vesperaD7Date : addDaysIso(ultimaProva, -3)}T08:00`]
  ];

  if (provaObjetiva < ultimaProva) {
    marcos.push(['Prova Objetiva (1ª Fase)', `${provaObjetiva}T13:00`]);
    marcos.push([catalogEntry?.segundaProvaLabel || 'Prova Discursiva (Última Prova)', `${ultimaProva}T13:00`]);
  } else {
    marcos.push(['Dia da Prova Oficial', `${ultimaProva}T13:00`]);
  }

  if (catalogEntry?.etapaComplementar && catalogEntry.etapaComplementar[1] > ultimaProva) {
    marcos.push([catalogEntry.etapaComplementar[0], `${catalogEntry.etapaComplementar[1]}T08:00`]);
  }

  marcos.sort((a, b) => String(a[1]).localeCompare(String(b[1])));

  return {
    todayIso,
    inscricoesFim,
    locaisProvaDate,
    vesperaD7Date,
    provaObjetiva,
    ultimaProva,
    marcos
  };
}

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
      while ((match = streamRegex.exec(raw)) !== null && count < 140) {
        count++;
        const streamBody = match[1];
        if (!streamBody || streamBody.length < 10 || streamBody.length > 400000) continue;

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

    return extractedChunks.join('\n').replace(/\s{2,}/g, ' ').trim();
  } catch (err) {
    console.warn('[calibrate] Aviso ao extrair texto de buffer PDF:', err.message);
    return '';
  }
}

export function extractHighSignalEditalSections(rawText, cargo = '') {
  if (!rawText || typeof rawText !== 'string') return '';
  const cleaned = rawText.replace(/\r\n/g, '\n').replace(/[ \t]{2,}/g, ' ').trim();
  if (cleaned.length <= 12000) return cleaned;

  const cargoTokens = String(cargo || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(w => w.length >= 4 && !['para', 'area', 'cargo', 'nivel', 'linha', 'especialidade'].includes(w));

  const chunkSize = 1500;
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
  dateBuckets.slice(0, 2).forEach(c => selected.set(c.index, c.text));
  examBuckets.slice(0, 2).forEach(c => selected.set(c.index, c.text));
  syllabusBuckets.slice(0, 14).forEach(c => selected.set(c.index, c.text));

  const ordered = Array.from(selected.entries())
    .sort((a, b) => a[0] - b[0])
    .map(e => e[1]);

  return ordered.join('\n\n--- [TRECHO DO EDITAL] ---\n\n').slice(0, 20000);
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
      const studentOnlyFiles = files.filter(f => !/Guia_Tatico_Pos_Edital|Dossie_Vespera_D7/i.test(String(f.filename || f.title || '')));
      if (studentOnlyFiles.length > 0) {
        const fileTitles = studentOnlyFiles.map(f => `[${(f.category || 'material').toUpperCase()}] ${f.title || f.filename}`).join(' | ');
        extractedParts.push(`ARQUIVOS ANEXADOS PELO CANDIDATO: ${fileTitles}`);

        for (const f of studentOnlyFiles.slice(0, 2)) {
          const cleanUrl = String(f.storage_url || '').replace('/user-materials/user-materials/', '/user-materials/');
          if (cleanUrl && !cleanUrl.endsWith('.html') && (!f.file_size_bytes || f.file_size_bytes < 6 * 1024 * 1024)) {
            try {
              const fRes = await fetch(cleanUrl);
              if (fRes.ok) {
                const fBuf = await fRes.arrayBuffer();
                const fTxt = await extractTextFromPdfBuffer(new Uint8Array(fBuf));
                if (fTxt && fTxt.length > 50) {
                  extractedParts.push(`CONTEÚDO EXTRAÍDO DO ARQUIVO (${f.title || f.filename}):\n${fTxt.slice(0, 12000)}`);
                }
              }
            } catch (_) {}
          }
        }
      }
    }
  } catch (_) {}

  return extractedParts.join('\n\n');
}

// Constrói o cronograma diário completo de HOJE até a DATA DA ÚLTIMA PROVA DO EDITAL,
// utilizando as missões táticas geradas pela IA (`aiBlocos`) e cravando os marcos oficiais nas datas exatas.
function buildExamAlignedSchedule({
  aiBlocos,
  unidades,
  availabilityHours = 4,
  dateInfo,
  banca = 'Banca Oficial'
}) {
  const sched = [];
  const hours = Number(availabilityHours) > 0 ? Number(availabilityHours) : 4;
  const { todayIso, inscricoesFim, locaisProvaDate, vesperaD7Date, provaObjetiva, ultimaProva } = dateInfo;

  const totalDays = Math.max(14, Math.min(180, diffDaysIso(todayIso, ultimaProva)));

  // Blocos gerados pela IA via API
  const baseMissions = (Array.isArray(aiBlocos) && aiBlocos.length > 0)
    ? aiBlocos.map(b => ({
        t: String(b.t || 'TEORIA').replace(/<[^>]*>/g, '').trim().toUpperCase(),
        materia: b.materia || 'Conhecimentos Específicos',
        a: b.a || `${b.materia || 'Disciplina'} — Tópico Prioritário`,
        obs: b.obs || `Estudo dirigido e resolução de questões da banca ${banca}.`
      }))
    : (Array.isArray(unidades) && unidades.length > 0 ? unidades : [
        { materia: 'Conhecimentos Específicos', titulo: 'Núcleo Prioritário do Edital', topicos: ['Legislação e Jurisprudência'] }
      ]).map(u => ({
        t: 'TEORIA',
        materia: u.materia || 'Disciplina',
        a: `${u.materia} — ${u.titulo}`,
        obs: `Tópicos do edital: ${(u.topicos || []).join(' · ')}`
      }));

  const cycleEvolution = [
    { suffix: '', defaultTag: 'TEORIA', prefix: 'Ciclo 1 (Base & Lei Seca)' },
    { suffix: ' · Engenharia Reversa', defaultTag: 'PRÁTICA', prefix: 'Ciclo 2 (Bateria de Questões da Banca)' },
    { suffix: ' · Active Recall & Erros', defaultTag: 'CONSOLIDAÇÃO', prefix: 'Ciclo 3 (Domínio de Exceções e Pegadinhas)' },
    { suffix: ' · Corte 80/20', defaultTag: 'RETA FINAL', prefix: 'Ciclo 4 (Revisão Acelerada de Alta Incidência)' }
  ];

  let missionCursor = 0;

  for (let dayOffset = 0; dayOffset <= totalDays; dayOffset++) {
    const dStr = addDaysIso(todayIso, dayOffset);
    const weekNum = String(Math.floor(dayOffset / 7) + 1).padStart(2, '0');
    const fLabel = `SEMANA ${weekNum}`;
    const daysRemaining = totalDays - dayOffset;

    // 1. Dia 0 (Hoje): Auditoria de Partida
    if (dayOffset === 0) {
      const m0 = baseMissions[0] || { a: 'Mapeamento Inicial do Edital', obs: '' };
      sched.push({
        d: dStr,
        h: hours,
        f: fLabel,
        t: 'ADM',
        a: `Auditoria Inicial do Edital & Partida Tática: ${m0.a}`,
        obs: `Marco Zero (${todayIso}) rumo à prova em ${ultimaProva} (${totalDays} dias). ${m0.obs}`
      });
      missionCursor++;
      continue;
    }

    // 2. Dia da Última Prova (Encerramento Exato do Cronograma)
    if (dStr === ultimaProva) {
      sched.push({
        d: dStr,
        h: hours,
        f: fLabel,
        t: 'PROVA',
        a: provaObjetiva < ultimaProva
          ? `DIA DA ÚLTIMA PROVA OFICIAL (2ª FASE / DISCURSIVA — ${banca})`
          : `DIA DA PROVA OFICIAL (${banca}) — EXECUÇÃO DE PROVA`,
        obs: 'Execução da prova oficial. Chegar com 1h de antecedência, documento original com foto, caneta transparente preta e aplicar gestão estrita de tempo.'
      });
      continue;
    }

    // 3. Caso exista Prova Objetiva anterior à Prova Discursiva
    if (provaObjetiva < ultimaProva && dStr === provaObjetiva) {
      sched.push({
        d: dStr,
        h: hours,
        f: fLabel,
        t: 'PROVA',
        a: `DIA DA PROVA OBJETIVA (1ª FASE — ${banca})`,
        obs: 'Execução da Prova Objetiva Oficial. Controle de tempo por questão, marcação segura do cartão-resposta e início imediato da preparação exclusiva para a 2ª Fase.'
      });
      continue;
    }

    // 4. Véspera D-1 da Última Prova
    if (daysRemaining === 1) {
      sched.push({
        d: dStr,
        h: Math.min(hours, 3),
        f: fLabel,
        t: 'REVISÃO',
        a: `Véspera Oficial (D-1) — Blindagem de Pegadinhas ${banca} & Checklist`,
        obs: `Véspera da prova (${ultimaProva}): leitura leve do Dossiê D-7, revisão final dos flashcards críticos SM-2, separação de documentos e descanso cognitivo.`
      });
      continue;
    }

    // 5. Início da Reta Final D-7 (exatamente 7 dias antes da última prova)
    if (dStr === vesperaD7Date) {
      sched.push({
        d: dStr,
        h: hours,
        f: fLabel,
        t: 'RETA FINAL',
        a: `MARCO D-7 // Ativação do Protocolo de Véspera 80/20 (${banca})`,
        obs: `Faltam 7 dias para a prova (${ultimaProva}). Suspensão de conteúdos secundários e foco 100% nas fichas ESSENCIAIS, Súmulas, Prazos e Dossiê D-7.`
      });
      continue;
    }

    // 6. Simulado Tático a cada 6 dias de estudo
    if (dayOffset % 6 === 0) {
      const simNumber = Math.floor(dayOffset / 6);
      const refMission = baseMissions[missionCursor % baseMissions.length];
      sched.push({
        d: dStr,
        h: hours,
        f: fLabel,
        t: 'SIMULADO',
        a: `Simulado Tático & Diagnóstico #${String(simNumber).padStart(2, '0')} (${refMission.materia || banca})`,
        obs: `Bateria cronometrada no padrão ${banca} cobrindo os tópicos estudados na ${fLabel} + revisão de erros e retroalimentação da fila SM-2.`
      });
      continue;
    }

    // 7. Missão Tática Diária gerada pela IA (com alertas de marcos do edital caso coincidam com a data)
    const rawM = baseMissions[missionCursor % baseMissions.length];
    const passIdx = Math.min(3, Math.floor(missionCursor / baseMissions.length));
    const cyc = daysRemaining <= 7 ? cycleEvolution[3] : cycleEvolution[passIdx];

    let marcoPrefix = '';
    if (dStr === inscricoesFim) {
      marcoPrefix = '[⚠️ MARCO DO EDITAL HOJE: TÉRMINO DAS INSCRIÇÕES — Confirmar inscrição e pagamento da GRU/boleto] · ';
    } else if (dStr === locaisProvaDate) {
      marcoPrefix = '[📍 MARCO DO EDITAL HOJE: DIVULGAÇÃO DOS LOCAIS DE PROVA — Consultar cartão de confirmação] · ';
    }

    const prevM = baseMissions[(missionCursor - 1 + baseMissions.length) % baseMissions.length];
    const sm2M = baseMissions[(missionCursor - 3 + baseMissions.length * 4) % baseMissions.length];

    const tagToUse = daysRemaining <= 7
      ? 'RETA FINAL'
      : (passIdx === 0 ? (rawM.t || cyc.defaultTag) : cyc.defaultTag);

    sched.push({
      d: dStr,
      h: hours,
      f: fLabel,
      t: tagToUse,
      a: `${rawM.a}${passIdx > 0 ? cyc.suffix : ''}`,
      obs: `${marcoPrefix}${cyc.prefix}: ${rawM.obs} | Revisão D+1 (15 min): ${prevM.a} | Fila SM-2 (15 min): ${sm2M.materia}`
    });

    missionCursor++;
  }

  return sched;
}

function escapeHtmlServer(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Gera o documento HTML/PDF Editorial Suíço A4 do Guia de Estudos Pós-Edital (12 seções) e do Dossiê D-7 (50 Pegadinhas)
function buildStudyGuideHtmlDocument(contentData, headerConfig, mode = 'guia') {
  return buildFullSwissGuideDocument(contentData, headerConfig, mode);
}

export async function runCalibrationEngine(env, body = {}) {
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
    editalText = '',
    forceRecalibrate = false
  } = body;

  if (!orderId && !userId && !panelId) {
    const err = new Error('orderId, panelId ou userId obrigatório para calibração.');
    err.statusCode = 400;
    throw err;
  }

  // 1. Localiza a ordem e o painel correspondente no Supabase
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

  // Trava de idempotência: se o painel já está `ready` com cronograma completo e não foi pedido forceRecalibrate
  if (
    !forceRecalibrate &&
    !editalText &&
    panel?.status === 'ready' &&
    panel?.content_data &&
    Array.isArray(panel.content_data.sched) &&
    panel.content_data.sched.length > 5 &&
    Array.isArray(panel.content_data.assuntos) &&
    panel.content_data.assuntos.length > 0
  ) {
    console.log(`[calibrate] Painel ${panel.id} já se encontra calibrado (idempotência ativa — 0 tokens gastos).`);
    return {
      success: true,
      panelId: panel.id,
      status: 'ready',
      alreadyCalibrated: true,
      headerConfig: panel.header_config,
      contentData: panel.content_data,
      message: 'Painel já calibrado e pronto!'
    };
  }

  // Trava contra execução concorrente simultânea (ex.: webhook waitUntil + sucesso.html chamando juntos)
  if (!forceRecalibrate && panel?.id && panel?.status === 'calibrating') {
    const lockTs = Number(panel?.header_config?.calibration_lock_ts || 0);
    if (lockTs && (Date.now() - lockTs) < 22000) {
      console.log(`[calibrate] Calibração em andamento para painel ${panel.id}, aguardando conclusão...`);
      for (let i = 0; i < 8; i++) {
        await new Promise(r => setTimeout(r, 2500));
        const checkPanels = await supabaseRest(env, `/user_panels?id=eq.${encodeURIComponent(panel.id)}`);
        const checkP = Array.isArray(checkPanels) ? checkPanels[0] : null;
        if (checkP?.status === 'ready' && checkP?.content_data?.sched?.length > 5) {
          return {
            success: true,
            panelId: checkP.id,
            status: 'ready',
            alreadyCalibrated: true,
            headerConfig: checkP.header_config,
            contentData: checkP.content_data,
            message: 'Painel calibrado com sucesso!'
          };
        }
      }
    } else {
      try {
        await supabaseRest(env, `/user_panels?id=eq.${encodeURIComponent(panel.id)}`, {
          method: 'PATCH',
          body: {
            header_config: {
              ...(panel.header_config || {}),
              calibration_lock_ts: Date.now()
            }
          }
        });
      } catch (_) {}
    }
  }

  const targetUserId = panel?.user_id || order?.user_id || userId;
  const finalConcurso = (concurso || panel?.concurso || order?.concurso_nome || 'Concurso Público').trim();
  const finalCargo = (cargo || panel?.cargo || order?.cargo || 'Cargo Pretendido').trim();
  const finalTier = (planTier || panel?.plan_tier || order?.plan_tier || 'tatico').toLowerCase();
  const catalogRef = findCatalogCalendar(finalConcurso);
  const finalBanca = (banca || panel?.header_config?.banca || catalogRef?.banca || '').trim();
  const todayIso = new Date().toISOString().slice(0, 10);

  let orderAvailabilityText = routineText || '';
  let effectiveHours = Number(availabilityHours) || 4;
  let hasOrderBump = false;
  if (order?.notes) {
    try {
      const notesObj = typeof order.notes === 'string' ? JSON.parse(order.notes) : order.notes;
      if (!orderAvailabilityText && notesObj?.availability) {
        orderAvailabilityText = notesObj.availability;
      }
      if (notesObj?.order_bump) hasOrderBump = true;
      const dailyMatch = String(orderAvailabilityText).match(/Meta Di[áa]ria:\s*([\d.]+)/i);
      if (dailyMatch && dailyMatch[1]) {
        effectiveHours = parseFloat(dailyMatch[1]) || effectiveHours;
      }
    } catch (_) {}
  }
  if (order?.amount_cents && [5600, 8600, 11600, 23600].includes(Number(order.amount_cents))) {
    hasOrderBump = true;
  }

  // 2. Extração de Conteúdo Programático e Edital em 3 Camadas Oficiais:
  // Camada 1: Catálogo Canônico CRIVOS Auditado (concursos-base.json via crivo-update) — $0 tokens, instantâneo
  // Camada 2: Arquivo enviado pelo Aluno (PDF extraído no Supabase Storage ou intake) — fidelidade a retificações próprias
  // Camada 3: Pesquisa em Tempo Real na Web (OpenRouter Web Plugin) — retaguarda de contingência para certames novos
  let rawEditalContent = String(editalText || '').trim();
  if (!rawEditalContent) {
    rawEditalContent = await fetchEditalTextFromStorage(env, order, panel, targetUserId);
  }

  const canonicalExam = findCanonicalExam(finalConcurso);
  const canonicalCargo = canonicalExam ? findCanonicalCargoDetails(canonicalExam, finalCargo) : null;
  const canonicalText = canonicalExam ? buildCanonicalContextText(canonicalExam, canonicalCargo) : '';

  let sourceOrigin = 'custom';
  if (rawEditalContent && rawEditalContent.length > 80) {
    sourceOrigin = 'user_upload';
    // Se temos dados canônicos e o upload do usuário, combinamos os dois com prioridade às disciplinas do canônico auditado
    if (canonicalText) {
      rawEditalContent = `${canonicalText}\n\n=== EDITAL ANEXADO PELO ALUNO / COMPLEMENTO ===\n${rawEditalContent}`;
    }
  } else if (canonicalText) {
    sourceOrigin = 'canonical_catalog';
    rawEditalContent = canonicalText;
    console.log(`[calibrate] Certame "${finalConcurso}" localizado no Catálogo Canônico CRIVOS (${canonicalExam.nome}). 0 tokens de busca web gastos.`);
  } else {
    // Camada 3: Edital não cadastrado e não anexado -> Busca Web em tempo real
    console.log(`[calibrate] Certame não localizado no catálogo canônico nem anexado. Acionando busca web em tempo real para "${finalConcurso}" — "${finalCargo}"...`);
    try {
      const liveWebData = await searchLiveEditalWeb(env, finalConcurso, finalCargo);
      if (liveWebData && liveWebData.length > 80) {
        rawEditalContent = liveWebData;
        sourceOrigin = 'web_search';
        console.log(`[calibrate] Edital obtido com sucesso via busca Web em tempo real (${rawEditalContent.length} chars).`);
      }
    } catch (searchErr) {
      console.warn('[calibrate] Falha na busca Web de edital:', searchErr.message);
    }
  }

  const filteredEditalContent = (sourceOrigin === 'user_upload' && rawEditalContent)
    ? extractHighSignalEditalSections(rawEditalContent, finalCargo)
    : '';

  const hasSubmittedEdital = Boolean(rawEditalContent && rawEditalContent.length > 60);
  const isCebraspeHint = (finalBanca || canonicalExam?.banca || '').toUpperCase().includes('CEBRASPE');

  // 3. Arquitetura Paralela 100% via API (2 chamadas simultâneas em Promise.all no DeepSeek V4.1 Flash 1017):
  // - Chamada A: Datas Oficiais, Marcos, Matriz de Assuntos, Dossiês Táticos e Blocos do Cronograma (~9-11s)
  // - Chamada B: Flashcards SM-2, Questões Objetivas Inéditas, Simulados Discursivos, Arguição, Mapa e Guia PDF (~9-11s)
  // Isso garante zero truncamento de JSON, máxima densidade em todos os módulos e conclusão total em ~10-12s!

  // Se veio do canônico, o calendário de referência é 100% oficial e preciso
  const resolvedCatalog = canonicalExam?.calendario
    ? {
        inscricoesFim: canonicalExam.calendario.inscricoes_fim,
        provaObjetiva: canonicalExam.calendario.prova_objetiva,
        ultimaProva: canonicalExam.calendario.ultima_prova || canonicalExam.calendario.prova_objetiva,
        etapaComplementar: canonicalExam.calendario.etapa_complementar || null,
        banca: canonicalExam.banca
      }
    : catalogRef;

  const refDatesHint = resolvedCatalog
    ? `- Referência Oficial do Calendário deste Certame: Fim das Inscrições em ${resolvedCatalog.inscricoesFim}, Prova Objetiva em ${resolvedCatalog.provaObjetiva}, Última Prova em ${resolvedCatalog.ultimaProva}.\n`
    : '';

  const editalSourceText = (filteredEditalContent.length > 60) ? filteredEditalContent : rawEditalContent;

  const baseContextBlock = `- Data de Hoje: ${todayIso}
- Concurso/Exame: ${finalConcurso}
- Cargo/Especialidade: ${finalCargo}
- Banca: ${finalBanca || resolvedCatalog?.banca || 'Identificar banca oficial do certame'}
- Plano: ${finalTier.toUpperCase()}
- Disponibilidade Diária: ${effectiveHours}h/dia
${examDate ? `- Data da Última Prova Informada: ${examDate}\n` : refDatesHint}${hasSubmittedEdital ? `\nINFORMAÇÕES OFICIAIS DO CERTAME/EDITAL (FONTE: ${sourceOrigin.toUpperCase()}):\n"""\n${editalSourceText.slice(0, 16000)}\n"""` : `\nUse a matriz programática oficial vigente e o calendário real do edital para "${finalConcurso}" — "${finalCargo}".`}`;



  const systemPromptCore = `Você é o Engenheiro Pedagógico Chefe da CRIVOS.
Extraia os dados reais do edital/certame para o cargo "${finalCargo}" no concurso "${finalConcurso}" (Hoje: ${todayIso}).
REGRAS:
1. Identifique a Banca, a data da Prova Objetiva ("data_prova_objetiva") e a DATA DA ÚLTIMA PROVA DO EDITAL ("data_ultima_prova", YYYY-MM-DD, sempre futura a ${todayIso}), mais os "marcos_temporais" sincronizados.
2. Todo item de "textos" DEVE usar o mesmo "id" ("top_1" a "top_5") dos tópicos de "assuntos".
3. Seja direto e cirúrgico (máximo 25 palavras por campo textual) e retorne JSON compacto.
Retorne EXCLUSIVAMENTE JSON válido:
{
  "banca_identificada": "Nome da Banca",
  "resumo_auditoria_edital": "Síntese executiva em 1 frase do mapeamento do cargo.",
  "nota_corte_estimada": 78,
  "pesos_disciplinas": [
    { "materia": "Nome da Disciplina", "peso": 2, "questoes_estimadas": 15 }
  ],
  "data_prova_objetiva": "YYYY-MM-DD",
  "data_ultima_prova": "YYYY-MM-DD",
  "marcos_temporais": [
    ["Término das Inscrições", "YYYY-MM-DD"],
    ["Divulgação dos Locais de Prova", "YYYY-MM-DD"],
    ["Protocolo de Véspera D-7", "YYYY-MM-DD"],
    ["Dia da Prova Oficial", "YYYY-MM-DD"]
  ],
  "assuntos": [
    {
      "materia": "Nome da Disciplina (extraia TODAS as disciplinas do edital, até 12 disciplinas)",
      "topicos": [
        { "id": "top_1", "t": "Tópico programático real (listar de 4 a 6 tópicos por disciplina, cobrindo integralmente o conteúdo programático)", "prio": "ESSENCIAL", "peso": "ALTO" }
      ]
    }
  ],
  "textos": [
    {
      "id": "top_1",
      "materia": "Disciplina",
      "titulo": "Tópico real 1 (exatamente 5 fichas: top_1 a top_5)",
      "t": "Tópico real 1",
      "autor": "Artigos de Lei / Súmulas",
      "prio": "ESSENCIAL",
      "sec": "area",
      "tese": "Síntese técnica densa em até 30 palavras com artigos e jurisprudência.",
      "crivo": "Pegadinha clássica da banca em 1 frase curta.",
      "conceitos": [
        ["Dispositivo 1", "Regra exata de prova em 1 frase curta"],
        ["Dispositivo 2", "Exceção ou prazo cobrado pela banca"]
      ]
    }
  ],
  "blocos_cronograma": [
    {
      "t": "TEORIA",
      "materia": "Disciplina",
      "a": "Disciplina — Missão Tática Específica (exatamente 8 missões sequenciais cobrindo as disciplinas do edital)",
      "obs": "Diretriz operacional curta (até 20 palavras) citando artigos e foco na banca."
    }
  ]
}`;

  const systemPromptPractice = `Você é o Examinador Titular e Estrategista Chefe da Banca para o concurso "${finalConcurso}" — Cargo "${finalCargo}".
Elabore a bateria de treinamento ativo, simulados, flashcards, arguição, mapa de conexões e guia estratégico em PDF.
REGRAS:
1. Seja cirúrgico e conciso (máximo 25 palavras por campo textual) e retorne JSON compacto.
2. Em "questoes_objetivas", gere 3 questões inéditas no formato exato da banca (${isCebraspeHint ? 'estilo CEBRASPE: gabarito "CERTO" ou "ERRADO", sem campo alternativas' : 'estilo Múltipla Escolha: 5 alternativas curtas A a E e gabarito com a letra correta'}).
Retorne EXCLUSIVAMENTE JSON válido:
{
  "guia_estrategico": {
    "raio_x_banca": "Perfil técnico de cobrança da banca neste cargo em 2 frases.",
    "plano_corte_80_20": "Diretriz de priorização 80/20 das disciplinas de maior peso em 2 frases.",
    "armadilhas_fatais": "As 3 pegadinhas mais letais da banca nas disciplinas nucleares."
  },
  "cards": [
    {
      "id": "dc_api_1",
      "t": "top_1",
      "cat": "Disciplina",
      "f": "Pergunta cirúrgica de Active Recall (exatamente 8 flashcards: dc_api_1 a dc_api_8)?",
      "v": "Resposta direta em 1 frase com fundamento legal exato."
    }
  ],
  "questoes_objetivas": [
    {
      "id": "q_cal_1",
      "topico": "Disciplina / Tópico",
      "enunciado": "Enunciado inédito conciso no padrão da banca (exatamente 3 questões: q_cal_1 a q_cal_3)...",
      ${isCebraspeHint ? `"gabarito": "CERTO",` : `"alternativas": [
        { "letra": "A", "texto": "..." },
        { "letra": "B", "texto": "..." },
        { "letra": "C", "texto": "..." },
        { "letra": "D", "texto": "..." },
        { "letra": "E", "texto": "..." }
      ],
      "gabarito": "A",`}
      "justificativa_gabarito": "Fundamentação técnica/legal concisa em 1 frase."
    }
  ],
  "sim": [
    {
      "id": "sim_1",
      "titulo": "Proposta Discursiva #01 — Tema Quente do Cargo (exatamente 2 propostas: sim_1 e sim_2)",
      "comando": "Enunciado conciso no padrão da banca exigindo análise técnica aplicada ao cargo.",
      "eixos": ["Eixo 1 exigido", "Eixo 2 exigido", "Eixo 3 exigido"]
    }
  ],
  "rubric": [
    { "item": "Domínio Normativo e Enfrentamento dos Eixos", "max": 40, "desc": "Precisão nos dispositivos legais e jurisprudência." },
    { "item": "Articulação Argumentativa e Estudo de Caso", "max": 30, "desc": "Coerência lógica e conexão prática com o cargo." },
    { "item": "Norma Culta e Terminologia Técnica", "max": 30, "desc": "Clareza, concisão e rigor vocabular." }
  ],
  "arg": [
    {
      "id": "arg_1",
      "cat": "Disciplina",
      "q": "Pergunta incisiva de arguição/sustentação (exatamente 4 perguntas: arg_1 a arg_4)?",
      "alvo": "Conceito ou distinção que o candidato não pode omitir.",
      "resp": "Roteiro estruturado de resposta ideal em 2 frases."
    }
  ],
  "mapa": {
    "nodes": [
      { "id": "n1", "label": "Eixo Nuclear (gere de 10 a 14 nós transversais: n1 a n12)", "materia": "Disciplina", "prio": "ESSENCIAL", "desc": "Função estrutural no edital em 1 frase." }
    ],
    "edges": [
      ["n1", "n2", "Relação Técnica (gere de 14 a 22 conexões interdisciplinares)", "Como a banca cruza os dois temas na prova prática/discursiva/objetiva."]
    ]
  },
  "artigos_legislacao": [
    {
      "id": "leg_1",
      "diploma": "CF/88 ou Lei Específica do Cargo",
      "artigo": "Art. X, § Y",
      "prioridade": "CRITICO",
      "tema": "Tema Central do Dispositivo",
      "texto": "Texto do artigo real com marcações cloze {{PRAZO:termo}}, {{EXCECAO:termo}}, {{COMPETENCIA:termo}} (gere 35 a 40 artigos nucleares mais quentes da banca com cloze: leg_1 a leg_35)"
    }
  ],
  "jogos_fraudes": [
    {
      "id": "fr_1",
      "diploma": "Diploma Legal e Artigo",
      "frase": "Frase do dispositivo com 1 palavra adulterada cirurgicamente no padrão da banca (exatamente 4 frases: fr_1 a fr_4)",
      "integro": false,
      "palavra_fraudada": "palavra_errada",
      "gabarito_correto": "palavra_certa",
      "justificativa": "Como a banca examinadora costuma induzir ao erro trocando este termo."
    }
  ],
  "checklist": [
    "5 itens operacionais obrigatórios do dia da prova específicos para este concurso"
  ],
  "vespera": "Protocolo tático de véspera D-7 e D-1 em 2 frases focado nos pontos de maior incidência deste edital.",
  "escrita": "Diretriz técnica de prova discursiva e gestão de tempo em 2 frases para a banca examinadora."
}`;

  const [aiCoreRaw, aiPracticeRaw] = await Promise.all([
    callExperientialAI(env, {
      messages: [
        { role: 'system', content: systemPromptCore },
        { role: 'user', content: `CALIBRAR NÚCLEO, DATAS, ASSUNTOS E CRONOGRAMA:\n${baseContextBlock}` }
      ],
      temperature: 0.2,
      maxTokens: 6000,
      responseFormat: { type: 'json_object' }
    }),
    callExperientialAI(env, {
      messages: [
        { role: 'system', content: systemPromptPractice },
        { role: 'user', content: `CALIBRAR FLASHCARDS, SIMULADOS, QUESTÕES, ARGUIÇÃO, MAPA E GUIA:\n${baseContextBlock}` }
      ],
      temperature: 0.25,
      maxTokens: 4500,
      responseFormat: { type: 'json_object' }
    }).catch(err => {
      console.warn('[calibrate] Aviso na chamada paralela B (Prática):', err.message);
      return '{}';
    })
  ]);

  const aiCore = extractJson(aiCoreRaw);
  const aiPractice = extractJson(aiPracticeRaw) || {};
  if (!aiCore) {
    throw new Error('Falha ao decodificar matriz JSON principal gerada pelo motor de IA.');
  }

  const aiData = {
    ...aiPractice,
    ...aiCore,
    guia_estrategico: aiPractice.guia_estrategico || aiCore.guia_estrategico || {},
    cards: Array.isArray(aiPractice.cards) ? aiPractice.cards : (aiCore.cards || []),
    questoes_objetivas: Array.isArray(aiPractice.questoes_objetivas) ? aiPractice.questoes_objetivas : (aiCore.questoes_objetivas || []),
    sim: Array.isArray(aiPractice.sim) ? aiPractice.sim : (aiCore.sim || []),
    rubric: Array.isArray(aiPractice.rubric) ? aiPractice.rubric : (aiCore.rubric || []),
    arg: Array.isArray(aiPractice.arg) ? aiPractice.arg : (aiCore.arg || []),
    mapa: (aiPractice.mapa && Array.isArray(aiPractice.mapa.nodes) && aiPractice.mapa.nodes.length > 0) ? aiPractice.mapa : (aiCore.mapa || { nodes: [], edges: [] }),
    checklist: Array.isArray(aiPractice.checklist) ? aiPractice.checklist : (aiCore.checklist || []),
    vespera: aiPractice.vespera || aiCore.vespera || '',
    escrita: aiPractice.escrita || aiCore.escrita || ''
  };

  const detectedBanca = canonicalExam?.banca || aiData.banca_identificada || finalBanca || 'Banca Oficial';

  // 4. Resolve a data da última prova do edital e os marcos temporais sincronizados
  const dateInfo = resolveExamDatesAndMarcos(aiData, examDate, resolvedCatalog, todayIso);

  const rawAssuntos = Array.isArray(aiData.assuntos) ? aiData.assuntos : [];
  const rawTextos = Array.isArray(aiData.textos) ? aiData.textos : [];
  const rawCards = Array.isArray(aiData.cards) ? aiData.cards.map((c, idx) => ({
    id: c.id || `dc_api_${idx + 1}`,
    t: c.t || 'top_1',
    cat: c.cat || 'Geral',
    f: c.f || c.pergunta || '',
    v: c.v || c.b || c.resposta || ''
  })).filter(c => c.f && c.v) : [];

  const compiledUnidades = rawAssuntos.flatMap(mat => {
    const tops = Array.isArray(mat.topicos) ? mat.topicos : [];
    const uList = [];
    for (let i = 0; i < tops.length; i += 2) {
      const slice = tops.slice(i, i + 2);
      uList.push({
        materia: mat.materia || 'Disciplina',
        titulo: slice[0]?.t || mat.materia || 'Unidade Tática',
        topicos: slice.map(x => x.t).filter(Boolean)
      });
    }
    return uList;
  });

  // 5. Constrói o Cronograma completo de HOJE até a DATA DA ÚLTIMA PROVA com os blocos gerados pela API e marcos sincronizados
  const sched = buildExamAlignedSchedule({
    aiBlocos: aiData.blocos_cronograma,
    unidades: compiledUnidades,
    availabilityHours: effectiveHours,
    dateInfo,
    banca: detectedBanca
  });

  // Complementa os flashcards gerados pela API com os conceitos e crivos das fichas táticas
  rawTextos.forEach((tx, tIdx) => {
    const topId = tx.id || `top_${tIdx + 1}`;
    const mat = tx.materia || 'Conhecimentos Específicos';
    if (Array.isArray(tx.conceitos)) {
      tx.conceitos.forEach((pair, cIdx) => {
        if (Array.isArray(pair) && pair.length >= 2) {
          rawCards.push({
            id: `dc_c_${tIdx}_${cIdx}`,
            t: topId,
            cat: mat,
            f: `${pair[0]} — Qual o conceito técnico e regra de prova (${detectedBanca})?`,
            v: pair[1]
          });
        }
      });
    }
    if (tx.crivo) {
      rawCards.push({
        id: `dc_crivo_${tIdx}`,
        t: topId,
        cat: mat,
        f: `[PEGADINHA ${detectedBanca.toUpperCase()}] Como a banca costuma cobrar "${tx.titulo || tx.t}"?`,
        v: tx.crivo
      });
    }
  });

  const headerConfig = {
    title: finalConcurso.toUpperCase(),
    subtitle: `${finalCargo.toUpperCase()} · ${detectedBanca.toUpperCase()}`,
    badge: `// ${finalTier.toUpperCase()}`,
    banca: detectedBanca,
    edital_extracted: hasSubmittedEdital,
    edital_audit_summary: aiData.resumo_auditoria_edital || '',
    ultima_prova: dateInfo.ultimaProva,
    dates: dateInfo.marcos
  };

  const defaultRubric = [
    { item: 'Domínio Técnico e Atendimento aos Eixos do Edital', max: 40, desc: 'Rigor conceitual/normativo e enfrentamento integral do comando.' },
    { item: 'Articulação Argumentativa e Coerência', max: 30, desc: 'Progressão lógica e estruturação clara dos parágrafos.' },
    { item: 'Modalidade Escrita e Precisão Terminológica', max: 30, desc: 'Correção gramatical e emprego do vocabulário técnico da área.' }
  ];

  const compiledPesos = (Array.isArray(aiData.pesos_disciplinas) && aiData.pesos_disciplinas.length > 0)
    ? aiData.pesos_disciplinas
    : rawAssuntos.map((m, idx) => ({
        materia: m.materia || `Disciplina ${idx + 1}`,
        peso: idx === 0 || idx === 1 ? 2 : 1,
        questoes_estimadas: 15
      }));

  const notaCorteEstimada = Math.min(95, Math.max(50, Number(aiData.nota_corte_estimada) || 78));

  const contentData = {
    meta: {
      concurso: finalConcurso,
      cargo: finalCargo,
      banca: detectedBanca,
      tier: finalTier,
      hoursPerDay: effectiveHours,
      editalExtracted: hasSubmittedEdital,
      auditSummary: aiData.resumo_auditoria_edital || '',
      provaObjetiva: dateInfo.provaObjetiva,
      ultimaProva: dateInfo.ultimaProva,
      hasOrderBump,
      calibratedAt: new Date().toISOString()
    },
    nota_corte_estimada: notaCorteEstimada,
    pesos_disciplinas: compiledPesos,
    guia_estrategico: aiData.guia_estrategico || {},
    sched,
    dates: dateInfo.marcos,
    assuntos: rawAssuntos,
    texts: rawTextos,
    textos: rawTextos,
    cards: rawCards,
    questoes_objetivas: Array.isArray(aiData.questoes_objetivas) ? aiData.questoes_objetivas : [],
    sim: Array.isArray(aiData.sim) && aiData.sim.length > 0 ? aiData.sim : [
      {
        id: 'sim_1',
        titulo: `Simulado Discursivo #01 — ${finalCargo} (${detectedBanca})`,
        comando: `Discorra de forma estruturada sobre os eixos prioritários do cargo de ${finalCargo} segundo a matriz de cobrança da banca ${detectedBanca}, abordando fundamentos normativos/teóricos, jurisprudência ou aplicação técnica e armadilhas recorrentes.`,
        eixos: ['Fundamentação técnica e conceitual do tema', 'Aplicação prática ao cargo pretendido', 'Precisão terminológica exigida pela banca']
      }
    ],
    rubric: Array.isArray(aiData.rubric) && aiData.rubric.length > 0 ? aiData.rubric : defaultRubric,
    arg: Array.isArray(aiData.arg) && aiData.arg.length > 0 ? aiData.arg : rawTextos.slice(0, 4).map((tx, idx) => ({
      id: `arg_${idx + 1}`,
      cat: tx.materia || 'Conhecimentos Específicos',
      q: `Explique com suas palavras o núcleo de "${tx.titulo || tx.t}" e como a banca ${detectedBanca} costuma cobrar ou induzir ao erro neste ponto.`,
      alvo: tx.tese || 'Domínio conceitual e identificação da pegadinha clássica da banca.',
      resp: tx.crivo || 'Apresentar definição técnica direta + exceção/pegadinha da banca.'
    })),
    mapa: aiData.mapa || { nodes: [], edges: [] },
    artigos_legislacao: (() => {
      const aiList = Array.isArray(aiData.artigos_legislacao) ? aiData.artigos_legislacao : [];
      const defaultList = [
  {
    "id": "leg_1",
    "diploma": "CF/88",
    "artigo": "Art. 5º, XI",
    "prioridade": "CRITICO",
    "tema": "Inviolabilidade de Domicílio",
    "texto": "A casa é asilo inviolável do indivíduo, ninguém nela podendo penetrar {{EXCECAO:sem consentimento do morador}}, {{EXCECAO:salvo}} em caso de {{CONDICAO:flagrante delito}} ou desastre, ou para prestar socorro, ou, {{PRAZO:durante o dia}}, por {{COMPETENCIA:determinação judicial}}."
  },
  {
    "id": "leg_2",
    "diploma": "CF/88",
    "artigo": "Art. 5º, LXI",
    "prioridade": "CRITICO",
    "tema": "Prisão Cautelar e Flagrante",
    "texto": "Ninguém será preso senão em {{CONDICAO:flagrante delito}} ou por ordem escrita e fundamentada de {{COMPETENCIA:autoridade judiciária competente}}, {{EXCECAO:salvo}} nos casos de {{CONDICAO:transgressão militar}} ou crime propriamente militar, definidos em lei."
  },
  {
    "id": "leg_3",
    "diploma": "CF/88",
    "artigo": "Art. 5º, LXVIII",
    "prioridade": "CRITICO",
    "tema": "Habeas Corpus",
    "texto": "Conceder-se-á habeas corpus sempre que alguém sofrer ou se achar ameaçado de sofrer violência ou coação em sua {{COMPETENCIA:liberdade de locomoção}}, por {{CONDICAO:ilegalidade}} ou {{CONDICAO:abuso de poder}}."
  },
  {
    "id": "leg_4",
    "diploma": "CF/88",
    "artigo": "Art. 5º, LXIX",
    "prioridade": "CRITICO",
    "tema": "Mandado de Segurança",
    "texto": "Conceder-se-á mandado de segurança para proteger {{COMPETENCIA:direito líquido e certo}}, {{EXCECAO:não amparado por habeas corpus ou habeas data}}, quando o responsável pela ilegalidade ou abuso de poder for {{COMPETENCIA:autoridade pública}} ou agente de pessoa jurídica no exercício de atribuições do Poder Público."
  },
  {
    "id": "leg_5",
    "diploma": "CF/88",
    "artigo": "Art. 5º, LXXII",
    "prioridade": "TATICO",
    "tema": "Habeas Data",
    "texto": "Conceder-se-á habeas data: a) para assegurar o conhecimento de informações relativas à {{COMPETENCIA:pessoa do impetrante}}, constantes de registros ou bancos de dados de entidades governamentais ou de caráter público; b) para a {{COMPETENCIA:retificação de dados}}, quando não se prefira fazê-lo por processo sigiloso, judicial ou administrativo."
  },
  {
    "id": "leg_6",
    "diploma": "CF/88",
    "artigo": "Art. 37, caput",
    "prioridade": "CRITICO",
    "tema": "Princípios Expressos da Administração Pública",
    "texto": "A administração pública direta e indireta de qualquer dos Poderes da União, dos Estados, do Distrito Federal e dos Municípios obedecerá aos princípios de {{CONDICAO:legalidade}}, {{CONDICAO:impessoalidade}}, {{CONDICAO:moralidade}}, {{CONDICAO:publicidade}} e {{CONDICAO:eficiência}}."
  },
  {
    "id": "leg_7",
    "diploma": "CF/88",
    "artigo": "Art. 37, II",
    "prioridade": "CRITICO",
    "tema": "Concurso Público e Cargos em Comissão",
    "texto": "A investidura em cargo ou emprego público depende de {{CONDICAO:aprovação prévia em concurso público}} de provas ou de provas e títulos, de acordo com a natureza e a complexidade do cargo ou emprego, na forma prevista em lei, {{EXCECAO:ressalvadas as nomeações para cargo em comissão}} declarado em lei de livre nomeação e exoneração."
  },
  {
    "id": "leg_8",
    "diploma": "CF/88",
    "artigo": "Art. 37, III",
    "prioridade": "CRITICO",
    "tema": "Validade do Concurso Público",
    "texto": "O prazo de validade do concurso público será de {{PRAZO:até 2 anos}}, {{CONDICAO:prorrogável uma vez}}, por {{PRAZO:igual período}}."
  },
  {
    "id": "leg_9",
    "diploma": "CF/88",
    "artigo": "Art. 37, XVI",
    "prioridade": "CRITICO",
    "tema": "Vedação de Acumulação Remunerada de Cargos",
    "texto": "É {{EXCECAO:vedada a acumulação remunerada}} de cargos públicos, {{EXCECAO:exceto}}, quando houver {{CONDICAO:compatibilidade de horários}}, observado em qualquer caso o disposto no inciso XI: a) a de {{COMPETENCIA:dois cargos de professor}}; b) a de um cargo de professor com outro {{COMPETENCIA:técnico ou científico}}; c) a de {{COMPETENCIA:dois cargos ou empregos privativos de profissionais de saúde}}, com profissões regulamentadas."
  },
  {
    "id": "leg_10",
    "diploma": "CF/88",
    "artigo": "Art. 37, § 6º",
    "prioridade": "CRITICO",
    "tema": "Responsabilidade Civil Objetiva do Estado",
    "texto": "As pessoas jurídicas de direito público e as de direito privado prestadoras de serviços públicos responderão pelos danos que seus agentes, nessa qualidade, causarem a terceiros, assegurado o {{COMPETENCIA:direito de regresso}} contra o responsável nos casos de {{EXCECAO:dolo ou culpa}}."
  },
  {
    "id": "leg_11",
    "diploma": "CF/88",
    "artigo": "Art. 41, caput",
    "prioridade": "CRITICO",
    "tema": "Estabilidade do Servidor Público",
    "texto": "São estáveis após {{PRAZO:3 anos}} de efetivo exercício os servidores nomeados para cargo de provimento efetivo em virtude de {{CONDICAO:concurso público}}."
  },
  {
    "id": "leg_12",
    "diploma": "CF/88",
    "artigo": "Art. 41, § 1º",
    "prioridade": "CRITICO",
    "tema": "Perda do Cargo do Servidor Estável",
    "texto": "O servidor público estável só perderá o cargo: I - em virtude de {{CONDICAO:sentença judicial transitada em julgado}}; II - mediante {{CONDICAO:processo administrativo}} em que lhe seja assegurada ampla defesa; III - mediante procedimento de {{CONDICAO:avaliação periódica de desempenho}}, na forma de lei complementar, assegurada ampla defesa."
  },
  {
    "id": "leg_13",
    "diploma": "CF/88",
    "artigo": "Art. 144, caput",
    "prioridade": "CRITICO",
    "tema": "Segurança Pública: Dever do Estado",
    "texto": "A segurança pública, dever do Estado, direito e responsabilidade de todos, é exercida para a preservação da ordem pública e da incolumidade das pessoas e do patrimônio, através dos seguintes órgãos: I - {{COMPETENCIA:polícia federal}}; II - {{COMPETENCIA:polícia rodoviária federal}}; III - {{COMPETENCIA:polícia ferroviária federal}}; IV - {{COMPETENCIA:polícias civis}}; V - {{COMPETENCIA:polícias militares e corpos de bombeiros militares}}; VI - {{COMPETENCIA:polícias penais federal, estaduais e distrital}}."
  },
  {
    "id": "leg_14",
    "diploma": "Lei 8.112/90",
    "artigo": "Art. 5º",
    "prioridade": "CRITICO",
    "tema": "Requisitos Básicos para Investidura em Cargo Público",
    "texto": "São requisitos básicos para investidura em cargo público: I - a nacionalidade brasileira; II - o gozo dos direitos políticos; III - a quitação com as obrigações militares e eleitorais; IV - o nível de escolaridade exigido para o exercício do cargo; V - a idade mínima de {{PRAZO:18 anos}}; VI - {{CONDICAO:aptidão física e mental}}."
  },
  {
    "id": "leg_15",
    "diploma": "Lei 8.112/90",
    "artigo": "Art. 13",
    "prioridade": "CRITICO",
    "tema": "Posse e Exercício: Prazos Legais",
    "texto": "A posse dar-se-á pela assinatura do respectivo termo [...]. § 1º A posse ocorrerá no prazo de {{PRAZO:30 dias}} contados da publicação do ato de provimento. § 6º Será tornado sem efeito o ato de provimento se a posse não ocorrer no prazo previsto no § 1º; § 2º O prazo para o servidor entrar em exercício é de {{PRAZO:15 dias}}, contados da data da posse."
  },
  {
    "id": "leg_16",
    "diploma": "Lei 8.112/90",
    "artigo": "Art. 20",
    "prioridade": "CRITICO",
    "tema": "Estágio Probatório e Fatores de Avaliação",
    "texto": "Ao entrar em exercício, o servidor nomeado para cargo de provimento efetivo ficará sujeito a estágio probatório pelo período de {{PRAZO:36 meses}}, durante o qual a sua aptidão e capacidade serão objeto de avaliação para o desempenho do cargo, observados os seguintes fatores: I - {{CONDICAO:assiduidade}}; II - {{CONDICAO:disciplina}}; III - {{CONDICAO:capacidade de iniciativa}}; IV - {{CONDICAO:produtividade}}; V - {{CONDICAO:responsabilidade}}."
  },
  {
    "id": "leg_17",
    "diploma": "Lei 8.112/90",
    "artigo": "Art. 28",
    "prioridade": "CRITICO",
    "tema": "Reintegração do Servidor Estável",
    "texto": "A reintegração é a reinvestidura do servidor estável no cargo anteriormente ocupado, ou no cargo resultante de sua transformação, quando {{CONDICAO:invalidada a sua demissão}} por {{COMPETENCIA:decisão administrativa ou judicial}}, com ressarcimento de {{COMPETENCIA:todas as vantagens}}."
  },
  {
    "id": "leg_18",
    "diploma": "Lei 8.112/90",
    "artigo": "Art. 33",
    "prioridade": "CRITICO",
    "tema": "Formas de Vacância de Cargo Público",
    "texto": "A vacância do cargo público decorrerá de: I - exoneração; II - demissão; III - promoção; IV - {{EXCECAO:readaptação}}; V - {{EXCECAO:aposentadoria}}; VI - posse em outro cargo inacumulável; VII - falecimento."
  },
  {
    "id": "leg_19",
    "diploma": "Lei 8.112/90",
    "artigo": "Art. 127",
    "prioridade": "CRITICO",
    "tema": "Penalidades Disciplinares",
    "texto": "São penalidades disciplinares: I - advertência; II - suspensão; III - demissão; IV - cassação de aposentadoria ou disponibilidade; V - destituição de cargo em comissão; VI - destituição de função comissionada."
  },
  {
    "id": "leg_20",
    "diploma": "Lei 8.112/90",
    "artigo": "Art. 130",
    "prioridade": "CRITICO",
    "tema": "Suspensão e Conversão em Multa",
    "texto": "A suspensão será aplicada em caso de reincidência das faltas punidas com advertência e de violação das demais proibições que não tipifiquem infração sujeita a demissão, não podendo exceder de {{PRAZO:90 dias}}. § 2º Quando houver conveniência para o serviço, a penalidade de suspensão poderá ser convertida em multa, na base de {{PRAZO:50% por dia}} de remuneração, ficando o servidor {{CONDICAO:obrigado a permanecer em serviço}}."
  },
  {
    "id": "leg_21",
    "diploma": "Lei 8.112/90",
    "artigo": "Art. 132",
    "prioridade": "CRITICO",
    "tema": "Hipóteses de Demissão",
    "texto": "A demissão será aplicada nos seguintes casos: I - crime contra a administração pública; II - {{EXCECAO:abandono de cargo}}; III - inassiduidade habitual; IV - improbidade administrativa; X - lesão aos cofres públicos e dilapidação do patrimônio nacional; XI - corrupção; XIII - aplicação irregular de {{COMPETENCIA:dinheiros públicos}}."
  },
  {
    "id": "leg_22",
    "diploma": "Lei 8.112/90",
    "artigo": "Art. 138 e 139",
    "prioridade": "CRITICO",
    "tema": "Abandono de Cargo e Inassiduidade Habitual",
    "texto": "Configura abandono de cargo a ausência intencional do servidor ao serviço por {{PRAZO:mais de 30 dias consecutivos}}. Entende-se por inassiduidade habitual a falta ao serviço, sem causa justificada, por {{PRAZO:60 dias interpoladamente}}, durante o período de {{PRAZO:12 meses}}."
  },
  {
    "id": "leg_23",
    "diploma": "Lei 8.112/90",
    "artigo": "Art. 142",
    "prioridade": "CRITICO",
    "tema": "Prazos de Prescrição da Ação Disciplinar",
    "texto": "A ação disciplinar prescreverá: I - em {{PRAZO:5 anos}}, quanto às infrações puníveis com demissão, cassação de aposentadoria ou disponibilidade e destituição de cargo em comissão; II - em {{PRAZO:2 anos}}, quanto à suspensão; III - em {{PRAZO:180 dias}}, quanto à advertência."
  },
  {
    "id": "leg_24",
    "diploma": "Lei 8.429/92 (LIA)",
    "artigo": "Art. 1º, §§ 1º e 2º",
    "prioridade": "CRITICO",
    "tema": "Exigência de Dolo Específico na Improbidade",
    "texto": "O sistema de responsabilização por atos de improbidade administrativa tutelará a probidade na organização do Estado e no exercício de suas funções [...]. § 1º Consideram-se atos de improbidade administrativa as condutas tipificadas nos arts. 9º, 10 e 11 desta Lei, ressalvados tipos previstos em leis especiais. § 2º Considera-se dolo a vontade livre e consciente de alcançar o resultado ilícito tipificado nos arts. 9º, 10 e 11 desta Lei, {{EXCECAO:não bastando a voluntariedade ou o mero dolo genérico}}."
  },
  {
    "id": "leg_25",
    "diploma": "Lei 8.429/92 (LIA)",
    "artigo": "Art. 9º",
    "prioridade": "CRITICO",
    "tema": "Atos de Improbidade que Importam Enriquecimento Ilícito",
    "texto": "Constitui ato de improbidade administrativa importando em enriquecimento ilícito auferir, mediante a prática de ato doloso, qualquer tipo de {{COMPETENCIA:vantagem patrimonial indevida}} em razão do exercício de cargo, mandato, função, emprego ou atividade nas entidades referidas no art. 1º desta Lei."
  },
  {
    "id": "leg_26",
    "diploma": "Lei 8.429/92 (LIA)",
    "artigo": "Art. 10",
    "prioridade": "CRITICO",
    "tema": "Atos de Improbidade que Causam Prejuízo ao Erário",
    "texto": "Constitui ato de improbidade administrativa que causa lesão ao erário qualquer ação ou omissão dolosa, que enseje, efetiva e comprovadamente, {{CONDICAO:perda patrimonial efetiva}}, desvio, apropriação, malbaratamento ou dilapidação dos bens ou haveres das entidades referidas no art. 1º desta Lei."
  },
  {
    "id": "leg_27",
    "diploma": "Lei 8.429/92 (LIA)",
    "artigo": "Art. 11",
    "prioridade": "CRITICO",
    "tema": "Atos que Atentam contra os Princípios da Administração",
    "texto": "Constitui ato de improbidade administrativa que atenta contra os princípios da administração pública a ação ou omissão dolosa que viole os deveres de honestidade, de imparcialidade e de legalidade, caracterizada por uma das seguintes condutas: [...] IV - {{CONDICAO:revelar fato ou circunstância de que tem ciência em razão das atribuições e que deva permanecer em segredo}}."
  },
  {
    "id": "leg_28",
    "diploma": "Lei 8.429/92 (LIA)",
    "artigo": "Art. 23",
    "prioridade": "CRITICO",
    "tema": "Prescrição dos Atos de Improbidade",
    "texto": "A ação para a aplicação das sanções previstas nesta Lei prescreve em {{PRAZO:8 anos}}, contados a partir da data da {{CONDICAO:ocorrência do fato}} ou, no caso de infrações permanentes, do dia em que cessou a permanência."
  },
  {
    "id": "leg_29",
    "diploma": "Código Penal",
    "artigo": "Art. 312",
    "prioridade": "CRITICO",
    "tema": "Peculato Próprio, Desvio e Culposo",
    "texto": "Apropriar-se o funcionário público de dinheiro, valor ou qualquer outro bem móvel, público ou particular, de que tem a posse em razão do cargo, ou desviá-lo, em proveito próprio ou alheio: Pena - reclusão, de {{PRAZO:2 a 12 anos}}, e multa. § 2º Se o funcionário concorre culposamente para o crime de outrem: Pena - detenção, de {{PRAZO:3 meses a 1 ano}}."
  },
  {
    "id": "leg_30",
    "diploma": "Código Penal",
    "artigo": "Art. 312, § 3º",
    "prioridade": "CRITICO",
    "tema": "Reparação do Dano no Peculato Culposo",
    "texto": "No caso do § 2º (peculato culposo), a reparação do dano, {{CONDICAO:se precede a sentença irrecorrível}}, {{COMPETENCIA:extingue a punibilidade}}; se lhe é posterior, {{CONDICAO:reduz de metade}} a pena imposta."
  },
  {
    "id": "leg_31",
    "diploma": "Código Penal",
    "artigo": "Art. 316",
    "prioridade": "CRITICO",
    "tema": "Concussão",
    "texto": "{{COMPETENCIA:Exigir}}, para si ou para outrem, direta ou indiretamente, ainda que fora da função ou antes de assumi-la, mas em razão dela, {{CONDICAO:vantagem indevida}}: Pena - reclusão, de {{PRAZO:2 a 12 anos}}, e multa."
  },
  {
    "id": "leg_32",
    "diploma": "Código Penal",
    "artigo": "Art. 317",
    "prioridade": "CRITICO",
    "tema": "Corrupção Passiva",
    "texto": "{{COMPETENCIA:Solicitar ou receber}}, para si ou para outrem, direta ou indiretamente, ainda que fora da função ou antes de assumi-la, mas em razão dela, vantagem indevida, ou {{COMPETENCIA:aceitar promessa}} de tal vantagem: Pena - reclusão, de {{PRAZO:2 a 12 anos}}, e multa."
  },
  {
    "id": "leg_33",
    "diploma": "Código Penal",
    "artigo": "Art. 319",
    "prioridade": "CRITICO",
    "tema": "Prevaricação",
    "texto": "Retardar ou deixar de praticar, indevidamente, ato de ofício, ou praticá-lo contra disposição expressa de lei, para {{CONDICAO:satisfazer interesse ou sentimento pessoal}}: Pena - detenção, de {{PRAZO:3 meses a 1 ano}}, e multa."
  },
  {
    "id": "leg_34",
    "diploma": "Código Penal",
    "artigo": "Art. 333",
    "prioridade": "CRITICO",
    "tema": "Corrupção Ativa",
    "texto": "{{COMPETENCIA:Oferecer ou prometer}} vantagem indevida a funcionário público, para determiná-lo a praticar, omitir ou retardar ato de ofício: Pena - reclusão, de {{PRAZO:2 a 12 anos}}, e multa."
  },
  {
    "id": "leg_35",
    "diploma": "Lei 13.869/19 (Abuso de Autoridade)",
    "artigo": "Art. 1º, § 1º",
    "prioridade": "CRITICO",
    "tema": "Finalidade Específica no Abuso de Autoridade",
    "texto": "As condutas descritas nesta Lei constituem crime de abuso de autoridade quando praticadas pelo agente com a finalidade específica de {{CONDICAO:prejudicar outrem}} ou {{CONDICAO:beneficiar a si mesmo ou a terceiro}}, ou, ainda, por {{CONDICAO:mero capricho ou satisfação pessoal}}."
  },
  {
    "id": "leg_36",
    "diploma": "Lei 14.133/21 (Licitações)",
    "artigo": "Art. 28",
    "prioridade": "CRITICO",
    "tema": "Modalidades de Licitação",
    "texto": "São modalidades de licitação: I - pregão; II - concorrência; III - concurso; IV - leilão; V - {{COMPETENCIA:diálogo competitivo}}. Parágrafo único. É {{EXCECAO:vedada a criação de outras modalidades de licitação}} ou a combinação das referidas neste artigo."
  }
];
      if (aiList.length >= 35) return aiList;
      const seen = new Set(aiList.map(a => `${a.diploma}_${a.artigo}`));
      const merged = [...aiList];
      for (const def of defaultList) {
        if (!seen.has(`${def.diploma}_${def.artigo}`)) {
          merged.push(def);
          seen.add(`${def.diploma}_${def.artigo}`);
        }
        if (merged.length >= 36) break;
      }
      return merged;
    })(),
    jogos_fraudes: Array.isArray(aiData.jogos_fraudes) && aiData.jogos_fraudes.length > 0 ? aiData.jogos_fraudes : [
      {
        id: 'fr_1',
        diploma: 'CF/88 - Art. 5º, XI',
        frase: 'A casa é asilo inviolável do indivíduo, podendo nela penetrar a qualquer hora por determinação policial.',
        integro: false,
        palavra_fraudada: 'policial',
        gabarito_correto: 'judicial',
        justificativa: 'A banca trocou determinação judicial por policial. Apenas a autoridade judiciária tem competência para expedir mandado, e a execução restringe-se ao período diurno.'
      },
      {
        id: 'fr_2',
        diploma: 'CF/88 - Art. 5º, XLVII',
        frase: 'Não haverá penas de morte, salvo em caso de guerra declarada, nos termos da lei.',
        integro: true,
        palavra_fraudada: null,
        gabarito_correto: null,
        justificativa: 'Dispositivo 100% íntegro e autêntico conforme a Constituição Federal.'
      },
      {
        id: 'fr_3',
        diploma: 'CF/88 - Art. 37, II',
        frase: 'A investidura em cargo ou emprego público depende de aprovação prévia em concurso público de provas ou de provas e títulos, ressalvadas as nomeações para cargo em comissão declarado em lei de livre nomeação e exoneração.',
        integro: true,
        palavra_fraudada: null,
        gabarito_correto: null,
        justificativa: 'Dispositivo autêntico e de altíssima incidência nas provas da banca examinadora.'
      },
      {
        id: 'fr_4',
        diploma: 'Lei 8.112/90 - Art. 138',
        frase: 'Configura abandono de cargo a ausência intencional do servidor ao serviço por mais de quinze dias consecutivos.',
        integro: false,
        palavra_fraudada: 'quinze',
        gabarito_correto: 'trinta',
        justificativa: 'Pegadinha clássica: o abandono de cargo exige ausência intencional por mais de 30 dias consecutivos (e não 15).'
      }
    ],
    tabs: aiData.tabs || [],
    checklist: Array.isArray(aiData.checklist) && aiData.checklist.length > 0 ? aiData.checklist : [
      `Documento oficial original com foto e Cartão de Confirmação de Inscrição (${detectedBanca})`,
      'Duas ou mais canetas esferográficas de tinta preta fabricadas em material transparente',
      'Conferência antecipada do local de prova e deslocamento com margem mínima de 1 hora',
      `Leitura final das fichas ESSENCIAIS e do Dossiê D-7 até a véspera (${dateInfo.ultimaProva.split('-').reverse().join('/')})`,
      'Reserva de 30 minutos finais para transcrição segura do gabarito e revisão da folha discursiva'
    ],
    vespera: aiData.vespera || '',
    escrita: aiData.escrita || ''
  };

  // 6. Persiste a calibração em `public.user_panels`
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
        published_at: new Date().toISOString(),
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
          published_at: new Date().toISOString(),
        },
        prefer: 'return=representation',
      });
      const created = Array.isArray(createdPanels) ? createdPanels[0] : createdPanels;
      if (created?.id) savedPanelId = created.id;
    } catch (createErr) {
      console.warn('[calibrate] Aviso ao criar user_panel:', createErr.message);
    }
  }

  // 7. Gera e publica automaticamente o Guia Tático Pós-Edital (e o Dossiê D-7 se Order Bump ou Elite/Prime) em `user_files`
  if (targetUserId && targetUserId !== 'default-user' && savedPanelId && savedPanelId !== 'default-panel') {
    try {
      const { url } = getSupabaseConfig(env);
      const existingFiles = await supabaseRest(env, `/user_files?panel_id=eq.${encodeURIComponent(savedPanelId)}`);
      const existingGuide = Array.isArray(existingFiles) ? existingFiles.find(f => String(f.filename || '').includes('Guia_Tatico_Pos_Edital')) : null;

      const guideHtml = buildStudyGuideHtmlDocument(contentData, headerConfig, 'guia');
      const guideBytes = new TextEncoder().encode(guideHtml);
      const guideStoragePath = `${targetUserId}/Guia_Tatico_Pos_Edital_${savedPanelId.slice(0, 8)}.html`;

      await supabaseStorageUpload(env, 'user-materials', guideStoragePath, guideBytes, 'text/html; charset=utf-8');
      const guidePublicUrl = `${url}/storage/v1/object/public/user-materials/${guideStoragePath}`;

      if (!existingGuide) {
        await supabaseRest(env, '/user_files', {
          method: 'POST',
          body: {
            user_id: targetUserId,
            panel_id: savedPanelId,
            category: 'material',
            title: `Guia de Estudos Pós-Edital Calibrado — ${finalConcurso} (${finalCargo})`,
            filename: 'Guia_Tatico_Pos_Edital.html',
            storage_path: guideStoragePath,
            storage_url: guidePublicUrl,
            priority: 'ESSENCIAL',
            file_size_bytes: guideBytes.byteLength,
            page_offset: 0,
            sort_order: 1
          }
        });
      } else {
        await supabaseRest(env, `/user_files?id=eq.${encodeURIComponent(existingGuide.id)}`, {
          method: 'PATCH',
          body: {
            title: `Guia de Estudos Pós-Edital Calibrado — ${finalConcurso} (${finalCargo})`,
            storage_path: guideStoragePath,
            storage_url: guidePublicUrl,
            file_size_bytes: guideBytes.byteLength
          }
        });
      }

      const existingD7 = Array.isArray(existingFiles) ? existingFiles.find(f => String(f.filename || '').includes('Dossie_Vespera_D7')) : null;
      if (hasOrderBump || finalTier === 'elite' || finalTier === 'prime') {
        const d7Html = buildStudyGuideHtmlDocument(contentData, headerConfig, 'd7');
        const d7Bytes = new TextEncoder().encode(d7Html);
        const d7StoragePath = `${targetUserId}/Dossie_Vespera_D7_${savedPanelId.slice(0, 8)}.html`;

        await supabaseStorageUpload(env, 'user-materials', d7StoragePath, d7Bytes, 'text/html; charset=utf-8');
        const d7PublicUrl = `${url}/storage/v1/object/public/user-materials/${d7StoragePath}`;

        if (!existingD7) {
          await supabaseRest(env, '/user_files', {
            method: 'POST',
            body: {
              user_id: targetUserId,
              panel_id: savedPanelId,
              category: 'material',
              title: `Dossiê de Véspera D-7 & Pegadinhas da Banca (${detectedBanca})`,
              filename: 'Dossie_Vespera_D7_Pegadinhas.html',
              storage_path: d7StoragePath,
              storage_url: d7PublicUrl,
              priority: 'ESSENCIAL',
              file_size_bytes: d7Bytes.byteLength,
              page_offset: 0,
              sort_order: 2
            }
          });
        }
      }
    } catch (fileGenErr) {
      console.warn('[calibrate] Aviso ao publicar arquivos do Guia/Dossiê no Storage:', fileGenErr.message);
    }
  }

  // 8. Atualiza ordem para delivered e envia E-mail #2
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

  if (targetUserId && targetUserId !== 'default-user' && !forceRecalibrate) {
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

  return {
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
  };
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const corsHeaders = getCorsHeaders(request);

  try {
    const body = await request.json();
    const result = await runCalibrationEngine(env, body);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[engine/calibrate] Erro fatal:', err);
    return new Response(JSON.stringify({
      error: err.statusCode === 400 ? err.message : 'Erro durante a calibração autônoma do painel.',
      details: err.message
    }), {
      status: err.statusCode || 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestOptions(context) {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(context.request),
  });
}
