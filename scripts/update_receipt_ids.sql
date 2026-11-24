-- Update existing receipt_id to match Surat Jalan number suffix
-- Format: SJ/LBS/YYYY/MM/NNNN -> receipt_id = NNNN

UPDATE surat_jalan
SET receipt_id = RIGHT(no, 4)
WHERE receipt_id IS NULL
  AND no LIKE 'SJ/LBS/%';

-- Verification: show the update results
SELECT 
  no AS "Surat Jalan No",
  receipt_id AS "Receipt ID",
  CASE 
    WHEN RIGHT(no, 4) = receipt_id THEN '✓ Updated'
    WHEN receipt_id IS NULL THEN '✗ Not Updated'
    ELSE '✗ Mismatch'
  END AS Status
FROM surat_jalan
WHERE receipt_id IS NOT NULL OR no LIKE 'SJ/LBS/%'
ORDER BY no DESC;