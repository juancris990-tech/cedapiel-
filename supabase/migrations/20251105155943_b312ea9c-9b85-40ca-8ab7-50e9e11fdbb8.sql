-- Agregar columnas para el sistema POS en la tabla ventas
ALTER TABLE public.ventas 
ADD COLUMN IF NOT EXISTS estado VARCHAR(50) DEFAULT 'borrador',
ADD COLUMN IF NOT EXISTS origen VARCHAR(50) DEFAULT 'pos_manual',
ADD COLUMN IF NOT EXISTS observacion TEXT,
ADD COLUMN IF NOT EXISTS monto_original_mxn NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS monto_descuento_mxn NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS monto_final_mxn NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS anticipo_aplicado_mxn NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_pagado_mxn NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS saldo_pendiente_mxn NUMERIC(10,2) DEFAULT 0;

-- Crear tabla venta_items si no existe
CREATE TABLE IF NOT EXISTS public.venta_items (
  id BIGSERIAL PRIMARY KEY,
  id_venta BIGINT NOT NULL REFERENCES public.ventas(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('servicio', 'producto')),
  id_servicio BIGINT REFERENCES public.servicios(id),
  id_producto BIGINT REFERENCES public.productos_inventario(id),
  cantidad NUMERIC(10,2) NOT NULL DEFAULT 1,
  precio_original_mxn NUMERIC(10,2) NOT NULL,
  descuento_tipo VARCHAR(20) NOT NULL DEFAULT 'ninguno' CHECK (descuento_tipo IN ('porcentaje', 'monto', 'ninguno')),
  descuento_valor NUMERIC(10,2) DEFAULT 0,
  precio_final_mxn NUMERIC(10,2) NOT NULL,
  subtotal_final_mxn NUMERIC(10,2) NOT NULL,
  codigo_promocion VARCHAR(50),
  notas_descuento TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS en venta_items
ALTER TABLE public.venta_items ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para venta_items
CREATE POLICY "Usuarios autenticados pueden leer items"
  ON public.venta_items FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden crear items"
  ON public.venta_items FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden actualizar items"
  ON public.venta_items FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden eliminar items"
  ON public.venta_items FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_venta_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_venta_items_updated_at
  BEFORE UPDATE ON public.venta_items
  FOR EACH ROW
  EXECUTE FUNCTION update_venta_items_updated_at();