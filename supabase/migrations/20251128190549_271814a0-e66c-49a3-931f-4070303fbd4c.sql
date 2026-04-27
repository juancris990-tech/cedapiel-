-- Enable realtime for sales tables (tables already in publication)
ALTER TABLE public.ventas REPLICA IDENTITY FULL;
ALTER TABLE public.venta_items REPLICA IDENTITY FULL;