-- Fix check constraint to allow borrador, cerrada, anulada states
ALTER TABLE public.ventas 
DROP CONSTRAINT IF EXISTS ventas_estado_venta_check;

ALTER TABLE public.ventas
ADD CONSTRAINT ventas_estado_venta_check 
CHECK (estado IN ('borrador', 'cerrada', 'anulada'));