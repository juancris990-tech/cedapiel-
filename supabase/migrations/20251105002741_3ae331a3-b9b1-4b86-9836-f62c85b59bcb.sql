-- Extender tabla parametros_comision para soportar servicios específicos y auditoría
ALTER TABLE public.parametros_comision
ADD COLUMN IF NOT EXISTS id_servicio BIGINT REFERENCES public.servicios(id),
ADD COLUMN IF NOT EXISTS prioridad SMALLINT NOT NULL DEFAULT 5,
ADD COLUMN IF NOT EXISTS creado_por UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS actualizado_por UUID REFERENCES auth.users(id);

-- Renombrar columnas para consistencia con el prompt
ALTER TABLE public.parametros_comision
RENAME COLUMN vigencia_desde TO fecha_inicio;

ALTER TABLE public.parametros_comision
RENAME COLUMN vigencia_hasta TO fecha_fin;

ALTER TABLE public.parametros_comision
RENAME COLUMN porcentaje_comision TO porcentaje;

-- Crear tabla de bitácora para reglas de comisión
CREATE TABLE IF NOT EXISTS public.bitacora_regla_comision (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_regla BIGINT NOT NULL REFERENCES public.parametros_comision(id),
  accion VARCHAR NOT NULL CHECK (accion IN ('crear', 'actualizar', 'desactivar')),
  usuario_responsable UUID NOT NULL REFERENCES auth.users(id),
  antes_json JSONB,
  despues_json JSONB,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para parametros_comision
CREATE INDEX IF NOT EXISTS idx_parametros_comision_lookup 
ON public.parametros_comision(id_empleado, id_servicio, id_categoria_servicio, fecha_inicio, fecha_fin, activo);

-- Función para calcular prioridad automáticamente
CREATE OR REPLACE FUNCTION public.calcular_prioridad_comision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Empleado + Servicio = 1
  IF NEW.id_empleado IS NOT NULL AND NEW.id_servicio IS NOT NULL THEN
    NEW.prioridad := 1;
  -- Empleado + Categoría = 2
  ELSIF NEW.id_empleado IS NOT NULL AND NEW.id_categoria_servicio IS NOT NULL THEN
    NEW.prioridad := 2;
  -- Empleado genérica = 3
  ELSIF NEW.id_empleado IS NOT NULL AND NEW.id_servicio IS NULL AND NEW.id_categoria_servicio IS NULL THEN
    NEW.prioridad := 3;
  -- Genérica por Servicio = 4
  ELSIF NEW.id_empleado IS NULL AND NEW.id_servicio IS NOT NULL THEN
    NEW.prioridad := 4;
  -- Genérica por Categoría = 5
  ELSIF NEW.id_empleado IS NULL AND NEW.id_categoria_servicio IS NOT NULL THEN
    NEW.prioridad := 5;
  ELSE
    RAISE EXCEPTION 'Configuración inválida de regla de comisión';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para calcular prioridad antes de insertar/actualizar
DROP TRIGGER IF EXISTS trg_calcular_prioridad_comision ON public.parametros_comision;
CREATE TRIGGER trg_calcular_prioridad_comision
BEFORE INSERT OR UPDATE ON public.parametros_comision
FOR EACH ROW
EXECUTE FUNCTION public.calcular_prioridad_comision();

-- Función para validar no solapamiento de vigencias
CREATE OR REPLACE FUNCTION public.validar_no_solape_comision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  -- Construir la llave lógica según la especificidad
  SELECT COUNT(*)
  INTO v_count
  FROM public.parametros_comision
  WHERE id != COALESCE(NEW.id, -1)
    AND activo = true
    AND (
      -- Misma llave lógica
      (COALESCE(id_empleado, -1) = COALESCE(NEW.id_empleado, -1) 
       AND COALESCE(id_servicio, -1) = COALESCE(NEW.id_servicio, -1)
       AND (NEW.id_servicio IS NOT NULL OR COALESCE(id_categoria_servicio, -1) = COALESCE(NEW.id_categoria_servicio, -1)))
    )
    AND (
      -- Rango se solapa
      (NEW.fecha_inicio <= COALESCE(fecha_fin, '9999-12-31'::date))
      AND (COALESCE(NEW.fecha_fin, '9999-12-31'::date) >= fecha_inicio)
    );
  
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Ya existe una regla activa con la misma configuración en el rango de fechas especificado';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para validar no solapamiento
DROP TRIGGER IF EXISTS trg_validar_no_solape_comision ON public.parametros_comision;
CREATE TRIGGER trg_validar_no_solape_comision
BEFORE INSERT OR UPDATE ON public.parametros_comision
FOR EACH ROW
EXECUTE FUNCTION public.validar_no_solape_comision();

-- Función para auditar cambios en reglas
CREATE OR REPLACE FUNCTION public.auditar_regla_comision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_accion VARCHAR;
  v_antes JSONB;
  v_despues JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_accion := 'crear';
    v_antes := NULL;
    v_despues := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.activo = false AND OLD.activo = true THEN
      v_accion := 'desactivar';
    ELSE
      v_accion := 'actualizar';
    END IF;
    v_antes := to_jsonb(OLD);
    v_despues := to_jsonb(NEW);
  END IF;
  
  INSERT INTO public.bitacora_regla_comision (
    id_regla,
    accion,
    usuario_responsable,
    antes_json,
    despues_json
  ) VALUES (
    NEW.id,
    v_accion,
    COALESCE(NEW.actualizado_por, NEW.creado_por, auth.uid()),
    v_antes,
    v_despues
  );
  
  RETURN NEW;
END;
$$;

-- Trigger para auditoría
DROP TRIGGER IF EXISTS trg_auditar_regla_comision ON public.parametros_comision;
CREATE TRIGGER trg_auditar_regla_comision
AFTER INSERT OR UPDATE ON public.parametros_comision
FOR EACH ROW
EXECUTE FUNCTION public.auditar_regla_comision();

-- RLS para bitacora_regla_comision
ALTER TABLE public.bitacora_regla_comision ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios con permisos pueden leer bitácora de reglas"
ON public.bitacora_regla_comision
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'direccion') OR 
  has_role(auth.uid(), 'admin_rrhh')
);

-- Función para resolver regla de comisión aplicable
CREATE OR REPLACE FUNCTION public.resolver_regla_comision(
  _id_empleado BIGINT,
  _id_servicio BIGINT,
  _id_categoria BIGINT,
  _fecha DATE
)
RETURNS TABLE (
  id_regla BIGINT,
  porcentaje NUMERIC,
  prioridad SMALLINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pc.id,
    pc.porcentaje,
    pc.prioridad
  FROM public.parametros_comision pc
  WHERE pc.activo = true
    AND pc.fecha_inicio <= _fecha
    AND (pc.fecha_fin IS NULL OR pc.fecha_fin >= _fecha)
    AND (
      -- Empleado + Servicio (prioridad 1)
      (pc.id_empleado = _id_empleado AND pc.id_servicio = _id_servicio)
      OR
      -- Empleado + Categoría (prioridad 2)
      (pc.id_empleado = _id_empleado AND pc.id_servicio IS NULL AND pc.id_categoria_servicio = _id_categoria)
      OR
      -- Empleado genérica (prioridad 3)
      (pc.id_empleado = _id_empleado AND pc.id_servicio IS NULL AND pc.id_categoria_servicio IS NULL)
      OR
      -- Genérica por Servicio (prioridad 4)
      (pc.id_empleado IS NULL AND pc.id_servicio = _id_servicio)
      OR
      -- Genérica por Categoría (prioridad 5)
      (pc.id_empleado IS NULL AND pc.id_servicio IS NULL AND pc.id_categoria_servicio = _id_categoria)
    )
  ORDER BY 
    pc.prioridad ASC,
    pc.fecha_inicio DESC
  LIMIT 1;
END;
$$;