-- Enable realtime for dashboard tables
ALTER TABLE public.daysheet_citas REPLICA IDENTITY FULL;
ALTER TABLE public.facturacion_detalle REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.daysheet_citas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.facturacion_detalle;