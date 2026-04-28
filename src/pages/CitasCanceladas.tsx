import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CalendarX, Search, TrendingDown } from "lucide-react";
import { endOfMonth, format, startOfMonth, subDays } from "date-fns";

type AgendaCancelada = {
  id: number;
  fecha: string;
  hora_inicio: string;
  estado: string | null;
  motivo_cancelacion: string | null;
  clientes: { nombre: string | null; apellidos: string | null } | null;
  empleados: { nombre: string | null; apellidos: string | null } | null;
  servicios: { nombre: string | null } | null;
};

type AgendaEstadoMes = {
  id: number;
  estado: string | null;
  fecha: string;
};

const ESTADOS_CANCELADOS = new Set([
  "cancelada",
  "cancelada_cliente",
  "cancelada_clinica",
  "cancelled",
]);

const normalizeEstado = (estado?: string | null) => (estado || "").toLowerCase().trim();

const getFullName = (person?: { nombre: string | null; apellidos: string | null } | null, fallback = "—") => {
  const value = `${person?.nombre || ""} ${person?.apellidos || ""}`.trim();
  return value || fallback;
};

const getInitials = (name: string) => {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  return initials || "CL";
};

export default function CitasCanceladas() {
  const [periodoDias, setPeriodoDias] = useState<"7" | "30" | "90">("30");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["citas-canceladas-real", periodoDias],
    queryFn: async () => {
      const today = new Date();
      const start = format(subDays(today, Number(periodoDias)), "yyyy-MM-dd");
      const monthStart = format(startOfMonth(today), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(today), "yyyy-MM-dd");

      const agendaSelect = `
        id,
        fecha,
        hora_inicio,
        estado,
        motivo_cancelacion,
        clientes:clientes!agendas_id_cliente_fkey(nombre, apellidos),
        empleados:empleados!agendas_id_empleado_fkey(nombre, apellidos),
        servicios:servicios!agendas_id_servicio_fkey(nombre)
      `;

      const [canceladasRes, monthRes] = await Promise.all([
        supabase
          .from("agendas")
          .select(agendaSelect)
          .gte("fecha", start)
          .lte("fecha", format(today, "yyyy-MM-dd"))
          .order("fecha", { ascending: false })
          .order("hora_inicio", { ascending: true }),
        supabase
          .from("agendas")
          .select("id, estado, fecha")
          .gte("fecha", monthStart)
          .lte("fecha", monthEnd),
      ]);

      if (canceladasRes.error) throw canceladasRes.error;
      if (monthRes.error) throw monthRes.error;

      const rawCanceladas = (canceladasRes.data || []) as AgendaCancelada[];
      const canceladas = rawCanceladas.filter((item) => ESTADOS_CANCELADOS.has(normalizeEstado(item.estado)));
      const monthRows = (monthRes.data || []) as AgendaEstadoMes[];
      const canceladasMes = monthRows.filter((row) => ESTADOS_CANCELADOS.has(normalizeEstado(row.estado))).length;
      const tasaCancelacionMes = monthRows.length > 0 ? (canceladasMes / monthRows.length) * 100 : 0;

      return {
        canceladas,
        kpi: {
          total: canceladas.length,
          canceladasMes,
          totalMes: monthRows.length,
          tasaCancelacionMes,
        },
      };
    },
  });

  const canceladasFiltradas = useMemo(() => {
    const rows = data?.canceladas || [];
    if (!search.trim()) return rows;

    const term = search.trim().toLowerCase();
    return rows.filter((item) => {
      const cliente = getFullName(item.clientes).toLowerCase();
      const servicio = (item.servicios?.nombre || "").toLowerCase();
      const empleado = getFullName(item.empleados).toLowerCase();
      const motivo = (item.motivo_cancelacion || "").toLowerCase();
      return cliente.includes(term) || servicio.includes(term) || empleado.includes(term) || motivo.includes(term);
    });
  }, [data?.canceladas, search]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Citas Canceladas</h1>
          <p className="text-muted-foreground">Cancelaciones de los últimos 7, 30 o 90 días.</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Select value={periodoDias} onValueChange={(v) => setPeriodoDias(v as "7" | "30" | "90") }>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 días</SelectItem>
              <SelectItem value="30">Últimos 30 días</SelectItem>
              <SelectItem value="90">Últimos 90 días</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Canceladas</CardTitle>
            <CalendarX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.kpi.total || 0}</div>
            <p className="text-xs text-muted-foreground">Período seleccionado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa cancelación mensual</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(data?.kpi.tasaCancelacionMes || 0).toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {data?.kpi.canceladasMes || 0} de {data?.kpi.totalMes || 0} citas del mes
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Citas Canceladas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente, servicio, empleado o motivo"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>

          {isLoading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : canceladasFiltradas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No hay citas canceladas para el período seleccionado.</div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Servicio</TableHead>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Motivo cancelación</TableHead>
                    <TableHead className="text-right">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {canceladasFiltradas.map((cita) => {
                    const cliente = getFullName(cita.clientes, "Sin cliente");
                    return (
                      <TableRow key={cita.id}>
                        <TableCell className="text-sm">
                          <div>{new Date(cita.fecha).toLocaleDateString("es-CL")}</div>
                          <div className="text-xs text-muted-foreground">{cita.hora_inicio?.slice(0, 5) || "—"}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">{getInitials(cliente)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{cliente}</span>
                          </div>
                        </TableCell>
                        <TableCell>{cita.servicios?.nombre || "—"}</TableCell>
                        <TableCell>{getFullName(cita.empleados)}</TableCell>
                        <TableCell className="max-w-[320px] truncate" title={cita.motivo_cancelacion || "Sin motivo registrado"}>
                          {cita.motivo_cancelacion || "Sin motivo registrado"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge className="bg-red-500 hover:bg-red-500 text-white">Cancelada</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
