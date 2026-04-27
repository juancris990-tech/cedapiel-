-- 1) DEFAULT en agendas.estado
ALTER TABLE agendas
  ALTER COLUMN estado SET DEFAULT 'agendada'::cita_estado_enum;

-- 2) Backfill nulos
UPDATE agendas
SET estado = 'agendada'
WHERE estado IS NULL;

-- 3) Trigger de transiciones válidas
CREATE OR REPLACE FUNCTION fn_cita_transicion_valida()
RETURNS trigger 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.estado = OLD.estado THEN
    RETURN NEW; -- idempotente
  END IF;

  IF OLD.estado = 'agendada' AND NEW.estado IN ('confirmada','cancelada') THEN
    RETURN NEW;
  ELSIF OLD.estado = 'confirmada' AND NEW.estado IN ('en_atencion','cancelada','no_asiste') THEN
    RETURN NEW;
  ELSIF OLD.estado = 'en_atencion' AND NEW.estado IN ('finalizada') THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION 'Transición inválida de % a % para cita %', OLD.estado, NEW.estado, NEW.id;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_cita_transicion_valida ON agendas;
CREATE TRIGGER trg_cita_transicion_valida
BEFORE UPDATE ON agendas
FOR EACH ROW
WHEN (OLD.estado IS DISTINCT FROM NEW.estado)
EXECUTE FUNCTION fn_cita_transicion_valida();

-- 4) Agregar columna id_cita a ventas si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'ventas'
    AND column_name = 'id_cita'
  ) THEN
    ALTER TABLE ventas ADD COLUMN id_cita BIGINT;
    ALTER TABLE ventas ADD CONSTRAINT fk_ventas_cita FOREIGN KEY (id_cita) REFERENCES agendas(id);
  END IF;
END $$;

-- 5) Idempotencia de ventas por cita
CREATE UNIQUE INDEX IF NOT EXISTS ux_ventas_id_cita ON ventas(id_cita) WHERE id_cita IS NOT NULL;