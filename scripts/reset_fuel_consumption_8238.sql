BEGIN;

DO $$
DECLARE
  matching_vehicles integer;
  deleted_consumptions integer;
BEGIN
  SELECT COUNT(*)
  INTO matching_vehicles
  FROM public.vehicles
  WHERE upper(trim(plate)) = 'DD 8238 UF';

  IF matching_vehicles <> 1 THEN
    RAISE EXCEPTION
      'Reset dibatalkan: ditemukan % armada dengan plat DD 8238 UF; harus tepat satu.',
      matching_vehicles;
  END IF;

  DELETE FROM public.fuel_consumptions AS fc
  USING public.vehicles AS v
  WHERE fc.vehicle_id = v.id
    AND upper(trim(v.plate)) = 'DD 8238 UF';

  GET DIAGNOSTICS deleted_consumptions = ROW_COUNT;

  RAISE NOTICE
    'Reset selesai: % catatan konsumsi BBM DD 8238 UF dihapus. Surat Jalan dan ritase tidak diubah.',
    deleted_consumptions;
END
$$;

COMMIT;
