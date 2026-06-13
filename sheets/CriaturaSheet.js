/**
 * Ficha de Criatura (Actor "criatura") — statblock de Ameaça.
 * Layout alinhado à ficha de Agente: atributos clicáveis, barra de PV/PE com
 * steppers, testes do statblock (Percepção/Iniciativa/Fortitude/Reflexos/
 * Vontade) roláveis, ataques e habilidades estruturados, Presença Perturbadora
 * e Enigma do Medo. Exporta/importa em JSON como os Agentes.
 */

import {
  ORDEM, rolarTeste, rolarDano,
  rolarTesteCriatura, rolarAtaqueCriatura, usarHabilidadeCriatura,
  presencaPerturbadora, exportarAgente, editarResistenciasDanos
} from "../module.js";

export class OrdemCriaturaSheet extends ActorSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["ordem-paranormal", "op-theme", "sheet", "actor", "criatura"],
      width: 860,
      height: 760,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "principal" }],
      scrollY: [".sheet-body", ".op-esquerda"]
    });
  }

  get template() {
    return "systems/ordem-paranormal/templates/criatura-sheet.hbs";
  }

  /** Botão "Exportar JSON" na barra de título (igual à ficha de Agente). */
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

  async getData(options) {
    const context = await super.getData(options);
    const sys = context.actor.system;

    context.system = sys;
    context.ORDEM = ORDEM;

    // Atributos para os botões de rolagem.
    context.atributosList = Object.keys(ORDEM.atributos).map(key => ({
      key,
      label: game.i18n.localize(ORDEM.atributos[key]),
      abrev: game.i18n.localize(ORDEM.atributosAbrev[key]),
      valor: Number(sys.atributos?.[key] ?? 0)
    }));

    // Resistências roláveis (Fortitude / Reflexos / Vontade).
    context.savesList = ["fortitude", "reflexos", "vontade"].map(key => ({
      key,
      label: game.i18n.localize(`ORDEM.Pericia.${key}`),
      dados: Number(sys.saves?.[key]?.dados ?? 1),
      bonus: Number(sys.saves?.[key]?.bonus ?? 0)
    }));

    // Listas de opções dos selects.
    context.categoriaOptions = ["humana", "paranormal", "outra"].map(v => ({
      value: v, label: game.i18n.localize(`ORDEM.Categoria.${v}`)
    }));
    context.tipoSerOptions = ["criatura", "humano", "animal", "construto", "demais"].map(v => ({
      value: v, label: game.i18n.localize(`ORDEM.Criatura.Tipo.${v}`)
    }));
    context.tamanhoOptions = ["minusculo", "pequeno", "medio", "grande", "enorme", "colossal"].map(v => ({
      value: v, label: game.i18n.localize(`ORDEM.Tamanho.${v}`)
    }));
    context.elementoOptions = Object.entries(ORDEM.elementos).map(([k, v]) => ({
      value: k, label: game.i18n.localize(v)
    }));
    context.acaoTipoOptions = ["padrao", "movimento", "completa", "livre", "reacao"].map(v => ({
      value: v, label: game.i18n.localize(`ORDEM.AcaoTipo.${v}`)
    }));
    context.alcanceOptions = ["corpoacorpo", "distancia"].map(v => ({
      value: v, label: game.i18n.localize(`ORDEM.Criatura.${v === "distancia" ? "Distancia" : "CorpoACorpo"}`)
    }));

    // Ataques e habilidades estruturados.
    context.ataquesLista = Array.isArray(sys.ataquesLista) ? sys.ataquesLista : [];
    context.habilidadesLista = Array.isArray(sys.habilidadesLista) ? sys.habilidadesLista : [];
    context.rdLista = Array.isArray(sys.rd) ? sys.rd : [];
    context.periciasLista = Array.isArray(sys.periciasLista) ? sys.periciasLista : [];

    // --- Listas de opções para os selects estruturados ---
    // Resumos de Resistências & Danos (editados no modal).
    const danoLabel = (t) => t === "todos"
      ? game.i18n.localize("ORDEM.Criatura.TipoTodos")
      : game.i18n.localize(`ORDEM.TipoDano.${t}`);
    const imuneLabel = (k) => ORDEM.categoriasCondicao.includes(k)
      ? `${game.i18n.localize("ORDEM.Criatura.CondLabel")}: ${game.i18n.localize(`ORDEM.CondCategoria.${k}`)}`
      : danoLabel(k);
    context.rdResumo = (Array.isArray(sys.rd) ? sys.rd : [])
      .map(e => `${danoLabel(e.tipo)} ${Number(e.valor) || 0}`).join(", ");
    context.imuneResumo = (Array.isArray(sys.imunidades) ? sys.imunidades : [])
      .map(imuneLabel).join(", ");
    context.vulnResumo = (Array.isArray(sys.vulnerabilidades) ? sys.vulnerabilidades : [])
      .map(danoLabel).join(", ");

    // Perícias (as 28) para o seletor de "Outras perícias".
    context.periciaOptions = Object.keys(ORDEM.pericias)
      .map(k => ({ value: k, label: game.i18n.localize(`ORDEM.Pericia.${k}`) }))
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));

    // Valores derivados (Defesa total, estado machucado).
    context.derivado = { estado: sys.estado ?? {} };

    // Armas embutidas (ataques roláveis legados).
    context.armas = context.actor.items.filter(i => i.type === "arma");

    // Campos de texto enriquecidos.
    context.ataquesHTML = await TextEditor.enrichHTML(sys.ataques ?? "");
    context.habilidadesHTML = await TextEditor.enrichHTML(sys.habilidades ?? "");
    context.enigmaHTML = await TextEditor.enrichHTML(sys.enigmaMedo ?? "");

    context.editable = this.isEditable;
    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Rolar atributo (clique no cartão; ignora cliques no input).
    html.find("[data-action='rolar-atributo']").on("click", (ev) => {
      ev.preventDefault();
      if (ev.target.closest("input, select")) return;
      return rolarTeste(this.actor, { atributoKey: ev.currentTarget.dataset.atributo });
    });

    // Rolar testes do statblock (sentidos.* / saves.*).
    html.find("[data-action='rolar-stat']").on("click", (ev) => {
      ev.preventDefault();
      return rolarTesteCriatura(this.actor, ev.currentTarget.dataset.chave);
    });

    // Rolar dano de arma embutida.
    html.find("[data-action='rolar-dano']").on("click", (ev) => {
      ev.preventDefault();
      const li = ev.currentTarget.closest("[data-item-id]");
      const item = this.actor.items.get(li?.dataset.itemId);
      if (item) return rolarDano(this.actor, item);
    });

    // Ataques e habilidades estruturados.
    html.find("[data-action='ca-rolar']").on("click", (ev) => {
      ev.preventDefault();
      return rolarAtaqueCriatura(this.actor, Number(ev.currentTarget.dataset.index));
    });
    html.find("[data-action='ch-usar']").on("click", (ev) => {
      ev.preventDefault();
      return usarHabilidadeCriatura(this.actor, Number(ev.currentTarget.dataset.index));
    });

    // Editar Resistências & Danos (modal).
    html.find("[data-action='editar-resist-danos']").on("click", (ev) => {
      ev.preventDefault();
      return editarResistenciasDanos(this.actor);
    });

    // Presença perturbadora.
    html.find("[data-action='presenca-perturbadora']").on("click", (ev) => {
      ev.preventDefault();
      return presencaPerturbadora(this.actor);
    });

    if (!this.isEditable) return;

    // Setas de ajuste rápido dos recursos (PV/PE).
    html.find("[data-action='recurso-step']").on("click", this._onRecursoStep.bind(this));

    // Criar / editar / remover armas embutidas.
    html.find("[data-action='criar-item']").on("click", async (ev) => {
      ev.preventDefault();
      const tipo = ev.currentTarget.dataset.tipo;
      const [criado] = await this.actor.createEmbeddedDocuments("Item", [{
        name: game.i18n.format("ORDEM.Item.Novo", { tipo: game.i18n.localize(`ORDEM.TipoItem.${tipo}`) }),
        type: tipo
      }]);
      criado?.sheet?.render(true);
    });
    html.find("[data-action='editar-item']").on("click", (ev) => {
      const li = ev.currentTarget.closest("[data-item-id]");
      this.actor.items.get(li?.dataset.itemId)?.sheet?.render(true);
    });
    html.find("[data-action='remover-item']").on("click", async (ev) => {
      const li = ev.currentTarget.closest("[data-item-id]");
      await this.actor.items.get(li?.dataset.itemId)?.delete();
    });

    // --- Editores das listas estruturadas (ataques / habilidades) ---
    html.find("[data-action='ca-add']").on("click", async (ev) => {
      ev.preventDefault();
      const lista = foundry.utils.deepClone(this.actor.system.ataquesLista ?? []);
      lista.push({ nome: "", acao: "padrao", alcance: "corpoacorpo", dados: 2, bonus: 0, multiplicador: 1, dano: "1d6", tipoDano: "", efeito: "" });
      return this.actor.update({ "system.ataquesLista": lista });
    });
    html.find("[data-action='ca-remove']").on("click", async (ev) => {
      ev.preventDefault();
      const lista = foundry.utils.deepClone(this.actor.system.ataquesLista ?? []);
      lista.splice(Number(ev.currentTarget.dataset.index), 1);
      return this.actor.update({ "system.ataquesLista": lista });
    });
    html.find(".ca-campo").on("change", () => {
      const lista = [];
      this.element.find(".ca-linha").each((i, el) => {
        const row = $(el);
        lista.push({
          nome: row.find("[data-field='nome']").val() || "",
          acao: row.find("[data-field='acao']").val() || "padrao",
          alcance: row.find("[data-field='alcance']").val() || "corpoacorpo",
          dados: Number(row.find("[data-field='dados']").val()) || 0,
          bonus: Number(row.find("[data-field='bonus']").val()) || 0,
          multiplicador: Math.max(1, Number(row.find("[data-field='multiplicador']").val()) || 1),
          dano: row.find("[data-field='dano']").val() || "",
          tipoDano: row.find("[data-field='tipoDano']").val() || "",
          efeito: row.find("[data-field='efeito']").val() || ""
        });
      });
      return this.actor.update({ "system.ataquesLista": lista });
    });

    html.find("[data-action='ch-add']").on("click", async (ev) => {
      ev.preventDefault();
      const lista = foundry.utils.deepClone(this.actor.system.habilidadesLista ?? []);
      lista.push({ nome: "", custoPe: 0, descricao: "" });
      return this.actor.update({ "system.habilidadesLista": lista });
    });
    html.find("[data-action='ch-remove']").on("click", async (ev) => {
      ev.preventDefault();
      const lista = foundry.utils.deepClone(this.actor.system.habilidadesLista ?? []);
      lista.splice(Number(ev.currentTarget.dataset.index), 1);
      return this.actor.update({ "system.habilidadesLista": lista });
    });
    html.find(".ch-campo").on("change", () => {
      const lista = [];
      this.element.find(".ch-linha").each((i, el) => {
        const row = $(el);
        lista.push({
          nome: row.find("[data-field='nome']").val() || "",
          custoPe: Number(row.find("[data-field='custoPe']").val()) || 0,
          descricao: row.find("[data-field='descricao']").val() || ""
        });
      });
      return this.actor.update({ "system.habilidadesLista": lista });
    });

    // --- Outras perícias (rolável) ---
    html.find("[data-action='cp-rolar']").on("click", (ev) => {
      ev.preventDefault();
      return rolarTesteCriatura(this.actor, `pericia:${Number(ev.currentTarget.dataset.index)}`);
    });
    html.find("[data-action='cp-add']").on("click", async (ev) => {
      ev.preventDefault();
      const lista = foundry.utils.deepClone(this.actor.system.periciasLista ?? []);
      lista.push({ pericia: "atletismo", dados: 1, bonus: "0" });
      return this.actor.update({ "system.periciasLista": lista });
    });
    html.find("[data-action='cp-remove']").on("click", async (ev) => {
      ev.preventDefault();
      const lista = foundry.utils.deepClone(this.actor.system.periciasLista ?? []);
      lista.splice(Number(ev.currentTarget.dataset.index), 1);
      return this.actor.update({ "system.periciasLista": lista });
    });
    html.find(".cp-campo").on("change", () => {
      const lista = [];
      this.element.find(".cp-linha").each((i, el) => {
        const row = $(el);
        lista.push({
          pericia: row.find("[data-field='pericia']").val() || "",
          dados: Number(row.find("[data-field='dados']").val()) || 0,
          bonus: (row.find("[data-field='bonus']").val() ?? "0").trim()
        });
      });
      return this.actor.update({ "system.periciasLista": lista });
    });
  }

  /** Ajusta PV/PE pelas setas (« mínimo, ‹ −1, › +1, » máximo). */
  _onRecursoStep(event) {
    event.preventDefault();
    const btn = event.currentTarget;
    const recurso = btn.dataset.recurso;
    const modo = btn.dataset.step;
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
}
