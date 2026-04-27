import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import CampaniaDialog from "./CampaniaDialog";
import { useToast } from "@/hooks/use-toast";

export default function CampaniasPanel() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCampania, setSelectedCampania] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: campanias, isLoading } = useQuery({
    queryKey: ['campanias-marketing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campanias_marketing')
        .select(`
          *,
          sucursales(nombre)
        `)
        .order('fecha_inicio', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const getEstadoBadge = (estado: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'Activa': 'default',
      'Planificada': 'secondary',
      'Completada': 'outline',
      'Cancelada': 'destructive',
    };
    return <Badge variant={variants[estado] || 'outline'}>{estado}</Badge>;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
  };

  const handleNewCampania = () => {
    setSelectedCampania(null);
    setDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Campañas de Marketing</CardTitle>
              <CardDescription>
                Gestiona y monitorea tus campañas de marketing
              </CardDescription>
            </div>
            <Button onClick={handleNewCampania}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Campaña
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaña</TableHead>
                  <TableHead>Segmento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead>Fecha Inicio</TableHead>
                  <TableHead>Fecha Fin</TableHead>
                  <TableHead className="text-right">Presupuesto</TableHead>
                  <TableHead className="text-right">Gasto Real</TableHead>
                  <TableHead className="text-right">ROI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campanias?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      No hay campañas registradas
                    </TableCell>
                  </TableRow>
                ) : (
                  campanias?.map((campania) => {
                    const roi = campania.presupuesto 
                      ? (((campania.gasto_real || 0) / campania.presupuesto) * 100).toFixed(1)
                      : '0';
                    
                    return (
                      <TableRow key={campania.id}>
                        <TableCell className="font-medium">{campania.nombre}</TableCell>
                        <TableCell>{campania.segmento || '-'}</TableCell>
                        <TableCell>{getEstadoBadge(campania.estado)}</TableCell>
                        <TableCell>{campania.sucursales?.nombre || '-'}</TableCell>
                        <TableCell>
                          {format(new Date(campania.fecha_inicio), "d MMM yyyy", { locale: es })}
                        </TableCell>
                        <TableCell>
                          {campania.fecha_fin 
                            ? format(new Date(campania.fecha_fin), "d MMM yyyy", { locale: es })
                            : '-'
                          }
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(campania.presupuesto || 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(campania.gasto_real || 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={parseFloat(roi) > 100 ? 'text-destructive' : 'text-primary'}>
                            {roi}%
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CampaniaDialog 
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        campania={selectedCampania}
      />
    </>
  );
}
