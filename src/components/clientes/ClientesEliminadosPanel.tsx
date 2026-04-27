import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText } from "lucide-react";

export function ClientesEliminadosPanel() {
  const { data: eliminados = [], isLoading } = useQuery({
    queryKey: ['clientes-eliminados'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_clientes_eliminados')
        .select('*')
        .limit(50);
      
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Clientes Eliminados
        </CardTitle>
        <CardDescription>Auditoría de clientes dados de baja</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Cargando...</div>
        ) : eliminados.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay clientes eliminados
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Fecha Eliminación</TableHead>
                  <TableHead>Responsable</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eliminados.map((cliente: any) => (
                  <TableRow key={cliente.id}>
                    <TableCell>{cliente.nombre} {cliente.apellidos}</TableCell>
                    <TableCell>{cliente.telefono || '-'}</TableCell>
                    <TableCell>{cliente.email || '-'}</TableCell>
                    <TableCell>
                      {new Date(cliente.fecha_eliminacion).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{cliente.usuario_responsable || '-'}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {cliente.motivo_eliminacion || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
