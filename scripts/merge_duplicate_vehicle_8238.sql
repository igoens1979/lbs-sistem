BEGIN;

DO $$
DECLARE
  canonical_id text := '030c5133-0631-453b-a615-0991785cd90f';
  duplicate_id text := 'VEH-XVDH';
  moved_surat_jalan integer;
  moved_bank_tx integer;
  deleted_vehicles integer;
BEGIN
  IF canonical_id = duplicate_id THEN
    RAISE EXCEPTION 'ID armada utama dan duplikat tidak boleh sama';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.vehicles
    WHERE id = canonical_id AND upper(trim(plate)) = 'DD 8238 UF'
  ) THEN
    RAISE EXCEPTION 'Armada utama % tidak ditemukan atau platnya tidak cocok', canonical_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.vehicles
    WHERE id = duplicate_id AND upper(trim(plate)) = 'DD 8238 UF'
  ) THEN
    RAISE EXCEPTION 'Armada duplikat % tidak ditemukan atau platnya tidak cocok', duplicate_id;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint AS con
    JOIN pg_class AS source_table ON source_table.oid = con.conrelid
    JOIN pg_namespace AS source_schema ON source_schema.oid = source_table.relnamespace
    JOIN pg_class AS target_table ON target_table.oid = con.confrelid
    JOIN pg_namespace AS target_schema ON target_schema.oid = target_table.relnamespace
    WHERE con.contype = 'f'
      AND target_schema.nspname = 'public'
      AND target_table.relname = 'vehicles'
      AND NOT (
        source_schema.nspname = 'public'
        AND source_table.relname = 'surat_jalan'
        AND cardinality(con.conkey) = 1
        AND con.conkey = ARRAY[
          (SELECT attnum FROM pg_attribute
           WHERE attrelid = source_table.oid AND attname = 'vehicle_id' AND NOT attisdropped)
        ]::smallint[]
        AND con.confkey = ARRAY[
          (SELECT attnum FROM pg_attribute
           WHERE attrelid = target_table.oid AND attname = 'id' AND NOT attisdropped)
        ]::smallint[]
      )
  ) THEN
    RAISE EXCEPTION 'Ada foreign key lain yang mengacu ke vehicles. Tidak ada data yang diubah; periksa relasi tersebut sebelum menggabungkan.';
  END IF;

  UPDATE public.surat_jalan
  SET vehicle_id = canonical_id
  WHERE vehicle_id = duplicate_id;
  GET DIAGNOSTICS moved_surat_jalan = ROW_COUNT;

  UPDATE public.bank_tx
  SET ref = canonical_id
  WHERE ref = duplicate_id;
  GET DIAGNOSTICS moved_bank_tx = ROW_COUNT;

  DELETE FROM public.vehicles
  WHERE id = duplicate_id;
  GET DIAGNOSTICS deleted_vehicles = ROW_COUNT;

  IF deleted_vehicles <> 1 THEN
    RAISE EXCEPTION 'Penghapusan armada duplikat tidak menghasilkan tepat satu baris';
  END IF;

  IF EXISTS (SELECT 1 FROM public.surat_jalan WHERE vehicle_id = duplicate_id)
     OR EXISTS (SELECT 1 FROM public.bank_tx WHERE ref = duplicate_id) THEN
    RAISE EXCEPTION 'Masih ada referensi ke ID armada duplikat; membatalkan transaksi';
  END IF;

  RAISE NOTICE 'Selesai: % Surat Jalan dan % referensi transaksi dipindahkan ke armada utama; 1 record duplikat dihapus.',
    moved_surat_jalan, moved_bank_tx;
END
$$;

COMMIT;
