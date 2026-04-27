-- ============================================
-- RECREAR VISTAS ESENCIALES ELIMINADAS
-- ============================================

-- 1. Recrear vw_clientes_saldos
CREATE OR REPLACE VIEW vw_clientes_saldos AS
SELECT 
  c.id AS id_cliente,
  c.nombre,
  c.apellidos,
  c.email,
  c.telefono,
  c.saldo_favor,
  c.saldo_contra,
  (c.saldo_favor - c.saldo_contra) as saldo_neto,
  c.fecha_ultima_visita
FROM public.clientes c
WHERE c.activo = true;

-- 2. Recrear vw_clientes_duplicados
CREATE OR REPLACE VIEW vw_clientes_duplicados AS
SELECT 
  c1.id AS id_cliente_1,
  c2.id AS id_cliente_2,
  c1.nombre,
  c1.apellidos,
  c1.telefono,
  c1.email,
  c1.fecha_alta AS fecha_alta_1,
  c2.fecha_alta AS fecha_alta_2,
  'telefono' AS criterio_duplicado
FROM public.clientes c1
JOIN public.clientes c2 ON c1.telefono = c2.telefono AND c1.id < c2.id
WHERE c1.activo = true AND c2.activo = true AND c1.telefono IS NOT NULL
UNION ALL
SELECT 
  c1.id AS id_cliente_1,
  c2.id AS id_cliente_2,
  c1.nombre,
  c1.apellidos,
  c1.telefono,
  c1.email,
  c1.fecha_alta AS fecha_alta_1,
  c2.fecha_alta AS fecha_alta_2,
  'email' AS criterio_duplicado
FROM public.clientes c1
JOIN public.clientes c2 ON c1.email = c2.email AND c1.id < c2.id
WHERE c1.activo = true AND c2.activo = true AND c1.email IS NOT NULL;

-- 3. Recrear vw_clientes_eliminados
CREATE OR REPLACE VIEW vw_clientes_eliminados AS
SELECT 
  id,
  id_cliente_original,
  nombre,
  apellidos,
  email,
  telefono,
  fecha_eliminacion,
  motivo_eliminacion,
  usuario_responsable,
  datos_completos
FROM public.clientes_eliminados
ORDER BY fecha_eliminacion DESC;

-- 4. Recrear vw_clientes_ausentes
CREATE OR REPLACE VIEW vw_clientes_ausentes AS
SELECT 
  c.id AS id_cliente,
  c.nombre,
  c.apellidos,
  c.email,
  c.telefono,
  c.fecha_ultima_visita,
  CURRENT_DATE - c.fecha_ultima_visita AS dias_desde_ultima_visita,
  COUNT(a.id) as total_citas_historicas
FROM public.clientes c
LEFT JOIN public.agendas a ON a.id_cliente = c.id
WHERE c.activo = true
  AND c.fecha_ultima_visita < CURRENT_DATE - INTERVAL '90 days'
GROUP BY c.id, c.nombre, c.apellidos, c.email, c.telefono, c.fecha_ultima_visita;

-- 5. Recrear vw_clientes_no_retenidos
CREATE OR REPLACE VIEW vw_clientes_no_retenidos AS
SELECT 
  c.id AS id_cliente,
  c.nombre,
  c.apellidos,
  c.email,
  c.telefono,
  c.fecha_alta,
  c.fecha_ultima_visita,
  COUNT(a.id) as total_citas
FROM public.clientes c
LEFT JOIN public.agendas a ON a.id_cliente = c.id
WHERE c.activo = true
  AND c.fecha_alta < CURRENT_DATE - INTERVAL '30 days'
GROUP BY c.id, c.nombre, c.apellidos, c.email, c.telefono, c.fecha_alta, c.fecha_ultima_visita
HAVING COUNT(a.id) = 1;

-- 6. Recrear vw_clientes_recompra
CREATE OR REPLACE VIEW vw_clientes_recompra AS
SELECT 
  c.id AS id_cliente,
  c.nombre,
  c.apellidos,
  c.email,
  c.telefono,
  c.fecha_ultima_visita,
  COUNT(a.id) as total_citas,
  COUNT(a.id) FILTER (WHERE a.fecha >= CURRENT_DATE - INTERVAL '30 days') as citas_ultimo_mes,
  COUNT(a.id) FILTER (WHERE a.fecha >= CURRENT_DATE - INTERVAL '90 days') as citas_ultimo_trimestre
FROM public.clientes c
LEFT JOIN public.agendas a ON a.id_cliente = c.id AND a.estado = 'asistida'
WHERE c.activo = true
GROUP BY c.id, c.nombre, c.apellidos, c.email, c.telefono, c.fecha_ultima_visita
HAVING COUNT(a.id) >= 2;

-- 7. Recrear vw_productividad_empleado  
CREATE OR REPLACE VIEW vw_productividad_empleado AS
SELECT 
  e.id AS id_empleado,
  e.nombre || ' ' || COALESCE(e.apellidos, '') AS empleado_nombre,
  e.id_sucursal,
  s.nombre AS sucursal_nombre,
  COUNT(a.id) FILTER (WHERE a.estado = 'asistida' AND a.fecha >= CURRENT_DATE - INTERVAL '30 days') as citas_completadas_mes,
  SUM(ser.precio) FILTER (WHERE a.estado = 'asistida' AND a.fecha >= CURRENT_DATE - INTERVAL '30 days') as ingresos_reconocidos_mxn,
  SUM(ser.duracion_minutos) FILTER (WHERE a.estado = 'asistida' AND a.fecha >= CURRENT_DATE - INTERVAL '30 days') as minutos_productivos,
  ROUND(SUM(ser.duracion_minutos) FILTER (WHERE a.estado = 'asistida' AND a.fecha >= CURRENT_DATE - INTERVAL '30 days') / 60.0, 2) as horas_trabajadas,
  0 as comision_mxn
FROM public.empleados e
LEFT JOIN public.sucursales s ON s.id = e.id_sucursal
LEFT JOIN public.agendas a ON a.id_empleado = e.id
LEFT JOIN public.servicios ser ON ser.id = a.id_servicio
WHERE e.activo = true AND e.es_profesional = true
GROUP BY e.id, e.nombre, e.apellidos, e.id_sucursal, s.nombre;