/**
 * Catálogo Canônico Oficial CRIVOS de Concursos e Exames Abertos / Vigentes
 * Abrange: Concursos Públicos (Jurídicos, Policiais, Fiscais, Administrativos),
 * Exames de Ordem e Conselhos de Classe, Exames Nacionais e Vestibulares,
 * Provas Militares e Oficiais, Pós-Graduações (PPGs) e Provas de Colégios de Aplicação/Militares.
 * 
 * Estrutura:
 * - id: Identificador único em snake_case
 * - nome: Nome institucional canônico
 * - sigla: Sigla ou código de busca
 * - banca: Banca examinadora oficial
 * - orgao: Órgão realizador
 * - categoria: "concurso" | "militar" | "exame_ordem_classe" | "vestibular_nacional" | "pos_graduacao_ppg" | "colegio_militar"
 * - escolaridade: "Médio" | "Superior" | "Fundamental / Médio"
 * - esfera: "Federal" | "Estadual" | "Municipal" | "Nacional"
 * - status: "Inscrições Abertas"
 * - salario_max: "R$ ..." ou "Habilitação / Titulação"
 * - popular: boolean
 * - calendario: { inscricoes_fim, prova_objetiva, ultima_prova, divulgacao_locais, etapa_complementar? }
 * - cargos_detalhes: [
 *     {
 *       cargo: "Nome do Cargo",
 *       escolaridade: "...",
 *       estrutura_prova: { gerais: number, especificas: number, discursiva: "..." },
 *       disciplinas_gerais: ["..."],
 *       disciplinas_especificas: ["..."]
 *     }
 *   ]
 */

const CANONICAL_EXAMS_DATABASE = [
  // ==========================================
  // 1. CARREIRAS JURÍDICAS & TRIBUNAIS
  // ==========================================
  {
    id: "trf3_sp_ms",
    nome: "TRF-3 (SP e MS) — Tribunal Regional Federal da 3ª Região",
    sigla: "TRF-3",
    banca: "VUNESP",
    orgao: "Tribunal Regional Federal da 3ª Região",
    categoria: "concurso",
    escolaridade: "Superior",
    esfera: "Federal",
    status: "Inscrições Abertas",
    salario_max: "R$ 20.013,11",
    popular: true,
    calendario: {
      inscricoes_fim: "2026-11-23",
      prova_objetiva: "2027-01-31",
      ultima_prova: "2027-01-31",
      divulgacao_locais: "2027-01-21"
    },
    cargos_detalhes: [
      {
        cargo: "Analista Judiciário — Área Judiciária",
        escolaridade: "Superior (Direito)",
        estrutura_prova: { gerais: 24, especificas: 36, discursiva: "Estudo de caso (até 30 linhas)" },
        disciplinas_gerais: [
          "Língua Portuguesa e Raciocínio Analítico",
          "Raciocínio Lógico-Matemático",
          "Ética no Serviço Público e Integridade",
          "Noções de Direitos Humanos e Fundamentais e de Acessibilidade",
          "Informática, Inteligência Artificial e Inovação",
          "Sustentabilidade e Meio Ambiente"
        ],
        disciplinas_especificas: [
          "Direito Constitucional",
          "Direito Administrativo e Administração Pública",
          "Direito Civil",
          "Direito Processual Civil",
          "Direito Penal",
          "Direito Processual Penal",
          "Direito Previdenciário",
          "Direito Tributário",
          "Direito Ambiental"
        ]
      },
      {
        cargo: "Analista Judiciário — Oficial de Justiça Avaliador Federal",
        escolaridade: "Superior (Direito)",
        estrutura_prova: { gerais: 24, especificas: 36, discursiva: "Estudo de caso prático de cumprimento de mandados" },
        disciplinas_gerais: [
          "Língua Portuguesa e Raciocínio Analítico",
          "Raciocínio Lógico-Matemático",
          "Ética no Serviço Público e Integridade",
          "Noções de Direitos Humanos e Acessibilidade",
          "Informática e Inovação"
        ],
        disciplinas_especificas: [
          "Direito Processual Civil (Teoria e Prática de Mandados e Citações)",
          "Direito Processual Penal",
          "Direito Constitucional",
          "Direito Administrativo",
          "Direito Civil",
          "Direito Tributário e Execução Fiscal",
          "Legislação Especial e Normas da Corregedoria da JF"
        ]
      },
      {
        cargo: "Técnico Judiciário — Apoio Especializado / TI",
        escolaridade: "Superior",
        estrutura_prova: { gerais: 24, especificas: 36, discursiva: "Redação Técnica" },
        disciplinas_gerais: [
          "Língua Portuguesa",
          "Raciocínio Lógico-Matemático",
          "Noções de Direito Constitucional",
          "Noções de Direito Administrativo",
          "Ética e Acessibilidade"
        ],
        disciplinas_especificas: [
          "Engenharia de Software e Metodologias Ágeis",
          "Desenvolvimento de Sistemas e APIs",
          "Bancos de Dados Relacionais e Não-Relacionais",
          "Infraestrutura de Redes e Cloud Computing",
          "Segurança da Informação e LGPD",
          "Governança de TI (ITIL, COBIT)"
        ]
      }
    ]
  },
  {
    id: "tjsp_oficial_escrevente",
    nome: "TJSP — Tribunal de Justiça de São Paulo",
    sigla: "TJSP",
    banca: "VUNESP",
    orgao: "Tribunal de Justiça do Estado de São Paulo",
    categoria: "concurso",
    escolaridade: "Médio e Superior",
    esfera: "Estadual",
    status: "Inscrições Abertas",
    salario_max: "R$ 9.856,95",
    popular: true,
    calendario: {
      inscricoes_fim: "2026-11-25",
      prova_objetiva: "2027-01-10",
      ultima_prova: "2027-01-10",
      divulgacao_locais: "2026-12-28",
      etapa_complementar: ["Prova Prática de Digitação e Formatação", "2027-02-14"]
    },
    cargos_detalhes: [
      {
        cargo: "Escrevente Técnico Judiciário",
        escolaridade: "Médio",
        estrutura_prova: { gerais: 40, especificas: 60, discursiva: "Prova Prática eliminatória em 2ª etapa" },
        disciplinas_gerais: [
          "Língua Portuguesa (24 questões)",
          "Atualidades e Estatuto da Pessoa com Deficiência (6 questões)",
          "Matemática (6 questões)",
          "Raciocínio Lógico (10 questões)",
          "Informática (14 questões)"
        ],
        disciplinas_especificas: [
          "Direito Penal",
          "Direito Processual Penal",
          "Direito Processual Civil",
          "Direito Constitucional",
          "Direito Administrativo",
          "Normas da Corregedoria Geral da Justiça do TJSP"
        ]
      },
      {
        cargo: "Oficial de Justiça Avaliador",
        escolaridade: "Superior (Direito)",
        estrutura_prova: { gerais: 30, especificas: 70, discursiva: "Estudo de caso e peças de cumprimento de mandado" },
        disciplinas_gerais: [
          "Língua Portuguesa",
          "Atualidades e Direitos Humanos",
          "Informática e Raciocínio Lógico"
        ],
        disciplinas_especificas: [
          "Direito Processual Civil Aplicado",
          "Direito Processual Penal Aplicado",
          "Direito Constitucional",
          "Direito Administrativo",
          "Direito Civil",
          "Normas da Corregedoria do TJSP para Mandados e Diligências"
        ]
      }
    ]
  },
  {
    id: "trt4_rs",
    nome: "TRT-RS (TRT 4ª Região) — Tribunal Regional do Trabalho",
    sigla: "TRT-4",
    banca: "FCC",
    orgao: "Tribunal Regional do Trabalho da 4ª Região",
    categoria: "concurso",
    escolaridade: "Superior",
    esfera: "Federal",
    status: "Inscrições Abertas",
    salario_max: "R$ 16.035,69",
    popular: true,
    calendario: {
      inscricoes_fim: "2026-11-24",
      prova_objetiva: "2027-01-17",
      ultima_prova: "2027-01-17",
      divulgacao_locais: "2027-01-08"
    },
    cargos_detalhes: [
      {
        cargo: "Analista Judiciário — Área Judiciária",
        escolaridade: "Superior (Direito)",
        estrutura_prova: { gerais: 20, especificas: 40, discursiva: "Redação / Discursiva de 2 temas trabalhistas" },
        disciplinas_gerais: [
          "Língua Portuguesa",
          "Raciocínio Lógico-Matemático",
          "Legislação e Ética no Serviço Público",
          "Noções sobre Direitos das Pessoas com Deficiência"
        ],
        disciplinas_especificas: [
          "Direito do Trabalho",
          "Direito Processual do Trabalho",
          "Direito Constitucional",
          "Direito Administrativo",
          "Direito Civil e Processual Civil",
          "Direito Previdenciário"
        ]
      },
      {
        cargo: "Técnico Judiciário — Área Administrativa",
        escolaridade: "Superior",
        estrutura_prova: { gerais: 20, especificas: 40, discursiva: "Redação dissertativa-argumentativa" },
        disciplinas_gerais: [
          "Língua Portuguesa",
          "Raciocínio Lógico-Matemático",
          "Legislação Institucional e Acessibilidade"
        ],
        disciplinas_especificas: [
          "Noções de Direito do Trabalho",
          "Noções de Direito Processual do Trabalho",
          "Noções de Direito Constitucional",
          "Noções de Direito Administrativo",
          "Noções de Administração Pública e Gestão de Pessoas"
        ]
      }
    ]
  },
  {
    id: "trt8_pa_ap",
    nome: "TRT 8ª Região (TRT-PA/AP) — Tribunal Regional do Trabalho",
    sigla: "TRT-8",
    banca: "FCC",
    orgao: "Tribunal Regional do Trabalho da 8ª Região",
    categoria: "concurso",
    escolaridade: "Superior",
    esfera: "Federal",
    status: "Inscrições Abertas",
    salario_max: "R$ 16.035,69",
    popular: false,
    calendario: {
      inscricoes_fim: "2026-11-26",
      prova_objetiva: "2027-01-24",
      ultima_prova: "2027-01-24",
      divulgacao_locais: "2027-01-15"
    },
    cargos_detalhes: [
      {
        cargo: "Analista Judiciário — Área Judiciária",
        escolaridade: "Superior (Direito)",
        estrutura_prova: { gerais: 20, especificas: 40, discursiva: "Estudo de caso prático trabalhista" },
        disciplinas_gerais: ["Língua Portuguesa", "Raciocínio Lógico", "Ética e Sustentabilidade"],
        disciplinas_especificas: [
          "Direito do Trabalho e Precedentes Vinculantes do TST",
          "Direito Processual do Trabalho",
          "Direito Constitucional",
          "Direito Administrativo",
          "Direito Civil e Processual Civil"
        ]
      }
    ]
  },
  {
    id: "dpe_sp_defensor",
    nome: "DPE-SP — Defensoria Pública do Estado de São Paulo",
    sigla: "DPE-SP",
    banca: "FCC",
    orgao: "Defensoria Pública do Estado de SP",
    categoria: "concurso",
    escolaridade: "Superior (Direito + Prática Jurídica)",
    esfera: "Estadual",
    status: "Inscrições Abertas",
    salario_max: "R$ 32.228,00",
    popular: true,
    calendario: {
      inscricoes_fim: "2026-11-28",
      prova_objetiva: "2027-01-17",
      ultima_prova: "2027-03-21",
      divulgacao_locais: "2027-01-08",
      etapa_complementar: ["Provas Escritas Discursivas (2ª Fase)", "2027-03-21"]
    },
    cargos_detalhes: [
      {
        cargo: "Defensor Público Substituto",
        escolaridade: "Superior em Direito com 3 anos de atividade jurídica",
        estrutura_prova: { gerais: 0, especificas: 100, discursiva: "2ª Fase Discursiva + Prova Oral" },
        disciplinas_gerais: [],
        disciplinas_especificas: [
          "Direito Constitucional",
          "Direito Administrativo e Direito Tributário",
          "Direito Penal e Criminologia Crítica",
          "Direito Processual Penal",
          "Direito Civil e Direito Empresarial",
          "Direito Processual Civil",
          "Direitos Humanos e Sistema Interamericano",
          "Direito da Criança e do Adolescente (ECA)",
          "Tutela Coletiva e Meio Ambiente",
          "Princípios Institucionais e Filosofia do Direito"
        ]
      }
    ]
  },

  // ==========================================
  // 2. SEGURANÇA PÚBLICA & POLICIAIS
  // ==========================================
  {
    id: "policia_federal_agente_escrivao",
    nome: "Polícia Federal — Concurso Público Federal",
    sigla: "PF",
    banca: "CEBRASPE",
    orgao: "Departamento de Polícia Federal",
    categoria: "concurso",
    escolaridade: "Superior",
    esfera: "Federal",
    status: "Inscrições Abertas",
    salario_max: "R$ 15.164,81",
    popular: true,
    calendario: {
      inscricoes_fim: "2026-12-01",
      prova_objetiva: "2027-01-24",
      ultima_prova: "2027-01-24",
      divulgacao_locais: "2027-01-16",
      etapa_complementar: ["Teste de Aptidão Física (TAF)", "2027-02-28"]
    },
    cargos_detalhes: [
      {
        cargo: "Agente de Polícia Federal",
        escolaridade: "Superior em qualquer área + CNH B",
        estrutura_prova: { gerais: 60, especificas: 60, discursiva: "Redação dissertativa de até 30 linhas (13 pontos)" },
        disciplinas_gerais: [
          "Língua Portuguesa (Bloco I)",
          "Noções de Direito Administrativo (Bloco I)",
          "Noções de Direito Constitucional (Bloco I)",
          "Noções de Direito Penal e Processual Penal (Bloco I)",
          "Legislação Especial (Drogas, Armas, Organizações Criminosas)",
          "Estatística (Bloco I)",
          "Raciocínio Lógico (Bloco I)"
        ],
        disciplinas_especificas: [
          "Informática e Banco de Dados (Bloco II - 36 itens de TI, Python/R, Redes e Nuvem)",
          "Contabilidade Geral (Bloco III - 24 itens de Balanço, DRE e Demonstrações Contábeis)"
        ]
      },
      {
        cargo: "Escrivão de Polícia Federal",
        escolaridade: "Superior em qualquer área + CNH B",
        estrutura_prova: { gerais: 60, especificas: 60, discursiva: "Redação dissertativa + Prova de Digitação" },
        disciplinas_gerais: [
          "Língua Portuguesa",
          "Noções de Direito Administrativo e Constitucional",
          "Noções de Direito Penal e Processual Penal",
          "Legislação Especial",
          "Estatística e Raciocínio Lógico"
        ],
        disciplinas_especificas: [
          "Informática Aplicada",
          "Contabilidade Geral",
          "Arquivologia e Gestão de Documentos Oficiais"
        ]
      }
    ]
  },
  {
    id: "gcm_sao_goncalo",
    nome: "GCM São Gonçalo — Guarda Civil Municipal",
    sigla: "GCM-SG",
    banca: "Instituto Selecon",
    orgao: "Prefeitura Municipal de São Gonçalo (RJ)",
    categoria: "concurso",
    escolaridade: "Médio e Superior",
    esfera: "Municipal",
    status: "Inscrições Abertas",
    salario_max: "R$ 5.124,00",
    popular: true,
    calendario: {
      inscricoes_fim: "2026-11-20",
      prova_objetiva: "2026-12-20",
      ultima_prova: "2026-12-20",
      divulgacao_locais: "2026-12-14",
      etapa_complementar: ["Teste de Aptidão Física (TAF)", "2027-01-25"]
    },
    cargos_detalhes: [
      {
        cargo: "Guarda Municipal Nível II",
        escolaridade: "Médio completo + CNH B",
        estrutura_prova: { gerais: 40, especificas: 60, discursiva: "Sem redação (foco no TAF)" },
        disciplinas_gerais: [
          "Língua Portuguesa",
          "Raciocínio Lógico e Matemático",
          "Noções de Informática",
          "História e Geografia de São Gonçalo"
        ],
        disciplinas_especificas: [
          "Direito Constitucional (Direitos Fundamentais e Segurança)",
          "Direito Penal (Crimes contra a Administração e contra a Pessoa)",
          "Legislação de Trânsito (Código de Trânsito Brasileiro — CTB)",
          "Estatuto Geral das Guardas Municipais (Lei 13.022/2014)",
          "Estatuto da Criança e do Adolescente (ECA)",
          "Estatuto do Idoso e Maria da Penha"
        ]
      }
    ]
  },
  {
    id: "pc_pe",
    nome: "PC PE — Polícia Civil de Pernambuco",
    sigla: "PC-PE",
    banca: "CEBRASPE",
    orgao: "Secretaria de Defesa Social de Pernambuco",
    categoria: "concurso",
    escolaridade: "Superior",
    esfera: "Estadual",
    status: "Inscrições Abertas",
    salario_max: "R$ 12.890,00",
    popular: true,
    calendario: {
      inscricoes_fim: "2026-11-30",
      prova_objetiva: "2027-01-24",
      ultima_prova: "2027-01-24",
      divulgacao_locais: "2027-01-15",
      etapa_complementar: ["TAF e Prova Prática", "2027-02-28"]
    },
    cargos_detalhes: [
      {
        cargo: "Agente de Polícia Civil",
        escolaridade: "Superior completo em qualquer área",
        estrutura_prova: { gerais: 20, especificas: 40, discursiva: "Texto dissertativo de até 30 linhas" },
        disciplinas_gerais: [
          "Língua Portuguesa",
          "Noções de Informática",
          "Raciocínio Lógico"
        ],
        disciplinas_especificas: [
          "Noções de Direito Penal",
          "Noções de Direito Processual Penal",
          "Noções de Direito Constitucional",
          "Noções de Direito Administrativo",
          "Legislação Policial Especial e Legislação Estadual de PE"
        ]
      },
      {
        cargo: "Delegado de Polícia Civil",
        escolaridade: "Superior em Direito com 3 anos de prática jurídica ou policial",
        estrutura_prova: { gerais: 0, especificas: 100, discursiva: "Peça Prática de Delegado + Questões Discursivas" },
        disciplinas_gerais: [],
        disciplinas_especificas: [
          "Direito Penal e Criminologia",
          "Direito Processual Penal e Peças de Polícia Judiciária",
          "Direito Constitucional",
          "Direito Administrativo",
          "Legislação Penal Extravagante e Organizações Criminosas",
          "Direito Tributário e Ambiental",
          "Medicina Legal"
        ]
      }
    ]
  },
  {
    id: "pm_sc_soldado",
    nome: "PM SC — Polícia Militar de Santa Catarina",
    sigla: "PM-SC",
    banca: "Instituto AOCP",
    orgao: "Polícia Militar do Estado de Santa Catarina",
    categoria: "concurso",
    escolaridade: "Superior",
    esfera: "Estadual",
    status: "Inscrições Abertas",
    salario_max: "R$ 6.000,00",
    popular: true,
    calendario: {
      inscricoes_fim: "2026-11-27",
      prova_objetiva: "2027-01-17",
      ultima_prova: "2027-01-17",
      divulgacao_locais: "2027-01-09",
      etapa_complementar: ["Teste de Aptidão Física (TAF)", "2027-02-21"]
    },
    cargos_detalhes: [
      {
        cargo: "Soldado da Polícia Militar",
        escolaridade: "Superior completo em qualquer área",
        estrutura_prova: { gerais: 30, especificas: 28, discursiva: "Redação dissertativa" },
        disciplinas_gerais: [
          "Língua Portuguesa (10 questões)",
          "Raciocínio Lógico (8 questões)",
          "Informática (8 questões)"
        ],
        disciplinas_especificas: [
          "Direito Constitucional (8 questões)",
          "Direito Penal e Processual Penal (12 questões)",
          "Legislação Institucional da PMSC e Estatuto dos Militares (8 questões)"
        ]
      }
    ]
  },
  {
    id: "pm_cbm_pe",
    nome: "PM PE e CBM PE — Forças de Segurança de Pernambuco",
    sigla: "PM/CBM-PE",
    banca: "Instituto AOCP",
    orgao: "Secretaria de Defesa Social de Pernambuco",
    categoria: "concurso",
    escolaridade: "Médio e Superior",
    esfera: "Estadual",
    status: "Inscrições Abertas",
    salario_max: "R$ 5.500,00",
    popular: true,
    calendario: {
      inscricoes_fim: "2026-11-28",
      prova_objetiva: "2027-01-31",
      ultima_prova: "2027-01-31",
      divulgacao_locais: "2027-01-20",
      etapa_complementar: ["Exame de Aptidão Física (EAF)", "2027-03-07"]
    },
    cargos_detalhes: [
      {
        cargo: "Soldado PM PE",
        escolaridade: "Médio completo",
        estrutura_prova: { gerais: 30, especificas: 30, discursiva: "Redação dissertativa de até 30 linhas" },
        disciplinas_gerais: [
          "Língua Portuguesa",
          "História de Pernambuco",
          "Geografia de Pernambuco",
          "Raciocínio Lógico"
        ],
        disciplinas_especificas: [
          "Direito Constitucional",
          "Direitos Humanos e Legislação Institucional da PMPE"
        ]
      }
    ]
  },

  // ==========================================
  // 3. FISCAIS, CONTROLE E LEGISLATIVO
  // ==========================================
  {
    id: "cgu_auditor",
    nome: "CGU — Controladoria-Geral da União",
    sigla: "CGU",
    banca: "CEBRASPE",
    orgao: "Controladoria-Geral da União",
    categoria: "concurso",
    escolaridade: "Superior",
    esfera: "Federal",
    status: "Inscrições Abertas",
    salario_max: "R$ 22.921,71",
    popular: true,
    calendario: {
      inscricoes_fim: "2026-12-04",
      prova_objetiva: "2027-01-31",
      ultima_prova: "2027-01-31",
      divulgacao_locais: "2027-01-22"
    },
    cargos_detalhes: [
      {
        cargo: "Auditor Federal de Finanças e Controle — Auditoria e Fiscalização",
        escolaridade: "Superior completo em qualquer área",
        estrutura_prova: { gerais: 30, especificas: 80, discursiva: "1 dissertação técnica e 1 questão discursiva" },
        disciplinas_gerais: [
          "Língua Portuguesa",
          "Língua Inglesa",
          "Administração Pública e Políticas Públicas",
          "Direito Constitucional",
          "Direito Administrativo"
        ],
        disciplinas_especificas: [
          "Auditoria Governamental e Controle Interno",
          "Contabilidade Pública e SIAFI/SICONFI",
          "Administração Financeira e Orçamentária (AFO / LRF)",
          "Análise de Dados e Ciência de Dados para Controle",
          "Legislação Anticorrupção (Lei 12.846) e Ética Pública"
        ]
      }
    ]
  },
  {
    id: "camara_deputados",
    nome: "Câmara dos Deputados — Concurso Nacional Legislativo",
    sigla: "CD",
    banca: "CEBRASPE",
    orgao: "Câmara dos Deputados",
    categoria: "concurso",
    escolaridade: "Superior",
    esfera: "Federal",
    status: "Inscrições Abertas",
    salario_max: "R$ 34.812,00",
    popular: true,
    calendario: {
      inscricoes_fim: "2026-12-02",
      prova_objetiva: "2027-01-24",
      ultima_prova: "2027-01-24",
      divulgacao_locais: "2027-01-16"
    },
    cargos_detalhes: [
      {
        cargo: "Analista Legislativo — Consultoria Legislativa e de Orçamento",
        escolaridade: "Superior completo",
        estrutura_prova: { gerais: 60, especificas: 80, discursiva: "Elaboração de Parecer e Minuta de Proposição" },
        disciplinas_gerais: [
          "Língua Portuguesa",
          "Língua Inglesa ou Espanhola",
          "Processo Legislativo Constitucional e Regimento Interno da CD",
          "Direito Constitucional",
          "Direito Administrativo"
        ],
        disciplinas_especificas: [
          "Direito Financeiro e Orçamentário",
          "Macroeconomia e Finanças Públicas",
          "Políticas Públicas Setoriais",
          "Técnica Legislativa e Redação Parlamentar"
        ]
      },
      {
        cargo: "Analista Legislativo — Técnica Legislativa",
        escolaridade: "Superior completo em qualquer área",
        estrutura_prova: { gerais: 60, especificas: 70, discursiva: "Duas questões discursivas de processo legislativo" },
        disciplinas_gerais: ["Língua Portuguesa", "Direito Constitucional", "Direito Administrativo"],
        disciplinas_especificas: [
          "Regimento Interno da Câmara dos Deputados",
          "Regimento Comum do Congresso Nacional",
          "Processo Legislativo e Teoria Geral do Estado",
          "Ciência Política e Democracia Participativa"
        ]
      }
    ]
  },
  {
    id: "sefaz_sp_apofp",
    nome: "SEFAZ-SP — Secretaria da Fazenda e Planejamento de SP",
    sigla: "SEFAZ-SP",
    banca: "FCC",
    orgao: "Secretaria da Fazenda e Planejamento do Estado de SP",
    categoria: "concurso",
    escolaridade: "Superior",
    esfera: "Estadual",
    status: "Inscrições Abertas",
    salario_max: "R$ 28.000,00",
    popular: true,
    calendario: {
      inscricoes_fim: "2026-11-29",
      prova_objetiva: "2027-01-24",
      ultima_prova: "2027-01-24",
      divulgacao_locais: "2027-01-14"
    },
    cargos_detalhes: [
      {
        cargo: "Auditor Fiscal da Receita Estadual (AFRE)",
        escolaridade: "Superior em qualquer área",
        estrutura_prova: { gerais: 80, especificas: 100, discursiva: "Estudo de Caso Tributário e Parecer Fiscal" },
        disciplinas_gerais: [
          "Língua Portuguesa",
          "Matemática Financeira e Estatística",
          "Raciocínio Crítico e Lógico",
          "Direito Constitucional",
          "Direito Administrativo",
          "Direito Civil e Penal"
        ],
        disciplinas_especificas: [
          "Direito Tributário (Geral e Jurisprudência)",
          "Legislação Tributária do Estado de São Paulo (ICMS, IPVA, ITCMD, Taxas)",
          "Contabilidade Geral e Avançada",
          "Auditoria Fiscal Digital (EFD, SPED, NF-e)",
          "Tecnologia da Informação Aplicada à Fiscalização"
        ]
      }
    ]
  },
  {
    id: "tce_go",
    nome: "TCE-GO — Tribunal de Contas do Estado de Goiás",
    sigla: "TCE-GO",
    banca: "FCC",
    orgao: "Tribunal de Contas do Estado de Goiás",
    categoria: "concurso",
    escolaridade: "Superior",
    esfera: "Estadual",
    status: "Inscrições Abertas",
    salario_max: "R$ 15.600,00",
    popular: false,
    calendario: {
      inscricoes_fim: "2026-11-25",
      prova_objetiva: "2027-01-17",
      ultima_prova: "2027-01-17",
      divulgacao_locais: "2027-01-09"
    },
    cargos_detalhes: [
      {
        cargo: "Auditor de Controle Externo — Área Controle Externo",
        escolaridade: "Superior completo",
        estrutura_prova: { gerais: 30, especificas: 70, discursiva: "Peça Técnica de Auditoria" },
        disciplinas_gerais: ["Língua Portuguesa", "Controle Externo Constitucional", "Direito Constitucional", "Direito Administrativo"],
        disciplinas_especificas: [
          "Auditoria Governamental e Normas ISSAI",
          "Administração Financeira e Orçamentária",
          "Contabilidade Aplicada ao Setor Público (CASP)",
          "Licitações e Contratos (Nova Lei 14.133/2021)",
          "Regimento Interno e Lei Orgânica do TCE-GO"
        ]
      }
    ]
  },
  {
    id: "alepa_legislativo",
    nome: "ALEPA — Assembleia Legislativa do Pará",
    sigla: "ALEPA",
    banca: "Fundação CETAP",
    orgao: "Poder Legislativo Estadual do Pará",
    categoria: "concurso",
    escolaridade: "Médio e Superior",
    esfera: "Estadual",
    status: "Inscrições Abertas",
    salario_max: "R$ 11.200,00",
    popular: false,
    calendario: {
      inscricoes_fim: "2026-11-30",
      prova_objetiva: "2027-01-24",
      ultima_prova: "2027-01-24",
      divulgacao_locais: "2027-01-15"
    },
    cargos_detalhes: [
      {
        cargo: "Analista Legislativo — Área Redação e Processo Legislativo",
        escolaridade: "Superior",
        estrutura_prova: { gerais: 20, especificas: 40, discursiva: "Redação Dissertativa" },
        disciplinas_gerais: ["Língua Portuguesa", "História e Geografia do Pará", "Raciocínio Lógico"],
        disciplinas_especificas: [
          "Regimento Interno da ALEPA",
          "Constituição do Estado do Pará",
          "Processo Legislativo Estadual",
          "Direito Constitucional e Administrativo"
        ]
      }
    ]
  },

  // ==========================================
  // 4. EXAMES DE ORDEM & CONSELHOS DE CLASSE
  // ==========================================
  {
    id: "oab_exame_ordem",
    nome: "OAB — Exame de Ordem Unificado (CFOAB)",
    sigla: "OAB",
    banca: "FGV Conhecimento",
    orgao: "Conselho Federal da Ordem dos Advogados do Brasil",
    categoria: "exame_ordem_classe",
    escolaridade: "Superior (Bacharel em Direito ou 9º/10º semestre)",
    esfera: "Nacional",
    status: "Inscrições Abertas",
    salario_max: "Habilitação Profissional / Inscrição nos Quadros da OAB",
    popular: true,
    calendario: {
      inscricoes_fim: "2026-11-20",
      prova_objetiva: "2026-12-06",
      ultima_prova: "2027-01-24",
      divulgacao_locais: "2026-12-01",
      etapa_complementar: ["Prova Prático-Profissional (2ª Fase)", "2027-01-24"]
    },
    cargos_detalhes: [
      {
        cargo: "Advogado — Exame de Ordem (1ª Fase Geral)",
        escolaridade: "Superior em Direito",
        estrutura_prova: { gerais: 0, especificas: 80, discursiva: "1 Peça Prático-Profissional + 4 Questões Discursivas na 2ª Fase" },
        disciplinas_gerais: [],
        disciplinas_especificas: [
          "Ética Profissional e Estatuto da Advocacia (8 questões)",
          "Direito Constitucional (6 questões)",
          "Direito Administrativo (6 questões)",
          "Direito Civil (6 questões)",
          "Direito Processual Civil (6 questões)",
          "Direito Penal (6 questões)",
          "Direito Processual Penal (6 questões)",
          "Direito do Trabalho (5 questões)",
          "Direito Processual do Trabalho (5 questões)",
          "Direito Tributário (5 questões)",
          "Direito Empresarial (5 questões)",
          "Direitos Humanos (2 questões)",
          "Direito Internacional (2 questões)",
          "Direito Ambiental (2 questões)",
          "ECA (2 questões)",
          "Direito do Consumidor (2 questões)",
          "Filosofia do Direito (2 questões)",
          "Direito Financeiro (2 questões)",
          "Direito Previdenciário (2 questões)",
          "Direito Eleitoral (2 questões)"
        ]
      },
      {
        cargo: "OAB 2ª Fase — Prático-Profissional (Direito Penal)",
        escolaridade: "Aprovado na 1ª Fase OAB",
        estrutura_prova: { gerais: 0, especificas: 1, discursiva: "1 Peça Processual (5,0 pts) + 4 Questões Práticas (5,0 pts)" },
        disciplinas_gerais: [],
        disciplinas_especificas: [
          "Redação de Peças de Defesa (Resposta à Acusação, Memoriais, Apelação, RESE, Revisão Criminal)",
          "Tesee de Tipicidade, Ilicitude e Culpabilidade",
          "Dosimetria da Pena e Causas de Extinção da Punibilidade",
          "Nulidades Processuais e Prisões Cautelares",
          "Execução Penal (Progressão, Remição e Agravo em Execução)"
        ]
      },
      {
        cargo: "OAB 2ª Fase — Prático-Profissional (Direito do Trabalho)",
        escolaridade: "Aprovado na 1ª Fase OAB",
        estrutura_prova: { gerais: 0, especificas: 1, discursiva: "1 Peça Processual (Reclamatória, Contestação, RO) + 4 Questões" },
        disciplinas_gerais: [],
        disciplinas_especificas: [
          "Reclamação Trabalhista, Contestação e Exceções",
          "Recurso Ordinário (RO), Agravo de Petição e Recurso de Revista",
          "Prescrição Trabalhista, Jornada de Trabalho e Horas Extras",
          "Rescisão Contratual e Verbas Devidas",
          "Súmulas e Orientações Jurisprudenciais (OJ) do TST"
        ]
      }
    ]
  },
  {
    id: "cfc_exame_suficiencia",
    nome: "CFC — Exame de Suficiência Contábil (Conselho Federal de Contabilidade)",
    sigla: "CFC",
    banca: "FGV Conhecimento",
    orgao: "Conselho Federal de Contabilidade",
    categoria: "exame_ordem_classe",
    escolaridade: "Superior (Bacharel em Ciências Contábeis)",
    esfera: "Nacional",
    status: "Inscrições Abertas",
    salario_max: "Registro Profissional no CRC",
    popular: true,
    calendario: {
      inscricoes_fim: "2026-11-22",
      prova_objetiva: "2026-12-13",
      ultima_prova: "2026-12-13",
      divulgacao_locais: "2026-12-07"
    },
    cargos_detalhes: [
      {
        cargo: "Contador Registrado (CRC)",
        escolaridade: "Superior em Ciências Contábeis",
        estrutura_prova: { gerais: 0, especificas: 50, discursiva: "Sem discursiva (necessário acertar no mínimo 25 questões)" },
        disciplinas_gerais: [],
        disciplinas_especificas: [
          "Contabilidade Geral e NBC TG (Normas Brasileiras de Contabilidade)",
          "Contabilidade de Custos e Análise das Demonstrações Contábeis",
          "Contabilidade Aplicada ao Setor Público (NBC TSP)",
          "Contabilidade Gerencial e Controladoria",
          "Legislação e Ética Profissional do CFC",
          "Princípios de Direito Tributário, Comercial e Trabalhista",
          "Auditoria Contábil (NBC TA)",
          "Perícia Contábil (NBC TP)",
          "Matemática Financeira e Estatística Aplicada"
        ]
      }
    ]
  },
  {
    id: "revalida_medicina",
    nome: "Revalida — Exame Nacional de Revalidação de Diplomas Médicos",
    sigla: "REVALIDA",
    banca: "INEP / Cebraspe",
    orgao: "Instituto Nacional de Estudos e Pesquisas Educacionais Anísio Teixeira",
    categoria: "exame_ordem_classe",
    escolaridade: "Superior (Graduação em Medicina no Exterior)",
    esfera: "Nacional",
    status: "Inscrições Abertas",
    salario_max: "Registro no Conselho Regional de Medicina (CRM)",
    popular: true,
    calendario: {
      inscricoes_fim: "2026-11-25",
      prova_objetiva: "2026-12-20",
      ultima_prova: "2027-02-15",
      divulgacao_locais: "2026-12-10",
      etapa_complementar: ["Prova de Habilidades Clínicas (Estações Práticas)", "2027-02-15"]
    },
    cargos_detalhes: [
      {
        cargo: "Médico Revalidado (CRM)",
        escolaridade: "Diploma Médico Exterior",
        estrutura_prova: { gerais: 0, especificas: 100, discursiva: "5 questões discursivas (P1) + 10 Estações Práticas (P2)" },
        disciplinas_gerais: [],
        disciplinas_especificas: [
          "Clínica Médica e Terapêutica",
          "Cirurgia Geral e Urgências Cirúrgicas",
          "Pediatria e Neonatologia",
          "Ginecologia e Obstetrícia",
          "Medicina de Família e Comunidade (MFC) e Saúde Coletiva / SUS",
          "Ética Médica e Relação Médico-Paciente"
        ]
      }
    ]
  },

  // ==========================================
  // 5. PROVAS MILITARES & CARREIRAS DE OFICIAIS
  // ==========================================
  {
    id: "espcex_exercito",
    nome: "EsPCEx — Escola Preparatória de Cadetes do Exército",
    sigla: "EsPCEx",
    banca: "Comando do Exército / DECEx",
    orgao: "Exército Brasileiro",
    categoria: "militar",
    escolaridade: "Médio",
    esfera: "Federal / Militar",
    status: "Inscrições Abertas",
    salario_max: "R$ 8.245,00 (Após Formação na AMAN como Aspirante a Oficial)",
    popular: true,
    calendario: {
      inscricoes_fim: "2026-11-30",
      prova_objetiva: "2027-01-24",
      ultima_prova: "2027-01-25",
      divulgacao_locais: "2027-01-10",
      etapa_complementar: ["Exame de Aptidão Física (EAF) e Inspeção de Saúde", "2027-03-10"]
    },
    cargos_detalhes: [
      {
        cargo: "Cadete do Exército (Oficial Combatente da AMAN)",
        escolaridade: "Médio completo (17 a 22 anos)",
        estrutura_prova: { gerais: 44, especificas: 56, discursiva: "Redação dissertativa-argumentativa obrigatória" },
        disciplinas_gerais: [
          "Língua Portuguesa (20 questões)",
          "História do Brasil e Geral (12 questões)",
          "Geografia do Brasil e Geral (12 questões)",
          "Língua Inglesa (12 questões)"
        ],
        disciplinas_especificas: [
          "Matemática (20 questões)",
          "Física (12 questões)",
          "Química (12 questões)"
        ]
      }
    ]
  },
  {
    id: "afa_aeronautica",
    nome: "AFA — Academia da Força Aérea (Oficiais Aviadores, Intendentes e de Infantaria)",
    sigla: "AFA",
    banca: "Comando da Aeronáutica / DIRENS",
    orgao: "Força Aérea Brasileira",
    categoria: "militar",
    escolaridade: "Médio",
    esfera: "Federal / Militar",
    status: "Inscrições Abertas",
    salario_max: "R$ 8.500,00 (Aspirante a Oficial da FAB)",
    popular: true,
    calendario: {
      inscricoes_fim: "2026-12-05",
      prova_objetiva: "2027-01-17",
      ultima_prova: "2027-01-17",
      divulgacao_locais: "2027-01-05",
      etapa_complementar: ["Teste de Avaliação do Condicionamento Físico (TACF)", "2027-02-25"]
    },
    cargos_detalhes: [
      {
        cargo: "Oficial da Aeronáutica (Aviador / Intendente / Infantaria)",
        escolaridade: "Médio completo (17 a 23 anos)",
        estrutura_prova: { gerais: 32, especificas: 32, discursiva: "Redação dissertativa (100 pontos)" },
        disciplinas_gerais: ["Língua Portuguesa (16 questões)", "Língua Inglesa (16 questões)"],
        disciplinas_especificas: ["Matemática (16 questões)", "Física (16 questões)"]
      }
    ]
  },
  {
    id: "marinha_oficiais_smv",
    nome: "Marinha do Brasil — Oficiais Temporários (SMV / RM2)",
    sigla: "SMV-Marinha",
    banca: "Comando da Marinha (Distritos Navais)",
    orgao: "Ministério da Defesa / Marinha do Brasil",
    categoria: "militar",
    escolaridade: "Superior",
    esfera: "Federal / Militar",
    status: "Inscrições Abertas",
    salario_max: "R$ 11.535,00",
    popular: false,
    calendario: {
      inscricoes_fim: "2026-12-03",
      prova_objetiva: "2027-01-31",
      ultima_prova: "2027-01-31",
      divulgacao_locais: "2027-01-20",
      etapa_complementar: ["Prova de Títulos e Teste de Aptidão Física", "2027-03-01"]
    },
    cargos_detalhes: [
      {
        cargo: "Oficial RM2 — Apoio à Saúde, Engenharia, Humanas e Direito",
        escolaridade: "Superior na área pretendida",
        estrutura_prova: { gerais: 25, especificas: 25, discursiva: "Sem discursiva (classificação por títulos)" },
        disciplinas_gerais: ["Língua Portuguesa (25 questões)"],
        disciplinas_especificas: [
          "Formação Militar-Naval e Legislação Marítima",
          "História Naval Brasileira e Tradições da Marinha",
          "Estatuto dos Militares (Lei 6.880/1980)",
          "Direito Internacional Marítimo e Poder Marítimo"
        ]
      }
    ]
  },
  {
    id: "colegio_naval_epcar",
    nome: "Colégio Naval e EPCAR — Ensino Médio Militar das Forças Armadas",
    sigla: "CN/EPCAR",
    banca: "Comando da Marinha / Aeronáutica",
    orgao: "Marinha do Brasil e Força Aérea Brasileira",
    categoria: "militar",
    escolaridade: "Fundamental",
    esfera: "Federal / Militar",
    status: "Inscrições Abertas",
    salario_max: "Bolsa-auxílio aluno militar com moradia e alimentação integral",
    popular: true,
    calendario: {
      inscricoes_fim: "2026-11-28",
      prova_objetiva: "2027-01-10",
      ultima_prova: "2027-01-11",
      divulgacao_locais: "2026-12-29"
    },
    cargos_detalhes: [
      {
        cargo: "Aluno do Colégio Naval / Aluno da EPCAR",
        escolaridade: "Ensino Fundamental Completo (15 a 18 anos incompletos)",
        estrutura_prova: { gerais: 40, especificas: 30, discursiva: "Redação em Língua Portuguesa" },
        disciplinas_gerais: ["Matemática (nível avançado)", "Língua Portuguesa", "Língua Inglesa"],
        disciplinas_especificas: ["Estudos Sociais (História e Geografia)", "Ciências (Física, Química e Biologia elementares)"]
      }
    ]
  },

  // ==========================================
  // 6. EXAMES NACIONAIS & GRANDES VESTIBULARES
  // ==========================================
  {
    id: "enem_exame_nacional",
    nome: "ENEM — Exame Nacional do Ensino Médio",
    sigla: "ENEM",
    banca: "INEP / Cebraspe",
    orgao: "Ministério da Educação / INEP",
    categoria: "vestibular_nacional",
    escolaridade: "Médio",
    esfera: "Nacional",
    status: "Inscrições Abertas",
    salario_max: "Acesso ao SiSU, ProUni, FIES e Universidades Internacionais",
    popular: true,
    calendario: {
      inscricoes_fim: "2026-11-20",
      prova_objetiva: "2026-11-29",
      ultima_prova: "2026-12-06",
      divulgacao_locais: "2026-11-16"
    },
    cargos_detalhes: [
      {
        cargo: "Candidato Universitário / SiSU Geral (Medicina, Direito, Engenharias)",
        escolaridade: "Ensino Médio",
        estrutura_prova: { gerais: 90, especificas: 90, discursiva: "Redação Dissertativa-Argumentativa (Nota 1000)" },
        disciplinas_gerais: [
          "Linguagens, Códigos e suas Tecnologias (45 questões)",
          "Ciências Humanas e suas Tecnologias (45 questões — História, Geografia, Filosofia, Sociologia)",
          "Redação Modelo ENEM (5 Competências Oficiais)"
        ],
        disciplinas_especificas: [
          "Matemática e suas Tecnologias (45 questões)",
          "Ciências da Natureza e suas Tecnologias (45 questões — Física, Química, Biologia)"
        ]
      }
    ]
  },
  {
    id: "fuvest_usp",
    nome: "FUVEST — Vestibular da Universidade de São Paulo (USP)",
    sigla: "FUVEST",
    banca: "Fundação FUVEST",
    orgao: "Universidade de São Paulo",
    categoria: "vestibular_nacional",
    escolaridade: "Médio",
    esfera: "Estadual (SP)",
    status: "Inscrições Abertas",
    salario_max: "Ingresso nos Cursos de Graduação da USP",
    popular: true,
    calendario: {
      inscricoes_fim: "2026-11-23",
      prova_objetiva: "2026-12-06",
      ultima_prova: "2027-01-17",
      divulgacao_locais: "2026-11-28",
      etapa_complementar: ["2ª Fase FUVEST (Discursiva Geral + Específicas)", "2027-01-17"]
    },
    cargos_detalhes: [
      {
        cargo: "Vestibulando USP — Carreira Medicina / Alta Concorrência",
        escolaridade: "Ensino Médio",
        estrutura_prova: { gerais: 90, especificas: 24, discursiva: "Redação FUVEST + 10 questões de Português e Obras Literárias" },
        disciplinas_gerais: [
          "Língua Portuguesa e Literatura Brasileira (Obras Obrigatórias)",
          "História Geral e do Brasil",
          "Geografia",
          "Inglês",
          "Interdisciplinares"
        ],
        disciplinas_especificas: [
          "Biologia (2ª Fase)",
          "Física (2ª Fase)",
          "Química (2ª Fase)",
          "Matemática"
        ]
      }
    ]
  },

  // ==========================================
  // 7. PÓS-GRADUAÇÃO / PPGS & EXAMES NACIONAIS ACADÊMICOS
  // ==========================================
  {
    id: "anpec_economia",
    nome: "Exame Nacional ANPEC — Mestrado e Doutorado em Economia",
    sigla: "ANPEC",
    banca: "Comissão ANPEC",
    orgao: "Associação Nacional dos Centros de Pós-Graduação em Economia",
    categoria: "pos_graduacao_ppg",
    escolaridade: "Superior",
    esfera: "Nacional",
    status: "Inscrições Abertas",
    salario_max: "Bolsa de Mestrado/Doutorado CAPES/CNPq (R$ 2.100 a R$ 3.100/mês)",
    popular: false,
    calendario: {
      inscricoes_fim: "2026-11-25",
      prova_objetiva: "2026-12-16",
      ultima_prova: "2026-12-17",
      divulgacao_locais: "2026-12-05"
    },
    cargos_detalhes: [
      {
        cargo: "Candidato ao Mestrado Acadêmico em Teoria Econômica",
        escolaridade: "Superior em qualquer área",
        estrutura_prova: { gerais: 15, especificas: 60, discursiva: "Sem discursiva (provas com questões do tipo V/F e numéricas)" },
        disciplinas_gerais: ["Língua Inglesa (15 questões)"],
        disciplinas_especificas: [
          "Microeconomia (Teoria do Consumidor, da Firma, Equilíbrio Geral e Teoria dos Jogos)",
          "Macroeconomia (Modelos Clássicos, Keynesianos, IS-LM, Curva de Phillips e Crescimento Solow)",
          "Estatística e Econometria (Regressão Múltipla, Séries Temporais, Testes de Hipótese)",
          "Matemática (Cálculo Multivariado, Álgebra Linear e Otimização Estática/Dinâmica)"
        ]
      }
    ]
  },
  {
    id: "poscomp_computacao",
    nome: "POSCOMP — Exame Nacional de Pós-Graduação em Computação",
    sigla: "POSCOMP",
    banca: "SBC (Sociedade Brasileira de Computação)",
    orgao: "Sociedade Brasileira de Computação / Fundatec",
    categoria: "pos_graduacao_ppg",
    escolaridade: "Superior",
    esfera: "Nacional",
    status: "Inscrições Abertas",
    salario_max: "Classificação em Programas de Pós-Graduação (PPG-CC) com Bolsas",
    popular: false,
    calendario: {
      inscricoes_fim: "2026-11-26",
      prova_objetiva: "2026-12-13",
      ultima_prova: "2026-12-13",
      divulgacao_locais: "2026-12-05"
    },
    cargos_detalhes: [
      {
        cargo: "Candidato ao Mestrado em Ciência da Computação / Informática",
        escolaridade: "Superior na área de Exatas ou Tecnologia",
        estrutura_prova: { gerais: 20, especificas: 50, discursiva: "Sem discursiva" },
        disciplinas_gerais: [
          "Matemática Discreta e Teoria dos Grafos (10 questões)",
          "Cálculo Diferencial e Integral, Álgebra Linear e Probabilidade (10 questões)"
        ],
        disciplinas_especificas: [
          "Algoritmos, Complexidade e Estruturas de Dados (20 questões)",
          "Linguagens de Programação e Compiladores",
          "Sistemas Operacionais, Redes e Arquitetura de Computadores",
          "Engenharia de Software e Banco de Dados",
          "Inteligência Artificial e Teoria da Computação"
        ]
      }
    ]
  },

  // ==========================================
  // 8. COLÉGIOS MILITARES & COLÉGIOS DE APLICAÇÃO
  // ==========================================
  {
    id: "sistema_colegio_militar",
    nome: "Colégios Militares do Brasil (SCMB) — 6º Ano e 1º Ano do Ensino Médio",
    sigla: "SCMB",
    banca: "Diretoria de Educação Preparatória e Assistencial (DEPA)",
    orgao: "Exército Brasileiro",
    categoria: "colegio_militar",
    escolaridade: "Fundamental / Médio",
    esfera: "Federal",
    status: "Inscrições Abertas",
    salario_max: "Ensino Básico e Médio de Excelência Gratuito",
    popular: true,
    calendario: {
      inscricoes_fim: "2026-11-22",
      prova_objetiva: "2026-12-06",
      ultima_prova: "2026-12-06",
      divulgacao_locais: "2026-11-30"
    },
    cargos_detalhes: [
      {
        cargo: "Aluno 6º Ano do Ensino Fundamental",
        escolaridade: "Estar cursando o 5º ano do EF (menor de 13 anos)",
        estrutura_prova: { gerais: 12, especificas: 12, discursiva: "Produção Textual / Redação" },
        disciplinas_gerais: ["Língua Portuguesa (12 questões de interpretação e gramática básica)"],
        disciplinas_especificas: ["Matemática (12 questões de raciocínio, frações, geometria básica e medidas)"]
      },
      {
        cargo: "Aluno 1º Ano do Ensino Médio",
        escolaridade: "Estar cursando o 9º ano do EF (menor de 16 anos)",
        estrutura_prova: { gerais: 14, especificas: 14, discursiva: "Redação dissertativa" },
        disciplinas_gerais: ["Língua Portuguesa (14 questões)"],
        disciplinas_especificas: ["Matemática (14 questões com álgebra, geometria plana e funções)"]
      }
    ]
  },
  {
    id: "colegio_pedro_segundo",
    nome: "Colégio Pedro II (RJ) — Ingresso Discente Ensino Fundamental e Médio",
    sigla: "CPII",
    banca: "Comissão Própria de Concursos do Colégio Pedro II",
    orgao: "Colégio Pedro II (Autarquia Federal / MEC)",
    categoria: "colegio_militar",
    escolaridade: "Fundamental / Médio",
    esfera: "Federal",
    status: "Inscrições Abertas",
    salario_max: "Ensino Básico Federal Tradicional Gratuito",
    popular: false,
    calendario: {
      inscricoes_fim: "2026-11-27",
      prova_objetiva: "2027-01-10",
      ultima_prova: "2027-01-10",
      divulgacao_locais: "2026-12-28"
    },
    cargos_detalhes: [
      {
        cargo: "Aluno 1º Ano do Ensino Médio Regular / Técnico Integrado",
        escolaridade: "Conclusão do Ensino Fundamental",
        estrutura_prova: { gerais: 10, especificas: 10, discursiva: "Redação em Língua Portuguesa" },
        disciplinas_gerais: ["Língua Portuguesa e Literatura"],
        disciplinas_especificas: ["Matemática e Raciocínio Lógico"]
      }
    ]
  },
  {
    id: "ifsp_docente_tae",
    nome: "IFSP — Instituto Federal de São Paulo",
    sigla: "IFSP",
    banca: "Comissão Própria / IFSP",
    orgao: "Instituto Federal de Educação, Ciência e Tecnologia de SP",
    categoria: "concurso",
    escolaridade: "Médio e Superior",
    esfera: "Federal",
    status: "Inscrições Abertas",
    salario_max: "R$ 10.481,00",
    popular: false,
    calendario: {
      inscricoes_fim: "2026-11-30",
      prova_objetiva: "2027-01-17",
      ultima_prova: "2027-01-17",
      divulgacao_locais: "2027-01-08"
    },
    cargos_detalhes: [
      {
        cargo: "Assistente em Administração (TAE)",
        escolaridade: "Médio",
        estrutura_prova: { gerais: 20, especificas: 30, discursiva: "Sem discursiva" },
        disciplinas_gerais: ["Língua Portuguesa", "Informática", "Legislação e Ética no Serviço Público"],
        disciplinas_especificas: [
          "Noções de Administração Geral e Pública",
          "Arquivologia e Gestão de Documentos",
          "Redação Oficial",
          "Licitações e Contratos Administrativos (Lei 14.133/21)",
          "Lei 8.112/1990 (Regime Jurídico Único)"
        ]
      }
    ]
  },
  {
    id: "camara_cuiaba",
    nome: "Câmara Municipal de Cuiabá (MT)",
    sigla: "CMC",
    banca: "SELECON",
    orgao: "Poder Legislativo Municipal de Cuiabá",
    categoria: "concurso",
    escolaridade: "Médio e Superior",
    esfera: "Municipal",
    status: "Inscrições Abertas",
    salario_max: "R$ 10.980,00",
    popular: false,
    calendario: {
      inscricoes_fim: "2026-11-26",
      prova_objetiva: "2027-01-24",
      ultima_prova: "2027-01-24",
      divulgacao_locais: "2027-01-15"
    },
    cargos_detalhes: [
      {
        cargo: "Analista Legislativo — Especialidade Jurídica",
        escolaridade: "Superior em Direito",
        estrutura_prova: { gerais: 20, especificas: 40, discursiva: "Parecer Jurídico Legislativo" },
        disciplinas_gerais: ["Língua Portuguesa", "Raciocínio Lógico", "Noções de Informática"],
        disciplinas_especificas: [
          "Direito Constitucional",
          "Direito Administrativo",
          "Lei Orgânica do Município de Cuiabá",
          "Regimento Interno da Câmara de Cuiabá",
          "Processo Legislativo Municipal"
        ]
      }
    ]
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CANONICAL_EXAMS_DATABASE };
}
