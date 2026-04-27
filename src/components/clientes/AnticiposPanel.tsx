import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DollarSign, Plus, RefreshCw, Loader2 } from "lucide-react";
import { AnticipoDialog } from "./AnticipoDialog";
import { useHasAnyRole } from "@/hooks/useUserRoles";

interface AnticiposPanelProps {
  clienteId: number;
  clienteNombre: string;
}

export const AnticiposPanel = ({ clienteId, clienteNombre }: AnticiposPanelProps) => {
  const queryClient = useQueryClient();
  const puedeRegistrar = useHasAnyRole(['admin', 'gerencia', 'recepcion']);
  const puedeReembolsar = useHasAnyRole(['admin']);
  const [showRegistroDialog, setShowRegistroDialog] = useState(false);
  const [showReembolsoDialog, setShowReembolsoDialog] = useState(false);
  const [anticipoSeleccionado, setAnticipoSeleccionado] = useState<any>(null);
  const [montoReembolso, setMontoReembolso] = useState("");
  const [motivoReembolso, setMotivoReembolso] = useState("");

  const { data: cliente } = useQuery({
    queryKey: ["cliente", clienteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("saldo_favor")
        .eq("id", clienteId)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: anticipos, isLoading } = useQuery({
    queryKey: ["anticipos", clienteId],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("No hay sesión activa");

      const response = await supabase.functions.invoke('anticipos', {
        body: null,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.error) throw response.error;
      
      // Filtrar por cliente
      const allAnticipos = response.data || [];
      return allAnticipos.filter((a: any) => a.id_cliente === clienteId);
    },
  });

  const { data: aplicaciones } = useQuery({
    queryKey: ["aplicaciones", clienteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aplicacion_anticipo")
        .select(`
          *,
          anticipos!inner(id_cliente),
          ventas(id, fecha, total)
        `)
        .eq("anticipos.id_cliente", clienteId)
        .order("fecha_aplicacion", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const reembolsarAnticipo = useMutation({
    mutationFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("No hay sesión activa");

      const response = await supabase.functions.invoke('anticipos', {
        body: {
          monto_mxn: parseFloat(montoReembolso),
          motivo: motivoReembolso
        },
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      toast.success("Reembolso procesado correctamente");
      queryClient.invalidateQueries({ queryKey: ["anticipos"] });
      queryClient.invalidateQueries({ queryKey: ["cliente", clienteId] });
      setShowReembolsoDialog(false);
      setAnticipoSeleccionado(null);
      setMontoReembolso("");
      setMotivoReembolso("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al procesar reembolso");
    }
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);
  };

  const getEstadoBadge = (estado: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      registrado: "default",
      aplicado_parcial: "secondary",
      aplicado_total: "secondary",
      reembolsado: "destructive"
    };

    return <Badge variant={variants[estado] || "default"}>{estado}</Badge>;
  };

  const handleReembolso = (anticipo: any) => {
    setAnticipoSeleccionado(anticipo);
    setMontoReembolso(anticipo.saldo_disponible_mxn.toString());
    setShowReembolsoDialog(true);
  };

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-success" />
                Saldo a Favor
              </CardTitle>
              <CardDescription>Total disponible del cliente</CardDescription>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-success">
                {formatCurrency(Number(cliente?.saldo_favor || 0))}
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Anticipos</CardTitle>
              <CardDescription>Historial de anticipos y saldos disponibles</CardDescription>
            </div>
            {puedeRegistrar && (
              <Button onClick={() => setShowRegistroDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Registrar Anticipo
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : anticipos && anticipos.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Sucursal</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead className="text-right">Saldo Disponible</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead>Referencia</TableHead>
                      <TableHead className="text-right">Días</TableHead>
                      {puedeReembolsar && <TableHead>Acciones</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {anticipos.map((anticipo: any) => (
                      <TableRow key={anticipo.id}>
                        <TableCell>
                          {format(new Date(anticipo.fecha_pago), "dd/MM/yyyy", { locale: es })}
                        </TableCell>
                        <TableCell>{anticipo.sucursal}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(Number(anticipo.monto_mxn))}
                        </TableCell>
                        <TableCell className="text-right font-bold text-success">
                          {formatCurrency(Number(anticipo.saldo_disponible_mxn))}
                        </TableCell>
                        <TableCell>{getEstadoBadge(anticipo.estado)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{anticipo.metodo_pago}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {anticipo.referencia_pago || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">
                            {anticipo.dias_desde_registro} días
                          </Badge>
                        </TableCell>
                        {puedeReembolsar && (
                          <TableCell>
                            {Number(anticipo.saldo_disponible_mxn) > 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReembolso(anticipo)}
                              >
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Reembolsar
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No hay anticipos registrados</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aplicaciones de Anticipo</CardTitle>
            <CardDescription>Historial de aplicaciones contra ventas</CardDescription>
          </CardHeader>
          <CardContent>
            {aplicaciones && aplicaciones.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Venta</TableHead>
                      <TableHead className="text-right">Monto Aplicado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aplicaciones.map((aplicacion: any) => (
                      <TableRow key={aplicacion.id}>
                        <TableCell>
                          {format(new Date(aplicacion.fecha_aplicacion), "dd/MM/yyyy HH:mm", { locale: es })}
                        </TableCell>
                        <TableCell>
                          <a href={`/ventas?id=${aplicacion.id_venta}`} className="text-primary hover:underline">
                            Venta #{aplicacion.id_venta}
                          </a>
                        </TableCell>
                        <TableCell className="text-right font-medium text-info">
                          {formatCurrency(Number(aplicacion.monto_aplicado_mxn))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No hay aplicaciones registradas</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AnticipoDialog
        open={showRegistroDialog}
        onOpenChange={setShowRegistroDialog}
        clienteId={clienteId}
        clienteNombre={clienteNombre}
      />

      <Dialog open={showReembolsoDialog} onOpenChange={setShowReembolsoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reembolsar Anticipo</DialogTitle>
          </DialogHeader>

          <form onSubmit={(e) => {
            e.preventDefault();
            reembolsarAnticipo.mutate();
          }} className="space-y-4">
            <div className="space-y-2">
              <Label>Saldo Disponible</Label>
              <div className="text-2xl font-bold text-success">
                {formatCurrency(Number(anticipoSeleccionado?.saldo_disponible_mxn || 0))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="montoReembolso">Monto a Reembolsar *</Label>
              <Input
                id="montoReembolso"
                type="number"
                step="0.01"
                min="0.01"
                max={anticipoSeleccionado?.saldo_disponible_mxn || 0}
                value={montoReembolso}
                onChange={(e) => setMontoReembolso(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="motivoReembolso">Motivo *</Label>
              <Textarea
                id="motivoReembolso"
                value={motivoReembolso}
                onChange={(e) => setMotivoReembolso(e.target.value)}
                placeholder="Especifica el motivo del reembolso..."
                rows={3}
                required
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setShowReembolsoDialog(false)}
                disabled={reembolsarAnticipo.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="destructive"
                className="flex-1"
                disabled={reembolsarAnticipo.isPending}
              >
                {reembolsarAnticipo.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  "Reembolsar"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};