-- ============================================
-- MIGRACIÓN: Sistema de Estados Extendidos de Citas (v7 - RESUELTA)
-- ============================================

-- 1. Eliminar TODAS las vistas
DROP VIEW IF EXISTS vw_no_show_rate CASCADE;
DROP VIEW IF EXISTS vw_ocupacion_cabinas CASCADE;
DROP VIEW IF EXISTS vw_productividad_profesional CASCADE;
DROP VIEW IF EXISTS vw_ingresos_diarios CASCADE;
DROP VIEW IF EXISTS vw_tiempos_ciclo CASCADE;
DROP VIEW IF EXISTS vw_operacion_clinica CASCADE;
DROP VIEW IF EXISTS vw_productividad_empleado CASCADE;
DROP VIEW IF EXISTS vw_resumen_ejecutivo CASCADE;
DROP VIEW IF EXISTS vw_rentabilidad_sucursal CASCADE;
DROP VIEW IF EXISTS vw_comparativo_financiero CASCADE;
DROP VIEW IF EXISTS vw_anticipos_pendientes CASCADE;
DROP VIEW IF EXISTS vw_clientes_ausentes CASCADE;
DROP VIEW IF EXISTS vw_ingresos_diferidos CASCADE;
DROP VIEW IF EXISTS vw_clientes_recompra CASCADE;
DROP VIEW IF EXISTS vw_clientes_no_retenidos CASCADE;
DROP VIEW IF EXISTS vw_clientes_saldos CASCADE;
DROP VIEW IF EXISTS vw_clientes_duplicados CASCADE;
DROP VIEW IF EXISTS vw_clientes_eliminados CASCADE;
DROP VIEW IF EXISTS vw_parametros_activos CASCADE;
DROP VIEW IF EXISTS vw_reporte_caducidad CASCADE;
DROP VIEW IF EXISTS vw_reporte_stock_minimo CASCADE;
DROP VIEW IF EXISTS vw_satisfaccion CASCADE;
DROP VIEW IF EXISTS vw_usuarios_sistema CASCADE;
DROP VIEW IF EXISTS vw_ventas_desglose CASCADE;

-- 2. Eliminar funciones que dependen del enum
DROP FUNCTION IF EXISTS public.validar_transicion_estado(cita_estado_enum, cita_estado_enum);
DROP FUNCTION IF EXISTS public.puede_cambiar_estado_cita(uuid, bigint, cita_estado_enum, cita_estado_enum);

-- 3. Eliminar el valor por defecto
ALTER TABLE public.agendas 
  ALTER COLUMN estado DROP DEFAULT;

-- 4. Renombrar el enum
ALTER TYPE cita_estado_enum RENAME TO cita_estado_enum_old;

-- 5. Crear el nuevo enum
CREATE TYPE cita_estado_enum AS ENUM (
  'reservada',
  'confirmada',
  'llego_paciente',
  'asistida',
  'no_show',
  'cancelada_cliente',
  'cancelada_clinica'
);

-- 6. Actualizar la columna estado en agendas
ALTER TABLE public.agendas 
  ALTER COLUMN estado TYPE cita_estado_enum 
  USING (
    CASE estado::text
      WHEN 'agendada' THEN 'reservada'::cita_estado_enum
      WHEN 'confirmada' THEN 'confirmada'::cita_estado_enum
      WHEN 'presentado' THEN 'llego_paciente'::cita_estado_enum
      WHEN 'completada' THEN 'asistida'::cita_estado_enum
      WHEN 'cancelada' THEN 'cancelada_cliente'::cita_estado_enum
      WHEN 'no_show' THEN 'no_show'::cita_estado_enum
      ELSE 'reservada'::cita_estado_enum
    END
  );

-- 7. Establecer el nuevo valor por defecto
ALTER TABLE public.agendas 
  ALTER COLUMN estado SET DEFAULT 'reservada'::cita_estado_enum;

-- 8. Actualizar el historial de estados
ALTER TABLE public.citas_historial_estado
  ALTER COLUMN estado_anterior TYPE cita_estado_enum
  USING (
    CASE estado_anterior::text
      WHEN 'agendada' THEN 'reservada'::cita_estado_enum
      WHEN 'confirmada' THEN 'confirmada'::cita_estado_enum
      WHEN 'presentado' THEN 'llego_paciente'::cita_estado_enum
      WHEN 'completada' THEN 'asistida'::cita_estado_enum
      WHEN 'cancelada' THEN 'cancelada_cliente'::cita_estado_enum
      WHEN 'no_show' THEN 'no_show'::cita_estado_enum
      ELSE NULL
    END
  );

ALTER TABLE public.citas_historial_estado
  ALTER COLUMN estado_nuevo TYPE cita_estado_enum
  USING (
    CASE estado_nuevo::text
      WHEN 'agendada' THEN 'reservada'::cita_estado_enum
      WHEN 'confirmada' THEN 'confirmada'::cita_estado_enum
      WHEN 'presentado' THEN 'llego_paciente'::cita_estado_enum
      WHEN 'completada' THEN 'asistida'::cita_estado_enum
      WHEN 'cancelada' THEN 'cancelada_cliente'::cita_estado_enum
      WHEN 'no_show' THEN 'no_show'::cita_estado_enum
      ELSE 'reservada'::cita_estado_enum
    END
  );

-- 9. Eliminar el enum antiguo
DROP TYPE cita_estado_enum_old;

-- 10. Agregar nuevos campos
ALTER TABLE public.agendas
  ADD COLUMN IF NOT EXISTS confirmacion_timestamp TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS checkin_timestamp TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS cerrada_por_usuario UUID REFERENCES auth.users(id);

-- 11. Recrear función de validación de transiciones
CREATE OR REPLACE FUNCTION public.validar_transicion_estado(
  estado_actual cita_estado_enum, 
  estado_nuevo cita_estado_enum
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE
    WHEN estado_actual = 'reservada' THEN 
      estado_nuevo IN ('confirmada', 'cancelada_cliente', 'cancelada_clinica', 'no_show')
    WHEN estado_actual = 'confirmada' THEN 
      estado_nuevo IN ('llego_paciente', 'cancelada_cliente', 'cancelada_clinica', 'no_show')
    WHEN estado_actual = 'llego_paciente' THEN 
      estado_nuevo IN ('asistida', 'cancelada_clinica')
    WHEN estado_actual IN ('asistida', 'no_show', 'cancelada_cliente', 'cancelada_clinica') THEN
      FALSE
    ELSE FALSE
  END;
END;
$$;

-- 12. Recrear función de permisos
CREATE OR REPLACE FUNCTION public.puede_cambiar_estado_cita(
  _user_id uuid,
  _cita_id bigint,
  _estado_actual cita_estado_enum,
  _estado_nuevo cita_estado_enum
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _es_admin BOOLEAN;
  _es_gerencia BOOLEAN;
  _es_direccion BOOLEAN;
  _es_admin_rrhh BOOLEAN;
  _es_recepcion BOOLEAN;
  _es_profesional BOOLEAN;
  _empleado_id BIGINT;
  _cita_empleado_id BIGINT;
  _cita_sucursal_id BIGINT;
  _user_sucursal_id BIGINT;
BEGIN
  _es_admin := public.has_role(_user_id, 'admin');
  _es_gerencia := public.has_role(_user_id, 'gerencia');
  _es_direccion := public.has_role(_user_id, 'direccion');
  _es_admin_rrhh := public.has_role(_user_id, 'admin_rrhh');
  _es_recepcion := public.has_role(_user_id, 'recepcion');
  _es_profesional := public.has_role(_user_id, 'profesional');
  
  IF _es_admin OR _es_direccion OR _es_admin_rrhh THEN
    RETURN TRUE;
  END IF;
  
  SELECT id_empleado, id_sucursal 
  INTO _cita_empleado_id, _cita_sucursal_id
  FROM public.agendas
  WHERE id = _cita_id;
  
  SELECT id_sucursal INTO _user_sucursal_id
  FROM public.profiles
  WHERE id = _user_id;
  
  IF _es_gerencia THEN
    IF _user_sucursal_id IS NULL OR _cita_sucursal_id = _user_sucursal_id THEN
      RETURN TRUE;
    END IF;
    RETURN FALSE;
  END IF;
  
  IF _es_recepcion THEN
    IF _user_sucursal_id IS NOT NULL AND _cita_sucursal_id != _user_sucursal_id THEN
      RETURN FALSE;
    END IF;
    
    IF (_estado_actual = 'reservada' AND _estado_nuevo IN ('confirmada', 'cancelada_cliente', 'cancelada_clinica', 'no_show')) OR
       (_estado_actual = 'confirmada' AND _estado_nuevo IN ('llego_paciente', 'cancelada_cliente', 'cancelada_clinica', 'no_show')) OR
       (_estado_actual = 'llego_paciente' AND _estado_nuevo = 'cancelada_clinica') THEN
      RETURN TRUE;
    END IF;
    RETURN FALSE;
  END IF;
  
  IF _es_profesional THEN
    SELECT id INTO _empleado_id
    FROM public.empleados
    WHERE email = (SELECT email FROM auth.users WHERE id = _user_id);
    
    IF _empleado_id = _cita_empleado_id THEN
      IF _estado_actual = 'llego_paciente' AND _estado_nuevo = 'asistida' THEN
        RETURN TRUE;
      END IF;
    END IF;
    RETURN FALSE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- 13. Recrear vw_no_show_rate
CREATE OR REPLACE VIEW vw_no_show_rate AS
SELECT 
  c.id AS id_cliente,
  c.nombre,
  c.apellidos,
  COUNT(*) FILTER (WHERE a.estado = 'no_show' AND a.fecha >= CURRENT_DATE - INTERVAL '90 days') as no_shows_90_dias,
  COUNT(*) FILTER (WHERE a.estado IN ('cancelada_cliente', 'cancelada_clinica') AND a.fecha >= CURRENT_DATE - INTERVAL '90 days') as cancelaciones_90_dias,
  COUNT(*) FILTER (WHERE a.fecha >= CURRENT_DATE - INTERVAL '90 days') as total_citas_90_dias,
  CASE
    WHEN COUNT(*) FILTER (WHERE a.estado = 'no_show' AND a.fecha >= CURRENT_DATE - INTERVAL '90 days') >= 2 THEN 'ALTO'
    WHEN COUNT(*) FILTER (WHERE a.estado = 'no_show' AND a.fecha >= CURRENT_DATE - INTERVAL '90 days') = 1 
      OR COUNT(*) FILTER (WHERE a.estado IN ('cancelada_cliente', 'cancelada_clinica') AND a.fecha >= CURRENT_DATE - INTERVAL '90 days') >= 3 THEN 'MEDIO'
    ELSE 'BAJO'
  END as riesgo_no_show
FROM public.clientes c
LEFT JOIN public.agendas a ON a.id_cliente = c.id
WHERE c.activo = true
GROUP BY c.id, c.nombre, c.apellidos;

-- 14. Recrear vw_ocupacion_cabinas
CREATE OR REPLACE VIEW vw_ocupacion_cabinas AS
SELECT 
  a.fecha,
  a.id_sucursal,
  s.nombre as sucursal_nombre,
  COUNT(*) as total_citas,
  COUNT(*) FILTER (WHERE a.estado = 'asistida') as citas_atendidas,
  COUNT(*) FILTER (WHERE a.estado IN ('cancelada_cliente', 'cancelada_clinica')) as citas_canceladas,
  COUNT(*) FILTER (WHERE a.estado = 'no_show') as no_shows,
  ROUND(COUNT(*) FILTER (WHERE a.estado = 'asistida')::numeric / NULLIF(COUNT(*), 0) * 100, 2) as porcentaje_ocupacion
FROM public.agendas a
JOIN public.sucursales s ON s.id = a.id_sucursal
GROUP BY a.fecha, a.id_sucursal, s.nombre;

-- 15. Recrear vw_tiempos_ciclo
CREATE OR REPLACE VIEW vw_tiempos_ciclo AS
SELECT 
  a.id,
  a.fecha,
  a.id_sucursal,
  a.id_empleado,
  a.id_cliente,
  a.estado,
  a.confirmacion_timestamp,
  a.checkin_timestamp,
  a.check_in_at,
  a.check_out_at,
  CASE 
    WHEN a.checkin_timestamp IS NOT NULL AND a.confirmacion_timestamp IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (a.checkin_timestamp - a.confirmacion_timestamp)) / 60
    ELSE NULL
  END as minutos_confirmacion_a_llegada,
  CASE 
    WHEN a.check_out_at IS NOT NULL AND a.checkin_timestamp IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (a.check_out_at - a.checkin_timestamp)) / 60
    ELSE NULL
  END as minutos_llegada_a_atencion
FROM public.agendas a
WHERE a.estado IN ('asistida', 'llego_paciente');