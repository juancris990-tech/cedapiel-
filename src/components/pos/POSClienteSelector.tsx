import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { User, Building2, ShoppingCart, AlertCircle, UserPlus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Cliente = {
  id: number;
  nombre: string;
  apellidos: string | null;
  telefono: string | null;
};

type Sucursal = {
  id: number;
  nombre: string;
};

interface POSClienteSelectorProps {
  onVentaCreada: (ventaId: number, clienteId: number, sucursalId: number) => void;
  ventaActual?: number | null;
  clienteActual?: number | null;
  sucursalActual?: number | null;
  onReiniciar: () => void;
}

export const POSClienteSelector = ({ onVentaCreada, ventaActual, clienteActual, sucursalActual, onReiniciar }: POSClienteSelectorProps) => {
  const [selectedCliente, setSelectedCliente] = useState<string>("");
  const [selectedSucursal, setSelectedSucursal] = useState<string>("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingChange, setPendingChange] = useState<{ tipo: 'cliente' | 'sucursal', valor: string } | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  
  // Estado para crear nuevo cliente
  const [showNuevoClienteDialog, setShowNuevoClienteDialog] = useState(false);
  const [nuevoClienteNombre, setNuevoClienteNombre] = useState("");
  const [nuevoClienteApellidos, setNuevoClienteApellidos] = useState("");
  const [nuevoClienteTelefono, setNuevoClienteTelefono] = useState("");
  const [creandoCliente, setCreandoCliente] = useState(false);

  const fetchClientes = async () => {
    const { data } = await supabase
      .from("clientes")
      .select("id, nombre, apellidos, telefono")
      .eq("activo", true)
      .order("nombre");
    if (data) setClientes(data as Cliente[]);
  };

  useEffect(() => {
    const fetchData = async () => {
      const [clientesRes, sucursalesRes] = await Promise.all([
        supabase.from("clientes").select("id, nombre, apellidos, telefono").eq("activo", true).order("nombre"),
        supabase.from("sucursales").select("id, nombre").eq("activo", true).order("nombre"),
      ]);
      
      if (clientesRes.data) setClientes(clientesRes.data as Cliente[]);
      if (sucursalesRes.data) setSucursales(sucursalesRes.data as Sucursal[]);

      // Set default branch from profile
      if (!selectedSucursal) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id_sucursal")
            .eq("id", user.id)
            .maybeSingle();
          
          if (profile?.id_sucursal) {
            setSelectedSucursal(profile.id_sucursal.toString());
          }
        }
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (clienteActual) setSelectedCliente(clienteActual.toString());
    if (sucursalActual) setSelectedSucursal(sucursalActual.toString());
  }, [clienteActual, sucursalActual]);

  const handleClienteChange = (value: string) => {
    if (ventaActual && value !== selectedCliente) {
      setPendingChange({ tipo: 'cliente', valor: value });
      setShowConfirmDialog(true);
    } else {
      setSelectedCliente(value);
    }
  };

  const handleSucursalChange = (value: string) => {
    if (ventaActual && value !== selectedSucursal) {
      setPendingChange({ tipo: 'sucursal', valor: value });
      setShowConfirmDialog(true);
    } else {
      setSelectedSucursal(value);
    }
  };

  const confirmarCambio = () => {
    if (pendingChange) {
      if (pendingChange.tipo === 'cliente') {
        setSelectedCliente(pendingChange.valor);
      } else {
        setSelectedSucursal(pendingChange.valor);
      }
      onReiniciar();
    }
    setShowConfirmDialog(false);
    setPendingChange(null);
  };

  const cancelarCambio = () => {
    setShowConfirmDialog(false);
    setPendingChange(null);
  };

  const handleCrearNuevoCliente = async () => {
    if (!nuevoClienteNombre.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    setCreandoCliente(true);
    try {
      const { data, error } = await supabase
        .from('clientes')
        .insert({
          nombre: nuevoClienteNombre.trim(),
          apellidos: nuevoClienteApellidos.trim() || null,
          telefono: nuevoClienteTelefono.trim() || null,
          activo: true,
        })
        .select('id')
        .single();

      if (error) throw error;

      toast.success("Cliente creado exitosamente");
      
      // Refrescar lista de clientes y seleccionar el nuevo
      await fetchClientes();
      setSelectedCliente(data.id.toString());
      
      // Limpiar formulario y cerrar dialog
      setNuevoClienteNombre("");
      setNuevoClienteApellidos("");
      setNuevoClienteTelefono("");
      setShowNuevoClienteDialog(false);
    } catch (error: any) {
      console.error('Error al crear cliente:', error);
      toast.error(error.message || "Error al crear cliente");
    } finally {
      setCreandoCliente(false);
    }
  };

  const crearVentaMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('pos-venta', {
        body: {
          id_cliente: parseInt(selectedCliente),
          id_sucursal: parseInt(selectedSucursal)
        }
      });

      if (error) throw error;
      return data.venta;
    },
    onSuccess: (venta) => {
      toast.success("Venta iniciada", {
        description: `Venta #${venta.id} creada en borrador`,
      });
      onVentaCreada(venta.id, parseInt(selectedCliente), parseInt(selectedSucursal));
    },
    onError: (error: any) => {
      toast.error("Error al crear venta", {
        description: error.message,
      });
    },
  });

  const handleIniciarVenta = () => {
    if (!selectedCliente || !selectedSucursal) {
      toast.error("Selecciona cliente y sucursal");
      return;
    }
    crearVentaMutation.mutate();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Nueva Venta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Cliente
            </Label>
            <div className="flex gap-2">
              <Select
                value={selectedCliente}
                onValueChange={handleClienteChange}
                disabled={!!ventaActual}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Seleccionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id.toString()}>
                      {cliente.nombre} {cliente.apellidos}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowNuevoClienteDialog(true)}
                disabled={!!ventaActual}
                title="Crear nuevo cliente"
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Sucursal
            </Label>
            <Select
              value={selectedSucursal}
              onValueChange={handleSucursalChange}
              disabled={!!ventaActual}
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

          {!ventaActual && (
            <Button 
              className="w-full" 
              onClick={handleIniciarVenta}
              disabled={!selectedCliente || !selectedSucursal || crearVentaMutation.isPending}
            >
              {crearVentaMutation.isPending ? "Creando..." : "Comenzar Venta"}
            </Button>
          )}

          {ventaActual && (
            <div className="p-3 bg-success/10 rounded-md border border-success/20">
              <p className="text-sm font-medium text-success">
                ✓ Venta #{ventaActual} en progreso
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para confirmar cambio con venta en progreso */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              ¿Reiniciar la venta?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esto reiniciará el carrito y creará una nueva venta en borrador. 
              Todos los ítems actuales se perderán. ¿Deseas continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelarCambio}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarCambio}>Continuar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog para crear nuevo cliente */}
      <Dialog open={showNuevoClienteDialog} onOpenChange={setShowNuevoClienteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Cliente</DialogTitle>
            <DialogDescription>
              Ingresa los datos básicos del cliente para registrar la venta
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nuevo-nombre">Nombre *</Label>
              <Input
                id="nuevo-nombre"
                placeholder="Nombre del cliente"
                value={nuevoClienteNombre}
                onChange={(e) => setNuevoClienteNombre(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nuevo-apellidos">Apellidos</Label>
              <Input
                id="nuevo-apellidos"
                placeholder="Apellidos (opcional)"
                value={nuevoClienteApellidos}
                onChange={(e) => setNuevoClienteApellidos(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nuevo-telefono">Teléfono</Label>
              <Input
                id="nuevo-telefono"
                placeholder="Teléfono (opcional)"
                value={nuevoClienteTelefono}
                onChange={(e) => setNuevoClienteTelefono(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowNuevoClienteDialog(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCrearNuevoCliente}
              disabled={creandoCliente || !nuevoClienteNombre.trim()}
            >
              {creandoCliente ? "Creando..." : "Crear Cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
