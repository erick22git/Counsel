-- Bucket privado de documentos. Ruta obligatoria: {firm_id}/{case_id|general}/{uuid}-{nombre}
insert into storage.buckets (id, name, public, file_size_limit)
values ('documents', 'documents', false, 26214400)
on conflict (id) do nothing;

create policy documents_staff_select on storage.objects for select to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = public.current_firm_id()::text and public.is_staff());
create policy documents_staff_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = public.current_firm_id()::text and public.is_staff());
create policy documents_staff_update on storage.objects for update to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = public.current_firm_id()::text and public.is_staff());
create policy documents_staff_delete on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = public.current_firm_id()::text and public.is_staff());

-- Portal: el cliente puede descargar solo archivos de documentos que el despacho compartió con él
create policy documents_client_select on storage.objects for select to authenticated
  using (
    bucket_id = 'documents'
    and exists (
      select 1 from public.documents d
      join public.cases c on c.id = d.case_id
      where d.storage_path = storage.objects.name
        and d.shared_with_client and d.deleted_at is null
        and c.client_id = public.current_client_id()
    )
  );
