import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ClientesDuplicadosPanelProps {
  onMergeSuccess?: () => void;
}

export function ClientesDuplicadosPanel({ onMergeSuccess }: ClientesDuplicadosPanelProps) {
  const { data: duplicados = [], isLoading } = useQuery({
    queryKey: ['clientes-duplicados'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_clientes_duplicados')
        .select('*');
      
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Clientes Duplicados
        </CardTitle>
        <CardDescription>
          Registros sospechosos que podrían ser el mismo cliente
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Cargando...</div>
        ) : duplicados.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No se encontraron duplicados
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Criterio</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>IDs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {duplicados.map((dup: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Badge variant={dup.tipo_duplicado === 'email' ? 'default' : 'secondary'}>
                        {dup.tipo_duplicado === 'email' ? 'Email' : 'Teléfono'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{dup.valor}</TableCell>
                    <TableCell>{dup.cantidad}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{dup.ids_clientes}</TableCell>
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
