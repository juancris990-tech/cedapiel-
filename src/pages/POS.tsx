import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { POSClienteSelector } from "@/components/pos/POSClienteSelector";
import { POSBuscador } from "@/components/pos/POSBuscador";
import { POSCarrito } from "@/components/pos/POSCarrito";
import { VentasPendientes } from "@/components/pos/VentasPendientes";
import { Card } from "@/components/ui/card";
import { ShoppingCart } from "lucide-react";

export default function POS() {
  const location = useLocation();
  const [idVenta, setIdVenta] = useState<number | null>(null);
  const [idCliente, setIdCliente] = useState<number | null>(null);
  const [idSucursal, setIdSucursal] = useState<number | null>(null);
  const [refreshCarrito, setRefreshCarrito] = useState(0);

  // Pre-cargar venta desde agenda
  useEffect(() => {
    const initFromAgenda = async () => {
      const state = location.state as any;
      
      console.log('Estado recibido desde agenda:', state);
      
      if (state?.citaId && state?.clienteId && state?.sucursalId) {
        try {
          console.log('Creando venta para cita:', {
            citaId: state.citaId,
            clienteId: state.clienteId,
            sucursalId: state.sucursalId,
            servicioId: state.servicioId,
            empleadoId: state.empleadoId
          });

          // 1. Crear la venta
          const { data: ventaData, error: ventaError } = await supabase.functions.invoke('pos-venta', {
            body: {
              id_cliente: state.clienteId,
              id_sucursal: state.sucursalId
            }
          });

          if (ventaError) {
            console.error('Error al crear venta:', ventaError);
            throw ventaError;
          }
          
          console.log('Venta creada:', ventaData);
          const ventaId = ventaData.venta.id;

          // 2. Agregar el servicio al carrito (aunque el precio sea 0)
          if (state.servicioId && state.empleadoId) {
            console.log('Agregando servicio al carrito:', {
              ventaId,
              servicioId: state.servicioId,
              empleadoId: state.empleadoId
            });

            const { data: itemData, error: itemError } = await supabase.functions.invoke('pos-item', {
              body: {
                id_venta: ventaId,
                tipo: 'servicio',
                id_servicio: state.servicioId,
                cantidad: 1,
                id_empleado: state.empleadoId
              }
            });

            if (itemError) {
              console.error('Error al agregar item:', itemError);
              throw itemError;
            }
            console.log('Item agregado:', itemData);
          }

          // 3. Establecer estados
          setIdVenta(ventaId);
          setIdCliente(state.clienteId);
          setIdSucursal(state.sucursalId);
          setRefreshCarrito(prev => prev + 1);

          // Notificar éxito
          toast.success("Venta cargada desde agenda", {
            description: `${state.nombreCliente} - ${state.nombreServicio}`
          });

          // Limpiar el state de navegación
          window.history.replaceState({}, document.title);
        } catch (error: any) {
          console.error('Error al inicializar venta desde agenda:', error);
          toast.error("Error al cargar venta", {
            description: error.message || "No se pudo crear la venta desde la agenda"
          });
        }
      } else if (state?.clienteId) {
        // Solo pre-seleccionar cliente (flujo antiguo)
        console.log('Pre-seleccionando cliente:', state.clienteId);
        setIdCliente(state.clienteId);
        window.history.replaceState({}, document.title);
      }
    };

    initFromAgenda();
  }, [location.state]);

  const handleVentaCreada = (ventaId: number, clienteId: number, sucursalId: number) => {
    setIdVenta(ventaId);
    setIdCliente(clienteId);
    setIdSucursal(sucursalId);
  };

  const handleItemAgregado = () => {
    setRefreshCarrito(prev => prev + 1);
  };

  const handleNuevaVenta = () => {
    setIdVenta(null);
    setIdCliente(null);
    setIdSucursal(null);
    setRefreshCarrito(0);
  };

  const handleSeleccionarVentaPendiente = (ventaId: number, clienteId: number, sucursalId: number) => {
    setIdVenta(ventaId);
    setIdCliente(clienteId);
    setIdSucursal(sucursalId);
    setRefreshCarrito(prev => prev + 1);
    toast.success("Venta cargada", {
      description: "Puedes continuar con esta venta"
    });
  };

  return (
    <div className="space-y-5 md:space-y-6">
      <div className="rounded-2xl border border-border/70 bg-card p-4 md:p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ShoppingCart className="h-5 w-5" />
              </span>
              Punto de Venta (POS)
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">Gestiona ventas de servicios y productos en un flujo simple</p>
          </div>
        </div>
      </div>

      {/* Ventas Pendientes */}
      {!idVenta && <VentasPendientes onSeleccionarVenta={handleSeleccionarVentaPendiente} />}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(420px,1fr)_minmax(420px,1fr)] gap-5 md:gap-6">
        {/* Panel Izquierdo: Cliente + Búsqueda */}
        <div className="space-y-4">
          <POSClienteSelector
            onVentaCreada={handleVentaCreada}
            ventaActual={idVenta}
            clienteActual={idCliente}
            sucursalActual={idSucursal}
            onReiniciar={handleNuevaVenta}
          />
          
          {idVenta ? (
            <POSBuscador 
              idVenta={idVenta}
              onItemAgregado={handleItemAgregado}
            />
          ) : (
            <Card className="p-8 text-center border-dashed border-border/70 bg-card/60">
              <p className="text-muted-foreground">
                Selecciona cliente y sucursal para iniciar la venta y agregar servicios o productos.
              </p>
            </Card>
          )}
        </div>

        {/* Panel Derecho: Carrito */}
        <div>
          {idVenta && idCliente ? (
            <POSCarrito 
              idVenta={idVenta}
              idCliente={idCliente}
              refreshTrigger={refreshCarrito}
              onVentaCerrada={handleNuevaVenta}
            />
          ) : (
            <Card className="p-8 text-center text-muted-foreground border-border/70 bg-card/70">
              <p className="text-lg">Selecciona un cliente para comenzar</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
