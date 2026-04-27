-- Crear tabla para proyección de valor futuro
CREATE TABLE IF NOT EXISTS public.proyeccion_valor_futuro (
  id BIGSERIAL PRIMARY KEY,
  profesional TEXT NOT NULL,
  cantidad_clientes INTEGER,
  clientes_online INTEGER,
  clientes_totales INTEGER,
  cantidad_servicios INTEGER,
  reservas_online INTEGER,
  valor_futuro_mxn NUMERIC(10,2),
  porcentaje_clientes INTEGER,
  nuevos_clientes INTEGER,
  citas_agendadas INTEGER,
  servicios_agendados INTEGER,
  reservas_online2 INTEGER,
  valor_total_agendado_mxn NUMERIC(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.proyeccion_valor_futuro ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuarios autenticados pueden leer proyecciones"
  ON public.proyeccion_valor_futuro
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin y gerencia pueden crear proyecciones"
  ON public.proyeccion_valor_futuro
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'gerencia'::app_role) OR 
    has_role(auth.uid(), 'direccion'::app_role)
  );

CREATE POLICY "Admin puede eliminar proyecciones"
  ON public.proyeccion_valor_futuro
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Índices para mejorar rendimiento
CREATE INDEX idx_proyeccion_profesional ON public.proyeccion_valor_futuro(profesional);
CREATE INDEX idx_proyeccion_valor_futuro ON public.proyeccion_valor_futuro(valor_futuro_mxn DESC);
CREATE INDEX idx_proyeccion_servicios ON public.proyeccion_valor_futuro(cantidad_servicios DESC);