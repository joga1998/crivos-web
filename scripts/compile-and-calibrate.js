#!/usr/bin/env node

/**
 * CRIVOS // COMPILADOR & CALIBRADOR DE PAINEL INDIVIDUALIZADO
 * 
 * Uso:
 *   node scripts/compile-and-calibrate.js --email <email_aluno> --panel-file <caminho_json> [--files-dir <caminho_materiais>]
 * 
 * Este script valida a integridade do JSON de calibração e dispara a publicação
 * para o registro exclusivo do aluno no Supabase, liberando o painel e disparando o E-mail #2.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
      out[key] = val;
    }
  }
  return out;
}

const args = parseArgs();
const email = args['email'];
const orderId = args['order-id'];
const panelFile = args['panel-file'];
const filesDir = args['files-dir'];

if ((!email && !orderId) || !panelFile) {
  console.log('Uso: node compile-and-calibrate.js --email <email> --panel-file <dados.json> [--files-dir <pasta_materiais>]');
  process.exit(1);
}

if (!fs.existsSync(panelFile)) {
  console.error(`❌ Arquivo não encontrado: ${panelFile}`);
  process.exit(1);
}

console.log('› Validando estrutura do JSON de calibração...');
let raw;
try {
  raw = JSON.parse(fs.readFileSync(panelFile, 'utf8'));
} catch (e) {
  console.error('❌ JSON malformado:', e.message);
  process.exit(1);
}

const contentData = raw.content_data || raw.contentData || raw;
const headerConfig = raw.header_config || raw.headerConfig;

if (!contentData.sched || !Array.isArray(contentData.sched) || contentData.sched.length === 0) {
  console.warn('⚠ Alerta: Cronograma (sched) vazio ou ausente no JSON.');
}

if (!contentData.texts || !Array.isArray(contentData.texts) || contentData.texts.length === 0) {
  console.warn('⚠ Alerta: Fichas de matérias/textos vazias ou ausentes.');
}

console.log(`  ✓ Cronograma: ${contentData.sched ? contentData.sched.length : 0} dias mapeados.`);
console.log(`  ✓ Matérias / Textos: ${contentData.texts ? contentData.texts.length : 0} módulos catalogados.`);
console.log(`  ✓ Simulados: ${contentData.sim ? contentData.sim.length : 0} questões com gabarito.`);
console.log(`  ✓ Arguição / Casos: ${contentData.arg ? contentData.arg.length : 0} perguntas modeladas.`);

const deployScript = path.join(__dirname, 'deploy-user-panel.js');
let cmd = `node "${deployScript}" --panel-file "${panelFile}"`;
if (email) cmd += ` --email "${email}"`;
if (orderId) cmd += ` --order-id "${orderId}"`;
if (filesDir && fs.existsSync(filesDir)) cmd += ` --files-dir "${filesDir}"`;

console.log('\n› Executando deploy e publicação na conta exclusiva do aluno...');
try {
  execSync(cmd, { stdio: 'inherit' });
} catch (err) {
  console.error('❌ Falha na execução do deploy:', err.message);
  process.exit(1);
}
