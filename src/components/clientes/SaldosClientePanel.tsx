import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, TrendingUp, TrendingDown, Gift } from "lucide-react";

interface SaldosClientePanelProps {
  clienteId: number;
}

export function SaldosClientePanel({ clienteId }: SaldosClientePanelProps) {
  // Saldo actual
  const { data: saldo } = useQuery({
    queryKey: ['saldo-cliente', clienteId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('vw_clientes_saldos')
        .select('*')
        .eq('id', clienteId)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  // Tarjetas de regalo del cliente
  const { data: tarjetas = [] } = useQuery({
    queryKey: ['tarjetas-cliente', clienteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tarjetas_regalo')
        .select('*')
        .eq('id_cliente_beneficiario', clienteId)
        .order('fecha_emision', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Movimientos económicos (pagos y anticipos)
  const { data: movimientos = [] } = useQuery({
    queryKey: ['movimientos-cliente', clienteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pagos')
        .select('*')
        .eq('id_cliente', clienteId)
        .order('fecha_pago', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="space-y-6">
      {/* Resumen de saldos */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo a Favor</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${(saldo?.saldo_favor || 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Crédito disponible
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deuda Pendiente</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${(saldo?.saldo_contra || 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Monto por pagar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Neto</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(saldo?.saldo_neto || 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Balance total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tarjetas de regalo */}
      {tarjetas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Tarjetas de Regalo
            </CardTitle>
            <CardDescription>Tarjetas asignadas a este cliente</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Fecha Emisión</TableHead>
                    <TableHead>Monto Original</TableHead>
                    <TableHead>Saldo Disponible</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tarjetas.map((tarjeta: any) => (
                    <TableRow key={tarjeta.id}>
                      <TableCell className="font-mono">{tarjeta.codigo_tarjeta}</TableCell>
                      <TableCell>
                        {new Date(tarjeta.fecha_emision).toLocaleDateString()}
                      </TableCell>
                      <TableCell>${tarjeta.monto_original_mxn.toFixed(2)}</TableCell>
                      <TableCell className="font-bold">
                        ${tarjeta.monto_disponible_mxn.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <span className={tarjeta.activa ? 'text-green-600' : 'text-gray-400'}>
                          {tarjeta.activa ? 'Activa' : 'Agotada'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Movimientos económicos */}
      <Card>
        <CardHeader>
          <CardTitle>Movimientos Económicos</CardTitle>
          <CardDescription>Últimos pagos, anticipos y abonos</CardDescription>
        </CardHeader>
        <CardContent>
          {movimientos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay movimientos registrados
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Método de Pago</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Referencia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimientos.map((mov: any) => (
                    <TableRow key={mov.id}>
                      <TableCell>
                        {new Date(mov.fecha_pago).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="capitalize">{mov.tipo_pago}</TableCell>
                      <TableCell>{mov.metodo_pago || '-'}</TableCell>
                      <TableCell className="font-bold">
                        ${mov.monto.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {mov.referencia || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
