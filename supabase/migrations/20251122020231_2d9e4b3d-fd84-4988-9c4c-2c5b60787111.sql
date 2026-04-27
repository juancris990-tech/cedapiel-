-- Crear tabla para gasto de clientes por periodo
CREATE TABLE IF NOT EXISTS public.gasto_clientes_periodo (
  id BIGSERIAL PRIMARY KEY,
  cliente VARCHAR NOT NULL,
  email VARCHAR,
  telefono VARCHAR,
  numero_sms VARCHAR,
  visitas_registradas INTEGER DEFAULT 0,
  cantidad_citas INTEGER DEFAULT 0,
  valor_citas_mxn NUMERIC(10,2) DEFAULT 0,
  monto_servicios_facturados_mxn NUMERIC(10,2) DEFAULT 0,
  monto_productos_facturados_mxn NUMERIC(10,2) DEFAULT 0,
  monto_descuentos_mxn NUMERIC(10,2) DEFAULT 0,
  monto_facturado_total_mxn NUMERIC(10,2) DEFAULT 0,
  cantidad_grupos_citas INTEGER DEFAULT 0,
  cantidad_citas_periodo INTEGER DEFAULT 0,
  valor_citas_periodo_mxn NUMERIC(10,2) DEFAULT 0,
  monto_servicios_facturados_periodo_mxn NUMERIC(10,2) DEFAULT 0,
  cargo_adicional_mxn NUMERIC(10,2) DEFAULT 0,
  descuento_periodo_mxn NUMERIC(10,2) DEFAULT 0,
  monto_facturado_final_mxn NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.gasto_clientes_periodo ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
CREATE POLICY "Usuarios autenticados pueden leer gasto clientes"
  ON public.gasto_clientes_periodo
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin y gerencia pueden insertar gasto clientes"
  ON public.gasto_clientes_periodo
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'gerencia'::app_role) OR 
    has_role(auth.uid(), 'direccion'::app_role)
  );

CREATE POLICY "Admin y gerencia pueden actualizar gasto clientes"
  ON public.gasto_clientes_periodo
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'gerencia'::app_role) OR 
    has_role(auth.uid(), 'direccion'::app_role)
  );

CREATE POLICY "Solo admin puede eliminar gasto clientes"
  ON public.gasto_clientes_periodo
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Crear índices para mejorar consultas
CREATE INDEX idx_gasto_clientes_cliente ON public.gasto_clientes_periodo(cliente);
CREATE INDEX idx_gasto_clientes_email ON public.gasto_clientes_periodo(email);
CREATE INDEX idx_gasto_clientes_telefono ON public.gasto_clientes_periodo(telefono);
CREATE INDEX idx_gasto_clientes_monto_final ON public.gasto_clientes_periodo(monto_facturado_final_mxn DESC);
CREATE INDEX idx_gasto_clientes_cantidad_citas ON public.gasto_clientes_periodo(cantidad_citas_periodo DESC);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_gasto_clientes_periodo_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_gasto_clientes_periodo_timestamp
  BEFORE UPDATE ON public.gasto_clientes_periodo
  FOR EACH ROW
  EXECUTE FUNCTION update_gasto_clientes_periodo_updated_at();