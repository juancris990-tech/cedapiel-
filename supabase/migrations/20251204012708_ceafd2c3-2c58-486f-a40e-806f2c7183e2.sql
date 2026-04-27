-- Agregar columna de precio de venta a productos
ALTER TABLE public.productos
ADD COLUMN IF NOT EXISTS precio_venta_mxn numeric DEFAULT 0;

-- Comentario explicativo
COMMENT ON COLUMN public.productos.precio_venta_mxn IS 'Precio de venta al público en MXN';