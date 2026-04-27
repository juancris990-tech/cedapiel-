-- Actualizar función actualizar_fecha_ultima_visita para usar nuevos estados
CREATE OR REPLACE FUNCTION public.actualizar_fecha_ultima_visita()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.estado IN ('finalizada', 'en_atencion') THEN
    UPDATE public.clientes
    SET fecha_ultima_visita = NEW.fecha
    WHERE id = NEW.id_cliente
      AND (fecha_ultima_visita IS NULL OR fecha_ultima_visita < NEW.fecha);
  END IF;
  RETURN NEW;
END;
$$;

-- Actualizar función validar_cambio_estado para usar nuevos estados
CREATE OR REPLACE FUNCTION public.validar_cambio_estado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.estado IS DISTINCT FROM NEW.estado THEN
    -- Validación básica: permitir cualquier transición desde los estados antiguos para migración
    IF OLD.estado IN ('reservada', 'presentado', 'completada', 'no_show', 'cancelada_cliente', 'cancelada_clinica') THEN
      -- Permitir transición desde estados antiguos a nuevos
      RETURN NEW;
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
$$;

-- Eliminar el trigger antiguo de validación para evitar conflictos con el nuevo
DROP TRIGGER IF EXISTS trigger_validar_transicion ON public.agendas;