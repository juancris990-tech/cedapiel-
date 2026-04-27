-- Ajustar validación de transición de estados para permitir cancelar desde 'en_atencion'

CREATE OR REPLACE FUNCTION public.fn_cita_transicion_valida()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.estado = OLD.estado THEN
    RETURN NEW; -- idempotente
  END IF;

  IF OLD.estado = 'agendada' AND NEW.estado IN ('confirmada','cancelada') THEN
    RETURN NEW;
  ELSIF OLD.estado = 'confirmada' AND NEW.estado IN ('en_atencion','cancelada','no_asiste') THEN
    RETURN NEW;
  ELSIF OLD.estado = 'en_atencion' AND NEW.estado IN ('finalizada','cancelada') THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION 'Transición inválida de % a % para cita %', OLD.estado, NEW.estado, NEW.id;
  END IF;
END;
$$;