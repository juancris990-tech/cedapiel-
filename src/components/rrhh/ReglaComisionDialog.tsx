import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface ReglaComisionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  regla?: any;
}

export function ReglaComisionDialog({
  open,
  onOpenChange,
  onSuccess,
  regla,
}: ReglaComisionDialogProps) {
  const [idEmpleado, setIdEmpleado] = useState<string>("ALL");
  const [idCategoria, setIdCategoria] = useState<string>("NONE");
  const [idServicio, setIdServicio] = useState<string>("NONE");
  const [porcentaje, setPorcentaje] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [loading, setLoading] = useState(false);

  // Update form values when regla changes
  useEffect(() => {
    if (regla) {
      setIdEmpleado(regla.id_empleado?.toString() || "ALL");
      setIdCategoria(regla.id_categoria_servicio?.toString() || "NONE");
      setIdServicio(regla.id_servicio?.toString() || "NONE");
      setPorcentaje(regla.porcentaje?.toString() || "");
      setFechaInicio(regla.fecha_inicio || "");
      setFechaFin(regla.fecha_fin || "");
    } else {
      setIdEmpleado("ALL");
      setIdCategoria("NONE");
      setIdServicio("NONE");
      setPorcentaje("");
      setFechaInicio("");
      setFechaFin("");
    }
  }, [regla, open]);

  const { data: empleados } = useQuery({
    queryKey: ['empleados-activos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('empleados')
        .select('id, nombre, apellidos')
        .eq('activo', true)
        .order('nombre');
      if (error) throw error;
      return data;
    },
  });

  const { data: categorias } = useQuery({
    queryKey: ['categorias-servicio'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categoria_servicio')
        .select('id, nombre')
        .eq('activo', true)
        .order('nombre');
      if (error) throw error;
      return data;
    },
  });

  const { data: servicios } = useQuery({
    queryKey: ['servicios-activos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('servicios')
        .select('id, nombre')
        .eq('activo', true)
        .order('nombre');
      if (error) throw error;
      return data;
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const porcentajeNum = parseFloat(porcentaje);
      if (isNaN(porcentajeNum) || porcentajeNum < 0 || porcentajeNum > 100) {
        toast.error("El porcentaje debe estar entre 0 y 100");
        return;
      }

      const payload = {
        id_empleado: idEmpleado && idEmpleado !== "ALL" ? parseInt(idEmpleado) : null,
        id_categoria_servicio: idCategoria && idCategoria !== "NONE" ? parseInt(idCategoria) : null,
        id_servicio: idServicio && idServicio !== "NONE" ? parseInt(idServicio) : null,
        porcentaje: porcentajeNum,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin || null,
      };

      if (regla) {
        // Actualizar regla existente directamente
        const updateData: any = {
          porcentaje: payload.porcentaje,
          fecha_inicio: payload.fecha_inicio,
          fecha_fin: payload.fecha_fin,
          actualizado_por: (await supabase.auth.getUser()).data.user?.id,
        };

        const { error } = await supabase
          .from('parametros_comision')
          .update(updateData)
          .eq('id', regla.id);

        if (error) throw error;
      } else {
        // Crear nueva regla usando edge function
        const response = await supabase.functions.invoke('reglas-comision', {
          body: payload,
        });

        if (response.error) throw response.error;
      }

      toast.success(regla ? "Regla actualizada correctamente" : "Regla creada correctamente");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error guardando regla:', error);
      toast.error(error.message || "Error al guardar la regla");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{regla ? "Editar" : "Nueva"} Regla de Comisión</DialogTitle>
            <DialogDescription>
              Define el porcentaje de comisión por empleado, categoría o servicio.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="empleado">Empleado (opcional)</Label>
              <Select value={idEmpleado} onValueChange={setIdEmpleado}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los empleados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos los empleados</SelectItem>
                  {empleados?.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {emp.nombre} {emp.apellidos}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="servicio">Servicio (opcional)</Label>
              <Select value={idServicio} onValueChange={setIdServicio}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar servicio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Sin servicio específico</SelectItem>
                  {servicios?.map((serv) => (
                    <SelectItem key={serv.id} value={serv.id.toString()}>
                      {serv.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="categoria">Categoría (opcional)</Label>
              <Select 
                value={idCategoria} 
                onValueChange={setIdCategoria}
                disabled={idServicio !== "NONE"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Sin categoría específica</SelectItem>
                  {categorias?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {idServicio !== "NONE" && (
                <p className="text-xs text-muted-foreground">
                  La categoría se ignora cuando se especifica un servicio
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="porcentaje">Porcentaje (%)</Label>
              <Input
                id="porcentaje"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={porcentaje}
                onChange={(e) => setPorcentaje(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="fecha_inicio">Fecha Inicio</Label>
                <Input
                  id="fecha_inicio"
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="fecha_fin">Fecha Fin (opcional)</Label>
                <Input
                  id="fecha_fin"
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : regla ? "Actualizar" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
