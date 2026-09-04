# PrintForge Mobile

Aplicativo web/Android offline-first para calcular custos e preços de impressão 3D. O PrintForge usa um núcleo financeiro determinístico, catálogo local de materiais e impressoras e histórico com snapshots completos.

## GATE 3 implementado

| Área | Status | Implementação |
|---|---:|---|
| Core financeiro | Concluído | `bigint` em centavos, validações e arredondamento determinístico |
| Hardening | Concluído | Testes de margens, entradas negativas, custos, arredondamentos e tipos |
| Persistência | Concluído | Repositórios locais com validação de schema, fallback e recuperação de JSON corrompido |
| Migração | Concluído | Configuração legada `printforge-values` migrada para `printforge.settings` |
| Dashboard | Concluído | Último orçamento, contagem de materiais/impressoras e histórico |
| Compartilhamento | Concluído | Web Share API no Android; clipboard como fallback no navegador |
| Privacidade | Concluído | Política dentro do app e em `public/privacy.html` |
| Identidade | Concluído | Ícone 512×512, manifesto instalável e nome curto `PrintForge 3D` |
| Android nativo | Concluído | Plataforma Capacitor gerada e sincronizada com a build web |

## Arquitetura

```text
src/
├── core/
│   ├── pricing.ts
│   ├── money.ts
│   └── types.ts
├── application/
│   ├── calculateQuote.ts
│   ├── saveMaterial.ts
│   └── savePrinter.ts
├── infrastructure/storage/
│   ├── Storage.ts
│   └── LocalStorageRepository.ts
├── components/Money.tsx
├── App.tsx
├── main.tsx
└── styles.css
```

A interface `StorageRepository<T>` mantém a persistência desacoplada do domínio. O armazenamento atual usa `localStorage`; a próxima evolução pode trocar sua implementação por Capacitor Preferences ou SQLite sem alterar `core/` e `application/`.

## Dados persistidos

| Chave | Conteúdo |
|---|---|
| `printforge.settings` | Energia, mão de obra, embalagem e margem padrão |
| `printforge.materials` | Catálogo de materiais |
| `printforge.printers` | Catálogo de impressoras |
| `printforge.calculations` | Histórico, cada item com snapshot de input, material, impressora e resultado |

## Desenvolvimento web

```bash
npm ci
npm run dev
```

Validação local:

```bash
npm run check
npm run test
npm run build
```

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
