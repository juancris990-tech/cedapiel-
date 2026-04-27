-- Habilitar realtime para la tabla ventas
ALTER TABLE public.ventas REPLICA IDENTITY FULL;

-- Crear vista de ventas con desglose si no existe
CREATE OR REPLACE VIEW public.vw_ventas_desglose AS
SELECT 
  v.id,
  v.fecha,
  v.total,
  v.estado_venta,
  v.monto_original_mxn as total_precio_original,
  v.monto_descuento_mxn as descuento,
  v.monto_final_mxn,
  COALESCE(v.monto_descuento_mxn * 100.0 / NULLIF(v.monto_original_mxn, 0), 0) as promedio_descuento_porcentaje,
  c.nombre || ' ' || COALESCE(c.apellidos, '') as cliente,
  s.nombre as sucursal,
  v.id_sucursal,
  v.id_cliente,
  COALESCE(
    (SELECT string_agg(DISTINCT p.metodo_pago, ', ')
     FROM pagos p
     WHERE p.id_venta = v.id AND p.aplicado_a_venta = true),
    'Sin pago'
  ) as metodos_pago
FROM public.ventas v
LEFT JOIN public.clientes c ON v.id_cliente = c.id
LEFT JOIN public.sucursales s ON v.id_sucursal = s.id
WHERE v.estado_venta IN ('cerrada', 'Completada')
ORDER BY v.fecha DESC;