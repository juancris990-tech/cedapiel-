-- Crear enum para tipo de descuento
DO $$ BEGIN
  CREATE TYPE tipo_descuento_enum AS ENUM ('porcentaje', 'monto', 'ninguno');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Renombrar campos existentes si es necesario y agregar los faltantes
DO $$ BEGIN
  ALTER TABLE public.venta_items RENAME COLUMN precio_original TO precio_original_mxn;
EXCEPTION
  WHEN undefined_column THEN null;
  WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE public.venta_items RENAME COLUMN precio_final TO precio_final_mxn;
EXCEPTION
  WHEN undefined_column THEN null;
  WHEN duplicate_column THEN null;
END $$;

-- Agregar nuevos campos
ALTER TABLE public.venta_items
  ADD COLUMN IF NOT EXISTS descuento_tipo tipo_descuento_enum NOT NULL DEFAULT 'ninguno',
  ADD COLUMN IF NOT EXISTS descuento_valor NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS codigo_promocion VARCHAR(50),
  ADD COLUMN IF NOT EXISTS notas_descuento TEXT,
  ADD COLUMN IF NOT EXISTS id_empleado BIGINT;

-- Migrar descuento_porcentaje a descuento_tipo/valor si existe la columna
DO $$ BEGIN
  UPDATE public.venta_items
  SET 
    descuento_tipo = CASE 
      WHEN descuento_porcentaje > 0 THEN 'porcentaje'::tipo_descuento_enum 
      ELSE 'ninguno'::tipo_descuento_enum 
    END,
    descuento_valor = COALESCE(descuento_porcentaje, 0)
  WHERE descuento_tipo = 'ninguno';
EXCEPTION
  WHEN undefined_column THEN null;
END $$;

-- Si no existen los campos renombrados, crearlos
ALTER TABLE public.venta_items
  ADD COLUMN IF NOT EXISTS precio_original_mxn NUMERIC(10,2) NOT NULL DEFAULT 0;

ALTER TABLE public.venta_items
  ADD COLUMN IF NOT EXISTS precio_final_mxn NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Actualizar campos si están vacíos
UPDATE public.venta_items
SET precio_original_mxn = COALESCE(precio_unitario, 0)
WHERE precio_original_mxn = 0;

UPDATE public.venta_items
SET precio_final_mxn = COALESCE(precio_unitario, 0)
WHERE precio_final_mxn = 0;

-- Crear índices para búsquedas
CREATE INDEX IF NOT EXISTS idx_venta_items_descuento_tipo ON public.venta_items(descuento_tipo);
CREATE INDEX IF NOT EXISTS idx_venta_items_codigo_promocion ON public.venta_items(codigo_promocion) WHERE codigo_promocion IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_venta_items_empleado ON public.venta_items(id_empleado) WHERE id_empleado IS NOT NULL;

-- Crear vista detallada de ventas con descuentos
CREATE OR REPLACE VIEW public.vw_ventas_detalle_descuentos AS
SELECT 
  v.id as id_venta,
  v.fecha as fecha_venta,
  v.id_sucursal,
  s.nombre as sucursal_nombre,
  v.id_cliente,
  c.nombre || ' ' || COALESCE(c.apellidos, '') as cliente_nombre,
  vi.id as id_item,
  vi.id_servicio,
  srv.nombre as servicio_nombre,
  vi.id_empleado,
  e.nombre || ' ' || COALESCE(e.apellidos, '') as profesional_nombre,
  vi.cantidad,
  vi.precio_original_mxn,
  vi.descuento_tipo,
  vi.descuento_valor,
  vi.precio_final_mxn,
  vi.codigo_promocion,
  vi.notas_descuento,
  (vi.precio_original_mxn * vi.cantidad) as subtotal_original_mxn,
  CASE 
    WHEN vi.descuento_tipo = 'porcentaje' THEN 
      ROUND((vi.precio_original_mxn * vi.cantidad * vi.descuento_valor / 100), 2)
    WHEN vi.descuento_tipo = 'monto' THEN 
      (vi.descuento_valor * vi.cantidad)
    ELSE 0
  END as descuento_total_mxn,
  (vi.precio_final_mxn * vi.cantidad) as subtotal_final_mxn,
  CASE 
    WHEN vi.precio_original_mxn > 0 THEN
      ROUND(((vi.precio_original_mxn - vi.precio_final_mxn) / vi.precio_original_mxn * 100), 2)
    ELSE 0
  END as descuento_porcentaje_efectivo,
  cs.nombre as categoria_servicio,
  v.estado_venta,
  v.created_at
FROM public.venta_items vi
INNER JOIN public.ventas v ON vi.id_venta = v.id
LEFT JOIN public.sucursales s ON v.id_sucursal = s.id
LEFT JOIN public.clientes c ON v.id_cliente = c.id
LEFT JOIN public.servicios srv ON vi.id_servicio = srv.id
LEFT JOIN public.empleados e ON vi.id_empleado = e.id
LEFT JOIN public.categoria_servicio cs ON srv.id_categoria = cs.id
WHERE v.estado_venta != 'cancelada';

-- Crear vista de reporte de descuentos agregado
CREATE OR REPLACE VIEW public.vw_reporte_descuentos AS
SELECT 
  fecha_venta::date as fecha,
  id_sucursal,
  sucursal_nombre,
  id_empleado,
  profesional_nombre,
  categoria_servicio,
  codigo_promocion,
  COUNT(DISTINCT id_venta) as num_ventas,
  COUNT(id_item) as num_items,
  SUM(subtotal_original_mxn) as total_original_mxn,
  SUM(descuento_total_mxn) as total_descuento_mxn,
  SUM(subtotal_final_mxn) as total_final_mxn,
  CASE 
    WHEN SUM(subtotal_original_mxn) > 0 THEN
      ROUND((SUM(descuento_total_mxn) / SUM(subtotal_original_mxn) * 100), 2)
    ELSE 0
  END as descuento_promedio_pct
FROM public.vw_ventas_detalle_descuentos
GROUP BY fecha, id_sucursal, sucursal_nombre, id_empleado, profesional_nombre, categoria_servicio, codigo_promocion;

-- Función de validación para descuentos
CREATE OR REPLACE FUNCTION public.validar_descuento_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Validar descuento_valor no negativo
  IF NEW.descuento_valor < 0 THEN
    RAISE EXCEPTION 'El valor del descuento no puede ser negativo';
  END IF;

  -- Validar porcentaje no mayor a 100
  IF NEW.descuento_tipo = 'porcentaje' AND NEW.descuento_valor > 100 THEN
    RAISE EXCEPTION 'El porcentaje de descuento no puede ser mayor a 100';
  END IF;

  -- Validar precio_final_mxn no negativo
  IF NEW.precio_final_mxn < 0 THEN
    RAISE EXCEPTION 'El precio final no puede ser negativo';
  END IF;

  -- Calcular precio_final_mxn si no viene calculado correctamente
  IF NEW.descuento_tipo = 'porcentaje' THEN
    NEW.precio_final_mxn := ROUND(NEW.precio_original_mxn * (1 - NEW.descuento_valor / 100), 2);
  ELSIF NEW.descuento_tipo = 'monto' THEN
    NEW.precio_final_mxn := GREATEST(ROUND(NEW.precio_original_mxn - NEW.descuento_valor, 2), 0);
  ELSE
    NEW.precio_final_mxn := NEW.precio_original_mxn;
  END IF;

  RETURN NEW;
END;
$function$;

-- Crear trigger de validación
DROP TRIGGER IF EXISTS trigger_validar_descuento_item ON public.venta_items;
CREATE TRIGGER trigger_validar_descuento_item
  BEFORE INSERT OR UPDATE ON public.venta_items
  FOR EACH ROW
  EXECUTE FUNCTION public.validar_descuento_item();

-- RLS policies para las vistas
ALTER VIEW public.vw_ventas_detalle_descuentos SET (security_invoker = on);
ALTER VIEW public.vw_reporte_descuentos SET (security_invoker = on);

-- Registrar en bitácora cuando se aplique descuento
CREATE OR REPLACE FUNCTION public.registrar_descuento_bitacora()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.descuento_tipo != 'ninguno' AND (TG_OP = 'INSERT' OR OLD.descuento_valor != NEW.descuento_valor) THEN
    INSERT INTO public.bitacora_accion (
      entidad,
      accion,
      id_entidad,
      usuario,
      detalle_json
    ) VALUES (
      'venta_items',
      CASE WHEN TG_OP = 'INSERT' THEN 'aplicar_descuento_item' ELSE 'editar_descuento_item' END,
      NEW.id,
      auth.uid(),
      jsonb_build_object(
        'id_venta', NEW.id_venta,
        'descuento_tipo', NEW.descuento_tipo,
        'descuento_valor', NEW.descuento_valor,
        'precio_original', NEW.precio_original_mxn,
        'precio_final', NEW.precio_final_mxn,
        'codigo_promocion', NEW.codigo_promocion,
        'notas', NEW.notas_descuento
      )
    );
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_registrar_descuento_bitacora ON public.venta_items;
CREATE TRIGGER trigger_registrar_descuento_bitacora
  AFTER INSERT OR UPDATE ON public.venta_items
  FOR EACH ROW
  EXECUTE FUNCTION public.registrar_descuento_bitacora();

-- Asegurar que comisiones usen precio_final_mxn
COMMENT ON COLUMN public.venta_items.precio_final_mxn IS 'Precio final con IVA incluido después de aplicar descuentos. Base para cálculo de comisiones.';