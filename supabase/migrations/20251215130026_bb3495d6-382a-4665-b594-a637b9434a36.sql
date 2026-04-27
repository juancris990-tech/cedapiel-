CREATE OR REPLACE FUNCTION public.puede_cambiar_estado_cita(_user_id uuid, _cita_id bigint, _estado_actual cita_estado_enum, _estado_nuevo cita_estado_enum)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  
  -- Admin, dirección y admin_rrhh pueden todo
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
  
  -- Gerencia puede todo en su sucursal
  IF _es_gerencia THEN
    IF _user_sucursal_id IS NULL OR _cita_sucursal_id = _user_sucursal_id THEN
      RETURN TRUE;
    END IF;
    RETURN FALSE;
  END IF;
  
  -- Recepción (nuevos estados)
  IF _es_recepcion THEN
    -- Verificar sucursal
    IF _user_sucursal_id IS NOT NULL AND _cita_sucursal_id != _user_sucursal_id THEN
      RETURN FALSE;
    END IF;
    
    -- Transiciones permitidas para recepción (nuevos estados)
    IF (_estado_actual = 'agendada' AND _estado_nuevo IN ('confirmada', 'cancelada')) OR
       (_estado_actual = 'confirmada' AND _estado_nuevo IN ('en_atencion', 'cancelada', 'no_asiste')) OR
       (_estado_actual = 'en_atencion' AND _estado_nuevo = 'cancelada') OR
       -- Legacy states support
       (_estado_actual = 'reservada' AND _estado_nuevo IN ('confirmada', 'cancelada_cliente', 'cancelada_clinica', 'no_show')) OR
       (_estado_actual = 'confirmada' AND _estado_nuevo IN ('llego_paciente', 'cancelada_cliente', 'cancelada_clinica', 'no_show')) OR
       (_estado_actual = 'llego_paciente' AND _estado_nuevo = 'cancelada_clinica') THEN
      RETURN TRUE;
    END IF;
    RETURN FALSE;
  END IF;
  
  -- Profesional (solo sus propias citas)
  IF _es_profesional THEN
    SELECT id INTO _empleado_id
    FROM public.empleados
    WHERE email = (SELECT email FROM auth.users WHERE id = _user_id);
    
    IF _empleado_id = _cita_empleado_id THEN
      -- Nuevos estados: en_atencion -> finalizada
      IF _estado_actual = 'en_atencion' AND _estado_nuevo = 'finalizada' THEN
        RETURN TRUE;
      END IF;
      -- Legacy: llego_paciente -> asistida
      IF _estado_actual = 'llego_paciente' AND _estado_nuevo = 'asistida' THEN
        RETURN TRUE;
      END IF;
    END IF;
    RETURN FALSE;
  END IF;
  
  RETURN FALSE;
END;
$function$;