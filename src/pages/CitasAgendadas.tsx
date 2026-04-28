import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { endOfWeek, format, startOfDay } from "date-fns";
import { Calendar, CalendarDays, Clock3, Search } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type AgendaProxima = {
  id: number;
  fecha: string;
  hora_inicio: string;
  estado: string | null;
  clientes: { nombre: string | null; apellidos: string | null } | null;
  empleados: { nombre: string | null; apellidos: string | null } | null;
  servicios: { nombre: string | null } | null;
};

const ESTADOS_PROXIMOS = new Set(["agendada", "confirmada", "pending", "confirmed", "pendiente"]);

const normalizeEstado = (estado?: string | null) => (estado || "").toLowerCase().trim();

const getFullName = (person?: { nombre: string | null; apellidos: string | null } | null, fallback = "—") => {
  const value = `${person?.nombre || ""} ${person?.apellidos || ""}`.trim();
  return value || fallback;
};

const estadoBadge = (estado?: string | null) => {
  const normalized = normalizeEstado(estado);

  if (normalized === "confirmada" || normalized === "confirmed") {
    return { label: "Confirmada", className: "bg-emerald-600 hover:bg-emerald-600 text-white" };
  }

  return { label: "Pendiente", className: "bg-amber-500 hover:bg-amber-500 text-white" };
};

export default function CitasAgendadas() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["citas-agendadas-proximas"],
    queryFn: async () => {
      const today = new Date();
      const todayStart = startOfDay(today);
      const todayStr = format(todayStart, "yyyy-MM-dd");
      const endWeekStr = format(endOfWeek(todayStart, { weekStartsOn: 1 }), "yyyy-MM-dd");

      const agendaSelect = `
        id,
        fecha,
        hora_inicio,
        estado,
        clientes:clientes!agendas_id_cliente_fkey(nombre, apellidos),
        empleados:empleados!agendas_id_empleado_fkey(nombre, apellidos),
        servicios:servicios!agendas_id_servicio_fkey(nombre)
      `;

      const { data: rows, error } = await supabase
        .from("agendas")
        .select(agendaSelect)
        .gte("fecha", todayStr)
        .order("fecha", { ascending: true })
        .order("hora_inicio", { ascending: true });

      if (error) throw error;

      const proximas = ((rows || []) as AgendaProxima[]).filter((row) => ESTADOS_PROXIMOS.has(normalizeEstado(row.estado)));
      const citasHoy = proximas.filter((row) => row.fecha === todayStr).length;
      const citasSemana = proximas.filter((row) => row.fecha >= todayStr && row.fecha <= endWeekStr).length;

      return {
        proximas,
        kpi: {
          totalProximas: proximas.length,
          citasHoy,
          citasSemana,
        },
      };
    },
  });

  const citasFiltradas = useMemo(() => {
    const rows = data?.proximas || [];
    if (!search.trim()) return rows;

    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      const cliente = getFullName(row.clientes).toLowerCase();
      const servicio = (row.servicios?.nombre || "").toLowerCase();
      const empleado = getFullName(row.empleados).toLowerCase();
      const estado = normalizeEstado(row.estado);
      return cliente.includes(term) || servicio.includes(term) || empleado.includes(term) || estado.includes(term);
    });
  }, [data?.proximas, search]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Citas Agendadas</h1>
          <p className="text-muted-foreground">Próximas citas confirmadas o pendientes.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total citas próximas</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.kpi.totalProximas || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Citas de hoy</CardTitle>
            <Clock3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.kpi.citasHoy || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Citas de esta semana</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.kpi.citasSemana || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de próximas citas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente, servicio, empleado o estado"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>

          {isLoading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : citasFiltradas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No hay citas próximas para mostrar.</div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Servicio</TableHead>
                    <TableHead>Empleado</TableHead>
                    <TableHead className="text-right">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {citasFiltradas.map((cita) => {
                    const badge = estadoBadge(cita.estado);
                    return (
                      <TableRow key={cita.id}>
                        <TableCell>{new Date(cita.fecha).toLocaleDateString("es-CL")}</TableCell>
                        <TableCell>{cita.hora_inicio?.slice(0, 5) || "—"}</TableCell>
                        <TableCell className="font-medium">{getFullName(cita.clientes, "Sin cliente")}</TableCell>
                        <TableCell>{cita.servicios?.nombre || "—"}</TableCell>
                        <TableCell>{getFullName(cita.empleados)}</TableCell>
                        <TableCell className="text-right">
                          <Badge className={badge.className}>{badge.label}</Badge>
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

