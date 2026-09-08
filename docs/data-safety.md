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
