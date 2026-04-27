import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Search } from "lucide-react";

interface TarjetaRegaloDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function TarjetaRegaloDialog({ open, onOpenChange, onSuccess }: TarjetaRegaloDialogProps) {
  const [loading, setLoading] = useState(false);
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [formData, setFormData] = useState({
    comprador_nombre: "",
    comprador_contacto: "",
    id_cliente_beneficiario: "",
    monto_original_mxn: "",
    sucursal_emision: "",
  });

  // Cargar sucursales
  const { data: sucursales = [] } = useQuery({
    queryKey: ['sucursales'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sucursales')
        .select('*')
        .eq('activo', true)
        .order('nombre');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Buscar clientes
  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes-busqueda', busquedaCliente],
    queryFn: async () => {
      if (!busquedaCliente || busquedaCliente.length < 2) return [];
      
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nombre, apellidos, telefono, email')
        .eq('activo', true)
        .or(`nombre.ilike.%${busquedaCliente}%,apellidos.ilike.%${busquedaCliente}%,telefono.ilike.%${busquedaCliente}%`)
        .limit(10);
      
      if (error) throw error;
      return data || [];
    },
    enabled: busquedaCliente.length >= 2,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Generar código de tarjeta
      const { data: codigoData, error: codigoError } = await supabase.rpc('generar_codigo_tarjeta');
      if (codigoError) throw codigoError;

      const monto = parseFloat(formData.monto_original_mxn);
      if (isNaN(monto) || monto <= 0) {
        throw new Error('Monto inválido');
      }

      const { error } = await supabase
        .from('tarjetas_regalo')
        .insert({
          codigo_tarjeta: codigoData,
          comprador_nombre: formData.comprador_nombre,
          comprador_contacto: formData.comprador_contacto || null,
          id_cliente_beneficiario: formData.id_cliente_beneficiario ? parseInt(formData.id_cliente_beneficiario) : null,
          monto_original_mxn: monto,
          monto_disponible_mxn: monto,
          sucursal_emision: formData.sucursal_emision ? parseInt(formData.sucursal_emision) : null,
          activa: true,
        });

      if (error) throw error;
      
      toast.success(`Tarjeta creada: ${codigoData}`);
      onSuccess?.();
      
      // Reset form
      setFormData({
        comprador_nombre: "",
        comprador_contacto: "",
        id_cliente_beneficiario: "",
        monto_original_mxn: "",
        sucursal_emision: "",
      });
    } catch (error: any) {
      console.error('Error al crear tarjeta:', error);
      toast.error(error.message || "Error al crear tarjeta de regalo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nueva Tarjeta de Regalo</DialogTitle>
          <DialogDescription>
            Crea una tarjeta de regalo para un cliente
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="comprador_nombre">Nombre del Comprador *</Label>
              <Input
                id="comprador_nombre"
                required
                value={formData.comprador_nombre}
                onChange={(e) => setFormData({ ...formData, comprador_nombre: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="comprador_contacto">Contacto del Comprador</Label>
              <Input
                id="comprador_contacto"
                placeholder="Teléfono o email"
                value={formData.comprador_contacto}
                onChange={(e) => setFormData({ ...formData, comprador_contacto: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Beneficiario (Cliente)</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente..."
                  className="pl-8"
                  value={busquedaCliente}
                  onChange={(e) => setBusquedaCliente(e.target.value)}
                />
              </div>
            </div>
            {clientes.length > 0 && (
              <Select
                value={formData.id_cliente_beneficiario}
                onValueChange={(value) => setFormData({ ...formData, id_cliente_beneficiario: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar beneficiario" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id.toString()}>
                      {cliente.nombre} {cliente.apellidos} - {cliente.telefono || cliente.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monto">Monto (MXN) *</Label>
              <Input
                id="monto"
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={formData.monto_original_mxn}
                onChange={(e) => setFormData({ ...formData, monto_original_mxn: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sucursal">Sucursal de Emisión</Label>
              <Select
                value={formData.sucursal_emision}
                onValueChange={(value) => setFormData({ ...formData, sucursal_emision: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar sucursal" />
                </SelectTrigger>
                <SelectContent>
                  {sucursales.map((sucursal) => (
                    <SelectItem key={sucursal.id} value={sucursal.id.toString()}>
                      {sucursal.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creando...' : 'Generar Tarjeta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
