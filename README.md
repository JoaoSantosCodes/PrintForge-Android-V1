# PrintForge Mobile

Aplicativo web/Android offline-first para calcular custos e preços de impressão 3D. O PrintForge usa um núcleo financeiro determinístico, catálogo local de materiais e impressoras e histórico com snapshots completos.

## Telas

| | |
|---|---|
| ![Tela de cálculo, com preço sugerido e parâmetros da peça](docs/screenshots/calculadora.png) | ![Composição do custo, com barra proporcional e a fatia dominante em destaque](docs/screenshots/composicao.png) |
| **Cálculo** — preço e lucro no topo, parâmetros abaixo. | **Composição** — de que o custo é feito, e o que mais pesa. |
| ![Histórico de orçamentos com custo, venda e margem](docs/screenshots/historico.png) | ![Configurações com seleção de tema e backup](docs/screenshots/ajustes.png) |
| **Histórico** — cada registro guarda um snapshot do que foi orçado. | **Ajustes** — parâmetros padrão, tema e backup. |

Capturas de emulador Android API 36, com o APK de release. As imagens em tamanho de loja ficam em `store-assets/`, fora do controle de versão.

## Estado atual

| Área | Implementação |
|---|---|
| Núcleo financeiro | `bigint` em centavos, arredondamento determinístico, margem sobre preço de venda |
| Entrada | Peso em gramas ou volume em cm³, convertido pela densidade do material |
| Navegação | Botão voltar do Android e voltar do navegador, pela mesma decisão pura |
| Resiliência | `ErrorBoundary` na raiz; falha de gravação é reportada, não engolida |
| Persistência | `localStorage` com validação de schema, espelhado em `SharedPreferences` no Android |
| Histórico | Teto de 500 registros, cada um com snapshot completo do que foi orçado |
| Backup | Exportar e importar JSON, com validação e mensagem própria por tipo de recusa |
| Aparência | Tema claro e escuro em 38 tokens, com escolha Automático/Claro/Escuro |
| Barra de status | Aparência declarada em `values/` e `values-night/`, e reaplicada pelo tema escolhido |
| Análise | Barra de composição do custo, destacando a fatia dominante |
| Nativo | 6 plugins Capacitor: app, preferences, filesystem, share, splash-screen, status-bar |
| Testes | 143 no total, 37 montando componentes com Testing Library |
| Verificação | APK de release percorrido em emulador Android API 36 |

## Arquitetura

```text
src/
├── core/            # puro, sem React
│   ├── pricing.ts       # fórmulas em bigint
│   ├── money.ts         # centavos e formatação
│   ├── input.ts         # máscaras decimal e inteira
│   ├── volume.ts        # conversão volume ⇄ massa
│   ├── composition.ts   # repartição do custo
│   ├── navigation.ts    # decisão do botão voltar
│   ├── history.ts       # teto do histórico
│   ├── theme.ts         # resolução de tema
│   ├── format.ts        # duração e data
│   └── types.ts
├── application/     # casos de uso
│   ├── calculateQuote.ts
│   ├── backup.ts
│   ├── saveMaterial.ts
│   └── savePrinter.ts
├── infrastructure/
│   ├── storage/         # repositórios e espelho nativo
│   └── native/          # hooks de Capacitor e ajuste da barra de status
├── features/        # uma tela por arquivo
├── components/      # primitivas e campos
├── App.tsx
├── main.tsx
└── styles.css
```

A interface `StorageRepository<T>` mantém a persistência desacoplada do domínio. O `localStorage` segue como cópia de trabalho síncrona — os inicializadores de `useState` precisam de leitura imediata — e cada gravação é espelhada em `SharedPreferences`. No boot, `restoreMissing` repõe apenas as chaves que sumiram do WebView: o espelho é rede de segurança, nunca fonte da verdade.

## Dados persistidos

| Chave | Conteúdo |
|---|---|
| `printforge.settings` | Energia, mão de obra, embalagem e margem padrão |
| `printforge.materials` | Catálogo de materiais |
| `printforge.printers` | Catálogo de impressoras |
| `printforge.calculations` | Histórico, cada item com snapshot de input, material, impressora e resultado |
| `printforge.theme` | Preferência de tema deste aparelho — fora do backup de propósito |

## Desenvolvimento web

```bash
npm ci
npm run dev
```

Validação local:

```bash
npm run check   # tsc -b --noEmit
npm run test    # vitest
npm run build   # tsc -b && vite build
```

> `npm run check` usa `tsc -b`, não `tsc --noEmit`. O `tsconfig.json` raiz é um arquivo-solução com project references, e `--noEmit` sozinho não verifica os projetos referenciados — reportaria sucesso sobre código quebrado.

## Android

A pasta `android/` já foi criada com Capacitor e sincronizada com a build web. Para abrir no Android Studio:

```bash
npm run android:open
```

Para sincronizar alterações futuras:

```bash
npm run android:sync
```

Para gerar um bundle de release, configure uma keystore própria no Android Studio e então execute:

```bash
npm run android:release
```

A assinatura final não deve usar uma chave descartável. O arquivo `.aab` deve ser gerado e protegido no ambiente de release do responsável pelo aplicativo.

## Verificação em aparelho

O APK de release — o mesmo artefato que vai à loja, não uma build de depuração — foi instalado em emulador Android API 36 e percorrido item a item.

| Verificado | Resultado |
|---|---|
| Botão voltar | Fecha o formulário, volta uma aba, volta ao início e só então encerra |
| Exportar backup | Folha nativa de compartilhamento, com o arquivo nomeado por data |
| Importar backup | Seletor do sistema, parâmetros e catálogo substituídos |
| Persistência | Dados e preferência de tema sobrevivem a encerrar e reabrir |
| Abertura | Sem quadro branco entre o lançador e a primeira tela |
| Campos de tempo | Vírgula digitada não zera o valor |
| Temas | Claro e escuro legíveis, com a barra de status acompanhando |

Três defeitos apareceram nessa primeira sessão e foram corrigidos: ícones brancos da barra de status sobre o tema claro, preço de referência exibido cem vezes maior, e percentuais da composição que podiam somar 101%. Nenhum deles era visível em jsdom.

**Sem verificação ainda:** aparelho físico (variação entre fabricantes, memória apertada, toque real), rotação de tela, e o desenho do teclado numérico — o emulador não exibiu o teclado do sistema de forma confiável, então o layout depende apenas do `inputMode` declarado no código.

## Checklist de publicação

Antes do envio à Google Play, ainda devem ser preenchidos os dados da conta de desenvolvedor, verificação de e-mail e telefone, ficha do app, classificação etária, Data Safety, contato real da política de privacidade e assinatura segura do AAB.

A política de privacidade é servida em `/privacy.html` a partir da versão web, e o mesmo texto aparece dentro do app. As capturas de tela para a ficha estão em `store-assets/` — telefone em 1080×1920, tablets de 7" e 10" — fora do controle de versão por conterem material de loja.
