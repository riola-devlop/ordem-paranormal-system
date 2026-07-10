/**
 * Ficha do Agente (Actor "agente").
 * Exibe atributos, recursos (PV/PE/SAN), NEX, as 28 perícias e os itens
 * (poderes, armas, rituais, equipamentos). Permite rolar testes e dano.
 */

import {
  ORDEM, rolarTeste, rolarDano, rolarAtaque, rolarResistencia, rolarAjuda,
  conjurarRitual, subirNex, voltarNex,
  usarPoder, usarHabilidadeTrilha, abrirAcoesCombate, rolarIniciativaAtor,
  abrirSeletorCondicao, removerCondicao, marcarTurnoMorrendo, estabilizar,
  marcarTurnoEnlouquecendo, acalmar, abrirInterludio, exportarAgente,
  progredirXP, liberarRitual,
  aplicarDano, curar, aplicarDanoMental, recuperarSanidade
} from "../module.js";
import { MODOS, modoDoAtor, usaXP, permiteReterRitual } from "../regras.js";

export class OrdemAgentSheet extends ActorSheet {

  /** Opções padrão da janela da ficha. */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["ordem-paranormal", "op-theme", "sheet", "actor", "agente"],
      width: 900,
      height: 880,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "pericias" }],
      scrollY: [".op-esquerda", ".op-direita .sheet-body"]
    });
  }

  /** Caminho do template Handlebars desta ficha. */
  get template() {
    return "systems/ordem-paranormal/templates/agente-sheet.hbs";
  }

  /** Adiciona o botão "Exportar JSON" na barra de título da ficha. */
  _getHeaderButtons() {
    const buttons = super._getHeaderButtons();
    if (this.actor.isOwner) {
      buttons.unshift({
        label: game.i18n.localize("ORDEM.IO.Exportar"),
        class: "op-exportar-ficha",
        icon: "fas fa-file-export",
        onclick: () => exportarAgente(this.actor)
      });
    }
    return buttons;
  }

  /* ----------------------------------------------------------------------- */

  /** Prepara o contexto entregue ao template. */
  async getData(options) {
    const context = await super.getData(options);
    const actorData = context.actor;
    const sys = actorData.system;

    context.system = sys;
    context.ORDEM = ORDEM;
    context.isGM = game.user.isGM;

    // ---- Atributos (lista com rótulo, valor base e efetivo) ----
    context.atributosList = Object.keys(ORDEM.atributos).map(key => {
      const base = Number(sys.atributos?.[key] ?? 0);
      const efetivo = Number(sys.atributosEfetivos?.[key] ?? base);
      return {
        key,
        label: game.i18n.localize(ORDEM.atributos[key]),
        abrev: game.i18n.localize(ORDEM.atributosAbrev[key]),
        valor: base,
        efetivo,
        modificado: efetivo !== base
      };
    });

    // ---- Perícias (usa periciasCalc do motor: inclui mods e carga) ----
    context.periciasList = Object.entries(sys.pericias ?? {}).map(([key, per]) => {
      const cfg = ORDEM.pericias[key] ?? { atributo: "int", soTreinada: false };
      const calc = sys.periciasCalc?.[key] ?? {};
      const atributo = calc.atributo || per.atributo || cfg.atributo;
      const treino = Number(per.treino) || 0;
      const bonusTotal = Number(calc.bonus ?? (treino + (Number(per.outros) || 0)));
      return {
        key,
        label: game.i18n.localize(`ORDEM.Pericia.${key}`),
        atributo,
        atributoAbrev: game.i18n.localize(ORDEM.atributosAbrev[atributo]),
        treinada: treino > 0,
        soTreinada: cfg.soTreinada,
        carga: !!cfg.carga,
        treino,
        outros: Number(per.outros) || 0,
        bonusTotal,
        bonusLabel: bonusTotal > 0 ? `+${bonusTotal}` : `${bonusTotal}`,
        dados: Number(calc.dados ?? sys.atributosEfetivos?.[atributo] ?? 0)
      };
    }).sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));

    // Opções de atributo para o seletor de combinação alternativa.
    context.atributoOptions = Object.keys(ORDEM.atributos).map(key => ({
      value: key,
      label: game.i18n.localize(ORDEM.atributosAbrev[key])
    }));

    // Graus de treinamento (0/5/10/15) — perícia treina de 5 em 5 (Livro de Regras).
    context.treinamentoOptions = Object.entries(ORDEM.bonusTreinamento).map(([k, v]) => ({
      value: v,
      label: v ? `${game.i18n.localize(`ORDEM.Treinamento.${k}`)} (+${v})` : game.i18n.localize(`ORDEM.Treinamento.${k}`)
    }));

    // ---- Itens agrupados por tipo ----
    context.armas         = actorData.items.filter(i => i.type === "arma");
    context.poderes       = actorData.items.filter(i => i.type === "poder");
    context.rituais       = actorData.items.filter(i => i.type === "ritual");
    context.equipamentos  = actorData.items.filter(i => i.type === "equipamento");
    context.protecoes     = actorData.items.filter(i => i.type === "protecao");
    context.origens       = actorData.items.filter(i => i.type === "origem");
    context.condicoes     = actorData.items.filter(i => i.type === "condicao");

    // ---- Origem / Trilha: rótulos derivados dos ITENS (estabilização) ----
    const origemItem = context.origens[0];
    context.origemLabel = origemItem?.name || sys.origem || "";
    context.origemItemId = origemItem?.id || "";

    // ---- Condições ATIVAS (selos no topo para visão rápida em jogo) ----
    context.condicoesAtivas = context.condicoes
      .filter(i => i.system.ativo !== false)
      .map(i => ({ id: i.id, nome: i.name, img: i.img, descricao: i.system.descricao || "" }));

    // Trilhas: habilidades calculadas (desbloqueadas vs bloqueadas por NEX).
    const nexAtor = Number(sys.nex) || 0;
    context.trilhas = actorData.items.filter(i => i.type === "trilha").map(i => ({
      id: i.id,
      name: i.name,
      img: i.img,
      system: i.system,
      habilidadesCalc: (i.system.habilidades ?? []).map((h, idx) => ({
        index: idx,
        nex: h.nex,
        nome: h.nome || "—",
        tipo: h.tipo || "passivo",
        ativo: (h.tipo || "passivo") === "ativo",
        custoPe: Number(h.custoPe) || 0,
        descricao: h.descricao ?? "",
        bloqueada: Number(h.nex) > nexAtor
      })).sort((a, b) => a.nex - b.nex)
    }));

    // Rótulo da Trilha derivado do item (estabilização: evita texto solto).
    const trilhaItem = context.trilhas[0];
    context.trilhaLabel = trilhaItem?.name || sys.trilha || "";
    context.trilhaItemId = trilhaItem?.id || "";

    // ---- Valores derivados do motor (carga, DTs, estado, patente) ----
    context.derivado = {
      carga: sys.carga ?? { atual: 0, limite: 0, max: 0, sobrecarregado: false },
      cargaPct: Math.clamp(Math.round(((sys.carga?.atual || 0) / (sys.carga?.limite || 1)) * 100), 0, 100),
      dtRituais: sys.dtRituais ?? 0,
      dtFortitude: sys.dtFortitude ?? 0,
      dtReflexos: sys.dtReflexos ?? 0,
      dtVontade: sys.dtVontade ?? 0,
      peRodada: sys.peRodada ?? 0,
      deslocamento: sys.deslocamentoTotal ?? sys.deslocamento ?? 0,
      estado: sys.estado ?? {},
      patente: sys.patenteInfo ?? null
    };

    // ---- NEX (marcos de 5%) ----
    const nex = Number(sys.nex ?? 0);
    context.nexInfo = {
      valor: nex,
      marcoAtual: Math.floor(nex / 5) * 5,
      proximoMarco: Math.min(99, Math.floor(nex / 5) * 5 + 5),
      pct: Math.clamp(nex, 0, 99)
    };

    // ---- Deslocamento em quadros (1 quadro = 1,5 m) ----
    context.deslocQuadros = Math.floor((Number(sys.deslocamentoTotal ?? sys.deslocamento) || 0) / 1.5);

    // ---- Recursos e ações customizados (até 10 de cada) ----
    const rcLista = Array.isArray(sys.recursosCustom) ? sys.recursosCustom : [];
    context.recursosCustom = rcLista.map((r, i) => {
      const max = Number(r.max) || 0;
      const value = Number(r.value) || 0;
      return {
        index: i,
        nome: r.nome ?? "",
        value, max,
        cor: r.cor || "#7b2fbe",
        pct: max > 0 ? Math.clamp(Math.round((value / max) * 100), 0, 100) : 0
      };
    });
    context.podeAddRecurso = rcLista.length < 10;

    const acLista = Array.isArray(sys.acoesCustom) ? sys.acoesCustom : [];
    context.acoesCustom = acLista.map((a, i) => ({
      index: i,
      nome: a.nome ?? "",
      descricao: a.descricao ?? "",
      custoPe: Number(a.custoPe) || 0
    }));
    context.podeAddAcao = acLista.length < 10;

    // ---- Histórico de NEX (mais recente primeiro) + opções de patente ----
    const hist = Array.isArray(sys.progressao?.historico) ? sys.progressao.historico : [];
    context.historicoNex = hist.map((e, i) => ({
      index: i,
      nex: e.nex,
      habilidade: e.habilidade,
      atributoAumentado: e.atributoAumentado ? game.i18n.localize(ORDEM.atributosAbrev[e.atributoAumentado]) : null,
      ganhos: e.ganhos
    })).reverse();
    context.patenteOptions = Object.keys(ORDEM.patentes).map(k => ({
      value: k, label: game.i18n.localize(`ORDEM.Patente.${k}`)
    }));

    // ---- Progressão de classe / NEX (level up) ----
    const info = ORDEM.classesInfo[sys.classe];
    if (info) {
      const proxNex = nex < 5 ? 5 : (nex >= 99 ? null : (nex >= 95 ? 99 : nex + 5));
      context.progressao = {
        temClasse: true,
        classeLabel: game.i18n.localize(ORDEM.classes[sys.classe]),
        nexAtual: nex,
        proxNex,
        habAtual: info.progressao[nex] ?? null,
        proxHab: proxNex ? info.progressao[proxNex] : null,
        noMaximo: nex >= 99
      };
      // Habilidades de classe ativas (lembrete na ficha).
      if (sys.classe === "especialista") {
        const p = ORDEM.tierPerito(nex);
        context.progressao.perito = `${p.dado} (${p.custo} PE)`;
      }
      if (sys.classe === "combatente") {
        const ae = ORDEM.tierAtaqueEspecial(nex);
        context.progressao.ataqueEspecial = `+${ae.bonus} (${ae.custo} PE)`;
      }
    } else {
      context.progressao = { temClasse: false };
    }

    // ---- Modo de regras (Padrão ↔ Sobrevivendo ao Horror) ----
    const modo = modoDoAtor(actorData);
    context.modo = modo;
    context.usaXP = usaXP(actorData);
    context.permiteReterRitual = permiteReterRitual(actorData);
    context.modoOptions = Object.entries(MODOS).map(([k, v]) => ({
      value: k, label: game.i18n.localize(v.label)
    }));
    context.xp = {
      atual: Number(sys.xp?.atual) || 0,
      total: Number(sys.xp?.total) || 0
    };
    // Rituais retidos (visíveis só no modo SaH).
    context.rituaisRetidos = (Array.isArray(sys.rituaisRetidos) ? sys.rituaisRetidos : [])
      .map((r, i) => ({ index: i, nome: r.nome, img: r.img, custoPe: Number(r.custoPe) || 0 }));

    // ---- Classes / elementos para selects ----
    context.classeOptions = Object.entries(ORDEM.classes).map(([k, v]) => ({
      value: k, label: game.i18n.localize(v)
    }));

    // ---- Afinidade elemental (visível a partir de NEX 50%) ----
    context.mostraAfinidade = nex >= 50;
    context.afinidadeOptions = ["conhecimento", "energia", "morte", "sangue"].map(k => ({
      value: k, label: game.i18n.localize(`ORDEM.Elemento.${k}`)
    }));

    // ---- Patente sugerida pelos PP (dica de promoção) ----
    context.patenteDesatualizada = sys.patenteSugerida && sys.patenteSugerida !== sys.patente;
    if (context.patenteDesatualizada) {
      context.patenteSugestaoTitulo = game.i18n.format("ORDEM.Patente.Sugestao", {
        patente: game.i18n.localize(`ORDEM.Patente.${sys.patenteSugerida}`)
      });
    }

    // ---- Limite de itens por categoria (patente) ----
    if (sys.patenteInfo) {
      context.categoriasInfo = ["I", "II", "III", "IV"].map(cat => ({
        cat,
        usado: sys.patenteInfo.uso?.[cat] ?? 0,
        max: sys.patenteInfo.itens?.[cat] ?? 0,
        excedido: (sys.patenteInfo.uso?.[cat] ?? 0) > (sys.patenteInfo.itens?.[cat] ?? 0)
      }));
    }

    // ---- Manobras de combate ----
    context.manobras = Object.entries(ORDEM.manobras).map(([key, m]) => ({
      key,
      icone: m.icone,
      label: game.i18n.localize(`ORDEM.Manobra.${key}`),
      efeito: game.i18n.localize(`ORDEM.Manobra.Efeito.${key}`)
    }));

    // ---- Rastreador de ações do turno (economia de ações da rodada) ----
    // Marcador puramente visual: indica o que o agente já "gastou" nesta rodada.
    // Não impõe limites (ex.: quantas ações mínimas) — isso fica a critério do Mestre.
    // Reseta sozinho no início do turno do agente em combate (ver hook updateCombat).
    const at = sys.acoesTurno ?? {};
    context.acoesTurno = [
      { key: "acao",       icone: "fa-hand-fist",   label: game.i18n.localize("ORDEM.Combate.Acao"),       gasta: !!at.acao },
      { key: "movimento",  icone: "fa-shoe-prints", label: game.i18n.localize("ORDEM.Combate.Movimento"),  gasta: !!at.movimento },
      { key: "acaoMinima", icone: "fa-hand",        label: game.i18n.localize("ORDEM.Combate.AcaoMinima"), gasta: !!at.acaoMinima },
      { key: "reacao",     icone: "fa-reply",       label: game.i18n.localize("ORDEM.Combate.Reacao"),     gasta: !!at.reacao }
    ];

    // ---- Ações de defesa (treinamento exigido) ----
    context.defesas = {
      bloqueio:     (Number(sys.pericias?.fortitude?.treino) || 0) > 0,
      esquiva:      (Number(sys.pericias?.reflexos?.treino) || 0) > 0,
      contraataque: (Number(sys.pericias?.luta?.treino) || 0) > 0
    };

    // ---- Contadores de morte / loucura ----
    context.rodadasMorrendo = Number(sys.recursos?.pv?.rodadasMorrendo) || 0;
    context.rodadasEnlouquecendo = Number(sys.recursos?.san?.rodadasEnlouquecendo) || 0;

    // ---- Notas e biografia enriquecidas (links, rolagens inline, etc.) ----
    context.notasHTML = await TextEditor.enrichHTML(sys.notas ?? "", { secrets: this.actor.isOwner });
    context.historicoHTML = await TextEditor.enrichHTML(sys.detalhes?.historico ?? "", { secrets: this.actor.isOwner });

    context.editable = this.isEditable;
    return context;
  }

  /* ----------------------------------------------------------------------- */

  /** Liga os eventos de interação da ficha. */
  activateListeners(html) {
    super.activateListeners(html);

    // Rolagem por Atributo.
    html.find("[data-action='rolar-atributo']").on("click", this._onRolarAtributo.bind(this));

    // Rolagem por Perícia.
    html.find("[data-action='rolar-pericia']").on("click", this._onRolarPericia.bind(this));

    // Rolagem de dano de arma.
    html.find("[data-action='rolar-dano']").on("click", this._onRolarDano.bind(this));

    // Ataque com arma (teste de Luta/Pontaria + botões de dano no card).
    html.find("[data-action='rolar-ataque']").on("click", this._onRolarAtaque.bind(this));

    // Teste de resistência (Fortitude/Reflexos/Vontade).
    html.find("[data-action='rolar-resistencia']").on("click", (ev) => {
      ev.preventDefault();
      return rolarResistencia(this.actor, ev.currentTarget.dataset.pericia);
    });

    // Ação de Ajuda (por perícia).
    html.find("[data-action='rolar-ajuda']").on("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      return rolarAjuda(this.actor, ev.currentTarget.dataset.pericia);
    });

    // Conjurar ritual.
    html.find("[data-action='conjurar-ritual']").on("click", this._onConjurarRitual.bind(this));

    // Interlúdio (recuperação entre cenas).
    html.find("[data-action='abrir-interludio']").on("click", (ev) => {
      ev.preventDefault();
      return abrirInterludio(this.actor);
    });

    // Rolar Iniciativa direto da ficha.
    html.find("[data-action='rolar-iniciativa']").on("click", (ev) => {
      ev.preventDefault();
      return rolarIniciativaAtor(this.actor);
    });

    // Dano/Cura rápido nas barras (roteia pelas regras: morrendo/enlouquecendo).
    html.find("[data-action='dano-rapido']").on("click", async (ev) => {
      ev.preventDefault();
      const rec = ev.currentTarget.dataset.recurso;
      const v = await this._promptNumero(game.i18n.localize("ORDEM.Recurso.DanoTitulo"), game.i18n.localize("ORDEM.Recurso.DanoLabel"));
      if (!v) return;
      return rec === "san" ? aplicarDanoMental(this.actor, v) : aplicarDano(this.actor, v);
    });
    html.find("[data-action='cura-rapida']").on("click", async (ev) => {
      ev.preventDefault();
      const rec = ev.currentTarget.dataset.recurso;
      const v = await this._promptNumero(game.i18n.localize("ORDEM.Recurso.CuraTitulo"), game.i18n.localize("ORDEM.Recurso.CuraLabel"));
      if (!v) return;
      return rec === "san" ? recuperarSanidade(this.actor, v) : curar(this.actor, v);
    });

    // Selos de condição: remover (×).
    html.find("[data-action='remover-condicao']").on("click", async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const item = this.actor.items.get(ev.currentTarget.dataset.itemId);
      if (item?.system?.chave) return removerCondicao(this.actor, item.system.chave);
      return item?.delete();
    });

    // Manobras de combate e ações especiais de defesa (modal).
    html.find("[data-action='abrir-acoes-combate']").on("click", (ev) => {
      ev.preventDefault();
      return abrirAcoesCombate(this.actor);
    });

    // Usar poder (gasta PE, controla usos por cena).
    html.find("[data-action='usar-poder']").on("click", (ev) => {
      ev.preventDefault();
      const li = ev.currentTarget.closest("[data-item-id]");
      const item = this.actor.items.get(li?.dataset.itemId);
      if (item) return usarPoder(this.actor, item);
    });

    // Usar habilidade de trilha (pelo índice).
    html.find("[data-action='usar-trilha-hab']").on("click", (ev) => {
      ev.preventDefault();
      const li = ev.currentTarget.closest("[data-item-id]");
      const item = this.actor.items.get(li?.dataset.itemId);
      const index = Number(ev.currentTarget.dataset.index);
      if (item) return usarHabilidadeTrilha(this.actor, item, index);
    });

    // Morte & sanidade: marcar turnos e pedir socorro.
    html.find("[data-action='marcar-morrendo']").on("click", (ev) => {
      ev.preventDefault();
      return marcarTurnoMorrendo(this.actor);
    });
    html.find("[data-action='estabilizar']").on("click", (ev) => {
      ev.preventDefault();
      // O socorrista é o token controlado (outro personagem com Medicina).
      const medico = canvas?.tokens?.controlled[0]?.actor ?? game.user?.character;
      if (!medico || medico === this.actor) {
        return ui.notifications.warn(game.i18n.localize("ORDEM.Morte.SelecioneMedico"));
      }
      return estabilizar(medico, this.actor);
    });
    html.find("[data-action='marcar-enlouquecendo']").on("click", (ev) => {
      ev.preventDefault();
      return marcarTurnoEnlouquecendo(this.actor);
    });
    html.find("[data-action='acalmar']").on("click", (ev) => {
      ev.preventDefault();
      const diplomata = canvas?.tokens?.controlled[0]?.actor ?? game.user?.character;
      if (!diplomata || diplomata === this.actor) {
        return ui.notifications.warn(game.i18n.localize("ORDEM.San.SelecioneDiplomata"));
      }
      return acalmar(diplomata, this.actor);
    });

    // A partir daqui, somente quando editável.
    if (!this.isEditable) return;

    // Seletor de condições oficiais.
    html.find("[data-action='abrir-condicoes']").on("click", (ev) => {
      ev.preventDefault();
      return abrirSeletorCondicao(this.actor);
    });

    // Rastreador de ações do turno: alterna "gasta ↔ disponível" (marcador visual,
    // sem impor limites). As ações voltam sozinhas no início do turno em combate.
    html.find("[data-action='toggle-acao-turno']").on("click", (ev) => {
      ev.preventDefault();
      const key = ev.currentTarget.dataset.acao;
      if (!key) return;
      const gasta = !!this.actor.system.acoesTurno?.[key];
      return this.actor.update({ [`system.acoesTurno.${key}`]: !gasta });
    });

    // Setas de ajuste rápido dos recursos (« ‹ › »).
    html.find("[data-action='recurso-step']").on("click", this._onRecursoStep.bind(this));

    // Subir / voltar NEX (level up + rollback).
    html.find("[data-action='subir-nex']").on("click", (ev) => {
      ev.preventDefault();
      return subirNex(this.actor);
    });
    html.find("[data-action='voltar-nex']").on("click", (ev) => {
      ev.preventDefault();
      return voltarNex(this.actor, Number(ev.currentTarget.dataset.index));
    });

    // Modo SaH: ganhar/gastar XP (NEX & Experiência) e liberar rituais retidos.
    html.find("[data-action='ganhar-xp']").on("click", async (ev) => {
      ev.preventDefault();
      const v = await this._promptNumero(game.i18n.localize("ORDEM.XP.GanharTitulo"), game.i18n.localize("ORDEM.XP.Ganhar"));
      if (v !== null) return progredirXP(this.actor, v);
    });
    html.find("[data-action='gastar-xp']").on("click", (ev) => {
      ev.preventDefault();
      return progredirXP(this.actor, 0);
    });
    html.find("[data-action='liberar-ritual']").on("click", (ev) => {
      ev.preventDefault();
      return liberarRitual(this.actor, Number(ev.currentTarget.dataset.index));
    });

    // Alternar item equipado (arma/proteção) e condição ativa.
    html.find("[data-action='toggle-equipado']").on("change", this._onToggleEquipado.bind(this));
    html.find("[data-action='toggle-condicao']").on("change", this._onToggleCondicao.bind(this));

    // Recursos customizados (até 10): adicionar/remover/setas/edição.
    html.find("[data-action='rc-add']").on("click", this._onRecursoCustomAdd.bind(this));
    html.find("[data-action='rc-remove']").on("click", this._onRecursoCustomRemove.bind(this));
    html.find("[data-action='rc-step']").on("click", this._onRecursoCustomStep.bind(this));
    html.find(".rc-campo").on("change", this._onRecursoCustomChange.bind(this));

    // Ações customizadas (até 10): adicionar/remover/usar/edição.
    html.find("[data-action='ac-add']").on("click", this._onAcaoCustomAdd.bind(this));
    html.find("[data-action='ac-remove']").on("click", this._onAcaoCustomRemove.bind(this));
    html.find("[data-action='ac-usar']").on("click", this._onAcaoCustomUsar.bind(this));
    html.find(".ac-campo").on("change", this._onAcaoCustomChange.bind(this));

    // Criar / editar / remover itens.
    html.find("[data-action='criar-item']").on("click", this._onCriarItem.bind(this));
    html.find("[data-action='editar-item']").on("click", this._onEditarItem.bind(this));
    html.find("[data-action='remover-item']").on("click", this._onRemoverItem.bind(this));

    // Usar poder / ritual (envia descrição ao chat).
    html.find("[data-action='usar-item']").on("click", this._onUsarItem.bind(this));
  }

  /** Diálogo simples para informar um número (ex.: XP ganho). Resolve com number|null. */
  _promptNumero(titulo, label) {
    return new Promise(resolve => {
      new Dialog({
        title: titulo,
        content: `<form class="ordem-roll-dialog"><div class="form-group">
          <label>${label}</label>
          <input type="number" name="valor" value="0" autofocus />
        </div></form>`,
        buttons: {
          ok: {
            icon: '<i class="fas fa-check"></i>',
            label: game.i18n.localize("ORDEM.NEX.Aplicar"),
            callback: html => resolve(Number(html[0].querySelector("[name='valor']").value) || 0)
          },
          cancelar: {
            icon: '<i class="fas fa-times"></i>',
            label: game.i18n.localize("ORDEM.Dialog.Cancelar"),
            callback: () => resolve(null)
          }
        },
        default: "ok"
      }, { classes: ["ordem-paranormal", "op-theme", "dialog"] }).render(true);
    });
  }

  _onRolarAtaque(event) {
    event.preventDefault();
    const li = event.currentTarget.closest("[data-item-id]");
    const item = this.actor.items.get(li?.dataset.itemId);
    if (item) return rolarAtaque(this.actor, item);
  }

  _onConjurarRitual(event) {
    event.preventDefault();
    const li = event.currentTarget.closest("[data-item-id]");
    const item = this.actor.items.get(li?.dataset.itemId);
    if (item) return conjurarRitual(this.actor, item);
  }

  _onToggleEquipado(event) {
    const li = event.currentTarget.closest("[data-item-id]");
    const item = this.actor.items.get(li?.dataset.itemId);
    if (item) return item.update({ "system.equipado": event.currentTarget.checked });
  }

  _onToggleCondicao(event) {
    const li = event.currentTarget.closest("[data-item-id]");
    const item = this.actor.items.get(li?.dataset.itemId);
    if (item) return item.update({ "system.ativo": event.currentTarget.checked });
  }

  /* ------------------- RECURSOS CUSTOMIZADOS (até 10) -------------------- */

  /** Lê as linhas de recurso custom do DOM e reconstrói a lista completa. */
  _lerRecursosCustomDoDom() {
    const lista = [];
    this.element.find(".rc-linha").each((i, el) => {
      const row = $(el);
      lista.push({
        nome: row.find("[data-field='nome']").val() ?? "",
        value: Number(row.find("[data-field='value']").val()) || 0,
        max: Number(row.find("[data-field='max']").val()) || 0,
        cor: row.find("[data-field='cor']").val() || "#7b2fbe"
      });
    });
    return lista;
  }

  async _onRecursoCustomAdd(event) {
    event.preventDefault();
    const lista = foundry.utils.deepClone(this.actor.system.recursosCustom ?? []);
    if (lista.length >= 10) {
      return ui.notifications.warn(game.i18n.localize("ORDEM.Custom.LimiteRecursos"));
    }
    lista.push({ nome: "", value: 0, max: 0, cor: "#7b2fbe" });
    return this.actor.update({ "system.recursosCustom": lista });
  }

  async _onRecursoCustomRemove(event) {
    event.preventDefault();
    const idx = Number(event.currentTarget.dataset.index);
    const lista = foundry.utils.deepClone(this.actor.system.recursosCustom ?? []);
    lista.splice(idx, 1);
    return this.actor.update({ "system.recursosCustom": lista });
  }

  /** Setas « ‹ › » do recurso custom (mesma semântica de _onRecursoStep). */
  async _onRecursoCustomStep(event) {
    event.preventDefault();
    const btn = event.currentTarget;
    const idx = Number(btn.dataset.index);
    const modo = btn.dataset.step; // min | dec | inc | max
    const lista = foundry.utils.deepClone(this.actor.system.recursosCustom ?? []);
    const r = lista[idx];
    if (!r) return;
    const max = Number(r.max) || 0;
    let novo = Number(r.value) || 0;
    switch (modo) {
      case "min": novo = 0; break;
      case "dec": novo = novo - 1; break;
      case "inc": novo = novo + 1; break;
      case "max": novo = max; break;
    }
    r.value = Math.clamp(novo, 0, Math.max(0, max));
    return this.actor.update({ "system.recursosCustom": lista });
  }

  _onRecursoCustomChange(event) {
    return this.actor.update({ "system.recursosCustom": this._lerRecursosCustomDoDom() });
  }

  /* -------------------- AÇÕES CUSTOMIZADAS (até 10) ---------------------- */

  /** Lê as linhas de ação custom do DOM e reconstrói a lista completa. */
  _lerAcoesCustomDoDom() {
    const lista = [];
    this.element.find(".ac-linha").each((i, el) => {
      const row = $(el);
      lista.push({
        nome: row.find("[data-field='nome']").val() ?? "",
        descricao: row.find("[data-field='descricao']").val() ?? "",
        custoPe: Number(row.find("[data-field='custoPe']").val()) || 0
      });
    });
    return lista;
  }

  async _onAcaoCustomAdd(event) {
    event.preventDefault();
    const lista = foundry.utils.deepClone(this.actor.system.acoesCustom ?? []);
    if (lista.length >= 10) {
      return ui.notifications.warn(game.i18n.localize("ORDEM.Custom.LimiteAcoes"));
    }
    lista.push({ nome: "", descricao: "", custoPe: 0 });
    return this.actor.update({ "system.acoesCustom": lista });
  }

  async _onAcaoCustomRemove(event) {
    event.preventDefault();
    const idx = Number(event.currentTarget.dataset.index);
    const lista = foundry.utils.deepClone(this.actor.system.acoesCustom ?? []);
    lista.splice(idx, 1);
    return this.actor.update({ "system.acoesCustom": lista });
  }

  _onAcaoCustomChange(event) {
    return this.actor.update({ "system.acoesCustom": this._lerAcoesCustomDoDom() });
  }

  /**
   * Usa uma ação customizada: desconta o custo em PE (se houver) e publica a
   * descrição no chat — mesmo padrão de _onUsarItem.
   */
  async _onAcaoCustomUsar(event) {
    event.preventDefault();
    const idx = Number(event.currentTarget.dataset.index);
    const acao = (this.actor.system.acoesCustom ?? [])[idx];
    if (!acao) return;

    const custo = Number(acao.custoPe) || 0;
    let peGastoInfo = "";
    if (custo > 0) {
      const peAtual = Number(this.actor.system.recursos?.pe?.value) || 0;
      if (custo > peAtual) {
        return ui.notifications.warn(game.i18n.format("ORDEM.Aviso.PEInsuficiente", { custo, atual: peAtual }));
      }
      await this.actor.update({ "system.recursos.pe.value": peAtual - custo });
      peGastoInfo = ` <span class="pe-gasto">(−${custo} PE)</span>`;
    }

    const nome = Handlebars.escapeExpression(acao.nome || game.i18n.localize("ORDEM.Custom.AcaoSemNome"));
    const conteudo = `
    <div class="ordem-chat-card item">
      <header class="card-header">
        <i class="fas fa-bolt"></i>
        <h3>${nome}</h3>
        <span class="atributo">${game.i18n.localize("ORDEM.Custom.Acao")}</span>
      </header>
      <div class="card-content">
        ${custo ? `<div class="meta">${custo} PE${peGastoInfo}</div>` : ""}
        <div class="descricao">${Handlebars.escapeExpression(acao.descricao ?? "")}</div>
      </div>
    </div>`;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: conteudo
    });
  }

  /* ------------------------------- ROLAGENS ------------------------------ */

  _onRolarAtributo(event) {
    event.preventDefault();
    // Ignora cliques no campo de valor (edição) — só rola ao clicar no cartão.
    if (event.target.closest("input, select")) return;
    const atributoKey = event.currentTarget.dataset.atributo;
    return rolarTeste(this.actor, { atributoKey });
  }

  _onRolarPericia(event) {
    event.preventDefault();
    const periciaKey = event.currentTarget.dataset.pericia;
    return rolarTeste(this.actor, { periciaKey });
  }

  _onRolarDano(event) {
    event.preventDefault();
    const li = event.currentTarget.closest("[data-item-id]");
    const item = this.actor.items.get(li?.dataset.itemId);
    if (item) return rolarDano(this.actor, item);
  }

  /* -------------------------------- ITENS -------------------------------- */

  /**
   * Ajusta um recurso (PV/PE/SAN) pelas setas: « = mínimo, ‹ = -1, › = +1, » = máximo.
   */
  _onRecursoStep(event) {
    event.preventDefault();
    const btn = event.currentTarget;
    const recurso = btn.dataset.recurso;          // pv | pe | san
    const modo = btn.dataset.step;                // min | dec | inc | max
    const r = this.actor.system.recursos?.[recurso];
    if (!r) return;
    const min = r.min ?? 0;
    const max = Number(r.max) || 0;
    let novo = Number(r.value) || 0;
    switch (modo) {
      case "min": novo = min; break;
      case "dec": novo = novo - 1; break;
      case "inc": novo = novo + 1; break;
      case "max": novo = max; break;
    }
    novo = Math.clamp(novo, min, max);
    return this.actor.update({ [`system.recursos.${recurso}.value`]: novo });
  }

  async _onCriarItem(event) {
    event.preventDefault();
    const tipo = event.currentTarget.dataset.tipo;
    const nome = game.i18n.format("ORDEM.Item.Novo", {
      tipo: game.i18n.localize(`ORDEM.TipoItem.${tipo}`)
    });
    const itemData = { name: nome, type: tipo, system: {} };
    const [criado] = await this.actor.createEmbeddedDocuments("Item", [itemData]);
    criado?.sheet?.render(true);
  }

  _onEditarItem(event) {
    event.preventDefault();
    const li = event.currentTarget.closest("[data-item-id]");
    const item = this.actor.items.get(li?.dataset.itemId);
    item?.sheet?.render(true);
  }

  async _onRemoverItem(event) {
    event.preventDefault();
    const li = event.currentTarget.closest("[data-item-id]");
    const item = this.actor.items.get(li?.dataset.itemId);
    if (!item) return;
    const confirmar = await Dialog.confirm({
      title: game.i18n.localize("ORDEM.Item.RemoverTitulo"),
      content: `<p>${game.i18n.format("ORDEM.Item.RemoverConfirma", { nome: item.name })}</p>`
    });
    if (confirmar) await item.delete();
  }

  /**
   * Usa um poder ou ritual: desconta o custo em PE (se houver) e publica a
   * descrição no chat.
   */
  async _onUsarItem(event) {
    event.preventDefault();
    const li = event.currentTarget.closest("[data-item-id]");
    const item = this.actor.items.get(li?.dataset.itemId);
    if (!item) return;
    const sys = item.system;

    // Gasto de PE (poderes ativos e rituais).
    const custo = Number(sys.custoPe) || 0;
    let peGastoInfo = "";
    if (custo > 0) {
      const peAtual = Number(this.actor.system.recursos?.pe?.value) || 0;
      if (custo > peAtual) {
        return ui.notifications.warn(game.i18n.format("ORDEM.Aviso.PEInsuficiente", { custo, atual: peAtual }));
      }
      await this.actor.update({ "system.recursos.pe.value": peAtual - custo });
      peGastoInfo = ` <span class="pe-gasto">(−${custo} PE)</span>`;
    }

    const linhas = [];
    if (sys.custoPe) linhas.push(`<b>${game.i18n.localize("ORDEM.Campo.custoPe")}:</b> ${sys.custoPe} PE`);
    if (sys.circulo) linhas.push(`<b>${game.i18n.localize("ORDEM.Campo.circulo")}:</b> ${sys.circulo}`);
    if (sys.execucao) linhas.push(`<b>${game.i18n.localize("ORDEM.Campo.execucao")}:</b> ${sys.execucao}`);

    const descricao = await TextEditor.enrichHTML(sys.descricao ?? sys.efeito ?? "");

    const conteudo = `
    <div class="ordem-chat-card item">
      <header class="card-header">
        <img src="${item.img}" alt="${item.name}" />
        <h3>${item.name}</h3>
      </header>
      <div class="card-content">
        ${linhas.length ? `<div class="meta">${linhas.join(" &bull; ")}${peGastoInfo}</div>` : ""}
        <div class="descricao">${descricao}</div>
      </div>
    </div>`;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: conteudo
    });
  }
}
