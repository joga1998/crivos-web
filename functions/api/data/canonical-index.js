// Catálogo Canônico Oficial CRIVOS de Concursos e Exames Abertos / Vigentes
// Sincronizado automaticamente a partir de crivos-web/data/canonical-exams.js
// Exportação nativa em JavaScript puro para compatibilidade estrita com Cloudflare Pages Functions (V8 runtime)

import canonicalData from './canonical-exams.json';

export const CANONICAL_EXAMS = Array.isArray(canonicalData) ? canonicalData : [];

/**
 * Normaliza strings removendo diacríticos, pontuações e excesso de espaços
 * Lida com plurais comuns (colegios -> colegio, militares -> militar)
 */
export function normalizeStr(str = '') {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Gera raiz léxica simples de uma palavra para matching flexível (ex: colegios -> colegio, federais -> federal)
 */
function stemWord(w) {
  if (w.endsWith('es') && w.length > 4) return w.slice(0, -2);
  if (w.endsWith('s') && w.length > 3) return w.slice(0, -1);
  return w;
}

/**
 * Localiza o certame ou exame correspondente no catálogo canônico CRIVOS
 */
export function findCanonicalExam(concursoQuery = '') {
  const q = normalizeStr(concursoQuery);
  if (!q) return null;

  const qWords = q.split(' ').filter(Boolean);
  const qStems = qWords.map(stemWord);

  // 1. Busca prioritária por ID ou Sigla exata
  for (const item of CANONICAL_EXAMS) {
    const normSigla = normalizeStr(item.sigla);
    const normId = normalizeStr(item.id);

    if (normSigla && (q === normSigla || qWords.includes(normSigla))) {
      return item;
    }
    if (normId && (q.includes(normId) || normId.includes(q))) {
      return item;
    }
  }

  // 2. Pontuação de relevância baseada em raízes de palavras
  let bestMatch = null;
  let highestScore = 0;

  for (const item of CANONICAL_EXAMS) {
    const normNome = normalizeStr(item.nome);
    const normSigla = normalizeStr(item.sigla);
    const itemWords = normNome.split(' ').filter(w => w.length >= 3 && !['dos', 'das', 'para', 'com', 'tribunal', 'concurso', 'exame'].includes(w));
    const itemStems = itemWords.map(stemWord);

    let score = 0;
    if (normSigla && q.includes(normSigla)) score += 15;

    // Substring direta do nome ou da query
    if (normNome.includes(q) || q.includes(normNome)) {
      score += 25;
    }

    for (let i = 0; i < qWords.length; i++) {
      const qw = qWords[i];
      const qs = qStems[i];
      if (itemWords.includes(qw)) {
        score += 8;
      } else if (itemStems.includes(qs)) {
        score += 6;
      }
    }

    if (score > highestScore && score >= 8) {
      highestScore = score;
      bestMatch = item;
    }
  }

  return bestMatch;
}

/**
 * Localiza os detalhes específicos do cargo dentro do certame canônico
 */
export function findCanonicalCargoDetails(examItem, cargoQuery = '') {
  if (!examItem || !Array.isArray(examItem.cargos_detalhes) || examItem.cargos_detalhes.length === 0) {
    return null;
  }

  const q = normalizeStr(cargoQuery);
  if (!q) return examItem.cargos_detalhes[0];

  const qWords = q.split(' ').filter(Boolean);
  const qStems = qWords.map(stemWord);

  let bestCargo = null;
  let maxCargoScore = 0;

  for (const cd of examItem.cargos_detalhes) {
    const normCargo = normalizeStr(cd.cargo);
    if (normCargo === q || normCargo.includes(q) || q.includes(normCargo)) {
      return cd;
    }

    let score = 0;
    const cdWords = normCargo.split(' ').filter(w => w.length >= 3);
    const cdStems = cdWords.map(stemWord);

    for (let i = 0; i < qWords.length; i++) {
      const qw = qWords[i];
      const qs = qStems[i];
      if (cdWords.includes(qw)) score += 5;
      else if (cdStems.includes(qs)) score += 4;
    }

    if (score > maxCargoScore) {
      maxCargoScore = score;
      bestCargo = cd;
    }
  }

  return bestCargo || examItem.cargos_detalhes[0];
}

/**
 * Constrói o bloco de texto sintetizado com os dados canônicos para alimentar a calibração
 */
export function buildCanonicalContextText(examItem, cargoDetails) {
  if (!examItem) return '';

  const cal = examItem.calendario || {};
  const cd = cargoDetails || (examItem.cargos_detalhes?.[0]) || {};

  const lines = [
    `=== DADOS OFICIAIS CANÔNICOS DO CERTAME (FONTE: CATÁLOGO CRIVOS AUDITADO) ===`,
    `- Certame/Exame: ${examItem.nome} (${examItem.sigla || examItem.id})`,
    `- Categoria: ${examItem.categoria}`,
    `- Banca Examinadora Oficial: ${examItem.banca}`,
    `- Órgão / Entidade: ${examItem.orgao}`,
    `- Cargo / Especialidade: ${cd.cargo || 'Geral'}`,
    `- Escolaridade: ${cd.escolaridade || examItem.escolaridade || 'Superior'}`,
    `- Término das Inscrições: ${cal.inscricoes_fim || 'Definido em edital'}`,
    `- Data da Prova Objetiva: ${cal.prova_objetiva || 'Definido em edital'}`,
    `- Data da Última Prova do Edital: ${cal.ultima_prova || cal.prova_objetiva || 'Definido em edital'}`,
    `- Divulgação dos Locais de Prova: ${cal.divulgacao_locais || '7 dias antes'}`
  ];

  if (Array.isArray(cal.etapa_complementar)) {
    lines.push(`- Etapa Complementar: ${cal.etapa_complementar[0]} em ${cal.etapa_complementar[1]}`);
  }

  if (cd.estrutura_prova) {
    lines.push(`- Estrutura da Prova: ${cd.estrutura_prova.gerais || 0} questões gerais, ${cd.estrutura_prova.especificas || 0} específicas.`);
    if (cd.estrutura_prova.discursiva) {
      lines.push(`- Prova Discursiva / Redação: ${cd.estrutura_prova.discursiva}`);
    }
  }

  if (Array.isArray(cd.disciplinas_gerais) && cd.disciplinas_gerais.length > 0) {
    lines.push(`\nDISCIPLINAS DE CONHECIMENTOS GERAIS:\n${cd.disciplinas_gerais.map(d => `• ${d}`).join('\n')}`);
  }

  if (Array.isArray(cd.disciplinas_especificas) && cd.disciplinas_especificas.length > 0) {
    lines.push(`\nDISCIPLINAS DE CONHECIMENTOS ESPECÍFICOS:\n${cd.disciplinas_especificas.map(d => `• ${d}`).join('\n')}`);
  }

  lines.push(`================================================================================`);
  return lines.join('\n');
}
