CREATE OR REPLACE FUNCTION public.validar_cambio_estado()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.estado IS DISTINCT FROM NEW.estado THEN
    -- Permitir transiciones desde estados antiguos (legacy) para migración
    IF OLD.estado IN ('reservada', 'presentado', 'completada', 'no_show', 'cancelada_cliente', 'cancelada_clinica', 'llego_paciente', 'asistida') THEN
      RETURN NEW;
    END IF;
    
    -- Validar transiciones para nuevos estados
    IF OLD.estado = 'agendada' AND NEW.estado NOT IN ('confirmada', 'cancelada') THEN
      RAISE EXCEPTION 'Transición inválida de % a %', OLD.estado, NEW.estado;
    END IF;
    
    IF OLD.estado = 'confirmada' AND NEW.estado NOT IN ('en_atencion', 'cancelada', 'no_asiste') THEN
      RAISE EXCEPTION 'Transición inválida de % a %', OLD.estado, NEW.estado;
    END IF;
    
    IF OLD.estado = 'en_atencion' AND NEW.estado NOT IN ('finalizada', 'cancelada') THEN
      RAISE EXCEPTION 'Transición inválida de % a %', OLD.estado, NEW.estado;
    END IF;
    
    IF OLD.estado IN ('finalizada', 'cancelada', 'no_asiste') THEN
      RAISE EXCEPTION 'No se puede cambiar el estado de una cita %', OLD.estado;
    END IF;
    
    -- Si cambia a 'en_atencion', registrar check_in
    IF NEW.estado = 'en_atencion' AND NEW.check_in_at IS NULL THEN
      NEW.check_in_at := now();
    END IF;
    
    -- Si cambia a 'finalizada', registrar check_out
    IF NEW.estado = 'finalizada' AND NEW.check_out_at IS NULL THEN
      NEW.check_out_at := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;