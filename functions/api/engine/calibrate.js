// Cloudflare Pages Function: Motor de Calibração Autônoma de Painéis e Guias CRIVOS
// Extrai o conteúdo real do edital submetido (PDF / Texto / Storage), calibra as abas do Sistema
// Operacional CRIVOS de forma otimizada por plano (Tático, Arsenal, Elite) e gera/entrega automaticamente
// o Guia de Estudos Pós-Edital (e o Dossiê D-7 quando aplicável) no repositório do aluno.

import { getCorsHeaders, getSupabaseConfig, supabaseRest, supabaseStorageUpload, sendResendEmail, renderEmailPanelReady } from '../_supabase.js';
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

// Extrator nativo de texto de PDF para Cloudflare Workers
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

// Filtra e organiza os trechos de maior sinal do edital com teto enxuto (12.000 chars ~ 3k tokens)
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
  syllabusBuckets.slice(0, 5).forEach(c => selected.set(c.index, c.text));

  const ordered = Array.from(selected.entries())
    .sort((a, b) => a[0] - b[0])
    .map(e => e[1]);

  return ordered.join('\n\n--- [TRECHO DO EDITAL] ---\n\n').slice(0, 12000);
}

// Busca textos de edital no Supabase Storage (intake-editais ou user-materials) se disponível
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
  } catch (_) {}

  return extractedParts.join('\n\n');
}

function generateTacticalSchedule(unidades, availabilityHours = 4, startDate = new Date(), examDateStr = null) {
  const sched = [];
  let currentDate = new Date(startDate);
  const hours = Number(availabilityHours) > 0 ? Number(availabilityHours) : 4;

  let targetDays = 78;
  if (examDateStr && /^\d{4}-\d{2}-\d{2}$/.test(String(examDateStr).trim())) {
    const examDt = new Date(String(examDateStr).trim() + 'T12:00:00Z');
    const diffDays = Math.round((examDt.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays >= 21 && diffDays <= 150) {
      targetDays = diffDays;
    }
  }

  const d0Str = currentDate.toISOString().slice(0, 10);
  sched.push({
    d: d0Str,
    h: hours,
    f: 'SEMANA 01',
    t: 'ADM',
    a: 'Auditoria Inicial do Edital e Matriz de Pesos',
    obs: 'Configuração do ambiente, leitura estratégica das regras da banca, verificação dos marcos temporais e mapeamento dos tópicos de maior incidência.'
  });

  const list = Array.isArray(unidades) && unidades.length > 0 ? unidades : [
    { titulo: 'Núcleo Fundamental do Edital', materia: 'Conhecimentos Gerais', topicos: ['Tópicos essenciais e estrutura da prova'] }
  ];

  const studyDates = [];
  let activeStep = 0;
  const totalActiveSteps = Math.max(list.length * 4, Math.min(72, Math.floor(targetDays * 0.85)));

  const cycleConfigs = [
    {
      name: 'Ciclo 1 · Base Teórica',
      tagLabel: 'TEORIA',
      obsPrefix: 'Estudo dirigido da teoria, legislação/bibliografia base e fichamento estratégico'
    },
    {
      name: 'Ciclo 2 · Bateria da Banca',
      tagLabel: 'PRÁTICA',
      obsPrefix: 'Engenharia reversa da banca, pontos críticos, exceções e resolução comentada de questões'
    },
    {
      name: 'Ciclo 3 · Consolidação Ativa',
      tagLabel: 'CONSOLIDAÇÃO',
      obsPrefix: 'Recuperação ativa sem consulta (Active Recall), questões difíceis e caderno de erros'
    },
    {
      name: 'Ciclo 4 · Reta Final 80/20',
      tagLabel: 'RETA FINAL',
      obsPrefix: 'Revisão cirúrgica 80/20 dos pontos de maior peso e treino de velocidade de prova'
    }
  ];

  while (activeStep < totalActiveSteps) {
    currentDate.setDate(currentDate.getDate() + 1);
    const dStr = currentDate.toISOString().slice(0, 10);
    const weekIdx = Math.floor(sched.length / 6) + 1;
    const weekNum = String(weekIdx).padStart(2, '0');

    if ((activeStep + 1) % 5 === 0) {
      const uRef = list[activeStep % list.length];
      const simNumber = Math.ceil((activeStep + 1) / 5);
      sched.push({
        d: dStr,
        h: hours,
        f: `SEMANA ${weekNum}`,
        t: 'SIMULADO',
        a: `Simulado Tático & Diagnóstico #${String(simNumber).padStart(2, '0')} (${uRef.materia})`,
        obs: 'Bateria cronometrada sem consulta cobrindo os blocos da semana + diagnóstico de lacunas e alimentação de Flashcards SM-2.'
      });
      activeStep++;
      continue;
    }

    const u = list[activeStep % list.length];
    const passIndex = Math.min(3, Math.floor(activeStep / list.length));
    const cycle = cycleConfigs[passIndex];

    studyDates.push({ date: dStr, unit: u.titulo, materia: u.materia, index: activeStep + 1 });

    const topicosList = Array.isArray(u.topicos) && u.topicos.length > 0 ? u.topicos.join(' · ') : '';
    const extraLoops = [];
    if (studyDates.length > 1) {
      const prev = studyDates[studyDates.length - 2];
      extraLoops.push(`Revisão D+1: ${prev.unit} (15 min)`);
    }
    if (studyDates.length >= 4) {
      const prev3 = studyDates[studyDates.length - 4];
      extraLoops.push(`Reciclagem SM-2: ${prev3.materia} (15 min)`);
    }

    const fullObs = [
      `${cycle.name}: ${cycle.obsPrefix}`,
      topicosList ? `Tópicos: ${topicosList}` : '',
      extraLoops.length ? extraLoops.join(' | ') : ''
    ].filter(Boolean).join(' · ');

    sched.push({
      d: dStr,
      h: hours,
      f: `SEMANA ${weekNum}`,
      t: cycle.tagLabel,
      a: `${u.materia} — ${u.titulo}${passIndex > 0 ? ` (Ciclo ${passIndex + 1})` : ''}`,
      obs: fullObs
    });

    activeStep++;
  }

  currentDate.setDate(currentDate.getDate() + 1);
  const revDateStr = currentDate.toISOString().slice(0, 10);
  const finalWeekNum = String(Math.floor(sched.length / 6) + 1).padStart(2, '0');
  sched.push({
    d: revDateStr,
    h: hours,
    f: `SEMANA ${finalWeekNum}`,
    t: 'REVISÃO',
    a: 'Revisão Geral de Véspera (Protocolo 80/20 & Blindagem de Pegadinhas)',
    obs: examDateStr
      ? `Reta final rumo à prova (${examDateStr}) — Foco exclusivo nas fichas ESSENCIAIS, pegadinhas da banca e fila SM-2.`
      : 'Consolidação final dos tópicos ESSENCIAIS, leitura das pegadinhas da banca e zeramento da fila SM-2.'
  });

  return sched;
}

function escapeHtmlServer(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildStudyGuideHtmlDocument(contentData, headerConfig, mode = 'guia') {
  const meta = contentData.meta || {};
  const concurso = escapeHtmlServer(meta.concurso || headerConfig?.title || 'Concurso Público');
  const cargo = escapeHtmlServer(meta.cargo || headerConfig?.subtitle || 'Cargo Pretendido');
  const banca = escapeHtmlServer(meta.banca || headerConfig?.banca || 'Banca Oficial');
  const tier = escapeHtmlServer((meta.tier || 'tatico').toUpperCase());
  const auditSummary = escapeHtmlServer(meta.auditSummary || 'Mapeamento tático de incidência, cronograma de ciclos e fichas de alta retenção.');
  const generatedDate = new Date().toLocaleDateString('pt-BR');

  const isD7 = mode === 'd7';
  const docTitle = isD7
    ? `DOSSIÊ DE VÉSPERA D-7 & PEGADINHAS DA BANCA // ${concurso}`
    : `GUIA TÁTICO PÓS-EDITAL // ${concurso}`;

  const assuntosHtml = (contentData.assuntos || []).map((mat, idx) => `
    <div class="card">
      <div class="card-head">0${idx + 1} · ${escapeHtmlServer(mat.materia)}</div>
      <table>
        <thead><tr><th>TÓPICO DO EDITAL</th><th>PRIORIDADE</th><th>PESO</th></tr></thead>
        <tbody>
          ${(mat.topicos || []).map(tp => `
            <tr>
              <td><b>${escapeHtmlServer(tp.t)}</b></td>
              <td><span class="badge ${tp.prio === 'ESSENCIAL' ? 'red' : ''}">${escapeHtmlServer(tp.prio || 'IMPORTANTE')}</span></td>
              <td>${escapeHtmlServer(tp.peso || 'ALTO')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `).join('');

  const textosHtml = (contentData.texts || []).map((tx, idx) => `
    <div class="card">
      <div class="card-head">FICHA #0${idx + 1} · ${escapeHtmlServer(tx.materia || '')} — ${escapeHtmlServer(tx.titulo || tx.t || '')}</div>
      <p><b>Base / Referência:</b> ${escapeHtmlServer(tx.autor || banca)}</p>
      <p><b>Síntese Nuclear:</b> ${escapeHtmlServer(tx.tese || '')}</p>
      <div class="alert"><b>CRIVO & PEGADINHA DA BANCA (${banca}):</b> ${escapeHtmlServer(tx.crivo || '')}</div>
      ${Array.isArray(tx.conceitos) && tx.conceitos.length ? `
        <table>
          <thead><tr><th>CONCEITO / DISPOSITIVO CHAVE</th><th>DEFINIÇÃO CIRÚRGICA DE PROVA</th></tr></thead>
          <tbody>
            ${tx.conceitos.map(c => `<tr><td><b>${escapeHtmlServer(c[0])}</b></td><td>${escapeHtmlServer(c[1])}</td></tr>`).join('')}
          </tbody>
        </table>
      ` : ''}
    </div>
  `).join('');

  const cronoRows = (contentData.sched || []).slice(0, isD7 ? 15 : 90).map(s => `
    <tr>
      <td style="white-space:nowrap;font-family:'JetBrains Mono',monospace;">${escapeHtmlServer(s.d)}</td>
      <td><span class="badge">${escapeHtmlServer(s.t || 'META')}</span></td>
      <td><b>${escapeHtmlServer(s.a)}</b><br><span style="font-size:11px;color:#444;">${escapeHtmlServer(s.obs || '')}</span></td>
      <td style="text-align:center;">${escapeHtmlServer(s.h || 4)}h</td>
    </tr>
  `).join('');

  const cardsHtml = (contentData.cards || []).map((c, idx) => `
    <div style="border:1.5px solid #111;padding:10px 12px;margin-bottom:8px;page-break-inside:avoid;">
      <div style="font-size:10px;font-family:'JetBrains Mono',monospace;color:#D92B2B;font-weight:700;">FLASHCARD SM-2 #${idx + 1} · ${escapeHtmlServer(c.cat || '')}</div>
      <div style="font-weight:800;margin:4px 0;">P: ${escapeHtmlServer(c.f)}</div>
      <div style="color:#222;">R: ${escapeHtmlServer(c.v)}</div>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${docTitle}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&family=JetBrains+Mono:wght@500;700&display=swap');
  * { box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; color: #111; background: #F5F2EB; margin: 0; padding: 24px; line-height: 1.5; font-size: 13px; }
  .print-bar { max-width: 900px; margin: 0 auto 20px auto; background: #111; color: #FFF; padding: 12px 18px; display: flex; justify-content: space-between; align-items: center; border: 2px solid #111; }
  .print-btn { background: #D92B2B; color: #FFF; border: none; padding: 8px 16px; font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 12px; cursor: pointer; text-transform: uppercase; }
  .page { max-width: 900px; margin: 0 auto; background: #FFF; border: 2px solid #111; padding: 36px; box-shadow: 6px 6px 0 #111; }
  .header { border-bottom: 4px solid #111; padding-bottom: 18px; margin-bottom: 24px; }
  .brand { font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 700; color: #D92B2B; letter-spacing: 0.08em; text-transform: uppercase; }
  h1 { font-size: 26px; font-weight: 900; text-transform: uppercase; margin: 6px 0; letter-spacing: -0.02em; }
  h2 { font-size: 16px; font-weight: 900; text-transform: uppercase; border-left: 5px solid #D92B2B; padding-left: 10px; margin: 28px 0 12px 0; }
  .card { border: 1.5px solid #111; padding: 14px 16px; margin-bottom: 14px; page-break-inside: avoid; }
  .card-head { font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 800; text-transform: uppercase; background: #111; color: #FFF; padding: 6px 10px; margin: -14px -16px 12px -16px; }
  .alert { background: #FEF2F2; border-left: 4px solid #D92B2B; padding: 10px 12px; margin: 10px 0; font-size: 12.5px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
  th, td { border: 1px solid #111; padding: 7px 9px; text-align: left; vertical-align: top; }
  th { background: #F5F2EB; font-family: 'JetBrains Mono', monospace; font-size: 10.5px; text-transform: uppercase; }
  .badge { display: inline-block; padding: 2px 6px; font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 700; border: 1px solid #111; background: #F5F2EB; }
  .badge.red { background: #D92B2B; color: #FFF; border-color: #D92B2B; }
  @media print {
    body { background: #FFF; padding: 0; }
    .print-bar { display: none !important; }
    .page { box-shadow: none; border: none; padding: 10mm; max-width: 100%; }
  }
</style>
</head>
<body>
  <div class="print-bar">
    <span style="font-family:'JetBrains Mono',monospace;font-size:11px;">■ CRIVOS // DOCUMENTO OFICIAL CALIBRADO (${tier})</span>
    <button class="print-btn" onclick="window.print()">[ IMPRIMIR / SALVAR EM PDF (A4) ]</button>
  </div>
  <div class="page">
    <div class="header">
      <div class="brand">■ CRIVOS // ENGENHARIA REVERSA DE EDITAIS · PLANO ${tier}</div>
      <h1>${isD7 ? 'DOSSIÊ DE VÉSPERA D-7 & PEGADINHAS DA BANCA' : 'GUIA DE ESTUDOS PÓS-EDITAL CALIBRADO'}</h1>
      <div style="font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:#333;">
        CERTAME: ${concurso} &nbsp;|&nbsp; CARGO: ${cargo} &nbsp;|&nbsp; BANCA: ${banca} &nbsp;|&nbsp; EMISSÃO: ${generatedDate}
      </div>
      <p style="margin:10px 0 0 0;font-size:12.5px;color:#222;"><b>Diagnóstico da Engenharia:</b> ${auditSummary}</p>
    </div>

    ${isD7 ? `
      <h2>01 · PROTOCOLO DE VÉSPERA D-7 E D-1 (ALTA INCIDÊNCIA 80/20)</h2>
      <div class="card">${escapeHtmlServer(contentData.vespera || 'Foco integral nos pontos ESSENCIAIS, leitura seca das teses da banca e reciclagem dos flashcards vencidos.')}</div>

      <h2>02 · FICHAS DE BLINDAGEM & PEGADINHAS CLÁSSICAS (${banca})</h2>
      ${textosHtml}

      <h2>03 · BATERIA DE RECUPERAÇÃO ATIVA DE VÉSPERA (FLASHCARDS SM-2)</h2>
      ${cardsHtml}

      <h2>04 · CHECKLIST OPERACIONAL DO DIA DA PROVA</h2>
      <div class="card">
        <ul>${(contentData.checklist || []).map(item => `<li>${escapeHtmlServer(item)}</li>`).join('')}</ul>
      </div>
    ` : `
      <h2>01 · MATRIZ DE DISCIPLINAS E PRIORIDADES DO EDITAL (PARETO 80/20)</h2>
      ${assuntosHtml}

      <h2>02 · DOSSIÊS TÁTICOS & ENGENHARIA REVERSA DA BANCA (${banca})</h2>
      ${textosHtml}

      <h2>03 · CRONOGRAMA DE CICLOS E METAS DIÁRIAS (${escapeHtmlServer(meta.hoursPerDay || 4)}H/DIA)</h2>
      <table>
        <thead><tr><th>DATA</th><th>BLOCO</th><th>MISSÃO TÁTICA & DIRETRIZ OPERACIONAL</th><th>META</th></tr></thead>
        <tbody>${cronoRows}</tbody>
      </table>

      ${cardsHtml ? `<h2>04 · DECK INICIAL DE FLASHCARDS SM-2</h2>${cardsHtml}` : ''}

      <h2>05 · PROTOCOLO DE VÉSPERA & DIRETRIZ DISSERTATIVA</h2>
      <div class="card">
        <p><b>Protocolo de Véspera (D-7):</b> ${escapeHtmlServer(contentData.vespera || '')}</p>
        <p><b>Diretriz de Prova / Escrita:</b> ${escapeHtmlServer(contentData.escrita || '')}</p>
      </div>
    `}
  </div>
</body>
</html>`;
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

  const targetUserId = panel?.user_id || order?.user_id || userId;
  const finalConcurso = (concurso || panel?.concurso || order?.concurso_nome || 'Concurso Público').trim();
  const finalCargo = (cargo || panel?.cargo || order?.cargo || 'Cargo Pretendido').trim();
  const finalTier = (planTier || panel?.plan_tier || order?.plan_tier || 'tatico').toLowerCase();
  const finalBanca = (banca || panel?.header_config?.banca || '').trim();

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

  let rawEditalContent = String(editalText || '').trim();
  if (!rawEditalContent) {
    rawEditalContent = await fetchEditalTextFromStorage(env, order, panel, targetUserId);
  }
  const filteredEditalContent = rawEditalContent
    ? extractHighSignalEditalSections(rawEditalContent, finalCargo)
    : '';

  const hasSubmittedEdital = filteredEditalContent.length > 60;

  const isEliteOrPrime = (finalTier === 'elite' || finalTier === 'prime');
  const isArsenalOrAbove = (finalTier === 'arsenal' || isEliteOrPrime);
  const tierMaxTokens = isEliteOrPrime ? 2200 : (isArsenalOrAbove ? 1900 : 1600);

  const schemaMapaBlock = isArsenalOrAbove ? `
  "mapa": {
    "nodes": [
      { "id": "n1", "label": "Eixo Curto 1", "materia": "Disciplina", "prio": "ESSENCIAL", "desc": "Papel central em 1 frase." }
    ],
    "edges": [
      ["n1", "n2", "Conexão", "Como a banca cruza os temas em 1 frase."]
    ]
  },` : '';

  const schemaEliteBlock = isEliteOrPrime ? `
  "sim": [
    {
      "id": "sim_1",
      "titulo": "Proposta #01 — Tema Quente do Edital",
      "comando": "Enunciado conciso no padrão da banca cobrando tema essencial do cargo.",
      "eixos": ["Eixo exigido 1", "Eixo exigido 2", "Eixo exigido 3"]
    }
  ],` : '';

  const systemPrompt = `Você é o Engenheiro Pedagógico Chefe da CRIVOS.
Extraia os dados reais do edital/certame e retorne um JSON conciso e cirúrgico para o cargo "${finalCargo}" no concurso "${finalConcurso}".

REGRAS:
1. Extraia FIELMENTE a Banca, datas (YYYY-MM-DD) e disciplinas/tópicos exclusivos do cargo "${finalCargo}".
2. Todo item de "textos" DEVE usar o mesmo "id" ("top_1", "top_2"...) dos tópicos de "assuntos".
3. Seja direto e denso (máximo 2 frases por campo textual) para máxima velocidade.
4. Retorne EXCLUSIVAMENTE JSON válido:
{
  "banca_identificada": "Nome da Banca",
  "resumo_auditoria_edital": "Síntese executiva em 1 frase do mapeamento do cargo.",
  "marcos_temporais": [
    ["INSCRIÇÕES (FIM)", "YYYY-MM-DD"],
    ["PROVA OBJETIVA", "YYYY-MM-DD"]
  ],
  "assuntos": [
    {
      "materia": "Nome da Disciplina",
      "topicos": [
        { "id": "top_1", "t": "Tópico real 1", "prio": "ESSENCIAL", "peso": "ALTO" },
        { "id": "top_2", "t": "Tópico real 2", "prio": "IMPORTANTE", "peso": "MÉDIO" }
      ]
    }
  ],
  "textos": [
    {
      "id": "top_1",
      "materia": "Disciplina",
      "titulo": "Tópico real 1",
      "t": "Tópico real 1",
      "autor": "Base Legal / Referência",
      "prio": "ESSENCIAL",
      "sec": "area",
      "tese": "Síntese direta em 2 frases do núcleo cobrado pela banca.",
      "crivo": "Como a banca cobra e qual a pegadinha clássica em 1 frase.",
      "conceitos": [
        ["Conceito/Artigo 1", "Definição cirúrgica em 1 frase"],
        ["Conceito/Artigo 2", "Definição cirúrgica em 1 frase"]
      ]
    }
  ],${schemaMapaBlock}${schemaEliteBlock}
  "vespera": "Protocolo 80/20 de revisão D-7 focado nos tópicos críticos deste cargo.",
  "escrita": "Diretriz tática de prova e discursiva para a banca deste edital."
}`;

  const userPrompt = `CALIBRAR SISTEMA:
- Concurso: ${finalConcurso} | Cargo: ${finalCargo} | Banca: ${finalBanca || 'Identificar'} | Plano: ${finalTier.toUpperCase()} | Horas/dia: ${effectiveHours}h
${examDate ? `- Data da Prova: ${examDate}\n` : ''}${hasSubmittedEdital ? `TRECHO DO EDITAL:\n"""\n${filteredEditalContent}\n"""` : `Use a matriz programática oficial vigente para "${finalConcurso}" — "${finalCargo}".`}

Dimensione de forma enxuta:
- 5 disciplinas reais do cargo em "assuntos", com 3 a 4 tópicos cada (top_1 a top_18);
- 5 fichas completas em "textos" (top_1 a top_5), cada uma com 2 pares em "conceitos";
${isArsenalOrAbove ? '- 5 nós (n1 a n5) e 5 conexões em "mapa";\n' : ''}${isEliteOrPrime ? '- 2 propostas em "sim";\n' : ''}- Textos objetivos em "vespera" e "escrita".`;

  const aiResponse = await callExperientialAI(env, {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.2,
    maxTokens: tierMaxTokens,
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

  const rawAssuntos = Array.isArray(aiData.assuntos) ? aiData.assuntos : [];
  const rawTextos = Array.isArray(aiData.textos) ? aiData.textos : [];
  const rawCards = Array.isArray(aiData.cards) ? aiData.cards : [];

  const compiledUnidades = (Array.isArray(aiData.unidades) && aiData.unidades.length > 0)
    ? aiData.unidades
    : rawAssuntos.flatMap(mat => {
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

  const sched = generateTacticalSchedule(compiledUnidades, effectiveHours, new Date(), resolvedExamDate);

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
    dates: marcos.length > 0 ? marcos : undefined
  };

  const defaultRubric = [
    { item: 'Domínio Técnico e Atendimento aos Eixos do Edital', max: 40, desc: 'Rigor conceitual/normativo e enfrentamento integral do comando.' },
    { item: 'Articulação Argumentativa e Coerência', max: 30, desc: 'Progressão lógica e estruturação clara dos parágrafos.' },
    { item: 'Modalidade Escrita e Precisão Terminológica', max: 30, desc: 'Correção gramatical e emprego do vocabulário técnico da área.' }
  ];

  const contentData = {
    meta: {
      concurso: finalConcurso,
      cargo: finalCargo,
      banca: detectedBanca,
      tier: finalTier,
      hoursPerDay: effectiveHours,
      editalExtracted: hasSubmittedEdital,
      auditSummary: aiData.resumo_auditoria_edital || '',
      hasOrderBump,
      calibratedAt: new Date().toISOString()
    },
    sched,
    dates: headerConfig.dates,
    assuntos: rawAssuntos,
    texts: rawTextos,
    textos: rawTextos,
    cards: rawCards,
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

  if (targetUserId && targetUserId !== 'default-user' && savedPanelId && savedPanelId !== 'default-panel') {
    try {
      const { url } = getSupabaseConfig(env);
      const existingFiles = await supabaseRest(env, `/user_files?panel_id=eq.${encodeURIComponent(savedPanelId)}`);
      const hasGuideFile = Array.isArray(existingFiles) && existingFiles.some(f => String(f.filename || '').includes('Guia_Tatico_Pos_Edital'));

      if (!hasGuideFile) {
        const guideHtml = buildStudyGuideHtmlDocument(contentData, headerConfig, 'guia');
        const guideBytes = new TextEncoder().encode(guideHtml);
        const guideStoragePath = `${targetUserId}/Guia_Tatico_Pos_Edital_${savedPanelId.slice(0, 8)}.html`;

        await supabaseStorageUpload(env, 'user-materials', guideStoragePath, guideBytes, 'text/html; charset=utf-8');
        const guidePublicUrl = `${url}/storage/v1/object/public/user-materials/${guideStoragePath}`;

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
      }

      const hasD7File = Array.isArray(existingFiles) && existingFiles.some(f => String(f.filename || '').includes('Dossie_Vespera_D7'));
      if ((hasOrderBump || isEliteOrPrime) && !hasD7File) {
        const d7Html = buildStudyGuideHtmlDocument(contentData, headerConfig, 'd7');
        const d7Bytes = new TextEncoder().encode(d7Html);
        const d7StoragePath = `${targetUserId}/Dossie_Vespera_D7_${savedPanelId.slice(0, 8)}.html`;

        await supabaseStorageUpload(env, 'user-materials', d7StoragePath, d7Bytes, 'text/html; charset=utf-8');
        const d7PublicUrl = `${url}/storage/v1/object/public/user-materials/${d7StoragePath}`;

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
    } catch (fileGenErr) {
      console.warn('[calibrate] Aviso ao publicar arquivos do Guia/Dossiê no Storage:', fileGenErr.message);
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
