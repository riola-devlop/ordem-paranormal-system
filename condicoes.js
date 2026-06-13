/**
 * Catálogo OFICIAL de condições — Ordem Paranormal RPG (Apêndice, pág. 310).
 * ---------------------------------------------------------------------------
 * Cada condição define:
 *  - nome / icone / descricao  : exibição
 *  - categoria                 : medo | mental | paralisia | fadiga | sentidos | fisica | especial
 *  - modificadores[]           : efeitos automáticos (mesmo formato dos itens)
 *      · alvos "dados.*" são PENALIDADES/BÔNUS EM DADOS (−Ⓞ do livro = −1 d20 no pool)
 *      · alvos planos (defesa, custoPe...) somam direto
 *  - implica[]                 : outras condições incluídas (ex.: agarrado → desprevenido)
 *  - agravaPara                : aplicar de novo vira esta condição (ex.: abalado → apavorado)
 *  - especial                  : chave de tratamento no motor (lento, imovel, contadores)
 *
 * A menos que dito o contrário, condições terminam no fim da cena.
 */

export const CONDICOES = {

  abalado: {
    nome: "Abalado", icone: "icons/svg/terror.svg", categoria: "medo",
    agravaPara: "apavorado",
    modificadores: [{ alvo: "dados.todos", valor: -1 }],
    descricao: "Sofre −1d20 em testes. Se ficar abalado novamente, em vez disso fica apavorado. Condição de medo."
  },

  agarrado: {
    nome: "Agarrado", icone: "icons/svg/net.svg", categoria: "paralisia",
    implica: ["desprevenido", "imovel"],
    modificadores: [{ alvo: "dados.ataque", valor: -1 }],
    descricao: "Desprevenido e imóvel; sofre −1d20 em testes de ataque e só pode atacar com armas leves. Pode se soltar com uma ação padrão, vencendo um teste de manobra oposto. Ataques à distância contra o agarrão têm 50% de chance de acertar o alvo errado."
  },

  alquebrado: {
    nome: "Alquebrado", icone: "icons/svg/downgrade.svg", categoria: "mental",
    modificadores: [{ alvo: "custoPe", valor: 1 }],
    descricao: "O custo em PE das habilidades e dos rituais aumenta em +1. Condição mental."
  },

  apavorado: {
    nome: "Apavorado", icone: "icons/svg/terror.svg", categoria: "medo",
    modificadores: [{ alvo: "dados.todos", valor: -2 }],
    descricao: "Sofre −2d20 em testes de perícia e deve fugir da fonte do medo da maneira mais eficiente possível. Se não puder, pode agir, mas não pode se aproximar voluntariamente da fonte do medo. Condição de medo."
  },

  asfixiado: {
    nome: "Asfixiado", icone: "icons/svg/silenced.svg", categoria: "fisica",
    modificadores: [],
    descricao: "Não pode respirar. Pode prender o fôlego por um total de rodadas igual a Vigor +1 (cada dano sofrido reduz em 1). Ao final do último turno, fica morrendo."
  },

  atordoado: {
    nome: "Atordoado", icone: "icons/svg/daze.svg", categoria: "mental",
    implica: ["desprevenido"],
    modificadores: [],
    descricao: "Fica desprevenido e não pode fazer ações. Condição mental."
  },

  caido: {
    nome: "Caído", icone: "icons/svg/falling.svg", categoria: "fisica",
    modificadores: [
      { alvo: "dados.ataque", valor: -2 },
      { alvo: "defesa", valor: -5 }
    ],
    descricao: "Deitado no chão. Sofre −2d20 em ataques corpo a corpo e deslocamento reduzido a 1,5m. Sofre −5 na Defesa contra ataques corpo a corpo, mas recebe +5 na Defesa contra ataques à distância (ajuste manual conforme o ataque). Levantar-se gasta uma ação de movimento.",
    especial: "lento"
  },

  cego: {
    nome: "Cego", icone: "icons/svg/blind.svg", categoria: "sentidos",
    implica: ["desprevenido", "lento"],
    modificadores: [
      { alvo: "dados.atributo.agi", valor: -2 },
      { alvo: "dados.atributo.for", valor: -2 }
    ],
    descricao: "Desprevenido e lento; não pode fazer testes de Percepção para observar e sofre −2d20 em perícias baseadas em Agilidade ou Força. Todos os alvos de seus ataques recebem camuflagem total (50% de falha). Condição de sentidos."
  },

  confuso: {
    nome: "Confuso", icone: "icons/svg/stoned.svg", categoria: "mental",
    modificadores: [],
    descricao: "Comporta-se de modo aleatório. Role 1d6 no início dos turnos: 1) move-se em direção aleatória (1d8); 2–3) não faz ações, balbucia; 4–5) ataca o ser mais próximo (ou a si mesmo, se sozinho); 6) a condição termina. Condição mental."
  },

  debilitado: {
    nome: "Debilitado", icone: "icons/svg/downgrade.svg", categoria: "fadiga",
    agravaPara: "inconsciente",
    modificadores: [
      { alvo: "dados.atributo.agi", valor: -2 },
      { alvo: "dados.atributo.for", valor: -2 },
      { alvo: "dados.atributo.vig", valor: -2 }
    ],
    descricao: "Sofre −2d20 em testes de Agilidade, Força e Vigor. Se ficar debilitado novamente, em vez disso fica inconsciente."
  },

  desprevenido: {
    nome: "Desprevenido", icone: "icons/svg/daze.svg", categoria: "fisica",
    modificadores: [
      { alvo: "defesa", valor: -5 },
      { alvo: "dados.pericia.reflexos", valor: -1 }
    ],
    descricao: "Despreparado para reagir. Sofre −5 na Defesa e −1d20 em Reflexos. Você fica desprevenido contra inimigos que não possa perceber."
  },

  doente: {
    nome: "Doente", icone: "icons/svg/biohazard.svg", categoria: "fisica",
    modificadores: [],
    descricao: "Sob efeito de uma doença (veja a descrição da doença)."
  },

  emChamas: {
    nome: "Em Chamas", icone: "icons/svg/fire.svg", categoria: "fisica",
    modificadores: [],
    descricao: "Pegando fogo. No início de seus turnos, sofre 1d6 de dano de fogo. Pode gastar uma ação padrão para apagar o fogo. Imersão em água também apaga as chamas."
  },

  enjoado: {
    nome: "Enjoado", icone: "icons/svg/poison.svg", categoria: "fisica",
    modificadores: [],
    descricao: "Só pode realizar uma ação padrão OU de movimento (não ambas) por rodada."
  },

  enredado: {
    nome: "Enredado", icone: "icons/svg/net.svg", categoria: "paralisia",
    implica: ["lento", "vulneravel"],
    modificadores: [{ alvo: "dados.ataque", valor: -1 }],
    descricao: "Fica lento, vulnerável e sofre −1d20 em testes de ataque. Condição de paralisia."
  },

  envenenado: {
    nome: "Envenenado", icone: "icons/svg/poison.svg", categoria: "fisica",
    modificadores: [],
    descricao: "O efeito varia de acordo com o veneno: outra condição (fraco, enjoado...) ou dano recorrente. Dano recorrente de venenos sempre se acumula. Sem indicação de duração, dura a cena."
  },

  esmorecido: {
    nome: "Esmorecido", icone: "icons/svg/downgrade.svg", categoria: "mental",
    modificadores: [
      { alvo: "dados.atributo.int", valor: -2 },
      { alvo: "dados.atributo.pre", valor: -2 }
    ],
    descricao: "Sofre −2d20 em testes de Intelecto e Presença. Condição mental."
  },

  exausto: {
    nome: "Exausto", icone: "icons/svg/unconscious.svg", categoria: "fadiga",
    implica: ["debilitado", "lento", "vulneravel"],
    agravaPara: "inconsciente",
    modificadores: [],
    descricao: "Fica debilitado, lento e vulnerável. Se ficar exausto novamente, em vez disso fica inconsciente. Condição de fadiga."
  },

  fascinado: {
    nome: "Fascinado", icone: "icons/svg/eye.svg", categoria: "mental",
    modificadores: [{ alvo: "dados.pericia.percepcao", valor: -2 }],
    descricao: "Atenção presa em algo. Sofre −2d20 em Percepção e não pode fazer ações, exceto observar o que o fascinou. Qualquer ação hostil contra o personagem anula a condição. Condição mental."
  },

  fatigado: {
    nome: "Fatigado", icone: "icons/svg/unconscious.svg", categoria: "fadiga",
    implica: ["fraco", "vulneravel"],
    agravaPara: "exausto",
    modificadores: [],
    descricao: "Fica fraco e vulnerável. Se ficar fatigado novamente, em vez disso fica exausto. Condição de fadiga."
  },

  fraco: {
    nome: "Fraco", icone: "icons/svg/downgrade.svg", categoria: "fadiga",
    agravaPara: "debilitado",
    modificadores: [
      { alvo: "dados.atributo.agi", valor: -1 },
      { alvo: "dados.atributo.for", valor: -1 },
      { alvo: "dados.atributo.vig", valor: -1 }
    ],
    descricao: "Sofre −1d20 em testes de Agilidade, Força e Vigor. Se ficar fraco novamente, em vez disso fica debilitado."
  },

  frustrado: {
    nome: "Frustrado", icone: "icons/svg/downgrade.svg", categoria: "mental",
    agravaPara: "esmorecido",
    modificadores: [
      { alvo: "dados.atributo.int", valor: -1 },
      { alvo: "dados.atributo.pre", valor: -1 }
    ],
    descricao: "Sofre −1d20 em testes de Intelecto e Presença. Se ficar frustrado novamente, em vez disso fica esmorecido. Condição mental."
  },

  imovel: {
    nome: "Imóvel", icone: "icons/svg/padlock.svg", categoria: "paralisia",
    modificadores: [],
    descricao: "Todas as formas de deslocamento são reduzidas a 0m. Condição de paralisia.",
    especial: "imovel"
  },

  inconsciente: {
    nome: "Inconsciente", icone: "icons/svg/unconscious.svg", categoria: "fisica",
    implica: ["indefeso"],
    modificadores: [],
    descricao: "Fica indefeso e não pode fazer ações, incluindo reações. Balançar um ser para acordá-lo gasta uma ação padrão. Encerrada por qualquer efeito que cure pelo menos 1 PV."
  },

  indefeso: {
    nome: "Indefeso", icone: "icons/svg/falling.svg", categoria: "fisica",
    modificadores: [
      { alvo: "defesa", valor: -10 },
      { alvo: "dados.pericia.reflexos", valor: -1 }
    ],
    descricao: "Considerado desprevenido, mas sofre −10 na Defesa, falha automaticamente em testes de Reflexos e pode sofrer golpes de misericórdia."
  },

  lento: {
    nome: "Lento", icone: "icons/svg/walk.svg", categoria: "paralisia",
    modificadores: [],
    descricao: "Todas as formas de deslocamento são reduzidas à metade (arredonde para baixo em incrementos de 1,5m). Não pode correr ou fazer investidas. Condição de paralisia.",
    especial: "lento"
  },

  morrendo: {
    nome: "Morrendo", icone: "icons/svg/skull.svg", categoria: "especial",
    implica: ["inconsciente"],
    modificadores: [],
    descricao: "Com 0 PV. Fica inconsciente e, se INICIAR mais de três turnos morrendo na mesma cena (não necessariamente consecutivos), morre. Encerrada ao voltar a ter pelo menos 1 PV ou com um teste de Medicina (DT 20) de outro personagem (estabilizado, mas inconsciente).",
    especial: "morrendo"
  },

  ofuscado: {
    nome: "Ofuscado", icone: "icons/svg/sun.svg", categoria: "sentidos",
    modificadores: [
      { alvo: "dados.ataque", valor: -1 },
      { alvo: "dados.pericia.percepcao", valor: -1 }
    ],
    descricao: "Sofre −1d20 em testes de ataque e de Percepção. Condição de sentidos."
  },

  paralisado: {
    nome: "Paralisado", icone: "icons/svg/paralysis.svg", categoria: "paralisia",
    implica: ["imovel", "indefeso"],
    modificadores: [],
    descricao: "Fica imóvel e indefeso e só pode realizar ações puramente mentais. Condição de paralisia."
  },

  pasmo: {
    nome: "Pasmo", icone: "icons/svg/daze.svg", categoria: "mental",
    modificadores: [],
    descricao: "Não pode fazer ações. Condição mental."
  },

  petrificado: {
    nome: "Petrificado", icone: "icons/svg/statue.svg", categoria: "especial",
    implica: ["inconsciente"],
    modificadores: [],
    descricao: "Fica inconsciente e recebe resistência a dano 10."
  },

  sangrando: {
    nome: "Sangrando", icone: "icons/svg/blood.svg", categoria: "fisica",
    modificadores: [],
    descricao: "Ferimento aberto. No início de seus turnos, faça um teste de Vigor (DT 20). Se passar, estabiliza e remove a condição; se falhar, perde 1d6 PV e continua sangrando."
  },

  surdo: {
    nome: "Surdo", icone: "icons/svg/deaf.svg", categoria: "sentidos",
    modificadores: [{ alvo: "dados.pericia.iniciativa", valor: -2 }],
    descricao: "Não pode fazer testes de Percepção para ouvir e sofre −2d20 em Iniciativa. Considerado em condição ruim para conjurar rituais. Condição de sentidos."
  },

  surpreendido: {
    nome: "Surpreendido", icone: "icons/svg/daze.svg", categoria: "fisica",
    implica: ["desprevenido"],
    modificadores: [],
    descricao: "Não ciente de seus inimigos. Fica desprevenido e não pode fazer ações (dura a primeira rodada do combate)."
  },

  vulneravel: {
    nome: "Vulnerável", icone: "icons/svg/degen.svg", categoria: "fisica",
    modificadores: [{ alvo: "defesa", valor: -5 }],
    descricao: "Sofre −5 na Defesa."
  },

  enlouquecendo: {
    nome: "Enlouquecendo", icone: "icons/svg/aura.svg", categoria: "especial",
    modificadores: [],
    descricao: "Com Sanidade 0. Se INICIAR mais de três turnos enlouquecendo na mesma cena (não necessariamente consecutivos), fica insano (NPC do Mestre). Encerrada com um teste de Diplomacia (DT 20) de outro personagem ou ao recuperar pelo menos 1 de Sanidade.",
    especial: "enlouquecendo"
  },

  insano: {
    nome: "Insano", icone: "icons/svg/aura.svg", categoria: "especial",
    modificadores: [],
    descricao: "A mente sucumbiu à loucura. O personagem se torna um NPC sob controle do Mestre."
  },

  morto: {
    nome: "Morto", icone: "icons/svg/skull.svg", categoria: "especial",
    modificadores: [],
    descricao: "O personagem morreu."
  }
};

/**
 * Resolve recursivamente todas as condições implicadas por uma chave.
 * @param {string} chave           Chave no catálogo
 * @param {Set<string>} [visitado] Acumulador interno (evita ciclos)
 * @returns {string[]}             Lista de chaves implicadas (sem a própria)
 */
export function resolverImplicadas(chave, visitado = new Set()) {
  const cond = CONDICOES[chave];
  if (!cond || visitado.has(chave)) return [];
  visitado.add(chave);
  const out = [];
  for (const imp of (cond.implica ?? [])) {
    if (!visitado.has(imp)) {
      out.push(imp);
      out.push(...resolverImplicadas(imp, visitado));
    }
  }
  return [...new Set(out)];
}

/**
 * Achata os modificadores de uma condição + todas as implicadas
 * (penalidades de fontes diferentes acumulam; aqui cada condição implicada
 * conta como parte da mesma fonte, então somamos por alvo).
 * @param {string} chave
 * @returns {Array<{alvo:string, valor:number, rotulo:string, ativo:boolean}>}
 */
export function modificadoresAchatados(chave) {
  const porAlvo = {};
  const aplicar = (k) => {
    const cond = CONDICOES[k];
    if (!cond) return;
    for (const m of (cond.modificadores ?? [])) {
      const atual = porAlvo[m.alvo];
      // Mantém o PIOR valor por alvo (penalidades não se acumulam entre
      // condições sobrepostas — ex.: desprevenido + indefeso = −10, não −15).
      if (!atual || Math.abs(m.valor) > Math.abs(atual.valor)) {
        porAlvo[m.alvo] = { alvo: m.alvo, valor: m.valor, rotulo: cond.nome, ativo: true };
      }
    }
  };
  aplicar(chave);
  for (const imp of resolverImplicadas(chave)) aplicar(imp);
  return Object.values(porAlvo);
}
