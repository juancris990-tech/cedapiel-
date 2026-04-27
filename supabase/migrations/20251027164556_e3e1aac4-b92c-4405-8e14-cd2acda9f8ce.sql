-- Corregir función generar_sku_producto para incluir search_path
-- Primero eliminar el trigger
DROP TRIGGER IF EXISTS trigger_generar_sku ON public.productos;

-- Eliminar la función
DROP FUNCTION IF EXISTS public.generar_sku_producto();

-- Recrear la función con search_path configurado
CREATE OR REPLACE FUNCTION public.generar_sku_producto()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.sku IS NULL OR NEW.sku = '' THEN
    -- Generar SKU basado en prefijo de categoría + ID
    NEW.sku := UPPER(SUBSTRING(NEW.categoria::text, 1, 3)) || '-' || LPAD(NEW.id::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- Recrear el trigger
CREATE TRIGGER trigger_generar_sku
  BEFORE INSERT ON public.productos
  FOR EACH ROW
  EXECUTE FUNCTION public.generar_sku_producto();