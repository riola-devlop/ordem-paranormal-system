/**
 * Ficha genérica de Item.
 * Atende a todos os tipos: pericia, poder, arma, ritual, equipamento, origem,
 * trilha, protecao e condicao. O template (item-sheet.hbs) decide quais campos
 * exibir conforme item.type. Inclui o editor de MODIFICADORES.
 */

import { ORDEM, rolarDano } from "../module.js";

export class OrdemItemSheet extends ItemSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["ordem-paranormal", "op-theme", "sheet", "item"],
      width: 560,
      height: 600,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "detalhes" }]
    });
  }

  get template() {
    return "systems/ordem-paranormal/templates/item-sheet.hbs";
  }

  async getData(options) {
    const context = await super.getData(options);
    const item = context.item;
    context.system = item.system;
    context.ORDEM = ORDEM;

    // Listas de opções usadas pelos selects do template.
    context.atributoOptions = Object.keys(ORDEM.atributos).map(key => ({
      value: key, label: game.i18n.localize(ORDEM.atributos[key])
    }));
    context.classeOptions = Object.entries(ORDEM.classes).map(([k, v]) => ({
      value: k, label: game.i18n.localize(v)
    }));
    context.elementoOptions = Object.entries(ORDEM.elementos).map(([k, v]) => ({
      value: k, label: game.i18n.localize(v)
    }));
    context.nivelTreinamentoOptions = Object.keys(ORDEM.bonusTreinamento).map(key => ({
      value: key,
      label: `${game.i18n.localize(`ORDEM.Treinamento.${key}`)} (+${ORDEM.bonusTreinamento[key]})`
    }));
    context.tipoArmaOptions = ["simples", "tatica", "pesada"].map(v => ({
      value: v, label: game.i18n.localize(`ORDEM.CategoriaArma.${v}`)
    }));
    context.empunhaduraOptions = ["leve", "umaMao", "duasMaos"].map(v => ({
      value: v, label: game.i18n.localize(`ORDEM.Empunhadura.${v}`)
    }));
    context.tipoProtecaoOptions = ["leve", "pesada"].map(v => ({
      value: v, label: game.i18n.localize(`ORDEM.TipoProtecao.${v}`)
    }));
    context.tipoPoderOptions = ["ativo", "passivo"].map(v => ({
      value: v, label: game.i18n.localize(`ORDEM.TipoPoder.${v}`)
    }));
    context.periciaTesteOptions = ["luta", "pontaria"].map(v => ({
      value: v, label: game.i18n.localize(`ORDEM.Pericia.${v}`)
    }));
    context.resistenciaOptions = ["fortitude", "reflexos", "vontade"].map(v => ({
      value: v, label: game.i18n.localize(`ORDEM.Pericia.${v}`)
    }));

    // Alvos de modificador (para o editor de modificadores).
    context.alvoOptions = Object.entries(ORDEM.alvosModificador).map(([k, v]) => ({
      value: k, label: game.i18n.localize(v)
    }));
    // Adiciona perícias individuais como alvos (pericia.<chave>).
    for (const key of Object.keys(ORDEM.pericias)) {
      context.alvoOptions.push({
        value: `pericia.${key}`,
        label: `${game.i18n.localize("ORDEM.Alvo.periciaPrefixo")}: ${game.i18n.localize(`ORDEM.Pericia.${key}`)}`
      });
    }

    // Indica se o tipo aceita modificadores e se é um item físico (carga).
    context.temModificadores = Array.isArray(item.system.modificadores);
    context.ehFisico = ["arma", "protecao", "equipamento"].includes(item.type);
    context.ehTrilha = item.type === "trilha";

    // Alvos de dados por perícia (dados.pericia.<chave>) — penalidades −Ⓞ.
    for (const key of Object.keys(ORDEM.pericias)) {
      context.alvoOptions.push({
        value: `dados.pericia.${key}`,
        label: `${game.i18n.localize("ORDEM.Alvo.dadosPericiaPrefixo")}: ${game.i18n.localize(`ORDEM.Pericia.${key}`)}`
      });
    }

    context.descricaoHTML = await TextEditor.enrichHTML(item.system.descricao ?? "");
    context.editable = this.isEditable;
    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Rolar dano direto da ficha da arma.
    html.find("[data-action='rolar-dano']").on("click", (ev) => {
      ev.preventDefault();
      rolarDano(this.item.actor, this.item);
    });

    if (!this.isEditable) return;

    // --- Editor de modificadores ---
    html.find("[data-action='mod-add']").on("click", this._onModAdd.bind(this));
    html.find("[data-action='mod-remove']").on("click", this._onModRemove.bind(this));
    // Os campos de modificador não têm "name" (ficam fora do submit padrão);
    // reconstruímos a lista inteira a cada alteração.
    html.find(".mod-campo").on("change", this._onModChange.bind(this));

    // --- Editor de habilidades de trilha ---
    html.find("[data-action='th-add']").on("click", this._onTrilhaHabAdd.bind(this));
    html.find("[data-action='th-remove']").on("click", this._onTrilhaHabRemove.bind(this));
    html.find(".th-campo").on("change", this._onTrilhaHabChange.bind(this));

    // --- Editor de aprimoramentos de ritual ---
    html.find("[data-action='apr-add']").on("click", this._onAprAdd.bind(this));
    html.find("[data-action='apr-remove']").on("click", this._onAprRemove.bind(this));
    html.find(".apr-campo").on("change", this._onAprChange.bind(this));
  }

  /** Reconstrói a lista de modificadores a partir das linhas do editor. */
  _onModChange(event) {
    const lista = [];
    this.element.find(".mod-linha").each((i, el) => {
      const row = $(el);
      const mod = {
        // Valor é uma fórmula (texto): aceita inteiros, atributos e dados.
        alvo: row.find("[data-field='alvo']").val() || "",
        valor: (row.find("[data-field='valor']").val() ?? "").trim(),
        rotulo: row.find("[data-field='rotulo']").val() || "",
        ativo: row.find("[data-field='ativo']").is(":checked")
      };
      // Trilhas: NEX mínimo opcional para o modificador valer (desbloqueio).
      const nexCampo = row.find("[data-field='nex']");
      if (nexCampo.length) mod.nex = Number(nexCampo.val()) || 0;
      lista.push(mod);
    });
    return this.item.update({ "system.modificadores": lista });
  }

  /** Adiciona uma linha de modificador. */
  async _onModAdd(event) {
    event.preventDefault();
    const lista = foundry.utils.deepClone(this.item.system.modificadores ?? []);
    lista.push({ alvo: "defesa", valor: "", ativo: true, rotulo: "" });
    return this.item.update({ "system.modificadores": lista });
  }

  /** Remove uma linha de modificador pelo índice. */
  async _onModRemove(event) {
    event.preventDefault();
    const idx = Number(event.currentTarget.dataset.index);
    const lista = foundry.utils.deepClone(this.item.system.modificadores ?? []);
    lista.splice(idx, 1);
    return this.item.update({ "system.modificadores": lista });
  }

  /* ------------------- HABILIDADES DE TRILHA (por NEX) ------------------- */

  async _onTrilhaHabAdd(event) {
    event.preventDefault();
    const lista = foundry.utils.deepClone(this.item.system.habilidades ?? []);
    // Sugere o próximo marco padrão de trilha (10 / 40 / 65 / 99).
    const marcos = [10, 40, 65, 99];
    const nex = marcos[Math.min(lista.length, marcos.length - 1)];
    lista.push({ nex, nome: "", custoPe: 0, descricao: "" });
    return this.item.update({ "system.habilidades": lista });
  }

  async _onTrilhaHabRemove(event) {
    event.preventDefault();
    const idx = Number(event.currentTarget.dataset.index);
    const lista = foundry.utils.deepClone(this.item.system.habilidades ?? []);
    lista.splice(idx, 1);
    return this.item.update({ "system.habilidades": lista });
  }

  _onTrilhaHabChange(event) {
    const lista = [];
    this.element.find(".th-linha").each((i, el) => {
      const row = $(el);
      lista.push({
        nex: Number(row.find("[data-field='nex']").val()) || 0,
        nome: row.find("[data-field='nome']").val() || "",
        custoPe: Number(row.find("[data-field='custoPe']").val()) || 0,
        descricao: row.find("[data-field='descricao']").val() || ""
      });
    });
    return this.item.update({ "system.habilidades": lista });
  }

  /* --------------------- APRIMORAMENTOS DE RITUAL ------------------------ */

  async _onAprAdd(event) {
    event.preventDefault();
    const lista = foundry.utils.deepClone(this.item.system.aprimoramentosLista ?? []);
    lista.push({ nome: "", custoPe: 2, descricao: "" });
    return this.item.update({ "system.aprimoramentosLista": lista });
  }

  async _onAprRemove(event) {
    event.preventDefault();
    const idx = Number(event.currentTarget.dataset.index);
    const lista = foundry.utils.deepClone(this.item.system.aprimoramentosLista ?? []);
    lista.splice(idx, 1);
    return this.item.update({ "system.aprimoramentosLista": lista });
  }

  _onAprChange(event) {
    const lista = [];
    this.element.find(".apr-linha").each((i, el) => {
      const row = $(el);
      lista.push({
        nome: row.find("[data-field='nome']").val() || "",
        custoPe: Number(row.find("[data-field='custoPe']").val()) || 0,
        descricao: row.find("[data-field='descricao']").val() || ""
      });
    });
    return this.item.update({ "system.aprimoramentosLista": lista });
  }
}
