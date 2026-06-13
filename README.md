# Ordem Paranormal RPG — Foundry VTT v12

Sistema brasileiro de RPG de investigação e terror paranormal para Foundry VTT v12.

---

## Instalação

1. Os arquivos já estão em `Data/systems/ordem-paranormal/`.
2. Reinicie o Foundry e crie/abra um Mundo usando o sistema **Ordem Paranormal RPG**.

---

## Mecânica de dados

- **Teste de atributo:** rola `Nd20` onde `N = valor do atributo` e mantém o **maior** resultado.
- **Teste de perícia:** rola pelos dados do atributo-base e soma o bônus de perícia.
- **Atributo 0:** rola `2d20kl` (menor resultado — desvantagem).
- **Condições e itens podem somar/remover dados do pool** (−Ⓞ do livro = −1d20).
- Compara o total à **CD** (dificuldade):

| CD | Nível |
| --- | --- |
| 10 | Fácil |
| 15 | Moderado |
| 18 | Difícil |
| 20+ | Paranormal |

### Graus de sucesso

| Resultado | Condição |
| --- | --- |
| Falha Crítica (Desastre) | 1 natural |
| Falha | total < CD |
| Sucesso | total ≥ CD |
| **Sucesso Extraordinário** | total ≥ CD + 10 |
| Acerto Crítico | 20 natural (ou margem de ameaça da arma) |

O grau é exibido no rodapé do card e retornado pela API (`resultado.grau`).

---

## Estrutura de arquivos

| Arquivo / Pasta | Função |
| --- | --- |
| `system.json` | Manifesto do sistema (id, versão, compatibilidade) |
| `template.json` | Schema de Actor (`agente`, `criatura`) e de todos os tipos de Item |
| `module.js` | Entry point: config `ORDEM`, motor de dados, todas as mecânicas e hooks |
| `condicoes.js` | Catálogo oficial das 38 condições com efeitos automáticos |
| `sheets/AgentSheet.js` | Ficha completa do Agente |
| `sheets/CriaturaSheet.js` | Ficha de Criatura / NPC (ataques e habilidades estruturados) |
| `sheets/ItemSheet.js` | Ficha genérica de Item (modificadores, trilhas, aprimoramentos) |
| `templates/` | Templates Handlebars das fichas, diálogos e cards de chat |
| `lang/pt-BR.json` | Todas as strings em português brasileiro |
| `styles/ordem-paranormal.css` | Tema visual (noir + horror) |

---

## Tipos de documento

### Atores

| Tipo | Descrição |
| --- | --- |
| `agente` | Personagem jogador. PV/PE/SAN, NEX, classe, trilha, origem, afinidade, patente, prestígio, 28 perícias, condições, contadores de morte/loucura. |
| `criatura` | Ameaça paranormal. PV/PE, VD, elemento, resistências/imunidades/vulnerabilidades, ataques e habilidades estruturados, Presença Perturbadora e Enigma do Medo. |

### Itens

| Tipo | Descrição |
| --- | --- |
| `arma` | Dano, tipo, alcance, margem de ameaça, bônus de ataque, munição, categoria (I–IV) e modificadores. |
| `protecao` | Armadura/proteção com bônus de defesa e penalidade. |
| `ritual` | Círculo, elemento, custo em PE, execução/alcance/área/duração, resistência (perícia + DT automática) e **aprimoramentos estruturados** selecionáveis ao conjurar. |
| `poder` | Habilidade de classe ou paranormal: pré-requisitos (NEX/classe/elemento), custo em PE, usos por cena. |
| `origem` | Perícias treinadas (aplicadas automaticamente) e poder de origem. |
| `trilha` | Classe + **habilidades por marco de NEX** (10/40/65/99) com desbloqueio automático. |
| `equipamento` | Item geral com espaços de carga e categoria. |
| `condicao` | Condição com modificadores automáticos; use o **seletor de condições oficiais** (botão + na ficha). |

---

## Mecânicas implementadas

### Rolagem de teste (`rolarTeste`)

Diálogo com CD, modificador extra, dados extras, **circunstância** (favorável +1d20 / desfavorável −1d20) e habilidades de classe (Ataque Especial, Perito, Eclético). Penalidades de condições em dados são aplicadas automaticamente e indicadas no diálogo.

Em **ataques**, o diálogo inclui a seção *Situação* (Tabela 4.4):

- **Flanqueando** (+1d20, corpo a corpo) e **Posição elevada** (+1d20);
- **Cobertura do alvo** (+5 na CD);
- **Camuflagem do alvo**: rola 1d10 junto — 20% (parcial) ou 50% (total) de chance de falha automática.

### Condições oficiais (38)

Catálogo completo do Apêndice do livro: Abalado, Agarrado, Alquebrado, Apavorado, Asfixiado, Atordoado, Caído, Cego, Confuso, Debilitado, Desprevenido, Doente, Em Chamas, Enjoado, Enredado, Envenenado, Esmorecido, Exausto, Fascinado, Fatigado, Fraco, Frustrado, Imóvel, Inconsciente, Indefeso, Lento, Morrendo, Ofuscado, Paralisado, Pasmo, Petrificado, Sangrando, Surdo, Surpreendido, Vulnerável, Enlouquecendo, Insano e Morto.

- **Efeitos automáticos**: penalidades em dados (−Ⓞ/−ⓄⓄ), Defesa, custo de PE (Alquebrado), deslocamento (Lento = metade, Imóvel = 0) e Iniciativa.
- **Condições implicadas**: agarrado já inclui desprevenido + imóvel; exausto inclui debilitado + lento + vulnerável, etc.
- **Agravamento**: aplicar Abalado de novo vira Apavorado; Fraco → Debilitado; Fatigado → Exausto, etc.
- Aplicação pelo seletor na ficha (Inventário → Condições → +) ou por API.

### Morte e dano

- **Aplicar dano** (botão no card de dano, Mestre): aplica aos tokens selecionados com as regras automáticas.
- **0 PV** → condições *inconsciente* + *morrendo* aplicadas automaticamente (hook).
- **Morrendo**: ao iniciar 3 turnos morrendo na mesma cena, morre. Botões na ficha e lembrete automático no início do turno em combate.
- **Estabilizar**: outro personagem rola **Medicina (DT 20)**; sucesso encerra *morrendo*.
- **Cura de 1+ PV** encerra *morrendo* e *inconsciente* automaticamente.
- **Dano massivo**: dano ≥ metade dos PV totais anuncia o teste de **Fortitude (DT 15 + 2 a cada 10 de dano)**.

### Sanidade

- **SAN 0** → condição *enlouquecendo* automática.
- **Enlouquecendo**: 3 turnos na mesma cena = *insano* (NPC do Mestre).
- **Acalmar**: outro personagem rola **Diplomacia (DT 20)**.
- **Recuperar 1+ SAN** encerra *enlouquecendo*.
- Estados *perturbado* (SAN < metade) e *machucado* (PV < metade) exibidos na ficha.

### Manobras de combate (`rolarManobra`)

Agarrar, Derrubar, Desarmar, Empurrar, Quebrar e Atropelar — botões na aba Combate. Teste de **Luta oposto**: marque um alvo (tecla T) e a oposição é rolada automaticamente. O card descreve o efeito da manobra e o efeito extra ao vencer por 5+.

### Ações especiais de defesa (`acaoDefesa`)

Bloqueio (RD = bônus de Fortitude), Esquiva (+Reflexos na Defesa) e Contra-ataque — exigem o treinamento adequado; o card mostra os valores calculados.

### Poderes (`usarPoder`)

- Gasta PE (modificado por condições como Alquebrado), controla **usos por cena** e publica a descrição.
- **Pré-requisitos** (NEX, classe, elemento) validados ao adicionar o item — avisa, sem bloquear.
- Poderes paranormais têm elemento e marcador próprio.

### Trilhas (`usarHabilidadeTrilha`)

- Habilidades cadastradas por marco de NEX na ficha do item.
- Na ficha do agente: habilidades desbloqueadas têm botão de uso; bloqueadas aparecem com cadeado.
- **Modificadores com NEX mínimo**: na trilha, cada modificador pode definir o marco a partir do qual vale.
- Validação de classe ao adicionar.

### Origens (automático)

Ao adicionar uma origem, as perícias listadas (chaves ou nomes, separados por vírgula) recebem **treino +5** automaticamente e o poder de origem é anunciado no chat.

### Progressão de NEX (`subirNex` / `voltarNex`)

O modal de subida resolve as escolhas do marco:

- **Aumento de atributo** (+1, seletor);
- **Grau de treinamento**: perícia treinada → veterano (+10) → expert (+15);
- **Poder de classe**: escolha entre os itens `poder` do Mundo compatíveis (copiado para a ficha);
- **Habilidade de trilha**: mostra o que desbloqueia no marco;
- **Versatilidade** e **círculos de ritual** (Ocultista) informados.

`voltarNex` reverte tudo, inclusive os poderes adicionados pelas escolhas.

### Patentes e prestígio

- Tabela oficial: Recruta (0 PP), Operador (20), Agente Especial (50), Oficial de Operações (100), Agente de Elite (200).
- **Patente sugerida** pelos PP exibida como dica na ficha (promoção vale na próxima missão).
- Inventário mostra **uso vs limite por categoria** (I–IV) com alerta ao exceder.

### Elementos e afinidade

- Ciclo de opressão: **Morte > Sangue > Conhecimento > Energia > Morte** (Medo acima do ciclo).
- Criaturas têm campo de elemento; ao conjurar um ritual com um alvo marcado, o card indica **vantagem** (elemento opressor) ou **resistência** (mesmo elemento).
- **Afinidade** (NEX 50%+, seletor na ficha): rituais do elemento afinado dispensam componentes.

### Rituais — fluxo completo (`conjurarRitual`)

1. Diálogo com círculo/elemento/custo, execução, alcance, área, duração e **aprimoramentos** com checkbox (+PE);
2. Valida PE (com limite por rodada) e desconta o total;
3. **Custo do Paranormal**: Ocultismo vs DT 15 + PE gasto (Medo isento); falha causa dano mental (e perda permanente em falha grave) com botão de aplicar;
4. Card com **resistência** (perícia + DT de rituais do conjurador) e botão para o alvo rolar.

### Criaturas (ficha de Ameaça)

A ficha de Criatura usa o **mesmo layout e tema da ficha de Agente** (pentágono de atributos clicáveis, barras de PV/PE com setas, abas e botões) e segue o statblock oficial de Ameaças (Capítulo 7):

- **Cabeçalho**: VD, tipo (Criatura/Humano/Animal/Construto), tamanho (Minúsculo→Colossal), elemento e descritores.
- **Defesa**: campo fixo do statblock (ou 10 + AGI + Outros quando não informado).
- **Sentidos** (Percepção, Iniciativa) e **Resistências** (Fortitude, Reflexos, Vontade) como `NⓄ + bônus` **clicáveis** para rolar (`rolarTesteCriatura`).
- **Resistências & Danos** — botão **Editar** abre um **modal** com RD, Imunidades e Vulnerabilidades; a ficha mostra um resumo compacto. Tudo entra no **cálculo automático** ao aplicar dano:
  - **RD**: lista de `tipo de dano + valor` (ou "Todos").
  - **Imunidades**: tipos de dano + categorias de condição (Física/Mental/Medo/Paralisia/Fadiga/Sentidos/Especial). Dano imune é ignorado; condição imune não é aplicada (Origem Paranormal já torna a criatura imune a condições mentais e de medo).
  - **Vulnerabilidades**: tipos de dano — dobra o dano daquele tipo.
  - **Outras perícias**: lista de `perícia + NⓄ + bônus`, cada uma com botão de **rolar**.
- **Aplicação de dano com tipo**: o card de dano leva o tipo; ao "Aplicar aos selecionados", cada criatura calcula imunidade → vulnerabilidade (×2) → RD automaticamente e mostra a nota.
- **Ataques estruturados**: tipo de ação (Padrão/Movimento/Completa/Livre/Reação), alcance (corpo a corpo / à distância), multiplicador (×N ataques), `NⓄ+bônus`, dano, tipo e efeito; botão de dano (dobra dados no crítico).
- **Habilidades estruturadas** com custo de PE.
- **Presença Perturbadora** (Origem Paranormal): DT, dano mental e NEX de imunidade. O botão pede Vontade dos agentes não-imunes da cena (CD = DT) e posta o lembrete (falha = dano total, sucesso = metade).
- **Enigma do Medo**: editor para a condição de neutralização de criaturas de Medo.
- **Iniciativa** em combate usa o valor do statblock; a 0 PV a criatura é **derrotada** (sem morrendo/sanidade — imune por Origem Paranormal).
- **Exportar/Importar JSON** igual aos Agentes (botão "Exportar JSON" no título; importação aceita criaturas).

### Fórmulas em campos numéricos (`@status` + dados)

Qualquer campo numérico relevante aceita **fórmula**, não só inteiro. As referências a status da ficha **sempre usam o prefixo `@`** (ex.: `@FOR+5`, `1d6+@NEX`):

- **Atributos**: `@FOR`, `@AGI`, `@INT`, `@PRE`, `@VIG` (e nomes completos, ex.: `@forca`).
- **Exposição**: `@NEX` (%), `@NIVEL` (nível de exposição).
- **Recursos**: `@PV`/`@PVMAX`, `@PE`/`@PEMAX`, `@SAN`/`@SANMAX`.
- **Derivados**: `@DEFESA`, `@DTRITUAIS`, `@DTFORTITUDE`, `@DTREFLEXOS`, `@DTVONTADE`, `@DESLOCAMENTO`, `@PERODADA`, `@CARGA`/`@CARGAMAX`, `@VD`, `@PRESTIGIO`.
- **Bônus de perícia**: `@luta`, `@percepcao`… (ou `@pericia.luta`). Em criaturas: `@fortitude`, `@reflexos`, `@vontade`, `@percepcao`, `@iniciativa`.
- **Qualquer campo da ficha** pelo caminho cru no `system`: `@recursos.pv.max`, `@atributos.for`, `@saves.fortitude.bonus`.
- **Dados**: `1d6`, `2d8`. **Aritmética**: `+ - * / ( )` — ex.: `1d6+5+@FOR`, `@NEX/5`, `2*@VIG`.

Referências desconhecidas viram `0`. Tokens **sem `@`** não são interpretados (digite `@FOR`, não `FOR`).

Onde se aplica:

- **Modificadores de itens** (`valor`) — campo de texto. Em valores passivos da ficha (Defesa, PV máx., bônus de perícia…), os dados são resolvidos pela **média** (`NdX → N·(X+1)/2`), mantendo o número estável a cada render. Durante o cálculo dos modificadores, status derivados ainda não prontos resolvem para `0` — prefira referenciar atributos/`@NEX`.
- **Dano** de armas e ataques de criatura — resolvido ao rolar (ex.: `2d6+@FOR`).
- **Bônus de ataque** da arma, **bônus** dos ataques/perícias de criatura e **Modificador extra** dos diálogos de teste.

A avaliação é segura (apenas números e operadores após resolver as referências). Funções na API: `game.ordem.resolverTokensFormula(formula, actor)` e `game.ordem.avaliarFormulaPassiva(formula, actor)`.

### Pedir Teste (`abrirPedirTeste`)

Ferramenta do Mestre (barra esquerda): nome do teste, perícia, CD e tokens participantes. Cada jogador rola pelo botão do card, que atualiza em tempo real (sucessos/falhas).

- **Rolagem secreta**: opção que rola tudo imediatamente e sussurra os resultados só para o Mestre (testes passivos de Percepção etc.).

### Nova Cena (`novaCena`)

Botão do Mestre na barra esquerda: zera contadores de morrendo/enlouquecendo e usos por cena dos poderes; lembra que condições terminam no fim da cena.

### Exportar / Importar fichas (`exportarAgente` / `importarFichas`)

Compartilhe e versione fichas em JSON (incl. todos os itens embutidos).

- **Exportar**: botão **"Exportar JSON"** na barra de título da ficha do Agente. Gera `ficha-<nome>.json` com metadados (`_ordemFicha`, versão do sistema, data) e o ator completo.
- **Importar**: botão **"Importar Agente"** no topo da aba de Atores. Aceita:
  - um ou mais **arquivos** `.json` locais;
  - um **link do GitHub** — arquivo cru (`raw.githubusercontent.com`), link `/blob/` (convertido para raw), **pasta** (`/tree/...`, importa todos os `.json`) ou a **raiz do repositório** (vários agentes de uma vez);
  - opção de **agrupar** os importados na pasta "Agentes Importados".
- Formatos aceitos na importação: o envelope exportado pelo sistema, um objeto de ator cru (`type: "agente"`/`"criatura"`) ou um **array** de qualquer um deles. O `_id` é descartado para evitar colisões.

### Criador de Itens — assistente passo a passo (`abrirCriadorItem`)

Botão **"Criar Item"** no topo da aba de **Itens**. Fluxo guiado:

1. Escolha o **tipo** (arma, proteção, ritual, poder, equipamento, origem, trilha, condição) e o **nome**.
2. Preencha os campos do tipo — vários aceitam **fórmula** (`@status` + dados), com dica embutida: dano (`2d6+@FOR`), bônus de ataque, custo, etc.
3. O Item é criado no **diretório de Itens** do mundo e a ficha abre para ajustes finos (modificadores, etc.).

Depois, arraste o Item para um compêndio **Ordem Paranormal** para reutilizá-lo em qualquer mundo.

### Compêndios (`packs/`)

O sistema registra compêndios agrupados na pasta **Ordem Paranormal** (aba Compêndios): Poderes, Rituais, Armas, Proteções, Equipamentos, Origens, Trilhas, Condições (Itens) e Criaturas (Atores). Começam vazios — são o repositório de conteúdo reutilizável; popule arrastando itens/atores criados (ou importados via JSON). Veja `packs/README.md`.

### Interlúdio — recuperação entre cenas (`abrirInterludio`)

Botão na aba Combate da ficha. Ações oficiais de interlúdio:

- **Dormir**: recupera PV e PE = limite de PE por rodada × condição de descanso (Precária ×½ / Normal ×1 / Confortável ×2 / Luxuosa ×3) — aplicado automaticamente;
- **Relaxar**: o mesmo, para Sanidade;
- **Exercitar-se / Ler**: +1d6 em um teste físico/mental até o fim da missão (card informativo);
- **Revisar caso**: teste de perícia para receber uma pista complementar;
- **Manutenção**: conserta um item.

### Testes Estendidos / Cena de Investigação / Ajuda

- **Testes Estendidos**: complexidade (3/5/7 sucessos), variações, barras de progresso, histórico.
- **Investigação**: rodadas, pistas editáveis, Procurar (com **dica ao Mestre por grau de sucesso** — pista incompleta/básica/completa+complementar), Facilitar e Ajudar.
- **Ajuda**: rola perícia vs DT 10; bônus +1 (+1 por 10 acima) informado no chat.

### Carrossel de combate e Iniciativa

Faixa de turnos no topo da tela. Iniciativa: `(AGI)d20kh + bônus` com penalidades de condições (ex.: Surdo −2d20).

---

## Dados derivados calculados automaticamente

| Campo | Cálculo |
| --- | --- |
| `defesa.total` | `10 + AGI + proteções + modificadores − sobrecarga` (condições: Vulnerável −5, Desprevenido −5, Indefeso −10) |
| `deslocamentoTotal` | base + mods − sobrecarga; **Lento** = metade, **Imóvel** = 0 |
| `dtRituais` | `10 + nível de NEX + PRE + modificadores` |
| `dtFortitude / dtReflexos / dtVontade` | `10 + nível de NEX + VIG/AGI/PRE` |
| `peRodada` | `nível de NEX + modificadores` (mínimo 1) |
| `carga` | `FOR × 5` (2 se FOR 0) + modificadores |
| `PV / PE / SAN máximos` | Fórmula de classe + NEX + `bonusMax` + modificadores |
| `periciasCalc[key]` | treino + outros + modificadores − penalidade de carga |
| `estado` | `machucado`, `morrendo`, `perturbado`, `enlouquecendo` |
| `patenteInfo` | crédito + uso/limite de itens por categoria |
| `patenteSugerida` | patente pelos Pontos de Prestígio |
| `afinidadeAtiva` | NEX ≥ 50% e elemento escolhido |

---

## Sistema de modificadores

Itens `arma`, `protecao`, `equipamento`, `condicao`, `poder`, `origem` e `trilha` aplicam modificadores quando equipados/ativos.

**Alvos planos:** `pv.max`, `pe.max`, `san.max`, `defesa`, `deslocamento`, `peRodada`, `dtRituais`, `carga`, `custoPe`, `atributo.agi/for/int/pre/vig`, `pericia.<chave>`, `pericia.todas`

**Alvos em dados (−Ⓞ do livro):** `dados.todos`, `dados.ataque`, `dados.atributo.<atributo>`, `dados.pericia.<chave>`

Modificadores de **trilha** aceitam um campo NEX: só valem a partir daquele marco.

---

## API global (`game.ordem`)

```js
// Testes (retornam { roll, total, natural, cd, sucesso, critico, desastre, extraordinario, grau })
game.ordem.rolarTeste(actor, { periciaKey: "investigacao", cd: 18 });
game.ordem.rolarAtaque(actor, itemArma);
game.ordem.rolarDano(actor, itemArma, { critico: false });
game.ordem.rolarResistencia(actor, "fortitude");
game.ordem.rolarAjuda(actor, "luta");

// Condições oficiais
game.ordem.aplicarCondicao(actor, "abalado");
game.ordem.removerCondicao(actor, "abalado");
game.ordem.abrirSeletorCondicao(actor);

// Ferimentos, morte & sanidade
game.ordem.aplicarDano(actor, 12);          // dano massivo + morrendo automáticos
game.ordem.aplicarDanoMental(actor, 3);     // SAN 0 → enlouquecendo
game.ordem.curar(actor, 5);
game.ordem.recuperarSanidade(actor, 5);
game.ordem.marcarTurnoMorrendo(actor);      // 3 = morte
game.ordem.estabilizar(medico, alvo);       // Medicina DT 20
game.ordem.marcarTurnoEnlouquecendo(actor); // 3 = insano
game.ordem.acalmar(diplomata, alvo);        // Diplomacia DT 20

// Poderes, trilhas e combate avançado
game.ordem.usarPoder(actor, itemPoder);
game.ordem.usarHabilidadeTrilha(actor, itemTrilha, 0);
game.ordem.rolarManobra(actor, "agarrar");  // marque um alvo p/ oposição automática
game.ordem.acaoDefesa(actor, "bloqueio");   // bloqueio | esquiva | contraataque

// Criaturas
game.ordem.rolarTesteCriatura(criatura, "saves.fortitude"); // sentidos.*/saves.*/atributo:agi
game.ordem.rolarAtaqueCriatura(criatura, 0);
game.ordem.usarHabilidadeCriatura(criatura, 0);
game.ordem.presencaPerturbadora(criatura);

// Fórmulas (@status + dados)
game.ordem.avaliarFormulaPassiva("1d6+5+@FOR", actor); // inteiro determinístico
game.ordem.resolverTokensFormula("2d6+@FOR", actor);   // string p/ Roll

// Ferramentas de mesa (Mestre)
game.ordem.abrirPedirTeste();               // inclui rolagem secreta
game.ordem.abrirTesteEstendido();
game.ordem.abrirCenaInvestigacao();
game.ordem.novaCena();                      // zera usos/contadores por cena
game.ordem.abrirInterludio(actor);          // recuperação entre cenas

// Exportar / importar fichas (JSON local e GitHub)
game.ordem.exportarAgente(actor);           // baixa ficha-<nome>.json
game.ordem.importarFichas();                // diálogo: arquivo(s) ou link do GitHub

// Criação de conteúdo
game.ordem.abrirCriadorItem();              // assistente passo a passo (Item)
game.ordem.editarResistenciasDanos(criatura); // modal RD/imunidades/vulnerabilidades

// Rituais e progressão
game.ordem.conjurarRitual(actor, itemRitual);
game.ordem.subirNex(actor);
game.ordem.voltarNex(actor, indexHistorico);
```

---

## Perícias e atributos

As 28 perícias seguem a Ficha dos Agentes oficial. O Mestre pode autorizar combinações alternativas via seletor na ficha.

| Atributo | Perícias |
| --- | --- |
| Agilidade | Acrobacia, Crime, Furtividade, Iniciativa, Pilotagem, Pontaria, Reflexos |
| Força | Atletismo, Luta |
| Intelecto | Atualidades, Ciências, Investigação, Medicina, Ocultismo, Profissão, Sobrevivência, Tática, Tecnologia |
| Presença | Adestramento, Artes, Diplomacia, Enganação, Intimidação, Intuição, Percepção, Religião, Vontade |
| Vigor | Fortitude |
