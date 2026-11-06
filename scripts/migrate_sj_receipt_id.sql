-- Tambahkan kolom receipt_id ke tabel surat_jalan untuk pelacakan nota tunai (NT/...)
ALTER TABLE surat_jalan ADD COLUMN IF NOT EXISTS receipt_id TEXT;

-- Index untuk pencarian cepat surat jalan yang sudah dibayar tunai
CREATE INDEX IF NOT EXISTS idx_surat_jalan_receipt_id ON surat_jalan(receipt_id);
