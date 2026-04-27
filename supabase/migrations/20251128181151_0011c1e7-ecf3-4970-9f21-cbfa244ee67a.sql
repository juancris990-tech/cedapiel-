-- Agregar tablas relacionadas a realtime para actualización automática de ventas
ALTER PUBLICATION supabase_realtime ADD TABLE venta_items;
ALTER PUBLICATION supabase_realtime ADD TABLE pagos;
ALTER PUBLICATION supabase_realtime ADD TABLE aplicacion_anticipo;