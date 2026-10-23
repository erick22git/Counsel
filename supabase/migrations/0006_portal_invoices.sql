-- El cliente del portal puede ver ítems y pagos de SUS facturas ya enviadas/pagadas.
create policy invoice_items_portal on invoice_items for select to authenticated
  using (exists (select 1 from invoices i where i.id = invoice_id and i.client_id = current_client_id() and i.status in ('enviada','pagada')));
create policy payments_portal on payments for select to authenticated
  using (exists (select 1 from invoices i where i.id = invoice_id and i.client_id = current_client_id() and i.status in ('enviada','pagada')));
