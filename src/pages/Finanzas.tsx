import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import GastosPanel from "@/components/finanzas/GastosPanel";
import RentabilidadPanel from "@/components/finanzas/RentabilidadPanel";
import { format, startOfMonth, endOfMonth } from "date-fns";

const Finanzas = () => {
  const [activeTab, setActiveTab] = useState("gastos");
  const [selectedMonth] = useState<Date>(new Date());

  const { data: statsGastos } = useQuery({
    queryKey: ["stats-gastos", selectedMonth],
    queryFn: async () => {
      const inicio = format(startOfMonth(selectedMonth), "yyyy-MM-dd");
      const fin = format(endOfMonth(selectedMonth), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("gastos_sucursal")
        .select("monto, categoria")
        .gte("fecha", inicio)
        .lte("fecha", fin);

      if (error) throw error;

      const total = data?.reduce((acc, g) => acc + Number(g.monto), 0) || 0;
      const porCategoria = data?.reduce((acc, g) => {
        acc[g.categoria] = (acc[g.categoria] || 0) + Number(g.monto);
        return acc;
      }, {} as Record<string, number>);

      return { total, porCategoria, count: data?.length || 0 };
    },
  });

  const { data: statsVentas } = useQuery({
    queryKey: ["stats-ventas-mes", selectedMonth],
    queryFn: async () => {
      const inicio = format(startOfMonth(selectedMonth), "yyyy-MM-dd");
      const fin = format(endOfMonth(selectedMonth), "yyyy-MM-dd");

      const { data, error } = await (supabase as any)
        .from("vw_ventas_desglose")
        .select("total")
        .gte("fecha", inicio)
        .lte("fecha", fin);

      if (error) throw error;

      const total = data?.reduce((acc, v) => acc + Number(v.total), 0) || 0;
      return total;
    },
  });

  const { data: statsComisiones } = useQuery({
    queryKey: ["stats-comisiones-mes", selectedMonth],
    queryFn: async () => {
      const inicio = format(startOfMonth(selectedMonth), "yyyy-MM-dd");
      const fin = format(endOfMonth(selectedMonth), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("comisiones")
        .select("monto_comision")
        .gte("periodo_inicio", inicio)
        .lte("periodo_fin", fin);

      if (error) throw error;

      const total = data?.reduce((acc, c) => acc + Number(c.monto_comision), 0) || 0;
      return total;
    },
  });

  const rentabilidad = (statsVentas || 0) - (statsGastos?.total || 0) - (statsComisiones || 0);
  const margenRentabilidad = statsVentas ? ((rentabilidad / statsVentas) * 100) : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Finanzas</h1>
          <p className="text-muted-foreground mt-2">
            Gestión de gastos y análisis de rentabilidad
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas del Mes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(statsVentas || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Ingresos totales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos del Mes</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(statsGastos?.total || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {statsGastos?.count || 0} gastos registrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comisiones</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {formatCurrency(statsComisiones || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Comisiones del mes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rentabilidad</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${rentabilidad >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(rentabilidad)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Margen: {margenRentabilidad.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="gastos">Gastos</TabsTrigger>
          <TabsTrigger value="rentabilidad">Rentabilidad</TabsTrigger>
        </TabsList>

        <TabsContent value="gastos" className="space-y-4">
          <GastosPanel />
        </TabsContent>

        <TabsContent value="rentabilidad" className="space-y-4">
          <RentabilidadPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Finanzas;
