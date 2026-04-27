-- Agregar columna id_producto a venta_items para soportar productos
ALTER TABLE public.venta_items 
ADD COLUMN id_producto BIGINT REFERENCES public.productos(id);