-- Crear tabla para resumen de productividad del personal
CREATE TABLE IF NOT EXISTS public.resumen_productividad_personal (
  id BIGSERIAL PRIMARY KEY,
  
  -- Identificación
  profesional TEXT NOT NULL,
  servicio TEXT NOT NULL,
  
  -- Confirmadas (primer grupo)
  confirmadas_2 INTEGER DEFAULT 0,
  monto_confirmadas_2_mxn NUMERIC(10,2) DEFAULT 0,
  monto_confirmadas_2_facturado_mxn NUMERIC(10,2) DEFAULT 0,
  
  -- Completadas (primer grupo)
  completadas INTEGER DEFAULT 0,
  monto_completadas_mxn NUMERIC(10,2) DEFAULT 0,
  monto_completadas_facturado_mxn NUMERIC(10,2) DEFAULT 0,
  
  -- Canceladas (primer grupo)
  canceladas INTEGER DEFAULT 0,
  monto_canceladas_mxn NUMERIC(10,2) DEFAULT 0,
  monto_canceladas_facturado_mxn NUMERIC(10,2) DEFAULT 0,
  
  -- Confirmadas (segundo grupo)
  confirmadas INTEGER DEFAULT 0,
  monto_confirmadas_mxn NUMERIC(10,2) DEFAULT 0,
  monto_confirmadas_facturado_mxn NUMERIC(10,2) DEFAULT 0,
  
  -- Completadas 2
  completadas_2 INTEGER DEFAULT 0,
  monto_completadas_2_mxn NUMERIC(10,2) DEFAULT 0,
  monto_completadas_2_facturado_mxn NUMERIC(10,2) DEFAULT 0,
  
  -- No show
  no_show INTEGER DEFAULT 0,
  monto_no_show_mxn NUMERIC(10,2) DEFAULT 0,
  monto_no_show_facturado_mxn NUMERIC(10,2) DEFAULT 0,
  
  -- Canceladas 2
  canceladas_2 INTEGER DEFAULT 0,
  monto_canceladas_2_mxn NUMERIC(10,2) DEFAULT 0,
  monto_canceladas_2_facturado_mxn NUMERIC(10,2) DEFAULT 0,
  
  -- Confirmadas 3
  confirmadas_3 INTEGER DEFAULT 0,
  monto_confirmadas_3_mxn NUMERIC(10,2) DEFAULT 0,
  monto_confirmadas_3_facturado_mxn NUMERIC(10,2) DEFAULT 0,
  
  -- Completadas 1
  completadas_1 INTEGER DEFAULT 0,
  monto_completadas_1_mxn NUMERIC(10,2) DEFAULT 0,
  monto_completadas_1_facturado_mxn NUMERIC(10,2) DEFAULT 0,
  
  -- No show 2
  no_show_2 INTEGER DEFAULT 0,
  monto_no_show_2_mxn NUMERIC(10,2) DEFAULT 0,
  monto_no_show_2_facturado_mxn NUMERIC(10,2) DEFAULT 0,
  
  -- Canceladas 1
  canceladas_1 INTEGER DEFAULT 0,
  monto_canceladas_1_mxn NUMERIC(10,2) DEFAULT 0,
  monto_canceladas_1_facturado_mxn NUMERIC(10,2) DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsqueda rápida
CREATE INDEX idx_productividad_profesional ON public.resumen_productividad_personal(profesional);
CREATE INDEX idx_productividad_servicio ON public.resumen_productividad_personal(servicio);
CREATE INDEX idx_productividad_completadas ON public.resumen_productividad_personal(completadas_1 DESC);
CREATE INDEX idx_productividad_ingresos ON public.resumen_productividad_personal(monto_completadas_1_facturado_mxn DESC);

-- RLS Policies
ALTER TABLE public.resumen_productividad_personal ENABLE ROW LEVEL SECURITY;

-- Usuarios autenticados pueden leer
CREATE POLICY "Usuarios autenticados pueden leer productividad"
  ON public.resumen_productividad_personal
  FOR SELECT
  TO authenticated
  USING (true);

-- Admin y gerencia pueden insertar/actualizar
CREATE POLICY "Admin y gerencia pueden crear productividad"
  ON public.resumen_productividad_personal
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'gerencia'::app_role) OR 
    has_role(auth.uid(), 'direccion'::app_role)
  );

CREATE POLICY "Admin y gerencia pueden actualizar productividad"
  ON public.resumen_productividad_personal
  FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'gerencia'::app_role) OR 
    has_role(auth.uid(), 'direccion'::app_role)
  );

-- Solo admin puede eliminar
CREATE POLICY "Solo admin puede eliminar productividad"
  ON public.resumen_productividad_personal
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_productividad_updated_at
  BEFORE UPDATE ON public.resumen_productividad_personal
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();