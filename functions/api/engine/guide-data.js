// Gerador oficial das 12 seções do Guia e das 50 Pegadinhas do D-7
export function buildClassicPegadinhas50(banca = 'Banca Examinadora', concurso = '', cargo = '', dynamicTexts = []) {
  const b = (banca || 'Banca').toUpperCase();
  const c = concurso || 'Certame';

  const base50 = [
    // DIREITO CONSTITUCIONAL (01 a 10)
    {
      num: '01',
      mat: 'Direito Constitucional',
      topico: 'Remédios Constitucionais · Mandado de Segurança Coletivo',
      armadilha: `A banca ${b} afirma que associação precisa de autorização expressa individual de cada associado para impetrar Mandado de Segurança Coletivo.`,
      blindagem: 'FALSO. A associação atua em substituição processual (Art. 5º, LXX, "b", CF/88) e independe de autorização individual expressa (Súmula 629/STF). A exigência de autorização expressa (Art. 5º, XXI) aplica-se apenas a ações ordinárias.'
    },
    {
      num: '02',
      mat: 'Direito Constitucional',
      topico: 'Direitos Fundamentais · Extradição',
      armadilha: `O examinador troca os prazos e hipóteses, afirmando que o brasileiro naturalizado pode ser extraditado por qualquer crime comum cometido após a naturalização.`,
      blindagem: 'REGRA BINÁRIA (Art. 5º, LI, CF/88): Brasileiro nato NUNCA é extraditado. Brasileiro naturalizado só é extraditado em 2 casos: (1) crime comum praticado ANTES da naturalização; ou (2) comprovado envolvimento em tráfico ilícito de entorpecentes a QUALQUER TEMPO (antes ou depois).'
    },
    {
      num: '03',
      mat: 'Direito Constitucional',
      topico: 'Competência Legislativa · Art. 22 vs Art. 24 da CF/88',
      armadilha: `A banca coloca Direito Tributário, Financeiro ou Penitenciário como competência privativa da União para invalidar lei estadual.`,
      blindagem: 'MNEMÔNICO CRIVOS: Competência CONCORRENTE (Art. 24) = "PUTTE F" (Penitenciário, Urbanístico, Tributário, Tributário, Econômico e Financeiro). Competência PRIVATIVA da União (Art. 22) = "CAPACETE de PIMENTA" (Civil, Agrário, Penal, Aeronáutico, Comercial, Eleitoral, Trabalho, Espacial, Processual, etc.).'
    },
    {
      num: '04',
      mat: 'Direito Constitucional',
      topico: 'Processo Legislativo · Medidas Provisórias',
      armadilha: `A banca afirma ser válida MP sobre normas de Direito Processual Civil ou Penal aprovada pelo Congresso.`,
      blindagem: 'VEDAÇÃO ABSOLUTA (Art. 62, § 1º, I, "b", CF/88): É expressamente vedada edição de MP sobre matéria de Direito Penal, Processual Penal e Processual Civil, além de nacionalidade, cidadania, direitos políticos e partidos políticos.'
    },
    {
      num: '05',
      mat: 'Direito Constitucional',
      topico: 'Súmulas Vinculantes · Nepotismo (SV 13)',
      armadilha: `A banca afirma que a Súmula Vinculante 13 do STF veda a nomeação de parentes até 3º grau para cargos de natureza política (Secretários de Estado e Ministros).`,
      blindagem: 'EXCEÇÃO CONSOLIDADA DO STF: A SV 13 veda nepotismo para cargos em comissão e funções de confiança administrativos, mas NÃO se aplica de plano a cargos estritamente políticos (Ministro de Estado, Secretário Estadual/Municipal), salvo em caso de patente ausência de qualificação técnica ou fraude à lei.'
    },
    {
      num: '06',
      mat: 'Direito Constitucional',
      topico: 'Direitos Políticos · Inelegibilidade Reflexa',
      armadilha: `A banca afirma que a separação judicial ou divórcio no curso do mandato afasta a inelegibilidade reflexa do cônjuge para o pleito subsequente no mesmo território.`,
      blindagem: 'SÚMULA VINCULANTE 18 DO STF: "A dissolução da sociedade ou do vínculo conjugal, no curso do mandato, não afasta a inelegibilidade reflexa prevista no § 7º do art. 14 da CF/88".'
    },
    {
      num: '07',
      mat: 'Direito Constitucional',
      topico: 'Controle de Constitucionalidade · Modulação de Efeitos',
      armadilha: `A banca afirma que o STF pode modular os efeitos temporais da declaração de inconstitucionalidade por maioria simples de seus membros.`,
      blindagem: 'QUÓRUM QUALIFICADO (Art. 27 da Lei 9.868/99): A modulação temporal de efeitos (ex nunc ou pro futuro) no controle concentrado exige expressamente quórum de DOIS TERÇOS (8 ministros) e razões de segurança jurídica ou excepcional interesse social.'
    },
    {
      num: '08',
      mat: 'Direito Constitucional',
      topico: 'Segurança Pública · Rol do Art. 144 da CF/88',
      armadilha: `A banca inclui Guardas Municipais ou Forças Armadas no rol taxativo dos órgãos de Segurança Pública do caput do Art. 144.`,
      blindagem: 'ROL TAXATIVO DO CAPUT: Polícia Federal, Polícia Rodoviária Federal, Polícia Ferroviária Federal, Polícias Civis, Polícias Militares e Corpos de Bombeiros Militares, e Polícias Penais. Guardas Municipais constam no § 8º (proteção de bens, serviços e instalações municipais), e Forças Armadas no Art. 142.'
    },
    {
      num: '09',
      mat: 'Direito Constitucional',
      topico: 'Separação de Poderes · Inviolabilidade Parlamentar',
      armadilha: `A banca aduz que a imunidade material do parlamentar por palavras, opiniões e votos cobre declarações concedidas fora da casa legislativa sem nexo com o mandato.`,
      blindagem: 'JURISPRUDÊNCIA DO STF: A imunidade material (Art. 53, caput) é absoluta no recinto do Parlamento. Porém, fora do Parlamento, EXIGE nexo de causalidade direto e funcional entre as declarações proferidas e o exercício do mandato legislativo.'
    },
    {
      num: '10',
      mat: 'Direito Constitucional',
      topico: 'Ação Popular · Legitimidade Ativa',
      armadilha: `A banca afirma que pessoa jurídica ou partido político tem legitimidade ativa para ajuizar Ação Popular.`,
      blindagem: 'SÚMULA 365 DO STF: "Pessoa jurídica não tem legitimidade para propor ação popular". A legitimidade ativa da Ação Popular (Art. 5º, LXXIII da CF) é restrita e privativa ao CIDADÃO (indivíduo brasileiro em pleno gozo dos direitos políticos comprovado pelo título de eleitor).'
    },

    // DIREITO ADMINISTRATIVO (11 a 20)
    {
      num: '11',
      mat: 'Direito Administrativo',
      topico: 'Poder de Polícia · Delegabilidade a Particulares',
      armadilha: `A banca afirma que todas as fases do poder de polícia podem ser livremente delegadas a empresas privadas sob regime de concessão.`,
      blindagem: 'CICLOS DO PODER DE POLÍCIA (STF Tema 532): A ordem (legislação) e a coerção física indelegáveis. Apenas os atos materiais de fiscalização e consentimento podem ser delegados a pessoas jurídicas de direito privado integrantes da Administração Pública Indireta com capital majoritariamente público e sem concorrência de mercado.'
    },
    {
      num: '12',
      mat: 'Direito Administrativo',
      topico: 'Atos Administrativos · Requisitos vs Atributos',
      armadilha: `A banca mistura os requisitos de validade (competência, finalidade, forma, motivo, objeto) com os atributos do ato (presunção de legitimidade, imperatividade, autoexecutoriedade, tipicidade).`,
      blindagem: 'TABELA MENTAL: Requisitos = "COM-FI-FOR-MO-BO" (condições de existência/validade presentes em TODOS os atos). Atributos = "P-A-T-I" (características jurídicas especiais, sendo que imperatividade e autoexecutoriedade NÃO estão presentes em todos os atos, como os negociais e enunciativos).'
    },
    {
      num: '13',
      mat: 'Direito Administrativo',
      topico: 'Desfazimento de Atos · Anulação vs Revogação',
      armadilha: `A banca inverte efeitos e competências, afirmando que o Poder Judiciário pode revogar atos discricionários da Administração com base na conveniência.`,
      blindagem: 'BLINDAGEM SÚMULA 473/STF: Anulação opera efeito EX TUNC (retroativo) por motivo de ILEGALIDADE e pode ser feita pela Administração ou pelo Judiciário. Revogação opera efeito EX NUNC (prospectivo) por motivo de CONVENIÊNCIA e OPORTUNIDADE e é PRIVATIVA da Administração (Judiciário JAMAIS revoga ato do Executivo).'
    },
    {
      num: '14',
      mat: 'Direito Administrativo',
      topico: 'Responsabilidade Civil do Estado · Art. 37 § 6º da CF/88',
      armadilha: `A banca aduz que em caso de dano causado por concessionária de serviço público a terceiro não usuário, a responsabilidade do Estado e da concessionária passa a ser subjetiva.`,
      blindagem: 'TEMA 130/STF: A responsabilidade civil das pessoas jurídicas de direito privado prestadoras de serviços públicos é OBJETIVA em relação a terceiros, sejam eles usuários ou não usuários do serviço prestado.'
    },
    {
      num: '15',
      mat: 'Direito Administrativo',
      topico: 'Nova Lei de Improbidade (Lei 14.230/21) · Culpa vs Dolo',
      armadilha: `O examinador apresenta questão desatualizada aduzindo que a conduta negligente ou imprudente que cause prejuízo ao erário constitui ato de improbidade culposo.`,
      blindagem: 'EXPURGO DA CULPA (Art. 1º, §§ 1º e 2º): Não existe mais nenhuma modalidade de improbidade culposa no direito brasileiro. Exige-se DOLO ESPECÍFICO (vontade livre e consciente de alcançar o resultado ilícito tipificado nos artigos 9º, 10 e 11), não bastando a voluntariedade do agente.'
    },
    {
      num: '16',
      mat: 'Direito Administrativo',
      topico: 'Nova Lei de Licitações (Lei 14.133/21) · Modalidades',
      armadilha: `A banca inclui Tomada de Preços ou Convite em questão que pede as modalidades vigentes da Nova Lei de Licitações.`,
      blindagem: 'EXTINÇÃO DEFINITIVA: Convite e Tomada de Preços foram banidos. As 5 modalidades vigentes na Lei 14.133/21 são: Pregão, Concorrência, Concurso, Leilão e Diálogo Competitivo. O credenciamento é procedimento auxiliar, não modalidade.'
    },
    {
      num: '17',
      mat: 'Direito Administrativo',
      topico: 'Contratos Administrativos · Alteração Unilateral',
      armadilha: `A banca afirma que a Administração pode alterar unilateralmente as cláusulas econômico-financeiras do contrato sem concordância do contratado.`,
      blindagem: 'INTOCABILIDADE DO EQUILÍBRIO ECONÔMICO: A Administração só pode alterar unilateralmente cláusulas REGULAMENTARES (projeto, especificações, quantitativos até 25% ou 50% em reformas). As cláusulas econômico-financeiras e monetárias dependem OBRIGATORIAMENTE de acordo entre as partes.'
    },
    {
      num: '18',
      mat: 'Direito Administrativo',
      topico: 'Servidores Públicos · Estabilidade',
      armadilha: `A banca afirma que o servidor adquire estabilidade automaticamente após 3 anos de exercício ou aprovação prévia em concurso público.`,
      blindagem: 'REQUISITO CONSTITUCIONAL CUMULATIVO (Art. 41, § 4º da CF/88): São necessários (1) 3 anos de efetivo exercício E (2) aprovação obrigatória em avaliação especial de desempenho por comissão instituída para essa finalidade. A estabilidade não é automática.'
    },
    {
      num: '19',
      mat: 'Direito Administrativo',
      topico: 'Processo Administrativo Federal (Lei 9.784/99) · Reformatio in Pejus',
      armadilha: `A banca afirma ser vedado o agravamento da penalidade ao administrado que recorre administrativamente com base no princípio que veda a reformatio in pejus.`,
      blindagem: 'ADMISSIBILIDADE COM DEVER DE OITIVA (Art. 64, Parágrafo Único da Lei 9.784/99): O recurso administrativo admite sim o agravamento da sanção (reformatio in pejus), desde que o recorrente seja previamente cientificado para que formule suas alegações antes da decisão.'
    },
    {
      num: '20',
      mat: 'Direito Administrativo',
      topico: 'Bens Públicos · Desafetação e Usucapião',
      armadilha: `A banca afirma que bens públicos dominicais sem uso por mais de 10 anos podem ser adquiridos por usucapião ordinária.`,
      blindagem: 'IMPRESCRITIBILIDADE ABSOLUTA (Art. 183 § 3º e Art. 191 Parágrafo Único da CF/88 + Súmula 340/STF): NENHUM bem público, seja ele de uso comum, especial ou dominical, pode ser adquirido por usucapião, qualquer que seja o tempo de posse.'
    },

    // CONHECIMENTOS ESPECÍFICOS & DISCIPLINAS DO EDITAL (21 a 35)
    {
      num: '21',
      mat: 'Conhecimentos Específicos',
      topico: 'Processo Legislativo e Regimento · Quórum Constitucional',
      armadilha: `A banca confunde maioria simples (relativa) com maioria absoluta na aprovação de emendas constitucionais e leis complementares.`,
      blindagem: 'REGRAS DE QUÓRUM: Maioria Simples = maioria dos presentes na sessão (com quórum mínimo de presença da maioria absoluta). Lei Complementar = maioria absoluta dos membros da casa (Art. 69). Emenda Constitucional = 3/5 dos membros em 2 turnos de votação em cada casa legislativa (Art. 60, § 2º).'
    },
    {
      num: '22',
      mat: 'Conhecimentos Específicos',
      topico: 'Administração Financeira e Orçamentária (AFO) · Princípios Orçamentários',
      armadilha: `A banca aduz que o Princípio da Exclusividade orçamentária impede a previsão de receitas e a autorização para abertura de créditos suplementares na LOA.`,
      blindagem: 'EXCEÇÕES EXPRESSAS (Art. 165 § 8º da CF/88): A LOA não conterá matéria estranha à previsão da receita e à fixação da despesa (Exclusividade), SALVO: (1) autorização para abertura de créditos suplementares e (2) contratação de operações de crédito, ainda que por antecipação de receita (ARO).'
    },
    {
      num: '23',
      mat: 'Conhecimentos Específicos',
      topico: 'Direito Penal · Crime Impossível',
      armadilha: `A banca afirma que a presença de vigilância eletrônica ou monitoramento ostensivo em estabelecimento comercial torna o crime de furto impossível por ineficácia absoluta do meio.`,
      blindagem: 'SÚMULA 567 DO STJ: "A simples existência de sistema de segurança ou de vigilância eletrônica não torna impossível o crime de furto cometida no interior de estabelecimento comercial". Há apenas ineficácia relativa, punindo-se a tentativa.'
    },
    {
      num: '24',
      mat: 'Conhecimentos Específicos',
      topico: 'Direito Penal · Desistência Voluntária vs Arrependimento Eficaz',
      armadilha: `A banca inverte os conceitos da "ponte de ouro", afirmando que o agente que esgota os atos executórios e impede o resultado praticou desistência voluntária.`,
      blindagem: 'DISTINÇÃO DEFINITIVA (Art. 15 do CP): Desistência voluntária ocorre quando o agente AINDA NÃO ESGOTOU os atos executórios ("posso prosseguir, mas não quero"). Arrependimento eficaz ocorre quando o agente JÁ ESGOTOU os atos executórios, mas atua positivamente e impede o resultado consumativo. Em ambos, responde apenas pelos atos já praticados.'
    },
    {
      num: '25',
      mat: 'Conhecimentos Específicos',
      topico: 'Direito Processual Penal · Inquérito Policial',
      armadilha: `A banca afirma que o Ministério Público ou o Juiz pode determinar o arquivamento do inquérito policial a pedido da autoridade policial (delegado).`,
      blindagem: 'VEDAÇÃO DO ART. 17 DO CPP: "A autoridade policial não poderá mandar arquivar autos de inquérito policial". O delegado preside e indicia, mas a titularidade da propositura ou promoção do arquivamento pertence exclusivamente ao titular da ação penal (Ministério Público).'
    },
    {
      num: '26',
      mat: 'Conhecimentos Específicos',
      topico: 'Processo Penal · Provas Ilícitas e Frutos da Árvore Envenenada',
      armadilha: `A banca afirma que a teoria dos frutos da árvore envenenada contamina mesmo as provas obtidas por fonte independente da prova ilícita.`,
      blindagem: 'EXCEÇÃO DA FONTE INDEPENDENTE (Art. 157, § 1º e 2º do CPP): As provas derivadas das ilícitas são nulas, SALVO quando puderem ser obtidas por uma fonte independente (que por si só seria capaz de conduzir aos mesmos elementos fáticos) ou quando o nexo causal for atenuado.'
    },
    {
      num: '27',
      mat: 'Conhecimentos Específicos',
      topico: 'AFO · Créditos Adicionais e Vigência',
      armadilha: `A banca afirma que todos os créditos adicionais têm vigência restrita e improrrogável ao exercício financeiro em que foram abertos.`,
      blindagem: 'EXCEÇÃO DO ART. 167 § 2º DA CF/88: Os créditos especiais e extraordinários abertos nos últimos 4 meses do exercício financeiro (setembro a dezembro) podem ser reabertos nos limites dos seus saldos no exercício subsequente, vigorando até o fim deste.'
    },
    {
      num: '28',
      mat: 'Conhecimentos Específicos',
      topico: 'Direito Tributário · Princípio da Anterioridade e Exceções',
      armadilha: `A banca afirma que a instituição ou majoração do IPTU ou ITCMD deve respeitar simultaneamente a anterioridade de exercício e a noventena.`,
      blindagem: 'REGRA DA MATRIZ: O IPTU (fixação de base de cálculo) respeita apenas a anterioridade anual, dispensada a noventena. O ITCMD e o IR respeitam a anterioridade anual. Já impostos regulatórios (II, IE, IOF) não respeitam nem anterioridade anual nem noventena.'
    },
    {
      num: '29',
      mat: 'Conhecimentos Específicos',
      topico: 'Gestão Pública · Governança vs Gestão',
      armadilha: `A banca afirma que a governança pública é responsável pela execução direta de operações e alocação tática de recursos cotidianos.`,
      blindagem: 'DIVISÃO OFICIAL (TCU e IBGC): Governança = DIRECIONA, MONITORA e AVALIA as estratégias organizacionais (nível estratégico/decisório). Gestão = PLANEJA, EXECUTA, CONTROLA e ENTREGA os produtos e serviços (nível tático/operacional).'
    },
    {
      num: '30',
      mat: 'Conhecimentos Específicos',
      topico: 'Direito Previdenciário / Regime Jurídico · Servidor Efetivo vs Comissionado',
      armadilha: `A banca afirma que o titular exclusivamente de cargo em comissão declarado em lei de livre nomeação e exoneração vincula-se ao Regime Próprio de Previdência (RPPS).`,
      blindagem: 'VINCULAÇÃO AO RGPS (Art. 40 § 13 da CF/88): Aplica-se ao agente público ocupante, exclusivamente, de cargo em comissão declarado em lei de livre nomeação e exoneração de outro cargo temporário ou de emprego público o Regime Geral de Previdência Social (INSS).'
    },
    {
      num: '31',
      mat: 'Conhecimentos Específicos',
      topico: 'Lei de Acesso à Informação (Lei 12.527/11) · Classificação de Sigilo',
      armadilha: `A banca troca os prazos máximos de restrição de acesso por classificação de sigilo das informações ultrassecretas, secretas e reservadas.`,
      blindagem: 'ESCALA TEMPORAL DA LAI (Art. 24 § 1º): Ultrassecreta = máximo de 25 anos. Secreta = máximo de 15 anos. Reservada = máximo de 5 anos. Informações pessoais relativas à intimidade, honra e imagem têm restrição de acesso por até 100 anos.'
    },
    {
      num: '32',
      mat: 'Conhecimentos Específicos',
      topico: 'Contabilidade Pública · Regime Contábil Aplicado ao Setor Público',
      armadilha: `A banca afirma que as despesas públicas no Brasil são registradas pelo regime de caixa sob a ótica patrimonial.`,
      blindagem: 'REGIME MISTO (Lei 4.320/64 vs MCASP): Na ótica orçamentária: Receita = Caixa / Despesa = Competência. Na ótica PATRIMONIAL (NBC TSP): Tanto as variações patrimoniais aumentativas (VPA) quanto as diminutivas (VPD) são reconhecidas estritamente pelo REGIME DE COMPETÊNCIA.'
    },
    {
      num: '33',
      mat: 'Conhecimentos Específicos',
      topico: 'Ética Pública · Decreto 1.171/94 · Comissão de Ética',
      armadilha: `A banca afirma que a Comissão de Ética Pública pode aplicar a penalidade de suspensão ou demissão ao servidor infrator.`,
      blindagem: 'PENALIDADE ÚNICA DA COMISSÃO DE ÉTICA: A Comissão de Ética pode aplicar EXCLUSIVAMENTE a pena de CENSURA ÉTICA (acompanhada de sugestão de exoneração para cargos em comissão). Demissão, suspensão e advertência são sanções disciplinares aplicáveis por processo administrativo disciplinar (PAD).'
    },
    {
      num: '34',
      mat: 'Conhecimentos Específicos',
      topico: 'Direito Civil · Prescrição vs Decadência',
      armadilha: `A banca afirma que os prazos de prescrição podem ser livremente alterados por acordo de vontades entre as partes privadas.`,
      blindagem: 'VEDAÇÃO DO ART. 192 DO CC: "Os prazos de prescrição não podem ser alterados por acordo das partes". Além disso, a prescrição atinge a pretensão executória, enquanto a decadência extingue o próprio direito potestativo.'
    },
    {
      num: '35',
      mat: 'Conhecimentos Específicos',
      topico: 'Processo Civil · Tutela de Urgência vs Evidência',
      armadilha: `A banca afirma que a concessão de tutela de evidência exige demonstração de perigo de dano ou risco ao resultado útil do processo (periculum in mora).`,
      blindagem: 'REGRA DO ART. 311 DO CPC: A tutela da evidência será concedida INDEPENDENTEMENTE da demonstração de perigo de dano ou de risco ao resultado útil do processo (periculum in mora), bastando a comprovação documental do direito acompanhada de precedente vinculante ou abuso do direito de defesa.'
    },

    // LEGISLAÇÃO INSTITUCIONAL & ESTATUTO (36 a 42)
    {
      num: '36',
      mat: 'Legislação Institucional',
      topico: 'Regime Disciplinar · Prazos Prescricionais das Sanções',
      armadilha: `A banca afirma que a pretensão punitiva de demissão prescreve no mesmo prazo de 180 dias fixado para advertência.`,
      blindagem: 'ESCALA DA LEI 8.112/90 (Art. 142): Demissão, cassação de aposentadoria e destituição de cargo em comissão = 5 ANOS. Suspensão = 2 ANOS. Advertência = 180 DIAS. O prazo começa a correr da data em que o fato se tornou CONHECIDO pela autoridade competente.'
    },
    {
      num: '37',
      mat: 'Legislação Institucional',
      topico: 'Regimento Interno · Comissões Parlamentares de Inquérito (CPI)',
      armadilha: `A banca afirma que a CPI tem poder para decretar prisão preventiva, interceptação telefônica e indisponibilidade de bens do investigado.`,
      blindagem: 'RESERVA DE JURISDIÇÃO (STF): CPI tem poderes de instrução próprios das autoridades judiciais, podendo determinar quebra de sigilo fiscal, bancário e telefônico. NÃO PODE decretar: interceptação telefônica (escuta), prisão preventiva ou temporária (salvo flagrante delito) e busca e apreensão domiciliar.'
    },
    {
      num: '38',
      mat: 'Legislação Institucional',
      topico: 'Direito do Trabalho / Servidores · Licença Capacitação vs Sabática',
      armadilha: `A banca aduz que o período de licença capacitação não computa para fins de aposentadoria e disponibilidade.`,
      blindagem: 'ART. 87 DA LEI 8.112/90: Após cada quinquênio de efetivo exercício, o servidor poderá afastar-se por até 3 meses para participar de curso de capacitação profissional COM REMUNERAÇÃO INTEGRAL, contando o tempo para todos os efeitos legais.'
    },
    {
      num: '39',
      mat: 'Legislação Institucional',
      topico: 'Lei de Introdução às Normas do Direito Brasileiro (LINDB) · Art. 28',
      armadilha: `A banca afirma que o agente público responderá pessoalmente por suas decisões ou opiniões técnicas em caso de culpa simples comprovada.`,
      blindagem: 'BLINDAGEM DO ART. 28 DA LINDB (Lei 13.655/18): O agente público responderá pessoalmente por suas decisões ou opiniões técnicas EXCLUSIVAMENTE em caso de DOLO ou ERRO GROSSEIRO (elevado grau de negligência, imprudência ou imperícia manifesta).'
    },
    {
      num: '40',
      mat: 'Legislação Institucional',
      topico: 'Lei Anticorrupção (Lei 12.846/13) · Acordo de Leniência',
      armadilha: `A banca afirma que o acordo de leniência exime a pessoa jurídica da obrigação de reparar integralmente o dano causado à administração.`,
      blindagem: 'DEVER INDERROGÁVEL DE REPARAÇÃO (Art. 16 § 3º): A celebração do acordo de leniência não exime a pessoa jurídica da reparação integral do dano causado, servindo apenas para atenuar sanções e isentar de publicação extraordinária da condenação.'
    },
    {
      num: '41',
      mat: 'Legislação Institucional',
      topico: 'Estatuto dos Servidores · Acumulação de Cargos Públicos',
      armadilha: `A banca afirma que dois cargos privativos de profissionais de saúde podem ser acumulados com jornada semanal somada superior a 60 horas sem autorização expressa.`,
      blindagem: 'TEMA 1081/STF: A acumulação remunerada de cargos permitida pela CF (dois de professor, um de professor com técnico/científico, ou dois de saúde) subordina-se unicamente à COMPATIBILIDADE DE HORÁRIOS, não havendo limitação prévia a 60h semanais desde que comprovada a viabilidade física e qualidade do trabalho.'
    },
    {
      num: '42',
      mat: 'Legislação Institucional',
      topico: 'Normas de Direito Administrativo Sancionador · Retroatividade da Lei Benéfica',
      armadilha: `A banca afirma que as alterações benéficas da Lei 14.230/21 retroagem para desconstituir decisões condenatórias por improbidade já transitadas em julgado.`,
      blindagem: 'TEMA 1199/STF: O novo regime da Lei 14.230/21 (que exige dolo) aplica-se aos atos de improbidade culposos praticados antes da sua vigência, DESDE QUE NÃO HAJA condenação com trânsito em julgado (coisa julgada intocável).'
    },

    // LÍNGUA PORTUGUESA & INTERPRETAÇÃO DA BANCA (43 a 50)
    {
      num: '43',
      mat: 'Língua Portuguesa',
      topico: 'Crase · Diante de Pronomes de Tratamento e Indefinidos',
      armadilha: `A banca insere crase antes de "Vossa Excelência", "alguém", "cada" ou substantivo masculino afirmando ser facultativa.`,
      blindagem: 'REGRA DE OURO DA CRASE: Proibida diante de pronomes de tratamento (salvo Senhora, Senhorita e Dona), proibida diante de pronomes indefinidos ("a todos", "a cada"), proibida diante de verbos e palavras masculinas. Casos facultativos: até a, nome próprio feminino e pronome possessivo feminino singular.'
    },
    {
      num: '44',
      mat: 'Língua Portuguesa',
      topico: 'Concordância Verbal · Voz Passiva Sintética com Partícula "SE"',
      armadilha: `A banca emprega "Aluga-se apartamentos" ou "Precisa-se de analistas" e afirma que em ambas o termo seguinte é sujeito paciente plural.`,
      blindagem: 'DIFERENCIAÇÃO MORFOSSINTÁTICA: VTD + SE = Partícula Apassivadora $\\rightarrow$ o verbo concorda com o sujeito ("Alugam-se apartamentos"). VTI / VI / VL + SE = Índice de Indeterminação do Sujeito $\\rightarrow$ o verbo fica OBRIGATORIAMENTE no singular ("Precisa-se de analistas").'
    },
    {
      num: '45',
      mat: 'Língua Portuguesa',
      topico: 'Regência e Pronomes · Objeto Direto vs Indireto',
      armadilha: `A banca emprega o pronome "lhe" como complemento de verbos transitivos diretos (ex: "o edital visa-lhe", "o chefe informou-lhe").`,
      blindagem: 'REGÊNCIA CIRÚRGICA: "O/A/OS/AS" completam verbos transitivos diretos (VTD). "LHE/LHES" completam verbos transitivos indiretos (VTI) que regem a preposição "a". O verbo "visar" no sentido de almejar é VTI ("visar ao cargo"), mas não aceita "lhe" no padrão culto (usa-se "visar a ele").'
    },
    {
      num: '46',
      mat: 'Língua Portuguesa',
      topico: 'Conectivos Coordenativos e Subordinativos · Sentido e Troca',
      armadilha: `A banca afirma que o conectivo "conquanto" ou "não obstante" pode ser substituído por "portanto" sem alteração de sentido do texto.`,
      blindagem: 'TABELA DE SENTIDO DOS CONECTIVOS: "Conquanto", "embora", "não obstante", "posto que", "ainda que" introduzem ORAÇÃO SUBORDINADA CONCESSIVA (ideia de quebra de expectativa). "Portanto", "logo", "destarte" introduzem CONCLUSÃO. A troca altera radicalmente a relação lógico-discursiva.'
    },
    {
      num: '47',
      mat: 'Língua Portuguesa',
      topico: 'Pontuação Proibida · Sujeito e Predicado',
      armadilha: `O examinador intercala uma oração longa entre o sujeito e o verbo e coloca apenas uma vírgula separando o sujeito do verbo principal.`,
      blindagem: 'VEDAÇÃO INTRANSIGENTE: NUNCA se separa por vírgula simples o sujeito do seu verbo, nem o verbo de seus complementos diretos. Se houver oração subordinada intercalada, ela deve estar entre DUAS vírgulas ou travessões; caso contrário, é erro crasso de pontuação.'
    },
    {
      num: '48',
      mat: 'Língua Portuguesa',
      topico: 'Concordância com Expressões Partitivas ("a maioria de", "a maior parte de")',
      armadilha: `A banca afirma que "A maioria dos candidatos foram aprovados" é erro gramatical por falta de concordância com o núcleo no singular.`,
      blindagem: 'DUPLA CONCORDÂNCIA ACEITA: Com expressões partitivas seguidas de substantivo no plural, admite-se tanto a concordância lógica no singular (com o núcleo: "A maioria... foi") quanto a concordância atrativa no plural (com o adjunto: "A maioria dos candidatos... foram"). Ambas são gramaticalmente corretas.'
    },
    {
      num: '49',
      mat: 'Língua Portuguesa',
      topico: 'Pronomes Demonstrativos · "Este" vs "Esse" no Texto',
      armadilha: `A banca inverte as funções anafóricas e catafóricas de "este" e "esse" na coesão textual.`,
      blindagem: 'FUNÇÃO TEXTUAL: "ESSE / ISSO" tem função ANAFÓRICA (recupera elemento já mencionado no texto anterior). "ESTE / ISTO" tem função CATAFÓRICA (anuncia o que ainda vai ser dito) ou refere-se ao elemento mais próximo entre dois citados.'
    },
    {
      num: '50',
      mat: 'Língua Portuguesa',
      topico: 'Interpretação da Banca · Extrapolação vs Inferência Lógica',
      armadilha: `A banca insere palavras totalizadoras e absolutas ("sempre", "nunca", "exclusivamente", "todos", "em nenhuma hipótese") em itens de interpretação de texto dissertativo.`,
      blindagem: 'FILTRO ANTI-EXTRAPOLAÇÃO CRIVOS: Quando o enunciado pedir "Depreende-se do texto" ou "Infere-se que", desconfie imediatamente de alternativas com generalizações absolutas. Se o autor do texto não foi categórico, o item com "sempre" ou "nunca" é incorreto por extrapolação semântica.'
    }
  ];

  return base50;
}
