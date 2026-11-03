#!/usr/bin/env node
// Script unificado de atualização e sincronização da base de concursos e exames da CRIVOS
// Executado periodicamente pela skill crivo-update
// Sincroniza:
// 1. crivos-web/data/concursos-abertos.json (compatível com payment.html)
// 2. crivos-web/data/concursos-abertos.js (versão estática para o browser)
// 3. crivos-painel/functions/api/data/canonical-exams.json (consumido pela Cloudflare Function calibrate.js)

const fs = require('fs');
const path = require('path');

const canonicalSourcePath = path.resolve(__dirname, '../data/canonical-exams.js');

console.log('[crivo-update] Carregando catálogo canônico oficial de:', canonicalSourcePath);

if (!fs.existsSync(canonicalSourcePath)) {
  console.error('[crivo-update] Erro: Arquivo canônico não encontrado!');
  process.exit(1);
}

try {
  const { CANONICAL_EXAMS_DATABASE } = require(canonicalSourcePath);
  console.log(`[crivo-update] Total de certames/exames canônicos carregados: ${CANONICAL_EXAMS_DATABASE.length}`);

  // Estatísticas por categoria
  const catStats = {};
  CANONICAL_EXAMS_DATABASE.forEach(item => {
    catStats[item.categoria] = (catStats[item.categoria] || 0) + 1;
  });
  console.log('[crivo-update] Distribuição por segmento:', catStats);

  // 1. Gera crivos-web/data/concursos-abertos.json (com campos compatíveis para o autocomplete de payment.html)
  const webCompatibleList = CANONICAL_EXAMS_DATABASE.map(item => ({
    id: item.id,
    nome: item.nome,
    sigla: item.sigla || '',
    banca: item.banca,
    orgao: item.orgao,
    categoria: item.categoria,
    cargos: (item.cargos_detalhes || []).map(cd => cd.cargo),
    cargos_detalhes: item.cargos_detalhes || [],
    escolaridade: item.escolaridade,
    esfera: item.esfera,
    status: item.status || 'Inscrições Abertas',
    salario_max: item.salario_max,
    popular: Boolean(item.popular),
    calendario: item.calendario || null
  }));

  const webJsonPath = path.resolve(__dirname, '../data/concursos-abertos.json');
  fs.writeFileSync(webJsonPath, JSON.stringify(webCompatibleList, null, 2), 'utf8');
  console.log('[crivo-update] Sincronizado JSON Web:', webJsonPath);

  // 2. Gera crivos-web/data/concursos-abertos.js (versão window.CRIVOS_CONCURSOS_DATA para o browser)
  const webJsPath = path.resolve(__dirname, '../data/concursos-abertos.js');
  const webJsContent = `// Base estática oficial de concursos e exames com inscrições abertas para o checkout CRIVOS\nwindow.CRIVOS_CONCURSOS_DATA = ${JSON.stringify(webCompatibleList, null, 2)};\n`;
  fs.writeFileSync(webJsPath, webJsContent, 'utf8');
  console.log('[crivo-update] Sincronizado JS Web:', webJsPath);

  // 3. Sincroniza cópia exata para o backend da Cloudflare em crivos-painel/functions/api/data/canonical-exams.json
  const painelDataDir = path.resolve(__dirname, '../../crivos-painel/functions/api/data');
  if (!fs.existsSync(painelDataDir)) {
    fs.mkdirSync(painelDataDir, { recursive: true });
  }
  const painelJsonPath = path.resolve(painelDataDir, 'canonical-exams.json');
  fs.writeFileSync(painelJsonPath, JSON.stringify(CANONICAL_EXAMS_DATABASE, null, 2), 'utf8');
  console.log('[crivo-update] Sincronizado Backend Painel:', painelJsonPath);

  console.log('[crivo-update] ✅ Sincronização multi-plataforma concluída com sucesso!');
} catch (err) {
  console.error('[crivo-update] Falha durante sincronização:', err);
  process.exit(1);
}
