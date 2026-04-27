-- Crear tabla para citas agendadas
CREATE TABLE IF NOT EXISTS public.citas_agendadas (
  id BIGSERIAL PRIMARY KEY,
  recurso TEXT,
  fecha DATE NOT NULL,
  cliente TEXT NOT NULL,
  email TEXT,
  telefono TEXT,
  numero_sms TEXT,
  sucursal TEXT NOT NULL,
  estado TEXT NOT NULL,
  fecha_creacion DATE,
  creado_por TEXT,
  hora_inicio TEXT NOT NULL,
  hora_fin TEXT NOT NULL,
  profesional TEXT,
  servicio TEXT,
  equipo TEXT,
  retencion TEXT,
  reagendado TEXT,
  facturado TEXT,
  valor_mxn NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.citas_agendadas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuarios autenticados pueden leer citas agendadas"
  ON public.citas_agendadas
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin y gerencia pueden crear citas agendadas"
  ON public.citas_agendadas
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'gerencia') OR 
    has_role(auth.uid(), 'direccion')
  );

CREATE POLICY "Admin y gerencia pueden actualizar citas agendadas"
  ON public.citas_agendadas
  FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'gerencia') OR 
    has_role(auth.uid(), 'direccion')
  );

CREATE POLICY "Solo admin puede eliminar citas agendadas"
  ON public.citas_agendadas
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Trigger para actualizar updated_at
CREATE TRIGGER update_citas_agendadas_updated_at
  BEFORE UPDATE ON public.citas_agendadas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para mejorar rendimiento
CREATE INDEX idx_citas_agendadas_fecha ON public.citas_agendadas(fecha);
CREATE INDEX idx_citas_agendadas_sucursal ON public.citas_agendadas(sucursal);
CREATE INDEX idx_citas_agendadas_profesional ON public.citas_agendadas(profesional);
CREATE INDEX idx_citas_agendadas_cliente ON public.citas_agendadas(cliente);
CREATE INDEX idx_citas_agendadas_estado ON public.citas_agendadas(estado);