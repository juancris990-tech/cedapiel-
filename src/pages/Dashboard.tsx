import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { endOfDay, endOfMonth, endOfWeek, format, startOfDay, startOfMonth, startOfWeek, subDays } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  Calendar,
  CalendarCheck,
  CalendarX,
  DollarSign,
  FileText,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type DashboardStats = {
  citasHoy: number;
  ingresosMes: number;
  clientesActivos: number;
  noShows30Dias: number;
  resumenHoy: {
    completadas: number;
    pendientes: number;
    canceladas: number;
    total: number;
  };
  citasPorDiaSemana: Array<{ dia: string; citas: number }>;
};

const COMPLETADAS = new Set(["finalizada", "asistida", "completada", "completed"]);
const PENDIENTES = new Set([
  "agendada",
  "confirmada",
  "reservada",
  "en_atencion",
  "llego_paciente",
  "pendiente",
  "scheduled",
]);
const CANCELADAS = new Set(["cancelada", "cancelada_cliente", "cancelada_clinica", "cancelled"]);
const NO_SHOWS = new Set(["no_show", "no_asiste", "did_not_show", "didnotshow", "no-show"]);

const normalizeEstado = (estado?: string | null) => (estado || "").toLowerCase().trim();

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);

const Dashboard = () => {
  const queryClient = useQueryClient();

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const now = new Date();

      const inicioHoy = format(startOfDay(now), "yyyy-MM-dd");
      const finHoy = format(endOfDay(now), "yyyy-MM-dd");
      const inicioMes = format(startOfMonth(now), "yyyy-MM-dd");
      const finMes = format(endOfMonth(now), "yyyy-MM-dd");
      const inicio30Dias = format(startOfDay(subDays(now, 29)), "yyyy-MM-dd");
      const inicioSemana = startOfWeek(now, { weekStartsOn: 1 });
      const finSemana = endOfWeek(now, { weekStartsOn: 1 });

      const [
        citasHoyRes,
        citas30DiasRes,
        citasSemanaRes,
        ventasMesRes,
        clientesActivosRes,
      ] = await Promise.all([
        supabase
          .from("agendas")
          .select("id, estado, fecha")
          .gte("fecha", inicioHoy)
          .lte("fecha", finHoy),
        supabase
          .from("agendas")
          .select("id, estado, fecha")
          .gte("fecha", inicio30Dias)
          .lte("fecha", finHoy),
        supabase
          .from("agendas")
          .select("id, fecha")
          .gte("fecha", format(inicioSemana, "yyyy-MM-dd"))
          .lte("fecha", format(finSemana, "yyyy-MM-dd")),
        supabase
          .from("ventas")
          .select("id, estado_venta, total")
          .eq("estado_venta", "cerrada")
          .gte("fecha", inicioMes)
          .lte("fecha", finMes),
        supabase.from("clientes").select("id", { count: "exact", head: true }).eq("activo", true),
      ]);

      const citasHoy = citasHoyRes.data || [];
      const citas30Dias = citas30DiasRes.data || [];
      const citasSemana = citasSemanaRes.data || [];
      const ventasMes = ventasMesRes.data || [];

      const resumenHoy = citasHoy.reduce(
        (acc, cita) => {
          const estado = normalizeEstado(cita.estado);
          if (COMPLETADAS.has(estado)) {
            acc.completadas += 1;
          } else if (CANCELADAS.has(estado) || NO_SHOWS.has(estado)) {
            acc.canceladas += 1;
          } else if (PENDIENTES.has(estado) || !estado) {
            acc.pendientes += 1;
          } else {
            acc.pendientes += 1;
          }

          acc.total += 1;
          return acc;
        },
        { completadas: 0, pendientes: 0, canceladas: 0, total: 0 }
      );

      const noShows30Dias = citas30Dias.filter((cita) => NO_SHOWS.has(normalizeEstado(cita.estado))).length;

      const ingresosMes = ventasMes.reduce((sum, venta) => sum + Number(venta.total || 0), 0);

      const diasSemana = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
      const acumuladoDias = new Array(7).fill(0);

      citasSemana.forEach((cita) => {
        const day = new Date(cita.fecha).getDay();
        const index = day === 0 ? 6 : day - 1;
        acumuladoDias[index] += 1;
      });

      const citasPorDiaSemana = diasSemana.map((dia, index) => ({
        dia,
        citas: acumuladoDias[index],
      }));

      return {
        citasHoy: citasHoy.length,
        ingresosMes,
        clientesActivos: clientesActivosRes.count || 0,
        noShows30Dias,
        resumenHoy,
        citasPorDiaSemana,
      };
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("dashboard-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agendas" },
        () => queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ventas" },
        () => queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const summary = stats?.resumenHoy ?? { completadas: 0, pendientes: 0, canceladas: 0, total: 0 };
  const pct = {
    completadas: summary.total ? Math.round((summary.completadas / summary.total) * 100) : 0,
    pendientes: summary.total ? Math.round((summary.pendientes / summary.total) * 100) : 0,
    canceladas: summary.total ? Math.round((summary.canceladas / summary.total) * 100) : 0,
  };

  const quickActions = [
    { to: "/agenda", label: "Abrir agenda", icon: Calendar },
    { to: "/pos", label: "Registrar venta", icon: DollarSign },
    { to: "/clientes", label: "Ver clientes", icon: Users },
    { to: "/reportes", label: "Ver reportes", icon: FileText },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Ejecutivo</h1>
          <p className="text-muted-foreground mt-1">Vista rápida de operación diaria con enfoque de negocio</p>
        </div>
        <Badge variant="secondary" className="w-fit">
          <Activity className="mr-1 h-3.5 w-3.5" />
          Actualizado en tiempo real
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="shadow-sm border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Citas hoy</CardTitle>
            <CalendarCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">{stats?.citasHoy ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Agenda del día actual</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ingresos del mes</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">{formatCurrency(stats?.ingresosMes ?? 0)}</p>
            <p className="text-xs text-muted-foreground mt-1">Ventas cerradas del mes en curso</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Clientes activos</CardTitle>
            <UserCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">{stats?.clientesActivos ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Clientes con estado activo</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">No-shows (30 días)</CardTitle>
            <CalendarX className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight text-destructive">{stats?.noShows30Dias ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Citas sin asistencia reciente</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Citas por día de semana</CardTitle>
            <CardDescription>Mini gráfico semanal de carga de agenda</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats?.citasPorDiaSemana ?? []} margin={{ top: 4, right: 0, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="dia" stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted) / 0.35)" }}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Bar dataKey="citas" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Accesos rápidos</CardTitle>
            <CardDescription>Atajos para tareas frecuentes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickActions.map((action) => (
              <Button key={action.to} variant="outline" className="w-full justify-start" asChild>
                <Link to={action.to}>
                  <action.icon className="mr-2 h-4 w-4" />
                  {action.label}
                </Link>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumen del día</CardTitle>
          <CardDescription>Completadas, pendientes y canceladas con distribución porcentual</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Completadas</p>
              <p className="text-2xl font-semibold">{summary.completadas}</p>
              <p className="text-xs text-muted-foreground">{pct.completadas}% del día</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Pendientes</p>
              <p className="text-2xl font-semibold">{summary.pendientes}</p>
              <p className="text-xs text-muted-foreground">{pct.pendientes}% del día</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Canceladas</p>
              <p className="text-2xl font-semibold">{summary.canceladas}</p>
              <p className="text-xs text-muted-foreground">{pct.canceladas}% del día</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Avance operativo del día</span>
              <span>{summary.total} citas totales</span>
            </div>
            <Progress value={pct.completadas} className="h-2" />
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">Completadas: {pct.completadas}%</Badge>
              <Badge variant="outline">Pendientes: {pct.pendientes}%</Badge>
              <Badge variant="outline">Canceladas: {pct.canceladas}%</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
