-- Jalankan di SQL Editor Supabase
alter table public.surat_jalan enable row level security;
alter table public.bank_tx enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_sj enable row level security;
alter table public.invoice_revisions enable row level security;
alter table public.payments enable row level security;

drop policy if exists "anon all surat_jalan" on public.surat_jalan;
create policy "anon all surat_jalan" on public.surat_jalan for all to anon using (true) with check (true);

drop policy if exists "anon all bank_tx" on public.bank_tx;
create policy "anon all bank_tx" on public.bank_tx for all to anon using (true) with check (true);

drop policy if exists "anon all invoices" on public.invoices;
create policy "anon all invoices" on public.invoices for all to anon using (true) with check (true);

drop policy if exists "anon all invoice_sj" on public.invoice_sj;
create policy "anon all invoice_sj" on public.invoice_sj for all to anon using (true) with check (true);

drop policy if exists "anon all invoice_revisions" on public.invoice_revisions;
create policy "anon all invoice_revisions" on public.invoice_revisions for all to anon using (true) with check (true);

drop policy if exists "anon all payments" on public.payments;
create policy "anon all payments" on public.payments for all to anon using (true) with check (true);
