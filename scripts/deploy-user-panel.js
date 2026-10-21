#!/usr/bin/env node

/**
 * CRIVOS // CLI DE ENGENHARIA & DEPLOY DE PAINÉIS INDIVIDUALIZADOS
 * 
 * Uso:
 *   node scripts/deploy-user-panel.js --email aluno@dominio.com --panel-file ./dados.json
 *   node scripts/deploy-user-panel.js --order-id ORD-12345 --panel-file ./dados.json --files-dir ./materiais/
 * 
 * Opções:
 *   --email         E-mail do candidato cadastrado
 *   --order-id      ID do pedido (alternativa ao e-mail)
 *   --panel-file    Caminho para o JSON calibrado com o plano de estudos
 *   --files-dir     (Opcional) Diretório com PDFs/materiais a fazer upload
 *   --api-url       (Opcional) URL da API CRIVOS (padrão: https://crivos.me ou http://localhost:8788)
 *   --admin-key     (Opcional) ADMIN_API_KEY (padrão: lê de process.env.ADMIN_API_KEY)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tenta carregar variáveis de .env local se existir
function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}
loadEnv();

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

async function uploadFileToSupabaseStorage(supabaseUrl, serviceKey, bucket, storagePath, filePath, mimeType) {
  const fileBytes = fs.readFileSync(filePath);
  const url = `${supabaseUrl}/storage/v1/object/${bucket}/${encodeURIComponent(storagePath).replace(/%2F/g, '/')}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': mimeType || 'application/octet-stream',
      'x-upsert': 'true'
    },
    body: fileBytes
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Falha no upload para ${bucket}/${storagePath}: HTTP ${res.status} - ${errText}`);
  }

  // Gera URL pública/assinada
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${storagePath}`;
}

async function main() {
  const args = parseArgs();

  console.log('\n======================================================');
  console.log(' ■ CRIVOS // ENGENHARIA & DEPLOY DE PAINEL DO ALUNO');
  console.log('======================================================\n');

  const email = args['email'];
  const orderId = args['order-id'];
  const panelFilePath = args['panel-file'];
  const filesDir = args['files-dir'];
  const apiUrl = args['api-url'] || process.env.CRIVOS_API_URL || 'https://crivos-web.pages.dev';
  const adminKey = args['admin-key'] || process.env.ADMIN_API_KEY;
  const supabaseUrl = args['supabase-url'] || process.env.SUPABASE_URL;
  const supabaseKey = args['supabase-key'] || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!email && !orderId) {
    console.error('❌ Erro: Informe --email <email> ou --order-id <id>.');
    process.exit(1);
  }

  if (!panelFilePath) {
    console.error('❌ Erro: Informe --panel-file <caminho_para_json>.');
    process.exit(1);
  }

  if (!fs.existsSync(panelFilePath)) {
    console.error(`❌ Erro: Arquivo de painel não encontrado em ${panelFilePath}`);
    process.exit(1);
  }

  if (!adminKey) {
    console.error('❌ Erro: ADMIN_API_KEY não informada via --admin-key ou variável de ambiente.');
    process.exit(1);
  }

  console.log(`› Alvo: ${email ? `E-mail ${email}` : `Pedido ${orderId}`}`);
  console.log(`› Lendo dados do plano: ${panelFilePath}...`);

  let panelRaw;
  try {
    panelRaw = JSON.parse(fs.readFileSync(panelFilePath, 'utf8'));
  } catch (e) {
    console.error(`❌ Erro ao decodificar JSON de ${panelFilePath}: ${e.message}`);
    process.exit(1);
  }

  // Se o JSON tiver formato completo ou formato { sched, texts, ... }
  const contentData = panelRaw.content_data || panelRaw.contentData || panelRaw;
  const headerConfig = panelRaw.header_config || panelRaw.headerConfig || null;
  const enabledModules = panelRaw.enabled_modules || panelRaw.enabledModules || null;

  // Localizar usuário pelo e-mail caso necessário
  let targetUserId = null;
  if (email && supabaseUrl && supabaseKey) {
    console.log(`› Consultando perfil para ${email}...`);
    try {
      const profRes = await fetch(`${supabaseUrl}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=id,full_name`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
      });
      if (profRes.ok) {
        const profs = await profRes.json();
        if (profs && profs.length > 0) {
          targetUserId = profs[0].id;
          console.log(`  ✓ Usuário localizado: ${targetUserId} (${profs[0].full_name || 'Sem nome'})`);
        }
      }
    } catch (e) {
      console.warn(`  ⚠ Aviso ao buscar ID por e-mail: ${e.message}`);
    }
  }

  // Upload de arquivos adicionais se especificado
  const uploadedFiles = [];
  if (filesDir && fs.existsSync(filesDir)) {
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Erro: Para fazer upload de arquivos é necessário configurar SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');
      process.exit(1);
    }

    console.log(`› Processando arquivos em ${filesDir}...`);
    const files = fs.readdirSync(filesDir);
    const userIdFolder = targetUserId || 'geral';

    for (const filename of files) {
      const fullPath = path.join(filesDir, filename);
      const stat = fs.statSync(fullPath);
      if (stat.isFile()) {
        const mimeType = filename.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream';
        const storagePath = `${userIdFolder}/${filename}`;
        console.log(`  ↑ Fazendo upload de ${filename} (${Math.round(stat.size / 1024)} KB)...`);

        try {
          const publicUrl = await uploadFileToSupabaseStorage(
            supabaseUrl,
            supabaseKey,
            'user-materials',
            storagePath,
            fullPath,
            mimeType
          );

          // Inferir categoria básica
          let category = 'material';
          const lower = filename.toLowerCase();
          if (lower.includes('edital')) category = 'edital';
          else if (lower.includes('simulado') || lower.includes('prova')) category = 'simulado';
          else if (lower.includes('bibliografia') || lower.includes('texto')) category = 'bibliografia';

          uploadedFiles.push({
            filename: filename,
            title: filename.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
            storage_path: `user-materials/${storagePath}`,
            storage_url: publicUrl,
            category: category,
            file_size_bytes: stat.size
          });
          console.log(`    ✓ Upload concluído: ${publicUrl}`);
        } catch (err) {
          console.error(`    ❌ Erro ao enviar ${filename}: ${err.message}`);
        }
      }
    }
  }

  // Envia requisição para o endpoint de publicação
  const endpoint = `${apiUrl.replace(/\/+$/, '')}/api/admin/publish-panel`;
  console.log(`\n› Disparando publicação no endpoint ${endpoint}...`);

  const payload = {
    userId: orderId ? undefined : targetUserId,
    orderId: orderId,
    contentData: contentData,
    headerConfig: headerConfig,
    enabledModules: enabledModules,
    userFiles: uploadedFiles.length > 0 ? uploadedFiles : undefined
  };

  const publishRes = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminKey}`
    },
    body: JSON.stringify(payload)
  });

  const resJson = await publishRes.json();

  if (!publishRes.ok) {
    console.error(`\n❌ Falha na publicação (HTTP ${publishRes.status}):`, resJson);
    process.exit(1);
  }

  console.log('\n======================================================');
  console.log(' ✓ PAINEL PUBLICADO COM SUCESSO!');
  console.log('======================================================');
  console.log(`› Status: ${resJson.status}`);
  console.log(`› Painel ID: ${resJson.panelId}`);
  console.log(`› Notificação enviada: ${resJson.emailSent ? 'Sim (Resend E-mail #2)' : 'Não / Desativada'}`);
  console.log(`› Arquivos catalogados: ${uploadedFiles.length}`);
  console.log(`› Acesse: https://app.crivos.me\n`);
}

main().catch(err => {
  console.error('\n❌ Erro fatal durante a execução:', err);
  process.exit(1);
});
