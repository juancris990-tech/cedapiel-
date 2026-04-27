-- Eliminar tabla y función de clientes agregados
DROP TRIGGER IF EXISTS update_clientes_agregados_updated_at ON public.clientes_agregados;
DROP FUNCTION IF EXISTS public.actualizar_clientes_agregados();
DROP TABLE IF EXISTS public.clientes_agregados CASCADE;