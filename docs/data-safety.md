# Data Safety da Play Console

Respostas derivadas do código, não de memória. Cada linha aponta onde conferir.

O formulário fica em **Play Console → Política → Segurança dos dados**. Ele é uma
declaração formal: divergir do que o app faz é motivo de remoção, e o Google compara com
o comportamento observado.

## O ponto que mais confunde

O formulário pergunta se o app **coleta** e se **compartilha** dados. Os dois têm
definição própria do Google:

- **Coletar** é transmitir dados para fora do dispositivo. Guardar só no aparelho **não é
  coleta**.
- **Compartilhar** é transferir para um terceiro. Um servidor que o desenvolvedor controla
  **não é compartilhamento**.

Por isso quase tudo aqui é "coleta sim, compartilhamento não" — e era "coleta não" antes
da cópia na nuvem existir.

## Declarações

| Tipo de dado | Coletado | Compartilhado | Obrigatório | Finalidade | Onde conferir |
|---|---|---|---|---|---|
| Endereço de e-mail | Sim | Não | Não | Autenticação da conta | `cloudBackupStore.ts`, `signUp` |
| Senha | Sim | Não | Não | Autenticação da conta | idem — guardada em formato irreversível pelo provedor |
| Fotos | Sim | Não | Não | Funcionalidade do app | `photoFile.ts`, enviadas em `uploadBackup` |
| Outros dados gerados pelo usuário | Sim | Não | Não | Funcionalidade do app | catálogo, histórico e estoque no `backup.json` |

**Nenhum** dos itens é obrigatório: o app funciona por completo sem conta, e a seção de
nuvem não existe em compilações sem credenciais (`cloudConfigured()` em `supabase.ts`).

### O que NÃO é coletado

Não declarar por engano: não há localização, contatos, agenda, identificadores de
publicidade, histórico de navegação, dados financeiros, nem informação de saúde. Não há
analytics nem SDK de rastreamento — vale conferir em `package.json` antes de cada envio,
já que uma dependência nova pode trazer telemetria embutida.

A foto buscada por endereço de internet (`photoFromUrl`) **não** é coleta: o app faz uma
requisição de saída e recebe uma imagem, sem enviar dado do usuário. O servidor da imagem
registra o IP, o que a política de privacidade descreve, mas isso não é o app coletando.

Os links de recompra e de modelo também **não** são coleta, e nem sequer são requisição do
app: `target="_blank"` entrega o endereço ao navegador do sistema, e o PrintForge não
busca nada de lá. Quem visita é o navegador, com o próprio histórico e os próprios cookies.

## As fontes deixaram de ser uma requisição de saída

Até o versionCode 21 a folha de estilo abria com um `@import` do Google Fonts. Eram quatro
requisições — uma ao `fonts.googleapis.com` e três ao `fonts.gstatic.com` — disparadas na
abertura, **sem ação nenhuma do usuário**, cada uma entregando o IP do aparelho ao Google.

Isso contradizia as duas telas de política de privacidade, que afirmavam ser a foto por
endereço a única exceção ao funcionamento offline. E é exatamente o tipo de divergência
que este documento avisa, logo na abertura, ser motivo de remoção.

A partir do versionCode 22 as fontes vão dentro do pacote e a contagem é zero. Verificável
sem abrir o Play Console:

```
grep -c fonts.googleapis.com dist/assets/*.css   # deve dar 0
ls dist/fonts/                                   # deve listar 3 arquivos .woff2
```

Vale repetir a checagem antes de cada envio, pela mesma razão que se confere o
`package.json`: uma folha de estilo nova pode reintroduzir um `@import` sem que ninguém
perceba.

## Práticas de segurança

| Pergunta do formulário | Resposta | Por quê |
|---|---|---|
| Dados criptografados em trânsito? | **Sim** | Todo tráfego com o Supabase é HTTPS |
| Existe forma de solicitar exclusão? | **Sim** | Botão "Apagar a cópia da nuvem" na tela de configurações, mais o contato da política |
| Dados são excluídos ao desinstalar? | Os locais, sim | A cópia na nuvem persiste até ser apagada — é o objetivo dela |

## Antes de enviar com a nuvem ligada

1. **Religar a confirmação por e-mail** e configurar SMTP próprio. Sem isso, qualquer
   pessoa cria conta com o e-mail de outra — e declarar "autenticação" no formulário
   enquanto a autenticação não verifica o endereço é uma declaração que não se sustenta.
2. Publicar a política de privacidade atualizada na URL informada à Play Console
   (`/privacy.html` no domínio da versão web).
3. Conferir se a versão web na Vercel tem as variáveis de ambiente, ou a seção de nuvem
   some lá — o que é aceitável, mas precisa ser decisão e não descuido.
