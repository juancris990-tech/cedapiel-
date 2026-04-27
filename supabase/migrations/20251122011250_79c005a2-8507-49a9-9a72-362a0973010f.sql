-- Create clientes_inactivos table
CREATE TABLE IF NOT EXISTS public.clientes_inactivos (
  id BIGSERIAL PRIMARY KEY,
  profesional VARCHAR(255) NOT NULL,
  cliente VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  numero_sms VARCHAR(50),
  telefono VARCHAR(50),
  ultima_cita TIMESTAMP,
  dias_sin_volver INTEGER,
  ultimo_servicio VARCHAR(255),
  estado VARCHAR(100),
  gasto_total_mxn NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_clientes_inactivos_profesional ON public.clientes_inactivos(profesional);
CREATE INDEX idx_clientes_inactivos_dias_sin_volver ON public.clientes_inactivos(dias_sin_volver);
CREATE INDEX idx_clientes_inactivos_ultima_cita ON public.clientes_inactivos(ultima_cita);
CREATE INDEX idx_clientes_inactivos_cliente ON public.clientes_inactivos(cliente);

-- Enable RLS
ALTER TABLE public.clientes_inactivos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Usuarios autenticados pueden leer clientes inactivos"
  ON public.clientes_inactivos
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin y gerencia pueden crear clientes inactivos"
  ON public.clientes_inactivos
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'gerencia') OR 
    has_role(auth.uid(), 'direccion')
  );

CREATE POLICY "Admin y gerencia pueden actualizar clientes inactivos"
  ON public.clientes_inactivos
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'gerencia') OR 
    has_role(auth.uid(), 'direccion')
  );

CREATE POLICY "Solo admin puede eliminar clientes inactivos"
  ON public.clientes_inactivos
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_clientes_inactivos_updated_at
  BEFORE UPDATE ON public.clientes_inactivos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();