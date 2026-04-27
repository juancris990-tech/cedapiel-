-- 1. Crear tipo ENUM para tipo de pago
DO $$ BEGIN
  CREATE TYPE tipo_pago_enum AS ENUM ('venta', 'anticipo', 'abono', 'giftcard');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Crear tabla parametros_sistema
CREATE TABLE IF NOT EXISTS public.parametros_sistema (
  id BIGSERIAL PRIMARY KEY,
  pais VARCHAR(100) NOT NULL DEFAULT 'México',
  moneda VARCHAR(10) NOT NULL DEFAULT 'MXN',
  formato_monetario VARCHAR(50) NOT NULL DEFAULT '$1,000.00',
  iva_incluido BOOLEAN NOT NULL DEFAULT TRUE,
  tasa_iva NUMERIC(5,2) NOT NULL DEFAULT 16.00,
  periodo_comision_inicio VARCHAR(20) NOT NULL DEFAULT 'sábado',
  periodo_comision_fin VARCHAR(20) NOT NULL DEFAULT 'viernes',
  semana_laboral VARCHAR(100) NOT NULL DEFAULT 'lunes,martes,miércoles,jueves,viernes,sábado',
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Insertar configuración por defecto si no existe
INSERT INTO public.parametros_sistema (
  pais, moneda, formato_monetario, iva_incluido, tasa_iva,
  periodo_comision_inicio, periodo_comision_fin, semana_laboral, activo
)
SELECT 'México', 'MXN', '$1,000.00', TRUE, 16.00, 'sábado', 'viernes', 
       'lunes,martes,miércoles,jueves,viernes,sábado', TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.parametros_sistema WHERE activo = TRUE);

-- 3. Crear vista de parámetros activos
CREATE OR REPLACE VIEW public.vw_parametros_activos AS
SELECT 
  id,
  pais,
  moneda,
  formato_monetario,
  iva_incluido,
  tasa_iva,
  periodo_comision_inicio,
  periodo_comision_fin,
  semana_laboral
FROM public.parametros_sistema
WHERE activo = TRUE
ORDER BY created_at DESC
LIMIT 1;

-- 4. Agregar campos de descuento a venta_items
ALTER TABLE public.venta_items 
  ADD COLUMN IF NOT EXISTS precio_original NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS descuento_porcentaje NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS precio_final NUMERIC(12,2);

-- Actualizar registros existentes
UPDATE public.venta_items 
SET 
  precio_original = precio_unitario,
  precio_final = precio_unitario,
  descuento_porcentaje = 0
WHERE precio_original IS NULL;

-- 5. Crear tabla pagos
CREATE TABLE IF NOT EXISTS public.pagos (
  id BIGSERIAL PRIMARY KEY,
  id_venta BIGINT REFERENCES public.ventas(id),
  id_cliente BIGINT NOT NULL REFERENCES public.clientes(id),
  id_sucursal BIGINT NOT NULL REFERENCES public.sucursales(id),
  tipo_pago tipo_pago_enum NOT NULL DEFAULT 'venta',
  monto NUMERIC(12,2) NOT NULL,
  es_ingreso_diferido BOOLEAN DEFAULT FALSE,
  fecha_pago TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  metodo_pago VARCHAR(50),
  referencia VARCHAR(100),
  notas TEXT,
  aplicado_a_venta BOOLEAN DEFAULT FALSE,
  fecha_aplicacion TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- 6. Crear vista de ingresos diferidos
CREATE OR REPLACE VIEW public.vw_ingresos_diferidos AS
SELECT 
  p.id_cliente,
  c.nombre,
  c.apellidos,
  p.id_sucursal,
  s.nombre AS sucursal,
  SUM(p.monto) AS saldo_total,
  COUNT(*) AS cantidad_anticipos,
  MIN(p.fecha_pago) AS fecha_primer_anticipo,
  MAX(p.fecha_pago) AS fecha_ultimo_anticipo
FROM public.pagos p
JOIN public.clientes c ON p.id_cliente = c.id
JOIN public.sucursales s ON p.id_sucursal = s.id
WHERE p.tipo_pago = 'anticipo' 
  AND p.es_ingreso_diferido = TRUE
  AND p.aplicado_a_venta = FALSE
GROUP BY p.id_cliente, c.nombre, c.apellidos, p.id_sucursal, s.nombre;

-- 7. Crear tabla comisiones
CREATE TABLE IF NOT EXISTS public.comisiones (
  id BIGSERIAL PRIMARY KEY,
  id_empleado BIGINT NOT NULL REFERENCES public.empleados(id),
  id_venta BIGINT REFERENCES public.ventas(id),
  id_venta_item BIGINT REFERENCES public.venta_items(id),
  id_categoria_servicio BIGINT REFERENCES public.categoria_servicio(id),
  id_sucursal BIGINT NOT NULL REFERENCES public.sucursales(id),
  monto_base NUMERIC(12,2) NOT NULL,
  porcentaje_comision NUMERIC(5,2) NOT NULL,
  monto_comision NUMERIC(12,2) NOT NULL,
  id_empleado_secundario BIGINT REFERENCES public.empleados(id),
  porcentaje_split NUMERIC(5,2) DEFAULT 0,
  monto_comision_secundario NUMERIC(12,2) DEFAULT 0,
  periodo_inicio DATE NOT NULL,
  periodo_fin DATE NOT NULL,
  fecha_pago DATE,
  estado VARCHAR(50) DEFAULT 'pendiente',
  notas TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- 8. Habilitar RLS en nuevas tablas
ALTER TABLE public.parametros_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comisiones ENABLE ROW LEVEL SECURITY;

-- 9. Políticas RLS para parametros_sistema
CREATE POLICY "Usuarios autenticados pueden leer parámetros" 
  ON public.parametros_sistema FOR SELECT 
  USING (true);

CREATE POLICY "Solo admins pueden modificar parámetros" 
  ON public.parametros_sistema FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'));

-- 10. Políticas RLS para pagos
CREATE POLICY "Usuarios autenticados pueden leer pagos" 
  ON public.pagos FOR SELECT 
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear pagos" 
  ON public.pagos FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar pagos" 
  ON public.pagos FOR UPDATE 
  USING (true);

-- 11. Políticas RLS para comisiones
CREATE POLICY "Usuarios autenticados pueden leer comisiones" 
  ON public.comisiones FOR SELECT 
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear comisiones" 
  ON public.comisiones FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar comisiones" 
  ON public.comisiones FOR UPDATE 
  USING (true);

-- 12. Triggers para updated_at
CREATE TRIGGER set_updated_at_parametros
  BEFORE UPDATE ON public.parametros_sistema
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_pagos
  BEFORE UPDATE ON public.pagos
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_comisiones
  BEFORE UPDATE ON public.comisiones
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();