-- ============================================
-- MIGRACIÓN: MÓDULO AGENDA Y CITAS COMPLETO
-- ============================================

-- 1. Crear ENUM para estados de cita (solo si no existe)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cita_estado_enum') THEN
    CREATE TYPE public.cita_estado_enum AS ENUM (
      'agendada',
      'confirmada', 
      'presentado',
      'completada',
      'cancelada',
      'no_show'
    );
  END IF;
END $$;

-- 2. Convertir columna solo si aún no es del tipo enum
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'agendas' 
    AND column_name = 'estado' 
    AND udt_name != 'cita_estado_enum'
  ) THEN
    -- Eliminar constraint check y default
    ALTER TABLE public.agendas DROP CONSTRAINT IF EXISTS agendas_estado_check;
    ALTER TABLE public.agendas ALTER COLUMN estado DROP DEFAULT;
    
    -- Convertir tipo de columna
    ALTER TABLE public.agendas 
      ALTER COLUMN estado TYPE public.cita_estado_enum 
      USING CASE
        WHEN estado = 'pendiente' THEN 'agendada'::public.cita_estado_enum
        WHEN estado = 'en_atencion' THEN 'presentado'::public.cita_estado_enum
        WHEN estado = 'finalizada' THEN 'completada'::public.cita_estado_enum
        WHEN estado = 'no_asiste' THEN 'no_show'::public.cita_estado_enum
        WHEN estado = 'confirmada' THEN 'confirmada'::public.cita_estado_enum
        WHEN estado = 'cancelada' THEN 'cancelada'::public.cita_estado_enum
        ELSE 'agendada'::public.cita_estado_enum
      END;
      
    -- Establecer nuevo default
    ALTER TABLE public.agendas 
      ALTER COLUMN estado SET DEFAULT 'agendada'::public.cita_estado_enum;
  END IF;
END $$;

-- 3. Agregar campos de check-in/check-out y cancelación
ALTER TABLE public.agendas 
  ADD COLUMN IF NOT EXISTS check_in_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS check_out_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS motivo_cancelacion TEXT,
  ADD COLUMN IF NOT EXISTS cambiado_por UUID REFERENCES auth.users(id);

-- 4. Tabla de notas de clientes
CREATE TABLE IF NOT EXISTS public.notas_clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cliente BIGINT NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  nota TEXT NOT NULL,
  creado_por UUID NOT NULL REFERENCES auth.users(id),
  creado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Tabla de notas de citas
CREATE TABLE IF NOT EXISTS public.notas_citas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cita BIGINT NOT NULL REFERENCES public.agendas(id) ON DELETE CASCADE,
  nota TEXT NOT NULL,
  creado_por UUID NOT NULL REFERENCES auth.users(id),
  creado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Tabla de historial de estados (auditoría)
CREATE TABLE IF NOT EXISTS public.citas_historial_estado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cita BIGINT NOT NULL REFERENCES public.agendas(id) ON DELETE CASCADE,
  estado_anterior public.cita_estado_enum,
  estado_nuevo public.cita_estado_enum NOT NULL,
  motivo TEXT,
  cambiado_por UUID NOT NULL REFERENCES auth.users(id),
  cambiado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_agendas_fecha_estado ON public.agendas(fecha, estado);
CREATE INDEX IF NOT EXISTS idx_agendas_empleado_fecha ON public.agendas(id_empleado, fecha);
CREATE INDEX IF NOT EXISTS idx_agendas_sucursal_fecha ON public.agendas(id_sucursal, fecha);
CREATE INDEX IF NOT EXISTS idx_notas_clientes_lookup ON public.notas_clientes(id_cliente, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_notas_citas_lookup ON public.notas_citas(id_cita, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_historial_cita ON public.citas_historial_estado(id_cita, cambiado_en DESC);

-- 8. Trigger para auditar cambios de estado
CREATE OR REPLACE FUNCTION public.registrar_cambio_estado()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.estado IS DISTINCT FROM NEW.estado THEN
    INSERT INTO public.citas_historial_estado (
      id_cita,
      estado_anterior,
      estado_nuevo,
      motivo,
      cambiado_por,
      cambiado_en
    ) VALUES (
      NEW.id,
      OLD.estado,
      NEW.estado,
      NEW.motivo_cancelacion,
      NEW.cambiado_por,
      now()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_auditar_estado ON public.agendas;
CREATE TRIGGER trigger_auditar_estado
  AFTER UPDATE ON public.agendas
  FOR EACH ROW
  EXECUTE FUNCTION public.registrar_cambio_estado();

-- 9. Función para validar transiciones de estado
CREATE OR REPLACE FUNCTION public.validar_transicion_estado(
  estado_actual public.cita_estado_enum,
  estado_nuevo public.cita_estado_enum
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN CASE
    -- Desde agendada
    WHEN estado_actual = 'agendada' THEN 
      estado_nuevo IN ('confirmada', 'cancelada')
    -- Desde confirmada
    WHEN estado_actual = 'confirmada' THEN 
      estado_nuevo IN ('presentado', 'cancelada', 'no_show')
    -- Desde presentado
    WHEN estado_actual = 'presentado' THEN 
      estado_nuevo IN ('completada', 'cancelada')
    -- Otros casos no permitidos por defecto
    ELSE FALSE
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 10. Trigger para validar transiciones antes de actualizar
CREATE OR REPLACE FUNCTION public.validar_cambio_estado()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.estado IS DISTINCT FROM NEW.estado THEN
    IF NOT public.validar_transicion_estado(OLD.estado, NEW.estado) THEN
      RAISE EXCEPTION 'Transición inválida de % a %', OLD.estado, NEW.estado;
    END IF;
    
    -- Si cambia a 'presentado', registrar check_in
    IF NEW.estado = 'presentado' AND NEW.check_in_at IS NULL THEN
      NEW.check_in_at := now();
    END IF;
    
    -- Si cambia a 'completada', registrar check_out
    IF NEW.estado = 'completada' AND NEW.check_out_at IS NULL THEN
      NEW.check_out_at := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_validar_transicion ON public.agendas;
CREATE TRIGGER trigger_validar_transicion
  BEFORE UPDATE ON public.agendas
  FOR EACH ROW
  EXECUTE FUNCTION public.validar_cambio_estado();

-- 11. RLS Policies para notas_clientes
ALTER TABLE public.notas_clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios autenticados pueden leer notas de clientes" ON public.notas_clientes;
CREATE POLICY "Usuarios autenticados pueden leer notas de clientes"
  ON public.notas_clientes FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden crear notas de clientes" ON public.notas_clientes;
CREATE POLICY "Usuarios autenticados pueden crear notas de clientes"
  ON public.notas_clientes FOR INSERT
  TO authenticated
  WITH CHECK (creado_por = auth.uid());

-- 12. RLS Policies para notas_citas
ALTER TABLE public.notas_citas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios autenticados pueden leer notas de citas" ON public.notas_citas;
CREATE POLICY "Usuarios autenticados pueden leer notas de citas"
  ON public.notas_citas FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden crear notas de citas" ON public.notas_citas;
CREATE POLICY "Usuarios autenticados pueden crear notas de citas"
  ON public.notas_citas FOR INSERT
  TO authenticated
  WITH CHECK (creado_por = auth.uid());

-- 13. RLS Policies para historial de estados
ALTER TABLE public.citas_historial_estado ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios autenticados pueden leer historial" ON public.citas_historial_estado;
CREATE POLICY "Usuarios autenticados pueden leer historial"
  ON public.citas_historial_estado FOR SELECT
  TO authenticated
  USING (true);