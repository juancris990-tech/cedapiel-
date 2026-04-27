import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Gift } from "lucide-react";
import { TarjetaRegaloDialog } from "./TarjetaRegaloDialog";
import { useHasAnyRole } from "@/hooks/useUserRoles";

export function TarjetasRegaloPanel() {
  const [busqueda, setBusqueda] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const esAdmin = useHasAnyRole(['admin', 'gerencia']);

  const { data: tarjetas = [], isLoading, refetch } = useQuery({
    queryKey: ['tarjetas-regalo', busqueda],
    queryFn: async () => {
      let query = supabase
        .from('tarjetas_regalo')
        .select(`
          *,
          clientes(nombre, apellidos, telefono),
          sucursales(nombre)
        `)
        .order('fecha_emision', { ascending: false });

      if (busqueda) {
        query = query.or(`codigo_tarjeta.ilike.%${busqueda}%,comprador_nombre.ilike.%${busqueda}%`);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Tarjetas de Regalo
              </CardTitle>
              <CardDescription>Gestión de tarjetas de regalo y gift cards</CardDescription>
            </div>
            {esAdmin && (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Tarjeta
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código o comprador..."
                className="pl-8"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8">Cargando tarjetas...</div>
          ) : tarjetas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron tarjetas de regalo
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Comprador</TableHead>
                    <TableHead>Beneficiario</TableHead>
                    <TableHead>Fecha Emisión</TableHead>
                    <TableHead>Monto Original</TableHead>
                    <TableHead>Saldo Disponible</TableHead>
                    <TableHead>Sucursal</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tarjetas.map((tarjeta: any) => (
                    <TableRow key={tarjeta.id}>
                      <TableCell className="font-mono font-bold">
                        {tarjeta.codigo_tarjeta}
                      </TableCell>
                      <TableCell>{tarjeta.comprador_nombre}</TableCell>
                      <TableCell>
                        {tarjeta.clientes
                          ? `${tarjeta.clientes.nombre} ${tarjeta.clientes.apellidos}`
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        {new Date(tarjeta.fecha_emision).toLocaleDateString()}
                      </TableCell>
                      <TableCell>${tarjeta.monto_original_mxn.toFixed(2)}</TableCell>
                      <TableCell className="font-bold">
                        ${tarjeta.monto_disponible_mxn.toFixed(2)}
                      </TableCell>
                      <TableCell>{tarjeta.sucursales?.nombre || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={tarjeta.activa ? "default" : "secondary"}>
                          {tarjeta.activa ? 'Activa' : 'Agotada'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <TarjetaRegaloDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => {
          refetch();
          setDialogOpen(false);
        }}
      />
    </div>
  );
}
