-- Crear tabla daysheet_citas para reportes de citas diarias
CREATE TABLE IF NOT EXISTS public.daysheet_citas (
  id BIGSERIAL PRIMARY KEY,
  fecha TEXT NOT NULL,
  cliente TEXT NOT NULL,
  telefono TEXT,
  recurso TEXT,
  simbolo TEXT,
  horario TEXT NOT NULL,
  estado TEXT NOT NULL,
  profesional TEXT,
  servicio TEXT,
  equipo TEXT,
  sucursal TEXT NOT NULL,
  precio_mxn NUMERIC(10,2) DEFAULT 0,
  notas_alertas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Crear índices para mejorar rendimiento en consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_daysheet_fecha ON public.daysheet_citas(fecha);
CREATE INDEX IF NOT EXISTS idx_daysheet_cliente ON public.daysheet_citas(cliente);
CREATE INDEX IF NOT EXISTS idx_daysheet_profesional ON public.daysheet_citas(profesional);
CREATE INDEX IF NOT EXISTS idx_daysheet_sucursal ON public.daysheet_citas(sucursal);
CREATE INDEX IF NOT EXISTS idx_daysheet_estado ON public.daysheet_citas(estado);
CREATE INDEX IF NOT EXISTS idx_daysheet_servicio ON public.daysheet_citas(servicio);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_daysheet_citas_updated_at
  BEFORE UPDATE ON public.daysheet_citas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.daysheet_citas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuarios autenticados pueden leer daysheet_citas"
  ON public.daysheet_citas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin y gerencia pueden crear daysheet_citas"
  ON public.daysheet_citas FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'gerencia') OR 
    has_role(auth.uid(), 'direccion')
  );

CREATE POLICY "Admin y gerencia pueden actualizar daysheet_citas"
  ON public.daysheet_citas FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'gerencia') OR 
    has_role(auth.uid(), 'direccion')
  );

CREATE POLICY "Solo admin puede eliminar daysheet_citas"
  ON public.daysheet_citas FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));