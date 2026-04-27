-- Crear tabla para citas canceladas
CREATE TABLE IF NOT EXISTS public.citas_canceladas (
  id BIGSERIAL PRIMARY KEY,
  fecha_cita DATE NOT NULL,
  cliente VARCHAR NOT NULL,
  email VARCHAR,
  telefono VARCHAR,
  numero_sms VARCHAR,
  sucursal VARCHAR NOT NULL,
  estado VARCHAR,
  fecha_creacion TIMESTAMP,
  staff_registro VARCHAR,
  hora_inicio TIME,
  hora_fin TIME,
  profesional VARCHAR,
  servicio VARCHAR,
  equipo VARCHAR,
  retenido BOOLEAN DEFAULT false,
  reagendado BOOLEAN DEFAULT false,
  facturado BOOLEAN DEFAULT false,
  valor_mxn NUMERIC(10, 2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Crear índices para mejorar búsquedas
CREATE INDEX idx_citas_canceladas_fecha ON public.citas_canceladas(fecha_cita);
CREATE INDEX idx_citas_canceladas_sucursal ON public.citas_canceladas(sucursal);
CREATE INDEX idx_citas_canceladas_profesional ON public.citas_canceladas(profesional);
CREATE INDEX idx_citas_canceladas_cliente ON public.citas_canceladas(cliente);
CREATE INDEX idx_citas_canceladas_estado ON public.citas_canceladas(estado);

-- Habilitar RLS
ALTER TABLE public.citas_canceladas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuarios autenticados pueden leer citas canceladas"
  ON public.citas_canceladas
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin y gerencia pueden crear citas canceladas"
  ON public.citas_canceladas
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'gerencia') OR 
    has_role(auth.uid(), 'direccion')
  );

CREATE POLICY "Admin y gerencia pueden actualizar citas canceladas"
  ON public.citas_canceladas
  FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'gerencia') OR 
    has_role(auth.uid(), 'direccion')
  );

CREATE POLICY "Solo admin puede eliminar citas canceladas"
  ON public.citas_canceladas
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Trigger para updated_at
CREATE TRIGGER update_citas_canceladas_updated_at
  BEFORE UPDATE ON public.citas_canceladas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();