-- Agregar campos faltantes a venta_items si no existen
DO $$ 
BEGIN
  -- Agregar precio_original si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'venta_items' 
    AND column_name = 'precio_original'
  ) THEN
    ALTER TABLE public.venta_items ADD COLUMN precio_original numeric;
  END IF;

  -- Agregar descuento_porcentaje si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'venta_items' 
    AND column_name = 'descuento_porcentaje'
  ) THEN
    ALTER TABLE public.venta_items ADD COLUMN descuento_porcentaje numeric DEFAULT 0;
  END IF;

  -- Agregar precio_final si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'venta_items' 
    AND column_name = 'precio_final'
  ) THEN
    ALTER TABLE public.venta_items ADD COLUMN precio_final numeric;
  END IF;
END $$;

-- Crear ENUM tipo_pago si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_pago_enum') THEN
    CREATE TYPE public.tipo_pago_enum AS ENUM ('venta', 'anticipo', 'abono', 'giftcard');
  END IF;
END $$;

-- Agregar campos a pagos si no existen
DO $$ 
BEGIN
  -- Agregar tipo_pago si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'pagos' 
    AND column_name = 'tipo_pago'
  ) THEN
    ALTER TABLE public.pagos ADD COLUMN tipo_pago tipo_pago_enum NOT NULL DEFAULT 'venta'::tipo_pago_enum;
  END IF;

  -- Agregar es_ingreso_diferido si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'pagos' 
    AND column_name = 'es_ingreso_diferido'
  ) THEN
    ALTER TABLE public.pagos ADD COLUMN es_ingreso_diferido boolean DEFAULT false;
  END IF;

  -- Agregar fecha_aplicacion si no existe (para anticipos)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'pagos' 
    AND column_name = 'fecha_aplicacion'
  ) THEN
    ALTER TABLE public.pagos ADD COLUMN fecha_aplicacion timestamp with time zone;
  END IF;

  -- Agregar aplicado_a_venta si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'pagos' 
    AND column_name = 'aplicado_a_venta'
  ) THEN
    ALTER TABLE public.pagos ADD COLUMN aplicado_a_venta boolean DEFAULT false;
  END IF;
END $$;

-- Crear vista para desglose de ventas con descuentos
CREATE OR REPLACE VIEW public.vw_ventas_desglose AS
SELECT 
  v.id,
  v.fecha,
  v.id_cliente,
  c.nombre || ' ' || COALESCE(c.apellidos, '') as cliente,
  v.id_sucursal,
  s.nombre as sucursal,
  v.subtotal,
  v.descuento,
  v.impuestos,
  v.total,
  v.estado_venta,
  -- Cálculos de items
  COALESCE(SUM(vi.precio_original * vi.cantidad), 0) as total_precio_original,
  COALESCE(SUM((vi.precio_original - vi.precio_final) * vi.cantidad), 0) as total_descuento_items,
  COALESCE(AVG(vi.descuento_porcentaje), 0) as promedio_descuento_porcentaje,
  -- Información de pagos
  COALESCE(
    (SELECT SUM(p.monto) 
     FROM public.pagos p 
     WHERE p.id_venta = v.id 
     AND p.tipo_pago = 'venta'::tipo_pago_enum), 
    0
  ) as total_pagado,
  COALESCE(
    (SELECT SUM(p.monto) 
     FROM public.pagos p 
     WHERE p.id_venta = v.id 
     AND p.tipo_pago = 'anticipo'::tipo_pago_enum 
     AND p.aplicado_a_venta = true), 
    0
  ) as anticipos_aplicados,
  COALESCE(
    (SELECT string_agg(DISTINCT p.metodo_pago, ', ') 
     FROM public.pagos p 
     WHERE p.id_venta = v.id), 
    'Sin pagos'
  ) as metodos_pago,
  v.created_at,
  v.updated_at
FROM public.ventas v
LEFT JOIN public.clientes c ON v.id_cliente = c.id
LEFT JOIN public.sucursales s ON v.id_sucursal = s.id
LEFT JOIN public.venta_items vi ON v.id = vi.id_venta
GROUP BY v.id, c.nombre, c.apellidos, s.nombre;

-- Crear vista para anticipos pendientes
CREATE OR REPLACE VIEW public.vw_anticipos_pendientes AS
SELECT 
  p.id,
  p.fecha_pago,
  p.id_cliente,
  c.nombre || ' ' || COALESCE(c.apellidos, '') as cliente,
  c.telefono,
  c.email,
  p.id_sucursal,
  s.nombre as sucursal,
  p.monto,
  p.metodo_pago,
  p.referencia,
  p.notas,
  p.created_at,
  -- Calcular días desde el anticipo
  EXTRACT(DAY FROM (now() - p.fecha_pago))::integer as dias_desde_anticipo
FROM public.pagos p
LEFT JOIN public.clientes c ON p.id_cliente = c.id
LEFT JOIN public.sucursales s ON p.id_sucursal = s.id
WHERE p.tipo_pago = 'anticipo'::tipo_pago_enum
  AND (p.aplicado_a_venta = false OR p.aplicado_a_venta IS NULL)
  AND p.es_ingreso_diferido = true
ORDER BY p.fecha_pago DESC;

-- Habilitar RLS en las vistas (heredan permisos de las tablas base)
ALTER VIEW public.vw_ventas_desglose SET (security_invoker = true);
ALTER VIEW public.vw_anticipos_pendientes SET (security_invoker = true);

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_venta_items_precio_original ON public.venta_items(precio_original);
CREATE INDEX IF NOT EXISTS idx_venta_items_descuento ON public.venta_items(descuento_porcentaje);
CREATE INDEX IF NOT EXISTS idx_venta_items_precio_final ON public.venta_items(precio_final);
CREATE INDEX IF NOT EXISTS idx_pagos_tipo_pago ON public.pagos(tipo_pago);
CREATE INDEX IF NOT EXISTS idx_pagos_es_ingreso_diferido ON public.pagos(es_ingreso_diferido);
CREATE INDEX IF NOT EXISTS idx_pagos_aplicado_a_venta ON public.pagos(aplicado_a_venta);