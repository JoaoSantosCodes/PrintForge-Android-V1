-- Backup na nuvem do PrintForge.
--
-- Um bucket privado, um prefixo por usuario, e quatro politicas que amarram o prefixo
-- ao dono da sessao.
--
-- Por que isto e a peca critica: a chave anonima do projeto vai dentro do APK. Ela e
-- publica por definicao — qualquer pessoa extrai do pacote com um descompactador. O que
-- separa os dados de um usuario dos de outro nao e o segredo da chave, e sim estas
-- politicas. Sem elas o app funciona exatamente igual, e vaza tudo.

insert into storage.buckets (id, name, public)
values ('backups', 'backups', false)
on conflict (id) do nothing;

-- storage.foldername(name) devolve os segmentos do caminho. O primeiro e o id do dono,
-- porque e assim que `cloudPath()` monta o caminho no aplicativo. Os dois lados precisam
-- concordar: mudar um sem o outro desliga a protecao sem quebrar nada visivelmente.

drop policy if exists "backup proprio: leitura" on storage.objects;
create policy "backup proprio: leitura"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'backups'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "backup proprio: escrita" on storage.objects;
create policy "backup proprio: escrita"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'backups'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- Enviar de novo sobrescreve o backup anterior: e um por conta, o ultimo vence.
drop policy if exists "backup proprio: substituicao" on storage.objects;
create policy "backup proprio: substituicao"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'backups'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'backups'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- Apagar precisa existir para o usuario poder remover a copia da nuvem sem depender de
-- suporte. Uma politica de privacidade que promete exclusao precisa de um caminho real.
drop policy if exists "backup proprio: exclusao" on storage.objects;
create policy "backup proprio: exclusao"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'backups'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
