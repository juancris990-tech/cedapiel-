
-- Verificar si el trigger existe y recrearlo si es necesario
DROP TRIGGER IF EXISTS trigger_generar_comision_automatica ON libro_ingresos;

-- Recrear la función del trigger con mejor manejo de errores
CREATE OR REPLACE FUNCTION public.registrar_comision_automatica()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_regla RECORD;
  v_id_empleado BIGINT;
  v_id_servicio BIGINT;
  v_id_categoria BIGINT;
  v_base_mxn NUMERIC;
  v_porcentaje NUMERIC;
  v_comision_mxn NUMERIC;
  v_fecha_ingreso DATE;
  v_precio_final NUMERIC;
  v_comision_existente BIGINT;
BEGIN
  RAISE NOTICE 'Trigger activado para libro_ingresos.id=%, id_venta=%', NEW.id, NEW.id_venta;
  
  v_fecha_ingreso := NEW.fecha::date;
  
  IF NEW.id_venta IS NOT NULL THEN
    RAISE NOTICE 'Procesando venta %', NEW.id_venta;
    
    FOR v_item IN 
      SELECT 
        vi.id,
        vi.id_servicio,
        vi.id_empleado,
        vi.precio_final_mxn,
        vi.precio_unitario,
        vi.cantidad,
        s.id_categoria
      FROM venta_items vi
      LEFT JOIN servicios s ON s.id = vi.id_servicio
      WHERE vi.id_venta = NEW.id_venta
    LOOP
      RAISE NOTICE 'Procesando item=%, servicio=%, empleado=%', v_item.id, v_item.id_servicio, v_item.id_empleado;
      
      v_id_empleado := v_item.id_empleado;
      IF v_id_empleado IS NULL AND NEW.id_cita IS NOT NULL THEN
        SELECT id_empleado INTO v_id_empleado FROM agendas WHERE id = NEW.id_cita;
        RAISE NOTICE 'Empleado tomado de cita: %', v_id_empleado;
      END IF;
      
      IF v_id_empleado IS NULL THEN
        RAISE NOTICE 'Sin empleado para item, saltando';
        CONTINUE;
      END IF;
      
      v_id_servicio := v_item.id_servicio;
      v_id_categoria := v_item.id_categoria;
      v_precio_final := COALESCE(v_item.precio_final_mxn, v_item.precio_unitario);
      v_base_mxn := v_precio_final * COALESCE(v_item.cantidad, 1);
      
      RAISE NOTICE 'Base calculada: %', v_base_mxn;
      
      SELECT id INTO v_comision_existente
      FROM comisiones WHERE id_venta_item = v_item.id LIMIT 1;
      
      IF v_comision_existente IS NOT NULL THEN
        RAISE NOTICE 'Ya existe comisión para item, saltando';
        CONTINUE;
      END IF;
      
      SELECT * INTO v_regla
      FROM resolver_regla_comision(v_id_empleado, v_id_servicio, v_id_categoria, v_fecha_ingreso);
      
      IF FOUND THEN
        v_porcentaje := v_regla.porcentaje;
        v_comision_mxn := ROUND((v_base_mxn * v_porcentaje / 100)::numeric, 2);
        
        RAISE NOTICE 'Regla encontrada con porcentaje=%, comision=%', v_porcentaje, v_comision_mxn;
        
        INSERT INTO comisiones (
          id_empleado, id_venta, id_venta_item, id_categoria_servicio, id_sucursal,
          monto_base, porcentaje_comision, monto_comision,
          periodo_inicio, periodo_fin, estado, notas
        ) VALUES (
          v_id_empleado, NEW.id_venta, v_item.id, v_id_categoria, NEW.id_sucursal,
          v_base_mxn, v_porcentaje, v_comision_mxn,
          v_fecha_ingreso, v_fecha_ingreso, 'pendiente',
          'Comisión generada automáticamente - Regla ID: ' || v_regla.id_regla
        );
        
        RAISE NOTICE 'Comisión insertada exitosamente';
      ELSE
        RAISE NOTICE 'No se encontró regla de comisión aplicable';
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error en trigger: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Crear el trigger que se ejecuta DESPUÉS de insertar en libro_ingresos
CREATE TRIGGER trigger_generar_comision_automatica
  AFTER INSERT ON libro_ingresos
  FOR EACH ROW
  EXECUTE FUNCTION registrar_comision_automatica();

COMMENT ON TRIGGER trigger_generar_comision_automatica ON libro_ingresos IS 
  'Genera comisiones automáticamente cuando se reconoce un ingreso';
