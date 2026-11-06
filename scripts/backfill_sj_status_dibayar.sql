-- Backfill: ubah status surat jalan yang sudah dibayar tunai (terima receipt_id) menjadi "Dibayar"
UPDATE surat_jalan
SET status = 'Dibayar'
WHERE receipt_id IS NOT NULL
  AND status <> 'Dibayar'
  AND status <> 'Batal';
