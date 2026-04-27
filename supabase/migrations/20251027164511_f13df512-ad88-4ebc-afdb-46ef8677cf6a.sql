-- Agregar columna SKU a la tabla productos
ALTER TABLE public.productos 
ADD COLUMN sku character varying UNIQUE;

-- Crear índice para búsquedas rápidas por SKU
CREATE INDEX idx_productos_sku ON public.productos(sku);

-- Función para generar SKU automático si no se proporciona
CREATE OR REPLACE FUNCTION public.generar_sku_producto()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sku IS NULL OR NEW.sku = '' THEN
    -- Generar SKU basado en prefijo de categoría + ID
    NEW.sku := UPPER(SUBSTRING(NEW.categoria::text, 1, 3)) || '-' || LPAD(NEW.id::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para generar SKU automáticamente
CREATE TRIGGER trigger_generar_sku
  BEFORE INSERT ON public.productos
  FOR EACH ROW
  EXECUTE FUNCTION public.generar_sku_producto();

-- Comentario en la columna
COMMENT ON COLUMN public.productos.sku IS 'Código único de producto (SKU). Se genera automáticamente si no se proporciona.';