
-- Arreglar la función resolver_regla_comision para que considere reglas genéricas (prioridad 6)
CREATE OR REPLACE FUNCTION resolver_regla_comision(
  _id_empleado BIGINT,
  _id_servicio BIGINT,
  _id_categoria BIGINT,
  _fecha DATE
)
RETURNS TABLE(id_regla BIGINT, porcentaje NUMERIC, prioridad SMALLINT)
LANGUAGE plpgsql
STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pc.id,
    pc.porcentaje,
    pc.prioridad
  FROM parametros_comision pc
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
      OR
      -- Regla completamente genérica (prioridad 6) - ESTO FALTABA
      (pc.id_empleado IS NULL AND pc.id_servicio IS NULL AND pc.id_categoria_servicio IS NULL)
    )
  ORDER BY 
    pc.prioridad ASC,
    pc.fecha_inicio DESC
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION resolver_regla_comision IS 
'Encuentra la regla de comisión más específica aplicable según prioridad y fecha';
