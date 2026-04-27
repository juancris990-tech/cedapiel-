-- Corregir funciones sin search_path configurado

CREATE OR REPLACE FUNCTION public.generar_codigo_tarjeta()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_codigo text;
  v_existe boolean;
BEGIN
  LOOP
    v_codigo := 'GC-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::text, 4, '0');
    SELECT EXISTS(SELECT 1 FROM public.tarjetas_regalo WHERE codigo_tarjeta = v_codigo) INTO v_existe;
    EXIT WHEN NOT v_existe;
  END LOOP;
  RETURN v_codigo;
END;
$$;

CREATE OR REPLACE FUNCTION public.actualizar_updated_at_tarjetas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;