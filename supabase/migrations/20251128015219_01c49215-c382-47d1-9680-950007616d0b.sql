-- Actualizar función para permitir regla completamente genérica
CREATE OR REPLACE FUNCTION public.calcular_prioridad_comision()
RETURNS TRIGGER AS $$
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
  -- Regla completamente genérica (todos los empleados, todas las categorías, todos los servicios) = 6
  ELSIF NEW.id_empleado IS NULL AND NEW.id_servicio IS NULL AND NEW.id_categoria_servicio IS NULL THEN
    NEW.prioridad := 6;
  ELSE
    RAISE EXCEPTION 'Configuración inválida de regla de comisión';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;