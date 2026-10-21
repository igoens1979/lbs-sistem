ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS ownership text NOT NULL DEFAULT 'Milik Customer'
  CHECK (ownership IN ('Milik Sendiri', 'Milik Customer', 'Sewa'));

UPDATE public.vehicles
SET ownership = 'Milik Sendiri'
WHERE upper(trim(plate)) IN ('DD 8238 UF', 'DT CANTER DD 8238 UF');

INSERT INTO public.vehicles (
  id,
  plate,
  model,
  vehicle_type,
  ownership,
  capacity,
  status,
  driver_id,
  odometer,
  last_service_odometer,
  service_interval_km,
  last_service_date,
  service_note
)
SELECT
  gen_random_uuid(),
  equipment.name,
  equipment.name,
  'Excavator',
  'Milik Sendiri',
  0,
  'Aktif',
  NULL,
  0,
  0,
  500,
  NULL,
  'Interval pemeliharaan dicatat dalam jam kerja alat'
FROM (VALUES ('SUNY 215'), ('PC 100'), ('PC 200')) AS equipment(name)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.vehicles existing
  WHERE upper(trim(existing.plate)) = equipment.name
);
