-- Vista resumen ejecutivo consolidada
CREATE OR REPLACE VIEW vw_resumen_ejecutivo AS
WITH periodo_actual AS (
  SELECT 
    DATE_TRUNC('month', CURRENT_DATE) as mes,
    COUNT(DISTINCT a.id_cliente) as clientes_totales,
    COUNT(a.id) as total_citas,
    COUNT(CASE WHEN a.estado = 'completada' THEN 1 END) as citas_completadas,
    COUNT(CASE WHEN a.estado = 'no_show' THEN 1 END) as no_shows,
    COUNT(CASE WHEN a.estado = 'cancelada' THEN 1 END) as canceladas,
    a.id_sucursal,
    s.nombre as sucursal
  FROM agendas a
  JOIN sucursales s ON s.id = a.id_sucursal
  WHERE a.fecha >= DATE_TRUNC('month', CURRENT_DATE)
    AND a.fecha < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
  GROUP BY a.id_sucursal, s.nombre
),
facturacion_actual AS (
  SELECT
    v.id_sucursal,
    COUNT(v.id) as cantidad_ventas,
    SUM(v.total) as facturacion_total,
    AVG(v.total) as ticket_promedio
  FROM ventas v
  WHERE v.fecha >= DATE_TRUNC('month', CURRENT_DATE)
    AND v.fecha < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
  GROUP BY v.id_sucursal
),
retencion_calc AS (
  SELECT
    a.id_sucursal,
    COUNT(DISTINCT CASE 
      WHEN EXISTS (
        SELECT 1 FROM agendas a2 
        WHERE a2.id_cliente = a.id_cliente 
        AND a2.fecha < DATE_TRUNC('month', CURRENT_DATE)
      ) THEN a.id_cliente 
    END) as clientes_retenidos,
    COUNT(DISTINCT a.id_cliente) as total_clientes_periodo
  FROM agendas a
  WHERE a.fecha >= DATE_TRUNC('month', CURRENT_DATE)
    AND a.fecha < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
  GROUP BY a.id_sucursal
)
SELECT
  p.id_sucursal,
  p.sucursal,
  p.mes,
  p.clientes_totales,
  p.total_citas,
  p.citas_completadas,
  p.no_shows,
  p.canceladas,
  CASE 
    WHEN p.total_citas > 0 
    THEN ROUND((p.no_shows::numeric / p.total_citas * 100), 2)
    ELSE 0
  END as no_show_rate_porcentaje,
  CASE 
    WHEN p.total_citas > 0 
    THEN ROUND((p.citas_completadas::numeric / p.total_citas * 100), 2)
    ELSE 0
  END as tasa_completadas_porcentaje,
  COALESCE(f.facturacion_total, 0) as facturacion_total,
  COALESCE(f.ticket_promedio, 0) as ticket_promedio,
  COALESCE(f.cantidad_ventas, 0) as cantidad_ventas,
  CASE 
    WHEN r.total_clientes_periodo > 0 
    THEN ROUND((r.clientes_retenidos::numeric / r.total_clientes_periodo * 100), 2)
    ELSE 0
  END as tasa_retencion_porcentaje
FROM periodo_actual p
LEFT JOIN facturacion_actual f ON f.id_sucursal = p.id_sucursal
LEFT JOIN retencion_calc r ON r.id_sucursal = p.id_sucursal;

-- Vista operación clínica consolidada
CREATE OR REPLACE VIEW vw_operacion_clinica AS
WITH asistencia_mes AS (
  SELECT
    a.id_sucursal,
    s.nombre as sucursal,
    DATE_TRUNC('month', a.fecha) as mes,
    COUNT(a.id) as total_registros,
    SUM(a.horas_trabajadas) as total_horas_trabajadas,
    COUNT(DISTINCT a.id_empleado) as empleados_activos
  FROM asistencias a
  JOIN sucursales s ON s.id = a.id_sucursal
  WHERE a.fecha >= DATE_TRUNC('month', CURRENT_DATE)
    AND a.fecha < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
  GROUP BY a.id_sucursal, s.nombre, DATE_TRUNC('month', a.fecha)
),
citas_mes AS (
  SELECT
    ag.id_sucursal,
    DATE_TRUNC('month', ag.fecha) as mes,
    COUNT(ag.id) as total_citas,
    COUNT(CASE WHEN ag.estado = 'completada' THEN 1 END) as completadas,
    COUNT(CASE WHEN ag.estado = 'no_show' THEN 1 END) as no_shows,
    COUNT(CASE WHEN ag.estado = 'cancelada' THEN 1 END) as canceladas,
    SUM(COALESCE(serv.duracion_minutos, 30)) as minutos_programados
  FROM agendas ag
  LEFT JOIN servicios serv ON serv.id = ag.id_servicio
  WHERE ag.fecha >= DATE_TRUNC('month', CURRENT_DATE)
    AND ag.fecha < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
  GROUP BY ag.id_sucursal, DATE_TRUNC('month', ag.fecha)
),
satisfaccion_mes AS (
  SELECT
    e.id_sucursal,
    DATE_TRUNC('month', e.fecha_encuesta) as mes,
    COUNT(e.id) as total_encuestas,
    AVG(e.calificacion_servicio) as calificacion_servicio_promedio,
    AVG(e.calificacion_instalaciones) as calificacion_instalaciones_promedio,
    AVG(e.nps_score) as nps_promedio
  FROM encuestas_satisfaccion e
  WHERE e.fecha_encuesta >= DATE_TRUNC('month', CURRENT_DATE)
    AND e.fecha_encuesta < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
  GROUP BY e.id_sucursal, DATE_TRUNC('month', e.fecha_encuesta)
)
SELECT
  a.id_sucursal,
  a.sucursal,
  a.mes,
  COALESCE(a.total_registros, 0) as registros_asistencia,
  COALESCE(a.total_horas_trabajadas, 0) as horas_trabajadas_totales,
  COALESCE(a.empleados_activos, 0) as empleados_activos,
  COALESCE(c.total_citas, 0) as total_citas,
  COALESCE(c.completadas, 0) as citas_completadas,
  COALESCE(c.no_shows, 0) as no_shows,
  COALESCE(c.canceladas, 0) as citas_canceladas,
  CASE 
    WHEN c.total_citas > 0 
    THEN ROUND((c.no_shows::numeric / c.total_citas * 100), 2)
    ELSE 0
  END as no_show_rate_porcentaje,
  CASE 
    WHEN c.total_citas > 0 
    THEN ROUND((c.completadas::numeric / c.total_citas * 100), 2)
    ELSE 0
  END as tasa_completadas_porcentaje,
  COALESCE(c.minutos_programados, 0) as minutos_programados,
  -- Ocupación estimada (asumiendo 6 cabinas, 10 horas/día, 26 días/mes)
  CASE 
    WHEN (6 * 10 * 60 * 26) > 0 
    THEN ROUND((c.minutos_programados::numeric / (6 * 10 * 60 * 26) * 100), 2)
    ELSE 0
  END as porcentaje_ocupacion_estimado,
  COALESCE(sat.total_encuestas, 0) as encuestas_satisfaccion,
  COALESCE(sat.calificacion_servicio_promedio, 0) as calificacion_servicio_promedio,
  COALESCE(sat.calificacion_instalaciones_promedio, 0) as calificacion_instalaciones_promedio,
  COALESCE(sat.nps_promedio, 0) as nps_promedio
FROM asistencia_mes a
LEFT JOIN citas_mes c ON c.id_sucursal = a.id_sucursal AND c.mes = a.mes
LEFT JOIN satisfaccion_mes sat ON sat.id_sucursal = a.id_sucursal AND sat.mes = a.mes;

-- Asegurar que las vistas existentes permanezcan
-- Las vistas vw_clientes_recompra, vw_clientes_ausentes, vw_clientes_no_retenidos ya existen