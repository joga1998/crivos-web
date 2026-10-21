#!/usr/bin/env node
// Script de atualização e sincronização da base de concursos abertos da CRIVOS
// Executado periodicamente pela skill crivo-update

const fs = require('fs');
const path = require('path');

const targetPath = path.resolve(__dirname, '../data/concursos-abertos.json');

console.log('[crivo-update] Lendo base de dados em:', targetPath);

if (!fs.existsSync(targetPath)) {
  console.error('[crivo-update] Erro: Arquivo de concursos não encontrado!');
  process.exit(1);
}

try {
  const data = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
  console.log(`[crivo-update] Total de certames cadastrados e auditados: ${data.length}`);
  
  const populares = data.filter(c => c.popular);
  console.log(`[crivo-update] Certames populares destacados: ${populares.length}`);
  
  // Gera uma versão JS compilada embutível caso a página precise de carregamento síncrono offline
  const jsExportPath = path.resolve(__dirname, '../data/concursos-abertos.js');
  const jsContent = `// Base estática oficial de concursos abertos para o checkout CRIVOS\nwindow.CRIVOS_CONCURSOS_DATA = ${JSON.stringify(data, null, 2)};\n`;
  fs.writeFileSync(jsExportPath, jsContent, 'utf8');
  console.log('[crivo-update] Exportação JS sincronizada em:', jsExportPath);

  console.log('[crivo-update] Sincronização concluída com sucesso!');
} catch (err) {
  console.error('[crivo-update] Falha ao processar base de concursos:', err);
  process.exit(1);
}
