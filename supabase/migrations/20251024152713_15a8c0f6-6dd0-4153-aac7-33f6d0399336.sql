-- Crear tabla para logs de cambios de configuración
CREATE TABLE IF NOT EXISTS public.configuracion_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campo_modificado varchar NOT NULL,
  valor_anterior text,
  valor_nuevo text,
  modificado_por uuid NOT NULL REFERENCES auth.users(id),
  modificado_en timestamp with time zone NOT NULL DEFAULT now(),
  notas text
);

-- Habilitar RLS
ALTER TABLE public.configuracion_logs ENABLE ROW LEVEL SECURITY;

-- Política para que usuarios autenticados puedan leer logs
CREATE POLICY "Usuarios autenticados pueden leer logs de configuración"
ON public.configuracion_logs
FOR SELECT
TO authenticated
USING (true);

-- Política para que solo admins puedan insertar logs
CREATE POLICY "Solo admins pueden insertar logs de configuración"
ON public.configuracion_logs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Crear índice para mejorar el rendimiento
CREATE INDEX idx_configuracion_logs_modificado_en ON public.configuracion_logs(modificado_en DESC);
CREATE INDEX idx_configuracion_logs_modificado_por ON public.configuracion_logs(modificado_por);