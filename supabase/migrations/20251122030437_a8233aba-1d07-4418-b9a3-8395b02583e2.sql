-- Crear tabla para reporte de ventas detalladas
CREATE TABLE IF NOT EXISTS public.ventas_detalle (
  id BIGSERIAL PRIMARY KEY,
  id_factura TEXT NOT NULL,
  fecha_venta DATE NOT NULL,
  cliente TEXT NOT NULL,
  sucursal TEXT NOT NULL,
  profesional TEXT,
  tipo TEXT NOT NULL,
  descripcion TEXT,
  precio_unitario_mxn NUMERIC(10, 2) DEFAULT 0,
  cantidad NUMERIC(10, 2) DEFAULT 1,
  impuesto_mxn NUMERIC(10, 2) DEFAULT 0,
  responsabilidad_paquete_mxn NUMERIC(10, 2) DEFAULT 0,
  monto_linea_mxn NUMERIC(10, 2) DEFAULT 0,
  cantidad_aux NUMERIC(10, 2) DEFAULT 0,
  impuesto_aux_mxn NUMERIC(10, 2) DEFAULT 0,
  responsabilidad_paquete_total_mxn NUMERIC(10, 2) DEFAULT 0,
  monto_total_mxn NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsquedas y filtros rápidos
CREATE INDEX IF NOT EXISTS idx_ventas_detalle_id_factura ON public.ventas_detalle(id_factura);
CREATE INDEX IF NOT EXISTS idx_ventas_detalle_fecha_venta ON public.ventas_detalle(fecha_venta);
CREATE INDEX IF NOT EXISTS idx_ventas_detalle_cliente ON public.ventas_detalle(cliente);
CREATE INDEX IF NOT EXISTS idx_ventas_detalle_sucursal ON public.ventas_detalle(sucursal);
CREATE INDEX IF NOT EXISTS idx_ventas_detalle_profesional ON public.ventas_detalle(profesional);
CREATE INDEX IF NOT EXISTS idx_ventas_detalle_tipo ON public.ventas_detalle(tipo);
CREATE INDEX IF NOT EXISTS idx_ventas_detalle_fecha_sucursal ON public.ventas_detalle(fecha_venta, sucursal);
CREATE INDEX IF NOT EXISTS idx_ventas_detalle_fecha_profesional ON public.ventas_detalle(fecha_venta, profesional);

-- Trigger para updated_at
CREATE TRIGGER update_ventas_detalle_updated_at
  BEFORE UPDATE ON public.ventas_detalle
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS policies
ALTER TABLE public.ventas_detalle ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer ventas_detalle"
  ON public.ventas_detalle
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin y gerencia pueden insertar ventas_detalle"
  ON public.ventas_detalle
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'gerencia') OR 
    has_role(auth.uid(), 'direccion')
  );

CREATE POLICY "Admin y gerencia pueden actualizar ventas_detalle"
  ON public.ventas_detalle
  FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'gerencia') OR 
    has_role(auth.uid(), 'direccion')
  );

CREATE POLICY "Solo admin puede eliminar ventas_detalle"
  ON public.ventas_detalle
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));