# Ordem Paranormal RPG — Manual do Sistema (Foundry VTT v12)

Sistema **não oficial** de RPG de investigação e terror paranormal para **Foundry VTT v12**.
Este documento é o **manual**: como **instalar**, como **começar** e como **usar** cada recurso.

> Sumário: [Requisitos](#requisitos) · [Instalação](#instalação) · [Primeiros passos](#primeiros-passos) · [Modo de regras](#modo-de-regras-padrão--sobrevivendo-ao-horror) · [Guia de uso](#guia-de-uso) · [Ferramentas do Mestre](#ferramentas-do-mestre) · [Conteúdo e compartilhamento](#conteúdo-e-compartilhamento) · [Fórmulas](#fórmulas-status--dados) · [Referência rápida](#referência-rápida) · [API](#api-para-macros-e-console) · [Estrutura](#estrutura-de-arquivos-desenvolvimento)

---

## Requisitos

- **Foundry VTT v12** (testado e verificado na v12).
- Idioma: **Português (Brasil)**.
- Módulos recomendados (opcionais): *Dice So Nice!* para dados 3D.

---

## Instalação

O Foundry detecta sistemas automaticamente lendo o `system.json` de cada pasta dentro de `Data/systems/`. A pasta **precisa ter o mesmo nome do `id`** do sistema — aqui, `ordem-paranormal`.

### Instalação manual (cópia de arquivos)

1. Localize a pasta de dados do Foundry (**User Data**). No menu inicial do Foundry: *Configuration → User Data Path*. Dentro dela existe a pasta `Data/systems/`.
2. Copie a pasta do sistema para lá, ficando:
   `…/Data/systems/ordem-paranormal/`
   (confirme que existe o arquivo `…/ordem-paranormal/system.json`).
3. **Confirme o nome da pasta**: tem de ser exatamente `ordem-paranormal` (igual ao `id` em `system.json`).
4. **Reinicie o Foundry** (feche e abra o servidor) para ele detectar o sistema.
5. Em **Game Systems**, o sistema **Ordem Paranormal RPG** deve aparecer na lista.

### Criar um mundo com o sistema

1. Aba **Game Worlds → Create World**.
2. Em **Game System**, escolha **Ordem Paranormal RPG**.
3. Dê um nome ao mundo e clique em **Create World** → **Launch World**.

### Atualizar / recarregar após mudanças

- Substitua os arquivos da pasta `ordem-paranormal/` pela nova versão.
- Para recarregar a interface sem reiniciar o servidor: **F5** (ou *Return to Setup* → *Launch* de novo).
- Mudanças em `system.json`, `template.json` ou novos compêndios exigem **reiniciar o servidor**.

### Não aparece na lista?

- O nome da pasta não bate com o `id` (`ordem-paranormal`).
- Faltou reiniciar o servidor após copiar.
- `system.json` inválido — confira se o arquivo está íntegro.

---

## Primeiros passos

1. **Crie um Agente**: aba **Atores → Create Actor → tipo `Agente`**. Abra a ficha.
2. Preencha **Origem**, **Classe**, **Trilha**, **Patente** e os **5 atributos** (pentágono).
3. Ajuste o **NEX** (canto superior da ficha). Use o botão **Subir NEX** para evoluir com o assistente.
4. Adicione **armas, proteções, poderes, rituais e equipamentos** pelas abas (botão **+**).
5. **Criaturas/NPCs**: **Create Actor → tipo `Criatura`** — ficha de statblock com o mesmo visual.
6. **Clique para rolar**: clique num atributo (pentágono) ou numa perícia para abrir o diálogo de teste.

---

## Modo de regras (Padrão ↔ Sobrevivendo ao Horror)

Cada ficha escolhe seu conjunto de regras no seletor **Modo de regras** (barra superior do Agente):

- **Padrão (Livro de Regras)**: progressão por marcos de **NEX**; sanidade/loucura padrão.
- **Sobrevivendo ao Horror (SaH)**: progressão por **Experiência (XP)**; permite **Reter Ritual**; camada de **Compreensão Humana**.

O escopo é **por ficha** — você pode ter agentes em modos diferentes no mesmo mundo. No modo SaH:

- O painel de progressão troca para **XP** (botões *Ganhar XP* / *Gastar XP*).
- O diálogo de conjuração ganha a opção **Reter ritual (duração retida)**: o custo sai do PE **máximo e atual** e custa **1 Sanidade** enquanto mantido; aparece a lista **Rituais retidos** (com botão *Liberar*, que devolve o PE máximo).

> Observação: os valores exatos de XP e os efeitos de Compreensão Humana ficam centralizados em `regras.js` (`SAH_CONFIG`) com marcadores `TODO(SaH)`, prontos para serem preenchidos conforme o livro do Mestre.

---

## Guia de uso

### A ficha do Agente

- **Pentágono de atributos** (clique para rolar), barras de **PV / SAN / PE** com setas de ajuste, **NEX**, **Defesa**, **Deslocamento**, **Carga** e **DTs** derivadas.
- Abas: **Perícias**, **Combate**, **Habilidades** (origem/trilhas/poderes/rituais), **Inventário** (+ condições) e **Notas**.
- **Recursos e ações personalizados** (até 10 de cada) na coluna/aba correspondente.

### Rolagens e testes (`rolarTeste`)

- Clique num **atributo** ou **perícia**. O diálogo oferece **CD**, **Modificador extra** (aceita fórmula), **Dados extras** e **Circunstância** (Favorável +1d20 / Desfavorável −1d20).
- Habilidades de classe aparecem quando aplicáveis: **Ataque Especial** (Combatente), **Perito** e **Eclético** (Especialista).
- **Mecânica**: rola `Nd20` (N = atributo) e mantém o **maior**; atributo 0 rola `2d20` e mantém o **menor**. Condições/itens podem somar ou remover dados do pool.

**Graus de sucesso** (rodapé do card): Falha Crítica (1 natural) · Falha · Sucesso · **Sucesso Extraordinário** (≥ CD+10) · Acerto Crítico (20 natural / margem de ameaça).

### Combate

- **Atacar**: na aba Combate ou na lista de armas, clique no alvo de ataque. O diálogo de ataque inclui a *Situação* (Tabela 4.4): **Flanqueando**, **Posição elevada**, **Cobertura do alvo** e **Camuflagem** (rola 1d10 de chance de falha).
- **Dano**: o card de ataque traz o botão de dano (dobra os dados no crítico). O Mestre pode **Aplicar aos tokens selecionados** — o dano respeita RD/imunidade/vulnerabilidade da criatura.
- **Manobras** (`rolarManobra`): Agarrar, Derrubar, Desarmar, Empurrar, Quebrar, Atropelar. Marque um alvo (tecla **T**) e a oposição (Luta) é rolada automaticamente.
- **Ações de defesa** (`acaoDefesa`): Bloqueio, Esquiva, Contra-ataque (exigem treino na perícia correspondente).
- **Iniciativa / Carrossel**: faixa de turnos no topo da tela; iniciativa usa a perícia Iniciativa (ou o statblock da criatura).

### Condições (38 oficiais)

- Botão **+** em *Inventário → Condições* abre o **seletor de condições oficiais**.
- Efeitos automáticos: penalidades em dados, Defesa, custo de PE (Alquebrado), deslocamento (Lento/Imóvel) e Iniciativa.
- **Condições implicadas** (Agarrado já inclui Desprevenido + Imóvel) e **agravamento** (Abalado → Apavorado; Fraco → Debilitado; Fatigado → Exausto) são tratados automaticamente.

### Morte e dano

- **0 PV** aplica *inconsciente* + *morrendo* automaticamente. Botões na ficha marcam turnos morrendo (3 turnos na mesma cena = morte) e **Estabilizar** (Medicina DT 20).
- **Curar 1+ PV** encerra morrendo/inconsciente. **Dano massivo** (≥ metade dos PV de uma vez) anuncia o teste de Fortitude.

### Sanidade

- **SAN 0** aplica *enlouquecendo*; 3 turnos = *insano*. **Acalmar** = Diplomacia DT 20. Estados *perturbado* e *machucado* aparecem na ficha.

### Rituais e o paranormal (`conjurarRitual`)

- Conjurar abre diálogo com círculo/elemento/custo, **aprimoramentos** (com +PE) e, no modo SaH, **Reter ritual**.
- **Custo do Paranormal**: elementos ≠ Medo exigem Ocultismo vs DT 15 + PE gasto; falha causa dano mental (com botão de aplicar).
- **Resistência**: se definida, o card mostra a DT (de rituais do conjurador) e um botão para o alvo rolar.
- **Elementos e afinidade**: ciclo de opressão **Morte > Sangue > Conhecimento > Energia > Morte**. Contra um alvo marcado, o card indica vantagem (opressor) ou resistência (mesmo elemento). **Afinidade** (NEX 50%+) dispensa componentes do elemento afinado.

### Progressão (NEX) e classes

- **Subir NEX** abre o assistente do marco: aumento de atributo, grau de treinamento (treinado → veterano → expert), escolha de **poder de classe** (dos Itens do mundo) e habilidades de trilha.
- **Voltar NEX** reverte o marco, inclusive itens adicionados.
- **Origens**: ao adicionar, treinam perícias automaticamente e anunciam o poder de origem.
- **Trilhas**: habilidades por marco de NEX (desbloqueio automático; bloqueadas mostram cadeado).
- **Poderes**: custo de PE, usos por cena e validação de pré-requisitos (NEX/classe/elemento).

### Equipamentos e patentes

- **Patentes**: Recruta (0 PP), Operador (20), Agente Especial (50), Oficial (100), Agente de Elite (200). A ficha sugere a patente pelos Pontos de Prestígio.
- O inventário mostra **uso vs limite de itens por categoria (I–IV)** e alerta ao exceder.
- **Interlúdio** (aba Combate): Dormir/Relaxar (recupera PV/PE/SAN pela condição de descanso ×½ a ×3), Exercitar-se/Ler, Revisar caso, Manutenção.

---

## Ferramentas do Mestre

Botões na barra de controle de cena (à esquerda) e em diálogos:

- **Pedir Teste**: solicita um teste a vários tokens; cada jogador rola pelo card, que atualiza em tempo real. Opção de **rolagem secreta** (sussurrada só ao Mestre — testes passivos).
- **Nova Cena**: zera contadores de morrendo/enlouquecendo e usos por cena dos poderes.
- **Testes Estendidos**: tracker de complexidade (3/5/7 sucessos), variações e histórico.
- **Cena de Investigação**: rodadas, pistas editáveis e dica ao Mestre por grau de sucesso ao Procurar.
- **Criatura**: ataques/habilidades estruturados roláveis, **Resistências & Danos** (modal de RD/imunidade/vulnerabilidade), **Presença Perturbadora** (pede Vontade dos agentes) e **Enigma do Medo**.

---

## Conteúdo e compartilhamento

### Criador de Itens (assistente passo a passo)

Botão **Criar Item** no topo da aba **Itens**: escolha o tipo (arma, proteção, ritual, poder, equipamento, origem, trilha, condição) e o nome; preencha os campos (vários aceitam fórmula `@status` + dados). O Item é criado no mundo e a ficha abre para ajustes finos.

### Compêndios "Ordem Paranormal"

Na aba **Compêndios**, a pasta **Ordem Paranormal** agrupa: Poderes, Rituais, Armas, Proteções, Equipamentos, Origens, Trilhas, Condições (Itens), **Criaturas** e **Agentes** (Atores). Começam vazios — **arraste** itens/atores criados para dentro deles e o conteúdo fica reutilizável em qualquer mundo.

### Compartilhar conteúdo via GitHub (Compêndios ↔ JSON)

Botão **"Conteúdo Ordem (GitHub)"** no rodapé da aba **Compêndios** (só Mestre). Permite que Mestres e criadores compartilhem **tudo** (itens e atores) entre si:

- **Exportar**: escolha um compêndio (ou **Todos**) → baixa um JSON (`ordem-<pack>.json` ou `ordem-conteudo.json`) com todos os documentos. Faça commit no seu repositório GitHub.
- **Importar**: cole um **link do GitHub** (arquivo cru, `/blob/`, pasta `/tree/...` ou repositório) **ou** selecione arquivos `.json`. Cada documento é **roteado automaticamente** para o compêndio certo pelo tipo (poder→Poderes, criatura→Criaturas, etc.).
- **Conflitos**: se um documento de mesmo nome já existir, o sistema **pergunta** o que fazer — **Atualizar** (substitui), **Pular** ou **Criar novo** (cópia) — aplicado ao lote.

Fluxo de colaboração: exporte um compêndio → commit do JSON no GitHub → outros importam pelo link e recebem tudo nos compêndios correspondentes (com atualização incremental ao reimportar).

### Exportar / Importar fichas (JSON e GitHub)

- **Exportar**: botão **Exportar JSON** na barra de título da ficha (Agente ou Criatura). Gera `ficha-<nome>.json` com todos os itens embutidos.
- **Importar**: botão **Importar Agente** no topo da aba **Atores**. Aceita **arquivos** `.json` locais **ou** um **link do GitHub**: arquivo cru (`raw.githubusercontent.com`), `/blob/`, **pasta** (`/tree/...`, importa todos os `.json`) ou a **raiz do repositório** (vários de uma vez). Opção de agrupar em pasta.
- Fluxo de campanha: cada jogador exporta a ficha → você versiona os `.json` numa pasta do repositório → todos importam pelo link `…/tree/main/agentes`.

---

## Fórmulas (`@status` + dados)

Campos numéricos relevantes aceitam **fórmula**, não só inteiro. Referências a status da ficha **sempre usam `@`** (ex.: `@FOR+5`, `1d6+@NEX`):

- **Atributos**: `@FOR @AGI @INT @PRE @VIG` (e nomes completos, ex.: `@forca`).
- **Exposição**: `@NEX`, `@NIVEL`.
- **Recursos**: `@PV @PVMAX @PE @PEMAX @SAN @SANMAX`.
- **Derivados**: `@DEFESA @DTRITUAIS @DTFORTITUDE @DTREFLEXOS @DTVONTADE @DESLOCAMENTO @PERODADA @CARGA @CARGAMAX @VD @PRESTIGIO`.
- **Bônus de perícia**: `@luta`, `@percepcao`… ou `@pericia.luta`. Em criaturas: `@fortitude @reflexos @vontade @percepcao @iniciativa`.
- **Qualquer campo da ficha** pelo caminho cru: `@recursos.pv.max`, `@atributos.for`, `@saves.fortitude.bonus`.
- **Dados**: `1d6`, `2d8`. **Aritmética**: `+ - * / ( )` — ex.: `1d6+5+@FOR`, `@NEX/5`.

Onde se aplica: **modificadores de itens** (em valores passivos os dados usam a média, p/ estabilidade), **dano**, **bônus de ataque**, **bônus de perícia/ataque de criatura** e **Modificador extra** dos diálogos. Referência sem `@` ou desconhecida → não interpretada / `0`.

---

## Referência rápida

### Mecânica de dados

| CD | Nível |
| --- | --- |
| 10 | Fácil |
| 15 | Moderado |
| 18 | Difícil |
| 20+ | Paranormal |

### Perícias por atributo

| Atributo | Perícias |
| --- | --- |
| Agilidade | Acrobacia, Crime, Furtividade, Iniciativa, Pilotagem, Pontaria, Reflexos |
| Força | Atletismo, Luta |
| Intelecto | Atualidades, Ciências, Investigação, Medicina, Ocultismo, Profissão, Sobrevivência, Tática, Tecnologia |
| Presença | Adestramento, Artes, Diplomacia, Enganação, Intimidação, Intuição, Percepção, Religião, Vontade |
| Vigor | Fortitude |

### Dados derivados (calculados automaticamente)

| Campo | Cálculo |
| --- | --- |
| `defesa.total` | `10 + AGI + proteções + modificadores − sobrecarga` (Vulnerável −5, Desprevenido −5, Indefeso −10) |
| `deslocamentoTotal` | base + mods − sobrecarga; Lento = metade, Imóvel = 0 |
| `dtRituais` | `10 + nível de NEX + PRE + modificadores` |
| `dtFortitude / dtReflexos / dtVontade` | `10 + nível de NEX + VIG/AGI/PRE` |
| `peRodada` | `nível de NEX + modificadores` (mínimo 1) |
| `carga` | `FOR × 5` (2 se FOR 0) + modificadores |
| `PV / PE / SAN máximos` | Fórmula de classe + NEX + `bonusMax` + modificadores |
| `patenteSugerida` | patente pelos Pontos de Prestígio |
| `afinidadeAtiva` | NEX ≥ 50% e elemento escolhido |

### Sistema de modificadores

Itens `arma`, `protecao`, `equipamento`, `condicao`, `poder`, `origem` e `trilha` aplicam modificadores quando equipados/ativos.

- **Alvos planos:** `pv.max`, `pe.max`, `san.max`, `defesa`, `deslocamento`, `peRodada`, `dtRituais`, `carga`, `custoPe`, `atributo.agi/for/int/pre/vig`, `pericia.<chave>`, `pericia.todas`
- **Alvos em dados (−Ⓞ):** `dados.todos`, `dados.ataque`, `dados.atributo.<atributo>`, `dados.pericia.<chave>`
- Modificadores de **trilha** aceitam um campo NEX (só valem a partir do marco).

---

## API (para macros e console)

Disponível em `game.ordem`:

```js
// Testes (retornam { roll, total, natural, cd, sucesso, critico, desastre, extraordinario, grau })
game.ordem.rolarTeste(actor, { periciaKey: "investigacao", cd: 18 });
game.ordem.rolarAtaque(actor, itemArma);
game.ordem.rolarDano(actor, itemArma, { critico: false });
game.ordem.rolarResistencia(actor, "fortitude");
game.ordem.rolarAjuda(actor, "luta");

// Condições
game.ordem.aplicarCondicao(actor, "abalado");
game.ordem.removerCondicao(actor, "abalado");
game.ordem.abrirSeletorCondicao(actor);

// Ferimentos, morte & sanidade
game.ordem.aplicarDano(actor, 12, { tipo: "balistico" });
game.ordem.aplicarDanoMental(actor, 3);
game.ordem.curar(actor, 5);
game.ordem.recuperarSanidade(actor, 5);
game.ordem.estabilizar(medico, alvo);      // Medicina DT 20
game.ordem.acalmar(diplomata, alvo);       // Diplomacia DT 20

// Poderes, trilhas e combate
game.ordem.usarPoder(actor, itemPoder);
game.ordem.usarHabilidadeTrilha(actor, itemTrilha, 0);
game.ordem.rolarManobra(actor, "agarrar"); // marque um alvo
game.ordem.acaoDefesa(actor, "bloqueio");

// Criaturas
game.ordem.rolarTesteCriatura(criatura, "saves.fortitude");
game.ordem.rolarAtaqueCriatura(criatura, 0);
game.ordem.presencaPerturbadora(criatura);
game.ordem.editarResistenciasDanos(criatura);

// Modo de regras (Padrão ↔ Sobrevivendo ao Horror)
game.ordem.modoDoAtor(actor);              // "padrao" | "sah"
game.ordem.progredirXP(actor, 10);         // SaH: ganhar/gastar XP
game.ordem.liberarRitual(actor, 0);        // SaH: liberar ritual retido

// Fórmulas
game.ordem.avaliarFormulaPassiva("1d6+5+@FOR", actor);
game.ordem.resolverTokensFormula("2d6+@FOR", actor);

// Ferramentas de mesa (Mestre)
game.ordem.abrirPedirTeste();
game.ordem.abrirTesteEstendido();
game.ordem.abrirCenaInvestigacao();
game.ordem.novaCena();
game.ordem.abrirInterludio(actor);

// Conteúdo e fichas
game.ordem.abrirCriadorItem();
game.ordem.exportarAgente(actor);
game.ordem.importarFichas();

// Compartilhar conteúdo (compêndios ↔ GitHub)
game.ordem.abrirGerenciadorConteudo();              // hub exportar/importar
game.ordem.exportarCompendio("ordem-paranormal.poderes");
game.ordem.exportarTodosCompendios();               // baixa ordem-conteudo.json
game.ordem.importarParaCompendios(arrayDeJsons);    // roteia por tipo

// Rituais e progressão
game.ordem.conjurarRitual(actor, itemRitual);
game.ordem.subirNex(actor);
game.ordem.voltarNex(actor, indexHistorico);
```

---

## Estrutura de arquivos (desenvolvimento)

| Arquivo / Pasta | Função |
| --- | --- |
| `system.json` | Manifesto do sistema (id, versão, compatibilidade, compêndios) |
| `template.json` | Schema de Actor (`agente`, `criatura`) e de todos os tipos de Item |
| `module.js` | Entry point: config `ORDEM`, motor de dados, mecânicas, hooks e API |
| `regras.js` | Modo de regras (Padrão ↔ SaH): `MODOS`, `SAH_CONFIG`, helpers |
| `condicoes.js` | Catálogo oficial das 38 condições com efeitos automáticos |
| `sheets/AgentSheet.js` | Ficha completa do Agente |
| `sheets/CriaturaSheet.js` | Ficha de Criatura / NPC (statblock) |
| `sheets/ItemSheet.js` | Ficha genérica de Item (modificadores, trilhas, aprimoramentos) |
| `templates/` | Templates Handlebars das fichas, diálogos e cards de chat |
| `lang/pt-BR.json` | Todas as strings em português brasileiro |
| `styles/ordem-paranormal.css` | Tema visual (noir + horror) |
| `packs/` | Compêndios do sistema (criados pelo Foundry no 1º carregamento) |

### Tipos de documento

**Atores:** `agente` (PC) e `criatura` (ameaça/NPC).
**Itens:** `arma`, `protecao`, `ritual`, `poder`, `origem`, `trilha`, `equipamento`, `condicao`.

> Sistema não oficial, feito pela comunidade. *Ordem Paranormal RPG* é propriedade da Jambô Editora / Cellbit.
