-- Crear tabla para reporte de clientes
CREATE TABLE IF NOT EXISTS public.clientes_reporte (
  id BIGSERIAL PRIMARY KEY,
  nombre_completo TEXT NOT NULL,
  nombre TEXT,
  apellido TEXT,
  cliente_id BIGINT UNIQUE,
  telefono_movil TEXT,
  telefono TEXT,
  email TEXT,
  empresa TEXT,
  direccion_1 TEXT,
  direccion_2 TEXT,
  suburbio TEXT,
  ciudad TEXT,
  estado TEXT,
  codigo_postal TEXT,
  fecha_ultimo_servicio TIMESTAMP WITH TIME ZONE,
  profesional_ultimo_servicio TEXT,
  estado_ultima_cita TEXT,
  ultimo_servicio TEXT,
  ultima_cita_reservada_via TEXT,
  fecha_registro TIMESTAMP WITH TIME ZONE,
  es_vip BOOLEAN DEFAULT FALSE,
  cantidad_citas INTEGER DEFAULT 0,
  semanas_ausente INTEGER DEFAULT 0,
  fecha_nacimiento DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_clientes_reporte_nombre_completo ON public.clientes_reporte(nombre_completo);
CREATE INDEX IF NOT EXISTS idx_clientes_reporte_email ON public.clientes_reporte(email);
CREATE INDEX IF NOT EXISTS idx_clientes_reporte_telefono_movil ON public.clientes_reporte(telefono_movil);
CREATE INDEX IF NOT EXISTS idx_clientes_reporte_cliente_id ON public.clientes_reporte(cliente_id);
CREATE INDEX IF NOT EXISTS idx_clientes_reporte_es_vip ON public.clientes_reporte(es_vip);
CREATE INDEX IF NOT EXISTS idx_clientes_reporte_semanas_ausente ON public.clientes_reporte(semanas_ausente);
CREATE INDEX IF NOT EXISTS idx_clientes_reporte_profesional ON public.clientes_reporte(profesional_ultimo_servicio);
CREATE INDEX IF NOT EXISTS idx_clientes_reporte_ciudad ON public.clientes_reporte(ciudad);

-- Trigger para updated_at
CREATE TRIGGER update_clientes_reporte_updated_at
  BEFORE UPDATE ON public.clientes_reporte
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS policies
ALTER TABLE public.clientes_reporte ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer clientes_reporte"
  ON public.clientes_reporte
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin y gerencia pueden insertar clientes_reporte"
  ON public.clientes_reporte
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'gerencia') OR 
    has_role(auth.uid(), 'direccion')
  );

CREATE POLICY "Admin y gerencia pueden actualizar clientes_reporte"
  ON public.clientes_reporte
  FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'gerencia') OR 
    has_role(auth.uid(), 'direccion')
  );

CREATE POLICY "Solo admin puede eliminar clientes_reporte"
  ON public.clientes_reporte
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));