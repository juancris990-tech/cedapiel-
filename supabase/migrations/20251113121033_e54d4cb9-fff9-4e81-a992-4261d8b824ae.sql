-- Crear tabla para bloqueos de agenda
CREATE TABLE public.bloqueos_agenda (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  id_empleado BIGINT REFERENCES public.empleados(id),
  id_sucursal BIGINT NOT NULL REFERENCES public.sucursales(id),
  fecha DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  motivo TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para mejorar el rendimiento
CREATE INDEX idx_bloqueos_fecha ON public.bloqueos_agenda(fecha);
CREATE INDEX idx_bloqueos_empleado ON public.bloqueos_agenda(id_empleado);
CREATE INDEX idx_bloqueos_sucursal ON public.bloqueos_agenda(id_sucursal);

-- Enable RLS
ALTER TABLE public.bloqueos_agenda ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuarios autenticados pueden leer bloqueos"
ON public.bloqueos_agenda
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden crear bloqueos"
ON public.bloqueos_agenda
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden actualizar bloqueos"
ON public.bloqueos_agenda
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden eliminar bloqueos"
ON public.bloqueos_agenda
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_bloqueos_agenda_updated_at
BEFORE UPDATE ON public.bloqueos_agenda
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();