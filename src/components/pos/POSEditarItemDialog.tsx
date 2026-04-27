import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { Pencil } from "lucide-react";

interface POSEditarItemDialogProps {
  item: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemActualizado: () => void;
}

export function POSEditarItemDialog({
  item,
  open,
  onOpenChange,
  onItemActualizado,
}: POSEditarItemDialogProps) {
  const [precioOriginal, setPrecioOriginal] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [descuentoTipo, setDescuentoTipo] = useState<string>("ninguno");
  const [descuentoValor, setDescuentoValor] = useState("");
  const [empleadoId, setEmpleadoId] = useState<string>("");

  // Cargar empleados activos y profesionales
  const { data: empleados = [] } = useQuery({
    queryKey: ['empleados-activos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('empleados')
        .select('id, nombre, apellidos')
        .eq('activo', true)
        .eq('es_profesional', true)
        .order('nombre');
      
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    if (item && open) {
      setPrecioOriginal(item.precio_unitario?.toString() || "0");
      setCantidad(item.cantidad?.toString() || "1");
      setDescuentoTipo(item.descuento_tipo || "ninguno");
      setDescuentoValor(item.descuento_valor?.toString() || "0");
      setEmpleadoId(item.id_empleado?.toString() || "");
    }
  }, [item, open]);

  const actualizarItemMutation = useMutation({
    mutationFn: async () => {
      const body: any = {
        cantidad: parseInt(cantidad),
        precio_original_mxn: parseFloat(precioOriginal),
        descuento_tipo: descuentoTipo,
        descuento_valor: descuentoTipo !== "ninguno" ? parseFloat(descuentoValor) : 0,
      };

      // Si es servicio, incluir el empleado en el body
      if (item.id_servicio && empleadoId) {
        body.id_empleado = parseInt(empleadoId);
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`https://ckiwuneigsdotfwrxmbu.supabase.co/functions/v1/pos-item/${item.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar item');
      }

      return await response.json();
    },
    onSuccess: () => {
      toast.success("Item actualizado exitosamente");
      onItemActualizado();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al actualizar item");
    },
  });

  const calcularPrecioFinal = () => {
    const precio = parseFloat(precioOriginal) || 0;
    const descuento = parseFloat(descuentoValor) || 0;

    if (descuentoTipo === "porcentaje") {
      return precio * (1 - descuento / 100);
    } else if (descuentoTipo === "monto") {
      return Math.max(0, precio - descuento);
    }
    return precio;
  };

  const calcularSubtotal = () => {
    const cant = parseInt(cantidad) || 1;
    return calcularPrecioFinal() * cant;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones
    if (!precioOriginal || parseFloat(precioOriginal) < 0) {
      toast.error("El precio no puede ser negativo");
      return;
    }

    if (!cantidad || parseInt(cantidad) <= 0) {
      toast.error("La cantidad debe ser mayor a 0");
      return;
    }

    // Si es servicio, validar que tenga empleado asignado
    if (item.id_servicio && !empleadoId) {
      toast.error("Los servicios deben tener un empleado asignado");
      return;
    }

    if (descuentoTipo === "porcentaje" && parseFloat(descuentoValor) > 100) {
      toast.error("El descuento porcentual no puede ser mayor a 100%");
      return;
    }

    if (descuentoTipo === "monto" && parseFloat(descuentoValor) > parseFloat(precioOriginal)) {
      toast.error("El descuento en monto no puede ser mayor al precio");
      return;
    }

    actualizarItemMutation.mutate();
  };

  const nombreItem = item?.servicios?.nombre || item?.productos_inventario?.nombre || "Item";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Editar Item - {nombreItem}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Selector de empleado solo para servicios */}
          {item.id_servicio && (
            <div className="space-y-2">
              <Label htmlFor="empleado">Empleado que realizó el servicio *</Label>
              <Select value={empleadoId} onValueChange={setEmpleadoId}>
                <SelectTrigger id="empleado" className={!empleadoId ? "border-destructive" : ""}>
                  <SelectValue placeholder="Seleccionar empleado" />
                </SelectTrigger>
                <SelectContent>
                  {empleados.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {emp.nombre} {emp.apellidos}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="cantidad">Cantidad</Label>
            <Input
              id="cantidad"
              type="number"
              min="1"
              step="1"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              placeholder="1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="precio">Precio Original (MXN)</Label>
            <Input
              id="precio"
              type="number"
              min="0"
              step="0.01"
              value={precioOriginal}
              onChange={(e) => setPrecioOriginal(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descuento-tipo">Tipo de Descuento</Label>
            <Select value={descuentoTipo} onValueChange={setDescuentoTipo}>
              <SelectTrigger id="descuento-tipo">
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ninguno">Sin Descuento</SelectItem>
                <SelectItem value="porcentaje">Porcentaje (%)</SelectItem>
                <SelectItem value="monto">Monto Fijo ($)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {descuentoTipo !== "ninguno" && (
            <div className="space-y-2">
              <Label htmlFor="descuento-valor">
                Valor del Descuento {descuentoTipo === "porcentaje" ? "(%)" : "(MXN)"}
              </Label>
              <Input
                id="descuento-valor"
                type="number"
                min="0"
                step={descuentoTipo === "porcentaje" ? "0.01" : "0.01"}
                max={descuentoTipo === "porcentaje" ? "100" : undefined}
                value={descuentoValor}
                onChange={(e) => setDescuentoValor(e.target.value)}
                placeholder="0"
              />
            </div>
          )}

          {/* Vista previa de cálculos */}
          <div className="border rounded-lg p-4 space-y-2 bg-muted/50">
            <div className="flex justify-between text-sm">
              <span>Precio Original:</span>
              <span className="font-medium">{formatCurrency(parseFloat(precioOriginal) || 0)}</span>
            </div>
            {descuentoTipo !== "ninguno" && (
              <div className="flex justify-between text-sm text-destructive">
                <span>Descuento:</span>
                <span className="font-medium">
                  -{formatCurrency(
                    descuentoTipo === "porcentaje"
                      ? (parseFloat(precioOriginal) || 0) * ((parseFloat(descuentoValor) || 0) / 100)
                      : parseFloat(descuentoValor) || 0
                  )}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm font-semibold">
              <span>Precio Final:</span>
              <span>{formatCurrency(calcularPrecioFinal())}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-bold">
              <span>Subtotal (x{cantidad || 1}):</span>
              <span className="text-lg">{formatCurrency(calcularSubtotal())}</span>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={actualizarItemMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={actualizarItemMutation.isPending}>
              {actualizarItemMutation.isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
