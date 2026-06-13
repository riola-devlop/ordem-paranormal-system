/**
 * Modo de Regras — Padrão (Livro de Regras) ↔ Sobrevivendo ao Horror (SaH)
 * ---------------------------------------------------------------------------
 * Ponto ÚNICO de variação de regras. O restante do sistema consulta os helpers
 * daqui (em vez de espalhar `if (modo === ...)`), de modo que plugar as regras
 * do SaH depois seja trocar/preencher dados — não caçar código.
 *
 * Escopo: o modo é definido POR FICHA (`actor.system.modoRegras`).
 *
 * As regras opcionais do SaH ainda não estão totalmente disponíveis (o livro
 * só foi fornecido em parte). Os valores ficam centralizados em SAH_CONFIG com
 * marcadores TODO(SaH) — ajuste lá quando o texto da regra chegar.
 */

/** Modos disponíveis e suas capacidades (flags). */
export const MODOS = {
  padrao: {
    label: "ORDEM.Modo.padrao",
    flags: { progressao: "nex", reterRitual: false, compreensaoHumana: false }
  },
  sah: {
    label: "ORDEM.Modo.sah",
    flags: { progressao: "xp", reterRitual: true, compreensaoHumana: true }
  }
};

/**
 * Tabela de configuração das regras do SaH. Defaults APROXIMADOS, baseados nas
 * referências dos Arquivos Secretos — confirme/ajuste com o livro do Mestre.
 */
export const SAH_CONFIG = {
  // NEX & Experiência (SaH, p. ~98). TODO(SaH): tabela real de XP e conversão.
  xp: {
    // Custo de XP para avançar um marco de NEX (placeholder).
    custoPorMarco: 10,
    // Dobra o NEX ganho ao se expor (citado na trilha Monstruoso). Informativo.
    nexDobradoAoExpor: true,
    // Transcender vira ritual (deixa de ser poder de classe automático).
    transcenderComoRitual: true
  },
  // Reter Ritual (duração retida). Regra funcional; custos ajustáveis.
  reterRitual: {
    custoSan: 1,            // SAN perdida ao reter (referência: 1 SAN).
    reduzPeMaximo: true     // PE retido sai do máximo e do atual.
  },
  // Os Limites da Compreensão Humana (SaH, p. ~113). TODO(SaH): efeitos reais.
  compreensao: {
    // Rótulo alternativo do recurso mental (ex.: "Compreensão"). Vazio = usa SAN.
    rotuloRecurso: "",
    // Placeholder para limiares/efeitos quando a regra for fornecida.
    limiares: []
  }
};

/** Modo de regras efetivo de um ator (default "padrao"). */
export function modoDoAtor(actor) {
  const m = actor?.system?.modoRegras;
  return (m && MODOS[m]) ? m : "padrao";
}

/** Valor de uma capacidade (flag) para o modo do ator. */
export function flag(actor, chave) {
  return MODOS[modoDoAtor(actor)].flags[chave];
}

/** Açúcares de leitura usados pelo resto do sistema. */
export const usaXP                = (actor) => flag(actor, "progressao") === "xp";
export const permiteReterRitual   = (actor) => !!flag(actor, "reterRitual");
export const usaCompreensaoHumana = (actor) => !!flag(actor, "compreensaoHumana");

/** Rótulo (chave i18n) do recurso mental conforme o modo. */
export function rotuloRecursoMental(actor) {
  if (usaCompreensaoHumana(actor) && SAH_CONFIG.compreensao.rotuloRecurso) {
    return SAH_CONFIG.compreensao.rotuloRecurso;
  }
  return "ORDEM.Recurso.san";
}
