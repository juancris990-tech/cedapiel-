-- Crear tabla agregada de clientes
CREATE TABLE IF NOT EXISTS public.clientes_agregados (
  cliente_id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR NOT NULL UNIQUE,
  primera_cita DATE,
  ultima_cita DATE,
  total_citas INTEGER DEFAULT 0,
  total_facturado NUMERIC(10,2) DEFAULT 0,
  es_recurrente BOOLEAN DEFAULT false,
  es_nuevo BOOLEAN DEFAULT false,
  telefono VARCHAR,
  email VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_clientes_agregados_nombre ON public.clientes_agregados(nombre);
CREATE INDEX idx_clientes_agregados_primera_cita ON public.clientes_agregados(primera_cita);
CREATE INDEX idx_clientes_agregados_es_recurrente ON public.clientes_agregados(es_recurrente);
CREATE INDEX idx_clientes_agregados_es_nuevo ON public.clientes_agregados(es_nuevo);

-- Función para actualizar la tabla agregada desde facturacion_detalle
CREATE OR REPLACE FUNCTION public.actualizar_clientes_agregados()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Limpiar tabla
  TRUNCATE public.clientes_agregados;
  
  -- Insertar datos agregados
  INSERT INTO public.clientes_agregados (
    nombre,
    primera_cita,
    ultima_cita,
    total_citas,
    total_facturado,
    es_recurrente,
    es_nuevo
  )
  SELECT 
    fd.cliente AS nombre,
    MIN(fd.fecha) AS primera_cita,
    MAX(fd.fecha) AS ultima_cita,
    COUNT(DISTINCT fd.fecha) AS total_citas,
    COALESCE(SUM(CASE 
      WHEN fd.tipo IN ('Appointment', 'Service', 'Product') AND fd.monto_total_mxn > 0 
      THEN fd.monto_total_mxn 
      ELSE 0 
    END), 0) AS total_facturado,
    COUNT(DISTINCT fd.fecha) > 1 AS es_recurrente,
    COUNT(DISTINCT fd.fecha) = 1 AS es_nuevo
  FROM public.facturacion_detalle fd
  GROUP BY fd.cliente
  ORDER BY nombre;
END;
$$;

-- RLS Policies
ALTER TABLE public.clientes_agregados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer clientes agregados"
  ON public.clientes_agregados
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin y gerencia pueden actualizar clientes agregados"
  ON public.clientes_agregados
  FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'gerencia') OR 
    has_role(auth.uid(), 'direccion')
  );

CREATE POLICY "Admin y gerencia pueden insertar clientes agregados"
  ON public.clientes_agregados
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'gerencia') OR 
    has_role(auth.uid(), 'direccion')
  );

CREATE POLICY "Solo admin puede eliminar clientes agregados"
  ON public.clientes_agregados
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Trigger para actualizar updated_at
CREATE TRIGGER update_clientes_agregados_updated_at
  BEFORE UPDATE ON public.clientes_agregados
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();