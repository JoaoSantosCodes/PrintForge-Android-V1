# Login com o Google

O código está pronto. O que falta é configuração em três painéis, e **só o dono das
contas consegue fazer**. Enquanto o `VITE_GOOGLE_WEB_CLIENT_ID` estiver vazio,
`cloudConfigured()` devolve falso e a seção de nuvem some da tela por inteiro — o
aplicativo continua funcionando, sem botão que falha ao ser tocado.

## Por que este caminho, e não o óbvio

`supabase.auth.signInWithOAuth({ provider: 'google' })` abriria a página de contas do
Google **dentro da WebView do aplicativo**. O Google recusa isso desde 24 de julho de
2023: a política *"use secure browsers"* cita `android.webkit.WebView` pelo nome, que é
exatamente a WebView do Capacitor. O usuário veria `disallowed_useragent` e nada mais.

O caminho que funciona é o Credential Manager do sistema: ele devolve um **ID token** ao
aplicativo, que o troca por sessão com `signInWithIdToken`. Nenhum redirecionamento,
nenhum deep link, nenhum esquema de URL para registrar.

---

## 1. Google Cloud — dois client IDs

Em <https://console.cloud.google.com> → APIs e Serviços → Credenciais.

São **dois**, e os dois são necessários:

| Tipo | Para que serve | Onde vai |
|---|---|---|
| **Aplicativo da Web** | é o que o app envia ao Google e ao Supabase | `VITE_GOOGLE_WEB_CLIENT_ID` e o painel do Supabase |
| **Android** | autoriza *este* aplicativo, por pacote + certificado | em lugar nenhum do código; só existir já basta |

O client ID do Android pede:

- **Nome do pacote:** `com.printforge.app`
- **Impressão digital SHA-1:** ver abaixo, e é onde quase todo mundo erra

> A confusão é comum: o client ID usado no código é o **Web**, não o Android. O do
> Android não aparece em lugar nenhum do aplicativo — ele existe para o Google reconhecer
> a assinatura do pacote.

## 2. O SHA-1 — a parte que quebra em silêncio

**Registre as duas impressões digitais, não uma.**

O PrintForge usa Play App Signing: você envia o AAB assinado com a sua chave de *upload*,
e o **Google reassina o pacote com outra chave** antes de entregá-lo. Ou seja, o
certificado que os 12 testadores têm no aparelho **não é o seu**.

Registrar só o da chave de upload produz o pior tipo de falha: funciona perfeitamente na
sua máquina e falha para todos os testadores, com um erro que não explica nada
(`ApiException: 10`, `DEVELOPER_ERROR`). O aplicativo traduz esse caso para *"Este
aplicativo não está autorizado a usar o login do Google. Avise o desenvolvedor"*
justamente para você reconhecer o sintoma quando ele for relatado.

**A que importa para quem instala pela Play Store:**

> Play Console → o app → Configuração → **Integridade do app** → aba *Assinatura de apps*
> → **Certificado da chave de assinatura do app** → copie o SHA-1.

**A da chave de upload**, para os builds que você instala direto (`assembleDebug`,
`installRelease`), está na mesma tela como *Certificado da chave de upload* — ou pelo
keystore:

```bash
keytool -list -v -keystore android/printforge.keystore -alias <alias>
```

Adicione **as duas** ao client ID de Android. E também a do certificado de depuração, se
for testar com `assembleDebug`:

```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey \
  -storepass android -keypass android
```

## 3. Supabase — ligar o provedor

Painel → Authentication → Providers → **Google**:

- Ligar
- **Client ID:** o mesmo client ID **Web** do passo 1
- **Client Secret:** o secret do client Web
- *Skip nonce check:* **deixe desligado.** O aplicativo envia o nonce corretamente — o
  valor cru vai para o Supabase e o SHA-256 dele em hexadecimal vai para o Google, o que
  `src/core/nonce.ts` garante devolvendo os dois juntos. Desligar a verificação abriria a
  porta para reapresentação de token sem necessidade.

Com o provedor ligado, **a confirmação por e-mail deixa de ser necessária**: quem confirma
o endereço é o Google. Era esse o bloqueio que mantinha a nuvem fora das compilações de
produção, e é por isso que o SMTP próprio saiu do roadmap.

## 4. A variável de ambiente

No `.env` desta máquina (não versionado):

```
VITE_GOOGLE_WEB_CLIENT_ID=000000000000-xxxxxxxxxxxxxxxx.apps.googleusercontent.com
```

O `.env.production` mantém a variável **vazia** e versionada, como as duas do Supabase.
Isso é deliberado: a nuvem só entra numa compilação de produção quando alguém apagar
aquele arquivo, e não por esquecimento. Para a versão web na Vercel, a mesma variável
precisa ser cadastrada lá.

## 5. Conferir que funcionou

```bash
# a nuvem so aparece com as tres variaveis preenchidas
grep -c "supabase" dist/assets/*.js     # 0 quando desligada
```

No aparelho, o percurso: Ajustes → *Entrar ou criar conta* → **Continuar com o Google** →
a folha de contas do sistema abre → escolher a conta → a tela mostra o e-mail conectado.

Fechar a folha sem escolher **não** deve mostrar aviso de erro nenhum: cancelar é uma
decisão, não uma falha, e `core/googleError.ts` trata isso explicitamente.

---

## Decisões registradas

**Só o Google.** GitHub foi considerado e descartado: não tem SDK nativo, então exigiria
Custom Tabs mais retorno por deep link — `intent-filter`, App Links, `detectSessionInUrl`
—, um mecanismo inteiro que o aplicativo não tem. E o público são oficinas de impressão
3D, não desenvolvedores.

**O e-mail e senha saíram**, em vez de conviverem com o Google. Mantê-los deixaria de pé
a exigência de SMTP próprio para recuperação de senha, que era justamente o que se queria
eliminar. Quem não tiver conta Google continua com o backup em arquivo, que nunca exigiu
conta nem internet.

**Os outros provedores do plugin estão desligados** em `capacitor.config.ts`. O bloco do
Apple arrasta `androidx.browser:1.9.0`, que exige AGP 8.9.1 contra o 8.7.2 deste projeto;
e o do Facebook embarcaria o SDK de login do Facebook aqui dentro. Ver também o
`resolutionStrategy` em `android/build.gradle`, que fixa `androidx.browser` na 1.8.0 pelo
mesmo motivo — e que pode sair quando o AGP subir.
