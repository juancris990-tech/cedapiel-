import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  addDays,
  endOfMonth,
  format,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import {
  Calendar,
  CalendarX,
  DollarSign,
  TrendingUp,
  Users,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type AgendaWithRelations = {
  id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: string | null;
  motivo_cancelacion: string | null;
  id_cliente: number;
  id_empleado: number | null;
  id_servicio: number | null;
  clientes: { nombre: string | null; apellidos: string | null } | null;
  empleados: { nombre: string | null; apellidos: string | null } | null;
  servicios: { nombre: string | null; precio: number | null } | null;
};

type VentaRow = {
  id: number;
  id_cita: number | null;
  fecha: string;
  estado_venta: string;
  total: number;
  monto_final_mxn: number | null;
};

type ClienteAlta = {
  id: number;
  fecha_alta: string | null;
};

const COMPLETADAS = new Set(["finalizada", "asistida", "completada", "completed"]);
const CANCELADAS = new Set(["cancelada", "cancelada_cliente", "cancelada_clinica", "cancelled"]);
const NO_SHOWS = new Set(["no_show", "no_asiste", "did_not_show", "didnotshow", "no-show"]);

const normalizeEstado = (estado?: string | null) => (estado || "").toLowerCase().trim();

const currency = (value: number) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);

const percent = (value: number) => `${value.toFixed(1)}%`;

const fullName = (person?: { nombre: string | null; apellidos: string | null } | null, fallback = "—") => {
  const name = `${person?.nombre || ""} ${person?.apellidos || ""}`.trim();
  return name || fallback;
};

const parseSafeDate = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const Reportes = () => {
  const [noShowRange, setNoShowRange] = useState<"30" | "60" | "90">("30");

  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const currentMonthStart = format(startOfMonth(today), "yyyy-MM-dd");
  const currentMonthEnd = format(endOfMonth(today), "yyyy-MM-dd");
  const previousMonthDate = subMonths(today, 1);
  const previousMonthStart = format(startOfMonth(previousMonthDate), "yyyy-MM-dd");
  const previousMonthEnd = format(endOfMonth(previousMonthDate), "yyyy-MM-dd");
  const ninetyDaysAgo = format(subDays(today, 90), "yyyy-MM-dd");
  const thirtyDaysAgo = format(subDays(today, 30), "yyyy-MM-dd");

  const agendaSelect = `
    id,
    fecha,
    hora_inicio,
    hora_fin,
    estado,
    motivo_cancelacion,
    id_cliente,
    id_empleado,
    id_servicio,
    clientes:clientes!agendas_id_cliente_fkey(nombre, apellidos),
    empleados:empleados!agendas_id_empleado_fkey(nombre, apellidos),
    servicios:servicios!agendas_id_servicio_fkey(nombre, precio)
  `;

  const { data, isLoading, error } = useQuery({
    queryKey: ["reportes-gettimely", noShowRange],
    queryFn: async () => {
      const noShowStart = format(subDays(today, Number(noShowRange)), "yyyy-MM-dd");

      const [
        daySheetRes,
        noShowRes,
        retentionRes,
        canceladasRes,
        agendasMonthRes,
        ventasMonthRes,
        ventasResumenRes,
        agendasResumenRes,
        clientesResumenRes,
      ] = await Promise.all([
        supabase
          .from("agendas")
          .select(agendaSelect)
          .gte("fecha", todayStr)
          .lte("fecha", todayStr)
          .order("hora_inicio", { ascending: true }),
        supabase
          .from("agendas")
          .select(agendaSelect)
          .gte("fecha", noShowStart)
          .lte("fecha", todayStr)
          .order("fecha", { ascending: false }),
        supabase
          .from("agendas")
          .select(agendaSelect)
          .gte("fecha", ninetyDaysAgo)
          .lte("fecha", todayStr),
        supabase
          .from("agendas")
          .select(agendaSelect)
          .gte("fecha", thirtyDaysAgo)
          .lte("fecha", todayStr)
          .order("fecha", { ascending: false }),
        supabase
          .from("agendas")
          .select(agendaSelect)
          .gte("fecha", currentMonthStart)
          .lte("fecha", currentMonthEnd),
        supabase
          .from("ventas")
          .select("id, id_cita, fecha, estado_venta, total, monto_final_mxn")
          .gte("fecha", currentMonthStart)
          .lte("fecha", currentMonthEnd),
        supabase
          .from("ventas")
          .select("id, id_cita, fecha, estado_venta, total, monto_final_mxn")
          .gte("fecha", previousMonthStart)
          .lte("fecha", currentMonthEnd),
        supabase
          .from("agendas")
          .select("id, fecha, estado")
          .gte("fecha", previousMonthStart)
          .lte("fecha", currentMonthEnd),
        supabase
          .from("clientes")
          .select("id, fecha_alta")
          .gte("fecha_alta", previousMonthStart)
          .lte("fecha_alta", currentMonthEnd),
      ]);

      const allResponses = [
        daySheetRes,
        noShowRes,
        retentionRes,
        canceladasRes,
        agendasMonthRes,
        ventasMonthRes,
        ventasResumenRes,
        agendasResumenRes,
        clientesResumenRes,
      ];

      const firstError = allResponses.find((res) => res.error)?.error;
      if (firstError) {
        throw firstError;
      }

      const daySheet = (daySheetRes.data || []) as AgendaWithRelations[];
      const noShowCandidates = (noShowRes.data || []) as AgendaWithRelations[];
      const retentionAgendas = (retentionRes.data || []) as AgendaWithRelations[];
      const canceladasCandidates = (canceladasRes.data || []) as AgendaWithRelations[];
      const agendasMes = (agendasMonthRes.data || []) as AgendaWithRelations[];
      const ventasMes = (ventasMonthRes.data || []) as VentaRow[];
      const ventasResumen = (ventasResumenRes.data || []) as VentaRow[];
      const agendasResumen = (agendasResumenRes.data || []) as Array<{ id: number; fecha: string; estado: string | null }>;
      const clientesResumen = (clientesResumenRes.data || []) as ClienteAlta[];

      const daySheetIds = daySheet.map((row) => row.id);
      const ventasHoyMap = new Map<number, number>();
      if (daySheetIds.length > 0) {
        const { data: ventasHoy, error: ventasHoyError } = await supabase
          .from("ventas")
          .select("id_cita, total, monto_final_mxn, estado_venta")
          .in("id_cita", daySheetIds)
          .eq("estado_venta", "cerrada");

        if (ventasHoyError) throw ventasHoyError;

        (ventasHoy || []).forEach((venta) => {
          if (venta.id_cita) {
            const amount = Number(venta.monto_final_mxn ?? venta.total ?? 0);
            ventasHoyMap.set(venta.id_cita, amount);
          }
        });
      }

      return {
        daySheet,
        noShowCandidates,
        retentionAgendas,
        canceladasCandidates,
        agendasMes,
        ventasMes,
        ventasResumen,
        agendasResumen,
        clientesResumen,
        ventasHoyMap,
      };
    },
  });

  const reports = useMemo(() => {
    if (!data) {
      return null;
    }

    const daySheetRows = data.daySheet.map((item) => {
      const servicioPrecio = Number(item.servicios?.precio || 0);
      const ventaPrecio = data.ventasHoyMap.get(item.id) || 0;
      const precio = ventaPrecio || servicioPrecio;
      return {
        id: item.id,
        hora: `${item.hora_inicio || ""}${item.hora_fin ? ` - ${item.hora_fin}` : ""}`,
        cliente: fullName(item.clientes),
        servicio: item.servicios?.nombre || "—",
        empleado: fullName(item.empleados),
        estado: item.estado || "—",
        precio,
      };
    });

    const noShowRowsBase = data.noShowCandidates.filter((item) =>
      NO_SHOWS.has(normalizeEstado(item.estado))
    );

    const noShowsByClient = noShowRowsBase.reduce<Record<number, number>>((acc, item) => {
      acc[item.id_cliente] = (acc[item.id_cliente] || 0) + 1;
      return acc;
    }, {});

    const noShowRows = noShowRowsBase.map((item) => ({
      id: item.id,
      fecha: item.fecha,
      hora: item.hora_inicio,
      cliente: fullName(item.clientes),
      servicio: item.servicios?.nombre || "—",
      empleado: fullName(item.empleados),
      reincidente: (noShowsByClient[item.id_cliente] || 0) >= 2,
      totalNoShowsCliente: noShowsByClient[item.id_cliente] || 0,
    }));

    const completed90 = data.retentionAgendas.filter((item) =>
      COMPLETADAS.has(normalizeEstado(item.estado))
    );

    const now = new Date();
    const startLast30 = startOfDay(subDays(now, 30));
    const start60 = startOfDay(subDays(now, 60));
    const start90 = startOfDay(subDays(now, 90));
    const end90Window = startOfDay(subDays(now, 60));

    const recentClients = new Set<number>();
    const baseRetentionClients = new Set<number>();
    const clients60to90 = new Map<
      number,
      { idCliente: number; cliente: string; ultimaVisita: string; servicio: string; empleado: string }
    >();

    completed90.forEach((item) => {
      const d = parseSafeDate(item.fecha);
      if (!d) return;

      if (d >= startLast30) {
        recentClients.add(item.id_cliente);
      }
      if (d >= start90 && d < startLast30) {
        baseRetentionClients.add(item.id_cliente);
      }
      if (d >= start90 && d < end90Window) {
        const existing = clients60to90.get(item.id_cliente);
        if (!existing || item.fecha > existing.ultimaVisita) {
          clients60to90.set(item.id_cliente, {
            idCliente: item.id_cliente,
            cliente: fullName(item.clientes),
            ultimaVisita: item.fecha,
            servicio: item.servicios?.nombre || "—",
            empleado: fullName(item.empleados),
          });
        }
      }
    });

    const retainedCount = [...baseRetentionClients].filter((id) => recentClients.has(id)).length;
    const retentionRate = baseRetentionClients.size > 0 ? (retainedCount / baseRetentionClients.size) * 100 : 0;

    const clientesPorRecuperar = [...clients60to90.values()]
      .filter((row) => !recentClients.has(row.idCliente))
      .sort((a, b) => (a.ultimaVisita < b.ultimaVisita ? -1 : 1));

    const citasCompletadasMes = data.agendasMes.filter((item) =>
      COMPLETADAS.has(normalizeEstado(item.estado))
    );
    const ventasCerradasMes = data.ventasMes.filter(
      (row) => normalizeEstado(row.estado_venta) === "cerrada"
    );

    const agendaById = new Map<number, AgendaWithRelations>();
    data.agendasMes.forEach((item) => {
      agendaById.set(item.id, item);
    });

    const ingresosPorEmpleadoMap = new Map<string, { empleado: string; ingresos: number; citas: number }>();

    citasCompletadasMes.forEach((cita) => {
      const empleado = fullName(cita.empleados, "Sin asignar");
      const current = ingresosPorEmpleadoMap.get(empleado) || { empleado, ingresos: 0, citas: 0 };
      current.citas += 1;
      ingresosPorEmpleadoMap.set(empleado, current);
    });

    ventasCerradasMes.forEach((venta) => {
      const agenda = venta.id_cita ? agendaById.get(venta.id_cita) : undefined;
      const empleado = fullName(agenda?.empleados, "Sin asignar");
      const current = ingresosPorEmpleadoMap.get(empleado) || { empleado, ingresos: 0, citas: 0 };
      current.ingresos += Number(venta.monto_final_mxn ?? venta.total ?? 0);
      ingresosPorEmpleadoMap.set(empleado, current);
    });

    const ingresosPorEmpleado = [...ingresosPorEmpleadoMap.values()].sort((a, b) => b.ingresos - a.ingresos);
    const totalIngresosMes = ingresosPorEmpleado.reduce((sum, row) => sum + row.ingresos, 0);

    const canceladas30 = data.canceladasCandidates
      .filter((item) => {
        const estado = normalizeEstado(item.estado);
        return CANCELADAS.has(estado) || NO_SHOWS.has(estado);
      })
      .map((item) => ({
        id: item.id,
        fecha: item.fecha,
        cliente: fullName(item.clientes),
        empleado: fullName(item.empleados),
        servicio: item.servicios?.nombre || "—",
        estado: item.estado || "—",
        motivo: item.motivo_cancelacion || "Sin motivo registrado",
      }));

    const ingresosActual = data.ventasResumen
      .filter(
        (row) =>
          normalizeEstado(row.estado_venta) === "cerrada" &&
          row.fecha >= currentMonthStart &&
          row.fecha <= currentMonthEnd
      )
      .reduce((sum, row) => sum + Number(row.monto_final_mxn ?? row.total ?? 0), 0);

    const ingresosPrevio = data.ventasResumen
      .filter(
        (row) =>
          normalizeEstado(row.estado_venta) === "cerrada" &&
          row.fecha >= previousMonthStart &&
          row.fecha <= previousMonthEnd
      )
      .reduce((sum, row) => sum + Number(row.monto_final_mxn ?? row.total ?? 0), 0);

    const citasCompletadasActual = data.agendasResumen.filter(
      (row) =>
        row.fecha >= currentMonthStart &&
        row.fecha <= currentMonthEnd &&
        COMPLETADAS.has(normalizeEstado(row.estado))
    ).length;
    const citasCompletadasPrevio = data.agendasResumen.filter(
      (row) =>
        row.fecha >= previousMonthStart &&
        row.fecha <= previousMonthEnd &&
        COMPLETADAS.has(normalizeEstado(row.estado))
    ).length;

    const noShowsActual = data.agendasResumen.filter(
      (row) =>
        row.fecha >= currentMonthStart &&
        row.fecha <= currentMonthEnd &&
        NO_SHOWS.has(normalizeEstado(row.estado))
    ).length;
    const noShowsPrevio = data.agendasResumen.filter(
      (row) =>
        row.fecha >= previousMonthStart &&
        row.fecha <= previousMonthEnd &&
        NO_SHOWS.has(normalizeEstado(row.estado))
    ).length;

    const clientesNuevosActual = data.clientesResumen.filter((row) => {
      if (!row.fecha_alta) return false;
      return row.fecha_alta >= currentMonthStart && row.fecha_alta <= currentMonthEnd;
    }).length;

    const clientesNuevosPrevio = data.clientesResumen.filter((row) => {
      if (!row.fecha_alta) return false;
      return row.fecha_alta >= previousMonthStart && row.fecha_alta <= previousMonthEnd;
    }).length;

    const delta = (actual: number, previo: number) => {
      if (previo === 0) return actual === 0 ? 0 : 100;
      return ((actual - previo) / previo) * 100;
    };

    return {
      daySheetRows,
      noShowRows,
      retention: {
        retentionRate,
        clientesActivos: recentClients.size,
        clientesPorRecuperar,
      },
      ingresosPorEmpleado,
      totalIngresosMes,
      canceladas30,
      resumenMensual: {
        ingresos: {
          actual: ingresosActual,
          previo: ingresosPrevio,
          delta: delta(ingresosActual, ingresosPrevio),
        },
        citasCompletadas: {
          actual: citasCompletadasActual,
          previo: citasCompletadasPrevio,
          delta: delta(citasCompletadasActual, citasCompletadasPrevio),
        },
        clientesNuevos: {
          actual: clientesNuevosActual,
          previo: clientesNuevosPrevio,
          delta: delta(clientesNuevosActual, clientesNuevosPrevio),
        },
        noShows: {
          actual: noShowsActual,
          previo: noShowsPrevio,
          delta: delta(noShowsActual, noShowsPrevio),
        },
      },
    };
  }, [
    currentMonthEnd,
    currentMonthStart,
    data,
    previousMonthEnd,
    previousMonthStart,
  ]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
        <p className="text-muted-foreground">
          Vista operativa estilo GetTimely con datos reales desde Supabase.
        </p>
      </div>

      <Tabs defaultValue="hoja-dia" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
          <TabsTrigger value="hoja-dia">Hoja del día</TabsTrigger>
          <TabsTrigger value="no-shows">No-shows</TabsTrigger>
          <TabsTrigger value="retencion">Retención</TabsTrigger>
          <TabsTrigger value="ingresos-empleado">Ingresos por empleado</TabsTrigger>
          <TabsTrigger value="canceladas">Citas canceladas</TabsTrigger>
          <TabsTrigger value="resumen-mensual">Resumen mensual</TabsTrigger>
        </TabsList>

        {isLoading && (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">Cargando reportes...</CardContent>
          </Card>
        )}

        {error && (
          <Card>
            <CardContent className="py-10 text-center text-destructive">
              Error al cargar reportes: {(error as Error).message}
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && reports && (
          <>
            <TabsContent value="hoja-dia">
              <Card>
                <CardHeader>
                  <CardTitle>Hoja del día</CardTitle>
                  <CardDescription>
                    {format(today, "EEEE d 'de' MMMM, yyyy", { locale: es })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Hora</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Servicio</TableHead>
                        <TableHead>Empleado</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Precio</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.daySheetRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            No hay citas para hoy.
                          </TableCell>
                        </TableRow>
                      ) : (
                        reports.daySheetRows.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>{row.hora || "—"}</TableCell>
                            <TableCell>{row.cliente}</TableCell>
                            <TableCell>{row.servicio}</TableCell>
                            <TableCell>{row.empleado}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{row.estado}</Badge>
                            </TableCell>
                            <TableCell className="text-right">{currency(row.precio)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="no-shows" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle>No-shows</CardTitle>
                    <CardDescription>
                      Clientes reincidentes (2+ no-shows) se muestran destacados.
                    </CardDescription>
                  </div>
                  <div className="w-full md:w-48">
                    <Select value={noShowRange} onValueChange={(value) => setNoShowRange(value as "30" | "60" | "90")}>
                      <SelectTrigger>
                        <SelectValue placeholder="Rango" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">Últimos 30 días</SelectItem>
                        <SelectItem value="60">Últimos 60 días</SelectItem>
                        <SelectItem value="90">Últimos 90 días</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Hora</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Servicio</TableHead>
                        <TableHead>Empleado</TableHead>
                        <TableHead>Frecuencia</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.noShowRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            No hay no-shows en este período.
                          </TableCell>
                        </TableRow>
                      ) : (
                        reports.noShowRows.map((row) => (
                          <TableRow key={row.id} className={row.reincidente ? "bg-destructive/5" : ""}>
                            <TableCell>{format(new Date(row.fecha), "dd/MM/yyyy")}</TableCell>
                            <TableCell>{row.hora || "—"}</TableCell>
                            <TableCell>{row.cliente}</TableCell>
                            <TableCell>{row.servicio}</TableCell>
                            <TableCell>{row.empleado}</TableCell>
                            <TableCell>
                              {row.reincidente ? (
                                <Badge variant="destructive">Reincidente ({row.totalNoShowsCliente})</Badge>
                              ) : (
                                <Badge variant="secondary">{row.totalNoShowsCliente}</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="retencion" className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Tasa de retención</CardDescription>
                    <CardTitle className="text-2xl">{percent(reports.retention.retentionRate)}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Clientes activos (últimos 30 días)</CardDescription>
                    <CardTitle className="text-2xl">{reports.retention.clientesActivos}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Clientes por recuperar</CardDescription>
                    <CardTitle className="text-2xl">{reports.retention.clientesPorRecuperar.length}</CardTitle>
                  </CardHeader>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Vinieron hace 60-90 días y no volvieron en 30 días</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Última visita</TableHead>
                        <TableHead>Servicio</TableHead>
                        <TableHead>Empleado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.retention.clientesPorRecuperar.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            No hay clientes para recuperar en este momento.
                          </TableCell>
                        </TableRow>
                      ) : (
                        reports.retention.clientesPorRecuperar.map((row) => (
                          <TableRow key={row.idCliente}>
                            <TableCell>{row.cliente}</TableCell>
                            <TableCell>{format(new Date(row.ultimaVisita), "dd/MM/yyyy")}</TableCell>
                            <TableCell>{row.servicio}</TableCell>
                            <TableCell>{row.empleado}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ingresos-empleado" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Ingresos por empleado</CardTitle>
                  <CardDescription>Mes actual: ingresos y cantidad de citas completadas.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {reports.ingresosPorEmpleado.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No hay datos de ingresos este mes.</p>
                  ) : (
                    reports.ingresosPorEmpleado.map((row) => {
                      const width = reports.totalIngresosMes > 0 ? (row.ingresos / reports.totalIngresosMes) * 100 : 0;
                      return (
                        <div key={row.empleado} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{row.empleado}</span>
                            <span className="text-muted-foreground">
                              {currency(row.ingresos)} · {row.citas} citas
                            </span>
                          </div>
                          <div className="h-2 w-full rounded bg-muted">
                            <div
                              className="h-2 rounded bg-primary"
                              style={{ width: `${Math.max(width, 2)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="canceladas">
              <Card>
                <CardHeader>
                  <CardTitle>Citas canceladas (últimos 30 días)</CardTitle>
                  <CardDescription>Incluye canceladas y no-shows con motivo registrado.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Servicio</TableHead>
                        <TableHead>Empleado</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Motivo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.canceladas30.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            No hay citas canceladas para este período.
                          </TableCell>
                        </TableRow>
                      ) : (
                        reports.canceladas30.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>{format(new Date(row.fecha), "dd/MM/yyyy")}</TableCell>
                            <TableCell>{row.cliente}</TableCell>
                            <TableCell>{row.servicio}</TableCell>
                            <TableCell>{row.empleado}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{row.estado}</Badge>
                            </TableCell>
                            <TableCell>{row.motivo}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="resumen-mensual">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card>
                  <CardHeader className="space-y-1 pb-2">
                    <CardDescription className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" /> Ingresos
                    </CardDescription>
                    <CardTitle>{currency(reports.resumenMensual.ingresos.actual)}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Mes anterior: {currency(reports.resumenMensual.ingresos.previo)} ({percent(reports.resumenMensual.ingresos.delta)})
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="space-y-1 pb-2">
                    <CardDescription className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> Citas completadas
                    </CardDescription>
                    <CardTitle>{reports.resumenMensual.citasCompletadas.actual}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Mes anterior: {reports.resumenMensual.citasCompletadas.previo} ({percent(reports.resumenMensual.citasCompletadas.delta)})
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="space-y-1 pb-2">
                    <CardDescription className="flex items-center gap-2">
                      <Users className="h-4 w-4" /> Clientes nuevos
                    </CardDescription>
                    <CardTitle>{reports.resumenMensual.clientesNuevos.actual}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Mes anterior: {reports.resumenMensual.clientesNuevos.previo} ({percent(reports.resumenMensual.clientesNuevos.delta)})
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="space-y-1 pb-2">
                    <CardDescription className="flex items-center gap-2">
                      <CalendarX className="h-4 w-4" /> No-shows
                    </CardDescription>
                    <CardTitle>{reports.resumenMensual.noShows.actual}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Mes anterior: {reports.resumenMensual.noShows.previo} ({percent(reports.resumenMensual.noShows.delta)})
                  </CardContent>
                </Card>
              </div>

              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Período comparado</CardTitle>
                  <CardDescription>
                    {format(startOfMonth(today), "dd/MM/yyyy")} al {format(endOfMonth(today), "dd/MM/yyyy")} vs {" "}
                    {format(startOfMonth(subMonths(today, 1)), "dd/MM/yyyy")} al {format(endOfMonth(subMonths(today, 1)), "dd/MM/yyyy")}
                  </CardDescription>
                </CardHeader>
              </Card>
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
};

export default Reportes;
