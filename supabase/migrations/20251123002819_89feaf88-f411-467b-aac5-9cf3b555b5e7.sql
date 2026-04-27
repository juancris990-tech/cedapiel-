-- Agregar columna tipo a proyeccion_valor_futuro
ALTER TABLE public.proyeccion_valor_futuro
ADD COLUMN tipo TEXT NOT NULL DEFAULT 'profesional'
CHECK (tipo IN ('profesional', 'sucursal', 'servicio'));

-- Crear índice para filtrado por tipo
CREATE INDEX idx_proyeccion_tipo ON public.proyeccion_valor_futuro(tipo);

-- Comentario explicativo
COMMENT ON COLUMN public.proyeccion_valor_futuro.tipo IS 'Tipo de registro: profesional, sucursal o servicio';