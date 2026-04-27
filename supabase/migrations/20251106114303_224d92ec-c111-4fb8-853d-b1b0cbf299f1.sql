-- Parte 1: Agregar valores al enum (debe ejecutarse primero)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid
    WHERE t.typname='cita_estado_enum' AND e.enumlabel='agendada'
  ) THEN
    ALTER TYPE cita_estado_enum ADD VALUE 'agendada';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid
    WHERE t.typname='cita_estado_enum' AND e.enumlabel='confirmada'
  ) THEN
    ALTER TYPE cita_estado_enum ADD VALUE 'confirmada';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid
    WHERE t.typname='cita_estado_enum' AND e.enumlabel='en_atencion'
  ) THEN
    ALTER TYPE cita_estado_enum ADD VALUE 'en_atencion';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid
    WHERE t.typname='cita_estado_enum' AND e.enumlabel='finalizada'
  ) THEN
    ALTER TYPE cita_estado_enum ADD VALUE 'finalizada';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid
    WHERE t.typname='cita_estado_enum' AND e.enumlabel='cancelada'
  ) THEN
    ALTER TYPE cita_estado_enum ADD VALUE 'cancelada';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid
    WHERE t.typname='cita_estado_enum' AND e.enumlabel='no_asiste'
  ) THEN
    ALTER TYPE cita_estado_enum ADD VALUE 'no_asiste';
  END IF;
END $$;