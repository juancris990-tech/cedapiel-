-- Crear tabla facturacion_detalle
CREATE TABLE IF NOT EXISTS public.facturacion_detalle (
  id BIGSERIAL PRIMARY KEY,
  id_factura VARCHAR NOT NULL,
  fecha DATE NOT NULL,
  cliente VARCHAR NOT NULL,
  sucursal VARCHAR NOT NULL,
  profesional VARCHAR,
  tipo VARCHAR NOT NULL,
  descripcion TEXT,
  precio_unitario_mxn NUMERIC(10,2) NOT NULL DEFAULT 0,
  cantidad NUMERIC(10,2) NOT NULL DEFAULT 1,
  impuesto_mxn NUMERIC(10,2) DEFAULT 0,
  responsabilidad_paquete_mxn NUMERIC(10,2) DEFAULT 0,
  monto_mxn NUMERIC(10,2) NOT NULL DEFAULT 0,
  cantidad_extra NUMERIC(10,2) DEFAULT 0,
  impuesto_extra_mxn NUMERIC(10,2) DEFAULT 0,
  responsabilidad_paquete_total_mxn NUMERIC(10,2) DEFAULT 0,
  monto_total_mxn NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_facturacion_detalle_id_factura ON public.facturacion_detalle(id_factura);
CREATE INDEX IF NOT EXISTS idx_facturacion_detalle_fecha ON public.facturacion_detalle(fecha);
CREATE INDEX IF NOT EXISTS idx_facturacion_detalle_cliente ON public.facturacion_detalle(cliente);
CREATE INDEX IF NOT EXISTS idx_facturacion_detalle_sucursal ON public.facturacion_detalle(sucursal);
CREATE INDEX IF NOT EXISTS idx_facturacion_detalle_tipo ON public.facturacion_detalle(tipo);

-- Habilitar RLS
ALTER TABLE public.facturacion_detalle ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: Usuarios autenticados pueden leer
CREATE POLICY "Usuarios autenticados pueden leer facturacion_detalle"
  ON public.facturacion_detalle
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Políticas RLS: Admin y gerencia pueden insertar
CREATE POLICY "Admin y gerencia pueden crear facturacion_detalle"
  ON public.facturacion_detalle
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'gerencia'::app_role) OR
    has_role(auth.uid(), 'direccion'::app_role)
  );

-- Políticas RLS: Admin y gerencia pueden actualizar
CREATE POLICY "Admin y gerencia pueden actualizar facturacion_detalle"
  ON public.facturacion_detalle
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'gerencia'::app_role) OR
    has_role(auth.uid(), 'direccion'::app_role)
  );

-- Políticas RLS: Solo admin puede eliminar
CREATE POLICY "Solo admin puede eliminar facturacion_detalle"
  ON public.facturacion_detalle
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para actualizar updated_at
CREATE TRIGGER update_facturacion_detalle_updated_at
  BEFORE UPDATE ON public.facturacion_detalle
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();