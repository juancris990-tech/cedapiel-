import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, DollarSign } from "lucide-react";

interface VentasClientePanelProps {
  clienteId: number;
}

export function VentasClientePanel({ clienteId }: VentasClientePanelProps) {
  const { data: ventas = [], isLoading } = useQuery({
    queryKey: ['ventas-cliente', clienteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ventas')
        .select(`
          *,
          sucursales(nombre)
        `)
        .eq('id_cliente', clienteId)
        .order('fecha', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const getEstadoBadge = (estado: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      abierta: { variant: "outline", label: "Abierta" },
      cerrada: { variant: "default", label: "Cerrada" },
      pagada: { variant: "secondary", label: "Pagada" },
      cancelada: { variant: "destructive", label: "Cancelada" },
    };
    
    const info = config[estado] || { variant: "outline" as const, label: estado };
    return <Badge variant={info.variant}>{info.label}</Badge>;
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return "$0.00";
    return `$${value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ventas del Cliente</CardTitle>
        <CardDescription>Historial de todas las ventas asociadas</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Cargando ventas...</div>
        ) : ventas.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay ventas registradas
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Pagado</TableHead>
                  <TableHead className="text-right">Pendiente</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ventas.map((venta: any) => (
                  <TableRow key={venta.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {new Date(venta.fecha).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>{venta.sucursales?.nombre || '-'}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(venta.monto_final_mxn || venta.total)}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(venta.total_pagado_mxn)}
                    </TableCell>
                    <TableCell className="text-right text-orange-600">
                      {formatCurrency(venta.saldo_pendiente_mxn)}
                    </TableCell>
                    <TableCell>{getEstadoBadge(venta.estado || venta.estado_venta)}</TableCell>
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
