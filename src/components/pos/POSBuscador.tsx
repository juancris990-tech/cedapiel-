import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Search, Plus, Package, Scissors, PlusCircle, UserCircle } from "lucide-react";
import { POSCrearServicioDialog } from "./POSCrearServicioDialog";
import { POSAgregarItemPersonalizadoDialog } from "./POSAgregarItemPersonalizadoDialog";

interface POSBuscadorProps {
  idVenta: number;
  onItemAgregado: () => void;
}

export const POSBuscador = ({ idVenta, onItemAgregado }: POSBuscadorProps) => {
  const [tipo, setTipo] = useState<'servicio' | 'producto'>('servicio');
  const [busqueda, setBusqueda] = useState('');
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<number | null>(null);
  const [dialogServicioOpen, setDialogServicioOpen] = useState(false);
  const [dialogItemPersonalizadoOpen, setDialogItemPersonalizadoOpen] = useState(false);
  const queryClient = useQueryClient();

  // Query para empleados profesionales
  const { data: empleados = [] } = useQuery({
    queryKey: ['empleados-profesionales'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('empleados')
        .select('id, nombre, apellidos')
        .eq('es_profesional', true)
        .eq('activo', true)
        .order('nombre');
      
      if (error) throw error;
      return data;
    },
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['pos-buscar', tipo, busqueda],
    queryFn: async () => {
      const params = new URLSearchParams({
        tipo,
        ...(busqueda && { q: busqueda })
      });
      
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      const response = await fetch(`${supabaseUrl}/functions/v1/pos-buscar?${params}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error en la búsqueda');
      }
      
      const result = await response.json();
      return result?.items || [];
    },
    enabled: !!tipo,
  });

  const agregarItemMutation = useMutation({
    mutationFn: async (item: any) => {
      // Validar que para servicios se haya seleccionado un empleado
      if (item.tipo === 'servicio' && !empleadoSeleccionado) {
        throw new Error('Debes seleccionar un médico para agregar un servicio');
      }

      const body = {
        id_venta: idVenta,
        tipo: item.tipo,
        cantidad: 1,
        ...(item.tipo === 'servicio' ? { 
          id_servicio: item.id,
          id_empleado: empleadoSeleccionado 
        } : { 
          id_producto: item.id,
          ...(empleadoSeleccionado && { id_empleado: empleadoSeleccionado })
        })
      };

      const { data, error } = await supabase.functions.invoke('pos-item', {
        body,
        method: 'POST'
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Item agregado al carrito");
      queryClient.invalidateQueries({ queryKey: ['pos-venta-resumen'] });
      queryClient.invalidateQueries({ queryKey: ['venta-items'] });
      onItemAgregado();
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al agregar item");
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Buscar Items
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={tipo} onValueChange={(v) => setTipo(v as 'servicio' | 'producto')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="servicio" className="flex items-center gap-2">
              <Scissors className="h-4 w-4" />
              Servicios
            </TabsTrigger>
            <TabsTrigger value="producto" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Productos
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <UserCircle className="h-4 w-4" />
                {tipo === 'servicio' ? 'Médico que realizará el servicio' : 'Vendedor (opcional)'}
              </label>
              <Select 
                value={empleadoSeleccionado?.toString() || (tipo === 'producto' ? 'none' : '')} 
                onValueChange={(val) => setEmpleadoSeleccionado(val && val !== 'none' ? parseInt(val) : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={tipo === 'servicio' ? 'Selecciona un médico' : 'Selecciona un vendedor (opcional)'} />
                </SelectTrigger>
                <SelectContent>
                  {tipo === 'producto' && (
                    <SelectItem value="none">Sin vendedor</SelectItem>
                  )}
                  {empleados.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {emp.nombre} {emp.apellidos}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2">
              <Input
                placeholder={`Buscar ${tipo}s...`}
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={() => tipo === 'servicio' ? setDialogServicioOpen(true) : setDialogItemPersonalizadoOpen(true)}
                className="gap-2"
              >
                <PlusCircle className="h-4 w-4" />
                Nuevo
              </Button>
            </div>
          </div>

          <TabsContent value={tipo} className="space-y-2 max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Cargando...
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  No se encontraron {tipo}s
                </p>
              </div>
            ) : (
              items.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-medium">{item.nombre}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {item.categoria}
                      </Badge>
                      {item.tipo === 'producto' && (
                        <Badge 
                          variant={item.stock > 0 ? "secondary" : "destructive"}
                          className="text-xs"
                        >
                          Stock: {item.stock}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-bold text-primary">
                        {formatCurrency(item.precio_lista_mxn)}
                      </div>
                    </div>
                    <Button
                      size="icon"
                      onClick={() => agregarItemMutation.mutate(item)}
                      disabled={agregarItemMutation.isPending || (item.tipo === 'producto' && item.stock <= 0)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>

        <POSCrearServicioDialog
          open={dialogServicioOpen}
          onOpenChange={setDialogServicioOpen}
          onServicioCreado={() => {
            queryClient.invalidateQueries({ queryKey: ['pos-buscar'] });
          }}
        />
        
        <POSAgregarItemPersonalizadoDialog
          open={dialogItemPersonalizadoOpen}
          onOpenChange={setDialogItemPersonalizadoOpen}
          idVenta={idVenta}
          onItemAgregado={onItemAgregado}
        />
      </CardContent>
    </Card>
  );
};
