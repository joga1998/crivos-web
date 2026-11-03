import { buildClassicPegadinhas50 } from './guide-data.js';

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildFullSwissGuideDocument(contentData = {}, headerConfig = {}, mode = 'guia') {
  const meta = contentData.meta || {};
  const concurso = escapeHtml(meta.concurso || headerConfig?.title || 'Concurso Público');
  const cargo = escapeHtml(meta.cargo || headerConfig?.subtitle || 'Cargo Pretendido');
  const banca = escapeHtml(meta.banca || headerConfig?.banca || 'Banca Oficial');
  const tier = escapeHtml((meta.tier || 'tatico').toUpperCase());
  const auditSummary = escapeHtml(meta.auditSummary || 'Mapeamento tático de incidência, cronograma de ciclos e fichas de alta retenção.');
  const generatedDate = new Date().toLocaleDateString('pt-BR');
  const ultimaProva = escapeHtml(meta.ultimaProva || headerConfig?.ultima_prova || '');
  const provaObjetiva = escapeHtml(meta.provaObjetiva || '');
  const effectiveHours = meta.hoursPerDay || 4;

  const isD7 = mode === 'd7';
  const docTitle = isD7
    ? `DOSSIÊ DE VÉSPERA D-7 & 50 PEGADINHAS DA BANCA // ${concurso}`
    : `GUIA DE ESTUDOS PÓS-EDITAL INTEGRAL (PADRÃO 12 SEÇÕES) // ${concurso}`;

  const pegadinhas50 = buildClassicPegadinhas50(banca, concurso, cargo, contentData.texts || []);

  if (isD7) {
    return buildD7HtmlDocument({
      concurso, cargo, banca, tier, generatedDate, ultimaProva, auditSummary, pegadinhas50, contentData, docTitle
    });
  }

  return buildGuia12SeçõesHtmlDocument({
    concurso, cargo, banca, tier, generatedDate, ultimaProva, provaObjetiva, effectiveHours, auditSummary, pegadinhas50, contentData, headerConfig, docTitle
  });
}

function buildGuia12SeçõesHtmlDocument(ctx) {
  const { concurso, cargo, banca, tier, generatedDate, ultimaProva, provaObjetiva, effectiveHours, auditSummary, pegadinhas50, contentData, headerConfig, docTitle } = ctx;

  const catalog = contentData.assuntos || [];
  const texts = contentData.texts || [];
  const sched = contentData.sched || [];
  const cards = contentData.cards || [];
  const sim = contentData.sim || [];
  const rubric = contentData.rubric || [];
  const arg = contentData.arg || [];
  const checklist = contentData.checklist || [];
  const marcos = headerConfig?.dates || contentData.dates || [];

  // 1. Cronograma em Tabelas Executivas
  const cronoRows = sched.map(s => {
    const isSpecial = s.t === 'PROVA' || s.t === 'RETA FINAL' || s.t === 'VÉSPERA';
    return `
      <tr class="${isSpecial ? 'highlight-row' : ''}">
        <td style="white-space:nowrap;font-family:'JetBrains Mono',monospace;font-weight:700;">${escapeHtml(String(s.d || '').split('-').reverse().join('/'))}</td>
        <td><span class="badge ${isSpecial ? 'red' : ''}">${escapeHtml(s.t || 'META')}</span></td>
        <td>
          <b>${escapeHtml(s.a || '')}</b>
          ${s.obs ? `<div style="font-size:11px;color:#555;margin-top:2px;">${escapeHtml(s.obs)}</div>` : ''}
        </td>
        <td style="text-align:center;font-family:'JetBrains Mono',monospace;">${escapeHtml(s.h || effectiveHours)}h</td>
      </tr>
    `;
  }).join('');

  // 2. Fichas Estruturantes (Gerais) vs Específicas
  const fichasGerais = texts.slice(0, Math.ceil(texts.length / 2));
  const fichasEspec = texts.slice(Math.ceil(texts.length / 2));

  const renderFichaHtml = (tx, idx, prefix = 'GERAL') => `
    <div class="card page-card">
      <div class="card-head">FICHA #${String(idx + 1).padStart(2, '0')} // ${escapeHtml(tx.materia || prefix)} — ${escapeHtml(tx.titulo || tx.t || 'Tópico Tático')}</div>
      <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:8px;font-size:11px;font-family:'JetBrains Mono',monospace;">
        <span><b>BASE NORMATIVA:</b> ${escapeHtml(tx.autor || banca)}</span>
        <span class="badge red">PRIORIDADE ESSENCIAL</span>
      </div>
      <p style="font-size:13.5px;line-height:1.6;margin:6px 0;"><b>Tese Central & Entendimento da Banca:</b> ${escapeHtml(tx.tese || '')}</p>
      
      <div class="alert">
        <b>ARMADILHA CLÁSSICA DA BANCA (${banca}):</b> ${escapeHtml(tx.crivo || 'A banca tenta induzir o candidato ao erro trocando exceções normativas e prazos procedimentais.')}
      </div>

      ${Array.isArray(tx.conceitos) && tx.conceitos.length ? `
        <table style="margin-top:10px;">
          <thead><tr><th>DISPOSITIVO / CONCEITO NUCLEAR</th><th>REGRA DE PROVA & DIRETRIZ DEFINITIVA</th></tr></thead>
          <tbody>
            ${tx.conceitos.map(c => `<tr><td style="width:35%;font-weight:700;">${escapeHtml(c[0])}</td><td>${escapeHtml(c[1])}</td></tr>`).join('')}
          </tbody>
        </table>
      ` : ''}

      ${tx.aplicacao_pratica ? `
        <div style="margin-top:8px;font-size:12px;background:#FAFAFA;padding:8px;border:1px dashed #CCC;">
          <b>Aplicação Funcional ao Cargo (${cargo}):</b> ${escapeHtml(tx.aplicacao_pratica)}
        </div>
      ` : ''}
    </div>
  `;

  // 3. Matriz Verticalizada
  const matrizVerticalizadaHtml = catalog.map((mat, mIdx) => `
    <div class="card" style="margin-bottom:14px;page-break-inside:avoid;">
      <div class="card-head">0${mIdx + 1} · ${escapeHtml(mat.materia)}</div>
      <table>
        <thead><tr><th style="width:60%;">CONTEÚDO PROGRAMÁTICO VERTICALIZADO</th><th>PRIORIDADE</th><th>INCIDÊNCIA</th><th>ESTUDADO</th></tr></thead>
        <tbody>
          ${(mat.topicos || []).map(tp => `
            <tr>
              <td><b>${escapeHtml(tp.t)}</b></td>
              <td><span class="badge ${tp.prio === 'ESSENCIAL' ? 'red' : ''}">${escapeHtml(tp.prio || 'IMPORTANTE')}</span></td>
              <td>${escapeHtml(tp.peso || 'ALTO')}</td>
              <td style="text-align:center;font-family:'JetBrains Mono',monospace;">[ &nbsp; ]</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `).join('');

  // 4. Simulados e Casos Práticos
  const simuladosHtml = sim.map((s, sIdx) => `
    <div class="card page-card">
      <div class="card-head">ESTUDO DE CASO #${String(sIdx + 1).padStart(2, '0')} // PADRÃO ${banca}</div>
      <h3 style="margin:4px 0 10px 0;text-transform:uppercase;">${escapeHtml(s.titulo || `Simulado Discursivo #${sIdx + 1}`)}</h3>
      <div style="font-size:13.5px;line-height:1.6;background:#F9F9F9;padding:12px;border:1px solid #E5E5E5;margin-bottom:12px;">
        ${escapeHtml(s.comando || '')}
      </div>
      ${s.eixos ? `<p class="mu" style="font-size:11px;"><b>EIXOS DE COBRANÇA:</b> ${escapeHtml(s.eixos.join(' · '))}</p>` : ''}
      <div class="alert" style="background:#F0FDF4;border-color:#22C55E;">
        <b style="color:#15803D;">ESQUEMA DE RESPOSTA ESPELHO DA BANCA (GRADE 0 A 100):</b>
        <p style="margin:6px 0 0 0;font-size:12.5px;">
          1. <b>Tese Inicial:</b> Enquadramento direto e enfrentamento do comando sem evasivas.<br>
          2. <b>Fundamento Normativo:</b> Remissão aos artigos de lei, princípios constitucionais e jurisprudência vinculante aplicável.<br>
          3. <b>Solução Técnica:</b> Aplicação prática e resolução do caso concreto no âmbito do cargo de ${cargo}.<br>
          4. <b>Conclusão Executiva:</b> Diretrizes preventivas, indicadores de desempenho e encerramento seguro.
        </p>
      </div>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${docTitle}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700;800&display=swap');
  * { box-sizing: border-box; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    color: #111111;
    background: #F4F4F0;
    margin: 0;
    padding: 24px;
    line-height: 1.55;
    font-size: 13px;
  }
  .print-bar {
    max-width: 920px;
    margin: 0 auto 20px auto;
    background: #111111;
    color: #FFFFFF;
    padding: 12px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border: 2px solid #111111;
  }
  .print-btn {
    background: #D92B2B;
    color: #FFFFFF;
    border: none;
    padding: 9px 18px;
    font-family: 'JetBrains Mono', monospace;
    font-weight: 700;
    font-size: 12px;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .book-container {
    max-width: 920px;
    margin: 0 auto;
    background: #FFFFFF;
    border: 2px solid #111111;
    padding: 48px;
    box-shadow: 8px 8px 0px #111111;
  }
  .cover-page {
    border-bottom: 5px solid #111111;
    padding-bottom: 32px;
    margin-bottom: 36px;
  }
  .brand-badge {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    font-weight: 800;
    color: #D92B2B;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-bottom: 12px;
  }
  h1.book-title {
    font-size: 32px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: -0.03em;
    line-height: 1.15;
    margin: 8px 0 16px 0;
  }
  .meta-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
    background: #F8F8F6;
    border: 1.5px solid #111111;
    padding: 16px;
    margin: 18px 0;
  }
  .meta-item b {
    display: block;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: #666;
    text-transform: uppercase;
  }
  .meta-item span {
    font-size: 13.5px;
    font-weight: 800;
    color: #111;
  }
  h2.section-title {
    font-size: 17px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: -0.01em;
    border-left: 6px solid #D92B2B;
    padding-left: 12px;
    margin: 40px 0 16px 0;
    background: #F8F8F6;
    padding-top: 6px;
    padding-bottom: 6px;
  }
  .card {
    border: 1.5px solid #111111;
    padding: 16px 18px;
    margin-bottom: 16px;
    background: #FFFFFF;
  }
  .card-head {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11.5px;
    font-weight: 800;
    text-transform: uppercase;
    background: #111111;
    color: #FFFFFF;
    padding: 6px 12px;
    margin: -16px -18px 14px -18px;
  }
  .alert {
    background: #FEF2F2;
    border-left: 5px solid #D92B2B;
    padding: 12px 14px;
    margin: 12px 0;
    font-size: 12.5px;
    line-height: 1.55;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0;
    font-size: 12px;
  }
  th, td {
    border: 1px solid #111111;
    padding: 8px 10px;
    text-align: left;
    vertical-align: top;
  }
  th {
    background: #F4F4F0;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10.5px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  tr.highlight-row {
    background: #FEF2F2;
  }
  .badge {
    display: inline-block;
    padding: 2px 7px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 9.5px;
    font-weight: 800;
    border: 1px solid #111111;
    background: #F4F4F0;
    text-transform: uppercase;
  }
  .badge.red {
    background: #D92B2B;
    color: #FFFFFF;
    border-color: #D92B2B;
  }
  .page-break {
    margin-top: 20px;
    padding-top: 14px;
    border-top: 1.5px solid #111111;
  }
  .card, table, .alert, .meta-grid, tr {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  h1, h2, h3, h4, .section-title, .card-head {
    break-after: avoid !important;
    page-break-after: avoid !important;
  }
  @media print {
    @page {
      size: A4 portrait;
      margin: 12mm 10mm 12mm 10mm;
    }
    body {
      background: #FFFFFF !important;
      padding: 0 !important;
      font-size: 11pt !important;
      line-height: 1.45 !important;
    }
    .print-bar {
      display: none !important;
    }
    .book-container {
      box-shadow: none !important;
      border: none !important;
      padding: 0 !important;
      max-width: 100% !important;
    }
    .page-break {
      /* Remove forçagem de quebra em branco antes de cada seção */
      page-break-before: auto !important;
      break-before: auto !important;
      border-top: 1px solid #111111 !important;
      margin-top: 16px !important;
      padding-top: 12px !important;
    }
    .section-title {
      break-after: avoid !important;
      page-break-after: avoid !important;
      break-inside: avoid !important;
      page-break-inside: avoid !important;
      margin-top: 20px !important;
      margin-bottom: 10px !important;
    }
    .card {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
      margin-bottom: 12px !important;
      padding: 12px 14px !important;
    }
    table {
      break-inside: auto !important;
      page-break-inside: auto !important;
      font-size: 9.5pt !important;
    }
    tr {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }
    thead {
      display: table-header-group !important;
    }
  }
</style>
</head>
<body>
  <div class="print-bar">
    <span style="font-family:'JetBrains Mono',monospace;font-size:11px;">■ CRIVOS // SISTEMA OPERACIONAL DE ESTUDOS · EDITORIAL SUÍÇO</span>
    <button class="print-btn" onclick="window.print()">[ IMPRIMIR / SALVAR EM PDF (A4) ]</button>
  </div>

  <div class="book-container">
    <!-- CAPA OFICIAL EDITORIAL SUÍÇO -->
    <div class="cover-page">
      <div class="brand-badge">■ CRIVOS // ENGENHARIA REVERSA DE EDITAIS · PLANO ${tier}</div>
      <h1 class="book-title">GUIA DE ESTUDOS PÓS-EDITAL INTEGRAL</h1>
      <div style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:800;color:#D92B2B;text-transform:uppercase;margin-bottom:14px;">
        CADERNO TÁTICO OFICIAL EM 12 SEÇÕES // AUDITORIA DEFINITIVA DA BANCA
      </div>

      <div class="meta-grid">
        <div class="meta-item"><b>CERTAME OFICIAL</b><span>${concurso}</span></div>
        <div class="meta-item"><b>CARGO / ÁREA</b><span>${cargo}</span></div>
        <div class="meta-item"><b>BANCA EXAMINADORA</b><span>${banca}</span></div>
        <div class="meta-item"><b>PLANO DE ESTUDOS</b><span>${tier}</span></div>
        <div class="meta-item"><b>CARGA DIÁRIA</b><span>${effectiveHours}h líquidas/dia</span></div>
        <div class="meta-item"><b>DATA DA ÚLTIMA PROVA</b><span>${ultimaProva ? ultimaProva.split('-').reverse().join('/') : 'A Definir'}</span></div>
      </div>

      <div class="card" style="margin-top:16px;">
        <div class="card-head">DIAGNÓSTICO DA ENGENHARIA CRIVOS</div>
        <p style="margin:0;font-size:13px;line-height:1.6;">
          ${auditSummary || 'Mapeamento minucioso dos eixos temáticos com base no histórico de provas da banca examinadora. Cronograma dia a dia dimensionado pela data final do edital, com aplicação estrita do Princípio de Pareto (80/20) e blindagem contra armadilhas clássicas.'}
        </p>
      </div>
    </div>

    <!-- SUMÁRIO EXECUTIVO -->
    <div class="card page-break">
      <div class="card-head">SUMÁRIO EXECUTIVO // AS 12 SEÇÕES DO GUIA DE ESTUDOS</div>
      <table>
        <thead><tr><th>SEÇÃO</th><th>TÍTULO DO MÓDULO</th><th>OBJETIVO ESTRATÉGICO</th></tr></thead>
        <tbody>
          <tr><td><b>01</b></td><td>Como Usar Este Kit & Regras do Edital</td><td>Divisão em 3 fases, ciclo de revisão D+1/D+7/D+14 e regras da banca.</td></tr>
          <tr><td><b>02</b></td><td>Cronograma Dia a Dia em Tabelas Executivas</td><td>Planejamento diário completo até a última prova do concurso.</td></tr>
          <tr><td><b>03</b></td><td>Fichas Analíticas Profundas (Núcleo Estruturante)</td><td>Teses fundamentais, base legal e conceitos-chave das matérias gerais.</td></tr>
          <tr><td><b>04</b></td><td>Fichas Analíticas Profundas (Conhecimentos Específicos)</td><td>Verticalização analítica das disciplinas de maior peso do cargo.</td></tr>
          <tr><td><b>05</b></td><td>Grandes Temas, Eixos Transversais e Conexões</td><td>Matriz de confronto entre institutos que a banca confunde.</td></tr>
          <tr><td><b>06</b></td><td>Como Escrever a Resposta Dissertativa / Prova Discursiva</td><td>Gestão de tempo, método em 4 partes, rubrica e conectivos.</td></tr>
          <tr><td><b>07</b></td><td>Simulados no Estilo da Banca com Esquemas de Resposta</td><td>Estudos de caso completos, espelho analítico e autocorreção 0-100.</td></tr>
          <tr><td><b>08</b></td><td>Casos Concretos e Pegadinhas Críticas da Banca</td><td>Casos reais da jurisprudência e linha de blindagem do candidato.</td></tr>
          <tr><td><b>09</b></td><td>Nota sobre Etapas Complementares</td><td>Diretrizes operacionais para títulos, TAF ou fases subsequentes.</td></tr>
          <tr><td><b>10</b></td><td>Raio-X Estatístico de Provas Anteriores</td><td>Tendências de cobrança, incidência temática e peso relativo.</td></tr>
          <tr><td><b>11</b></td><td>Anexo A: Conteúdo Programático Verticalizado</td><td>Checklist completo de tópicos do edital com caixas de controle [ ].</td></tr>
          <tr><td><b>12</b></td><td>Anexo B: Inventário de Materiais e Checklist Executivo</td><td>Mapeamento dos ativos da preparação e controle de metas semanais.</td></tr>
        </tbody>
      </table>
    </div>

    <!-- SEÇÃO 01 -->
    <div class="page-break">
      <h2 class="section-title">01 · COMO USAR ESTE KIT & REGRAS DO EDITAL</h2>
      <div class="card">
        <p>Este guia materializa a metodologia de engenharia reversa da CRIVOS, estruturada nas seguintes premissas intransigentes:</p>
        <ul>
          <li><b>Fase P0 (Fundação e Eixos Críticos):</b> Estudo ativo dos 20% do edital responsáveis por 80% dos pontos da prova (Pareto 80/20).</li>
          <li><b>Fase P1 (Prática Intensiva):</b> Resolução exaustiva de questões inéditas e discursivas espelho da banca ${banca}.</li>
          <li><b>Fase P2 (Reta Final D-14 a D-0):</b> Protocolo de memória de curto prazo, leitura seca de teses e revisão dos flashcards vencidos.</li>
        </ul>
        <div class="alert">
          <b>REGRA DA BANCA (${banca}):</b> Atente-se rigorosamente ao critério de correção e penalidade. Respostas sem precisão técnica ou que apresentem contradições conceituais são punidas com rigor pela régua da banca.
        </div>
      </div>
    </div>

    <!-- SEÇÃO 02 -->
    <div class="page-break">
      <h2 class="section-title">02 · CRONOGRAMA DIA A DIA EM TABELAS EXECUTIVAS E PLANO PÓS-PROVA</h2>
      <p class="mu">Todas as metas diárias estruturadas com base na sua carga declarada de <b>${effectiveHours}h líquidas/dia</b> de hoje até a data final do certame (<b>${ultimaProva ? ultimaProva.split('-').reverse().join('/') : 'Última Prova'}</b>):</p>
      <table>
        <thead><tr><th>DATA</th><th>FASE / TAG</th><th>MISSÃO TÁTICA & DIRETRIZ OPERACIONAL</th><th>META</th></tr></thead>
        <tbody>${cronoRows}</tbody>
      </table>
    </div>

    <!-- SEÇÃO 03 -->
    <div class="page-break">
      <h2 class="section-title">03 · FICHAS ANALÍTICAS PROFUNDAS (NÚCLEO GERAL / ESTRUTURANTE)</h2>
      ${fichasGerais.length ? fichasGerais.map((tx, idx) => renderFichaHtml(tx, idx, 'NÚCLEO GERAL')).join('') : '<p class="mu">Fichas gerais integradas às diretrizes do concurso.</p>'}
    </div>

    <!-- SEÇÃO 04 -->
    <div class="page-break">
      <h2 class="section-title">04 · FICHAS ANALÍTICAS PROFUNDAS (CONHECIMENTOS ESPECÍFICOS DO CARGO)</h2>
      ${fichasEspec.length ? fichasEspec.map((tx, idx) => renderFichaHtml(tx, idx, 'CONHECIMENTOS ESPECÍFICOS')).join('') : fichasGerais.map((tx, idx) => renderFichaHtml(tx, idx, 'ESPECÍFICAS')).join('')}
    </div>

    <!-- SEÇÃO 05 -->
    <div class="page-break">
      <h2 class="section-title">05 · GRANDES TEMAS, EIXOS TRANSVERSAIS E CONEXÕES</h2>
      <div class="card">
        <div class="card-head">MATRIZ DE CONFRONTO // INSTITUTOS QUE A BANCA (${banca}) CONFUNDE</div>
        <table>
          <thead><tr><th>INSTITUTO JURÍDICO / TÉCNICO A</th><th>INSTITUTO JURÍDICO / TÉCNICO B</th><th>DIFERENÇA DECISIVA PARA A PROVA</th></tr></thead>
          <tbody>
            <tr><td><b>Anulação do Ato</b> (Ilegalidade – Efeito Ex Tunc)</td><td><b>Revogação do Ato</b> (Conveniência – Efeito Ex Nunc)</td><td>Judiciário só ANULA ato ilegal (com ou sem provocação nos limites da lide). Judiciário NUNCA revoga ato do Executivo por mérito administrativo (conveniência e oportunidade).</td></tr>
            <tr><td><b>Desistência Voluntária</b> (Tentativa Abandonada)</td><td><b>Arrependimento Eficaz</b> (Prevenção Consumativa)</td><td>Na desistência o agente cessa a execução quando ainda podia prosseguir ("posso, mas não quero"). No arrependimento eficaz, ele esgota a execução mas atua ativamente para impedir a consumação. Em ambos, responde apenas pelos atos já praticados (ponte de ouro).</td></tr>
            <tr><td><b>Competência Privativa União</b> (Art. 22 CF)</td><td><b>Competência Concorrente</b> (Art. 24 CF)</td><td>Competência CONCORRENTE (Art. 24) = "PUTTE F" (Penitenciário, Urbanístico, Tributário, Tributário, Econômico e Financeiro) — Estados legislam supletivamente. Competência PRIVATIVA da União (Art. 22) = Civil, Penal, Processual, Trabalho, Eleitoral, etc.</td></tr>
            <tr><td><b>Governança Pública</b> (Instâncias Superiores)</td><td><b>Gestão Pública</b> (Instâncias Operacionais)</td><td>Governança DIRECIONA, MONITORA e AVALIA estratégias e políticas públicas; Gestão PLANEJA, COORDENA e EXECUTA as ações diárias para atingir os objetivos traçados.</td></tr>
            <tr><td><b>Desconcentração Administrativa</b> (Interna)</td><td><b>Descentralização Administrativa</b> (Externa)</td><td>Desconcentração cria ÓRGÃOS despersonalizados dentro da mesma pessoa jurídica (relação de hierarquia e subordinação). Descentralização cria ou delega para OUTRA PESSOA JURÍDICA (autarquias, fundações ou concessionárias) — sem subordinação hierárquica, apenas tutela/vinculação.</td></tr>
            <tr><td><b>Poder de Polícia Originário</b> (Direto)</td><td><b>Poder de Polícia Delegado</b> (Indireto)</td><td>Originário decorre do poder de império estatal exercido pela Administração Direta. Poder de polícia delegado só pode ser conferido a pessoas jurídicas de direito público ou a estatais prestadoras de serviço em regime não concorrencial (STF Tema 532).</td></tr>
            <tr><td><b>Improbidade Administrativa</b> (Lei 14.230/21)</td><td><b>Mera Irregularidade Funcional</b> (Infração Administrativa)</td><td>A Lei 14.230/2021 EXTINGUIU a modalidade culposa em todos os artigos de improbidade (Arts. 9, 10 e 11). Exige-se DOLO ESPECÍFICO comprovado (vontade livre e consciente de alcançar o resultado ilícito). A divergência interpretativa da lei não configura improbidade.</td></tr>
            <tr><td><b>Inexigibilidade de Licitação</b> (Art. 74 Lei 14.133)</td><td><b>Dispensa de Licitação</b> (Art. 75 Lei 14.133)</td><td>Inexigibilidade ocorre quando a competição é INVIÁVEL (fornecedor exclusivo, profissional de notória especialização, credenciamento). Dispensa ocorre quando a competição é VIÁVEL mas a lei autoriza ou determina a não realização (baixo valor, emergência, licitação deserta).</td></tr>
            <tr><td><b>Concessão Comum</b> (Lei 8.987/95)</td><td><b>Parceria Público-Privada (PPP)</b> (Lei 11.079/04)</td><td>Na concessão comum a remuneração advém da TARIFA paga pelo usuário. Na PPP Patrocinada há tarifa do usuário + contraprestação pecuniária do parceiro público. Na PPP Administrativa a Administração é a usuária direta/indireta e arca com 100% da contraprestação.</td></tr>
            <tr><td><b>Responsabilidade Civil Objetiva</b> (Art. 37, § 6º)</td><td><b>Responsabilidade por Omissão Genérica</b></td><td>Ação comissiva do Estado responde OBJETIVAMENTE (teoria do risco administrativo — dispensa comprovação de culpa). Na omissão genérica (falha do serviço público 'faute du service'), a jurisprudência dominante do STF/STJ exige demonstração de culpa administrativa (negligência, imperícia ou retardo inescusável).</td></tr>
            <tr><td><b>Mandado de Segurança</b> (Art. 5º, LXIX CF)</td><td><b>Habeas Data</b> (Art. 5º, LXXII CF)</td><td>MS protege direito líquido e certo não amparado por HC ou HD, exigindo prova pré-constituída documental. O Habeas Data é ação personalíssima exclusiva para assegurar o conhecimento ou retificação de informações relativas à pessoa do impetrante constantes de bancos de dados públicos/governamentais.</td></tr>
            <tr><td><b>Crime Próprio</b> (Código Penal)</td><td><b>Crime de Mão Própria</b> (Código Penal)</td><td>Crime próprio exige qualidade especial do agente (ex: funcionário público no peculato), admitindo coautoria e participação de particulares que conheçam a condição (Art. 30 CP). Crime de mão própria (ex: falso testemunho) só pode ser executado pessoalmente pelo autor da conduta, admitindo apenas participação moral, mas nunca coautoria executiva.</td></tr>
            <tr><td><b>Prescrição da Pretensão Punitiva</b> (Direito Penal)</td><td><b>Prescrição Intercorrente</b> (Lei 14.230 e Processo Penal)</td><td>A pretensão punitiva é calculada pela pena em abstrato ou em concreto antes do trânsito em julgado. A prescrição intercorrente opera-se no curso do processo após a interrupção inicial; na Lei de Improbidade (Art. 23, § 5º), prescreve a pretensão punitiva se decorrerem 4 anos entre os marcos interruptivos.</td></tr>
            <tr><td><b>Orçamento Tradicional</b> (Clássico)</td><td><b>Orçamento-Programa</b> (Moderno)</td><td>O tradicional é mero instrumento contábil de controle financeiro/legal sem vínculo com planos de governo. O Orçamento-Programa integra planejamento e orçamento, vinculando receitas e despesas a metas físicas, objetivos setoriais e indicadores mensuráveis de eficiência pública.</td></tr>
            <tr><td><b>Restos a Pagar Processados</b></td><td><b>Restos a Pagar Não Processados</b></td><td>Processados são despesas legalmente empenhadas e LIQUIDADAS no exercício anterior, pendentes apenas de pagamento formal. Não processados são despesas empenhadas cuja liquidação física e ateste de fornecimento ainda NÃO ocorreram até 31 de dezembro.</td></tr>
            <tr><td><b>Créditos Suplementares</b></td><td><b>Créditos Especiais vs Extraordinários</b></td><td>Suplementares reforçam dotação orçamentária existente. Especiais criam nova dotação para programa não previsto na LOA. Extraordinários atendem despesas imprevisíveis e urgentes (guerra, comoção interna ou calamidade pública) abertos por Medida Provisória (Art. 167, § 3º CF).</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- SEÇÃO 06 -->
    <div class="page-break">
      <h2 class="section-title">06 · COMO ESCREVER A RESPOSTA DISSERTATIVA / ESTRATÉGIA DE PROVA</h2>
            <div class="card">
        <div class="card-head">GESTÃO DE TEMPO NA PROVA DISCURSIVA // PROTOCOLO DE 70 MINUTOS</div>
        <table>
          <thead><tr><th>ETAPA</th><th>JANELA DE TEMPO</th><th>ATIVIDADE EXECUTIVA</th><th>OBJETIVO TÁTICO</th></tr></thead>
          <tbody>
            <tr><td><b>Tempo 01</b></td><td>00 a 15 min</td><td>Leitura analítica do comando + tempestade de ideias + esqueleto de 4 tópicos na folha de rascunho.</td><td>Garante enfrentamento de todos os itens do espelho sem risco de fuga parcial ao tema.</td></tr>
            <tr><td><b>Tempo 02</b></td><td>15 a 50 min</td><td>Desenvolvimento do texto definitivo parágrafo por parágrafo, articulando tese e norma.</td><td>Produção de 25 a 30 linhas com caligrafia legível, sem rasuras e com recuo padrão de parágrafo.</td></tr>
            <tr><td><b>Tempo 03</b></td><td>50 a 62 min</td><td>Conferência da grade de critérios (concordância verbal, regência, crase e precisão terminológica).</td><td>Elimina penalidades gramaticais que corroem a nota final de conteúdo.</td></tr>
            <tr><td><b>Tempo 04</b></td><td>62 a 70 min</td><td>Transposição final e conferência de segurança antes de lacrar o caderno.</td><td>Evita atropelo nas linhas finais e garante assinatura apenas no campo autorizado.</td></tr>
          </tbody>
        </table>
      </div>

      <div class="card">
        <div class="card-head">ARQUITETURA DA RESPOSTA EM 4 PARTES // MÉTODO CRIVOS</div>
        <p>Para obter nota máxima na grade de correção da banca ${banca}, estruture sua dissertação rigorosamente em 4 blocos articulados:</p>
        <ol>
          <li><b>Parágrafo 1 – Tese e Enquadramento Direto (4 a 6 linhas):</b> Responda pontualmente e sem evasivas ao questionamento principal da banca logo nas primeiras duas linhas. Fixe a tese jurídica ou técnica que guiará a argumentação.</li>
          <li><b>Parágrafo 2 – Fundamentação Normativa e Jurisprudencial (7 a 9 linhas):</b> Articule os dispositivos legais (CF/88, leis ordinárias, súmulas vinculantes ou teses de repercussão geral) sem necessidade de consulta física, utilizando a técnica da paráfrase atribuída ("consoante o magistério constitucional...", "na esteira da jurisprudência pacificada do Pretório Excelso...").</li>
          <li><b>Parágrafo 3 – Solução Técnica e Aplicação Funcional (7 a 9 linhas):</b> Conecte a norma à realidade prática e aos desafios concretos do cargo de ${cargo}, demonstrando viabilidade orçamentária, administrativa ou regulatória.</li>
          <li><b>Parágrafo 4 – Conclusão, Governança e Diretrizes Finais (4 a 6 linhas):</b> Sintetize o parecer, proponha indicadores de monitoramento (eficiência, transparência, integridade pública) e encerre com comando afirmativo definitivo.</li>
        </ol>
      </div>

      <div class="card">
        <div class="card-head">ESPELHO DE CORREÇÃO OFICIAL // GRADE PADRÃO DE CRITÉRIOS (0 A 100 PONTOS)</div>
        <table>
          <thead><tr><th>CRITÉRIO ANALÍTICO</th><th>PESO</th><th>O QUE O EXAMINADOR AVALIA</th><th>LINHA DE BLINDAGEM DO CANDIDATO</th></tr></thead>
          <tbody>
            <tr><td><b>I. Domínio do Conteúdo Técnico</b></td><td>50%</td><td>Precisão conceitual, conhecimento da matéria, pertinência doutrinária e resposta exaustiva ao comando.</td><td>Enfrentamento de cada subtópico do edital em ordem direta, citando nomes técnicos exatos.</td></tr>
            <tr><td><b>II. Progressão Lógica e Coesão</b></td><td>25%</td><td>Sequência lógica de ideias, ausência de contradições, transições suaves entre parágrafos e fluidez.</td><td>Utilização diversificada de operadores argumentativos e conectivos formais interparágrafos.</td></tr>
            <tr><td><b>III. Estrutura Textual & Adequação</b></td><td>15%</td><td>Formatação em prosa dissertativa-argumentativa ou parecer técnico, divisão equilibrada de parágrafos.</td><td>Parágrafos de 5 a 8 linhas cada; respeitar margens direita e esquerda sem hifenização errônea.</td></tr>
            <tr><td><b>IV. Correção Gramatical & Norma Culta</b></td><td>10%</td><td>Concordância nominal e verbal, regência, acentuação, ortografia oficial e vocabulário formal.</td><td>Evitar repetições viciosas de palavras, oralismos, coloquialismos ou gírias administrativas.</td></tr>
          </tbody>
        </table>
      </div>

      <div class="card">
        <div class="card-head">BANCO OFICIAL DE 40+ CONECTIVOS FORMAIS DE ALTO NÍVEL</div>
        <table>
          <thead><tr><th>FUNÇÃO ARGUMENTATIVA</th><th>CONECTIVOS DE ALTO IMPACTO (DISCURSIVAS & PEÇAS TÉCNICAS)</th></tr></thead>
          <tbody>
            <tr><td><b>Conclusão & Fechamento</b></td><td>Destarte; Dessarte; Por conseguinte; Em suma; Nesse diapasão; Em última análise; Depreende-se, portanto, que; Ex positis.</td></tr>
            <tr><td><b>Causa & Efeito</b></td><td>Haja vista que; Em virtude de; Conquanto decorra de; Visto que; Porquanto; Como corolário de; Em razão do exposto.</td></tr>
            <tr><td><b>Oposição & Contraponto</b></td><td>Não obstante; Malgrado; Em que pese a; Nada obstante; A despeito de; Se por um lado..., por outro...; Em contrapartida; Sem embargo.</td></tr>
            <tr><td><b>Adição & Continuidade</b></td><td>Outrossim; Ademais; Soma-se a isso o fato de que; Cumpre salientar que; Não menos importante; Paralelamente; Sob igual prisma.</td></tr>
            <tr><td><b>Conformidade & Base Legal</b></td><td>Em consonância com; Consoante preceitua; Ao encontro do estatuído no Artigo...; À luz do princípio da...; Sob a égide de.</td></tr>
            <tr><td><b>Ênfase & Esclarecimento</b></td><td>Impende ressaltar que; É forçoso reconhecer que; Urge asseverar; Notadamente; Cumpre rememorar; Iniludivelmente; Por oportuno.</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- SEÇÃO 07 -->
    <div class="page-break">
      <h2 class="section-title">07 · SIMULADOS NO ESTILO DA BANCA COM ESQUEMAS DE RESPOSTA</h2>
      ${simuladosHtml || '<p class="mu">Simulados discursivos em calibração.</p>'}
    </div>

    <!-- SEÇÃO 08 -->
    <div class="page-break">
      <h2 class="section-title">08 · CASOS CONCRETOS E PEGADINHAS CRÍTICAS DA BANCA COMENTADAS</h2>
      <div class="card">
        <div class="card-head">SELEÇÃO DE CASOS CRÍTICOS DA BANCA (${banca})</div>
        ${pegadinhas50.map(p => `
          <div style="border-bottom:1px solid #EEE;padding-bottom:10px;margin-bottom:10px;">
            <b style="color:#D92B2B;font-family:'JetBrains Mono',monospace;">[CASO CRÍTICO #${p.num}] ${escapeHtml(p.topico)}</b>
            <p style="margin:4px 0;font-size:12.5px;"><b>Armadilha da Banca:</b> ${escapeHtml(p.armadilha)}</p>
            <div style="background:#F0FDF4;padding:6px 10px;border-left:4px solid #22C55E;font-size:12px;">
              <b>Blindagem CRIVOS:</b> ${escapeHtml(p.blindagem)}
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- SEÇÃO 09 -->
    <div class="page-break">
      <h2 class="section-title">09 · NOTA SOBRE ETAPAS COMPLEMENTARES</h2>
      <div class="card">
        <p><b>Diretrizes para as Fases Subsequentes do Concurso (${concurso}):</b></p>
        <ul>
          <li><b>Prova de Títulos:</b> Organize com antecedência todas as certidões com firma reconhecida ou assinatura digital GOV.BR/ICP-Brasil.</li>
          <li><b>Curso de Formação / Avaliação Biopsicossocial:</b> Mantenha a documentação médica e laudos atualizados conforme as exigências do edital.</li>
          <li><b>Fase Recursal:</b> Reserve o gabarito preliminar da noite da prova para protocolar recursos fundamentados nas primeiras 48 horas.</li>
        </ul>
      </div>
    </div>

    <!-- SEÇÃO 10 -->
    <div class="page-break">
      <h2 class="section-title">10 · RAIO-X ESTATÍSTICO DE PROVAS ANTERIORES</h2>
      <div class="card">
        <div class="card-head">DISTRIBUIÇÃO HISTÓRICA DE INCIDÊNCIA TEMÁTICA // ${banca}</div>
        <table>
          <thead><tr><th>DISCIPLINA</th><th>RELEVÂNCIA HISTÓRICA</th><th>PESO NA NOTA FINAL</th><th>ESTRATÉGIA RECOMENDADA</th></tr></thead>
          <tbody>
            ${catalog.map(m => `
              <tr>
                <td><b>${escapeHtml(m.materia)}</b></td>
                <td><span class="badge red">ALTA PRIORIDADE</span></td>
                <td>PESO 2 / 3</td>
                <td>Revisão das fichas táticas e resolução de questões diárias.</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- SEÇÃO 11 -->
    <div class="page-break">
      <h2 class="section-title">11 · ANEXO A: CONTEÚDO PROGRAMÁTICO VERTICALIZADO</h2>
      <p class="mu">Utilize as caixas de seleção [ ] para auditar a cobertura integral do edital:</p>
      ${matrizVerticalizadaHtml}
    </div>

    <!-- SEÇÃO 12 -->
    <div class="page-break">
      <h2 class="section-title">12 · ANEXO B: INVENTÁRIO DE MATERIAIS E CHECKLIST EXECUTIVO</h2>
      <div class="card">
        <div class="card-head">CHECKLIST OPERACIONAL DEFINITIVO DO CANDIDATO</div>
        <table>
          <thead><tr><th>ATIVO DA PREPARAÇÃO</th><th>STATUS</th><th>DIRETRIZ DE CONCLUSÃO</th></tr></thead>
          <tbody>
            <tr><td><b>Guia Tático 12 Seções</b></td><td><span class="badge red">LIBERADO</span></td><td>Leitura integral e marcação de pontos de ancoragem.</td></tr>
            <tr><td><b>Cronograma Dia a Dia</b></td><td><span class="badge red">SINCRONIZADO</span></td><td>Execução das metas líquidas até ${ultimaProva ? ultimaProva.split('-').reverse().join('/') : 'a prova'}.</td></tr>
            <tr><td><b>Deck Flashcards SM-2 (${cards.length} cards)</b></td><td><span class="badge red">ATIVO</span></td><td>Zerar repetições espaçadas vencidas no painel web.</td></tr>
            <tr><td><b>Dossiê de Véspera D-7</b></td><td><span class="badge red">DISPONÍVEL</span></td><td>Ativação do protocolo de 50 pegadinhas a partir de D-7.</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div style="margin-top:40px;padding-top:20px;border-top:2px solid #111;text-align:center;font-family:'JetBrains Mono',monospace;font-size:11px;color:#666;">
      ■ CRIVOS SISTEMA OPERACIONAL DE ESTUDOS // DOCUMENTO HOMOLOGADO PARA O CANDIDATO // TODOS OS DIREITOS RESERVADOS
    </div>
  </div>
</body>
</html>`;
}

function buildD7HtmlDocument(ctx) {
  const { concurso, cargo, banca, tier, generatedDate, ultimaProva, auditSummary, pegadinhas50, contentData } = ctx;
  const checklist = contentData.checklist || [];

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DOSSIÊ DE VÉSPERA D-7 & 50 PEGADINHAS DA BANCA // ${concurso}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700;800&display=swap');
  * { box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; color: #111; background: #F4F4F0; margin: 0; padding: 24px; line-height: 1.55; font-size: 13px; }
  .print-bar { max-width: 920px; margin: 0 auto 20px auto; background: #111; color: #FFF; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; border: 2px solid #111; }
  .print-btn { background: #D92B2B; color: #FFF; border: none; padding: 9px 18px; font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 12px; cursor: pointer; text-transform: uppercase; }
  .book-container { max-width: 920px; margin: 0 auto; background: #FFF; border: 2px solid #111; padding: 48px; box-shadow: 8px 8px 0 #111; }
  .cover-page { border-bottom: 5px solid #111; padding-bottom: 28px; margin-bottom: 32px; }
  .brand-badge { font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 800; color: #D92B2B; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 12px; }
  h1.book-title { font-size: 30px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.03em; margin: 8px 0 14px 0; }
  h2.section-title { font-size: 16px; font-weight: 900; text-transform: uppercase; border-left: 6px solid #D92B2B; padding-left: 12px; margin: 36px 0 16px 0; background: #F8F8F6; padding-top: 6px; padding-bottom: 6px; }
  .card { border: 1.5px solid #111; padding: 16px 18px; margin-bottom: 16px; background: #FFF; }
  .card-head { font-family: 'JetBrains Mono', monospace; font-size: 11.5px; font-weight: 800; text-transform: uppercase; background: #111; color: #FFF; padding: 6px 12px; margin: -16px -18px 14px -18px; }
  .alert { background: #FEF2F2; border-left: 5px solid #D92B2B; padding: 12px 14px; margin: 12px 0; font-size: 12.5px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12px; }
  th, td { border: 1px solid #111; padding: 8px 10px; text-align: left; vertical-align: top; }
  th { background: #F4F4F0; font-family: 'JetBrains Mono', monospace; font-size: 10.5px; font-weight: 800; text-transform: uppercase; }
  .badge { display: inline-block; padding: 2px 7px; font-family: 'JetBrains Mono', monospace; font-size: 9.5px; font-weight: 800; border: 1px solid #111; background: #F4F4F0; text-transform: uppercase; }
  .page-break {
    page-break-before: always;
    margin-top: 24px;
    padding-top: 16px;
    border-top: 2px solid #111111;
  }
  .card, table, .alert, .meta-grid, tr {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
  @media print {
    body { background: #FFF; padding: 0; }
    .print-bar { display: none !important; }
    .book-container { box-shadow: none; border: none; padding: 0; max-width: 100%; }
    .page-break { page-break-before: always; border: none; padding: 0; margin: 0; }
  }
</style>
</head>
<body>
  <div class="print-bar">
    <span style="font-family:'JetBrains Mono',monospace;font-size:11px;">■ CRIVOS // DOSSIÊ DE VÉSPERA D-7 & 50 PEGADINHAS DA BANCA</span>
    <button class="print-btn" onclick="window.print()">[ IMPRIMIR / SALVAR EM PDF (A4) ]</button>
  </div>

  <div class="book-container">
    <div class="cover-page">
      <div class="brand-badge">■ CRIVOS // PROTOCOLO DE VÉSPERA D-7 & RETENÇÃO TÁTICA</div>
      <h1 class="book-title">DOSSIÊ DE VÉSPERA D-7 & MAPEAMENTO DAS 50 PEGADINHAS</h1>
      <div style="font-family:'JetBrains Mono',monospace;font-size:12.5px;font-weight:800;color:#D92B2B;text-transform:uppercase;">
        CADERNO TÁTICO EXTRA // BLINDAGEM COMPLETA CONTRA A BANCA ${banca}
      </div>
      <p style="margin:12px 0 0 0;font-size:13px;">
        <b>Certame:</b> ${concurso} &nbsp;|&nbsp; <b>Cargo:</b> ${cargo} &nbsp;|&nbsp; <b>Data da Última Prova:</b> ${ultimaProva ? ultimaProva.split('-').reverse().join('/') : 'Em Breve'} &nbsp;|&nbsp; <b>Emissão:</b> ${generatedDate}
      </p>
    </div>

    <!-- SEÇÃO 01: ROTEIRO D-7 A D-0 -->
    <div>
      <h2 class="section-title">01 · ROTEIRO OPERACIONAL DE REVISÃO RÁPIDA DOS ÚLTIMOS 7 DIAS (D-7 A D-0)</h2>
      <table>
        <thead><tr><th>DIA</th><th>DATA ESTIMADA</th><th>FOCO DE MEMÓRIA CURTA</th><th>DIRETRIZ PSICOFÍSICA</th></tr></thead>
        <tbody>
          <tr><td><b>D-7</b></td><td>7 dias antes</td><td>Leitura das 15 primeiras pegadinhas + normas secas de Constitucional.</td><td>Sono regulado para o horário exato da prova.</td></tr>
          <tr><td><b>D-6</b></td><td>6 dias antes</td><td>Pegadinhas 16 a 30 + prazos da Lei 14.133/21 e improbidade.</td><td>Alimentação leve e hidratação com isotônicos.</td></tr>
          <tr><td><b>D-5</b></td><td>5 dias antes</td><td>Pegadinhas 31 a 40 + regimento interno e legislação específica.</td><td>Revisão exclusivamente por fichas e flashcards.</td></tr>
          <tr><td><b>D-4</b></td><td>4 dias antes</td><td>Pegadinhas 41 a 50 + conectivos e regras de crase/concordância.</td><td>Zero simulados longos; foco estrito em memorização.</td></tr>
          <tr><td><b>D-3</b></td><td>3 dias antes</td><td>Reciclagem dos 50 flashcards com menor índice de acerto no painel.</td><td>Conferência do local de prova e rota de transporte.</td></tr>
          <tr><td><b>D-2</b></td><td>2 dias antes</td><td>Releitura da estrutura de 4 partes da discursiva e conectivos.</td><td>Separação de canetas pretas transparentes e documento oficial.</td></tr>
          <tr><td><b>D-1</b></td><td>Véspera</td><td>Leitura leve apenas deste checklist anti-pânico e descanso mental.</td><td>Dormir no mínimo 8 horas; zero estudo exaustivo após as 18h.</td></tr>
          <tr style="background:#FEF2F2;"><td><b>D-0</b></td><td><b>DIA DA PROVA</b></td><td>Chegada com 1h de antecedência e foco absoluto na execução fria.</td><td>Confiança no método; transposição do gabarito sem hesitação.</td></tr>
        </tbody>
      </table>
    </div>

    <!-- SEÇÃO 02: AS 50 PEGADINHAS -->
    <div class="page-break">
      <h2 class="section-title">02 · O MAPEAMENTO RIGOROSO DAS 50 PEGADINHAS CLÁSSICAS DA BANCA EXAMINADORA (${banca})</h2>
      <p class="mu" style="margin-bottom:16px;">
        As 50 armadilhas mais recorrentes e eliminatórias da banca examinadora com o critério definitivo da CRIVOS para você gabaritar no automático:
      </p>

      ${pegadinhas50.map(p => `
        <div class="card" style="page-break-inside:avoid;margin-bottom:14px;">
          <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #111;padding-bottom:6px;margin-bottom:8px;">
            <b style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#D92B2B;">[PEGADINHA ${p.num}] ${escapeHtml(p.topico)}</b>
            <span class="badge">${escapeHtml(p.mat)}</span>
          </div>
          <div style="font-size:13px;line-height:1.5;margin-bottom:8px;">
            <b>A Armadilha da Banca (${banca}):</b> ${escapeHtml(p.armadilha)}
          </div>
          <div class="alert" style="background:#F0FDF4;border-color:#22C55E;color:#111;margin:0;">
            <b style="color:#15803D;font-family:'JetBrains Mono',monospace;font-size:10.5px;">LINHA DE BLINDAGEM CRIVOS:</b>
            <div style="margin-top:2px;">${escapeHtml(p.blindagem)}</div>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- SEÇÃO 03: CHECKLIST ANTI-PÂNICO -->
    <div class="page-break">
      <h2 class="section-title">03 · CHECKLIST ANTI-PÂNICO DO DIA DA PROVA</h2>
      <div class="card">
        <div class="card-head">PROTOCOLOS INEGOCIÁVEIS DE SALA DE PROVA</div>
        <ul>
          <li><b>Kit Material:</b> 3 canetas esferográficas de tinta preta fabricadas em material transparente, documento oficial com foto e cartão de confirmação.</li>
          <li><b>Estratégia de Caderno:</b> Comece pelas matérias onde seu rendimento é superior a 80%. Pule questões que exijam mais de 3 minutos na primeira passada.</li>
          <li><b>Prova Discursiva:</b> Faça o rascunho em tópicos estruturados nos primeiros 20 minutos; redija a versão definitiva antes do cansaço visual.</li>
          <li><b>Transposição Segura:</b> Reserve impreterivelmente os 30 minutos finais para preencher a folha de respostas com calma absoluta.</li>
        </ul>
      </div>
    </div>

    <div style="margin-top:40px;padding-top:20px;border-top:2px solid #111;text-align:center;font-family:'JetBrains Mono',monospace;font-size:11px;color:#666;">
      ■ CRIVOS SISTEMA OPERACIONAL DE ESTUDOS // DOSSIÊ DE VÉSPERA HOMOLOGADO // TODOS OS DIREITOS RESERVADOS
    </div>
  </div>
</body>
</html>`;
}
