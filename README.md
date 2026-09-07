# PrintForge Mobile

Aplicativo web/Android offline-first para calcular custos e preços de impressão 3D. O PrintForge usa um núcleo financeiro determinístico, catálogo local de materiais e impressoras e histórico com snapshots completos.

## Estado atual

| Área | Implementação |
|---|---|
| Núcleo financeiro | `bigint` em centavos, arredondamento determinístico, margem sobre preço de venda |
| Entrada | Peso em gramas ou volume em cm³, convertido pela densidade do material |
| Navegação | Botão voltar do Android trata formulários, pilha de abas e saída |
| Resiliência | `ErrorBoundary` na raiz; falha de gravação é reportada, não engolida |
| Persistência | `localStorage` com validação de schema, espelhado em `SharedPreferences` no Android |
| Histórico | Teto de 500 registros, cada um com snapshot completo do que foi orçado |
| Backup | Exportar e importar JSON, com validação e mensagem própria por tipo de recusa |
| Aparência | Tema claro e escuro em 38 tokens, com escolha Automático/Claro/Escuro |
| Análise | Barra de composição do custo, destacando a fatia dominante |
| Nativo | 6 plugins Capacitor: app, preferences, filesystem, share, splash-screen, status-bar |
| Testes | 123 no total, 28 montando componentes com Testing Library |

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
│   └── native/          # hooks de Capacitor
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

## Checklist de publicação

Antes do envio à Google Play, ainda devem ser preenchidos os dados da conta de desenvolvedor, verificação de e-mail e telefone, ficha do app, screenshots, classificação etária, Data Safety, contato real da política de privacidade e assinatura segura do AAB. O teste em dispositivo Android deve cobrir teclado numérico, rotação, telas pequenas, persistência após encerramento, navegação, botão voltar, modo escuro e ausência de internet.
