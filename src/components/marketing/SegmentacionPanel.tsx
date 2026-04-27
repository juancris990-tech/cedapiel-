import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Filter } from "lucide-react";

export default function SegmentacionPanel() {
  const [diasSinVisita, setDiasSinVisita] = useState("30");
  const [saldoMinimo, setSaldoMinimo] = useState("");
  const [saldoMaximo, setSaldoMaximo] = useState("");

  const { data: clientesSegmentados, isLoading, refetch } = useQuery({
    queryKey: ['clientes-segmentados', diasSinVisita, saldoMinimo, saldoMaximo],
    queryFn: async () => {
      let query = supabase
        .from('clientes')
        .select('*')
        .eq('activo', true);

      // Filter by days without visit
      if (diasSinVisita) {
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(diasSinVisita));
        query = query.or(`fecha_ultima_visita.lt.${daysAgo.toISOString()},fecha_ultima_visita.is.null`);
      }

      // Filter by balance
      if (saldoMinimo) {
        query = query.gte('saldo_favor', parseFloat(saldoMinimo));
      }
      if (saldoMaximo) {
        query = query.lte('saldo_favor', parseFloat(saldoMaximo));
      }

      const { data, error } = await query.order('fecha_ultima_visita', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: segmentos } = useQuery({
    queryKey: ['segmentos-stats'],
    queryFn: async () => {
      const { data: clientes, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('activo', true);
      
      if (error) throw error;

      const now = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(now.getDate() - 90);

      return {
        frecuentes: clientes.filter(c => 
          c.fecha_ultima_visita && new Date(c.fecha_ultima_visita) > thirtyDaysAgo
        ).length,
        ausentes: clientes.filter(c => 
          !c.fecha_ultima_visita || new Date(c.fecha_ultima_visita) < ninetyDaysAgo
        ).length,
        conSaldo: clientes.filter(c => (c.saldo_favor || 0) > 0).length,
        conDeuda: clientes.filter(c => (c.saldo_contra || 0) > 0).length,
      };
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
  };

  const getDiasSinVisita = (fecha: string | null) => {
    if (!fecha) return 'Nunca';
    const diff = new Date().getTime() - new Date(fecha).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    return `${days} días`;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Clientes Frecuentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{segmentos?.frecuentes || 0}</div>
            <p className="text-xs text-muted-foreground">Últimos 30 días</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Clientes Ausentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{segmentos?.ausentes || 0}</div>
            <p className="text-xs text-muted-foreground">+90 días sin visita</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Con Saldo a Favor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{segmentos?.conSaldo || 0}</div>
            <p className="text-xs text-muted-foreground">Anticipos disponibles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Con Saldo Pendiente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{segmentos?.conDeuda || 0}</div>
            <p className="text-xs text-muted-foreground">Pagos pendientes</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Segmentación de Clientes</CardTitle>
          <CardDescription>
            Filtra clientes por comportamiento, frecuencia y saldo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Días sin visita (mínimo)</Label>
              <Input
                type="number"
                placeholder="30"
                value={diasSinVisita}
                onChange={(e) => setDiasSinVisita(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Saldo mínimo</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={saldoMinimo}
                onChange={(e) => setSaldoMinimo(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Saldo máximo</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="1000.00"
                value={saldoMaximo}
                onChange={(e) => setSaldoMaximo(e.target.value)}
              />
            </div>
          </div>

          <Button onClick={() => refetch()}>
            <Filter className="h-4 w-4 mr-2" />
            Aplicar Filtros
          </Button>

          <div className="border rounded-lg">
            {isLoading ? (
              <div className="p-4 space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Última Visita</TableHead>
                    <TableHead className="text-right">Saldo a Favor</TableHead>
                    <TableHead className="text-right">Saldo Contra</TableHead>
                    <TableHead>Segmento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientesSegmentados?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No se encontraron clientes con estos criterios
                      </TableCell>
                    </TableRow>
                  ) : (
                    clientesSegmentados?.map((cliente) => {
                      const diasSinVisitaNum = cliente.fecha_ultima_visita
                        ? Math.floor((new Date().getTime() - new Date(cliente.fecha_ultima_visita).getTime()) / (1000 * 60 * 60 * 24))
                        : 999;
                      
                      const segmento = diasSinVisitaNum > 90 
                        ? 'Ausente' 
                        : diasSinVisitaNum < 30 
                        ? 'Frecuente' 
                        : 'Regular';

                      return (
                        <TableRow key={cliente.id}>
                          <TableCell className="font-medium">
                            {cliente.nombre} {cliente.apellidos}
                          </TableCell>
                          <TableCell>{cliente.email || '-'}</TableCell>
                          <TableCell>{cliente.telefono || '-'}</TableCell>
                          <TableCell>{getDiasSinVisita(cliente.fecha_ultima_visita)}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(cliente.saldo_favor || 0)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(cliente.saldo_contra || 0)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={segmento === 'Frecuente' ? 'default' : segmento === 'Ausente' ? 'destructive' : 'secondary'}>
                              {segmento}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {clientesSegmentados?.length || 0} clientes encontrados
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
