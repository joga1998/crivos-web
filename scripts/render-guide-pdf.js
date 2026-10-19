#!/usr/bin/env node

/**
 * CRIVOS // RENDERIZADOR DE MATERIAIS E GUIAS EM PDF (DESIGN EDITORIAL SUÍÇO / BRUTALISTA)
 * 
 * Segue estritamente as diretrizes da marca CRIVOS (idêntico à skill crivo-criativos):
 * - Fundo #F4F4F0 (off-white técnico)
 * - Bordas secas 1px/2px solid #111111
 * - border-radius: 0px !important (zero cantos arredondados)
 * - Sombras duras (box-shadow: 2px 2px 0px #111111)
 * - Vermelho CRIVOS #D92B2B para alertas e destaques
 * - Tipografia: Inter (títulos em caixa alta) + JetBrains Mono (dados, código, tabelas, metadados)
 * - Rodapé com quadrado vermelho 9x9px + CRIVOS em Inter 800 + crivos.me + numeração de páginas
 * 
 * Uso:
 *   node scripts/render-guide-pdf.js <input.md_ou_html> <output.pdf> [titulo_documento]
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

let marked;
try {
  marked = require('marked');
} catch (e) {
  // Se não encontrar no cwd local, tenta no root
  try {
    marked = require(path.resolve(__dirname, '../../node_modules/marked'));
  } catch (err) {
    console.warn('⚠️ Biblioteca marked não encontrada localmente. Entrada markdown exigirá parsing inline.');
  }
}

const executablePath = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

function generateSwissEditorialHtml(bodyHtml, docTitle = 'GUIA DE ESTUDOS PÓS-EDITAL') {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${docTitle}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700;800&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4;
      margin: 20mm 14mm 20mm 14mm;
    }

    * {
      box-sizing: border-box;
      border-radius: 0px !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      margin: 0;
      padding: 0;
      background-color: #F4F4F0;
      color: #111111;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 10.5pt;
      line-height: 1.6;
    }

    /* Container principal */
    .document-container {
      width: 100%;
      max-width: 100%;
      margin: 0 auto;
    }

    /* Capa / Cabeçalho Editorial Hero */
    .doc-hero {
      background: #FFFFFF;
      border: 2px solid #111111;
      box-shadow: 4px 4px 0px #111111;
      padding: 24px 28px;
      margin-bottom: 32px;
      page-break-after: avoid;
    }

    .doc-hero-tag {
      display: inline-block;
      font-family: 'JetBrains Mono', monospace;
      font-size: 9pt;
      font-weight: 700;
      background: #111111;
      color: #FFFFFF;
      padding: 3px 8px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 12px;
    }

    .doc-hero-title {
      font-family: 'Inter', sans-serif;
      font-size: 24pt;
      font-weight: 900;
      line-height: 1.15;
      text-transform: uppercase;
      letter-spacing: -0.03em;
      color: #111111;
      margin: 0 0 10px 0;
    }

    .doc-hero-meta {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9pt;
      color: #555555;
      border-top: 1px solid #111111;
      padding-top: 10px;
      margin-top: 12px;
      display: flex;
      justify-content: space-between;
    }

    /* Títulos e Hierarquia */
    h1 {
      font-family: 'Inter', sans-serif;
      font-size: 16pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: -0.02em;
      color: #111111;
      border-bottom: 2px solid #111111;
      padding-bottom: 6px;
      margin-top: 36px;
      margin-bottom: 16px;
      page-break-after: avoid;
      break-after: avoid;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    h1::before {
      content: "";
      display: inline-block;
      width: 10px;
      height: 10px;
      background: #D92B2B;
      border: 1px solid #111111;
    }

    h2 {
      font-family: 'Inter', sans-serif;
      font-size: 13pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: -0.01em;
      color: #111111;
      background: #FFFFFF;
      border: 1px solid #111111;
      border-left: 5px solid #111111;
      padding: 6px 12px;
      margin-top: 24px;
      margin-bottom: 12px;
      page-break-after: avoid;
      break-after: avoid;
    }

    h3 {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #111111;
      margin-top: 18px;
      margin-bottom: 8px;
      page-break-after: avoid;
      break-after: avoid;
    }

    p {
      margin: 0 0 12px 0;
      text-align: justify;
    }

    /* Listas */
    ul, ol {
      margin: 0 0 14px 0;
      padding-left: 20px;
    }

    li {
      margin-bottom: 6px;
    }

    li::marker {
      color: #D92B2B;
      font-weight: 700;
    }

    /* Blocos de Destaque / Cards Suíços */
    blockquote {
      background: #FFFFFF;
      border: 1px solid #111111;
      border-left: 4px solid #D92B2B;
      box-shadow: 2px 2px 0px #111111;
      padding: 12px 16px;
      margin: 16px 0;
      font-style: normal;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    blockquote p:last-child {
      margin-bottom: 0;
    }

    /* Tabelas Técnicas */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 18px 0;
      background: #FFFFFF;
      border: 2px solid #111111;
      box-shadow: 3px 3px 0px #111111;
      page-break-inside: avoid;
      break-inside: avoid;
      font-size: 9.5pt;
    }

    th {
      background: #111111;
      color: #FFFFFF;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 8.5pt;
      letter-spacing: 0.03em;
      padding: 8px 10px;
      text-align: left;
      border: 1px solid #111111;
    }

    td {
      padding: 8px 10px;
      border: 1px solid #DDDDDD;
      border-bottom: 1px solid #111111;
      color: #111111;
      vertical-align: top;
    }

    tr:nth-child(even) td {
      background: #FAF9F6;
    }

    /* Tags e Código Inline */
    code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9pt;
      background: #FFFFFF;
      border: 1px solid #111111;
      padding: 1px 4px;
      color: #111111;
    }

    pre {
      background: #FFFFFF;
      border: 1px solid #111111;
      box-shadow: 2px 2px 0px #111111;
      padding: 12px;
      overflow-x: auto;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    pre code {
      background: transparent;
      border: none;
      padding: 0;
      font-size: 8.5pt;
      line-height: 1.4;
    }

    /* Elementos de Quebra Limpa */
    hr {
      border: none;
      border-top: 1px solid #111111;
      margin: 24px 0;
    }

    .page-break {
      page-break-before: always;
      break-before: always;
    }

    /* Boxes de Aviso Especial */
    .warning-box {
      background: #FFFFFF;
      border: 2px solid #111111;
      box-shadow: 3px 3px 0px #111111;
      padding: 14px 18px;
      margin: 18px 0;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .warning-header {
      display: flex;
      align-items: center;
      gap: 6px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 9pt;
      font-weight: 800;
      color: #D92B2B;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
  </style>
</head>
<body>
  <div class="document-container">
    <div class="doc-hero">
      <div class="doc-hero-tag">// CRIVOS MATERIAL OFICIAL</div>
      <div class="doc-hero-title">${docTitle}</div>
      <div class="doc-hero-meta">
        <span>SISTEMA OPERACIONAL DE ESTUDOS</span>
        <span>PADRÃO: EDITORIAL SUÍÇO / BRUTALISTA</span>
        <span>LINK: CRIVOS.ME</span>
      </div>
    </div>
    <div class="doc-content">
      ${bodyHtml}
    </div>
  </div>
</body>
</html>`;
}

async function renderPdf(inputPath, outputPdfPath, customTitle) {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Arquivo de entrada não encontrado: ${inputPath}`);
  }

  const outDir = path.dirname(outputPdfPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  let finalHtmlPath = inputPath;
  let tempHtmlFile = null;

  // Se o arquivo de entrada for Markdown (.md), converte para HTML suíço
  if (inputPath.endsWith('.md')) {
    console.log(`› Convertendo Markdown em layout Editorial Suíço...`);
    const mdContent = fs.readFileSync(inputPath, 'utf8');
    
    // Extrai título do H1 se existir
    let docTitle = customTitle || 'GUIA DE ESTUDOS PÓS-EDITAL';
    const h1Match = mdContent.match(/^#\s+(.+)$/m);
    if (h1Match && !customTitle) {
      docTitle = h1Match[1].replace(/[*_#]/g, '').trim();
    }

    let parsedHtml = '';
    if (marked) {
      parsedHtml = marked.parse(mdContent);
    } else {
      // Fallback simples
      parsedHtml = `<pre>${mdContent}</pre>`;
    }

    const styledHtml = generateSwissEditorialHtml(parsedHtml, docTitle);
    tempHtmlFile = path.join(outDir, `_temp_${Date.now()}.html`);
    fs.writeFileSync(tempHtmlFile, styledHtml, 'utf8');
    finalHtmlPath = tempHtmlFile;
  }

  console.log(`› Inicializando navegador headless (${executablePath})...`);
  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none']
  });

  try {
    const page = await browser.newPage();
    const fileUrl = 'file:///' + path.resolve(finalHtmlPath).replace(/\\/g, '/');
    console.log(`› Carregando documento: ${fileUrl}`);
    
    await page.goto(fileUrl, { waitUntil: 'networkidle0' });
    await page.evaluateHandle('document.fonts.ready');

    console.log(`› Gerando PDF em padrão Editorial Suíço (CRIVOS)...`);
    await page.pdf({
      path: outputPdfPath,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-family: 'JetBrains Mono', monospace; font-size: 8px; width: 100%; box-sizing: border-box; padding: 0 14mm; display: flex; justify-content: space-between; border-bottom: 1px solid #111111; padding-bottom: 4px; color: #111111; font-weight: 700;">
          <span>[ CRIVOS // SISTEMA OPERACIONAL DE ESTUDOS PÓS-EDITAL ]</span>
          <span class="title"></span>
        </div>
      `,
      footerTemplate: `
        <div style="font-family: 'JetBrains Mono', monospace; font-size: 8px; width: 100%; box-sizing: border-box; padding: 0 14mm; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #111111; padding-top: 5px; color: #111111;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="display: inline-block; width: 9px; height: 9px; background: #D92B2B; border: 1px solid #111111;"></span>
            <span style="font-family: 'Inter', sans-serif; font-weight: 800; font-size: 11px; letter-spacing: -0.03em; text-transform: uppercase;">CRIVOS</span>
          </div>
          <div>
            <span style="margin-right: 14px; font-weight: 700; color: #111111;">crivos.me</span>
            <span>[ PÁG. <span class="pageNumber"></span> / <span class="totalPages"></span> ]</span>
          </div>
        </div>
      `,
      margin: {
        top: '18mm',
        bottom: '18mm',
        left: '14mm',
        right: '14mm'
      }
    });

    console.log(`✓ PDF gerado com sucesso: ${outputPdfPath}`);
  } finally {
    await browser.close();
    if (tempHtmlFile && fs.existsSync(tempHtmlFile)) {
      try { fs.unlinkSync(tempHtmlFile); } catch(e) {}
    }
  }

  return outputPdfPath;
}

const inputArg = process.argv[2];
const outputArg = process.argv[3];
const titleArg = process.argv[4];

if (!inputArg || !outputArg) {
  console.log('Uso: node render-guide-pdf.js <input.md_ou_html> <output.pdf> [titulo_documento]');
  process.exit(1);
}

renderPdf(inputArg, outputArg, titleArg)
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Erro na geração do PDF:', err);
    process.exit(1);
  });
