/**
 * Ordem Paranormal RPG — Sistema para Foundry VTT v12
 * -----------------------------------------------------
 * Ponto de entrada (entry point) do sistema.
 * Responsável por:
 *   - Definir a configuração global do sistema (ORDEM)
 *   - Implementar o motor de dados (rolagem d20 "melhor de N")
 *   - Registrar a classe de Ator customizada (dados derivados)
 *   - Registrar as fichas (sheets) de Ator e Item
 *   - Registrar helpers de Handlebars e pré-carregar templates
 *
 * Mecânica central: o jogador rola (valor do Atributo)d20 e ESCOLHE O MAIOR
 * resultado, somando o bônus de perícia. Compara-se à CD definida pelo Mestre.
 */

import { OrdemAgentSheet }    from "./sheets/AgentSheet.js";
import { OrdemCriaturaSheet } from "./sheets/CriaturaSheet.js";
import { OrdemItemSheet }     from "./sheets/ItemSheet.js";
import { CONDICOES, resolverImplicadas, modificadoresAchatados } from "./condicoes.js";
import { MODOS, SAH_CONFIG, modoDoAtor, usaXP, permiteReterRitual, usaCompreensaoHumana } from "./regras.js";

/* -------------------------------------------------------------------------- */
/*  CONFIGURAÇÃO GLOBAL DO SISTEMA (ORDEM)                                     */
/* -------------------------------------------------------------------------- */

/**
 * Objeto de configuração compartilhado por todo o sistema.
 * Centraliza atributos, perícias, classes, elementos e CDs padrão.
 */
export const ORDEM = {};

// Os cinco atributos do Agente (o valor numérico é o bônus direto).
ORDEM.atributos = {
  agi: "ORDEM.Atributo.agi",
  for: "ORDEM.Atributo.for",
  int: "ORDEM.Atributo.int",
  pre: "ORDEM.Atributo.pre",
  vig: "ORDEM.Atributo.vig"
};

// Abreviações exibidas na ficha.
ORDEM.atributosAbrev = {
  agi: "ORDEM.AtributoAbrev.agi",
  for: "ORDEM.AtributoAbrev.for",
  int: "ORDEM.AtributoAbrev.int",
  pre: "ORDEM.AtributoAbrev.pre",
  vig: "ORDEM.AtributoAbrev.vig"
};

/**
 * As 28 perícias oficiais (conforme a Ficha de Agente).
 *  - atributo: atributo padrão associado
 *  - soTreinada: perícias marcadas com "*" só podem ser usadas se treinadas
 */
ORDEM.pericias = {
  acrobacia:     { atributo: "agi", soTreinada: false, carga: true },
  adestramento:  { atributo: "pre", soTreinada: true  },
  artes:         { atributo: "pre", soTreinada: true  },
  atletismo:     { atributo: "for", soTreinada: false, carga: true },
  atualidades:   { atributo: "int", soTreinada: false },
  ciencias:      { atributo: "int", soTreinada: true  },
  crime:         { atributo: "agi", soTreinada: true,  carga: true },
  diplomacia:    { atributo: "pre", soTreinada: false },
  enganacao:     { atributo: "pre", soTreinada: false },
  fortitude:     { atributo: "vig", soTreinada: false },
  furtividade:   { atributo: "agi", soTreinada: false, carga: true },
  iniciativa:    { atributo: "agi", soTreinada: false },
  intimidacao:   { atributo: "pre", soTreinada: false },
  intuicao:      { atributo: "pre", soTreinada: false },
  investigacao:  { atributo: "int", soTreinada: false },
  luta:          { atributo: "for", soTreinada: false },
  medicina:      { atributo: "int", soTreinada: false },
  ocultismo:     { atributo: "int", soTreinada: true  },
  percepcao:     { atributo: "pre", soTreinada: false },
  pilotagem:     { atributo: "agi", soTreinada: true  },
  pontaria:      { atributo: "agi", soTreinada: false },
  profissao:     { atributo: "int", soTreinada: true  },
  reflexos:      { atributo: "agi", soTreinada: false },
  religiao:      { atributo: "pre", soTreinada: true  },
  sobrevivencia: { atributo: "int", soTreinada: false },
  tatica:        { atributo: "int", soTreinada: true  },
  tecnologia:    { atributo: "int", soTreinada: true  },
  vontade:       { atributo: "pre", soTreinada: false }
};

// As três classes jogáveis.
ORDEM.classes = {
  combatente:   "ORDEM.Classe.combatente",
  especialista: "ORDEM.Classe.especialista",
  ocultista:    "ORDEM.Classe.ocultista"
};

// Elementos paranormais (usados em rituais).
ORDEM.elementos = {
  conhecimento: "ORDEM.Elemento.conhecimento",
  energia:      "ORDEM.Elemento.energia",
  morte:        "ORDEM.Elemento.morte",
  sangue:       "ORDEM.Elemento.sangue",
  medo:         "ORDEM.Elemento.medo"
};

/**
 * Ciclo de OPRESSÃO entre elementos (Capítulo "O Outro Lado"):
 * rituais do elemento opressor têm VANTAGEM contra criaturas do oprimido.
 * Morte > Sangue > Conhecimento > Energia > Morte. Medo está acima do ciclo.
 */
ORDEM.opressao = {
  morte:        "sangue",
  sangue:       "conhecimento",
  conhecimento: "energia",
  energia:      "morte"
};

// Catálogo oficial de condições (Apêndice do Livro de Regras).
ORDEM.condicoes = CONDICOES;

// Tipos de cena de jogo.
ORDEM.tiposCena = {
  acao:          "ORDEM.Cena.acao",
  investigacao:  "ORDEM.Cena.investigacao",
  interludio:    "ORDEM.Cena.interludio",
  perseguicao:   "ORDEM.Cena.perseguicao",
  furtividade:   "ORDEM.Cena.furtividade"
};

// Dificuldades (CD) padrão sugeridas ao Mestre.
ORDEM.dificuldades = {
  10: "ORDEM.CD.facil",
  15: "ORDEM.CD.moderado",
  18: "ORDEM.CD.dificil",
  20: "ORDEM.CD.paranormal"
};

// Bônus por grau de treinamento de perícia (Livro de Regras, pág. 26).
ORDEM.bonusTreinamento = {
  destreinado: 0,
  treinado: 5,
  veterano: 10,
  expert: 15
};

/**
 * Características de cada classe — usadas no cálculo de PV/PE/SAN e na
 * progressão de NEX (Tabelas 1.3, 1.4 e 1.5 do Livro de Regras).
 *  - inicial:  valor base em NEX 5%
 *  - porNivel: ganho a cada novo nível de exposição (+5% de NEX)
 *  - atributo: atributo somado (no inicial e a cada nível); null = nenhum
 *  - progressao: { NEX: "habilidade ganha" }
 */
ORDEM.classesInfo = {
  combatente: {
    pv:  { inicial: 20, porNivel: 4, atributo: "vig" },
    pe:  { inicial: 2,  porNivel: 2, atributo: "pre" },
    san: { inicial: 12, porNivel: 3, atributo: null },
    progressao: {
      5:  "Ataque especial (2 PE, +5)",
      10: "Habilidade de trilha",
      15: "Poder de combatente",
      20: "Aumento de atributo",
      25: "Ataque especial (3 PE, +10)",
      30: "Poder de combatente",
      35: "Grau de treinamento",
      40: "Habilidade de trilha",
      45: "Poder de combatente",
      50: "Aumento de atributo, versatilidade",
      55: "Ataque especial (4 PE, +15)",
      60: "Poder de combatente",
      65: "Habilidade de trilha",
      70: "Grau de treinamento",
      75: "Poder de combatente",
      80: "Aumento de atributo",
      85: "Ataque especial (5 PE, +20)",
      90: "Poder de combatente",
      95: "Aumento de atributo",
      99: "Habilidade de trilha"
    }
  },
  especialista: {
    pv:  { inicial: 16, porNivel: 3, atributo: "vig" },
    pe:  { inicial: 3,  porNivel: 3, atributo: "pre" },
    san: { inicial: 16, porNivel: 4, atributo: null },
    progressao: {
      5:  "Eclético, perito (2 PE, +1d6)",
      10: "Habilidade de trilha",
      15: "Poder de especialista",
      20: "Aumento de atributo",
      25: "Perito (3 PE, +1d8)",
      30: "Poder de especialista",
      35: "Grau de treinamento",
      40: "Engenhosidade (veterano), habilidade de trilha",
      45: "Poder de especialista",
      50: "Aumento de atributo, versatilidade",
      55: "Perito (4 PE, +1d10)",
      60: "Poder de especialista",
      65: "Habilidade de trilha",
      70: "Grau de treinamento",
      75: "Engenhosidade (expert), poder de especialista",
      80: "Aumento de atributo",
      85: "Perito (5 PE, +1d12)",
      90: "Poder de especialista",
      95: "Aumento de atributo",
      99: "Habilidade de trilha"
    }
  },
  ocultista: {
    pv:  { inicial: 12, porNivel: 2, atributo: "vig" },
    pe:  { inicial: 4,  porNivel: 4, atributo: "pre" },
    san: { inicial: 20, porNivel: 5, atributo: null },
    progressao: {
      5:  "Escolhido pelo Outro Lado (1º círculo)",
      10: "Habilidade de trilha",
      15: "Poder de ocultista",
      20: "Aumento de atributo",
      25: "Escolhido pelo Outro Lado (2º círculo)",
      30: "Poder de ocultista",
      35: "Grau de treinamento",
      40: "Habilidade de trilha",
      45: "Poder de ocultista",
      50: "Aumento de atributo, versatilidade",
      55: "Escolhido pelo Outro Lado (3º círculo)",
      60: "Poder de ocultista",
      65: "Habilidade de trilha",
      70: "Grau de treinamento",
      75: "Poder de ocultista",
      80: "Aumento de atributo",
      85: "Escolhido pelo Outro Lado (4º círculo)",
      90: "Poder de ocultista",
      95: "Aumento de atributo",
      99: "Habilidade de trilha"
    }
  }
};

/**
 * Tier do poder Perito (Especialista) conforme o NEX — dado de bônus e custo
 * em PE (Tabela 1.4).
 */
ORDEM.tierPerito = (nex) =>
  nex >= 85 ? { dado: "1d12", custo: 5 } :
  nex >= 55 ? { dado: "1d10", custo: 4 } :
  nex >= 25 ? { dado: "1d8",  custo: 3 } :
              { dado: "1d6",  custo: 2 };

/**
 * Tier do Ataque Especial (Combatente) conforme o NEX — bônus e custo em PE
 * (Tabela 1.3).
 */
ORDEM.tierAtaqueEspecial = (nex) =>
  nex >= 85 ? { bonus: 20, custo: 5 } :
  nex >= 55 ? { bonus: 15, custo: 4 } :
  nex >= 25 ? { bonus: 10, custo: 3 } :
              { bonus: 5,  custo: 2 };

/**
 * Dados de dano adicionais do Ataque Furtivo (trilha Infiltrador) conforme o NEX
 * (Livro de Regras): +1d6 (10%), +2d6 (40%), +3d6 (65%), +4d6 (99%). Custo fixo
 * de 1 PE. Os dados NÃO são multiplicados em acerto crítico.
 */
ORDEM.tierFurtivo = (nex) =>
  nex >= 99 ? { dados: "4d6", custo: 1 } :
  nex >= 65 ? { dados: "3d6", custo: 1 } :
  nex >= 40 ? { dados: "2d6", custo: 1 } :
              { dados: "1d6", custo: 1 };

/**
 * Alvos canônicos que um modificador de item pode afetar. Usado pelo motor de
 * cálculo (prepareDerivedData) e pelo seletor na ficha de Item.
 * Chaves compostas usam ponto: "atributo.for", "pericia.luta", "pv.max".
 */
ORDEM.alvosModificador = {
  "pv.max":        "ORDEM.Alvo.pvMax",
  "pe.max":        "ORDEM.Alvo.peMax",
  "san.max":       "ORDEM.Alvo.sanMax",
  "defesa":        "ORDEM.Alvo.defesa",
  "deslocamento":  "ORDEM.Alvo.deslocamento",
  "peRodada":      "ORDEM.Alvo.peRodada",
  "dtRituais":     "ORDEM.Alvo.dtRituais",
  "carga":         "ORDEM.Alvo.carga",
  "custoPe":       "ORDEM.Alvo.custoPe",
  "atributo.agi":  "ORDEM.Alvo.atribAgi",
  "atributo.for":  "ORDEM.Alvo.atribFor",
  "atributo.int":  "ORDEM.Alvo.atribInt",
  "atributo.pre":  "ORDEM.Alvo.atribPre",
  "atributo.vig":  "ORDEM.Alvo.atribVig",
  "pericia.todas": "ORDEM.Alvo.periciaTodas",
  "dados.todos":         "ORDEM.Alvo.dadosTodos",
  "dados.ataque":        "ORDEM.Alvo.dadosAtaque",
  "dados.atributo.agi":  "ORDEM.Alvo.dadosAgi",
  "dados.atributo.for":  "ORDEM.Alvo.dadosFor",
  "dados.atributo.int":  "ORDEM.Alvo.dadosInt",
  "dados.atributo.pre":  "ORDEM.Alvo.dadosPre",
  "dados.atributo.vig":  "ORDEM.Alvo.dadosVig"
};

// Chaves de perícia também são alvos válidos como bônus plano (pericia.<chave>)
// e como dados (dados.pericia.<chave>), resolvidas dinamicamente pelo motor.

/**
 * Patentes (Tabela 3.1 do Livro de Regras): PP mínimo para promoção,
 * limite de crédito e itens por categoria liberados POR MISSÃO.
 */
ORDEM.patentes = {
  recruta:         { pp: 0,   credito: "Baixo",     itens: { I: 2, II: 0, III: 0, IV: 0 } },
  operador:        { pp: 20,  credito: "Médio",     itens: { I: 3, II: 1, III: 0, IV: 0 } },
  agenteEspecial:  { pp: 50,  credito: "Médio",     itens: { I: 3, II: 2, III: 1, IV: 0 } },
  oficial:         { pp: 100, credito: "Alto",      itens: { I: 3, II: 3, III: 2, IV: 1 } },
  agenteElite:     { pp: 200, credito: "Ilimitado", itens: { I: 3, II: 3, III: 3, IV: 2 } }
};

/** Patente sugerida pelo total de Pontos de Prestígio (promoção na próxima missão). */
ORDEM.patentePorPP = (pp) =>
  pp >= 200 ? "agenteElite" :
  pp >= 100 ? "oficial" :
  pp >= 50  ? "agenteEspecial" :
  pp >= 20  ? "operador" : "recruta";

/**
 * Manobras de combate (teste de Luta oposto contra o alvo).
 * `extra` descreve o efeito adicional ao vencer por 5 ou mais.
 */
ORDEM.manobras = {
  agarrar:   { icone: "fa-hand-back-fist", condicao: "agarrado" },
  derrubar:  { icone: "fa-person-falling", condicao: "caido" },
  desarmar:  { icone: "fa-hand-scissors",  condicao: null },
  empurrar:  { icone: "fa-hands-holding",  condicao: null },
  quebrar:   { icone: "fa-hammer",         condicao: null },
  atropelar: { icone: "fa-person-running", condicao: "caido" }
};

// Tipos de dano e categorias de condição (selects estruturados e fórmulas).
ORDEM.tiposDano = ["impacto", "corte", "perfuracao", "balistico", "fogo", "quimico",
  "eletrico", "mental", "morte", "sangue", "energia", "conhecimento", "medo"];
ORDEM.categoriasCondicao = ["fisica", "mental", "medo", "paralisia", "fadiga", "sentidos", "especial"];

/* -------------------------------------------------------------------------- */
/*  MOTOR DE FÓRMULAS (atributos + dados em qualquer campo numérico)           */
/* -------------------------------------------------------------------------- */

/**
 * Mapa de "status" da ficha acessíveis por apelido em fórmulas (`@apelido`).
 * Os valores usam os atributos EFETIVOS quando disponíveis (fallback para a
 * base, durante a coleta de modificadores). Qualquer campo que não esteja aqui
 * ainda é acessível pelo caminho cru no `system` (ex.: `@recursos.pv.max`).
 * @private
 */
function _statusFormula(actor) {
  const sys = actor?.system ?? {};
  const n = (x) => Number(x) || 0;
  const atr = sys.atributosEfetivos ?? sys.atributos ?? {};
  const rec = sys.recursos ?? {};

  const map = {
    // Atributos (abreviação + nome completo).
    for: n(atr.for), forca: n(atr.for), "força": n(atr.for),
    agi: n(atr.agi), agilidade: n(atr.agi),
    int: n(atr.int), intelecto: n(atr.int),
    pre: n(atr.pre), presenca: n(atr.pre), "presença": n(atr.pre),
    vig: n(atr.vig), vigor: n(atr.vig),
    // Exposição.
    nex: n(sys.nex), nivel: n(sys.niveis), "nível": n(sys.niveis),
    // Recursos (atual e máximo).
    pv: n(rec.pv?.value), pvmax: n(rec.pv?.max),
    pe: n(rec.pe?.value), pemax: n(rec.pe?.max),
    san: n(rec.san?.value), sanmax: n(rec.san?.max),
    // Derivados.
    defesa: n(sys.defesa?.total),
    deslocamento: n(sys.deslocamentoTotal ?? sys.deslocamento),
    perodada: n(sys.peRodada),
    dtrituais: n(sys.dtRituais), dtfortitude: n(sys.dtFortitude),
    dtreflexos: n(sys.dtReflexos), dtvontade: n(sys.dtVontade),
    carga: n(sys.carga?.atual), cargamax: n(sys.carga?.limite),
    vd: n(sys.vd), prestigio: n(sys.prestigio), "prestígio": n(sys.prestigio)
  };

  // Bônus calculado de cada perícia (Agente): @luta, @pericia.luta...
  for (const [k, calc] of Object.entries(sys.periciasCalc ?? {})) {
    map[k] = n(calc.bonus);
    map[`pericia.${k}`] = n(calc.bonus);
  }
  // Statblock de Criatura: @percepcao, @iniciativa, @fortitude... (bônus).
  if (sys.sentidos) {
    map.percepcao = n(sys.sentidos.percepcao?.bonus);
    map.iniciativa = n(sys.sentidos.iniciativa?.bonus);
  }
  if (sys.saves) {
    map.fortitude = n(sys.saves.fortitude?.bonus);
    map.reflexos = n(sys.saves.reflexos?.bonus);
    map.vontade = n(sys.saves.vontade?.bonus);
  }
  return map;
}

/**
 * Substitui referências `@status` de uma fórmula pelos valores do ator.
 * As referências SEMPRE usam o prefixo `@` (ex.: `@FOR+5`, `@PVMAX`,
 * `@pericia.luta`). Apelidos conhecidos vêm de {@link _statusFormula}; qualquer
 * outro `@caminho` é resolvido diretamente no `system` (ex.: `@recursos.pe.max`,
 * `@atributos.for`, `@saves.fortitude.bonus`). Referências desconhecidas viram
 * `0`. Dados (`NdX`) e aritmética seguem intactos.
 *
 * @param {string}     formula
 * @param {OrdemActor} [actor]
 * @returns {string}   Fórmula com as referências resolvidas
 */
export function resolverTokensFormula(formula, actor) {
  const f = String(formula ?? "").trim();
  if (!f || !actor || !f.includes("@")) return f;
  const sys = actor.system ?? {};
  const status = _statusFormula(actor);

  return f.replace(/@([A-Za-zÀ-ÿ][\wÀ-ÿ.]*)/g, (_m, nome) => {
    const chave = nome.toLowerCase();
    if (chave in status) return String(status[chave]);
    // Caminho cru no system (qualquer campo da ficha).
    const v = foundry.utils.getProperty(sys, nome);
    return (v !== undefined && v !== null && !Number.isNaN(Number(v))) ? String(Number(v)) : "0";
  });
}

/**
 * Avalia uma fórmula para um INTEIRO determinístico (uso em valores passivos da
 * ficha: modificadores, Defesa, bônus de teste...). Aceita referências `@status`
 * e dados: cada `NdX` é resolvido pela MÉDIA (`N*(X+1)/2`, arredondada para
 * baixo), de modo que o valor exibido na ficha não mude a cada renderização.
 *
 * @param {string|number} formula
 * @param {OrdemActor}    [actor]
 * @returns {number}
 */
export function avaliarFormulaPassiva(formula, actor) {
  if (typeof formula === "number") return Math.trunc(formula);
  let f = resolverTokensFormula(formula, actor);
  if (!f) return 0;
  // Dados → média determinística.
  f = f.replace(/(\d+)\s*d\s*(\d+)/gi, (_m, n, x) =>
    String(Math.floor((Number(n) * (Number(x) + 1)) / 2)));
  // Segurança: apenas números e operadores aritméticos.
  if (!/^[-+*/().\s\d]+$/.test(f)) return 0;
  try {
    const v = Function(`"use strict"; return (${f});`)();
    return Number.isFinite(v) ? Math.trunc(v) : 0;
  } catch {
    return 0;
  }
}

/* -------------------------------------------------------------------------- */
/*  CLASSE DE ATOR CUSTOMIZADA                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Estende o Actor base para calcular dados derivados (Defesa, sugestão de PV,
 * etc.) e oferecer utilitários de rolagem reutilizados pelas fichas.
 */
class OrdemActor extends Actor {

  /** Calcula valores derivados após a preparação dos dados base. */
  prepareDerivedData() {
    super.prepareDerivedData();
    const sys = this.system;

    // Níveis de exposição (cada 5% de NEX = 1 nível; NEX 5% = nível 1, 99% = 20).
    const nex = Number(sys.nex) || 0;
    sys.niveis = nex <= 0 ? 0 : (nex >= 99 ? 20 : Math.floor(nex / 5));

    if (this.type === "agente") this._prepararAgente(sys);
    else this._prepararCriatura(sys);
  }

  /** Coleta e soma os modificadores ativos de todos os itens, por alvo. */
  _coletarModificadores() {
    const out = {};
    const nexAtor = Number(this.system.nex) || 0;
    for (const it of this.items) {
      const s = it.system || {};
      if (!Array.isArray(s.modificadores) || !s.modificadores.length) continue;
      // Itens físicos só contam quando equipados; condição só quando ativa.
      if (["arma", "protecao", "equipamento"].includes(it.type) && !s.equipado) continue;
      if (it.type === "condicao" && s.ativo === false) continue;
      for (const m of s.modificadores) {
        if (!m || m.ativo === false || !m.alvo) continue;
        // Modificadores de trilha podem exigir NEX mínimo (desbloqueio por marco).
        if (it.type === "trilha" && Number(m.nex) > 0 && nexAtor < Number(m.nex)) continue;
        // Duração em turnos: expira quando o tempo restante chega a 0.
        if (Number(m.duracao) > 0 && Number(m.restante) <= 0) continue;
        // O valor pode ser uma fórmula (ex.: "FOR", "1d6+2", "NEX/5").
        out[m.alvo] = (out[m.alvo] || 0) + avaliarFormulaPassiva(m.valor, this);
      }
    }
    return out;
  }

  /** Conjunto de chaves de condições ATIVAS (incluindo implicadas). */
  condicoesAtivas() {
    const set = new Set();
    for (const it of this.items) {
      if (it.type !== "condicao" || it.system.ativo === false) continue;
      if (it.system.chave) set.add(it.system.chave);
      for (const imp of (it.system.implicadas ?? [])) set.add(imp);
    }
    return set;
  }

  /** O ator possui a condição (diretamente ou implicada)? */
  temCondicao(chave) {
    return this.condicoesAtivas().has(chave);
  }

  /**
   * Dados derivados da Criatura (statblock de Ameaça).
   * A Defesa, PV e testes (Percepção/Iniciativa/resistências) são valores
   * diretos do statblock — não derivados de NEX como nos Agentes. Quando
   * `defesa.valor` é informado, ele prevalece; caso contrário usa 10+AGI+outros.
   */
  _prepararCriatura(sys) {
    if (sys.defesa) {
      const agi = Number(sys.atributos?.agi ?? 0);
      const derivada = Number(sys.defesa.base ?? 10) + agi + Number(sys.defesa.outros ?? 0);
      const fixa = Number(sys.defesa.valor) || 0;
      sys.defesa.total = fixa > 0 ? fixa : derivada;
    }
    const pv = sys.recursos?.pv;
    if (pv && pv.max > 0) pv.value = Math.clamp(Number(pv.value) || 0, pv.min ?? 0, pv.max);
    const pe = sys.recursos?.pe;
    if (pe && pe.max > 0) pe.value = Math.clamp(Number(pe.value) || 0, pe.min ?? 0, pe.max);

    // Estado de exibição (criaturas não têm Sanidade/morrendo).
    sys.estado = { machucado: pv ? (pv.max > 0 && pv.value < pv.max / 2) : false };
  }

  /** Motor de cálculo completo do Agente. */
  _prepararAgente(sys) {
    const N = sys.niveis;
    const mods = this._coletarModificadores();
    sys.modificadores = mods; // exposto para depuração/ficha

    // 1) Atributos efetivos (base + atributo.*).
    sys.atributosEfetivos = {};
    for (const k of ["agi", "for", "int", "pre", "vig"]) {
      sys.atributosEfetivos[k] = (Number(sys.atributos?.[k]) || 0) + (mods[`atributo.${k}`] || 0);
    }
    const atr = sys.atributosEfetivos;

    // 2) Carga: limite = 5 × Força (2 se Força 0) + mods; ocupada = Σ espaços.
    const cargaLimite = (atr.for <= 0 ? 2 : atr.for * 5) + (mods["carga"] || 0);
    let cargaAtual = 0;
    for (const it of this.items) {
      if (["arma", "protecao", "equipamento"].includes(it.type)) {
        cargaAtual += (Number(it.system.espacos) || 0) * (Number(it.system.quantidade) || 1);
      }
    }
    const sobrecarregado = cargaAtual > cargaLimite;
    sys.carga = { atual: cargaAtual, limite: cargaLimite, max: cargaLimite * 2, sobrecarregado };

    // 3) Defesa = 10 + AGI + proteções equipadas + mods + outros − sobrecarga.
    if (sys.defesa) {
      let defProt = 0;
      for (const it of this.items) {
        if (it.type === "protecao" && it.system.equipado) defProt += Number(it.system.defesaBonus) || 0;
      }
      sys.defesa.total = Number(sys.defesa.base ?? 10) + atr.agi + defProt
        + Number(sys.defesa.equip ?? 0) + Number(sys.defesa.outros ?? 0)
        + (mods["defesa"] || 0) - (sobrecarregado ? 5 : 0);
    }

    // 4) Deslocamento efetivo (condições lento/imóvel aplicadas por último).
    const condAtivas = this.condicoesAtivas();
    sys.deslocamentoTotal = (Number(sys.deslocamento) || 0) + (mods["deslocamento"] || 0)
      - (sobrecarregado ? 3 : 0);
    if (condAtivas.has("imovel")) sys.deslocamentoTotal = 0;
    else if (condAtivas.has("lento")) {
      sys.deslocamentoTotal = Math.floor((sys.deslocamentoTotal / 2) / 1.5) * 1.5;
    }
    sys.deslocamentoTotal = Math.max(0, sys.deslocamentoTotal);
    sys.deslocQuadros = Math.floor(sys.deslocamentoTotal / 1.5);

    // 5) Limite de PE por turno = nível de NEX (+ mods). Mínimo 1.
    sys.peRodada = Math.max(1, N + (mods["peRodada"] || 0));

    // 6) DT de rituais/habilidades = 10 + nível de NEX + atributo.
    sys.dtRituais   = 10 + N + atr.pre + (mods["dtRituais"] || 0);
    sys.dtFortitude = 10 + N + atr.vig;
    sys.dtReflexos  = 10 + N + atr.agi;
    sys.dtVontade   = 10 + N + atr.pre;

    // 7) PV/PE/SAN máximos derivados (classe+NEX + bonusMax + mods).
    const info = ORDEM.classesInfo?.[sys.classe];
    const baseRec = (rec) => (!info || N <= 0) ? 0 :
      rec.inicial + (rec.atributo ? atr[rec.atributo] * N : 0) + (N - 1) * rec.porNivel;
    const aplicar = (chave, infoRec, modKey) => {
      const r = sys.recursos?.[chave];
      if (!r) return;
      r.maxCalc = info ? baseRec(infoRec) : 0;
      r.max = r.maxCalc + (Number(r.bonusMax) || 0) + (mods[modKey] || 0);
      if (r.max > 0) r.value = Math.clamp(Number(r.value) || 0, r.min ?? 0, r.max);
    };
    aplicar("pv",  info?.pv,  "pv.max");
    aplicar("pe",  info?.pe,  "pe.max");
    aplicar("san", info?.san, "san.max");

    // 8) Perícias: total e nº de dados (atributo efetivo); penalidade de carga.
    const penCarga = sobrecarregado ? 5 : 0;
    sys.periciasCalc = {};
    for (const [key, per] of Object.entries(sys.pericias || {})) {
      const cfg = ORDEM.pericias[key] || { atributo: "int" };
      const atributo = per.atributo || cfg.atributo;
      const treino = Number(per.treino) || 0;
      const outros = Number(per.outros) || 0;
      const modPer = (mods[`pericia.${key}`] || 0) + (mods["pericia.todas"] || 0);
      sys.periciasCalc[key] = {
        atributo,
        dados: atr[atributo] ?? 0,
        treino, outros,
        bonus: treino + outros + modPer - (cfg.carga ? penCarga : 0),
        carga: !!cfg.carga
      };
    }

    // 9) Flags de estado (apenas exibição / pré-requisito; não afetam terceiros).
    const pv = sys.recursos?.pv, san = sys.recursos?.san;
    sys.estado = {
      machucado:     pv  ? (pv.value  < pv.max  / 2) : false,
      morrendo:      pv  ? (pv.value  <= 0)          : false,
      perturbado:    san ? (san.value < san.max / 2) : false,
      enlouquecendo: san ? (san.value <= 0)          : false
    };

    // 10) Patente → limite de crédito e itens por categoria + uso atual.
    const pat = ORDEM.patentes[sys.patente];
    if (pat) {
      // Conta os itens físicos por categoria (I a IV) para o limite por missão.
      const uso = { I: 0, II: 0, III: 0, IV: 0 };
      const mapa = { "1": "I", "2": "II", "3": "III", "4": "IV", "i": "I", "ii": "II", "iii": "III", "iv": "IV" };
      for (const it of this.items) {
        if (!["arma", "protecao", "equipamento"].includes(it.type)) continue;
        const cat = mapa[String(it.system.categoria ?? "").trim().toLowerCase()];
        if (cat) uso[cat] += 1;
      }
      sys.patenteInfo = {
        credito: pat.credito,
        itens: pat.itens,
        uso,
        excedido: Object.keys(uso).some(c => uso[c] > pat.itens[c])
      };
    }
    // Patente sugerida pelos Pontos de Prestígio (promoção vale na próxima missão).
    sys.patenteSugerida = ORDEM.patentePorPP(Number(sys.prestigio) || 0);

    // 11) Afinidade elemental (NEX 50%+; escolha em system.afinidade).
    sys.afinidadeAtiva = (Number(sys.nex) || 0) >= 50 && !!sys.afinidade;
  }

  /**
   * Quantidade de dados d20 que um atributo concede (usa o valor EFETIVO).
   * Regra: número de dados = valor do atributo (ex.: Força 3 -> 3d20).
   * Atributo 0 é tratado como caso especial (2d20, menor resultado).
   */
  numDadosDoAtributo(atributoKey) {
    return Number(this.system.atributosEfetivos?.[atributoKey]
      ?? this.system.atributos?.[atributoKey] ?? 0);
  }

  /** Dados de rolagem disponíveis em fórmulas (@atributos.for, @nex, ...). */
  getRollData() {
    const data = super.getRollData();
    data.atributos = foundry.utils.deepClone(this.system.atributosEfetivos ?? this.system.atributos ?? {});
    data.nex = this.system.nex ?? 0;
    return data;
  }
}

/* -------------------------------------------------------------------------- */
/*  MOTOR DE DADOS — ROLAGEM DE TESTE "MELHOR DE N"                            */
/* -------------------------------------------------------------------------- */

/**
 * Abre o diálogo de rolagem, deixando o usuário escolher a CD, modificadores
 * e dados extras, e em seguida executa o teste.
 *
 * Resolve com `null` (cancelado) ou com o resultado rico do teste:
 * `{ roll, total, natural, cd, sucesso, critico, desastre, extraordinario, grau }`.
 *
 * @param {OrdemActor} actor               Ator que está rolando
 * @param {object}     opcoes
 * @param {string}     [opcoes.atributoKey]  Chave do atributo (agi, for, ...)
 * @param {string}     [opcoes.periciaKey]   Chave da perícia (opcional)
 * @param {string}     [opcoes.titulo]       Rótulo exibido no card
 * @param {Item}       [opcoes.arma]         Arma (transforma em ataque)
 * @param {number}     [opcoes.cd]           CD pré-preenchida no diálogo
 * @param {string}     [opcoes.manobra]      Chave da manobra de combate (agarrar...)
 */
export async function rolarTeste(actor, { atributoKey, periciaKey, titulo, arma, cd: cdInicial, manobra, dadosBonus = 0 } = {}) {
  if (!actor) return ui.notifications.warn(game.i18n.localize("ORDEM.Aviso.SemAtor"));

  const sys = actor.system;

  // Ataque por arma: usa a perícia de teste da arma (Luta/Pontaria).
  let margemAmeaca = 20;
  let naoProficiente = false;
  let bonusAtaque = 0;
  if (arma) {
    periciaKey = arma.system.testePericia || "luta";
    titulo = arma.name;
    margemAmeaca = Number(arma.system.margemAmeaca) || 20;
    naoProficiente = arma.system.proficiente === false;
    bonusAtaque = avaliarFormulaPassiva(arma.system.bonusAtaque, actor);
  }

  // Manobras são testes de ataque corpo a corpo (Luta).
  if (manobra) {
    periciaKey = periciaKey || "luta";
    titulo = titulo || game.i18n.localize(`ORDEM.Manobra.${manobra}`);
  }
  const ehAtaque = !!arma || !!manobra;

  // Determina atributo efetivo e bônus de perícia.
  let atributo = atributoKey;
  let periciaBonus = 0;
  let periciaTreinada = true;
  let soTreinada = false;
  let nome = titulo ?? "";

  if (periciaKey) {
    const cfg = ORDEM.pericias[periciaKey];
    const calc = sys.periciasCalc?.[periciaKey];
    const per = sys.pericias?.[periciaKey] ?? { treino: 0, outros: 0 };
    atributo = calc?.atributo || per.atributo || cfg.atributo;
    periciaTreinada = (Number(per.treino) || 0) > 0;
    soTreinada = cfg.soTreinada;
    // Bônus já inclui treino + outros + modificadores − penalidade de carga.
    periciaBonus = calc ? calc.bonus : ((Number(per.treino) || 0) + (Number(per.outros) || 0));
    nome = game.i18n.localize(`ORDEM.Pericia.${periciaKey}`);
  } else if (atributoKey) {
    nome = nome || game.i18n.localize(ORDEM.atributos[atributoKey]);
  }

  // Perícia "somente treinada" sem treino: avisa o jogador.
  if (soTreinada && !periciaTreinada) {
    ui.notifications.warn(game.i18n.format("ORDEM.Aviso.SoTreinada", { pericia: nome }));
  }

  // Ataque: soma bônus da arma e penalidade por falta de proficiência (−10).
  periciaBonus += bonusAtaque;
  if (naoProficiente) periciaBonus -= 10;

  // Nº de dados = atributo EFETIVO (base + modificadores).
  let baseDados = Number(sys.atributosEfetivos?.[atributo] ?? sys.atributos?.[atributo] ?? 0);

  // Penalidades/bônus EM DADOS vindas de condições e itens (−Ⓞ do livro).
  const modsAtor = sys.modificadores ?? {};
  const dadosCondicao =
    (modsAtor["dados.todos"] || 0) +
    (modsAtor[`dados.atributo.${atributo}`] || 0) +
    (periciaKey ? (modsAtor[`dados.pericia.${periciaKey}`] || 0) : 0) +
    (ehAtaque ? (modsAtor["dados.ataque"] || 0) : 0);
  baseDados += dadosCondicao;

  // Bônus de dados pontual passado pelo chamador (ex.: +Ⓞ da Investida) —
  // aplica-se só a esta rolagem, sem virar um modificador persistente.
  baseDados += Number(dadosBonus) || 0;

  // Linha informativa exibida no topo do diálogo.
  const atribLabel = game.i18n.localize(ORDEM.atributos[atributo] ?? "");
  let infoLinha = game.i18n.format("ORDEM.Dialog.Info", {
    nome,
    atributo: atribLabel,
    dados: Math.max(1, baseDados)
  });
  if (dadosCondicao !== 0) {
    infoLinha += " " + game.i18n.format("ORDEM.Dialog.DadosCondicao", {
      valor: (dadosCondicao > 0 ? "+" : "") + dadosCondicao
    });
  }

  // --- Habilidades de classe aplicáveis a este teste ---
  const classe = sys.classe;
  const nex = Number(sys.nex) || 0;
  const peAtual = Number(sys.recursos?.pe?.value) || 0;
  const habil = {};
  if (periciaKey && classe === "especialista") {
    const p = ORDEM.tierPerito(nex);
    habil.perito = { dado: p.dado, custo: p.custo, label: game.i18n.format("ORDEM.Hab.Perito", { custo: p.custo, dado: p.dado }) };
    if (!periciaTreinada) {
      habil.ecletico = { custo: 2, label: game.i18n.localize("ORDEM.Hab.Ecletico") };
    }
  }
  // Ataque Especial aplica-se a ataques (testes de Luta/Pontaria).
  if (classe === "combatente" && (periciaKey === "luta" || periciaKey === "pontaria")) {
    const ae = ORDEM.tierAtaqueEspecial(nex);
    habil.ataqueEspecial = { bonus: ae.bonus, custo: ae.custo, label: game.i18n.format("ORDEM.Hab.AtaqueEspecial", { custo: ae.custo, bonus: ae.bonus }) };
  }
  const temHabilidades = !!(habil.perito || habil.ecletico || habil.ataqueEspecial);

  // Renderiza o conteúdo do diálogo.
  const conteudo = await renderTemplate("systems/ordem-paranormal/templates/roll-dialog.hbs", {
    infoLinha,
    cd: cdInicial ?? 15,
    soTreinada,
    treinada: periciaTreinada,
    habil,
    temHabilidades,
    peAtual,
    ehAtaque
  });

  // Diálogo de rolagem.
  return new Promise((resolve) => {
    new Dialog({
      title: game.i18n.format("ORDEM.Dialog.Titulo", { nome }),
      content: conteudo,
      buttons: {
        rolar: {
          icon: '<i class="fas fa-dice-d20"></i>',
          label: game.i18n.localize("ORDEM.Dialog.Rolar"),
          callback: async (html) => {
            const form = html[0].querySelector("form");
            let cd          = Number(form.cd.value) || 0;
            // Modificador extra aceita fórmula (ex.: "FOR+2", "1d4").
            const modExtra  = avaliarFormulaPassiva(form.modExtra.value, actor);
            const circ = form.circunstancia?.value ?? "normal";
            let circAdj = circ === "favoravel" ? 1 : circ === "desfavoravel" ? -1 : 0;
            // Situações de combate (Tabela 4.4) — apenas em ataques.
            const situacoes = [];
            if (ehAtaque) {
              if (form.sitFlanqueando?.checked) { circAdj += 1; situacoes.push(game.i18n.localize("ORDEM.Situacao.Flanqueando")); }
              if (form.sitElevada?.checked)     { circAdj += 1; situacoes.push(game.i18n.localize("ORDEM.Situacao.Elevada")); }
              const cob = form.sitCobertura?.value ?? "nenhuma";
              if (cob === "parcial") { cd += 5; situacoes.push(game.i18n.localize("ORDEM.Situacao.Cobertura")); }
            }
            const camuflagem = ehAtaque ? (form.sitCamuflagem?.value ?? "nenhuma") : "nenhuma";
            const dadosExtra = (Number(form.dadosExtra.value) || 0) + circAdj;
            // Habilidades selecionadas (os campos só existem se disponíveis).
            const hab = {
              perito:         (form.usarPerito?.checked && habil.perito) ? habil.perito : null,
              ecletico:       (form.usarEcletico?.checked && habil.ecletico) ? habil.ecletico : null,
              ataqueEspecial: (form.usarAtaqueEspecial?.checked && habil.ataqueEspecial) ? habil.ataqueEspecial : null
            };
            const resultado = await _executarTeste(actor, {
              nome, atributo, atribLabel,
              baseDados, dadosExtra,
              circunstancia: circ,
              periciaBonus, modExtra, cd, hab, peAtual,
              margemAmeaca, naoProficiente, arma,
              manobra, situacoes, camuflagem
            });
            resolve(resultado);
          }
        },
        cancelar: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize("ORDEM.Dialog.Cancelar"),
          callback: () => resolve(null)
        }
      },
      default: "rolar"
    }, { classes: ["ordem-paranormal", "dialog"] }).render(true);
  });
}

/**
 * Executa de fato a rolagem do teste e publica o card no chat.
 * @private
 */
async function _executarTeste(actor, dados) {
  const { nome, atribLabel, baseDados, dadosExtra, periciaBonus, modExtra, cd, hab = {},
          peAtual = 0, circunstancia = "normal", manobra = null, situacoes = [],
          camuflagem = "nenhuma" } = dados;

  // --- Custo total em PE das habilidades selecionadas (condições podem aumentar) ---
  const modCustoPe = Number(actor.system.modificadores?.["custoPe"]) || 0;
  let custoPE = (hab.perito?.custo || 0) + (hab.ecletico?.custo || 0) + (hab.ataqueEspecial?.custo || 0);
  if (custoPE > 0) custoPE = Math.max(0, custoPE + modCustoPe);
  if (custoPE > peAtual) {
    return ui.notifications.warn(game.i18n.format("ORDEM.Aviso.PEInsuficiente", { custo: custoPE, atual: peAtual }));
  }

  const numDados = baseDados + dadosExtra;

  // Atributo 0 (ou negativo): rola 2d20 e fica com o MENOR (regra de desvantagem).
  // Caso contrário: rola Nd20 e fica com o MAIOR (kh = keep highest).
  const menorMelhor = numDados <= 0;
  const qtd = menorMelhor ? 2 : numDados;
  const formula = menorMelhor ? `${qtd}d20kl` : `${qtd}d20kh`;

  const roll = await (new Roll(formula)).evaluate();
  const rolls = [roll];

  // Extrai todos os resultados dos d20 e identifica o dado mantido.
  const term = roll.dice[0];
  const resultados = term.results.map(r => ({ valor: r.result, mantido: !!r.active }));
  const natural = term.results.find(r => r.active)?.result ?? roll.total;

  // --- Aplica habilidades de classe ---
  const habUsadas = [];
  let bonusHab = 0;

  // Eclético: trata como treinado (+5) numa perícia não treinada.
  if (hab.ecletico) {
    bonusHab += 5;
    habUsadas.push(game.i18n.localize("ORDEM.Hab.EcleticoCurto"));
  }

  // Ataque Especial: bônus fixo no teste.
  if (hab.ataqueEspecial) {
    bonusHab += hab.ataqueEspecial.bonus;
    habUsadas.push(game.i18n.format("ORDEM.Hab.AtaqueEspecialCurto", { bonus: hab.ataqueEspecial.bonus }));
  }

  // Perito: rola um dado de bônus adicional somado ao resultado.
  let peritoInfo = null;
  if (hab.perito) {
    const peritoRoll = await (new Roll(hab.perito.dado)).evaluate();
    rolls.push(peritoRoll);
    peritoInfo = { dado: hab.perito.dado, total: peritoRoll.total };
    bonusHab += peritoRoll.total;
    habUsadas.push(game.i18n.format("ORDEM.Hab.PeritoCurto", { dado: hab.perito.dado, valor: peritoRoll.total }));
  }

  const bonusTotal = (Number(periciaBonus) || 0) + (Number(modExtra) || 0) + bonusHab;
  const total = natural + bonusTotal;

  // --- Camuflagem do alvo: chance de falha no d10 (20% parcial / 50% total) ---
  let camuflagemInfo = null;
  if (camuflagem === "parcial" || camuflagem === "total") {
    const limite = camuflagem === "total" ? 5 : 2;
    const d10 = await (new Roll("1d10")).evaluate();
    rolls.push(d10);
    camuflagemInfo = { tipo: camuflagem, valor: d10.total, errou: d10.total <= limite, limite };
  }

  // Crítico / Desastre pelo dado natural mantido (margem de ameaça p/ armas).
  const margem = Number(dados.margemAmeaca) || 20;
  const critico  = natural >= margem;
  const desastre = natural === 1;
  const errouCamuflagem = !!camuflagemInfo?.errou;

  // Grau de sucesso: desastre < falha < sucesso < extraordinário (CD+10) < crítico.
  let sucesso;
  let extraordinario = false;
  let resultadoKey;
  if (errouCamuflagem) {
    sucesso = false;
    resultadoKey = "ORDEM.Resultado.ErrouCamuflagem";
  } else if (critico) {
    sucesso = true;
    resultadoKey = "ORDEM.Resultado.Critico";
  } else if (desastre) {
    sucesso = false;
    resultadoKey = "ORDEM.Resultado.Desastre";
  } else {
    sucesso = total >= cd;
    extraordinario = sucesso && cd > 0 && total >= cd + 10;
    resultadoKey = extraordinario ? "ORDEM.Resultado.Extraordinario"
                 : sucesso ? "ORDEM.Resultado.Sucesso" : "ORDEM.Resultado.Falha";
  }
  const grau = errouCamuflagem ? "falha"
             : critico ? "critico"
             : desastre ? "desastre"
             : extraordinario ? "extraordinario"
             : sucesso ? "sucesso" : "falha";

  // Desconta o custo em PE, se houver.
  if (custoPE > 0) {
    await actor.update({ "system.recursos.pe.value": Math.max(0, peAtual - custoPE) });
  }

  // Nota de manobra de combate (efeito ao vencer / vencer por 5+).
  let manobraInfo = null;
  if (manobra) {
    manobraInfo = {
      label: game.i18n.localize(`ORDEM.Manobra.${manobra}`),
      efeito: game.i18n.localize(`ORDEM.Manobra.Efeito.${manobra}`),
      extra: (sucesso && cd > 0 && total >= cd + 5) ? game.i18n.localize(`ORDEM.Manobra.Extra.${manobra}`) : null
    };
  }

  // Monta o card de chat.
  const conteudo = _cardDeTeste({
    nome, atribLabel, resultados, natural,
    bonusTotal, total, cd, sucesso, critico, desastre, extraordinario,
    resultadoLabel: game.i18n.localize(resultadoKey),
    menorMelhor, peritoInfo, habUsadas, custoPE,
    circunstancia, situacoes, camuflagemInfo, manobraInfo,
    arma: dados.arma, naoProficiente: dados.naoProficiente
  });

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: conteudo,
    rolls,
    sound: CONFIG.sounds.dice,
    flags: { "ordem-paranormal": { tipo: "teste" } }
  });

  return { roll, total, natural, cd, sucesso, critico, desastre, extraordinario, grau };
}

/**
 * Gera o HTML do card de chat para um teste de atributo/perícia.
 * @private
 */
function _cardDeTeste(d) {
  const dadosHtml = d.resultados.map(r => {
    const classes = ["ordem-die"];
    if (r.mantido) classes.push("mantido");
    if (r.valor === 20) classes.push("max");
    if (r.valor === 1) classes.push("min");
    return `<span class="${classes.join(" ")}">${r.valor}</span>`;
  }).join("");

  const classeResultado = d.critico ? "critico"
    : d.desastre ? "desastre"
    : d.extraordinario ? "extraordinario"
    : (d.sucesso ? "sucesso" : "falha");
  const sinal = d.bonusTotal >= 0 ? "+" : "";
  const escolhaLabel = d.menorMelhor
    ? game.i18n.localize("ORDEM.Card.MenorResultado")
    : game.i18n.localize("ORDEM.Card.MaiorResultado");

  // Dado do Perito (se usado) exibido junto aos dados lançados.
  const peritoHtml = d.peritoInfo
    ? `<span class="ordem-die perito" title="${d.peritoInfo.dado}">+${d.peritoInfo.total}</span>`
    : "";

  // Linha de habilidades de classe usadas + PE gasto.
  const habHtml = (d.habUsadas && d.habUsadas.length)
    ? `<div class="hab-linha"><i class="fas fa-star"></i> ${d.habUsadas.join(" · ")}${d.custoPE ? ` <span class="pe-gasto">(−${d.custoPE} PE)</span>` : ""}</div>`
    : "";

  // Ícone de circunstância (favorável / desfavorável).
  const circHtml = d.circunstancia === "favoravel"
    ? `<div class="hab-linha circ-favoravel"><i class="fas fa-circle-up"></i> ${game.i18n.localize("ORDEM.Dialog.Favoravel")}</div>`
    : d.circunstancia === "desfavoravel"
    ? `<div class="hab-linha circ-desfavoravel"><i class="fas fa-circle-down"></i> ${game.i18n.localize("ORDEM.Dialog.Desfavoravel")}</div>`
    : "";

  // Situações de combate marcadas no diálogo (flanqueando, posição elevada, cobertura).
  const sitHtml = (d.situacoes && d.situacoes.length)
    ? `<div class="hab-linha situacoes"><i class="fas fa-chess-board"></i> ${d.situacoes.join(" · ")}</div>`
    : "";

  // Resultado da camuflagem do alvo (d10: 20% / 50% de falha).
  const camHtml = d.camuflagemInfo
    ? `<div class="hab-linha ${d.camuflagemInfo.errou ? "aviso" : ""}"><i class="fas fa-cloud"></i> ${game.i18n.format("ORDEM.Situacao.CamuflagemRolagem", {
        tipo: game.i18n.localize(`ORDEM.Situacao.Camuflagem.${d.camuflagemInfo.tipo}`),
        valor: d.camuflagemInfo.valor,
        limite: d.camuflagemInfo.limite
      })}</div>`
    : "";

  // Efeito da manobra de combate (em caso de sucesso).
  const manobraHtml = (d.manobraInfo && d.sucesso)
    ? `<div class="hab-linha manobra"><i class="fas fa-hand-fist"></i> <strong>${d.manobraInfo.label}:</strong> ${d.manobraInfo.efeito}${d.manobraInfo.extra ? `<br/><i class="fas fa-star"></i> ${d.manobraInfo.extra}` : ""}</div>`
    : "";

  // Nota de não-proficiência (ataque com arma sem proficiência: −10).
  const profHtml = d.naoProficiente
    ? `<div class="hab-linha aviso"><i class="fas fa-triangle-exclamation"></i> ${game.i18n.localize("ORDEM.Card.NaoProficiente")}</div>`
    : "";

  // Botões de dano (somente em ataques com arma; não aplicam efeitos a alvos).
  let botoesHtml = "";
  if (d.arma) {
    const uuid = d.arma.uuid;
    const labelDano = game.i18n.localize("ORDEM.Dano.Rolar");
    botoesHtml = `<div class="card-botoes">
      <button type="button" class="ordem-card-botao" data-acao="dano" data-item-uuid="${uuid}" data-critico="${d.critico}">
        <i class="fas fa-burst"></i> ${d.critico ? game.i18n.localize("ORDEM.Dano.RolarCritico") : labelDano}
      </button>
    </div>`;
  }

  return `
  <div class="ordem-chat-card teste">
    <header class="card-header">
      <i class="fas fa-dice-d20"></i>
      <h3>${d.nome}</h3>
      <span class="atributo">${d.atribLabel}</span>
    </header>
    <div class="card-content">
      <div class="dados-lancados" title="${escolhaLabel}">${dadosHtml}${peritoHtml}</div>
      <div class="conta">
        <span class="parcela escolhido" title="${escolhaLabel}">${d.natural}</span>
        <span class="op">${sinal}</span>
        <span class="parcela bonus">${Math.abs(d.bonusTotal)}</span>
        <span class="op">=</span>
        <span class="parcela total">${d.total}</span>
      </div>
      <div class="cd-linha">${game.i18n.localize("ORDEM.Card.CD")}: <strong>${d.cd}</strong></div>
      ${circHtml}
      ${sitHtml}
      ${camHtml}
      ${habHtml}
      ${manobraHtml}
      ${profHtml}
      ${botoesHtml}
    </div>
    <footer class="card-footer ${classeResultado}">
      ${d.resultadoLabel}
    </footer>
  </div>`;
}

/* -------------------------------------------------------------------------- */
/*  ROLAGEM DE DANO                                                            */
/* -------------------------------------------------------------------------- */

/** Dobra a quantidade de dados de uma fórmula (crítico). @private */
function _dobrarDados(formula) {
  return formula.replace(/(\d*)d(\d+)/gi, (m, n, faces) => `${(parseInt(n) || 1) * 2}d${faces}`);
}

/**
 * Rola o dano de uma arma (ou de uma fórmula arbitrária) e publica no chat.
 * NÃO aplica o dano a nenhum alvo — apenas exibe o total.
 *
 * @param {OrdemActor}  actor   Ator dono da arma
 * @param {Item|object} item    Item de arma OU objeto { name, system:{dano,...} }
 * @param {object}      [opts]
 * @param {boolean}     [opts.critico]    Dobra os dados de dano
 * @param {number}      [opts.bonusExtra] Bônus numérico adicional
 */
export async function rolarDano(actor, item, { critico = false, bonusExtra = 0, dadosExtra = "" } = {}) {
  const sys = item.system ?? item;
  // A fórmula de dano aceita atributos (ex.: "1d6+5+FOR"): resolve os tokens.
  let formula = resolverTokensFormula((sys.dano || "1d6").trim(), actor) || "1d6";

  const nome = item.name ?? sys.nome ?? game.i18n.localize("ORDEM.Dano.Generico");

  // Crítico: dobra os dados (bônus numéricos NÃO são dobrados).
  if (critico) formula = _dobrarDados(formula);

  // Soma de atributo no dano (corpo a corpo soma Força, por padrão) — legado,
  // ainda útil para armas que não escrevem o atributo na própria fórmula.
  const partes = [formula];
  const atrKey = sys.somaAtributoDano;
  const corpoACorpo = (sys.alcance ?? "") === "corpoacorpo";
  if (actor && atrKey && corpoACorpo) {
    const v = Number(actor.system.atributosEfetivos?.[atrKey] ?? actor.system.atributos?.[atrKey] ?? 0);
    if (v) partes.push(String(v));
  }
  // Dados extras (ex.: Ataque Furtivo) entram DEPOIS do crítico — não são dobrados.
  if (dadosExtra) partes.push(resolverTokensFormula(String(dadosExtra).trim(), actor));
  if (bonusExtra) partes.push(String(bonusExtra));
  const formulaFinal = partes.join(" + ");

  let roll;
  try {
    roll = await (new Roll(formulaFinal, actor?.getRollData?.() ?? {})).evaluate();
  } catch (e) {
    return ui.notifications.error(game.i18n.format("ORDEM.Aviso.FormulaInvalida", { formula: formulaFinal }));
  }

  const tipoDano = sys.tipoDano ? game.i18n.localize(`ORDEM.TipoDano.${sys.tipoDano}`) : "";

  const dadosHtml = roll.dice.flatMap(term =>
    term.results.map(r => `<span class="ordem-die dano">${r.result}</span>`)
  ).join("");

  // Botão (Mestre): aplicar o dano aos tokens selecionados — checa dano
  // massivo e a transição para 0 PV (morrendo) automaticamente.
  const aplicarHtml = `<div class="card-botoes gm-only">
    <button type="button" class="ordem-card-botao" data-acao="aplicar-dano" data-dano="${roll.total}" data-tipo="${Handlebars.escapeExpression(sys.tipoDano ?? "")}">
      <i class="fas fa-hand-holding-medical"></i> ${game.i18n.localize("ORDEM.Dano.AplicarSelecionados")}
    </button>
  </div>`;

  const conteudo = `
  <div class="ordem-chat-card dano${critico ? " e-critico" : ""}">
    <header class="card-header">
      <i class="fas fa-burst"></i>
      <h3>${nome}</h3>
      <span class="atributo">${critico ? game.i18n.localize("ORDEM.Dano.Critico") : game.i18n.localize("ORDEM.Dano.Titulo")}</span>
    </header>
    <div class="card-content">
      <div class="dados-lancados">${dadosHtml}</div>
      <div class="conta">
        <span class="formula">${formulaFinal}</span>
        <span class="op">=</span>
        <span class="parcela total dano-total">${roll.total}</span>
      </div>
      ${tipoDano ? `<div class="cd-linha">${game.i18n.localize("ORDEM.TipoDano.Label")}: <strong>${tipoDano}</strong></div>` : ""}
      ${aplicarHtml}
    </div>
  </div>`;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: conteudo,
    rolls: [roll],
    sound: CONFIG.sounds.dice,
    flags: { "ordem-paranormal": { tipo: "dano" } }
  });

  return roll;
}

/**
 * Ataque com arma: abre o diálogo de teste (Luta/Pontaria) já configurado com o
 * bônus da arma e a penalidade por falta de proficiência. O card oferece um
 * botão para rolar o dano (e dano crítico em caso de acerto crítico).
 */
export async function rolarAtaque(actor, item) {
  return rolarTeste(actor, { arma: item });
}

/**
 * Teste de resistência (Fortitude / Reflexos / Vontade). Apenas rola e exibe;
 * a DT é informada pelo Mestre.
 */
export async function rolarResistencia(actor, periciaKey) {
  return rolarTeste(actor, { periciaKey });
}

/* -------------------------------------------------------------------------- */
/*  CONDIÇÕES OFICIAIS                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Decrementa a duração (em turnos) dos modificadores temporários de um ator e
 * desativa os que expiraram. Chamado no início do turno do ator em combate.
 * Modificadores com `duracao` 0 são permanentes (enquanto o item está ativo).
 * @private
 */
async function _tickModificadores(actor) {
  if (!actor) return;
  const expirados = [];
  const updates = [];

  for (const it of actor.items) {
    const mods = it.system?.modificadores;
    if (!Array.isArray(mods) || !mods.length) continue;
    let mudou = false;

    const novos = mods.map(m => {
      if (!m || m.ativo === false) return m;
      const dur = Number(m.duracao) || 0;
      if (dur <= 0) return m;                 // permanente
      let restante = Number(m.restante);
      if (!Number.isFinite(restante) || restante > dur) restante = dur;
      restante -= 1;
      mudou = true;
      if (restante <= 0) {
        expirados.push({ item: it, rotulo: m.rotulo || m.alvo });
        return { ...m, restante: 0, ativo: false };
      }
      return { ...m, restante };
    });

    if (mudou) updates.push(it.update({ "system.modificadores": novos }));
  }

  if (updates.length) await Promise.all(updates);
  for (const e of expirados) {
    await _cardEvento(actor, {
      icone: "fa-hourglass-end", classe: "condicao fim",
      titulo: game.i18n.format("ORDEM.Mod.Expirou", { nome: e.item.name }),
      texto: game.i18n.format("ORDEM.Mod.ExpirouTexto", { rotulo: e.rotulo })
    });
  }
}

/** Card simples de chat para eventos de condição/estado. @private */
async function _cardEvento(actor, { icone = "fa-circle-info", titulo, texto, classe = "" }) {
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `
    <div class="ordem-chat-card evento ${classe}">
      <header class="card-header">
        <i class="fas ${icone}"></i>
        <h3>${titulo}</h3>
      </header>
      <div class="card-content"><div class="descricao">${texto}</div></div>
    </div>`,
    flags: { "ordem-paranormal": { tipo: "evento" } }
  });
}

/**
 * Aplica uma condição OFICIAL do catálogo ao ator (como item embutido do tipo
 * "condicao", com modificadores achatados — incluindo condições implicadas).
 * Reaplicar uma condição com regra de agravamento (ex.: abalado) aplica a
 * condição agravada no lugar (apavorado).
 *
 * @param {OrdemActor} actor
 * @param {string}     chave    Chave no catálogo (ex.: "abalado")
 * @param {object}     [opts]
 * @param {boolean}    [opts.anunciar=true]  Posta card no chat
 */
export async function aplicarCondicao(actor, chave, { anunciar = true } = {}) {
  const cond = CONDICOES[chave];
  if (!actor || !cond) return null;

  // Imunidade da criatura: pela chave da condição ou pela categoria (ex.: a
  // criatura imune a "mental" ignora condições mentais; Origem Paranormal já
  // torna criaturas imunes a condições mentais e de medo).
  if (actor.type === "criatura") {
    const imunes = Array.isArray(actor.system.imunidades) ? actor.system.imunidades : [];
    const origemParanormal = ["mental", "medo"].includes(cond.categoria);
    if (imunes.includes(chave) || imunes.includes(cond.categoria) || origemParanormal) {
      if (anunciar) ui.notifications.info(game.i18n.format("ORDEM.Criatura.ImuneCondicao", { nome: cond.nome }));
      return null;
    }
  }

  // Já possui? Verifica agravamento (abalado → apavorado etc.).
  const existente = actor.items.find(i => i.type === "condicao" && i.system.chave === chave);
  if (existente) {
    if (cond.agravaPara && CONDICOES[cond.agravaPara]) {
      await existente.delete();
      const agravada = await aplicarCondicao(actor, cond.agravaPara, { anunciar: false });
      if (anunciar) await _cardEvento(actor, {
        icone: "fa-arrow-trend-down", classe: "condicao",
        titulo: game.i18n.localize("ORDEM.Condicao.Agravou"),
        texto: game.i18n.format("ORDEM.Condicao.AgravouTexto", {
          de: cond.nome, para: CONDICOES[cond.agravaPara].nome
        })
      });
      return agravada;
    }
    ui.notifications.info(game.i18n.format("ORDEM.Condicao.JaPossui", { nome: cond.nome }));
    return existente;
  }

  const [item] = await actor.createEmbeddedDocuments("Item", [{
    name: cond.nome,
    type: "condicao",
    img: cond.icone,
    system: {
      ativo: true,
      chave,
      implicadas: resolverImplicadas(chave),
      descricao: cond.descricao,
      modificadores: modificadoresAchatados(chave)
    }
  }]);

  if (anunciar) await _cardEvento(actor, {
    icone: "fa-person-circle-exclamation", classe: "condicao",
    titulo: game.i18n.format("ORDEM.Condicao.Recebeu", { nome: cond.nome }),
    texto: cond.descricao
  });

  // Perdendo o Foco (Arquivos Secretos 01): atordoado/exausto/pasmo fazem o
  // conjurador deixar de reter TODOS os rituais imediatamente (só recupera máximo).
  const perdeFoco = SAH_CONFIG.reterRitual?.condicoesPerdeFoco ?? [];
  if (perdeFoco.includes(chave) && (actor.system.rituaisRetidos?.length ?? 0) > 0) {
    if (anunciar) await _cardEvento(actor, {
      icone: "fa-link-slash", classe: "condicao",
      titulo: game.i18n.localize("ORDEM.ReterRitual.PerdeFoco"),
      texto: game.i18n.format("ORDEM.ReterRitual.PerdeFocoTexto", { condicao: cond.nome })
    });
    let guard = 0;
    while ((actor.system.rituaisRetidos?.length ?? 0) > 0 && guard++ < 50) {
      await liberarRitual(actor, 0, { modo: "livre" });
    }
  }
  return item;
}

/**
 * Aplica um MODIFICADOR TEMPORÁRIO ao ator (ex.: −5 Defesa da Investida) como um
 * item transitório do tipo "condicao", reutilizando a expiração por turnos de
 * {@link _tickModificadores}. O item é marcado com a flag `temporario` para que
 * `novaCena` possa limpá-lo. `duracao` é em turnos (1 = até o próximo turno do ator).
 *
 * @param {OrdemActor} actor
 * @param {object}     opcoes
 * @param {string}     opcoes.alvo     Alvo do modificador (ex.: "defesa", "dados.ataque")
 * @param {number}     opcoes.valor    Valor (pode ser negativo)
 * @param {number}     [opcoes.duracao=1]  Duração em turnos
 * @param {string}     [opcoes.nome]   Nome exibido do efeito
 * @param {string}     [opcoes.rotulo] Descrição curta
 * @param {string}     [opcoes.icone]  Caminho do ícone
 */
export async function aplicarModificadorTemporario(actor, { alvo, valor, duracao = 1, nome = "", rotulo = "", icone = "icons/svg/downgrade.svg" } = {}) {
  if (!actor || !alvo) return null;
  const itemData = {
    name: nome || rotulo || game.i18n.localize("ORDEM.Mod.Temporario"),
    type: "condicao",
    img: icone,
    system: {
      ativo: true,
      chave: "",
      implicadas: [],
      descricao: rotulo,
      modificadores: [{ alvo, valor, duracao, restante: duracao, ativo: true, rotulo: rotulo || alvo }]
    },
    flags: { "ordem-paranormal": { temporario: true } }
  };
  const [criado] = await actor.createEmbeddedDocuments("Item", [itemData]);
  return criado ?? null;
}

/** Remove uma condição do ator pela chave do catálogo. */
export async function removerCondicao(actor, chave, { anunciar = true } = {}) {
  const item = actor?.items.find(i => i.type === "condicao" && i.system.chave === chave);
  if (!item) return false;
  const nome = item.name;
  await item.delete();
  if (anunciar) await _cardEvento(actor, {
    icone: "fa-circle-check", classe: "condicao fim",
    titulo: game.i18n.format("ORDEM.Condicao.Removida", { nome }),
    texto: ""
  });
  return true;
}

/**
 * Abre o seletor de condições oficiais para aplicar ao ator
 * (ou criar uma condição personalizada em branco).
 */
export async function abrirSeletorCondicao(actor) {
  if (!actor) return;
  const ativas = actor.condicoesAtivas?.() ?? new Set();
  const botoes = Object.entries(CONDICOES).map(([chave, c]) => {
    const tem = actor.items.some(i => i.type === "condicao" && i.system.chave === chave);
    return `<button type="button" class="op-cond-opcao ${tem ? "tem" : ""}" data-chave="${chave}" title="${c.descricao.replaceAll('"', "&quot;")}">
      <img src="${c.icone}" alt="" /> ${c.nome}${ativas.has(chave) && !tem ? " <small>(implicada)</small>" : ""}
    </button>`;
  }).join("");

  const conteudo = `<div class="op-cond-seletor">
    <p class="hint">${game.i18n.localize("ORDEM.Condicao.SeletorAjuda")}</p>
    <div class="op-cond-grade">${botoes}</div>
  </div>`;

  return new Promise(resolve => {
    const dlg = new Dialog({
      title: game.i18n.format("ORDEM.Condicao.SeletorTitulo", { nome: actor.name }),
      content: conteudo,
      buttons: {
        custom: {
          icon: '<i class="fas fa-plus"></i>',
          label: game.i18n.localize("ORDEM.Condicao.Personalizada"),
          callback: async () => {
            const [criado] = await actor.createEmbeddedDocuments("Item", [{
              name: game.i18n.format("ORDEM.Item.Novo", { tipo: game.i18n.localize("ORDEM.TipoItem.condicao") }),
              type: "condicao", system: {}
            }]);
            criado?.sheet?.render(true);
            resolve(criado);
          }
        },
        fechar: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize("ORDEM.Dialog.Cancelar"),
          callback: () => resolve(null)
        }
      },
      default: "fechar",
      render: (html) => {
        html.find(".op-cond-opcao").on("click", async ev => {
          const chave = ev.currentTarget.dataset.chave;
          await aplicarCondicao(actor, chave);
          dlg.close();
          resolve(chave);
        });
      }
    }, { classes: ["ordem-paranormal", "dialog", "op-cond-dialog"], width: 520 });
    dlg.render(true);
  });
}

/* -------------------------------------------------------------------------- */
/*  FERIMENTOS, MORTE & SANIDADE (Capítulo 4)                                  */
/* -------------------------------------------------------------------------- */

/**
 * Calcula o dano efetivo sobre uma criatura considerando imunidade,
 * vulnerabilidade e Resistência a Dano (RD) do tipo informado.
 * @param {OrdemActor} actor
 * @param {number}     dano
 * @param {string}     [tipo]   Chave do tipo de dano (balistico, sangue, ...)
 * @returns {{ final:number, imune:boolean, vulneravel:boolean, rd:number }}
 * @private
 */
function _danoEfetivoCriatura(actor, dano, tipo = "") {
  const sys = actor.system;
  const t = String(tipo || "").toLowerCase();

  // Imunidade ao tipo de dano → ignora todo o dano.
  const imunidades = Array.isArray(sys.imunidades) ? sys.imunidades : [];
  if (t && imunidades.includes(t)) return { final: 0, imune: true, vulneravel: false, rd: 0 };

  // Vulnerabilidade → dano dobrado.
  const vulns = Array.isArray(sys.vulnerabilidades) ? sys.vulnerabilidades : [];
  const vulneravel = !!t && vulns.includes(t);
  let valor = vulneravel ? dano * 2 : dano;

  // Resistência a Dano (RD): entrada específica do tipo ou genérica ("todos"/"").
  const rdList = Array.isArray(sys.rd) ? sys.rd : [];
  const espec = rdList.find(e => String(e.tipo || "").toLowerCase() === t && t);
  const geral = rdList.find(e => !e.tipo || ["todos", ""].includes(String(e.tipo).toLowerCase()));
  const rd = Number((espec ?? geral)?.valor) || 0;

  return { final: Math.max(0, valor - rd), imune: false, vulneravel, rd };
}

/**
 * Aplica dano físico a um ator, com as regras automáticas:
 *  - Criaturas: aplica imunidade / vulnerabilidade / RD pelo tipo de dano;
 *  - PV nunca fica negativo;
 *  - Agentes: 0 PV → "inconsciente" + "morrendo"; dano massivo → Fortitude.
 *
 * @param {OrdemActor} actor
 * @param {number}     dano
 * @param {object}     [opts]
 * @param {string}     [opts.tipo]  Tipo de dano (para RD/imunidade/vulnerabilidade)
 */
export async function aplicarDano(actor, dano, { tipo = "" } = {}) {
  if (!actor || !(dano > 0)) return;
  const pv = actor.system.recursos?.pv;
  if (!pv) return;

  // Criaturas reduzem o dano por RD/imunidade/vulnerabilidade.
  let danoFinal = dano;
  if (actor.type === "criatura") {
    const calc = _danoEfetivoCriatura(actor, dano, tipo);
    danoFinal = calc.final;
    const nota = calc.imune ? game.i18n.localize("ORDEM.Criatura.DanoImune")
      : calc.vulneravel ? game.i18n.format("ORDEM.Criatura.DanoVulneravel", { dano: danoFinal })
      : calc.rd ? game.i18n.format("ORDEM.Criatura.DanoRD", { rd: calc.rd, dano: danoFinal })
      : null;
    if (nota) ui.notifications.info(`${actor.name}: ${nota}`);
  }

  const anterior = Number(pv.value) || 0;
  const novo = Math.max(0, anterior - danoFinal);
  await actor.update({ "system.recursos.pv.value": novo });

  // Criaturas não usam morrendo/dano massivo — a 0 PV são derrotadas.
  if (actor.type !== "agente") {
    if (novo <= 0 && anterior > 0) {
      await _cardEvento(actor, {
        icone: "fa-skull", classe: "morte",
        titulo: game.i18n.format("ORDEM.Criatura.Derrotada", { nome: actor.name }),
        texto: ""
      });
    }
    return novo;
  }

  // Dano massivo: ≥ metade dos PV totais de uma só vez e não foi a 0.
  const max = Number(pv.max) || 0;
  if (novo > 0 && max > 0 && dano >= Math.floor(max / 2)) {
    const dt = 15 + Math.floor(dano / 10) * 2;
    await _cardEvento(actor, {
      icone: "fa-heart-crack", classe: "aviso",
      titulo: game.i18n.localize("ORDEM.Morte.DanoMassivo"),
      texto: game.i18n.format("ORDEM.Morte.DanoMassivoTexto", { dano, dt })
    });
  }
  // A transição para 0 PV (morrendo) é tratada pelo hook updateActor.
  return novo;
}

/** Aplica dano mental (Sanidade). SAN 0 → condição "enlouquecendo" (via hook). */
export async function aplicarDanoMental(actor, dano) {
  if (!actor || !(dano > 0)) return;
  const san = actor.system.recursos?.san;
  if (!san) return;
  // TODO(SaH): Compreensão Humana — quando `usaCompreensaoHumana(actor)`, aplicar
  // os limiares/efeitos de SAH_CONFIG.compreensao. Por ora usa a regra padrão.
  const novo = Math.max(0, (Number(san.value) || 0) - dano);
  await actor.update({ "system.recursos.san.value": novo });
  return novo;
}

/** Cura PV (encerra inconsciente/morrendo automaticamente via hook). */
export async function curar(actor, valor) {
  if (!actor || !(valor > 0)) return;
  const pv = actor.system.recursos?.pv;
  if (!pv) return;
  const novo = Math.min(Number(pv.max) || 0, (Number(pv.value) || 0) + valor);
  await actor.update({ "system.recursos.pv.value": novo });
  return novo;
}

/** Recupera Sanidade (encerra enlouquecendo automaticamente via hook). */
export async function recuperarSanidade(actor, valor) {
  if (!actor || !(valor > 0)) return;
  const san = actor.system.recursos?.san;
  if (!san) return;
  const novo = Math.min(Number(san.max) || 0, (Number(san.value) || 0) + valor);
  await actor.update({ "system.recursos.san.value": novo });
  return novo;
}

/**
 * Marca o início de um turno MORRENDO. Ao iniciar mais de três turnos
 * morrendo na mesma cena, o personagem morre (Livro de Regras, pág. 88).
 */
export async function marcarTurnoMorrendo(actor) {
  if (!actor) return;
  const atual = (Number(actor.system.recursos?.pv?.rodadasMorrendo) || 0) + 1;
  await actor.update({ "system.recursos.pv.rodadasMorrendo": atual });

  if (atual >= 3) {
    await aplicarCondicao(actor, "morto", { anunciar: false });
    await _cardEvento(actor, {
      icone: "fa-skull-crossbones", classe: "morte",
      titulo: game.i18n.localize("ORDEM.Morte.Morreu"),
      texto: game.i18n.format("ORDEM.Morte.MorreuTexto", { nome: actor.name })
    });
  } else {
    await _cardEvento(actor, {
      icone: "fa-skull", classe: "morte",
      titulo: game.i18n.format("ORDEM.Morte.TurnoMorrendo", { atual, max: 3 }),
      texto: game.i18n.localize("ORDEM.Morte.TurnoMorrendoTexto")
    });
  }
  return atual;
}

/**
 * Tenta ESTABILIZAR um personagem morrendo: o socorrista rola Medicina
 * (DT 20). Sucesso: remove "morrendo" (alvo continua inconsciente) e zera o
 * contador de turnos.
 *
 * @param {OrdemActor} medico  Quem realiza o teste de Medicina
 * @param {OrdemActor} alvo    Personagem morrendo
 */
export async function estabilizar(medico, alvo) {
  if (!medico || !alvo) return ui.notifications.warn(game.i18n.localize("ORDEM.Aviso.SemAtor"));
  const resultado = await rolarTeste(medico, {
    periciaKey: "medicina",
    titulo: game.i18n.format("ORDEM.Morte.EstabilizarTitulo", { nome: alvo.name }),
    cd: 20
  });
  if (!resultado) return;
  if (resultado.sucesso) {
    await removerCondicao(alvo, "morrendo", { anunciar: false });
    await alvo.update({ "system.recursos.pv.rodadasMorrendo": 0 });
    await _cardEvento(alvo, {
      icone: "fa-kit-medical", classe: "sucesso",
      titulo: game.i18n.localize("ORDEM.Morte.Estabilizado"),
      texto: game.i18n.format("ORDEM.Morte.EstabilizadoTexto", { nome: alvo.name, medico: medico.name })
    });
  }
  return resultado;
}

/**
 * Marca o início de um turno ENLOUQUECENDO. Ao iniciar mais de três turnos
 * enlouquecendo na mesma cena, o personagem fica insano (NPC do Mestre).
 */
export async function marcarTurnoEnlouquecendo(actor) {
  if (!actor) return;
  // TODO(SaH): Compreensão Humana — `usaCompreensaoHumana(actor)` pode trocar
  // o limiar/efeito de enlouquecer (SAH_CONFIG.compreensao). Padrão por ora.
  const atual = (Number(actor.system.recursos?.san?.rodadasEnlouquecendo) || 0) + 1;
  await actor.update({ "system.recursos.san.rodadasEnlouquecendo": atual });

  if (atual >= 3) {
    await aplicarCondicao(actor, "insano", { anunciar: false });
    await _cardEvento(actor, {
      icone: "fa-brain", classe: "morte",
      titulo: game.i18n.localize("ORDEM.San.Insano"),
      texto: game.i18n.format("ORDEM.San.InsanoTexto", { nome: actor.name })
    });
  } else {
    await _cardEvento(actor, {
      icone: "fa-ghost", classe: "morte",
      titulo: game.i18n.format("ORDEM.San.TurnoEnlouquecendo", { atual, max: 3 }),
      texto: game.i18n.localize("ORDEM.San.TurnoEnlouquecendoTexto")
    });
  }
  return atual;
}

/**
 * Tenta ACALMAR um personagem enlouquecendo: teste de Diplomacia (DT 20).
 * Sucesso: remove "enlouquecendo" e zera o contador.
 *
 * @param {OrdemActor} diplomata  Quem realiza o teste de Diplomacia
 * @param {OrdemActor} alvo       Personagem enlouquecendo
 */
export async function acalmar(diplomata, alvo) {
  if (!diplomata || !alvo) return ui.notifications.warn(game.i18n.localize("ORDEM.Aviso.SemAtor"));
  const resultado = await rolarTeste(diplomata, {
    periciaKey: "diplomacia",
    titulo: game.i18n.format("ORDEM.San.AcalmarTitulo", { nome: alvo.name }),
    cd: 20
  });
  if (!resultado) return;
  if (resultado.sucesso) {
    await removerCondicao(alvo, "enlouquecendo", { anunciar: false });
    await alvo.update({ "system.recursos.san.rodadasEnlouquecendo": 0 });
    await _cardEvento(alvo, {
      icone: "fa-hand-holding-heart", classe: "sucesso",
      titulo: game.i18n.localize("ORDEM.San.Acalmado"),
      texto: game.i18n.format("ORDEM.San.AcalmadoTexto", { nome: alvo.name, diplomata: diplomata.name })
    });
  }
  return resultado;
}

/* -------------------------------------------------------------------------- */
/*  PODERES — USO, CUSTO E PRÉ-REQUISITOS                                      */
/* -------------------------------------------------------------------------- */

/**
 * Usa um poder: valida PE (com modificador de custo, ex.: alquebrado),
 * controla usos por cena e publica o card com a descrição.
 *
 * @param {OrdemActor} actor
 * @param {Item}       item   Item do tipo "poder"
 */
export async function usarPoder(actor, item) {
  if (!actor || !item) return;
  const sys = item.system;

  // Controle de usos por cena (0 = ilimitado).
  const usosMax = Number(sys.usosPorCena) || 0;
  const usosAtuais = Number(sys.usosAtuais) || 0;
  if (usosMax > 0 && usosAtuais >= usosMax) {
    return ui.notifications.warn(game.i18n.format("ORDEM.Poder.UsosEsgotados", { nome: item.name, max: usosMax }));
  }

  // Custo em PE (condições como alquebrado aumentam o custo).
  const modCusto = Number(actor.system.modificadores?.["custoPe"]) || 0;
  let custo = Number(sys.custoPe) || 0;
  if (custo > 0) custo = Math.max(0, custo + modCusto);
  let peGastoInfo = "";
  if (custo > 0) {
    const peAtual = Number(actor.system.recursos?.pe?.value) || 0;
    if (custo > peAtual) {
      return ui.notifications.warn(game.i18n.format("ORDEM.Aviso.PEInsuficiente", { custo, atual: peAtual }));
    }
    await actor.update({ "system.recursos.pe.value": peAtual - custo });
    peGastoInfo = ` <span class="pe-gasto">(−${custo} PE)</span>`;
  }

  if (usosMax > 0) await item.update({ "system.usosAtuais": usosAtuais + 1 });

  const meta = [];
  meta.push(game.i18n.localize(`ORDEM.TipoPoder.${sys.tipo || "passivo"}`));
  if (sys.paranormal) {
    meta.push(game.i18n.localize("ORDEM.Poder.Paranormal")
      + (sys.elemento ? ` (${game.i18n.localize(`ORDEM.Elemento.${sys.elemento}`)})` : ""));
  }
  if (custo) meta.push(`${custo} PE`);
  if (usosMax > 0) meta.push(game.i18n.format("ORDEM.Poder.Usos", { atual: usosAtuais + 1, max: usosMax }));

  const descricao = await TextEditor.enrichHTML(sys.descricao ?? "");
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `
    <div class="ordem-chat-card item poder">
      <header class="card-header">
        <img src="${item.img}" alt="${item.name}" />
        <h3>${item.name}</h3>
        <span class="atributo">${game.i18n.localize("ORDEM.TipoItem.poder")}</span>
      </header>
      <div class="card-content">
        <div class="meta">${meta.join(" &bull; ")}${peGastoInfo}</div>
        <div class="descricao">${descricao}</div>
      </div>
    </div>`,
    flags: { "ordem-paranormal": { tipo: "poder" } }
  });
}

/**
 * Verifica os pré-requisitos de um poder para um ator (NEX, classe, elemento
 * de afinidade). Retorna lista de avisos (vazia = ok). Não bloqueia.
 */
export function verificarPrerequisitosPoder(actor, item) {
  const avisos = [];
  const sys = item.system;
  const nex = Number(actor.system.nex) || 0;
  if (Number(sys.requisitoNex) > 0 && nex < Number(sys.requisitoNex)) {
    avisos.push(game.i18n.format("ORDEM.Poder.AvisoNex", { req: sys.requisitoNex, atual: nex }));
  }
  if (sys.classe && actor.system.classe && sys.classe !== actor.system.classe) {
    avisos.push(game.i18n.format("ORDEM.Poder.AvisoClasse", {
      req: game.i18n.localize(ORDEM.classes[sys.classe] ?? sys.classe)
    }));
  }
  if (sys.paranormal && sys.elemento && actor.system.afinidade && sys.elemento !== actor.system.afinidade) {
    avisos.push(game.i18n.format("ORDEM.Poder.AvisoElemento", {
      req: game.i18n.localize(`ORDEM.Elemento.${sys.elemento}`)
    }));
  }
  return avisos;
}

/* -------------------------------------------------------------------------- */
/*  TRILHAS — HABILIDADES POR NEX                                              */
/* -------------------------------------------------------------------------- */

/**
 * Usa uma habilidade de trilha (pelo índice na lista do item): valida o NEX,
 * desconta PE e publica o card.
 *
 * @param {OrdemActor} actor
 * @param {Item}       item    Item do tipo "trilha"
 * @param {number}     index   Índice em system.habilidades
 */
export async function usarHabilidadeTrilha(actor, item, index) {
  if (!actor || !item) return;
  const habs = item.system.habilidades ?? [];
  const hab = habs[index];
  if (!hab) return;

  const nex = Number(actor.system.nex) || 0;
  if (Number(hab.nex) > nex) {
    return ui.notifications.warn(game.i18n.format("ORDEM.Trilha.Bloqueada", { nex: hab.nex }));
  }

  const modCusto = Number(actor.system.modificadores?.["custoPe"]) || 0;
  let custo = Number(hab.custoPe) || 0;
  if (custo > 0) custo = Math.max(0, custo + modCusto);
  let peGastoInfo = "";
  if (custo > 0) {
    const peAtual = Number(actor.system.recursos?.pe?.value) || 0;
    if (custo > peAtual) {
      return ui.notifications.warn(game.i18n.format("ORDEM.Aviso.PEInsuficiente", { custo, atual: peAtual }));
    }
    await actor.update({ "system.recursos.pe.value": peAtual - custo });
    peGastoInfo = ` <span class="pe-gasto">(−${custo} PE)</span>`;
  }

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `
    <div class="ordem-chat-card item trilha">
      <header class="card-header">
        <img src="${item.img}" alt="${item.name}" />
        <h3>${Handlebars.escapeExpression(hab.nome || item.name)}</h3>
        <span class="atributo">${item.name} — NEX ${hab.nex}%</span>
      </header>
      <div class="card-content">
        ${custo ? `<div class="meta">${custo} PE${peGastoInfo}</div>` : ""}
        <div class="descricao">${Handlebars.escapeExpression(hab.descricao ?? "")}</div>
      </div>
    </div>`,
    flags: { "ordem-paranormal": { tipo: "trilha" } }
  });
}

/* -------------------------------------------------------------------------- */
/*  MANOBRAS DE COMBATE & AÇÕES ESPECIAIS DE DEFESA                            */
/* -------------------------------------------------------------------------- */

/**
 * Rola uma MANOBRA DE COMBATE (agarrar, derrubar, desarmar, empurrar,
 * quebrar, atropelar): teste de Luta oposto. Se houver exatamente um alvo
 * marcado (targeted), o teste de Luta do alvo é rolado automaticamente como
 * oposição e vira a CD; caso contrário a CD é informada manualmente.
 *
 * @param {OrdemActor} actor
 * @param {string}     tipo   Chave em ORDEM.manobras
 */
export async function rolarManobra(actor, tipo) {
  if (!actor) return ui.notifications.warn(game.i18n.localize("ORDEM.Aviso.SemAtor"));
  if (!ORDEM.manobras[tipo]) return;

  // Oposição automática: rola a Luta do alvo marcado (se houver um).
  let cdOposta = null;
  const alvoToken = [...(game.user.targets ?? [])][0];
  const alvo = alvoToken?.actor;
  if (alvo) {
    let dados = 0, bonus = 0;
    if (alvo.type === "agente") {
      const calc = alvo.system.periciasCalc?.luta ?? {};
      dados = Number(calc.dados ?? alvo.system.atributosEfetivos?.for ?? 0);
      bonus = Number(calc.bonus ?? 0);
    } else {
      dados = Number(alvo.system.atributos?.for ?? 0);
    }
    const menor = dados <= 0;
    const f = menor ? "2d20kl" : `${dados}d20kh`;
    const rollAlvo = await (new Roll(f)).evaluate();
    cdOposta = rollAlvo.total + bonus;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: alvo }),
      content: `<div class="ordem-chat-card teste">
        <header class="card-header"><i class="fas fa-shield-halved"></i>
          <h3>${game.i18n.format("ORDEM.Manobra.Oposicao", { nome: alvo.name })}</h3>
          <span class="atributo">${game.i18n.localize("ORDEM.Pericia.luta")}</span>
        </header>
        <div class="card-content"><div class="conta">
          <span class="parcela total">${cdOposta}</span>
        </div></div>
      </div>`,
      rolls: [rollAlvo],
      sound: CONFIG.sounds.dice,
      flags: { "ordem-paranormal": { tipo: "teste" } }
    });
  }

  return rolarTeste(actor, {
    manobra: tipo,
    cd: cdOposta ?? 15
  });
}

/**
 * Publica o card de uma AÇÃO ESPECIAL DE DEFESA (bloqueio, esquiva,
 * contra-ataque) com os valores calculados do agente. Exige o treinamento
 * adequado (Fortitude/Reflexos/Luta) — avisa, mas não bloqueia.
 */
export async function acaoDefesa(actor, tipo) {
  if (!actor) return;
  const sys = actor.system;
  const reqPericia = { bloqueio: "fortitude", esquiva: "reflexos", contraataque: "luta" }[tipo];
  if (!reqPericia) return;

  const treinada = (Number(sys.pericias?.[reqPericia]?.treino) || 0) > 0;
  if (!treinada) {
    ui.notifications.warn(game.i18n.format("ORDEM.Defesa.ExigeTreino", {
      pericia: game.i18n.localize(`ORDEM.Pericia.${reqPericia}`)
    }));
  }

  const bonus = Number(sys.periciasCalc?.[reqPericia]?.bonus) || 0;
  let texto = "";
  if (tipo === "bloqueio") {
    texto = game.i18n.format("ORDEM.Defesa.BloqueioTexto", { rd: bonus });
  } else if (tipo === "esquiva") {
    texto = game.i18n.format("ORDEM.Defesa.EsquivaTexto", {
      bonus, defesa: (Number(sys.defesa?.total) || 10) + bonus
    });
  } else {
    texto = game.i18n.localize("ORDEM.Defesa.ContraAtaqueTexto");
  }

  await _cardEvento(actor, {
    icone: tipo === "bloqueio" ? "fa-shield" : tipo === "esquiva" ? "fa-person-running" : "fa-hand-fist",
    classe: "defesa",
    titulo: game.i18n.localize(`ORDEM.Defesa.${tipo === "contraataque" ? "ContraAtaque" : tipo === "bloqueio" ? "Bloqueio" : "Esquiva"}`),
    texto
  });
}

/**
 * Modal de AÇÕES DE COMBATE: reúne as manobras (teste de Luta oposto) e as
 * ações especiais de defesa em um único diálogo, mantendo a aba Combate limpa.
 * Clicar numa ação executa-a e fecha o modal.
 */
export async function abrirAcoesCombate(actor) {
  if (!actor) return ui.notifications.warn(game.i18n.localize("ORDEM.Aviso.SemAtor"));

  const manobrasHtml = Object.entries(ORDEM.manobras).map(([key, m]) =>
    `<button type="button" class="op-acao-btn" data-tipo="manobra" data-chave="${key}"
       title="${game.i18n.localize(`ORDEM.Manobra.Efeito.${key}`)}">
      <i class="fas ${m.icone}"></i> ${game.i18n.localize(`ORDEM.Manobra.${key}`)}
    </button>`).join("");

  const defs = { bloqueio: "fortitude", esquiva: "reflexos", contraataque: "luta" };
  const defIcone = { bloqueio: "fa-shield", esquiva: "fa-person-running", contraataque: "fa-hand-fist" };
  const defLabel = { bloqueio: "Bloqueio", esquiva: "Esquiva", contraataque: "ContraAtaque" };
  const defesasHtml = Object.entries(defs).map(([tipo, per]) => {
    const treinada = (Number(actor.system.pericias?.[per]?.treino) || 0) > 0;
    return `<button type="button" class="op-acao-btn ${treinada ? "" : "destreinada"}" data-tipo="defesa" data-chave="${tipo}"
       title="${game.i18n.localize(`ORDEM.Defesa.${defLabel[tipo]}Ajuda`)}">
      <i class="fas ${defIcone[tipo]}"></i> ${game.i18n.localize(`ORDEM.Defesa.${defLabel[tipo]}`)}
    </button>`;
  }).join("");

  const conteudo = `<div class="op-acoes-combate">
    <section>
      <h4><i class="fas fa-hand-fist"></i> ${game.i18n.localize("ORDEM.Manobra.Titulo")}</h4>
      <p class="hint">${game.i18n.localize("ORDEM.Manobra.Ajuda")}</p>
      <div class="op-acao-grade">${manobrasHtml}</div>
    </section>
    <section>
      <h4><i class="fas fa-shield-halved"></i> ${game.i18n.localize("ORDEM.Defesa.Titulo")}</h4>
      <p class="hint">${game.i18n.localize("ORDEM.Defesa.Ajuda")}</p>
      <div class="op-acao-grade">${defesasHtml}</div>
    </section>
  </div>`;

  const dlg = new Dialog({
    title: game.i18n.localize("ORDEM.Combate.AcoesTitulo"),
    content: conteudo,
    buttons: {
      fechar: {
        icon: '<i class="fas fa-times"></i>',
        label: game.i18n.localize("ORDEM.Dialog.Cancelar")
      }
    },
    default: "fechar",
    render: html => {
      html[0].querySelectorAll(".op-acao-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const { tipo, chave } = btn.dataset;
          dlg.close();
          if (tipo === "manobra") rolarManobra(actor, chave);
          else acaoDefesa(actor, chave);
        });
      });
    }
  }, { classes: ["ordem-paranormal", "op-theme", "dialog", "op-acoes-combate-dialog"], width: 460 });
  dlg.render(true);
}

/**
 * Rola a iniciativa do ator direto da ficha: garante um combate ativo e o
 * combatente do token do ator na cena, depois rola usando a fórmula do sistema
 * (perícia Iniciativa / statblock). Requer um token do ator na cena ativa.
 *
 * @param {OrdemActor} actor
 */
export async function rolarIniciativaAtor(actor) {
  if (!actor) return ui.notifications.warn(game.i18n.localize("ORDEM.Aviso.SemAtor"));

  const token = actor.getActiveTokens?.()[0] ?? actor.token?.object ?? null;
  let combat = game.combat;

  // Sem combate ativo: o Mestre cria um na cena atual.
  if (!combat) {
    if (!game.user.isGM) return ui.notifications.warn(game.i18n.localize("ORDEM.Iniciativa.SemCombate"));
    if (!canvas?.scene) return ui.notifications.warn(game.i18n.localize("ORDEM.Iniciativa.SemCena"));
    combat = await Combat.create({ scene: canvas.scene.id });
    await combat.activate?.();
  }

  // Encontra (ou cria) o combatente do ator.
  let comb = combat.combatants.find(c => c.actorId === actor.id);
  if (!comb) {
    if (!token) return ui.notifications.warn(game.i18n.localize("ORDEM.Iniciativa.SemToken"));
    const criados = await combat.createEmbeddedDocuments("Combatant", [{
      tokenId: token.id, sceneId: token.scene?.id ?? canvas.scene.id, actorId: actor.id
    }]);
    comb = criados[0];
  }
  if (!comb) return;

  await combat.rollInitiative([comb.id]);
  ui.notifications.info(game.i18n.format("ORDEM.Iniciativa.Rolada", { nome: actor.name }));
}

/* -------------------------------------------------------------------------- */
/*  CRIATURAS — TESTES, ATAQUES, HABILIDADES E PRESENÇA PERTURBADORA           */
/* -------------------------------------------------------------------------- */

/** Lê o par { dados, bonus } de um ramo do statblock da criatura. @private */
function _statCriatura(actor, caminho) {
  const v = foundry.utils.getProperty(actor.system, caminho) ?? {};
  return { dados: Math.max(0, Number(v.dados) || 0), bonus: Number(v.bonus) || 0 };
}

/**
 * Rola um teste do statblock da criatura (Percepção, Iniciativa, Fortitude,
 * Reflexos, Vontade ou um atributo): NⓄkh + bônus, e publica o card.
 *
 * @param {OrdemActor} actor
 * @param {string} chave  "sentidos.percepcao" | "sentidos.iniciativa" |
 *                        "saves.fortitude" | "saves.reflexos" | "saves.vontade" |
 *                        "atributo:agi" (rola pelo atributo, sem bônus)
 * @param {string} [rotulo]  Rótulo exibido no card
 */
export async function rolarTesteCriatura(actor, chave, rotulo) {
  if (!actor) return;
  let dados = 0, bonus = 0, label = rotulo || "";

  if (chave.startsWith("atributo:")) {
    const atr = chave.split(":")[1];
    dados = Math.max(0, Number(actor.system.atributos?.[atr]) || 0);
    label = label || game.i18n.localize(ORDEM.atributos[atr] ?? "");
  } else if (chave.startsWith("pericia:")) {
    const idx = Number(chave.split(":")[1]);
    const p = (actor.system.periciasLista ?? [])[idx];
    if (!p) return;
    dados = Math.max(0, Number(p.dados) || 0);
    bonus = avaliarFormulaPassiva(p.bonus, actor);
    label = label || (p.pericia ? game.i18n.localize(`ORDEM.Pericia.${p.pericia}`) : (p.nome || "—"));
  } else {
    ({ dados, bonus } = _statCriatura(actor, chave));
    const mapa = {
      "sentidos.percepcao": "ORDEM.Pericia.percepcao",
      "sentidos.iniciativa": "ORDEM.Pericia.iniciativa",
      "saves.fortitude": "ORDEM.Pericia.fortitude",
      "saves.reflexos": "ORDEM.Pericia.reflexos",
      "saves.vontade": "ORDEM.Pericia.vontade"
    };
    label = label || game.i18n.localize(mapa[chave] ?? chave);
  }

  const menor = dados <= 0;
  const qtd = menor ? 2 : dados;
  const roll = await (new Roll(menor ? `${qtd}d20kl` : `${qtd}d20kh`)).evaluate();
  const natural = roll.dice[0].results.find(r => r.active)?.result ?? roll.total;
  const total = natural + bonus;
  const critico = natural === 20, desastre = natural === 1;

  const resultados = roll.dice[0].results.map(r => {
    const cls = ["ordem-die", r.active ? "mantido" : "", r.result === 20 ? "max" : "", r.result === 1 ? "min" : ""].filter(Boolean).join(" ");
    return `<span class="${cls}">${r.result}</span>`;
  }).join("");

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `
    <div class="ordem-chat-card teste">
      <header class="card-header">
        <i class="fas fa-dice-d20"></i>
        <h3>${label}</h3>
        <span class="atributo">${actor.name}</span>
      </header>
      <div class="card-content">
        <div class="dados-lancados">${resultados}</div>
        <div class="conta">
          <span class="parcela escolhido">${natural}</span>
          <span class="op">${bonus >= 0 ? "+" : ""}</span>
          <span class="parcela bonus">${Math.abs(bonus)}</span>
          <span class="op">=</span>
          <span class="parcela total">${total}</span>
        </div>
      </div>
      ${critico || desastre ? `<footer class="card-footer ${critico ? "critico" : "desastre"}">${game.i18n.localize(critico ? "ORDEM.Resultado.Critico" : "ORDEM.Resultado.Desastre")}</footer>` : ""}
    </div>`,
    rolls: [roll],
    sound: CONFIG.sounds.dice,
    flags: { "ordem-paranormal": { tipo: "teste" } }
  });

  return { roll, total, natural, critico, desastre };
}

/**
 * Rola um ataque estruturado de criatura: (dados)d20kh + bônus, com card de
 * resultado (ação, alcance e multiplicador de ataques) e botão de dano.
 *
 * @param {OrdemActor} actor   Criatura
 * @param {number}     index   Índice em system.ataquesLista
 */
export async function rolarAtaqueCriatura(actor, index) {
  if (!actor) return;
  const atk = (actor.system.ataquesLista ?? [])[index];
  if (!atk) return;

  const dados = Math.max(0, Number(atk.dados) || 0);
  // Bônus aceita fórmula (ex.: "FOR+5") — resolvido para inteiro.
  const bonus = avaliarFormulaPassiva(atk.bonus, actor);
  const menor = dados <= 0;
  const qtd = menor ? 2 : dados;
  const formula = menor ? `${qtd}d20kl` : `${qtd}d20kh`;
  const roll = await (new Roll(formula)).evaluate();
  const natural = roll.dice[0].results.find(r => r.active)?.result ?? roll.total;
  const total = natural + bonus;
  const critico = natural === 20;
  const desastre = natural === 1;

  // Dano com atributos resolvidos contra a própria criatura (ex.: "2d6+FOR").
  const danoResolvido = resolverTokensFormula(atk.dano ?? "", actor);

  const resultados = roll.dice[0].results.map(r => {
    const cls = ["ordem-die", r.active ? "mantido" : "", r.result === 20 ? "max" : "", r.result === 1 ? "min" : ""].filter(Boolean).join(" ");
    return `<span class="${cls}">${r.result}</span>`;
  }).join("");

  // Linha de meta: ação · alcance (×mult).
  const acaoLabel = atk.acao ? game.i18n.localize(`ORDEM.AcaoTipo.${atk.acao}`) : "";
  const alcanceLabel = atk.alcance === "distancia"
    ? game.i18n.localize("ORDEM.Criatura.Distancia")
    : game.i18n.localize("ORDEM.Criatura.CorpoACorpo");
  const mult = Number(atk.multiplicador) || 1;
  const metaAtk = [acaoLabel, `${alcanceLabel}${mult > 1 ? ` ×${mult}` : ""}`].filter(Boolean).join(" · ");

  const nomeAtk = Handlebars.escapeExpression(atk.nome || game.i18n.localize("ORDEM.Criatura.Ataque"));
  const danoBtn = danoResolvido ? `<div class="card-botoes">
    <button type="button" class="ordem-card-botao" data-acao="dano-formula"
      data-formula="${Handlebars.escapeExpression(critico ? _dobrarDados(danoResolvido) : danoResolvido)}"
      data-nome="${nomeAtk}" data-tipo="${Handlebars.escapeExpression(atk.tipoDano ?? "")}">
      <i class="fas fa-burst"></i> ${critico ? game.i18n.localize("ORDEM.Dano.RolarCritico") : game.i18n.localize("ORDEM.Dano.Rolar")}
      <span class="dano-preview">(${Handlebars.escapeExpression(danoResolvido)}${atk.tipoDano ? " " + Handlebars.escapeExpression(atk.tipoDano) : ""})</span>
    </button>
  </div>` : "";

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `
    <div class="ordem-chat-card teste criatura-atk">
      <header class="card-header">
        <i class="fas fa-khanda"></i>
        <h3>${nomeAtk}</h3>
        <span class="atributo">${game.i18n.localize("ORDEM.Criatura.Ataque")}</span>
      </header>
      <div class="card-content">
        ${metaAtk ? `<div class="meta">${metaAtk}</div>` : ""}
        <div class="dados-lancados">${resultados}</div>
        <div class="conta">
          <span class="parcela escolhido">${natural}</span>
          <span class="op">${bonus >= 0 ? "+" : ""}</span>
          <span class="parcela bonus">${Math.abs(bonus)}</span>
          <span class="op">=</span>
          <span class="parcela total">${total}</span>
        </div>
        ${atk.efeito ? `<div class="hab-linha"><i class="fas fa-bolt"></i> ${Handlebars.escapeExpression(atk.efeito)}</div>` : ""}
        ${danoBtn}
      </div>
      <footer class="card-footer ${critico ? "critico" : desastre ? "desastre" : "neutro"}">
        ${critico ? game.i18n.localize("ORDEM.Resultado.Critico") : desastre ? game.i18n.localize("ORDEM.Resultado.Desastre") : game.i18n.format("ORDEM.Criatura.VsDefesa", { total })}
      </footer>
    </div>`,
    rolls: [roll],
    sound: CONFIG.sounds.dice,
    flags: { "ordem-paranormal": { tipo: "teste" } }
  });

  return { roll, total, natural, critico, desastre };
}

/**
 * Usa uma habilidade estruturada de criatura (desconta PE da criatura, se houver).
 */
export async function usarHabilidadeCriatura(actor, index) {
  if (!actor) return;
  const hab = (actor.system.habilidadesLista ?? [])[index];
  if (!hab) return;

  const custo = Number(hab.custoPe) || 0;
  let peGastoInfo = "";
  if (custo > 0) {
    const pe = actor.system.recursos?.pe;
    const peAtual = Number(pe?.value) || 0;
    if (pe && custo > peAtual) {
      return ui.notifications.warn(game.i18n.format("ORDEM.Aviso.PEInsuficiente", { custo, atual: peAtual }));
    }
    if (pe) {
      await actor.update({ "system.recursos.pe.value": peAtual - custo });
      peGastoInfo = ` <span class="pe-gasto">(−${custo} PE)</span>`;
    }
  }

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `
    <div class="ordem-chat-card item criatura-hab">
      <header class="card-header">
        <img src="${actor.img}" alt="${actor.name}" />
        <h3>${Handlebars.escapeExpression(hab.nome || "—")}</h3>
        <span class="atributo">${game.i18n.localize("ORDEM.Criatura.Habilidade")}</span>
      </header>
      <div class="card-content">
        ${custo ? `<div class="meta">${custo} PE${peGastoInfo}</div>` : ""}
        <div class="descricao">${Handlebars.escapeExpression(hab.descricao ?? "")}</div>
      </div>
    </div>`,
    flags: { "ordem-paranormal": { tipo: "criatura" } }
  });
}

/**
 * PRESENÇA PERTURBADORA (Origem Paranormal): ao enxergar a criatura, cada
 * agente faz um teste de Vontade (CD = DT da criatura). Falha = dano mental
 * total; sucesso = metade. Agentes com NEX ≥ ao limite são imunes.
 *
 * Solicita a Vontade de todos os agentes na cena via Pedido de Teste e posta
 * um lembrete com a DT, o dano mental e o NEX de imunidade.
 */
export async function presencaPerturbadora(actor) {
  if (!actor) return;
  const presenca = actor.system.presenca ?? {};
  const dt = Number(presenca.dt ?? actor.system.presencaPerturbadora) || 0;
  if (dt <= 0) return ui.notifications.warn(game.i18n.localize("ORDEM.Criatura.SemPresenca"));

  const danoMental = presenca.dano || "";
  const nexImune = Number(presenca.nexImune) || 0;

  const tokens = (canvas?.tokens?.placeables ?? []).filter(t => t.actor?.type === "agente");
  if (!tokens.length) return ui.notifications.warn(game.i18n.localize("ORDEM.PT.SemTokens"));

  // Lembrete narrativo com os parâmetros da Presença Perturbadora.
  await _cardEvento(actor, {
    icone: "fa-eye", classe: "morte",
    titulo: game.i18n.format("ORDEM.Criatura.PresencaTitulo", { nome: actor.name }),
    texto: game.i18n.format("ORDEM.Criatura.PresencaTexto", {
      dt,
      dano: danoMental || "—",
      nex: nexImune
    })
  });

  // Pede a Vontade dos agentes não imunes pelo NEX.
  const alvos = tokens.filter(t => !(nexImune > 0 && (Number(t.actor.system.nex) || 0) >= nexImune));
  if (!alvos.length) return ui.notifications.info(game.i18n.localize("ORDEM.Criatura.TodosImunes"));

  return criarPedidoTeste({
    titulo: game.i18n.format("ORDEM.Criatura.PresencaTitulo", { nome: actor.name }),
    periciaKey: "vontade",
    cd: dt,
    tokens: alvos
  });
}

/* -------------------------------------------------------------------------- */
/*  EDITOR DE RESISTÊNCIAS & DANOS (modal da Criatura)                         */
/* -------------------------------------------------------------------------- */

/** Linha de RD do modal (tipo de dano + valor). @private */
function _linhaRD(tipo = "todos", valor = 5) {
  const opts = [
    { value: "todos", label: game.i18n.localize("ORDEM.Criatura.TipoTodos") },
    ...ORDEM.tiposDano.map(v => ({ value: v, label: game.i18n.localize(`ORDEM.TipoDano.${v}`) }))
  ].map(o => `<option value="${o.value}" ${o.value === tipo ? "selected" : ""}>${o.label}</option>`).join("");
  return `<div class="rd-linha" >
    <select class="rd-tipo">${opts}</select>
    <span class="rd-valor">RD <input class="rd-val" type="number" value="${Number(valor) || 0}" min="0" /></span>
    <a class="rd-remover" title="${game.i18n.localize("ORDEM.Custom.Remover")}"><i class="fas fa-trash"></i></a>
  </div>`;
}

/**
 * Abre um MODAL para editar Resistência a Dano (RD), Imunidades e
 * Vulnerabilidades de uma criatura. Salva em system.rd / imunidades /
 * vulnerabilidades (usados no cálculo automático de dano).
 *
 * @param {OrdemActor} actor  Criatura
 */
export async function editarResistenciasDanos(actor) {
  if (!actor) return;
  const sys = actor.system ?? {};
  const rd = Array.isArray(sys.rd) ? sys.rd : [];
  const imunes = Array.isArray(sys.imunidades) ? sys.imunidades : [];
  const vulns = Array.isArray(sys.vulnerabilidades) ? sys.vulnerabilidades : [];

  const danoChecks = (selecionados, classe) => ORDEM.tiposDano.map(t =>
    `<label class="op-check"><input type="checkbox" class="${classe}" value="${t}" ${selecionados.includes(t) ? "checked" : ""} /> ${game.i18n.localize(`ORDEM.TipoDano.${t}`)}</label>`
  ).join("");
  const condChecks = ORDEM.categoriasCondicao.map(c =>
    `<label class="op-check"><input type="checkbox" class="op-imune" value="${c}" ${imunes.includes(c) ? "checked" : ""} /> ${game.i18n.localize("ORDEM.Criatura.CondLabel")}: ${game.i18n.localize(`ORDEM.CondCategoria.${c}`)}</label>`
  ).join("");

  const conteudo = `<form class="ordem-resist-danos">
    <fieldset>
      <legend><i class="fas fa-shield-halved"></i> ${game.i18n.localize("ORDEM.Criatura.RD")}</legend>
      <p class="hint">${game.i18n.localize("ORDEM.Criatura.RDAjuda")}</p>
      <div class="rd-lista">${rd.map(e => _linhaRD(e.tipo, e.valor)).join("")}</div>
      <a class="botao-adicionar rd-add"><i class="fas fa-plus"></i> ${game.i18n.localize("ORDEM.Criatura.RD")}</a>
    </fieldset>
    <fieldset>
      <legend><i class="fas fa-ban"></i> ${game.i18n.localize("ORDEM.Campo.imunidades")}</legend>
      <div class="op-checks">${danoChecks(imunes, "op-imune")}${condChecks}</div>
    </fieldset>
    <fieldset>
      <legend><i class="fas fa-heart-crack"></i> ${game.i18n.localize("ORDEM.Criatura.Vulnerabilidades")}</legend>
      <div class="op-checks">${danoChecks(vulns, "op-vuln")}</div>
    </fieldset>
  </form>`;

  return new Promise(resolve => {
    const dlg = new Dialog({
      title: game.i18n.format("ORDEM.Criatura.ResistDanosTitulo", { nome: actor.name }),
      content: conteudo,
      buttons: {
        salvar: {
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n.localize("ORDEM.NEX.Aplicar"),
          callback: async html => {
            const root = html[0];
            const novoRd = [...root.querySelectorAll(".rd-linha")].map(l => ({
              tipo: l.querySelector(".rd-tipo")?.value || "todos",
              valor: Number(l.querySelector(".rd-val")?.value) || 0
            }));
            const novImunes = [...root.querySelectorAll(".op-imune:checked")].map(c => c.value);
            const novVulns = [...root.querySelectorAll(".op-vuln:checked")].map(c => c.value);
            await actor.update({
              "system.rd": novoRd,
              "system.imunidades": novImunes,
              "system.vulnerabilidades": novVulns
            });
            resolve(true);
          }
        },
        cancelar: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize("ORDEM.Dialog.Cancelar"),
          callback: () => resolve(false)
        }
      },
      default: "salvar",
      render: html => {
        const root = html[0];
        root.querySelector(".rd-add")?.addEventListener("click", ev => {
          ev.preventDefault();
          root.querySelector(".rd-lista")?.insertAdjacentHTML("beforeend", _linhaRD());
        });
        root.addEventListener("click", ev => {
          const rem = ev.target.closest(".rd-remover");
          if (rem) { ev.preventDefault(); rem.closest(".rd-linha")?.remove(); }
        });
      }
    }, { classes: ["ordem-paranormal", "op-theme", "dialog", "op-resist-danos-dialog"], width: 520 });
    dlg.render(true);
  });
}

/* -------------------------------------------------------------------------- */
/*  NOVA CENA — RESET DE RECURSOS POR CENA                                     */
/* -------------------------------------------------------------------------- */

/**
 * Marca o início de uma NOVA CENA (Mestre): zera contadores de turnos
 * morrendo/enlouquecendo e os usos por cena dos poderes de todos os tokens.
 * Lembra o Mestre de remover condições que terminam no fim da cena.
 */
export async function novaCena() {
  if (!game.user.isGM) return ui.notifications.warn(game.i18n.localize("ORDEM.Aviso.SemPermissao"));

  const atores = new Set((canvas?.tokens?.placeables ?? []).map(t => t.actor).filter(Boolean));
  for (const actor of atores) {
    const update = {};
    if (actor.system.recursos?.pv?.rodadasMorrendo) update["system.recursos.pv.rodadasMorrendo"] = 0;
    if (actor.system.recursos?.san?.rodadasEnlouquecendo) update["system.recursos.san.rodadasEnlouquecendo"] = 0;
    if (Object.keys(update).length) await actor.update(update);

    // Zera usos por cena dos poderes.
    const poderes = actor.items.filter(i => i.type === "poder" && Number(i.system.usosAtuais) > 0);
    for (const p of poderes) await p.update({ "system.usosAtuais": 0 });

    // Remove modificadores temporários (ex.: guarda aberta da Investida) que
    // tenham sobrado fora de combate.
    const temporarios = actor.items.filter(i =>
      i.getFlag?.("ordem-paranormal", "temporario") === true).map(i => i.id);
    if (temporarios.length) await actor.deleteEmbeddedDocuments("Item", temporarios);
  }

  await ChatMessage.create({
    content: `<div class="ordem-chat-card evento"><div class="card-content">
      <i class="fas fa-clapperboard"></i> <strong>${game.i18n.localize("ORDEM.Cena.Nova")}</strong> —
      ${game.i18n.localize("ORDEM.Cena.NovaTexto")}
    </div></div>`,
    flags: { "ordem-paranormal": { tipo: "evento" } }
  });
}

/* -------------------------------------------------------------------------- */
/*  INTERLÚDIO — RECUPERAÇÃO ENTRE CENAS (Capítulo 4, pág. 92-93)              */
/* -------------------------------------------------------------------------- */

/**
 * Abre o diálogo de INTERLÚDIO para um agente: escolha da ação (dormir,
 * relaxar, exercitar-se, ler, revisar caso, manutenção) e da condição de
 * descanso (precária ×½, normal ×1, confortável ×2, luxuosa ×3).
 *
 * - Dormir:  recupera PV e PE = limite de PE por rodada × multiplicador.
 * - Relaxar: como dormir, mas recupera SAN (+1 por participante que relaxar).
 * - Exercitar-se / Ler: bônus de +1d6 em um teste físico/mental na missão.
 * - Revisar caso: teste de perícia para obter uma pista complementar.
 */
export async function abrirInterludio(actor) {
  if (!actor) return ui.notifications.warn(game.i18n.localize("ORDEM.Aviso.SemAtor"));
  const base = Number(actor.system.peRodada) || 1;

  const acoes = ["dormir", "relaxar", "exercitar", "ler", "revisar", "manutencao"];
  const acoesHtml = acoes.map((a, i) =>
    `<option value="${a}" ${i === 0 ? "selected" : ""}>${game.i18n.localize(`ORDEM.Interludio.Acao.${a}`)}</option>`
  ).join("");

  const descansos = [
    { key: "precaria",    mult: 0.5 },
    { key: "normal",      mult: 1 },
    { key: "confortavel", mult: 2 },
    { key: "luxuosa",     mult: 3 }
  ];
  const descansoHtml = descansos.map(d =>
    `<option value="${d.mult}" ${d.mult === 1 ? "selected" : ""}>${game.i18n.localize(`ORDEM.Interludio.Descanso.${d.key}`)}</option>`
  ).join("");

  const conteudo = `<form class="ordem-roll-dialog">
    <p class="roll-info">${game.i18n.format("ORDEM.Interludio.Info", { base })}</p>
    <div class="form-group">
      <label>${game.i18n.localize("ORDEM.Interludio.AcaoLabel")}</label>
      <select name="acao">${acoesHtml}</select>
    </div>
    <div class="form-group">
      <label>${game.i18n.localize("ORDEM.Interludio.DescansoLabel")}</label>
      <select name="descanso">${descansoHtml}</select>
    </div>
    <p class="hint">${game.i18n.localize("ORDEM.Interludio.Ajuda")}</p>
  </form>`;

  return new Promise(resolve => {
    new Dialog({
      title: game.i18n.format("ORDEM.Interludio.Titulo", { nome: actor.name }),
      content: conteudo,
      buttons: {
        aplicar: {
          icon: '<i class="fas fa-mug-hot"></i>',
          label: game.i18n.localize("ORDEM.Interludio.Realizar"),
          callback: async html => {
            const form = html[0].querySelector("form");
            const acao = form.acao.value;
            const mult = Number(form.descanso.value) || 1;
            const valor = Math.floor(base * mult);

            if (acao === "dormir") {
              const pv = actor.system.recursos?.pv, pe = actor.system.recursos?.pe;
              const update = {};
              if (pv) update["system.recursos.pv.value"] = Math.min(Number(pv.max) || 0, (Number(pv.value) || 0) + valor);
              if (pe) update["system.recursos.pe.value"] = Math.min(Number(pe.max) || 0, (Number(pe.value) || 0) + valor);
              await actor.update(update);
              await _cardEvento(actor, {
                icone: "fa-bed", classe: "sucesso",
                titulo: game.i18n.localize("ORDEM.Interludio.Acao.dormir"),
                texto: game.i18n.format("ORDEM.Interludio.DormirTexto", { valor })
              });
            } else if (acao === "relaxar") {
              const san = actor.system.recursos?.san;
              if (san) await actor.update({
                "system.recursos.san.value": Math.min(Number(san.max) || 0, (Number(san.value) || 0) + valor)
              });
              await _cardEvento(actor, {
                icone: "fa-spa", classe: "sucesso",
                titulo: game.i18n.localize("ORDEM.Interludio.Acao.relaxar"),
                texto: game.i18n.format("ORDEM.Interludio.RelaxarTexto", { valor })
              });
            } else if (acao === "exercitar" || acao === "ler") {
              await _cardEvento(actor, {
                icone: acao === "exercitar" ? "fa-dumbbell" : "fa-book-open",
                titulo: game.i18n.localize(`ORDEM.Interludio.Acao.${acao}`),
                texto: game.i18n.localize(`ORDEM.Interludio.${acao === "exercitar" ? "Exercitar" : "Ler"}Texto`)
              });
            } else if (acao === "revisar") {
              await rolarTeste(actor, { titulo: game.i18n.localize("ORDEM.Interludio.Acao.revisar") });
              await _cardEvento(actor, {
                icone: "fa-folder-open",
                titulo: game.i18n.localize("ORDEM.Interludio.Acao.revisar"),
                texto: game.i18n.localize("ORDEM.Interludio.RevisarTexto")
              });
            } else {
              await _cardEvento(actor, {
                icone: "fa-screwdriver-wrench",
                titulo: game.i18n.localize("ORDEM.Interludio.Acao.manutencao"),
                texto: game.i18n.localize("ORDEM.Interludio.ManutencaoTexto")
              });
            }
            resolve(acao);
          }
        },
        cancelar: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize("ORDEM.Dialog.Cancelar"),
          callback: () => resolve(null)
        }
      },
      default: "aplicar"
    }, { classes: ["ordem-paranormal", "dialog"] }).render(true);
  });
}

/**
 * Ação de Ajuda: o ajudante rola uma perícia contra DT 10 para conceder
 * bônus ao líder. Bônus = +1 por sucesso + +1 a cada 10 pontos acima da DT.
 *
 * @param {OrdemActor} actor      Ator ajudante
 * @param {string}     periciaKey Chave da perícia usada para ajudar
 */
export async function rolarAjuda(actor, periciaKey) {
  if (!actor) return ui.notifications.warn(game.i18n.localize("ORDEM.Aviso.SemAtor"));

  const DT_AJUDA = 10;
  const pericias = Object.keys(ORDEM.pericias);
  const periciaOptions = pericias.map(k => {
    const label = game.i18n.localize(`ORDEM.Pericia.${k}`);
    const sel = k === periciaKey ? " selected" : "";
    return `<option value="${k}"${sel}>${label}</option>`;
  }).join("");

  const conteudo = `<form class="ordem-roll-dialog">
    <div class="form-group">
      <label>${game.i18n.localize("ORDEM.Ajuda.LiderLabel")}</label>
      <input type="text" name="lider" placeholder="${game.i18n.localize("ORDEM.Ajuda.LiderPlaceholder")}" />
    </div>
    <div class="form-group">
      <label>${game.i18n.localize("ORDEM.Ajuda.PericiaLabel")}</label>
      <select name="pericia">${periciaOptions}</select>
    </div>
  </form>`;

  return new Promise(resolve => {
    new Dialog({
      title: game.i18n.localize("ORDEM.Ajuda.Titulo"),
      content: conteudo,
      buttons: {
        rolar: {
          icon: '<i class="fas fa-hands-helping"></i>',
          label: game.i18n.localize("ORDEM.Dialog.Rolar"),
          callback: async html => {
            const form = html[0].querySelector("form");
            const lider = form.lider.value.trim() || game.i18n.localize("ORDEM.Ajuda.LiderPadrao");
            const pericia = form.pericia.value || periciaKey;

            // Executa o teste contra DT 10, sem diálogo extra.
            const cfg   = ORDEM.pericias[pericia] ?? { atributo: "int" };
            const calc  = actor.system.periciasCalc?.[pericia] ?? {};
            const atributo = calc.atributo || cfg.atributo;
            const baseDados = Number(actor.system.atributosEfetivos?.[atributo] ?? actor.system.atributos?.[atributo] ?? 0);
            const periciaBonus = Number(calc.bonus ?? 0);
            const pericias = actor.system.pericias?.[pericia] ?? {};
            const periciaTreinada = (Number(pericias.treino) || 0) > 0;

            const menorMelhor = baseDados <= 0;
            const qtd = menorMelhor ? 2 : baseDados;
            const formula = menorMelhor ? `${qtd}d20kl` : `${qtd}d20kh`;
            const roll = await (new Roll(formula)).evaluate();
            const natural = roll.dice[0].results.find(r => r.active)?.result ?? roll.total;
            const total = natural + periciaBonus;
            const sucesso = total >= DT_AJUDA;

            // Bônus concedido: +1 base se sucesso, +1 por cada 10 acima da DT.
            const bonus = sucesso ? 1 + Math.floor((total - DT_AJUDA) / 10) : 0;

            const resultLabel = sucesso
              ? game.i18n.format("ORDEM.Ajuda.Sucesso", { bonus, lider })
              : game.i18n.localize("ORDEM.Ajuda.Falha");
            const classeRes = sucesso ? "sucesso" : "falha";
            const periciaLabel = game.i18n.localize(`ORDEM.Pericia.${pericia}`);
            const atribLabel   = game.i18n.localize(ORDEM.atributos[atributo] ?? "");
            const resultados   = roll.dice[0].results.map(r => {
              const cls = ["ordem-die", r.active ? "mantido" : "", r.result === 20 ? "max" : "", r.result === 1 ? "min" : ""].filter(Boolean).join(" ");
              return `<span class="${cls}">${r.result}</span>`;
            }).join("");

            const sinal = periciaBonus >= 0 ? "+" : "";
            const conteudoCard = `
            <div class="ordem-chat-card teste">
              <header class="card-header">
                <i class="fas fa-hand-holding-heart"></i>
                <h3>${game.i18n.localize("ORDEM.Ajuda.Titulo")}</h3>
                <span class="atributo">${periciaLabel} · ${atribLabel}</span>
              </header>
              <div class="card-content">
                <div class="dados-lancados">${resultados}</div>
                <div class="conta">
                  <span class="parcela escolhido">${natural}</span>
                  <span class="op">${sinal}</span>
                  <span class="parcela bonus">${Math.abs(periciaBonus)}</span>
                  <span class="op">=</span>
                  <span class="parcela total">${total}</span>
                </div>
                <div class="cd-linha">${game.i18n.localize("ORDEM.Card.CD")}: <strong>${DT_AJUDA}</strong></div>
                ${sucesso ? `<div class="hab-linha">${game.i18n.format("ORDEM.Ajuda.CardHint", { bonus, lider })}</div>` : ""}
              </div>
              <footer class="card-footer ${classeRes}">${resultLabel}</footer>
            </div>`;

            await ChatMessage.create({
              speaker: ChatMessage.getSpeaker({ actor }),
              content: conteudoCard,
              rolls: [roll],
              sound: CONFIG.sounds.dice,
              flags: { "ordem-paranormal": { tipo: "ajuda" } }
            });

            resolve({ roll, sucesso, bonus, total });
          }
        },
        cancelar: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize("ORDEM.Dialog.Cancelar"),
          callback: () => resolve(null)
        }
      },
      default: "rolar"
    }, { classes: ["ordem-paranormal", "dialog"] }).render(true);
  });
}

/**
 * Conjura um ritual — fluxo completo:
 *  1. Diálogo com os dados do ritual, APRIMORAMENTOS selecionáveis (+PE) e
 *     notas de afinidade/opressão elemental contra o alvo marcado;
 *  2. Desconta o PE total (base + aprimoramentos, com modificador de custo);
 *  3. "O Custo do Paranormal" (Ocultismo vs DT 15 + PE GASTO) ou, para Medo,
 *     "Invocando o Medo" (sem teste, mas dano mental = custo + −1 SAN permanente);
 *  4. Card com execução/alcance/área/duração, resistência (com botão para o
 *     alvo rolar) e efeito.
 */
export async function conjurarRitual(actor, item) {
  if (!actor) return ui.notifications.warn(game.i18n.localize("ORDEM.Aviso.SemAtor"));
  const sys = item.system;
  const custoBase = Number(sys.custoPe) || 0;

  // ---- Notas elementais (afinidade do conjurador / opressão sobre o alvo) ----
  const notas = [];
  const afinidadeAtiva = !!actor.system.afinidadeAtiva && actor.system.afinidade === sys.elemento;
  if (afinidadeAtiva) notas.push({ classe: "ok", icone: "fa-link", texto: game.i18n.localize("ORDEM.Ritual.AfinidadeSemComponentes") });

  const alvoToken = [...(game.user.targets ?? [])][0];
  const alvo = alvoToken?.actor;
  if (alvo?.type === "criatura" && alvo.system.elemento && sys.elemento) {
    if (ORDEM.opressao[sys.elemento] === alvo.system.elemento) {
      notas.push({ classe: "ok", icone: "fa-bolt", texto: game.i18n.format("ORDEM.Ritual.Opressor", {
        ritual: game.i18n.localize(`ORDEM.Elemento.${sys.elemento}`),
        alvo: game.i18n.localize(`ORDEM.Elemento.${alvo.system.elemento}`),
        nome: alvo.name
      }) });
    } else if (sys.elemento === alvo.system.elemento) {
      notas.push({ classe: "aviso", icone: "fa-shield", texto: game.i18n.format("ORDEM.Ritual.MesmoElemento", {
        nome: alvo.name,
        elemento: game.i18n.localize(`ORDEM.Elemento.${sys.elemento}`)
      }) });
    }
  }

  // ---- Diálogo de conjuração (aprimoramentos em TABELA + confirmação) ----
  const aprimoramentos = Array.isArray(sys.aprimoramentosLista) ? sys.aprimoramentosLista : [];
  const aprHtml = aprimoramentos.length ? `<table class="op-popup-tabela apr-tabela">
    <thead><tr>
      <th class="col-check"></th>
      <th>${game.i18n.localize("ORDEM.Campo.nome")}</th>
      <th class="col-pe">PE</th>
      <th>${game.i18n.localize("ORDEM.Campo.efeito")}</th>
    </tr></thead>
    <tbody>
      ${aprimoramentos.map((a, i) => `<tr>
        <td class="col-check"><input type="checkbox" name="apr" value="${i}" data-custo="${Number(a.custoPe) || 0}" /></td>
        <td class="col-nome">${Handlebars.escapeExpression(a.nome || "—")}</td>
        <td class="col-pe">+${Number(a.custoPe) || 0}</td>
        <td class="col-efeito">${Handlebars.escapeExpression(a.descricao || "")}</td>
      </tr>`).join("")}
    </tbody>
  </table>` : "";

  const metaLinhas = [];
  const addMeta = (rotuloKey, valor) => { if (valor) metaLinhas.push(`<b>${game.i18n.localize(rotuloKey)}:</b> ${Handlebars.escapeExpression(String(valor))}`); };
  addMeta("ORDEM.Campo.execucao", sys.execucao);
  addMeta("ORDEM.Campo.alcanceRitual", sys.alcance);
  addMeta("ORDEM.Campo.area", sys.area);
  addMeta("ORDEM.Campo.duracao", sys.duracao);
  addMeta("ORDEM.Campo.resistencia", sys.resistencia);

  const notasHtml = notas.map(n => `<p class="ritual-nota ${n.classe}"><i class="fas ${n.icone}"></i> ${n.texto}</p>`).join("");
  const peAtualInfo = Number(actor.system.recursos?.pe?.value) || 0;

  const conteudoDlg = `<form class="ordem-roll-dialog op-ritual-dialog">
    <p class="roll-info">${game.i18n.localize(`ORDEM.Elemento.${sys.elemento}`) ?? ""} · ${game.i18n.localize("ORDEM.Campo.circulo")} ${sys.circulo} · ${custoBase} PE
      <span class="pe-atual">(${game.i18n.localize("ORDEM.Dialog.PEAtual")}: ${peAtualInfo})</span></p>
    ${metaLinhas.length ? `<p class="ritual-meta">${metaLinhas.join(" &bull; ")}</p>` : ""}
    ${notasHtml}
    ${aprimoramentos.length ? `<fieldset class="op-habilidades"><legend>${game.i18n.localize("ORDEM.Campo.aprimoramentos")}</legend>${aprHtml}</fieldset>` : ""}
    ${permiteReterRitual(actor) ? `<label class="op-hab op-reter"><input type="checkbox" name="reter" /> ${game.i18n.localize("ORDEM.ReterRitual.Opcao")}</label>` : ""}
  </form>`;

  const escolha = await new Promise(resolve => {
    new Dialog({
      title: game.i18n.format("ORDEM.Ritual.ConjurarTitulo", { nome: item.name }),
      content: conteudoDlg,
      buttons: {
        conjurar: {
          icon: '<i class="fas fa-wand-sparkles"></i>',
          label: game.i18n.localize("ORDEM.Ritual.Conjurar"),
          callback: html => {
            const marcados = [...html[0].querySelectorAll("[name='apr']:checked")].map(cb => Number(cb.value));
            const reter = !!html[0].querySelector("[name='reter']")?.checked;
            resolve({ ok: true, aprIndices: marcados, reter });
          }
        },
        cancelar: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize("ORDEM.Dialog.Cancelar"),
          callback: () => resolve({ ok: false })
        }
      },
      default: "conjurar"
    }, { classes: ["ordem-paranormal", "dialog"], width: 460 }).render(true);
  });
  if (!escolha.ok) return;

  // ---- Custo total (base + aprimoramentos + modificador de condições) ----
  const aprUsados = escolha.aprIndices.map(i => aprimoramentos[i]).filter(Boolean);
  let custo = custoBase + aprUsados.reduce((s, a) => s + (Number(a.custoPe) || 0), 0);
  const modCusto = Number(actor.system.modificadores?.["custoPe"]) || 0;
  if (custo > 0) custo = Math.max(0, custo + modCusto);

  const peAtual = Number(actor.system.recursos?.pe?.value) || 0;
  if (custo > peAtual) {
    return ui.notifications.warn(game.i18n.format("ORDEM.Aviso.PEInsuficiente", { custo, atual: peAtual }));
  }

  // Limite de PE por rodada (nível de NEX).
  const limite = Number(actor.system.peRodada) || 0;
  if (limite > 0 && custo > limite) {
    ui.notifications.warn(game.i18n.format("ORDEM.Ritual.AcimaLimitePe", { custo, limite }));
  }

  // Desconta o PE do conjurador (recurso próprio).
  if (custo > 0) await actor.update({ "system.recursos.pe.value": peAtual - custo });

  // ---- Reter ritual (duração retida, modo SaH) ----
  // O PE retido sai também do MÁXIMO e custa SAN enquanto o ritual é mantido.
  let retidoHtml = "";
  if (escolha.reter && permiteReterRitual(actor) && custo > 0) {
    const cfg = SAH_CONFIG.reterRitual;
    const upd = {};
    if (cfg.reduzPeMaximo) {
      const bonusMax = Number(actor.system.recursos?.pe?.bonusMax) || 0;
      upd["system.recursos.pe.bonusMax"] = bonusMax - custo;
    }
    const custoSan = Number(cfg.custoSan) || 0;
    if (custoSan > 0) {
      const san = actor.system.recursos?.san;
      if (san) upd["system.recursos.san.value"] = Math.max(0, (Number(san.value) || 0) - custoSan);
    }
    const retidos = foundry.utils.deepClone(actor.system.rituaisRetidos ?? []);
    retidos.push({ nome: item.name, img: item.img, custoPe: custo, itemId: item.id });
    upd["system.rituaisRetidos"] = retidos;
    await actor.update(upd);
    retidoHtml = `<div class="ritual-custo retido"><i class="fas fa-anchor"></i> ${game.i18n.format("ORDEM.ReterRitual.Aplicado", { custo, san: custoSan })}</div>`;
  }

  // ---- "O Custo do Paranormal" / "Invocando o Medo" ----
  // Rituais de Medo NÃO exigem teste de Ocultismo, mas SEMPRE cobram o preço:
  // dano mental = custo em PE + perda PERMANENTE de 1 ponto de Sanidade
  // (2 na forma discente, 3 na verdadeira). Demais elementos: teste de Ocultismo
  // contra DT 15 + PE gasto (falha = dano mental; falha por 5+ = −1 SAN permanente).
  const ehMedo = (sys.elemento || "") === "medo";
  let custoHtml = "";
  let rolls = [];
  if (ehMedo && custo > 0) {
    const danoMental = custo;
    const perdaSan = 1;
    custoHtml = `<div class="ritual-custo falha">
      <div><i class="fas fa-ghost"></i> ${game.i18n.localize("ORDEM.Ritual.CustoMedo")}</div>
      <div>${game.i18n.format("ORDEM.Ritual.DanoMental", { dano: danoMental })} · ${game.i18n.localize("ORDEM.Ritual.PerdaPermanente")}</div>
      <button type="button" class="ordem-card-botao" data-acao="custo-paranormal" data-actor-uuid="${actor.uuid}" data-dano="${danoMental}" data-perda="${perdaSan}">
        <i class="fas fa-brain"></i> ${game.i18n.localize("ORDEM.Ritual.AplicarPerda")}
      </button>
    </div>`;
  } else if (custo > 0) {
    const dtCusto = 15 + custo;
    const calc = actor.system.periciasCalc?.ocultismo;
    const numDados = Number(calc?.dados ?? actor.system.atributosEfetivos?.int ?? 0);
    const bonus = Number(calc?.bonus ?? 0);
    const f = numDados <= 0 ? "2d20kl" : `${numDados}d20kh`;
    const rollOc = await (new Roll(f)).evaluate();
    rolls.push(rollOc);
    const nat = rollOc.dice[0].results.find(r => r.active)?.result ?? rollOc.total;
    const totalOc = nat + bonus;
    const falhou = totalOc < dtCusto;
    const falhaGrave = totalOc <= dtCusto - 5;
    if (falhou) {
      const danoMental = custo;
      const perdaSan = falhaGrave ? 1 : 0;
      custoHtml = `<div class="ritual-custo falha">
        <div><i class="fas fa-skull"></i> ${game.i18n.localize("ORDEM.Ritual.CustoFalhou")} (${totalOc} &lt; ${dtCusto})</div>
        <div>${game.i18n.format("ORDEM.Ritual.DanoMental", { dano: danoMental })}${perdaSan ? " · " + game.i18n.localize("ORDEM.Ritual.PerdaPermanente") : ""}</div>
        <button type="button" class="ordem-card-botao" data-acao="custo-paranormal" data-actor-uuid="${actor.uuid}" data-dano="${danoMental}" data-perda="${perdaSan}">
          <i class="fas fa-brain"></i> ${game.i18n.localize("ORDEM.Ritual.AplicarPerda")}
        </button>
      </div>`;
    } else {
      custoHtml = `<div class="ritual-custo ok"><i class="fas fa-check"></i> ${game.i18n.localize("ORDEM.Ritual.CustoResistido")} (${totalOc} ≥ ${dtCusto})</div>`;
    }
  }

  // ---- Card final ----
  const descricao = await TextEditor.enrichHTML(sys.efeito || sys.descricao || "");
  const meta = [];
  if (custo) meta.push(`${custo} PE`);
  if (sys.circulo) meta.push(`${game.i18n.localize("ORDEM.Campo.circulo")} ${sys.circulo}`);
  if (sys.elemento) meta.push(game.i18n.localize(`ORDEM.Elemento.${sys.elemento}`));

  const aprCardHtml = aprUsados.length
    ? `<div class="hab-linha"><i class="fas fa-arrow-up-right-dots"></i> ${aprUsados.map(a => Handlebars.escapeExpression(a.nome || "—")).join(" · ")}</div>`
    : "";

  // Linha de resistência + botão para o alvo rolar contra a DT do conjurador.
  let resistHtml = "";
  const dtConjurador = Number(actor.system.dtRituais) || 0;
  if (sys.resistenciaPericia) {
    resistHtml = `<div class="ritual-resist">
      <i class="fas fa-shield-halved"></i>
      ${game.i18n.format("ORDEM.Ritual.ResistenciaLinha", {
        pericia: game.i18n.localize(`ORDEM.Pericia.${sys.resistenciaPericia}`),
        dt: dtConjurador
      })}
      <button type="button" class="ordem-card-botao" data-acao="ritual-resistir" data-pericia="${sys.resistenciaPericia}" data-dt="${dtConjurador}">
        <i class="fas fa-dice-d20"></i> ${game.i18n.localize("ORDEM.Ritual.RolarResistencia")}
      </button>
    </div>`;
  }

  const notasCardHtml = notas.map(n => `<div class="hab-linha ${n.classe === "aviso" ? "aviso" : ""}"><i class="fas ${n.icone}"></i> ${n.texto}</div>`).join("");

  const conteudo = `
  <div class="ordem-chat-card ritual">
    <header class="card-header">
      <img src="${item.img}" alt="${item.name}" />
      <h3>${item.name}</h3>
      <span class="atributo">${game.i18n.localize("ORDEM.Ritual.Conjurar")}</span>
    </header>
    <div class="card-content">
      <div class="meta">${meta.join(" &bull; ")}${custo ? ` <span class="pe-gasto">(−${custo} PE)</span>` : ""}</div>
      ${metaLinhas.length ? `<div class="ritual-meta">${metaLinhas.join(" &bull; ")}</div>` : ""}
      ${aprCardHtml}
      ${notasCardHtml}
      ${custoHtml}
      ${retidoHtml}
      ${resistHtml}
      <div class="descricao">${descricao}</div>
    </div>
  </div>`;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: conteudo,
    rolls,
    flags: { "ordem-paranormal": { tipo: "ritual" } }
  });
}

/**
 * Libera um ritual retido (Arquivos Secretos 01). Pergunta como liberar:
 *  - Ação livre/reação: devolve o PE ao MÁXIMO retido (não ao atual).
 *  - Teste de Ocultismo (DT 20 + custo): se passar, devolve MÁXIMO e ATUAL;
 *    se falhar, devolve apenas o máximo.
 *
 * @param {OrdemActor} actor
 * @param {number}     indice  Índice em system.rituaisRetidos
 * @param {object}     [opcoes]
 * @param {"livre"|"teste"} [opcoes.modo]  Pula o diálogo se informado (ex.: "Perde Foco").
 */
export async function liberarRitual(actor, indice, { modo } = {}) {
  if (!actor) return;
  const retidos = foundry.utils.deepClone(actor.system.rituaisRetidos ?? []);
  const r = retidos[indice];
  if (!r) return;

  const cfg = SAH_CONFIG.reterRitual;
  const custoPe = Number(r.custoPe) || 0;
  const dt = (Number(cfg.dtOcultismoLiberar) || 20) + custoPe;

  // Escolha do modo de liberação (a menos que já informado pelo chamador).
  let escolha = modo;
  if (!escolha) {
    escolha = await new Promise(resolve => {
      new Dialog({
        title: game.i18n.format("ORDEM.ReterRitual.LiberarTitulo", { nome: r.nome }),
        content: `<p>${game.i18n.format("ORDEM.ReterRitual.LiberarPergunta", { custo: custoPe, dt })}</p>`,
        buttons: {
          livre:  { icon: '<i class="fas fa-link-slash"></i>', label: game.i18n.localize("ORDEM.ReterRitual.LiberarLivre"), callback: () => resolve("livre") },
          teste:  { icon: '<i class="fas fa-dice-d20"></i>',    label: game.i18n.localize("ORDEM.ReterRitual.LiberarTeste"), callback: () => resolve("teste") },
          cancel: { icon: '<i class="fas fa-times"></i>',       label: game.i18n.localize("ORDEM.Dialog.Cancelar"),          callback: () => resolve(null) }
        },
        default: "livre"
      }, { classes: ["ordem-paranormal", "dialog"] }).render(true);
    });
  }
  if (!escolha) return;

  // Teste de Ocultismo opcional para recuperar também o PE atual.
  let recuperaAtual = false;
  const rolls = [];
  let testeHtml = "";
  if (escolha === "teste") {
    const calc = actor.system.periciasCalc?.ocultismo;
    const numDados = Number(calc?.dados ?? actor.system.atributosEfetivos?.int ?? 0);
    const bonus = Number(calc?.bonus ?? 0);
    const roll = await (new Roll(numDados <= 0 ? "2d20kl" : `${numDados}d20kh`)).evaluate();
    rolls.push(roll);
    const nat = roll.dice[0].results.find(x => x.active)?.result ?? roll.total;
    const total = nat + bonus;
    recuperaAtual = total >= dt;
    testeHtml = recuperaAtual
      ? `<div class="ritual-custo ok"><i class="fas fa-check"></i> ${game.i18n.format("ORDEM.ReterRitual.TestePassou", { total, dt })}</div>`
      : `<div class="ritual-custo falha"><i class="fas fa-times"></i> ${game.i18n.format("ORDEM.ReterRitual.TesteFalhou", { total, dt })}</div>`;
  }

  const upd = {};
  const peRec = actor.system.recursos?.pe;
  if (cfg.reduzPeMaximo) {
    upd["system.recursos.pe.bonusMax"] = (Number(peRec?.bonusMax) || 0) + custoPe;
  }
  if (recuperaAtual) {
    upd["system.recursos.pe.value"] = (Number(peRec?.value) || 0) + custoPe;
  }
  retidos.splice(indice, 1);
  upd["system.rituaisRetidos"] = retidos;
  await actor.update(upd);

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="ordem-chat-card evento">
      <header class="card-header"><i class="fas fa-link-slash"></i>
        <h3>${game.i18n.format("ORDEM.ReterRitual.Liberado", { nome: r.nome })}</h3></header>
      <div class="card-content">
        <div class="descricao">${game.i18n.format("ORDEM.ReterRitual.LiberadoTexto", { custo: custoPe })}${recuperaAtual ? " " + game.i18n.localize("ORDEM.ReterRitual.RecuperouAtual") : ""}</div>
        ${testeHtml}
      </div></div>`,
    rolls,
    flags: { "ordem-paranormal": { tipo: "evento" } }
  });
}

/* -------------------------------------------------------------------------- */
/*  PROGRESSÃO DE NEX (LEVEL UP)                                               */
/* -------------------------------------------------------------------------- */

/** Valores iniciais (NEX 5%) de PV/PE/SAN para uma classe. @private */
function _valoresIniciais(info, atributos) {
  return {
    pv:  info.pv.inicial  + (info.pv.atributo  ? Number(atributos[info.pv.atributo])  || 0 : 0),
    pe:  info.pe.inicial  + (info.pe.atributo  ? Number(atributos[info.pe.atributo])  || 0 : 0),
    san: info.san.inicial + (info.san.atributo ? Number(atributos[info.san.atributo]) || 0 : 0)
  };
}

/** Ganho a cada novo nível de exposição (+5% de NEX). @private */
function _ganhosPorNivel(info, atributos) {
  return {
    pv:  info.pv.porNivel  + (info.pv.atributo  ? Number(atributos[info.pv.atributo])  || 0 : 0),
    pe:  info.pe.porNivel  + (info.pe.atributo  ? Number(atributos[info.pe.atributo])  || 0 : 0),
    san: info.san.porNivel + (info.san.atributo ? Number(atributos[info.san.atributo]) || 0 : 0)
  };
}

/**
 * Sobe o NEX do agente em um marco, aplicando os ganhos de PV/PE/SAN da classe
 * e anunciando a habilidade desbloqueada (Tabelas 1.3 / 1.4 / 1.5).
 *
 * @param {OrdemActor} actor   Agente a evoluir
 */
/** Captura o estado reversível do agente (para rollback de NEX). @private */
function _snapshotAgente(sys) {
  const rec = {};
  for (const k of ["pv", "pe", "san"]) {
    const r = sys.recursos?.[k] ?? {};
    rec[k] = { value: Number(r.value) || 0, bonusMax: Number(r.bonusMax) || 0 };
  }
  return {
    nex: Number(sys.nex) || 0,
    atributos: foundry.utils.deepClone(sys.atributos ?? {}),
    pericias: foundry.utils.deepClone(sys.pericias ?? {}),
    recursos: rec
  };
}

/**
 * Progressão por XP — modo "Sobrevivendo ao Horror" (NEX & Experiência).
 * STUB CABEADO: o fluxo existe e está ligado à ficha; os custos/conversão exatos
 * ficam em SAH_CONFIG.xp (TODO(SaH) até o texto da regra ser fornecido).
 *
 * Comportamento atual (placeholder): acumula XP; ao atingir o custo por marco,
 * gasta o XP e sobe um marco de NEX reaproveitando o fluxo padrão `subirNex`.
 */
export async function progredirXP(actor, ganho = 0) {
  if (!actor) return ui.notifications.warn(game.i18n.localize("ORDEM.Aviso.SemAtor"));
  const sys = actor.system;
  const xp = sys.xp ?? { atual: 0, total: 0 };
  // Custo por marco: setting do Mestre tem prioridade sobre o default do SAH_CONFIG.
  let custo = Number(SAH_CONFIG.xp.custoPorMarco) || 10;
  try {
    const s = Number(game.settings.get("ordem-paranormal", "xpCustoPorMarco"));
    if (Number.isFinite(s) && s > 0) custo = s;
  } catch (_e) { /* setting ainda não registrado: usa o default */ }

  // Soma o XP informado (ganho pode vir 0 → apenas abre o diálogo de gasto).
  let atual = (Number(xp.atual) || 0) + (Number(ganho) || 0);
  const total = (Number(xp.total) || 0) + (Number(ganho) || 0);

  if (atual < custo) {
    await actor.update({ "system.xp.atual": atual, "system.xp.total": total });
    return ui.notifications.info(game.i18n.format("ORDEM.XP.Acumulado", { atual, custo }));
  }

  // Gasta o custo e sobe um marco reaproveitando o fluxo padrão.
  atual -= custo;
  await actor.update({ "system.xp.atual": atual, "system.xp.total": total });
  return _subirNexMarco(actor);
}

/**
 * Sobe o NEX do agente. No modo SaH (XP), encaminha para `progredirXP`; no
 * modo padrão (ou quando chamado internamente) usa a progressão por marcos.
 */
export async function subirNex(actor) {
  if (!actor) return ui.notifications.warn(game.i18n.localize("ORDEM.Aviso.SemAtor"));
  // Modo Sobrevivendo ao Horror: progressão por experiência.
  if (usaXP(actor)) return progredirXP(actor, 0);
  return _subirNexMarco(actor);
}

/** Progressão por marcos de NEX (Livro de Regras). @private */
async function _subirNexMarco(actor) {
  const sys = actor.system;

  const info = ORDEM.classesInfo[sys.classe];
  if (!info) return ui.notifications.warn(game.i18n.localize("ORDEM.Aviso.SemClasse"));

  const nexAtual = Number(sys.nex) || 0;
  if (nexAtual >= 99) return ui.notifications.info(game.i18n.localize("ORDEM.Aviso.NexMaximo"));

  // Próximo marco: 0→5%, 95→99%, demais +5%.
  const novoNex = nexAtual < 5 ? 5 : (nexAtual >= 95 ? 99 : nexAtual + 5);
  const primeiro = nexAtual < 5;

  const ganho = primeiro ? _valoresIniciais(info, sys.atributosEfetivos ?? sys.atributos)
                         : _ganhosPorNivel(info, sys.atributosEfetivos ?? sys.atributos);
  const habilidade = info.progressao[novoNex] ?? "—";
  const classeLabel = game.i18n.localize(ORDEM.classes[sys.classe]);
  const aumentoAtributo = /aumento de atributo/i.test(habilidade);
  const grauTreinamento = /grau de treinamento/i.test(habilidade);
  const ganhaPoder      = /poder de (combatente|especialista|ocultista)/i.test(habilidade);
  const habTrilha       = /habilidade de trilha/i.test(habilidade);
  const versatilidade   = /versatilidade/i.test(habilidade);

  // Máximos previstos após subir (os máximos são derivados → atual + ganho).
  const novoMax = {};
  for (const k of ["pv", "pe", "san"]) novoMax[k] = (Number(sys.recursos?.[k]?.max) || 0) + ganho[k];
  const novoLimitePe = novoNex >= 99 ? 20 : Math.floor(novoNex / 5);

  // --- Opções para as escolhas automáticas do marco ---

  // Grau de treinamento: perícias já treinadas podem subir para veterano/expert.
  const periciasTreinaveis = Object.entries(sys.pericias ?? {})
    .filter(([, p]) => (Number(p.treino) || 0) > 0 && (Number(p.treino) || 0) < 15)
    .map(([key, p]) => {
      const atual = Number(p.treino) || 0;
      const proximo = atual >= 10 ? 15 : 10;
      return {
        value: key, proximo,
        label: `${game.i18n.localize(`ORDEM.Pericia.${key}`)} (+${atual} → +${proximo})`
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));

  // Poder de classe: itens "poder" do Mundo compatíveis com classe e novo NEX.
  const poderesDisponiveis = ganhaPoder
    ? game.items.filter(i => i.type === "poder"
        && (!i.system.classe || i.system.classe === sys.classe)
        && (Number(i.system.requisitoNex) || 0) <= novoNex
        && !actor.items.some(p => p.type === "poder" && p.name === i.name))
        .map(i => ({ value: i.id, label: `${i.name}${i.system.requisitoNex ? ` (NEX ${i.system.requisitoNex}%)` : ""}` }))
    : [];

  // Habilidade de trilha desbloqueada neste marco (informativo).
  const trilhaItem = actor.items.find(i => i.type === "trilha");
  const habsTrilhaNovas = (habTrilha && trilhaItem)
    ? (trilhaItem.system.habilidades ?? []).filter(h => Number(h.nex) === novoNex).map(h => h.nome || "—")
    : [];

  // Modal de diff (mostra tudo que muda; permite as escolhas do marco).
  const conteudoModal = await renderTemplate("systems/ordem-paranormal/templates/nex-modal.hbs", {
    classeLabel, nexAtual, novoNex, primeiro, ganho, novoMax, novoLimitePe,
    habilidade, aumentoAtributo,
    grauTreinamento, periciasTreinaveis,
    ganhaPoder, poderesDisponiveis,
    habTrilha, temTrilha: !!trilhaItem, trilhaNome: trilhaItem?.name ?? "", habsTrilhaNovas,
    versatilidade,
    atributoOptions: Object.keys(ORDEM.atributos).map(key => ({
      value: key, label: game.i18n.localize(ORDEM.atributos[key])
    }))
  });

  const escolha = await new Promise((resolve) => {
    new Dialog({
      title: game.i18n.format("ORDEM.NEX.SubirTitulo", { nex: novoNex }),
      content: conteudoModal,
      buttons: {
        aplicar: {
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n.localize("ORDEM.NEX.Aplicar"),
          callback: (html) => {
            const form = html[0];
            resolve({
              ok: true,
              atributo: form.querySelector("[name='atributoEscolhido']")?.value || "",
              periciaTreinamento: form.querySelector("[name='periciaTreinamento']")?.value || "",
              poderId: form.querySelector("[name='poderEscolhido']")?.value || ""
            });
          }
        },
        cancelar: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize("ORDEM.Dialog.Cancelar"),
          callback: () => resolve({ ok: false })
        }
      },
      default: "aplicar"
    }, { classes: ["ordem-paranormal", "op-theme", "dialog"], width: 460 }).render(true);
  });
  if (!escolha.ok) return;

  // Snapshot reversível ANTES de aplicar.
  const snapshotAnterior = _snapshotAgente(sys);

  // Monta o update: NEX + cura do ganho (máximos são derivados) + atributo.
  const update = { "system.nex": novoNex };
  for (const k of ["pv", "pe", "san"]) {
    update[`system.recursos.${k}.value`] = (Number(sys.recursos?.[k]?.value) || 0) + ganho[k];
  }
  let atributoAumentado = null;
  if (aumentoAtributo && escolha.atributo) {
    atributoAumentado = escolha.atributo;
    update[`system.atributos.${escolha.atributo}`] = (Number(sys.atributos?.[escolha.atributo]) || 0) + 1;
  }

  // Grau de treinamento: aplica o novo bônus na perícia escolhida.
  let treinamentoAplicado = null;
  if (grauTreinamento && escolha.periciaTreinamento) {
    const opc = periciasTreinaveis.find(p => p.value === escolha.periciaTreinamento);
    if (opc) {
      update[`system.pericias.${opc.value}.treino`] = opc.proximo;
      treinamentoAplicado = { pericia: opc.value, valor: opc.proximo };
    }
  }

  // Poder de classe: copia o item do Mundo para o agente.
  const itensAdicionados = [];
  let poderEscolhidoNome = null;
  if (ganhaPoder && escolha.poderId) {
    const fonte = game.items.get(escolha.poderId);
    if (fonte) {
      const [criado] = await actor.createEmbeddedDocuments("Item", [fonte.toObject()]);
      if (criado) {
        itensAdicionados.push(criado.id);
        poderEscolhidoNome = criado.name;
      }
    }
  }

  const historico = foundry.utils.deepClone(sys.progressao?.historico ?? []);
  historico.push({
    nex: novoNex,
    data: Date.now(),
    ganhos: ganho,
    habilidade,
    atributoAumentado,
    treinamentoAplicado,
    itensAdicionados,
    snapshotAnterior
  });
  update["system.progressao.historico"] = historico;

  await actor.update(update);

  // Card de chat anunciando a evolução.
  const conteudo = `
    <div class="ordem-chat-card nex">
      <header class="card-header">
        <i class="fas fa-arrow-up-right-dots"></i>
        <h3>${actor.name}</h3>
        <span class="atributo">NEX ${novoNex}%</span>
      </header>
      <div class="card-content">
        <div class="meta">${classeLabel} — ${game.i18n.localize("ORDEM.NEX.Subir")}</div>
        <div class="nex-ganhos-card">
          <span class="ordem-die mantido">+${ganho.pv} PV</span>
          <span class="ordem-die mantido">+${ganho.pe} PE</span>
          <span class="ordem-die mantido">+${ganho.san} SAN</span>
        </div>
        ${atributoAumentado ? `<div class="meta">+1 ${game.i18n.localize(ORDEM.atributos[atributoAumentado])}</div>` : ""}
        ${treinamentoAplicado ? `<div class="meta">${game.i18n.localize(`ORDEM.Pericia.${treinamentoAplicado.pericia}`)} → +${treinamentoAplicado.valor}</div>` : ""}
        ${poderEscolhidoNome ? `<div class="meta"><i class="fas fa-bolt"></i> ${poderEscolhidoNome}</div>` : ""}
        ${habsTrilhaNovas.length ? `<div class="meta"><i class="fas fa-route"></i> ${habsTrilhaNovas.join(" · ")}</div>` : ""}
        <div class="descricao"><i class="fas fa-star"></i> ${habilidade}</div>
      </div>
    </div>`;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: conteudo,
    flags: { "ordem-paranormal": { tipo: "nex" } }
  });
}

/**
 * Reverte a evolução para o estado anterior a uma entrada do histórico (volta a
 * um nível de NEX anterior). Restaura o snapshot e trunca o histórico.
 *
 * @param {OrdemActor} actor   Agente
 * @param {number}     index   Índice da entrada de histórico a desfazer (e tudo após)
 */
export async function voltarNex(actor, index) {
  if (!actor) return;
  const sys = actor.system;
  const hist = foundry.utils.deepClone(sys.progressao?.historico ?? []);
  const entry = hist[index];
  if (!entry || !entry.snapshotAnterior) return ui.notifications.warn(game.i18n.localize("ORDEM.Aviso.SemHistorico"));

  const snap = entry.snapshotAnterior;
  const confirmar = await Dialog.confirm({
    title: game.i18n.localize("ORDEM.NEX.VoltarTitulo"),
    content: `<p>${game.i18n.format("ORDEM.NEX.VoltarConfirma", { nex: snap.nex })}</p>`,
    options: { classes: ["ordem-paranormal", "op-theme", "dialog"] }
  });
  if (!confirmar) return;

  const update = {
    "system.nex": snap.nex,
    "system.atributos": snap.atributos,
    "system.pericias": snap.pericias,
    "system.progressao.historico": hist.slice(0, index)
  };
  for (const k of ["pv", "pe", "san"]) {
    update[`system.recursos.${k}.value`] = snap.recursos?.[k]?.value ?? 0;
    update[`system.recursos.${k}.bonusMax`] = snap.recursos?.[k]?.bonusMax ?? 0;
  }
  await actor.update(update);

  // Remove os itens (poderes) adicionados pelas escolhas dos marcos revertidos.
  const idsRemover = hist.slice(index)
    .flatMap(e => e.itensAdicionados ?? [])
    .filter(id => actor.items.has(id));
  if (idsRemover.length) await actor.deleteEmbeddedDocuments("Item", idsRemover);

  ui.notifications.info(game.i18n.format("ORDEM.NEX.Revertido", { nex: snap.nex }));
}

/* -------------------------------------------------------------------------- */
/*  HELPERS DE HANDLEBARS                                                      */
/* -------------------------------------------------------------------------- */

function _registrarHelpers() {
  // Igualdade estrita (usado nos templates para selecionar por tipo).
  Handlebars.registerHelper("ordemEq", (a, b) => a === b);

  // Concatenação simples de strings.
  Handlebars.registerHelper("ordemConcat", (...args) => {
    args.pop(); // remove o objeto de opções do Handlebars
    return args.join("");
  });

  // Capitaliza a primeira letra.
  Handlebars.registerHelper("ordemCap", (s) =>
    typeof s === "string" && s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s);

  // Percentual seguro para largura de barras (clamp 0-100).
  Handlebars.registerHelper("ordemPct", (value, max) => {
    const v = Number(value) || 0;
    const m = Number(max) || 0;
    if (m <= 0) return 0;
    return Math.clamp(Math.round((v / m) * 100), 0, 100);
  });
}

/** Pré-carrega os templates Handlebars (parciais e fichas). */
async function _preCarregarTemplates() {
  return loadTemplates([
    "systems/ordem-paranormal/templates/agente-sheet.hbs",
    "systems/ordem-paranormal/templates/criatura-sheet.hbs",
    "systems/ordem-paranormal/templates/item-sheet.hbs",
    "systems/ordem-paranormal/templates/roll-dialog.hbs",
    "systems/ordem-paranormal/templates/nex-modal.hbs",
    "systems/ordem-paranormal/templates/combat-carousel.hbs",
    "systems/ordem-paranormal/templates/teste-estendido.hbs",
    "systems/ordem-paranormal/templates/investigacao.hbs",
    "systems/ordem-paranormal/templates/pedido-teste.hbs",
    "systems/ordem-paranormal/templates/pedido-acao.hbs",
    "systems/ordem-paranormal/templates/cena-sah.hbs",
    "systems/ordem-paranormal/templates/sobre-licenca.hbs"
  ]);
}

/* -------------------------------------------------------------------------- */
/*  TESTES ESTENDIDOS                                                          */
/* -------------------------------------------------------------------------- */

const _TE_COMPLEXIDADE = { baixa: 3, media: 5, alta: 7 };

/**
 * Janela flutuante que rastreia um Teste Estendido (sucessos vs falhas).
 * Complexidade: baixa = 3 sucessos, média = 5, alta = 7. Máximo 3 falhas.
 */
class OrdemTesteEstendido extends Application {

  constructor(opcoes = {}) {
    super({ width: 360, height: "auto", resizable: false,
            title: game.i18n.localize("ORDEM.TE.Titulo"), classes: ["ordem-paranormal", "op-te"] });
    this.state = {
      titulo:              opcoes.titulo || game.i18n.localize("ORDEM.TE.Titulo"),
      complexidade:        opcoes.complexidade || "media",
      sucessosNecessarios: _TE_COMPLEXIDADE[opcoes.complexidade] ?? 5,
      sucessos:            0,
      falhas:              0,
      cd:                  opcoes.cd || 15,
      variacaoKey:         opcoes.variacao || "normal",
      historico:           []
    };
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/ordem-paranormal/templates/teste-estendido.hbs",
      classes: ["ordem-paranormal", "op-te"]
    });
  }

  getData() {
    const s = this.state;
    const concluido = s.sucessos >= s.sucessosNecessarios || s.falhas >= 3;
    const venceu    = s.sucessos >= s.sucessosNecessarios;

    const dots = (cheios, total) =>
      Array.from({ length: total }, (_, i) => ({ cheio: i < cheios }));

    return {
      titulo:              s.titulo,
      cd:                  s.cd,
      sucessos:            s.sucessos,
      sucessosNecessarios: s.sucessosNecessarios,
      falhas:              s.falhas,
      concluido,
      venceu,
      estadoClasse:        venceu ? "concluido" : "falha-total",
      estadoLabel:         game.i18n.localize(venceu ? "ORDEM.TE.Concluido" : "ORDEM.TE.FalhaTotal"),
      variacao:            s.variacaoKey !== "normal"
                             ? game.i18n.localize(`ORDEM.TE.Variacao.${s.variacaoKey}`) : "",
      sucessosDots:        dots(s.sucessos, s.sucessosNecessarios),
      falhasDots:          dots(s.falhas, 3),
      historico:           [...s.historico].reverse().slice(0, 10)
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find("[data-action='te-contribuir']").on("click", this._contribuir.bind(this));
  }

  /** Abre o diálogo de rolagem e registra o resultado no tracker. */
  async _contribuir() {
    const s = this.state;
    if (s.sucessos >= s.sucessosNecessarios || s.falhas >= 3) return;

    // Ajusta CD se variação "dificuldade crescente".
    const cd = s.variacaoKey === "crescente"
      ? s.cd + 2 * s.historico.length
      : s.cd;

    // Usa o diálogo de rolagem padrão do sistema (actor = ator selecionado).
    const actor = canvas?.tokens?.controlled[0]?.actor ?? game.user?.character;
    if (!actor) {
      return ui.notifications.warn(game.i18n.localize("ORDEM.Aviso.SemAtor"));
    }

    const resultado = await rolarTeste(actor, { titulo: `${s.titulo} (${game.i18n.localize("ORDEM.TE.Contribuir")})` });
    if (!resultado) return; // cancelado

    const sucesso = resultado.total >= cd;
    if (sucesso) s.sucessos++;
    else         s.falhas++;

    s.historico.push({
      total:        resultado.total,
      cd,
      resultado:    sucesso ? "sucesso" : "falha",
      resultadoLabel: game.i18n.localize(sucesso ? "ORDEM.Resultado.Sucesso" : "ORDEM.Resultado.Falha"),
      periciaLabel: actor.name
    });

    this.render();

    if (s.sucessos >= s.sucessosNecessarios)
      ui.notifications.info(game.i18n.localize("ORDEM.TE.Concluido"));
    else if (s.falhas >= 3)
      ui.notifications.warn(game.i18n.localize("ORDEM.TE.FalhaTotal"));
  }
}

/**
 * Abre o diálogo de criação de um Teste Estendido e exibe a janela de rastreamento.
 */
export async function abrirTesteEstendido() {
  const conteudo = `<form class="ordem-roll-dialog">
    <div class="form-group">
      <label>${game.i18n.localize("ORDEM.TE.TituloLabel")}</label>
      <input type="text" name="titulo" value="${game.i18n.localize("ORDEM.TE.Titulo")}" />
    </div>
    <div class="form-group">
      <label>${game.i18n.localize("ORDEM.TE.ComplexidadeLabel")}</label>
      <select name="complexidade">
        <option value="baixa">${game.i18n.localize("ORDEM.TE.Complexidade.baixa")} (3)</option>
        <option value="media" selected>${game.i18n.localize("ORDEM.TE.Complexidade.media")} (5)</option>
        <option value="alta">${game.i18n.localize("ORDEM.TE.Complexidade.alta")} (7)</option>
      </select>
    </div>
    <div class="form-group">
      <label>${game.i18n.localize("ORDEM.Dialog.CD")}</label>
      <input type="number" name="cd" value="15" />
    </div>
    <div class="form-group">
      <label>${game.i18n.localize("ORDEM.TE.VariacaoLabel")}</label>
      <select name="variacao">
        <option value="normal">${game.i18n.localize("ORDEM.TE.Variacao.normal")}</option>
        <option value="crescente">${game.i18n.localize("ORDEM.TE.Variacao.crescente")}</option>
        <option value="grupo">${game.i18n.localize("ORDEM.TE.Variacao.grupo")}</option>
        <option value="aberto">${game.i18n.localize("ORDEM.TE.Variacao.aberto")}</option>
      </select>
    </div>
  </form>`;

  return new Promise(resolve => {
    new Dialog({
      title: game.i18n.localize("ORDEM.TE.CriarTitulo"),
      content: conteudo,
      buttons: {
        criar: {
          icon: '<i class="fas fa-tasks"></i>',
          label: game.i18n.localize("ORDEM.TE.Criar"),
          callback: html => {
            const form = html[0].querySelector("form");
            const te = new OrdemTesteEstendido({
              titulo:      form.titulo.value,
              complexidade: form.complexidade.value,
              cd:          Number(form.cd.value) || 15,
              variacao:    form.variacao.value
            });
            te.render(true);
            resolve(te);
          }
        },
        cancelar: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize("ORDEM.Dialog.Cancelar"),
          callback: () => resolve(null)
        }
      },
      default: "criar"
    }, { classes: ["ordem-paranormal", "dialog"] }).render(true);
  });
}

/* -------------------------------------------------------------------------- */
/*  CENA DE INVESTIGAÇÃO                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Janela flutuante que gerencia uma cena de investigação:
 * rodadas abstratas, lista de pistas e ações rápidas de investigação.
 */
class OrdemCenaInvestigacao extends Application {

  constructor(opcoes = {}) {
    super({ width: 420, height: "auto", resizable: true,
            title: opcoes.titulo || game.i18n.localize("ORDEM.Inv.Titulo"),
            classes: ["ordem-paranormal", "op-inv"] });
    this.estado = {
      titulo:    opcoes.titulo    || game.i18n.localize("ORDEM.Inv.Titulo"),
      resumo:    opcoes.resumo    || "",
      objetivo:  opcoes.objetivo  || "",
      perguntas: opcoes.perguntas || "",
      rodada:    1,
      pistas:    []
    };
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/ordem-paranormal/templates/investigacao.hbs",
      classes: ["ordem-paranormal", "op-inv"]
    });
  }

  getData() {
    const e = this.estado;
    const pistas = e.pistas.map((p, i) => ({
      index: i,
      texto: p.texto,
      tipo:  p.tipo,
      icone: p.tipo === "basica" ? "fa-star" : "fa-puzzle-piece"
    }));
    return { titulo: e.titulo, resumo: e.resumo, objetivo: e.objetivo,
             perguntas: e.perguntas, rodada: e.rodada, pistas };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find("[data-action='inv-procurar']").on("click", () => this._acao("procurar"));
    html.find("[data-action='inv-facilitar']").on("click", () => this._acao("facilitar"));
    html.find("[data-action='inv-ajudar']").on("click", () => this._acao("ajudar"));
    html.find("[data-action='inv-proxima-rodada']").on("click", () => this._proximaRodada());
    html.find("[data-action='inv-add-pista']").on("click", () => this._addPista());
    html.find("[data-action='inv-remove-pista']").on("click", ev => {
      const idx = Number(ev.currentTarget.dataset.index);
      this.estado.pistas.splice(idx, 1);
      this.render();
    });
    html.find(".inv-pista-texto").on("change", ev => {
      const idx = Number(ev.currentTarget.dataset.index);
      if (this.estado.pistas[idx]) this.estado.pistas[idx].texto = ev.currentTarget.value;
    });
  }

  _addPista() {
    this.estado.pistas.push({ texto: "", tipo: "complementar" });
    this.render();
  }

  _proximaRodada() {
    this.estado.rodada++;
    this.render();
    ChatMessage.create({
      content: `<div class="ordem-chat-card"><div class="card-content">
        <i class="fas fa-forward-step"></i> <strong>${this.estado.titulo}</strong> —
        ${game.i18n.format("ORDEM.Inv.RodadaAnnounce", { rodada: this.estado.rodada })}
      </div></div>`,
      flags: { "ordem-paranormal": { tipo: "investigacao" } }
    });
  }

  /** Dispara a ação de investigação correspondente. */
  async _acao(tipo) {
    const actor = canvas?.tokens?.controlled[0]?.actor ?? game.user?.character;
    if (!actor) return ui.notifications.warn(game.i18n.localize("ORDEM.Aviso.SemAtor"));

    if (tipo === "procurar") {
      // Procurar pistas: o grau de sucesso orienta o que o Mestre entrega
      // (falha = pista incompleta/custo; sucesso = pista; extraordinário /
      // crítico = pista completa + complementar).
      const resultado = await rolarTeste(actor, {
        titulo: game.i18n.localize("ORDEM.Inv.Procurar"),
        periciaKey: "investigacao"
      });
      if (resultado) {
        const dicaKey = resultado.grau === "critico" || resultado.grau === "extraordinario"
          ? "ORDEM.Inv.GrauExtraordinario"
          : resultado.grau === "sucesso" ? "ORDEM.Inv.GrauSucesso"
          : resultado.grau === "desastre" ? "ORDEM.Inv.GrauDesastre"
          : "ORDEM.Inv.GrauFalha";
        await ChatMessage.create({
          whisper: ChatMessage.getWhisperRecipients("GM"),
          content: `<div class="ordem-chat-card evento"><div class="card-content">
            <i class="fas fa-user-secret"></i> <strong>${game.i18n.localize("ORDEM.Inv.DicaMestre")}</strong> (${actor.name}):
            ${game.i18n.localize(dicaKey)}
          </div></div>`,
          flags: { "ordem-paranormal": { tipo: "investigacao" } }
        });
      }
    } else if (tipo === "facilitar") {
      // Facilitar: teste contra DT 10; sucesso posta bônus de +2 para aliados.
      const resultado = await rolarTeste(actor, {
        titulo: game.i18n.localize("ORDEM.Inv.Facilitar"),
        periciaKey: "investigacao"
      });
      if (resultado?.total >= 10) {
        await ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor }),
          content: `<div class="ordem-chat-card"><div class="card-content">
            <i class="fas fa-lightbulb"></i> ${game.i18n.format("ORDEM.Inv.FacilitarSucesso", { nome: actor.name })}
          </div></div>`,
          flags: { "ordem-paranormal": { tipo: "investigacao" } }
        });
      }
    } else if (tipo === "ajudar") {
      await rolarAjuda(actor, "investigacao");
    }
  }
}

/**
 * Abre o diálogo de criação de uma Cena de Investigação e exibe a janela de gerenciamento.
 */
export async function abrirCenaInvestigacao() {
  const conteudo = `<form class="ordem-roll-dialog">
    <div class="form-group">
      <label>${game.i18n.localize("ORDEM.Inv.TituloLabel")}</label>
      <input type="text" name="titulo" value="${game.i18n.localize("ORDEM.Inv.TituloDefault")}" />
    </div>
    <div class="form-group">
      <label>${game.i18n.localize("ORDEM.Inv.ResumoLabel")}</label>
      <textarea name="resumo" rows="2"></textarea>
    </div>
    <div class="form-group">
      <label>${game.i18n.localize("ORDEM.Inv.ObjetivoLabel")}</label>
      <input type="text" name="objetivo" />
    </div>
    <div class="form-group">
      <label>${game.i18n.localize("ORDEM.Inv.PerguntasLabel")}</label>
      <textarea name="perguntas" rows="2"></textarea>
    </div>
  </form>`;

  return new Promise(resolve => {
    new Dialog({
      title: game.i18n.localize("ORDEM.Inv.CriarTitulo"),
      content: conteudo,
      buttons: {
        criar: {
          icon: '<i class="fas fa-search"></i>',
          label: game.i18n.localize("ORDEM.Inv.Criar"),
          callback: html => {
            const form = html[0].querySelector("form");
            const cena = new OrdemCenaInvestigacao({
              titulo:    form.titulo.value,
              resumo:    form.resumo.value,
              objetivo:  form.objetivo.value,
              perguntas: form.perguntas.value
            });
            cena.render(true);
            resolve(cena);
          }
        },
        cancelar: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize("ORDEM.Dialog.Cancelar"),
          callback: () => resolve(null)
        }
      },
      default: "criar"
    }, { classes: ["ordem-paranormal", "dialog"] }).render(true);
  });
}

/* -------------------------------------------------------------------------- */
/*  CENAS DE SOBREVIVÊNCIA (SaH) — Perseguição, Furtividade e Efeitos de Medo  */
/* -------------------------------------------------------------------------- */
/*  SCAFFOLDING AJUSTÁVEL: as regras-fim das cenas de perseguição/furtividade  */
/*  e dos efeitos de medo estão num capítulo do SaH ainda não fornecido (o     */
/*  Cap. 1 só as referencia como "p. XX"). A ESTRUTURA abaixo é fiel às ações  */
/*  citadas; as DTs são definidas pelo Mestre na janela. Plugue os valores     */
/*  exatos aqui quando o texto da regra estiver disponível.                    */

/** Configuração das cenas de sobrevivência (ações = atalhos de teste). @private */
const CENAS_SAH = {
  perseguicao: {
    titulo: "ORDEM.Cena.perseguicao",
    icone: "fa-person-running",
    dtDefault: 20,
    contador: null,
    acoes: [
      { key: "fugir",     periciaKey: "atletismo",   icone: "fa-person-running" },
      { key: "manobrar",  periciaKey: "pilotagem",   icone: "fa-car-side" },
      { key: "despistar", periciaKey: "furtividade", icone: "fa-user-secret" },
      { key: "obstaculo", periciaKey: "atletismo",   icone: "fa-mound" }
    ]
  },
  furtividade: {
    titulo: "ORDEM.Cena.furtividade",
    icone: "fa-user-ninja",
    dtDefault: 20,
    contador: { rotulo: "ORDEM.CenaSaH.Visibilidade", limiar: 5 },
    acoes: [
      { key: "esconder", periciaKey: "furtividade", icone: "fa-eye-slash" },
      { key: "mover",    periciaKey: "furtividade", icone: "fa-shoe-prints" },
      { key: "distrair", periciaKey: "enganacao",   icone: "fa-comment" }
    ]
  }
};

/**
 * Janela genérica de cena de sobrevivência. Rastreia rodada, uma DT ajustável e
 * (furtividade) um contador de visibilidade. Cada ação é um atalho que rola a
 * perícia adequada do token controlado contra a DT da cena.
 */
class OrdemCenaSaH extends Application {
  constructor(tipo) {
    const cfg = CENAS_SAH[tipo] ?? CENAS_SAH.perseguicao;
    super({ width: 380, height: "auto", resizable: true,
            title: game.i18n.localize(cfg.titulo), classes: ["ordem-paranormal", "op-theme", "op-cena-sah-app"] });
    this.tipo = tipo;
    this.cfg = cfg;
    this.estado = { rodada: 1, dt: cfg.dtDefault, contador: 0 };
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/ordem-paranormal/templates/cena-sah.hbs",
      classes: ["ordem-paranormal", "op-theme", "op-cena-sah-app"]
    });
  }

  getData() {
    const cfg = this.cfg;
    return {
      titulo: game.i18n.localize(cfg.titulo),
      icone: cfg.icone,
      rodada: this.estado.rodada,
      dt: this.estado.dt,
      temContador: !!cfg.contador,
      contadorRotulo: cfg.contador ? game.i18n.localize(cfg.contador.rotulo) : "",
      contador: this.estado.contador,
      limiar: cfg.contador?.limiar ?? 0,
      acoes: cfg.acoes.map(a => ({
        key: a.key, icone: a.icone,
        label: game.i18n.localize(`ORDEM.CenaSaH.Acao.${a.key}`),
        ajuda: game.i18n.localize(`ORDEM.CenaSaH.Ajuda.${a.key}`)
      }))
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find("[name='dt']").on("change", ev => { this.estado.dt = Number(ev.currentTarget.value) || 0; });
    html.find("[data-action='cena-rodada']").on("click", () => { this.estado.rodada++; this.render(); });
    html.find("[data-action='cont-mais']").on("click", () => this._contador(1));
    html.find("[data-action='cont-menos']").on("click", () => this._contador(-1));
    html.find("[data-action='cena-acao']").on("click", ev => this._acao(ev.currentTarget.dataset.acao));
  }

  _contador(delta) {
    this.estado.contador = Math.max(0, this.estado.contador + delta);
    this.render();
    const lim = this.cfg.contador?.limiar ?? 0;
    if (lim && this.estado.contador >= lim) {
      ChatMessage.create({
        whisper: ChatMessage.getWhisperRecipients("GM"),
        content: `<div class="ordem-chat-card evento morte"><div class="card-content">
          <i class="fas fa-bell"></i> ${game.i18n.format("ORDEM.CenaSaH.AlarmeTexto", { titulo: game.i18n.localize(this.cfg.titulo) })}
        </div></div>`,
        flags: { "ordem-paranormal": { tipo: "cena-sah" } }
      });
    }
  }

  async _acao(key) {
    const acao = this.cfg.acoes.find(a => a.key === key);
    if (!acao) return;
    const actor = canvas?.tokens?.controlled[0]?.actor ?? game.user?.character;
    if (!actor) return ui.notifications.warn(game.i18n.localize("ORDEM.Aviso.SemAtor"));
    await rolarTeste(actor, {
      periciaKey: acao.periciaKey,
      cd: this.estado.dt,
      titulo: game.i18n.localize(`ORDEM.CenaSaH.Acao.${key}`)
    });
  }
}

/** Abre a janela da Cena de Perseguição. */
export async function abrirCenaPerseguicao() { return new OrdemCenaSaH("perseguicao").render(true); }

/** Abre a janela da Cena de Furtividade. */
export async function abrirCenaFurtividade() { return new OrdemCenaSaH("furtividade").render(true); }

/**
 * Efeitos de Medo (SaH): aplica uma condição de medo ao alvo, ou permite
 * "entregar-se ao medo". As condições usadas são as oficiais (abalado/apavorado).
 * O benefício de PE temporários do "entregar-se ao medo" é informado ao Mestre
 * para adjudicação (não há recurso de PE temporário no motor).
 */
export async function efeitosDeMedo(actor) {
  actor = actor ?? canvas?.tokens?.controlled[0]?.actor ?? game.user?.character;
  if (!actor) return ui.notifications.warn(game.i18n.localize("ORDEM.Aviso.SemAtor"));

  return new Dialog({
    title: game.i18n.localize("ORDEM.Medo.Titulo"),
    content: `<form class="ordem-roll-dialog">
      <p class="roll-info">${game.i18n.format("ORDEM.Medo.Info", { nome: actor.name })}</p>
      <p class="op-cena-nota"><i class="fas fa-circle-info"></i> ${game.i18n.localize("ORDEM.CenaSaH.Nota")}</p>
    </form>`,
    buttons: {
      abalado: {
        icon: '<i class="fas fa-face-frown-open"></i>',
        label: CONDICOES.abalado.nome,
        callback: () => aplicarCondicao(actor, "abalado")
      },
      apavorado: {
        icon: '<i class="fas fa-skull"></i>',
        label: CONDICOES.apavorado.nome,
        callback: () => aplicarCondicao(actor, "apavorado")
      },
      entregar: {
        icon: '<i class="fas fa-hand-holding-heart"></i>',
        label: game.i18n.localize("ORDEM.Medo.Entregar"),
        callback: async () => {
          await aplicarCondicao(actor, "abalado");
          await _cardEvento(actor, {
            icone: "fa-ghost", classe: "morte",
            titulo: game.i18n.localize("ORDEM.Medo.EntregarTitulo"),
            texto: game.i18n.format("ORDEM.Medo.EntregarTexto", { nome: actor.name })
          });
        }
      },
      cancelar: {
        icon: '<i class="fas fa-times"></i>',
        label: game.i18n.localize("ORDEM.Dialog.Cancelar")
      }
    },
    default: "abalado"
  }, { classes: ["ordem-paranormal", "dialog"] }).render(true);
}

/**
 * Botão único do Mestre que abre um seletor das ferramentas de sobrevivência:
 * Cena de Perseguição, Cena de Furtividade e Efeitos de Medo.
 */
export async function abrirCenasSaH() {
  if (!game.user.isGM) return ui.notifications.warn(game.i18n.localize("ORDEM.Aviso.SemPermissao"));

  const conteudo = `<div class="op-acoes-combate"><section><div class="op-acao-grade">
    <button type="button" class="op-acao-btn" data-cena="perseguicao"><i class="fas fa-person-running"></i> ${game.i18n.localize("ORDEM.Cena.perseguicao")}</button>
    <button type="button" class="op-acao-btn" data-cena="furtividade"><i class="fas fa-user-ninja"></i> ${game.i18n.localize("ORDEM.Cena.furtividade")}</button>
    <button type="button" class="op-acao-btn" data-cena="medo"><i class="fas fa-ghost"></i> ${game.i18n.localize("ORDEM.Medo.Titulo")}</button>
  </div></section></div>`;

  const dlg = new Dialog({
    title: game.i18n.localize("ORDEM.CenaSaH.Titulo"),
    content: conteudo,
    buttons: { fechar: { icon: '<i class="fas fa-times"></i>', label: game.i18n.localize("ORDEM.Dialog.Cancelar") } },
    default: "fechar",
    render: html => {
      html[0].querySelectorAll("[data-cena]").forEach(btn => btn.addEventListener("click", () => {
        const cena = btn.dataset.cena;
        dlg.close();
        if (cena === "perseguicao") abrirCenaPerseguicao();
        else if (cena === "furtividade") abrirCenaFurtividade();
        else efeitosDeMedo();
      }));
    }
  }, { classes: ["ordem-paranormal", "op-theme", "dialog"], width: 420 });
  dlg.render(true);
}

/* -------------------------------------------------------------------------- */
/*  INICIATIVA — COMBATANT CUSTOMIZADO ("melhor de N")                         */
/* -------------------------------------------------------------------------- */

/**
 * Usa a mecânica de teste do sistema na iniciativa: rola (Agilidade)d20 e fica
 * com o maior, somando o bônus da perícia Iniciativa.
 */
class OrdemCombatant extends Combatant {
  _getInitiativeFormula() {
    const actor = this.actor;
    if (!actor) return "1d20";

    // Criaturas: usam a Iniciativa do statblock (dados + bônus).
    if (actor.type === "criatura") {
      const ini = actor.system.sentidos?.iniciativa ?? {};
      const dados = Math.max(0, Number(ini.dados) || 0);
      const bonus = Number(ini.bonus) || 0;
      const base = dados <= 0 ? "2d20kl" : `${dados}d20kh`;
      return bonus ? `${base} ${bonus >= 0 ? "+" : "-"} ${Math.abs(bonus)}` : base;
    }

    const calc = actor.system.periciasCalc?.iniciativa;
    const mods = actor.system.modificadores ?? {};
    // Penalidades em dados de condições (ex.: Surdo = −2d20 em Iniciativa).
    const dadosCond = (mods["dados.todos"] || 0)
      + (mods["dados.atributo.agi"] || 0)
      + (mods["dados.pericia.iniciativa"] || 0);
    const dados = Number(calc?.dados ?? actor.system.atributosEfetivos?.agi ?? 1) + dadosCond;
    const bonus = Number(calc?.bonus ?? 0);
    const base = dados <= 0 ? "2d20kl" : `${dados}d20kh`;
    return bonus ? `${base} ${bonus >= 0 ? "+" : "-"} ${Math.abs(bonus)}` : base;
  }
}

/* -------------------------------------------------------------------------- */
/*  CARROSSEL DE TURNOS DE COMBATE (topo da tela)                              */
/* -------------------------------------------------------------------------- */

/**
 * Faixa fixa no topo da tela com os combatentes na ordem de iniciativa.
 * Usa apenas a API básica de Combat do Foundry (game.combat, nextTurn etc.).
 * Renderização leve: injeta/atualiza um <div> próprio no body — sem janela.
 */
class OrdemCombatCarousel {

  /** Elemento raiz injetado no DOM (criado sob demanda). */
  get elemento() {
    return document.getElementById("ordem-carrossel");
  }

  /** O carrossel deve aparecer? (setting ligado + combate com combatentes) */
  get deveExibir() {
    if (!game.settings.get("ordem-paranormal", "mostrarCarrossel")) return false;
    const combat = game.combat;
    return !!(combat && combat.turns?.length);
  }

  /** Monta os dados do template a partir do combate ativo. */
  _dados() {
    const combat = game.combat;
    const ehMestre = game.user.isGM;
    const combatentes = [];
    for (const c of (combat?.turns ?? [])) {
      // Jogadores não veem combatentes ocultos pelo Mestre.
      if (c.hidden && !ehMestre) continue;
      combatentes.push({
        id: c.id,
        nome: c.name,
        img: c.img || c.actor?.img || "icons/svg/mystery-man.svg",
        iniciativa: c.initiative,
        temIniciativa: c.initiative !== null && c.initiative !== undefined,
        ativo: combat.combatant?.id === c.id,
        derrotado: !!c.isDefeated,
        oculto: !!c.hidden
      });
    }
    return { combatentes, round: combat?.round ?? 0, ehMestre };
  }

  /** Renderiza (ou atualiza) o carrossel; remove quando não deve exibir. */
  async render() {
    if (!this.deveExibir) return this.fechar();

    const html = await renderTemplate(
      "systems/ordem-paranormal/templates/combat-carousel.hbs", this._dados());

    let el = this.elemento;
    if (!el) {
      el = document.createElement("div");
      el.id = "ordem-carrossel";
      el.classList.add("ordem-paranormal");
      document.body.appendChild(el);
    }
    el.innerHTML = html;
    this._ativarListeners(el);

    // Mantém o card ativo visível na faixa.
    el.querySelector(".op-carrossel-card.ativo")
      ?.scrollIntoView({ inline: "center", block: "nearest" });
  }

  /** Remove o carrossel da tela. */
  fechar() {
    this.elemento?.remove();
  }

  /** Liga os cliques (focar token; controles do Mestre). */
  _ativarListeners(el) {
    el.querySelectorAll("[data-action='focar-token']").forEach(card => {
      card.addEventListener("click", () => {
        const c = game.combat?.combatants.get(card.dataset.combatantId);
        const token = c?.token?.object;
        if (!token) return;
        if (token.isOwner) token.control({ releaseOthers: true });
        canvas.animatePan({ x: token.center?.x ?? token.x, y: token.center?.y ?? token.y });
      });
    });
    if (!game.user.isGM) return;
    el.querySelector("[data-action='proximo-turno']")
      ?.addEventListener("click", () => game.combat?.nextTurn());
    el.querySelector("[data-action='turno-anterior']")
      ?.addEventListener("click", () => game.combat?.previousTurn());
    el.querySelector("[data-action='rolar-todos']")
      ?.addEventListener("click", () => game.combat?.rollAll());
  }
}

/* -------------------------------------------------------------------------- */
/*  PEDIR TESTE — SOLICITAÇÃO DE TESTE EM GRUPO PELO MESTRE                   */
/* -------------------------------------------------------------------------- */

/**
 * Monta o contexto entregue ao template pedido-teste.hbs a partir dos flags.
 * @private
 */
function _dadosPT(flags, participantes) {
  const periciaLabel = flags.periciaKey
    ? game.i18n.localize(`ORDEM.Pericia.${flags.periciaKey}`)
    : flags.periciaKey;
  const rolaram  = participantes.filter(p => p.rolou).length;
  const sucessos = participantes.filter(p => p.rolou && p.sucesso).length;
  const falhas   = participantes.filter(p => p.rolou && !p.sucesso).length;
  return {
    titulo: flags.titulo,
    periciaLabel,
    cd: flags.cd,
    participantes,
    rolaram,
    total:    participantes.length,
    sucessos,
    falhas,
    messageId: flags._messageId ?? ""
  };
}

/**
 * Mini-diálogo de confirmação de rolagem para o jogador.
 * Mostra as informações do teste (read-only) e permite ajustar Circunstância e Mod Extra.
 * Retorna `null` se cancelado, ou `{ dadosExtra, modExtra }`.
 * @private
 */
async function _dialogoMiniRoll(titulo, periciaKey, cd) {
  const periciaLabel = periciaKey
    ? game.i18n.localize(`ORDEM.Pericia.${periciaKey}`)
    : periciaKey;

  const conteudo = `<form class="ordem-roll-dialog">
    <div class="form-group">
      <label>${game.i18n.localize("ORDEM.PT.NomeLabel")}</label>
      <input type="text" value="${titulo}" disabled />
    </div>
    <div class="form-group">
      <label>${game.i18n.localize("ORDEM.PT.PericiaLabel")}</label>
      <input type="text" value="${periciaLabel}" disabled />
    </div>
    <div class="form-group">
      <label>${game.i18n.localize("ORDEM.Dialog.CD")}</label>
      <input type="number" value="${cd}" disabled />
    </div>
    <div class="form-group">
      <label>${game.i18n.localize("ORDEM.Dialog.Circunstancia")}</label>
      <select name="circunstancia">
        <option value="normal">${game.i18n.localize("ORDEM.Dialog.Normal")}</option>
        <option value="favoravel">${game.i18n.localize("ORDEM.Dialog.Favoravel")}</option>
        <option value="desfavoravel">${game.i18n.localize("ORDEM.Dialog.Desfavoravel")}</option>
      </select>
    </div>
    <div class="form-group">
      <label>${game.i18n.localize("ORDEM.Dialog.ModExtra")}</label>
      <input type="text" name="modExtra" value="0" placeholder="${game.i18n.localize("ORDEM.Mod.ValorPlaceholder")}" />
    </div>
  </form>`;

  return new Promise(resolve => {
    new Dialog({
      title: game.i18n.localize("ORDEM.PT.MiniDialogTitulo"),
      content: conteudo,
      buttons: {
        rolar: {
          icon: '<i class="fas fa-dice-d20"></i>',
          label: game.i18n.localize("ORDEM.Dialog.Rolar"),
          callback: html => {
            const form = html[0].querySelector("form");
            const circ = form.circunstancia?.value ?? "normal";
            const circAdj = circ === "favoravel" ? 1 : circ === "desfavoravel" ? -1 : 0;
            resolve({
              dadosExtra: circAdj,
              modExtra:   form.modExtra.value ?? "0",   // fórmula avaliada em _ptRolar
              circunstancia: circ
            });
          }
        },
        cancelar: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize("ORDEM.Dialog.Cancelar"),
          callback: () => resolve(null)
        }
      },
      default: "rolar"
    }, { classes: ["ordem-paranormal", "dialog"] }).render(true);
  });
}

/**
 * Executa a rolagem de um participante no Pedido de Teste e atualiza a mensagem de grupo.
 * @param {ChatMessage} message   Mensagem de grupo a ser atualizada
 * @param {string}      actorId   ID do ator que vai rolar
 * @private
 */
async function _ptRolar(message, actorId) {
  const flags = message.flags?.["ordem-paranormal"];
  const actor = game.actors.get(actorId);
  if (!actor || !flags) return;

  const participantes = foundry.utils.deepClone(flags.participantes ?? []);
  const p = participantes.find(x => x.actorId === actorId);
  if (!p || p.rolou) return;

  const opcoes = await _dialogoMiniRoll(flags.titulo, flags.periciaKey, flags.cd);
  if (!opcoes) return;

  const { dadosExtra, modExtra, circunstancia } = opcoes;

  const cfg    = ORDEM.pericias[flags.periciaKey] ?? { atributo: "int" };
  const calc   = actor.system.periciasCalc?.[flags.periciaKey] ?? {};
  const atrib  = calc.atributo || cfg.atributo;
  const modsAt = actor.system.modificadores ?? {};
  const dadosCond = (modsAt["dados.todos"] || 0)
    + (modsAt[`dados.atributo.${atrib}`] || 0)
    + (modsAt[`dados.pericia.${flags.periciaKey}`] || 0);
  const base   = Number(actor.system.atributosEfetivos?.[atrib] ?? actor.system.atributos?.[atrib] ?? 0) + dadosCond;
  const bonus  = Number(calc.bonus ?? 0);
  const num    = base + (Number(dadosExtra) || 0);
  const menor  = num <= 0;
  const qtd    = menor ? 2 : num;
  const roll   = await (new Roll(menor ? `${qtd}d20kl` : `${qtd}d20kh`)).evaluate();
  const nat    = roll.dice[0].results.find(r => r.active)?.result ?? roll.total;
  const bonusTotal = bonus + avaliarFormulaPassiva(modExtra, actor);
  const total  = nat + bonusTotal;
  const critico  = nat === 20;
  const desastre = nat === 1;
  const sucesso  = critico || (!desastre && total >= flags.cd);

  const resultadoLabel = game.i18n.localize(
    critico  ? "ORDEM.Resultado.Critico"  :
    desastre ? "ORDEM.Resultado.Desastre" :
    sucesso  ? "ORDEM.Resultado.Sucesso"  : "ORDEM.Resultado.Falha"
  );
  const atribLabel = game.i18n.localize(ORDEM.atributos[atrib] ?? "");
  const resultados = roll.dice[0].results.map(r => ({ valor: r.result, mantido: !!r.active }));

  // Posta card individual de rolagem.
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: _cardDeTeste({
      nome: flags.titulo, atribLabel, resultados,
      natural: nat, bonusTotal, total, cd: flags.cd,
      sucesso, critico, desastre, resultadoLabel,
      menorMelhor: menor, peritoInfo: null, habUsadas: [], custoPE: 0, circunstancia
    }),
    rolls: [roll],
    sound: CONFIG.sounds.dice,
    flags: { "ordem-paranormal": { tipo: "teste" } }
  });

  // Atualiza o participante na lista.
  p.rolou   = true;
  p.sucesso = sucesso;
  p.total   = total;

  // Recalcula o content do card de grupo e salva junto com os flags atualizados.
  const novoContent = await renderTemplate(
    "systems/ordem-paranormal/templates/pedido-teste.hbs",
    _dadosPT({ ...flags, _messageId: message.id }, participantes)
  );
  await message.update({
    content: novoContent,
    "flags.ordem-paranormal.participantes": participantes
  });
}

/**
 * Cria a mensagem reativa de Pedido de Teste para uma lista de tokens.
 * Reutilizada pelo diálogo do Mestre e pela Presença Perturbadora de criaturas.
 */
export async function criarPedidoTeste({ titulo, periciaKey, cd, tokens }) {
  const participantes = tokens.map(t => ({
    actorId: t.actor.id,
    tokenId: t.id,
    nome:    t.name,
    img:     t.document.texture?.src ?? t.actor.img ?? "icons/svg/mystery-man.svg",
    rolou:   false,
    sucesso: null,
    total:   null
  }));

  // Cria a mensagem; o messageId será atribuído após a criação.
  const flags = { tipo: "pedido-teste", titulo, periciaKey, cd, participantes };
  const msg = await ChatMessage.create({
    content: await renderTemplate(
      "systems/ordem-paranormal/templates/pedido-teste.hbs",
      _dadosPT({ ...flags, _messageId: "" }, participantes)
    ),
    flags: { "ordem-paranormal": flags }
  });

  // Atualiza o content com o messageId real para que os botões funcionem.
  if (msg) {
    const updatedContent = await renderTemplate(
      "systems/ordem-paranormal/templates/pedido-teste.hbs",
      _dadosPT({ ...flags, _messageId: msg.id }, participantes)
    );
    await msg.update({ content: updatedContent, "flags.ordem-paranormal._messageId": msg.id });
  }
  return msg;
}

/**
 * TESTE OCULTO (Mestre): rola a perícia de cada token imediatamente, sem
 * diálogo nem participação dos jogadores, e sussurra a tabela de resultados
 * apenas para o Mestre (ex.: Percepção passiva contra emboscadas).
 */
async function _testeOculto({ titulo, periciaKey, cd, tokens }) {
  const linhas = [];
  const rolls = [];
  for (const t of tokens) {
    const actor = t.actor;
    const cfg   = ORDEM.pericias[periciaKey] ?? { atributo: "int" };
    const calc  = actor.system.periciasCalc?.[periciaKey] ?? {};
    const atrib = calc.atributo || cfg.atributo;
    const mods  = actor.system.modificadores ?? {};
    const dadosCond = (mods["dados.todos"] || 0)
      + (mods[`dados.atributo.${atrib}`] || 0)
      + (mods[`dados.pericia.${periciaKey}`] || 0);
    const base  = Number(actor.system.atributosEfetivos?.[atrib] ?? actor.system.atributos?.[atrib] ?? 0) + dadosCond;
    const bonus = Number(calc.bonus ?? 0);
    const menor = base <= 0;
    const qtd   = menor ? 2 : base;
    const roll  = await (new Roll(menor ? `${qtd}d20kl` : `${qtd}d20kh`)).evaluate();
    rolls.push(roll);
    const nat   = roll.dice[0].results.find(r => r.active)?.result ?? roll.total;
    const total = nat + bonus;
    const sucesso = nat !== 1 && (nat === 20 || total >= cd);
    linhas.push(`<div class="pt-linha rolou">
      <img class="pt-avatar" src="${t.document.texture?.src ?? actor.img}" alt="${t.name}" />
      <span class="pt-nome">${t.name}</span>
      <span class="pt-resultado ${sucesso ? "sucesso" : "falha"}">
        <i class="fas ${sucesso ? "fa-check" : "fa-times"}"></i> ${total}
      </span>
    </div>`);
  }

  const periciaLabel = game.i18n.localize(`ORDEM.Pericia.${periciaKey}`);
  return ChatMessage.create({
    whisper: ChatMessage.getWhisperRecipients("GM"),
    content: `<div class="ordem-chat-card pedido-teste oculto">
      <header class="card-header">
        <i class="fas fa-user-secret"></i>
        <h3>${titulo}</h3>
        <span class="atributo">${periciaLabel} &bull; CD ${cd} &bull; ${game.i18n.localize("ORDEM.PT.Oculto")}</span>
      </header>
      <div class="card-content"><div class="pt-participantes">${linhas.join("")}</div></div>
    </div>`,
    rolls,
    flags: { "ordem-paranormal": { tipo: "teste-oculto" } }
  });
}

/**
 * Abre o diálogo do Mestre para configurar e enviar um Pedido de Teste em grupo.
 */
export async function abrirPedirTeste() {
  if (!game.user.isGM) return ui.notifications.warn(game.i18n.localize("ORDEM.Aviso.SemPermissao"));

  // Lista de tokens disponíveis na cena (tabela).
  const tokens = (canvas?.tokens?.placeables ?? []).filter(t => t.actor);
  const tokenRows = tokens.map(t => {
    const checked = t.actor.type === "agente" ? "checked" : "";
    const img = t.document.texture?.src ?? t.actor.img ?? "icons/svg/mystery-man.svg";
    const tipo = game.i18n.localize(`TYPES.Actor.${t.actor.type}`);
    return `<tr class="pt-token-linha">
      <td class="pt-col-check"><input type="checkbox" name="token" value="${t.id}" ${checked} /></td>
      <td class="pt-col-nome"><img src="${img}" alt="" /> <span>${t.name}</span></td>
      <td class="pt-col-tipo">${tipo}</td>
    </tr>`;
  }).join("");

  const tokenTabela = tokens.length
    ? `<table class="pt-tokens-tabela">
        <thead><tr>
          <th class="pt-col-check"><input type="checkbox" class="pt-sel-todos" checked title="${game.i18n.localize("ORDEM.PT.SelTodos")}" /></th>
          <th class="pt-col-nome">${game.i18n.localize("ORDEM.PT.ColToken")}</th>
          <th class="pt-col-tipo">${game.i18n.localize("ORDEM.PT.ColTipo")}</th>
        </tr></thead>
        <tbody>${tokenRows}</tbody>
      </table>`
    : `<p class="vazio">${game.i18n.localize("ORDEM.PT.SemTokens")}</p>`;

  const periciaOptions = Object.keys(ORDEM.pericias).map(k =>
    `<option value="${k}">${game.i18n.localize(`ORDEM.Pericia.${k}`)}</option>`
  ).join("");

  const conteudo = `<form class="ordem-roll-dialog pt-form">
    <div class="form-group">
      <label>${game.i18n.localize("ORDEM.PT.NomeLabel")}</label>
      <input type="text" name="titulo" value="" placeholder="${game.i18n.localize("ORDEM.PT.NomePlaceholder")}" />
    </div>
    <div class="form-group">
      <label>${game.i18n.localize("ORDEM.PT.PericiaLabel")}</label>
      <select name="periciaKey">${periciaOptions}</select>
    </div>
    <div class="form-group">
      <label>${game.i18n.localize("ORDEM.Dialog.CD")}</label>
      <input type="number" name="cd" value="15" />
    </div>
    <label class="check-inline" title="${game.i18n.localize("ORDEM.PT.OcultoAjuda")}">
      <input type="checkbox" name="oculto" /> ${game.i18n.localize("ORDEM.PT.OcultoLabel")}
    </label>
    <fieldset class="pt-tokens">
      <legend>${game.i18n.localize("ORDEM.PT.TokensLabel")}</legend>
      ${tokenTabela}
    </fieldset>
  </form>`;

  return new Promise(resolve => {
    new Dialog({
      title: game.i18n.localize("ORDEM.PT.DialogTitulo"),
      content: conteudo,
      buttons: {
        solicitar: {
          icon: '<i class="fas fa-paper-plane"></i>',
          label: game.i18n.localize("ORDEM.PT.Solicitar"),
          callback: async html => {
            const form      = html[0].querySelector("form");
            const titulo    = form.titulo.value.trim() || game.i18n.localize("ORDEM.PT.NomePadrao");
            const periciaKey = form.periciaKey.value;
            const cd        = Number(form.cd.value) || 15;
            const oculto    = !!form.oculto?.checked;

            const tokensSel = [...form.querySelectorAll("[name='token']:checked")]
              .map(cb => canvas.tokens.get(cb.value))
              .filter(Boolean);

            if (!tokensSel.length) {
              ui.notifications.warn(game.i18n.localize("ORDEM.PT.SemTokensSelecionados"));
              return resolve(null);
            }

            const msg = oculto
              ? await _testeOculto({ titulo, periciaKey, cd, tokens: tokensSel })
              : await criarPedidoTeste({ titulo, periciaKey, cd, tokens: tokensSel });
            resolve(msg);
          }
        },
        cancelar: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize("ORDEM.Dialog.Cancelar"),
          callback: () => resolve(null)
        }
      },
      default: "solicitar",
      render: html => {
        const root = html[0];
        const todos = root.querySelector(".pt-sel-todos");
        const checks = () => [...root.querySelectorAll("[name='token']")];
        // "Selecionar todos" marca/desmarca todas as linhas.
        todos?.addEventListener("change", () => checks().forEach(c => { c.checked = todos.checked; }));
        // Mantém o "todos" coerente com as marcações individuais.
        checks().forEach(c => c.addEventListener("change", () => {
          if (todos) todos.checked = checks().every(x => x.checked);
        }));
      }
    }, { classes: ["ordem-paranormal", "dialog"], width: 440 }).render(true);
  });
}

/* -------------------------------------------------------------------------- */
/*  PEDIDO DE AÇÃO DE COMBATE (Mestre dispara → tokens executam)               */
/* -------------------------------------------------------------------------- */

/**
 * Catálogo das ações de combate despacháveis. `custoPe` é o custo padrão pago
 * pelo ator que executa; `corpoACorpo` filtra o seletor de arma; `icone` é a
 * classe FontAwesome usada no card/diálogo.
 * @private
 */
const PA_ACOES = {
  investida:    { icone: "fa-bolt",       custoPe: 0, corpoACorpo: true  },
  oportunidade: { icone: "fa-hand-fist",  custoPe: 1, corpoACorpo: true  },
  furtivo:      { icone: "fa-user-ninja", custoPe: 1, corpoACorpo: false }
};

/** Monta os dados do template do card de Pedido de Ação. @private */
function _dadosPA(flags, participantes) {
  const meta = PA_ACOES[flags.acao] ?? { icone: "fa-burst" };
  const executaram = participantes.filter(p => p.executou).length;
  return {
    titulo:     flags.titulo || game.i18n.localize(`ORDEM.PA.Acao.${flags.acao}`),
    acaoLabel:  game.i18n.localize(`ORDEM.PA.Acao.${flags.acao}`),
    acaoIcone:  meta.icone,
    botaoLabel: game.i18n.localize(`ORDEM.PA.Botao.${flags.acao}`),
    subtitulo:  flags.subtitulo || "",
    participantes,
    executaram,
    total:      participantes.length,
    messageId:  flags._messageId ?? ""
  };
}

/**
 * Cria a mensagem reativa de Pedido de Ação para uma lista de tokens.
 * Espelha {@link criarPedidoTeste}: cada token ganha um botão para executar.
 */
export async function criarPedidoAcao({ acao, tokens, subtitulo = "" }) {
  const participantes = tokens.map(t => ({
    actorId:  t.actor.id,
    tokenId:  t.id,
    nome:     t.name,
    img:      t.document.texture?.src ?? t.actor.img ?? "icons/svg/mystery-man.svg",
    executou: false,
    resumo:   null
  }));

  const flags = { tipo: "pedido-acao", acao, subtitulo, participantes };
  const msg = await ChatMessage.create({
    content: await renderTemplate(
      "systems/ordem-paranormal/templates/pedido-acao.hbs",
      _dadosPA({ ...flags, _messageId: "" }, participantes)
    ),
    flags: { "ordem-paranormal": flags }
  });

  if (msg) {
    const updated = await renderTemplate(
      "systems/ordem-paranormal/templates/pedido-acao.hbs",
      _dadosPA({ ...flags, _messageId: msg.id }, participantes)
    );
    await msg.update({ content: updated, "flags.ordem-paranormal._messageId": msg.id });
  }
  return msg;
}

/**
 * Seleciona a arma que o ator usará na ação. Prefere a única equipada; com mais
 * de uma opção, abre um seletor. Retorna o Item ou `null`.
 * @private
 */
async function _escolherArma(actor, { corpoACorpo = false } = {}) {
  let armas = actor.items.filter(i => i.type === "arma");
  if (corpoACorpo) {
    const cac = armas.filter(a => (a.system.alcance ?? "") === "corpoacorpo");
    if (cac.length) armas = cac;
  }
  if (!armas.length) return null;
  if (armas.length === 1) return armas[0];
  const equipadas = armas.filter(a => a.system.equipado);
  if (equipadas.length === 1) return equipadas[0];

  const opts = armas.map(a => `<option value="${a.id}">${a.name}</option>`).join("");
  return new Promise(resolve => {
    new Dialog({
      title: game.i18n.localize("ORDEM.PA.EscolherArma"),
      content: `<form class="ordem-roll-dialog"><div class="form-group">
        <label>${game.i18n.localize("ORDEM.PA.Arma")}</label>
        <select name="arma">${opts}</select></div></form>`,
      buttons: {
        ok: { icon: '<i class="fas fa-check"></i>', label: game.i18n.localize("ORDEM.Dialog.Confirmar"),
          callback: html => resolve(actor.items.get(html[0].querySelector("[name='arma']").value)) },
        cancelar: { icon: '<i class="fas fa-times"></i>', label: game.i18n.localize("ORDEM.Dialog.Cancelar"),
          callback: () => resolve(null) }
      },
      default: "ok"
    }, { classes: ["ordem-paranormal", "dialog"] }).render(true);
  });
}

/** Desconta PE do ator (avisa, mas não bloqueia, se faltar). @private */
async function _gastarPe(actor, custo) {
  if (custo <= 0) return true;
  const pe = Number(actor.system.recursos?.pe?.value) || 0;
  if (pe < custo) ui.notifications.warn(game.i18n.format("ORDEM.Aviso.PEInsuficiente", { custo, atual: pe }));
  await actor.update({ "system.recursos.pe.value": Math.max(0, pe - custo) });
  return pe >= custo;
}

/**
 * Executa a ação de combate de um participante e atualiza o card de grupo.
 * Espelha {@link _ptRolar}.
 * @private
 */
async function _paExecutar(message, actorId) {
  const flags = message.flags?.["ordem-paranormal"];
  const actor = game.actors.get(actorId);
  if (!actor || !flags) return;

  const participantes = foundry.utils.deepClone(flags.participantes ?? []);
  const p = participantes.find(x => x.actorId === actorId);
  if (!p || p.executou) return;

  const acao = flags.acao;
  const meta = PA_ACOES[acao] ?? {};
  const labelAcao = game.i18n.localize(`ORDEM.PA.Acao.${acao}`);
  let resumo = null;

  if (acao === "investida") {
    const arma = await _escolherArma(actor, { corpoACorpo: true });
    if (!arma) return ui.notifications.warn(game.i18n.localize("ORDEM.PA.SemArmaCorpo"));
    // Ataque com +Ⓞ (um d20 a mais). Cancelar não consome a ação.
    const res = await rolarTeste(actor, { arma, dadosBonus: 1, titulo: `${labelAcao}: ${arma.name}` });
    if (res === null || res === undefined) return;
    // Só então: −5 na Defesa até o próximo turno (guarda aberta).
    await aplicarModificadorTemporario(actor, {
      alvo: "defesa", valor: -5, duracao: 1,
      nome: game.i18n.localize("ORDEM.PA.InvestidaGuardaNome"),
      rotulo: game.i18n.localize("ORDEM.PA.InvestidaGuarda"),
      icone: "icons/svg/sword.svg"
    });
    resumo = game.i18n.localize("ORDEM.PA.Feito");

  } else if (acao === "oportunidade") {
    const arma = await _escolherArma(actor, { corpoACorpo: true });
    if (!arma) return ui.notifications.warn(game.i18n.localize("ORDEM.PA.SemArmaCorpo"));
    const res = await rolarTeste(actor, { arma, titulo: `${labelAcao}: ${arma.name}` });
    if (res === null || res === undefined) return;
    await _gastarPe(actor, Number(meta.custoPe) || 0);
    resumo = `−${Number(meta.custoPe) || 0} PE`;

  } else if (acao === "furtivo") {
    const arma = await _escolherArma(actor, { corpoACorpo: false });
    if (!arma) return ui.notifications.warn(game.i18n.localize("ORDEM.PA.SemArma"));
    const nex = Number(actor.system.nex) || 0;
    const tier = ORDEM.tierFurtivo(nex);
    await _gastarPe(actor, tier.custo);
    await rolarDano(actor, arma, { dadosExtra: tier.dados });
    resumo = `+${tier.dados}`;

  } else {
    return;
  }

  // Atualiza o participante e o card de grupo.
  p.executou = true;
  p.resumo   = resumo ?? game.i18n.localize("ORDEM.PA.Feito");
  const novoContent = await renderTemplate(
    "systems/ordem-paranormal/templates/pedido-acao.hbs",
    _dadosPA({ ...flags, _messageId: message.id }, participantes)
  );
  await message.update({
    content: novoContent,
    "flags.ordem-paranormal.participantes": participantes
  });
}

/**
 * Abre o diálogo do Mestre para escolher uma ação de combate e os tokens que a
 * executarão, despachando um card reativo. Espelha {@link abrirPedirTeste}.
 */
export async function abrirPedirAcao() {
  if (!game.user.isGM) return ui.notifications.warn(game.i18n.localize("ORDEM.Aviso.SemPermissao"));

  const tokens = (canvas?.tokens?.placeables ?? []).filter(t => t.actor);
  const tokenRows = tokens.map(t => {
    const checked = t.actor.type === "agente" ? "checked" : "";
    const img = t.document.texture?.src ?? t.actor.img ?? "icons/svg/mystery-man.svg";
    const tipo = game.i18n.localize(`TYPES.Actor.${t.actor.type}`);
    return `<tr class="pt-token-linha">
      <td class="pt-col-check"><input type="checkbox" name="token" value="${t.id}" ${checked} /></td>
      <td class="pt-col-nome"><img src="${img}" alt="" /> <span>${t.name}</span></td>
      <td class="pt-col-tipo">${tipo}</td>
    </tr>`;
  }).join("");

  const tokenTabela = tokens.length
    ? `<table class="pt-tokens-tabela">
        <thead><tr>
          <th class="pt-col-check"><input type="checkbox" class="pt-sel-todos" checked title="${game.i18n.localize("ORDEM.PT.SelTodos")}" /></th>
          <th class="pt-col-nome">${game.i18n.localize("ORDEM.PT.ColToken")}</th>
          <th class="pt-col-tipo">${game.i18n.localize("ORDEM.PT.ColTipo")}</th>
        </tr></thead>
        <tbody>${tokenRows}</tbody>
      </table>`
    : `<p class="vazio">${game.i18n.localize("ORDEM.PT.SemTokens")}</p>`;

  const acaoOptions = Object.keys(PA_ACOES).map(k =>
    `<option value="${k}">${game.i18n.localize(`ORDEM.PA.Acao.${k}`)}</option>`
  ).join("");

  const conteudo = `<form class="ordem-roll-dialog pt-form">
    <div class="form-group">
      <label>${game.i18n.localize("ORDEM.PA.AcaoLabel")}</label>
      <select name="acao">${acaoOptions}</select>
    </div>
    <p class="hint">${game.i18n.localize("ORDEM.PA.Ajuda")}</p>
    <fieldset class="pt-tokens">
      <legend>${game.i18n.localize("ORDEM.PT.TokensLabel")}</legend>
      ${tokenTabela}
    </fieldset>
  </form>`;

  return new Promise(resolve => {
    new Dialog({
      title: game.i18n.localize("ORDEM.PA.DialogTitulo"),
      content: conteudo,
      buttons: {
        solicitar: {
          icon: '<i class="fas fa-paper-plane"></i>',
          label: game.i18n.localize("ORDEM.PT.Solicitar"),
          callback: async html => {
            const form = html[0].querySelector("form");
            const acao = form.acao.value;
            const tokensSel = [...form.querySelectorAll("[name='token']:checked")]
              .map(cb => canvas.tokens.get(cb.value))
              .filter(Boolean);
            if (!tokensSel.length) {
              ui.notifications.warn(game.i18n.localize("ORDEM.PT.SemTokensSelecionados"));
              return resolve(null);
            }
            resolve(await criarPedidoAcao({ acao, tokens: tokensSel }));
          }
        },
        cancelar: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize("ORDEM.Dialog.Cancelar"),
          callback: () => resolve(null)
        }
      },
      default: "solicitar",
      render: html => {
        const root = html[0];
        const todos = root.querySelector(".pt-sel-todos");
        const checks = () => [...root.querySelectorAll("[name='token']")];
        todos?.addEventListener("change", () => checks().forEach(c => { c.checked = todos.checked; }));
        checks().forEach(c => c.addEventListener("change", () => {
          if (todos) todos.checked = checks().every(x => x.checked);
        }));
      }
    }, { classes: ["ordem-paranormal", "dialog"], width: 440 }).render(true);
  });
}

/* -------------------------------------------------------------------------- */
/*  EXPORTAR / IMPORTAR FICHAS (JSON local e GitHub)                           */
/* -------------------------------------------------------------------------- */

/** Versão atual do formato de ficha exportada. @private */
const _FICHA_VERSAO = 1;

/**
 * Exporta um ator (agente ou criatura) para um arquivo JSON com metadados,
 * incluindo todos os itens embutidos. Pode ser versionado no GitHub e
 * reimportado por arquivo ou link.
 *
 * @param {OrdemActor} actor
 */
export function exportarAgente(actor) {
  if (!actor) return ui.notifications.warn(game.i18n.localize("ORDEM.Aviso.SemAtor"));

  // toObject() inclui name, img, type, system e os itens embutidos.
  const dados = actor.toObject();
  const payload = {
    _ordemFicha: _FICHA_VERSAO,
    sistema: "ordem-paranormal",
    versaoSistema: game.system?.version ?? "",
    exportadoEm: new Date().toISOString(),
    actor: dados
  };

  const nomeArquivo = `ficha-${(actor.name || "agente").slugify({ strict: true })}.json`;
  saveDataToFile(JSON.stringify(payload, null, 2), "text/json", nomeArquivo);
  ui.notifications.info(game.i18n.format("ORDEM.IO.Exportado", { nome: actor.name }));
}

/**
 * Normaliza um link do GitHub para uma fonte buscável.
 * Aceita: raw.githubusercontent.com, github.com/.../blob/... (arquivo),
 * github.com/.../tree/... (pasta), api.github.com/.../contents/... e a raiz
 * de um repositório (github.com/usuario/repo).
 *
 * @param {string} url
 * @returns {{ tipo: "arquivo"|"pasta", url: string }}
 * @private
 */
function _resolverFonteGithub(url) {
  url = (url || "").trim();

  // Endpoint de listagem da API (pasta).
  if (/^https?:\/\/api\.github\.com\/repos\/.+\/contents\//.test(url)) {
    return { tipo: "pasta", url };
  }
  // Arquivo cru já pronto.
  if (/^https?:\/\/raw\.githubusercontent\.com\//.test(url)) {
    return { tipo: "arquivo", url };
  }
  // github.com/{owner}/{repo}/(blob|tree)/{branch}/{path}
  const m = url.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/(blob|tree)\/([^/]+)\/(.*)$/);
  if (m) {
    const [, owner, repo, kind, branch, path] = m;
    if (kind === "blob") {
      return { tipo: "arquivo", url: `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}` };
    }
    return { tipo: "pasta", url: `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}` };
  }
  // Raiz de repositório → lista o diretório raiz.
  const r = url.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/?$/);
  if (r) {
    const [, owner, repo] = r;
    return { tipo: "pasta", url: `https://api.github.com/repos/${owner}/${repo}/contents` };
  }
  // Qualquer outra URL: trata como arquivo cru (ex.: gist raw, servidor próprio).
  return { tipo: "arquivo", url };
}

/**
 * Busca uma ou mais fichas (JSON) de uma URL — arquivo único ou pasta do GitHub.
 * @param {string} url
 * @returns {Promise<object[]>} JSONs brutos
 * @private
 */
async function _buscarFichasDeUrl(url) {
  const fonte = _resolverFonteGithub(url);
  const out = [];

  if (fonte.tipo === "pasta") {
    const lista = await foundry.utils.fetchJsonWithTimeout(fonte.url, { headers: { Accept: "application/vnd.github+json" } });
    if (!Array.isArray(lista)) throw new Error(game.i18n.localize("ORDEM.IO.ErroPasta"));
    for (const item of lista) {
      if (item?.type === "file" && /\.json$/i.test(item.name) && item.download_url) {
        try {
          out.push(await foundry.utils.fetchJsonWithTimeout(item.download_url));
        } catch (e) {
          console.warn("Ordem Paranormal | Falha ao buscar", item.name, e);
        }
      }
    }
  } else {
    out.push(await foundry.utils.fetchJsonWithTimeout(fonte.url));
  }
  return out;
}

/**
 * Extrai dados de ator(es) de um JSON em qualquer formato suportado:
 * envelope { _ordemFicha, actor }, objeto de ator cru ({ type, system, items })
 * ou um array de qualquer um deles.
 * @private
 */
function _extrairAtores(json) {
  if (!json) return [];
  if (Array.isArray(json)) return json.flatMap(_extrairAtores);
  if (json._ordemFicha && json.actor) return [json.actor];
  if (json.type === "agente" || json.type === "criatura") return [json];
  return [];
}

/**
 * Cria os atores a partir dos dados extraídos (remove _id para evitar colisões;
 * opcionalmente agrupa em uma pasta).
 * @private
 */
async function _criarAtores(listaDados, { pastaId = null } = {}) {
  const criados = [];
  for (const bruto of listaDados) {
    const dados = foundry.utils.deepClone(bruto);
    delete dados._id;
    delete dados.folder;
    if (Array.isArray(dados.items)) for (const it of dados.items) delete it._id;
    if (pastaId) dados.folder = pastaId;
    try {
      const actor = await Actor.create(dados);
      if (actor) criados.push(actor);
    } catch (e) {
      console.error("Ordem Paranormal | Falha ao criar ator importado", e);
      ui.notifications.error(game.i18n.format("ORDEM.IO.ErroCriar", { nome: dados.name ?? "?" }));
    }
  }
  return criados;
}

/** Cria (ou reutiliza) uma pasta de Atores para agrupar os importados. @private */
async function _garantirPasta(nome) {
  const existente = game.folders.find(f => f.type === "Actor" && f.name === nome);
  if (existente) return existente;
  return Folder.create({ name: nome, type: "Actor" });
}

/**
 * Abre o diálogo de importação de fichas: arquivo(s) local(is) OU link do GitHub
 * (arquivo .json, pasta `tree`, ou repositório com vários agentes).
 */
export async function importarFichas() {
  if (!game.user.can("ACTOR_CREATE")) {
    return ui.notifications.warn(game.i18n.localize("ORDEM.IO.SemPermissao"));
  }

  const conteudo = `<form class="ordem-roll-dialog op-import">
    <p class="hint">${game.i18n.localize("ORDEM.IO.Ajuda")}</p>
    <div class="form-group">
      <label><i class="fas fa-file-arrow-up"></i> ${game.i18n.localize("ORDEM.IO.ArquivoLabel")}</label>
      <input type="file" name="arquivo" accept=".json,application/json" multiple />
    </div>
    <div class="op-import-ou">${game.i18n.localize("ORDEM.IO.Ou")}</div>
    <div class="form-group">
      <label><i class="fab fa-github"></i> ${game.i18n.localize("ORDEM.IO.UrlLabel")}</label>
      <input type="text" name="url" placeholder="https://github.com/usuario/repo/tree/main/agentes" />
      <p class="hint">${game.i18n.localize("ORDEM.IO.UrlAjuda")}</p>
    </div>
    <label class="check-inline"><input type="checkbox" name="emPasta" checked /> ${game.i18n.localize("ORDEM.IO.AgruparPasta")}</label>
  </form>`;

  return new Promise(resolve => {
    new Dialog({
      title: game.i18n.localize("ORDEM.IO.ImportarTitulo"),
      content: conteudo,
      buttons: {
        importar: {
          icon: '<i class="fas fa-file-import"></i>',
          label: game.i18n.localize("ORDEM.IO.Importar"),
          callback: async html => {
            const form = html[0].querySelector("form");
            const arquivos = form.arquivo?.files ?? [];
            const url = form.url?.value?.trim() ?? "";
            const emPasta = !!form.emPasta?.checked;

            // Coleta os JSONs (de arquivos e/ou da URL).
            const jsons = [];
            try {
              for (const file of arquivos) {
                const texto = await readTextFromFile(file);
                jsons.push(JSON.parse(texto));
              }
              if (url) jsons.push(...await _buscarFichasDeUrl(url));
            } catch (e) {
              console.error("Ordem Paranormal | Erro ao ler fichas", e);
              ui.notifications.error(game.i18n.localize("ORDEM.IO.ErroLeitura"));
              return resolve(null);
            }

            if (!jsons.length) {
              ui.notifications.warn(game.i18n.localize("ORDEM.IO.NadaSelecionado"));
              return resolve(null);
            }

            // Extrai e valida os atores.
            const atores = jsons.flatMap(_extrairAtores);
            if (!atores.length) {
              ui.notifications.warn(game.i18n.localize("ORDEM.IO.SemAtoresValidos"));
              return resolve(null);
            }

            // Agrupa em pasta quando solicitado.
            let pastaId = null;
            if (emPasta) {
              const pasta = await _garantirPasta(game.i18n.localize("ORDEM.IO.PastaNome"));
              pastaId = pasta?.id ?? null;
            }

            const criados = await _criarAtores(atores, { pastaId });
            ui.notifications.info(game.i18n.format("ORDEM.IO.Importados", { qtd: criados.length }));
            resolve(criados);
          }
        },
        cancelar: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize("ORDEM.Dialog.Cancelar"),
          callback: () => resolve(null)
        }
      },
      default: "importar"
    }, { classes: ["ordem-paranormal", "dialog", "op-import-dialog"], width: 460 }).render(true);
  });
}

/* -------------------------------------------------------------------------- */
/*  COMPARTILHAR CONTEÚDO — COMPÊNDIOS ↔ GITHUB (Itens e Atores)               */
/* -------------------------------------------------------------------------- */

const _PACOTE_VERSAO = 1;

/** Tipos de documento do sistema, por classe. @private */
const _TIPOS_ITEM  = ["poder", "ritual", "arma", "protecao", "equipamento", "origem", "trilha", "condicao"];
const _TIPOS_ATOR  = ["agente", "criatura"];

/** Mapa tipo de documento → nome do compêndio do sistema. @private */
const _PACK_POR_TIPO = {
  poder: "poderes", ritual: "rituais", arma: "armas", protecao: "protecoes",
  equipamento: "equipamentos", origem: "origens", trilha: "trilhas", condicao: "condicoes",
  criatura: "criaturas", agente: "agentes"
};

/** Collection id do compêndio para um tipo (ex.: "ordem-paranormal.poderes"). @private */
function _packIdDeTipo(type) {
  const nome = _PACK_POR_TIPO[type];
  return nome ? `ordem-paranormal.${nome}` : null;
}

/** "Item" | "Actor" a partir do tipo de documento. @private */
function _documentNameDeTipo(type) {
  if (_TIPOS_ITEM.includes(type)) return "Item";
  if (_TIPOS_ATOR.includes(type)) return "Actor";
  return null;
}

/** Lista os compêndios do sistema (para os seletores de exportação). @private */
function _packsDoSistema() {
  return Object.values(_PACK_POR_TIPO)
    .map(nome => game.packs.get(`ordem-paranormal.${nome}`))
    .filter(Boolean);
}

/**
 * Exporta um compêndio inteiro para um arquivo JSON (todos os documentos, com
 * itens embutidos no caso de atores). O arquivo pode ser versionado no GitHub
 * e reimportado para o compêndio por outro Mestre/criador.
 *
 * @param {string} packId  Collection id (ex.: "ordem-paranormal.poderes")
 */
export async function exportarCompendio(packId) {
  const pack = game.packs.get(packId);
  if (!pack) return ui.notifications.warn(game.i18n.localize("ORDEM.Conteudo.PackInvalido"));

  const docs = await pack.getDocuments();
  const payload = {
    _ordemPacote: _PACOTE_VERSAO,
    sistema: "ordem-paranormal",
    versaoSistema: game.system?.version ?? "",
    exportadoEm: new Date().toISOString(),
    pack: packId,
    documentName: pack.documentName,
    documentos: docs.map(d => d.toObject())
  };

  const nome = packId.split(".").pop();
  saveDataToFile(JSON.stringify(payload, null, 2), "text/json", `ordem-${nome}.json`);
  ui.notifications.info(game.i18n.format("ORDEM.Conteudo.Exportado", { qtd: docs.length, pack: pack.title }));
}

/**
 * Exporta TODOS os compêndios do sistema num único arquivo `ordem-conteudo.json`.
 * Cada documento mantém seu `type`; o roteamento na importação usa o tipo.
 */
export async function exportarTodosCompendios() {
  const documentos = [];
  for (const pack of _packsDoSistema()) {
    const docs = await pack.getDocuments();
    for (const d of docs) documentos.push(d.toObject());
  }
  const payload = {
    _ordemPacote: _PACOTE_VERSAO,
    sistema: "ordem-paranormal",
    versaoSistema: game.system?.version ?? "",
    exportadoEm: new Date().toISOString(),
    documentos
  };
  saveDataToFile(JSON.stringify(payload, null, 2), "text/json", "ordem-conteudo.json");
  ui.notifications.info(game.i18n.format("ORDEM.Conteudo.ExportadoTudo", { qtd: documentos.length }));
}

/**
 * Extrai documentos (Itens e Atores) de um JSON em qualquer formato suportado:
 * envelope de pacote { _ordemPacote, documentos[] }, envelope de ficha
 * { _ordemFicha, actor }, objeto cru com `type`, ou array de qualquer um deles.
 * @private
 * @returns {Array<{ documentName: string, type: string, data: object }>}
 */
function _extrairDocumentos(json) {
  if (!json) return [];
  if (Array.isArray(json)) return json.flatMap(_extrairDocumentos);
  if (json._ordemPacote && Array.isArray(json.documentos)) return json.documentos.flatMap(_extrairDocumentos);
  if (json._ordemFicha && json.actor) return _extrairDocumentos(json.actor);

  const documentName = _documentNameDeTipo(json.type);
  if (documentName) return [{ documentName, type: json.type, data: json }];
  return [];
}

/**
 * Importa documentos (de arquivos/links) para os compêndios do sistema,
 * roteando cada um pelo seu tipo. Em conflito de nome, PERGUNTA ao usuário a
 * política (atualizar / pular / criar novo), aplicada ao lote.
 *
 * @param {object[]} jsons  JSONs brutos já carregados
 */
export async function importarParaCompendios(jsons) {
  if (!game.user.isGM) return ui.notifications.warn(game.i18n.localize("ORDEM.Conteudo.SoGM"));

  const docs = jsons.flatMap(_extrairDocumentos);
  if (!docs.length) return ui.notifications.warn(game.i18n.localize("ORDEM.Conteudo.SemDocumentos"));

  // Agrupa por compêndio de destino.
  const porPack = {};
  for (const d of docs) {
    const packId = _packIdDeTipo(d.type);
    if (!packId) continue;
    (porPack[packId] ??= []).push(d);
  }

  // Detecta conflitos por nome (usa o índice de cada pack).
  let totalConflitos = 0;
  for (const [packId, lista] of Object.entries(porPack)) {
    const pack = game.packs.get(packId);
    if (!pack) continue;
    const idx = await pack.getIndex();
    const nomes = new Set(idx.map(e => e.name));
    for (const d of lista) if (nomes.has(d.data.name)) totalConflitos++;
  }

  // Pergunta a política de conflito (se houver).
  let politica = "criar";
  if (totalConflitos > 0) {
    politica = await new Promise(resolve => {
      new Dialog({
        title: game.i18n.localize("ORDEM.Conteudo.ConflitoTitulo"),
        content: `<p>${game.i18n.format("ORDEM.Conteudo.ConflitoTexto", { qtd: totalConflitos })}</p>`,
        buttons: {
          atualizar: { icon: '<i class="fas fa-rotate"></i>', label: game.i18n.localize("ORDEM.Conteudo.Atualizar"), callback: () => resolve("atualizar") },
          pular:     { icon: '<i class="fas fa-forward"></i>', label: game.i18n.localize("ORDEM.Conteudo.Pular"),     callback: () => resolve("pular") },
          novo:      { icon: '<i class="fas fa-copy"></i>',    label: game.i18n.localize("ORDEM.Conteudo.CriarNovo"),  callback: () => resolve("criar") }
        },
        default: "atualizar",
        close: () => resolve(null)
      }, { classes: ["ordem-paranormal", "op-theme", "dialog"], width: 440 }).render(true);
    });
    if (!politica) return; // cancelado
  }

  // Processa cada compêndio.
  let criados = 0, atualizados = 0, pulados = 0;
  for (const [packId, lista] of Object.entries(porPack)) {
    const pack = game.packs.get(packId);
    if (!pack) continue;
    if (pack.locked) await pack.configure({ locked: false });

    const cls = getDocumentClass(pack.documentName);
    const existentes = await pack.getDocuments();
    const porNome = new Map(existentes.map(d => [d.name, d]));
    const novos = [];

    for (const d of lista) {
      const dados = foundry.utils.deepClone(d.data);
      delete dados._id;
      if (Array.isArray(dados.items)) for (const it of dados.items) delete it._id;

      const existente = porNome.get(dados.name);
      if (existente && politica === "pular") { pulados++; continue; }
      if (existente && politica === "atualizar") {
        // Substituição limpa (evita merge de itens embutidos).
        await existente.delete();
        novos.push(dados);
        atualizados++;
        continue;
      }
      // "criar" (sem conflito ou política criar): nova cópia.
      novos.push(dados);
      criados++;
    }

    if (novos.length) await cls.createDocuments(novos, { pack: packId });
  }

  ui.notifications.info(game.i18n.format("ORDEM.Conteudo.Relatorio", { criados, atualizados, pulados }));
  return { criados, atualizados, pulados };
}

/**
 * Hub de conteúdo (aba Compêndios): exportar um compêndio para JSON ou importar
 * de arquivos/GitHub direto para os compêndios certos.
 */
export async function abrirGerenciadorConteudo() {
  if (!game.user.isGM) return ui.notifications.warn(game.i18n.localize("ORDEM.Conteudo.SoGM"));

  const packOptions = _packsDoSistema()
    .map(p => `<option value="${p.collection}">${p.title}</option>`).join("");

  const conteudo = `<form class="ordem-roll-dialog op-conteudo">
    <fieldset>
      <legend><i class="fas fa-file-export"></i> ${game.i18n.localize("ORDEM.Conteudo.Exportar")}</legend>
      <p class="hint">${game.i18n.localize("ORDEM.Conteudo.ExportarAjuda")}</p>
      <div class="op-conteudo-linha">
        <select name="packExport">
          <option value="__todos__">${game.i18n.localize("ORDEM.Conteudo.Todos")}</option>
          ${packOptions}
        </select>
        <button type="button" data-action="exportar"><i class="fas fa-download"></i> ${game.i18n.localize("ORDEM.Conteudo.BaixarJson")}</button>
      </div>
    </fieldset>
    <fieldset>
      <legend><i class="fas fa-file-import"></i> ${game.i18n.localize("ORDEM.Conteudo.Importar")}</legend>
      <p class="hint">${game.i18n.localize("ORDEM.Conteudo.ImportarAjuda")}</p>
      <div class="form-group">
        <label><i class="fab fa-github"></i> ${game.i18n.localize("ORDEM.IO.UrlLabel")}</label>
        <input type="text" name="url" placeholder="https://github.com/usuario/repo/tree/main/conteudo" />
      </div>
      <div class="op-import-ou">${game.i18n.localize("ORDEM.IO.Ou")}</div>
      <div class="form-group">
        <label><i class="fas fa-file-arrow-up"></i> ${game.i18n.localize("ORDEM.IO.ArquivoLabel")}</label>
        <input type="file" name="arquivo" accept=".json,application/json" multiple />
      </div>
    </fieldset>
  </form>`;

  new Dialog({
    title: game.i18n.localize("ORDEM.Conteudo.Titulo"),
    content: conteudo,
    buttons: {
      importar: {
        icon: '<i class="fas fa-file-import"></i>',
        label: game.i18n.localize("ORDEM.Conteudo.Importar"),
        callback: async html => {
          const form = html[0].querySelector("form");
          const url = form.url?.value?.trim() ?? "";
          const arquivos = form.arquivo?.files ?? [];
          if (!url && !arquivos.length) return ui.notifications.warn(game.i18n.localize("ORDEM.IO.NadaSelecionado"));

          const jsons = [];
          try {
            for (const file of arquivos) jsons.push(JSON.parse(await readTextFromFile(file)));
            if (url) jsons.push(...await _buscarFichasDeUrl(url));
          } catch (e) {
            console.error("Ordem Paranormal | Erro ao ler conteúdo", e);
            return ui.notifications.error(game.i18n.localize("ORDEM.IO.ErroLeitura"));
          }
          await importarParaCompendios(jsons);
        }
      },
      fechar: {
        icon: '<i class="fas fa-times"></i>',
        label: game.i18n.localize("ORDEM.Dialog.Cancelar")
      }
    },
    default: "fechar",
    render: html => {
      html[0].querySelector("[data-action='exportar']")?.addEventListener("click", ev => {
        ev.preventDefault();
        const v = html[0].querySelector("[name='packExport']")?.value;
        if (v === "__todos__") exportarTodosCompendios();
        else if (v) exportarCompendio(v);
      });
    }
  }, { classes: ["ordem-paranormal", "op-theme", "dialog", "op-conteudo-dialog"], width: 480 }).render(true);
}

/* -------------------------------------------------------------------------- */
/*  CRIADOR DE ITENS PASSO A PASSO (assistente com fórmulas)                   */
/* -------------------------------------------------------------------------- */

/**
 * Especificação dos campos por tipo de Item, usada pelo assistente de criação.
 * `tipo`: texto | numero | formula | select | textarea | checkbox.
 * Campos `formula` aceitam `@status` e dados (ex.: `2d6+@FOR`).
 * @private
 */
function _criadorSpec() {
  const sel = (lista, comVazio) => (comVazio ? [{ value: "", label: "—" }] : []).concat(lista);
  const atributos = Object.keys(ORDEM.atributos).map(k => ({ value: k, label: game.i18n.localize(ORDEM.atributos[k]) }));
  const classes = Object.entries(ORDEM.classes).map(([k, v]) => ({ value: k, label: game.i18n.localize(v) }));
  const elementos = Object.entries(ORDEM.elementos).map(([k, v]) => ({ value: k, label: game.i18n.localize(v) }));
  const tiposDano = ORDEM.tiposDano.map(v => ({ value: v, label: game.i18n.localize(`ORDEM.TipoDano.${v}`) }));
  const resistencias = ["fortitude", "reflexos", "vontade"].map(v => ({ value: v, label: game.i18n.localize(`ORDEM.Pericia.${v}`) }));

  const F = (key, label, tipo, opcoes) => ({ key, label: game.i18n.localize(label), tipo, opcoes });

  return {
    arma: [
      F("dano", "ORDEM.Campo.dano", "formula"),
      F("tipoDano", "ORDEM.Campo.tipoDano", "select", tiposDano),
      F("tipoArma", "ORDEM.Campo.tipoArma", "select", ["simples", "tatica", "pesada"].map(v => ({ value: v, label: game.i18n.localize(`ORDEM.CategoriaArma.${v}`) }))),
      F("testePericia", "ORDEM.Campo.testePericia", "select", ["luta", "pontaria"].map(v => ({ value: v, label: game.i18n.localize(`ORDEM.Pericia.${v}`) }))),
      F("somaAtributoDano", "ORDEM.Campo.somaAtributoDano", "select", sel(atributos, true)),
      F("alcance", "ORDEM.Campo.alcance", "texto"),
      F("bonusAtaque", "ORDEM.Campo.bonusAtaque", "formula"),
      F("margemAmeaca", "ORDEM.Campo.margemAmeaca", "numero"),
      F("categoria", "ORDEM.Campo.categoria", "texto"),
      F("espacos", "ORDEM.Campo.espacos", "numero")
    ],
    protecao: [
      F("defesaBonus", "ORDEM.Campo.defesaBonus", "numero"),
      F("penalidade", "ORDEM.Campo.penalidade", "numero"),
      F("tipoProtecao", "ORDEM.Campo.tipoProtecao", "select", ["leve", "pesada"].map(v => ({ value: v, label: game.i18n.localize(`ORDEM.TipoProtecao.${v}`) }))),
      F("categoria", "ORDEM.Campo.categoria", "texto"),
      F("espacos", "ORDEM.Campo.espacos", "numero")
    ],
    ritual: [
      F("circulo", "ORDEM.Campo.circulo", "numero"),
      F("elemento", "ORDEM.Campo.elemento", "select", elementos),
      F("custoPe", "ORDEM.Campo.custoPe", "numero"),
      F("execucao", "ORDEM.Campo.execucao", "texto"),
      F("alcance", "ORDEM.Campo.alcanceRitual", "texto"),
      F("area", "ORDEM.Campo.area", "texto"),
      F("duracao", "ORDEM.Campo.duracao", "texto"),
      F("resistenciaPericia", "ORDEM.Ritual.ResistPericia", "select", sel(resistencias, true)),
      F("efeito", "ORDEM.Campo.efeito", "textarea")
    ],
    poder: [
      F("classe", "ORDEM.Campo.classe", "select", sel(classes, true)),
      F("requisitoNex", "ORDEM.Campo.requisitoNex", "numero"),
      F("custoPe", "ORDEM.Campo.custoPe", "numero"),
      F("tipo", "ORDEM.Campo.tipo", "select", ["ativo", "passivo"].map(v => ({ value: v, label: game.i18n.localize(`ORDEM.TipoPoder.${v}`) }))),
      F("paranormal", "ORDEM.Poder.Paranormal", "checkbox"),
      F("elemento", "ORDEM.Campo.elemento", "select", sel(elementos, true)),
      F("usosPorCena", "ORDEM.Poder.UsosPorCena", "numero"),
      F("descricao", "ORDEM.Aba.Descricao", "textarea")
    ],
    equipamento: [
      F("categoria", "ORDEM.Campo.categoria", "texto"),
      F("espacos", "ORDEM.Campo.espacos", "numero"),
      F("descricao", "ORDEM.Aba.Descricao", "textarea")
    ],
    origem: [
      F("periciasTreinadas", "ORDEM.Campo.periciasTreinadas", "texto"),
      F("poderNome", "ORDEM.Campo.poderNome", "texto"),
      F("descricao", "ORDEM.Aba.Descricao", "textarea")
    ],
    trilha: [
      F("classe", "ORDEM.Campo.classe", "select", sel(classes, true)),
      F("nex", "ORDEM.Campo.requisitoNex", "numero"),
      F("descricao", "ORDEM.Aba.Descricao", "textarea")
    ],
    condicao: [
      F("descricao", "ORDEM.Aba.Descricao", "textarea")
    ]
  };
}

/** Renderiza o HTML de um campo do assistente. @private */
function _criadorCampoHtml(c) {
  const hintFormula = c.tipo === "formula"
    ? ` title="${game.i18n.localize("ORDEM.Mod.ValorAjuda")}"`
    : "";
  let input;
  switch (c.tipo) {
    case "numero":
      input = `<input type="number" name="${c.key}" value="0" />`; break;
    case "formula":
      input = `<input type="text" name="${c.key}" value="" placeholder="${game.i18n.localize("ORDEM.Mod.ValorPlaceholder")}"${hintFormula} />`; break;
    case "textarea":
      input = `<textarea name="${c.key}" rows="3"></textarea>`; break;
    case "checkbox":
      input = `<input type="checkbox" name="${c.key}" />`; break;
    case "select":
      input = `<select name="${c.key}">${(c.opcoes ?? []).map(o => `<option value="${o.value}">${o.label}</option>`).join("")}</select>`; break;
    default:
      input = `<input type="text" name="${c.key}" value="" />`;
  }
  return `<div class="form-group ${c.tipo === "textarea" ? "span2" : ""}">
    <label>${c.label}</label>
    ${input}
  </div>`;
}

/**
 * Assistente PASSO A PASSO para criar um Item do sistema (Item independente no
 * diretório do Mundo). Passo 1: tipo + nome. Passo 2: campos do tipo, com
 * suporte a fórmulas (`@status`, dados). Ao final, cria o Item e abre a ficha.
 */
export async function abrirCriadorItem() {
  if (!game.user.can("ITEM_CREATE")) {
    return ui.notifications.warn(game.i18n.localize("ORDEM.Criador.SemPermissao"));
  }

  const spec = _criadorSpec();
  const tipos = Object.keys(spec);
  const tipoOptions = tipos.map(t =>
    `<option value="${t}">${game.i18n.localize(`ORDEM.TipoItem.${t}`)}</option>`).join("");

  // ----- Passo 1: tipo + nome -----
  const passo1 = `<form class="ordem-roll-dialog op-criador">
    <p class="hint">${game.i18n.localize("ORDEM.Criador.Ajuda")}</p>
    <div class="form-group">
      <label>${game.i18n.localize("ORDEM.Criador.Tipo")}</label>
      <select name="tipo">${tipoOptions}</select>
    </div>
    <div class="form-group">
      <label>${game.i18n.localize("ORDEM.Campo.nome")}</label>
      <input type="text" name="nome" placeholder="${game.i18n.localize("ORDEM.Criador.NomePlaceholder")}" />
    </div>
  </form>`;

  const escolha = await new Promise(resolve => {
    new Dialog({
      title: game.i18n.localize("ORDEM.Criador.Titulo"),
      content: passo1,
      buttons: {
        proximo: {
          icon: '<i class="fas fa-arrow-right"></i>',
          label: game.i18n.localize("ORDEM.Criador.Proximo"),
          callback: html => {
            const form = html[0].querySelector("form");
            resolve({ tipo: form.tipo.value, nome: form.nome.value.trim() });
          }
        },
        cancelar: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize("ORDEM.Dialog.Cancelar"),
          callback: () => resolve(null)
        }
      },
      default: "proximo"
    }, { classes: ["ordem-paranormal", "op-theme", "dialog"], width: 420 }).render(true);
  });
  if (!escolha) return;

  const tipo = escolha.tipo;
  const campos = spec[tipo] ?? [];
  const nomeDefault = escolha.nome || game.i18n.format("ORDEM.Item.Novo", { tipo: game.i18n.localize(`ORDEM.TipoItem.${tipo}`) });

  // ----- Passo 2: campos do tipo -----
  const passo2 = `<form class="ordem-roll-dialog op-criador">
    <p class="roll-info">${game.i18n.localize(`ORDEM.TipoItem.${tipo}`)}: <strong>${Handlebars.escapeExpression(nomeDefault)}</strong></p>
    <div class="campos-grid">${campos.map(_criadorCampoHtml).join("")}</div>
    <p class="hint">${game.i18n.localize("ORDEM.Criador.FormulaAjuda")}</p>
  </form>`;

  const dados = await new Promise(resolve => {
    new Dialog({
      title: game.i18n.format("ORDEM.Criador.Titulo2", { nome: nomeDefault }),
      content: passo2,
      buttons: {
        criar: {
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n.localize("ORDEM.Criador.Criar"),
          callback: html => {
            const form = html[0].querySelector("form");
            const sys = {};
            for (const c of campos) {
              const el = form.elements[c.key];
              if (!el) continue;
              if (c.tipo === "numero") sys[c.key] = Number(el.value) || 0;
              else if (c.tipo === "checkbox") sys[c.key] = !!el.checked;
              else sys[c.key] = el.value ?? "";
            }
            resolve(sys);
          }
        },
        voltar: {
          icon: '<i class="fas fa-arrow-left"></i>',
          label: game.i18n.localize("ORDEM.Criador.Voltar"),
          callback: () => resolve("voltar")
        },
        cancelar: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize("ORDEM.Dialog.Cancelar"),
          callback: () => resolve(null)
        }
      },
      default: "criar"
    }, { classes: ["ordem-paranormal", "op-theme", "dialog"], width: 480 }).render(true);
  });
  if (!dados) return;
  if (dados === "voltar") return abrirCriadorItem(); // recomeça o assistente

  const [item] = await Item.create([{ name: nomeDefault, type: tipo, system: dados }]);
  if (item) {
    ui.notifications.info(game.i18n.format("ORDEM.Criador.Criado", { nome: item.name }));
    item.sheet?.render(true);
  }
  return item;
}

/* -------------------------------------------------------------------------- */
/*  SOBRE / LICENÇA                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Janela "Sobre / Licença": exibe o selo da Licença da Comunidade de Ordem
 * Paranormal dentro do sistema (requisito da licença — selo visível), o aviso
 * de conteúdo não oficial e o link para a licença oficial.
 */
class OrdemSobreLicenca extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "ordem-sobre-licenca",
      title: game.i18n.localize("ORDEM.Sobre.Titulo"),
      template: "systems/ordem-paranormal/templates/sobre-licenca.hbs",
      classes: ["ordem-paranormal", "op-sobre-app"],
      width: 420,
      height: "auto",
      resizable: false
    });
  }

  getData() {
    return { versao: game.system?.version ?? "" };
  }

  /** Janela só de leitura — nada a salvar. */
  async _updateObject() {}
}

/* -------------------------------------------------------------------------- */
/*  HOOKS DO FOUNDRY                                                           */
/* -------------------------------------------------------------------------- */

Hooks.once("init", function () {
  console.log("Ordem Paranormal | Inicializando o sistema.");

  // Expõe a API do sistema globalmente para macros e depuração.
  game.ordem = {
    ORDEM,
    CONDICOES,
    // Testes
    rolarTeste,
    rolarDano,
    rolarAtaque,
    rolarResistencia,
    rolarAjuda,
    // Condições
    aplicarCondicao,
    removerCondicao,
    abrirSeletorCondicao,
    // Ferimentos, morte & sanidade
    aplicarDano,
    aplicarDanoMental,
    curar,
    recuperarSanidade,
    marcarTurnoMorrendo,
    estabilizar,
    marcarTurnoEnlouquecendo,
    acalmar,
    // Poderes & trilhas
    usarPoder,
    usarHabilidadeTrilha,
    // Combate avançado
    rolarManobra,
    acaoDefesa,
    abrirAcoesCombate,
    rolarIniciativaAtor,
    // Criaturas
    rolarTesteCriatura,
    rolarAtaqueCriatura,
    usarHabilidadeCriatura,
    presencaPerturbadora,
    // Ferramentas de mesa
    abrirTesteEstendido,
    abrirCenaInvestigacao,
    abrirPedirTeste,
    criarPedidoTeste,
    abrirPedirAcao,
    criarPedidoAcao,
    aplicarModificadorTemporario,
    abrirCenaPerseguicao,
    abrirCenaFurtividade,
    efeitosDeMedo,
    abrirCenasSaH,
    novaCena,
    abrirInterludio,
    // Exportar / importar fichas
    exportarAgente,
    importarFichas,
    // Criação e compartilhamento de conteúdo
    abrirCriadorItem,
    editarResistenciasDanos,
    abrirGerenciadorConteudo,
    exportarCompendio,
    exportarTodosCompendios,
    importarParaCompendios,
    // Rituais & progressão
    conjurarRitual,
    subirNex,
    voltarNex,
    // Modo de regras (Padrão ↔ Sobrevivendo ao Horror)
    modoDoAtor,
    progredirXP,
    liberarRitual,
    // Fórmulas (atributos + dados em qualquer campo)
    resolverTokensFormula,
    avaliarFormulaPassiva,
    OrdemActor
  };
  CONFIG.ORDEM = ORDEM;

  // Classe de Ator customizada (cálculos derivados).
  CONFIG.Actor.documentClass = OrdemActor;

  // Iniciativa "melhor de N" usando a perícia Iniciativa (via Combatant custom).
  // OrdemCombatant estende Combatant -> registra em CONFIG.Combatant (NÃO CONFIG.Combat).
  CONFIG.Combatant.documentClass = OrdemCombatant;
  CONFIG.Combat.initiative = { formula: "1d20", decimals: 0 };

  // Menu "Sobre / Licença": exibe o selo da Licença da Comunidade dentro do
  // sistema (requisito da licença) e o link para a licença oficial.
  game.settings.registerMenu("ordem-paranormal", "sobreLicenca", {
    name: "ORDEM.Sobre.MenuName",
    label: "ORDEM.Sobre.MenuLabel",
    hint: "ORDEM.Sobre.MenuHint",
    icon: "fas fa-scroll",
    type: OrdemSobreLicenca,
    restricted: false
  });

  // Configuração: exibir o carrossel de turnos no topo da tela (por cliente).
  game.settings.register("ordem-paranormal", "mostrarCarrossel", {
    name: "ORDEM.Carrossel.Setting",
    hint: "ORDEM.Carrossel.SettingHint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => game.ordem?.carrossel?.render()
  });

  // Configuração (Mestre): custo de XP para avançar um marco de NEX no modo
  // "Sobrevivendo ao Horror". Valor-base ajustável (a tabela oficial não consta
  // do material disponível — confirme com o livro do Mestre quando houver).
  game.settings.register("ordem-paranormal", "xpCustoPorMarco", {
    name: "ORDEM.XP.SettingCusto",
    hint: "ORDEM.XP.SettingCustoHint",
    scope: "world",
    config: true,
    type: Number,
    default: Number(SAH_CONFIG.xp.custoPorMarco) || 10
  });

  // Registra as fichas de Ator.
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("ordem-paranormal", OrdemAgentSheet, {
    types: ["agente"],
    makeDefault: true,
    label: "ORDEM.Sheet.Agente"
  });
  Actors.registerSheet("ordem-paranormal", OrdemCriaturaSheet, {
    types: ["criatura"],
    makeDefault: true,
    label: "ORDEM.Sheet.Criatura"
  });

  // Registra a ficha genérica de Item.
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("ordem-paranormal", OrdemItemSheet, {
    makeDefault: true,
    label: "ORDEM.Sheet.Item"
  });

  // Helpers e templates.
  _registrarHelpers();
  _preCarregarTemplates();
});

Hooks.once("ready", function () {
  console.log("Ordem Paranormal | Sistema pronto.");

  // Carrossel de turnos: instância única + re-render em mudanças de combate.
  game.ordem.carrossel = new OrdemCombatCarousel();
  game.ordem.carrossel.render();
  for (const hook of ["createCombat", "updateCombat", "deleteCombat",
                      "createCombatant", "updateCombatant", "deleteCombatant"]) {
    Hooks.on(hook, () => game.ordem.carrossel.render());
  }
});

// Grupo dedicado do sistema na barra lateral de controles de cena (só GM).
Hooks.on("getSceneControlButtons", controls => {
  if (!game.user.isGM) return;
  controls.push({
    name:    "ordem-paranormal",
    title:   "Ordem Paranormal",
    icon:    "fas fa-eye",
    visible: true,
    tools: [
      {
        name:    "pedir-teste",
        title:   game.i18n.localize("ORDEM.PT.BotaoLabel"),
        icon:    "fas fa-dice-d20",
        visible: true,
        onClick: () => abrirPedirTeste(),
        button:  true
      },
      {
        name:    "pedir-acao",
        title:   game.i18n.localize("ORDEM.PA.BotaoLabel"),
        icon:    "fas fa-burst",
        visible: true,
        onClick: () => abrirPedirAcao(),
        button:  true
      },
      {
        name:    "cenas-sah",
        title:   game.i18n.localize("ORDEM.CenaSaH.Titulo"),
        icon:    "fas fa-skull-crossbones",
        visible: true,
        onClick: () => abrirCenasSaH(),
        button:  true
      },
      {
        name:    "nova-cena",
        title:   game.i18n.localize("ORDEM.Cena.Nova"),
        icon:    "fas fa-clapperboard",
        visible: true,
        onClick: () => novaCena(),
        button:  true
      }
    ]
  });
});

// Botão "Importar Agente (JSON/GitHub)" no topo da aba de Atores.
Hooks.on("renderActorDirectory", (app, html) => {
  if (!game.user.can("ACTOR_CREATE")) return;
  // Evita duplicar ao re-renderizar.
  if (html.find(".op-importar-fichas").length) return;

  const btn = $(`<button type="button" class="op-importar-fichas">
    <i class="fas fa-file-import"></i> ${game.i18n.localize("ORDEM.IO.ImportarAgente")}
  </button>`);
  btn.on("click", () => importarFichas());

  const acoes = html.find(".header-actions").first();
  if (acoes.length) acoes.append(btn);
  else html.find(".directory-footer").append(btn);
});

// Botão "Criar Item" (assistente passo a passo) no topo da aba de Itens.
Hooks.on("renderItemDirectory", (app, html) => {
  if (!game.user.can("ITEM_CREATE")) return;
  if (html.find(".op-criar-item").length) return;

  const btn = $(`<button type="button" class="op-criar-item">
    <i class="fas fa-wand-magic-sparkles"></i> ${game.i18n.localize("ORDEM.Criador.Botao")}
  </button>`);
  btn.on("click", () => abrirCriadorItem());

  const acoes = html.find(".header-actions").first();
  if (acoes.length) acoes.append(btn);
  else html.find(".directory-footer").append(btn);
});

// Botão "Conteúdo Ordem (GitHub)" no rodapé da aba de Compêndios (só GM).
Hooks.on("renderCompendiumDirectory", (app, html) => {
  if (!game.user.isGM) return;
  if (html.find(".op-conteudo-github").length) return;

  const btn = $(`<button type="button" class="op-conteudo-github">
    <i class="fab fa-github"></i> ${game.i18n.localize("ORDEM.Conteudo.Botao")}
  </button>`);
  btn.on("click", () => abrirGerenciadorConteudo());

  const rodape = html.find(".directory-footer");
  if (rodape.length) rodape.append(btn);
  else html.find(".header-actions").first().append(btn);
});

/* -------------------------------------------------------------------------- */
/*  HOOKS DE AUTOMAÇÃO — ITENS E ESTADO DO ATOR                                */
/* -------------------------------------------------------------------------- */

/** Normaliza texto para comparação (minúsculas, sem acentos). @private */
function _normalizar(s) {
  return String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

/**
 * ORIGEM: ao adicionar uma origem ao agente, aplica automaticamente o
 * treinamento (+5) nas perícias listadas (aceita chaves ou nomes, separados
 * por vírgula) e anuncia o poder de origem.
 * PODER: avisa se os pré-requisitos (NEX / classe / elemento) não são atendidos.
 * TRILHA: avisa se a classe da trilha não bate com a do agente.
 */
Hooks.on("createItem", async (item, options, userId) => {
  if (userId !== game.user.id) return;
  const actor = item.parent;
  if (!actor || actor.type !== "agente") return;

  if (item.type === "origem") {
    const texto = item.system.periciasTreinadas ?? "";
    if (!texto.trim()) return;

    // Resolve cada termo para uma chave de perícia (por chave ou rótulo).
    const chaves = [];
    for (const termo of texto.split(",")) {
      const norm = _normalizar(termo);
      if (!norm) continue;
      const porChave = Object.keys(ORDEM.pericias).find(k => _normalizar(k) === norm);
      const porLabel = Object.keys(ORDEM.pericias).find(k =>
        _normalizar(game.i18n.localize(`ORDEM.Pericia.${k}`)) === norm);
      const chave = porChave ?? porLabel;
      if (chave) chaves.push(chave);
    }
    if (!chaves.length) return;

    // Aplica treino 5 nas perícias destreinadas (não rebaixa treinos maiores).
    const update = {};
    const aplicadas = [];
    for (const chave of chaves) {
      const atual = Number(actor.system.pericias?.[chave]?.treino) || 0;
      if (atual < 5) {
        update[`system.pericias.${chave}.treino`] = 5;
        aplicadas.push(game.i18n.localize(`ORDEM.Pericia.${chave}`));
      }
    }
    if (Object.keys(update).length) await actor.update(update);

    await _cardEvento(actor, {
      icone: "fa-id-card-clip", classe: "origem",
      titulo: game.i18n.format("ORDEM.Origem.Aplicada", { nome: item.name }),
      texto: (aplicadas.length
        ? game.i18n.format("ORDEM.Origem.PericiasAplicadas", { pericias: aplicadas.join(", ") }) + "<br/>"
        : "") +
        (item.system.poderNome
          ? game.i18n.format("ORDEM.Origem.PoderConcedido", { poder: Handlebars.escapeExpression(item.system.poderNome) })
          : "")
    });
    // Sincroniza o campo de texto "origem" do cabeçalho da ficha.
    if (!actor.system.origem) await actor.update({ "system.origem": item.name });
  }

  if (item.type === "poder") {
    const avisos = verificarPrerequisitosPoder(actor, item);
    for (const aviso of avisos) ui.notifications.warn(`${item.name}: ${aviso}`);
  }

  if (item.type === "trilha") {
    const classeTrilha = item.system.classe;
    if (classeTrilha && actor.system.classe && classeTrilha !== actor.system.classe) {
      ui.notifications.warn(game.i18n.format("ORDEM.Trilha.AvisoClasse", {
        trilha: item.name,
        classe: game.i18n.localize(ORDEM.classes[classeTrilha] ?? classeTrilha)
      }));
    }
    if (!actor.system.trilha) await actor.update({ "system.trilha": item.name });
  }
});

/**
 * Transições automáticas de estado ao atualizar recursos:
 *  - PV chega a 0  → aplica "inconsciente" + "morrendo";
 *  - PV volta a 1+ → remove "morrendo"/"inconsciente" e zera o contador;
 *  - SAN chega a 0 → aplica "enlouquecendo";
 *  - SAN volta a 1+→ remove "enlouquecendo" e zera o contador.
 */
Hooks.on("updateActor", async (actor, changes, options, userId) => {
  if (userId !== game.user.id) return;
  if (actor.type !== "agente") return;

  const pvNovo = foundry.utils.getProperty(changes, "system.recursos.pv.value");
  if (pvNovo !== undefined) {
    if (pvNovo <= 0 && !actor.items.some(i => i.type === "condicao" && i.system.chave === "morrendo")) {
      await aplicarCondicao(actor, "morrendo", { anunciar: false });
      await _cardEvento(actor, {
        icone: "fa-skull", classe: "morte",
        titulo: game.i18n.format("ORDEM.Morte.Caiu", { nome: actor.name }),
        texto: game.i18n.localize("ORDEM.Morte.CaiuTexto")
      });
    } else if (pvNovo >= 1) {
      const tinha = actor.items.some(i => i.type === "condicao" && ["morrendo", "inconsciente"].includes(i.system.chave));
      if (tinha) {
        await removerCondicao(actor, "morrendo", { anunciar: false });
        await removerCondicao(actor, "inconsciente", { anunciar: false });
        if (Number(actor.system.recursos?.pv?.rodadasMorrendo) > 0) {
          await actor.update({ "system.recursos.pv.rodadasMorrendo": 0 });
        }
        await _cardEvento(actor, {
          icone: "fa-heart-pulse", classe: "sucesso",
          titulo: game.i18n.format("ORDEM.Morte.Recuperou", { nome: actor.name }),
          texto: ""
        });
      }
    }
  }

  const sanNovo = foundry.utils.getProperty(changes, "system.recursos.san.value");
  if (sanNovo !== undefined) {
    if (sanNovo <= 0 && !actor.items.some(i => i.type === "condicao" && i.system.chave === "enlouquecendo")) {
      await aplicarCondicao(actor, "enlouquecendo", { anunciar: false });
      await _cardEvento(actor, {
        icone: "fa-ghost", classe: "morte",
        titulo: game.i18n.format("ORDEM.San.Zerou", { nome: actor.name }),
        texto: game.i18n.localize("ORDEM.San.ZerouTexto")
      });
    } else if (sanNovo >= 1) {
      const tinha = actor.items.some(i => i.type === "condicao" && i.system.chave === "enlouquecendo");
      if (tinha) {
        await removerCondicao(actor, "enlouquecendo", { anunciar: false });
        if (Number(actor.system.recursos?.san?.rodadasEnlouquecendo) > 0) {
          await actor.update({ "system.recursos.san.rodadasEnlouquecendo": 0 });
        }
      }
    }
  }
});

/**
 * Início de turno em combate: se o combatente está morrendo/enlouquecendo,
 * sussurra um lembrete ao Mestre com botões para marcar o turno.
 */
Hooks.on("updateCombat", async (combat, changed, options, userId) => {
  if (!game.user.isGM || userId !== game.user.id) return;
  if (changed.turn === undefined && changed.round === undefined) return;
  const actor = combat.combatant?.actor;
  if (!actor) return;

  // Decrementa a duração (em turnos) dos modificadores temporários do ator ativo.
  await _tickModificadores(actor);

  if (actor.type !== "agente") return;

  // Início do turno: devolve as ações da rodada (economia de ações) do agente ativo.
  // Só grava se algo estava gasto, para evitar updates/re-render desnecessários.
  const at = actor.system.acoesTurno ?? {};
  if (at.acao || at.movimento || at.acaoMinima || at.reacao) {
    await actor.update({
      "system.acoesTurno": { acao: false, movimento: false, acaoMinima: false, reacao: false }
    });
  }

  const morrendo = actor.items.some(i => i.type === "condicao" && i.system.chave === "morrendo");
  const enlouquecendo = actor.items.some(i => i.type === "condicao" && i.system.chave === "enlouquecendo");
  if (!morrendo && !enlouquecendo) return;

  const botoes = [];
  if (morrendo) {
    const n = Number(actor.system.recursos?.pv?.rodadasMorrendo) || 0;
    botoes.push(`<button type="button" class="ordem-card-botao" data-acao="marcar-morrendo" data-actor-uuid="${actor.uuid}">
      <i class="fas fa-skull"></i> ${game.i18n.format("ORDEM.Morte.MarcarTurno", { atual: n, max: 3 })}
    </button>`);
  }
  if (enlouquecendo) {
    const n = Number(actor.system.recursos?.san?.rodadasEnlouquecendo) || 0;
    botoes.push(`<button type="button" class="ordem-card-botao" data-acao="marcar-enlouquecendo" data-actor-uuid="${actor.uuid}">
      <i class="fas fa-ghost"></i> ${game.i18n.format("ORDEM.San.MarcarTurno", { atual: n, max: 3 })}
    </button>`);
  }

  await ChatMessage.create({
    whisper: ChatMessage.getWhisperRecipients("GM"),
    content: `<div class="ordem-chat-card evento morte">
      <header class="card-header"><i class="fas fa-triangle-exclamation"></i>
        <h3>${game.i18n.format("ORDEM.Morte.LembreteTurno", { nome: actor.name })}</h3>
      </header>
      <div class="card-content"><div class="card-botoes">${botoes.join("")}</div></div>
    </div>`,
    flags: { "ordem-paranormal": { tipo: "evento" } }
  });
});

/**
 * Liga os botões dos cards de chat: rolar dano (a partir de um ataque) e
 * aplicar a perda do "Custo do Paranormal" ao próprio conjurador.
 * Nenhuma ação afeta outros atores automaticamente.
 */
Hooks.on("renderChatMessage", (message, html) => {
  // Os cards usam o visual NATIVO do chat do Foundry (não forçamos o tema da ficha).

  // --- Pedido de Teste em grupo ---
  const ptFlags = message.flags?.["ordem-paranormal"];
  if (ptFlags?.tipo === "pedido-teste") {
    html.find("[data-action='pt-rolar']").each((_, btn) => {
      const actorId = btn.dataset.actorId;
      const actor   = game.actors.get(actorId);
      // Esconde o botão se o usuário não é o dono nem o GM.
      if (!actor?.isOwner && !game.user.isGM) {
        btn.style.display = "none";
        return;
      }
      btn.addEventListener("click", ev => {
        ev.preventDefault();
        _ptRolar(message, actorId);
      });
    });
    return; // evita re-processar os demais handlers neste card
  }

  // --- Pedido de Ação de Combate (Mestre dispara → tokens executam) ---
  if (ptFlags?.tipo === "pedido-acao") {
    html.find("[data-action='pa-executar']").each((_, btn) => {
      const actorId = btn.dataset.actorId;
      const actor   = game.actors.get(actorId);
      // Esconde o botão se o usuário não é o dono nem o GM.
      if (!actor?.isOwner && !game.user.isGM) {
        btn.style.display = "none";
        return;
      }
      btn.addEventListener("click", ev => {
        ev.preventDefault();
        _paExecutar(message, actorId);
      });
    });
    return;
  }

  // Botões exclusivos do Mestre ficam ocultos para jogadores.
  if (!game.user.isGM) html.find(".gm-only").hide();

  html.find(".ordem-card-botao").on("click", async (ev) => {
    ev.preventDefault();
    const b = ev.currentTarget;
    const acao = b.dataset.acao;

    if (acao === "dano") {
      const item = await fromUuid(b.dataset.itemUuid);
      if (!item) return ui.notifications.warn(game.i18n.localize("ORDEM.Aviso.ItemNaoEncontrado"));
      return rolarDano(item.actor, item, { critico: b.dataset.critico === "true" });
    }

    // Dano por fórmula avulsa (ataques estruturados de criatura).
    if (acao === "dano-formula") {
      return rolarDano(null, {
        name: b.dataset.nome || game.i18n.localize("ORDEM.Dano.Generico"),
        system: { dano: b.dataset.formula || "1d6", tipoDano: b.dataset.tipo || "" }
      });
    }

    // Mestre aplica o dano do card aos tokens selecionados (com regras de
    // dano massivo e transição para morrendo).
    if (acao === "aplicar-dano") {
      if (!game.user.isGM) return ui.notifications.warn(game.i18n.localize("ORDEM.Aviso.SemPermissao"));
      const dano = Number(b.dataset.dano) || 0;
      const tipo = b.dataset.tipo || "";
      const tokens = canvas?.tokens?.controlled ?? [];
      if (!tokens.length) return ui.notifications.warn(game.i18n.localize("ORDEM.Dano.SemSelecionados"));
      for (const t of tokens) {
        if (t.actor) await aplicarDano(t.actor, dano, { tipo });
      }
      return ui.notifications.info(game.i18n.format("ORDEM.Dano.Aplicado", { dano, qtd: tokens.length }));
    }

    // Alvo de ritual rola a resistência (Fortitude/Reflexos/Vontade) vs DT.
    if (acao === "ritual-resistir") {
      const actor = canvas?.tokens?.controlled[0]?.actor ?? game.user?.character;
      if (!actor) return ui.notifications.warn(game.i18n.localize("ORDEM.Aviso.SemAtor"));
      return rolarTeste(actor, {
        periciaKey: b.dataset.pericia,
        cd: Number(b.dataset.dt) || 15,
        titulo: game.i18n.localize("ORDEM.Ritual.ResistenciaTitulo")
      });
    }

    // Lembretes de turno (Mestre): marcar turno morrendo / enlouquecendo.
    if (acao === "marcar-morrendo") {
      const actor = await fromUuid(b.dataset.actorUuid);
      if (actor) { b.disabled = true; return marcarTurnoMorrendo(actor); }
      return;
    }
    if (acao === "marcar-enlouquecendo") {
      const actor = await fromUuid(b.dataset.actorUuid);
      if (actor) { b.disabled = true; return marcarTurnoEnlouquecendo(actor); }
      return;
    }

    if (acao === "custo-paranormal") {
      const actor = await fromUuid(b.dataset.actorUuid);
      if (!actor) return;
      const dano = Number(b.dataset.dano) || 0;
      const perda = Number(b.dataset.perda) || 0;
      const san = actor.system.recursos?.san;
      if (!san) return;
      const update = { "system.recursos.san.value": Math.max(0, (Number(san.value) || 0) - dano) };
      // Perda permanente reduz o máximo (via bonusMax negativo).
      if (perda) update["system.recursos.san.bonusMax"] = (Number(san.bonusMax) || 0) - perda;
      await actor.update(update);
      b.disabled = true;
      ui.notifications.info(game.i18n.localize("ORDEM.Ritual.PerdaAplicada"));
    }
  });
});
