/**
 * Catálogo de condições do sistema (motor de jogo).
 * ---------------------------------------------------------------------------
 * As descrições abaixo são REDIGIDAS COM PALAVRAS PRÓPRIAS (paráfrase das
 * regras), não reproduzem o texto do livro oficial. Mantêm apenas a mecânica
 * (valores, DTs, penalidades em dados), que não é protegida por direitos
 * autorais. Ver licença.md.
 *
 * Cada condição define:
 *  - nome / icone / descricao  : exibição
 *  - categoria                 : medo | mental | paralisia | fadiga | sentidos | fisica | especial
 *  - modificadores[]           : efeitos automáticos (mesmo formato dos itens)
 *      · alvos "dados.*" são PENALIDADES/BÔNUS EM DADOS (−1 d20 no pool)
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
    descricao: "Penalidade de −1d20 em seus testes. Uma nova aplicação de Abalado o torna Apavorado. (Medo.)"
  },

  agarrado: {
    nome: "Agarrado", icone: "icons/svg/net.svg", categoria: "paralisia",
    implica: ["desprevenido", "imovel"],
    modificadores: [{ alvo: "dados.ataque", valor: -1 }],
    descricao: "Fica Desprevenido e Imóvel. Ataques recebem −1d20 e ficam limitados a armas leves. Para escapar, gaste uma ação padrão e vença uma manobra oposta. Tiros à distância mirando quem o agarra têm 50% de errar e atingir o outro envolvido."
  },

  alquebrado: {
    nome: "Alquebrado", icone: "icons/svg/downgrade.svg", categoria: "mental",
    modificadores: [{ alvo: "custoPe", valor: 1 }],
    descricao: "Toda habilidade ou ritual custa +1 PE a mais. (Mental.)"
  },

  apavorado: {
    nome: "Apavorado", icone: "icons/svg/terror.svg", categoria: "medo",
    modificadores: [{ alvo: "dados.todos", valor: -2 }],
    descricao: "−2d20 em testes de perícia. Precisa se afastar da origem do medo pelo caminho mais rápido possível; sem rota de fuga, ainda pode agir, mas nunca se aproximar dela por vontade própria. (Medo.)"
  },

  asfixiado: {
    nome: "Asfixiado", icone: "icons/svg/silenced.svg", categoria: "fisica",
    modificadores: [],
    descricao: "Sem ar. Aguenta prender o fôlego por (Vigor + 1) rodadas, e cada dano recebido corta 1 rodada desse total. Esgotado o prazo, ao fim do turno passa a Morrendo."
  },

  atordoado: {
    nome: "Atordoado", icone: "icons/svg/daze.svg", categoria: "mental",
    implica: ["desprevenido"],
    modificadores: [],
    descricao: "Fica Desprevenido e incapaz de agir. (Mental.)"
  },

  caido: {
    nome: "Caído", icone: "icons/svg/falling.svg", categoria: "fisica",
    modificadores: [
      { alvo: "dados.ataque", valor: -2 },
      { alvo: "defesa", valor: -5 }
    ],
    descricao: "No chão. Ataques corpo a corpo sofrem −2d20 e o deslocamento cai para 1,5m. A Defesa perde 5 contra corpo a corpo, mas ganha 5 contra ataques à distância (ajuste manual conforme o tipo de ataque). Ficar de pé consome uma ação de movimento.",
    especial: "lento"
  },

  cego: {
    nome: "Cego", icone: "icons/svg/blind.svg", categoria: "sentidos",
    implica: ["desprevenido", "lento"],
    modificadores: [
      { alvo: "dados.atributo.agi", valor: -2 },
      { alvo: "dados.atributo.for", valor: -2 }
    ],
    descricao: "Fica Desprevenido e Lento. Não enxerga: falha em Percepção visual e leva −2d20 em perícias de Agilidade e de Força. Qualquer alvo seu conta com camuflagem total, dando 50% de chance de errar o golpe. (Sentidos.)"
  },

  confuso: {
    nome: "Confuso", icone: "icons/svg/stoned.svg", categoria: "mental",
    modificadores: [],
    descricao: "Age sem controle. No começo de cada turno, role 1d6: 1) caminha para uma direção sorteada (1d8); 2–3) fica balbuciando, sem agir; 4–5) parte para cima da criatura mais perto — ou de si mesmo, se estiver só; 6) recupera a lucidez e a condição acaba. (Mental.)"
  },

  debilitado: {
    nome: "Debilitado", icone: "icons/svg/downgrade.svg", categoria: "fadiga",
    agravaPara: "inconsciente",
    modificadores: [
      { alvo: "dados.atributo.agi", valor: -2 },
      { alvo: "dados.atributo.for", valor: -2 },
      { alvo: "dados.atributo.vig", valor: -2 }
    ],
    descricao: "−2d20 em testes de Agilidade, Força e Vigor. Receber Debilitado de novo o deixa Inconsciente."
  },

  desprevenido: {
    nome: "Desprevenido", icone: "icons/svg/daze.svg", categoria: "fisica",
    modificadores: [
      { alvo: "defesa", valor: -5 },
      { alvo: "dados.pericia.reflexos", valor: -1 }
    ],
    descricao: "Pego sem reação: −5 na Defesa e −1d20 em Reflexos. Você está sempre Desprevenido diante de inimigos que não consegue perceber."
  },

  doente: {
    nome: "Doente", icone: "icons/svg/biohazard.svg", categoria: "fisica",
    modificadores: [],
    descricao: "Afetado por uma doença — consulte os efeitos descritos na própria doença."
  },

  emChamas: {
    nome: "Em Chamas", icone: "icons/svg/fire.svg", categoria: "fisica",
    modificadores: [],
    descricao: "Em brasas. Sofre 1d6 de dano de fogo no início de cada turno. Apagar as chamas exige uma ação padrão — mergulhar na água também resolve."
  },

  enjoado: {
    nome: "Enjoado", icone: "icons/svg/poison.svg", categoria: "fisica",
    modificadores: [],
    descricao: "Por rodada, escolhe apenas uma coisa: uma ação padrão ou uma de movimento, nunca as duas."
  },

  enredado: {
    nome: "Enredado", icone: "icons/svg/net.svg", categoria: "paralisia",
    implica: ["lento", "vulneravel"],
    modificadores: [{ alvo: "dados.ataque", valor: -1 }],
    descricao: "Fica Lento e Vulnerável, com −1d20 nos ataques. (Paralisia.)"
  },

  envenenado: {
    nome: "Envenenado", icone: "icons/svg/poison.svg", categoria: "fisica",
    modificadores: [],
    descricao: "O resultado depende do veneno: pode impor outra condição (Fraco, Enjoado etc.) ou dano contínuo. Danos contínuos de vários venenos sempre somam. Quando o veneno não indica duração, vale até o fim da cena."
  },

  esmorecido: {
    nome: "Esmorecido", icone: "icons/svg/downgrade.svg", categoria: "mental",
    modificadores: [
      { alvo: "dados.atributo.int", valor: -2 },
      { alvo: "dados.atributo.pre", valor: -2 }
    ],
    descricao: "−2d20 em testes de Intelecto e Presença. (Mental.)"
  },

  exausto: {
    nome: "Exausto", icone: "icons/svg/unconscious.svg", categoria: "fadiga",
    implica: ["debilitado", "lento", "vulneravel"],
    agravaPara: "inconsciente",
    modificadores: [],
    descricao: "Acumula Debilitado, Lento e Vulnerável. Uma nova aplicação de Exausto o derruba Inconsciente. (Fadiga.)"
  },

  fascinado: {
    nome: "Fascinado", icone: "icons/svg/eye.svg", categoria: "mental",
    modificadores: [{ alvo: "dados.pericia.percepcao", valor: -2 }],
    descricao: "Hipnotizado por algo. −2d20 em Percepção e sem poder agir, a não ser contemplar aquilo que o prende. Sofrer qualquer ação hostil quebra o encanto. (Mental.)"
  },

  fatigado: {
    nome: "Fatigado", icone: "icons/svg/unconscious.svg", categoria: "fadiga",
    implica: ["fraco", "vulneravel"],
    agravaPara: "exausto",
    modificadores: [],
    descricao: "Fica Fraco e Vulnerável. Receber Fatigado outra vez o torna Exausto. (Fadiga.)"
  },

  fraco: {
    nome: "Fraco", icone: "icons/svg/downgrade.svg", categoria: "fadiga",
    agravaPara: "debilitado",
    modificadores: [
      { alvo: "dados.atributo.agi", valor: -1 },
      { alvo: "dados.atributo.for", valor: -1 },
      { alvo: "dados.atributo.vig", valor: -1 }
    ],
    descricao: "−1d20 em testes de Agilidade, Força e Vigor. Uma nova aplicação de Fraco vira Debilitado."
  },

  frustrado: {
    nome: "Frustrado", icone: "icons/svg/downgrade.svg", categoria: "mental",
    agravaPara: "esmorecido",
    modificadores: [
      { alvo: "dados.atributo.int", valor: -1 },
      { alvo: "dados.atributo.pre", valor: -1 }
    ],
    descricao: "−1d20 em testes de Intelecto e Presença. Frustrado outra vez passa a Esmorecido. (Mental.)"
  },

  imovel: {
    nome: "Imóvel", icone: "icons/svg/padlock.svg", categoria: "paralisia",
    modificadores: [],
    descricao: "Qualquer deslocamento vai a 0m — não sai do lugar. (Paralisia.)",
    especial: "imovel"
  },

  inconsciente: {
    nome: "Inconsciente", icone: "icons/svg/unconscious.svg", categoria: "fisica",
    implica: ["indefeso"],
    modificadores: [],
    descricao: "Apagado: fica Indefeso e não executa ações nem reações. Sacudir alguém para despertá-lo custa uma ação padrão. Curar 1 PV ou mais encerra a condição."
  },

  indefeso: {
    nome: "Indefeso", icone: "icons/svg/falling.svg", categoria: "fisica",
    modificadores: [
      { alvo: "defesa", valor: -10 },
      { alvo: "dados.pericia.reflexos", valor: -1 }
    ],
    descricao: "Conta como Desprevenido, porém com −10 na Defesa e falha automática em Reflexos, ficando exposto a golpes de misericórdia."
  },

  lento: {
    nome: "Lento", icone: "icons/svg/walk.svg", categoria: "paralisia",
    modificadores: [],
    descricao: "Deslocamentos caem pela metade (arredonde para baixo em passos de 1,5m). Fica proibido de correr ou investir. (Paralisia.)",
    especial: "lento"
  },

  morrendo: {
    nome: "Morrendo", icone: "icons/svg/skull.svg", categoria: "especial",
    implica: ["inconsciente"],
    modificadores: [],
    descricao: "Está com 0 PV e Inconsciente. Se começar mais de três turnos nesse estado ao longo da cena (não precisam ser seguidos), morre. Recuperar ao menos 1 PV encerra a condição; um aliado também pode estabilizá-lo com Medicina (DT 20), embora ele siga Inconsciente.",
    especial: "morrendo"
  },

  ofuscado: {
    nome: "Ofuscado", icone: "icons/svg/sun.svg", categoria: "sentidos",
    modificadores: [
      { alvo: "dados.ataque", valor: -1 },
      { alvo: "dados.pericia.percepcao", valor: -1 }
    ],
    descricao: "−1d20 nos ataques e em Percepção. (Sentidos.)"
  },

  paralisado: {
    nome: "Paralisado", icone: "icons/svg/paralysis.svg", categoria: "paralisia",
    implica: ["imovel", "indefeso"],
    modificadores: [],
    descricao: "Fica Imóvel e Indefeso; só consegue realizar ações puramente mentais. (Paralisia.)"
  },

  pasmo: {
    nome: "Pasmo", icone: "icons/svg/daze.svg", categoria: "mental",
    modificadores: [],
    descricao: "Incapaz de realizar qualquer ação. (Mental.)"
  },

  petrificado: {
    nome: "Petrificado", icone: "icons/svg/statue.svg", categoria: "especial",
    implica: ["inconsciente"],
    modificadores: [],
    descricao: "Vira estátua: fica Inconsciente e ganha resistência a dano 10."
  },

  sangrando: {
    nome: "Sangrando", icone: "icons/svg/blood.svg", categoria: "fisica",
    modificadores: [],
    descricao: "Corte aberto. No início de cada turno, role Vigor (DT 20): sucesso estanca o ferimento e remove a condição; falha custa 1d6 PV e o sangramento persiste."
  },

  surdo: {
    nome: "Surdo", icone: "icons/svg/deaf.svg", categoria: "sentidos",
    modificadores: [{ alvo: "dados.pericia.iniciativa", valor: -2 }],
    descricao: "Sem audição: falha em Percepção sonora e leva −2d20 em Iniciativa. Conta como situação desfavorável para conjurar rituais. (Sentidos.)"
  },

  surpreendido: {
    nome: "Surpreendido", icone: "icons/svg/daze.svg", categoria: "fisica",
    implica: ["desprevenido"],
    modificadores: [],
    descricao: "Pego de surpresa pelos inimigos. Fica Desprevenido e sem agir durante a primeira rodada do combate."
  },

  vulneravel: {
    nome: "Vulnerável", icone: "icons/svg/degen.svg", categoria: "fisica",
    modificadores: [{ alvo: "defesa", valor: -5 }],
    descricao: "Defesa reduzida em 5."
  },

  enlouquecendo: {
    nome: "Enlouquecendo", icone: "icons/svg/aura.svg", categoria: "especial",
    modificadores: [],
    descricao: "Está com Sanidade 0. Começar mais de três turnos assim na mesma cena (não necessariamente em sequência) o torna Insano, sob controle do Mestre. Recuperar ao menos 1 de Sanidade encerra a condição; um aliado também pode contê-lo com Diplomacia (DT 20).",
    especial: "enlouquecendo"
  },

  insano: {
    nome: "Insano", icone: "icons/svg/aura.svg", categoria: "especial",
    modificadores: [],
    descricao: "A sanidade se perdeu de vez: o personagem passa a ser um NPC conduzido pelo Mestre."
  },

  morto: {
    nome: "Morto", icone: "icons/svg/skull.svg", categoria: "especial",
    modificadores: [],
    descricao: "O personagem faleceu."
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
