-- Crear tabla para ventas por categoría de servicio
CREATE TABLE IF NOT EXISTS public.ventas_por_categoria_servicio (
  id BIGSERIAL PRIMARY KEY,
  categoria_servicio TEXT NOT NULL,
  cantidad_servicios INTEGER NOT NULL DEFAULT 0,
  porcentaje_participacion NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.ventas_por_categoria_servicio ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuarios autenticados pueden leer ventas por categoría"
  ON public.ventas_por_categoria_servicio
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin y gerencia pueden crear ventas por categoría"
  ON public.ventas_por_categoria_servicio
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'gerencia') OR 
    has_role(auth.uid(), 'direccion')
  );

CREATE POLICY "Admin y gerencia pueden actualizar ventas por categoría"
  ON public.ventas_por_categoria_servicio
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'gerencia') OR 
    has_role(auth.uid(), 'direccion')
  );

CREATE POLICY "Solo admin puede eliminar ventas por categoría"
  ON public.ventas_por_categoria_servicio
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Índices para mejorar consultas
CREATE INDEX idx_ventas_categoria_servicio ON public.ventas_por_categoria_servicio(categoria_servicio);
CREATE INDEX idx_ventas_categoria_cantidad ON public.ventas_por_categoria_servicio(cantidad_servicios DESC);
CREATE INDEX idx_ventas_categoria_porcentaje ON public.ventas_por_categoria_servicio(porcentaje_participacion DESC);