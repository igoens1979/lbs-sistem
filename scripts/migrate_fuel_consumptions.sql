CREATE TABLE IF NOT EXISTS public.fuel_consumptions (
  id text PRIMARY KEY,
  consumption_date date NOT NULL,
  vehicle_id text NOT NULL REFERENCES public.vehicles(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  route text NOT NULL CHECK (length(trim(route)) > 0),
  trips integer NOT NULL CHECK (trips > 0),
  liter numeric(12, 2) NOT NULL CHECK (liter > 0),
  price_per_liter numeric(14, 2) NOT NULL CHECK (price_per_liter > 0),
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fuel_consumptions_date_vehicle_idx
  ON public.fuel_consumptions (consumption_date DESC, vehicle_id);

GRANT SELECT, INSERT ON public.fuel_consumptions TO anon, authenticated;
