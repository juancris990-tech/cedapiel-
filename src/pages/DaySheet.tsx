import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, DollarSign } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type DaySheetRow = {
  id: number;
  hora: string;
  cliente: string;
  servicio: string;
  empleado: string;
  duracion: number;
  precio: number;
};

const currency = (value: number) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);

const fullName = (person?: { nombre: string | null; apellidos: string | null } | null, fallback = "—") => {
  const name = `${person?.nombre || ""} ${person?.apellidos || ""}`.trim();
  return name || fallback;
};

const DaySheet = () => {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));

  const { data, isLoading } = useQuery({
    queryKey: ["daysheet-real", selectedDate],
    queryFn: async () => {
      const agendaSelect = `
        id,
        hora_inicio,
        id_cliente,
        id_empleado,
        id_servicio,
        clientes:clientes!agendas_id_cliente_fkey(nombre, apellidos),
        empleados:empleados!agendas_id_empleado_fkey(nombre, apellidos),
        servicios:servicios!agendas_id_servicio_fkey(nombre, precio, duracion_minutos)
      `;

      const { data: agendas, error } = await supabase
        .from("agendas")
        .select(agendaSelect)
        .eq("fecha", selectedDate)
        .order("hora_inicio", { ascending: true });

      if (error) throw error;

      const agendaRows = agendas || [];
      const citaIds = agendaRows.map((a) => a.id);
      const ventasMap = new Map<number, number>();

      if (citaIds.length > 0) {
        const { data: ventas, error: ventasError } = await supabase
          .from("ventas")
          .select("id_cita, total, monto_final_mxn, estado_venta")
          .in("id_cita", citaIds)
          .eq("estado_venta", "cerrada");

        if (ventasError) throw ventasError;

        (ventas || []).forEach((venta) => {
          if (venta.id_cita) {
            ventasMap.set(venta.id_cita, Number(venta.monto_final_mxn ?? venta.total ?? 0));
          }
        });
      }

      const rows: DaySheetRow[] = agendaRows.map((item) => {
        const precioServicio = Number(item.servicios?.precio || 0);
        const precioVenta = ventasMap.get(item.id) || 0;

        return {
          id: item.id,
          hora: item.hora_inicio,
          cliente: fullName(item.clientes),
          servicio: item.servicios?.nombre || "—",
          empleado: fullName(item.empleados),
          duracion: Number(item.servicios?.duracion_minutos || 0),
          precio: precioVenta || precioServicio,
        };
      });

      return rows;
    },
  });

  const summary = useMemo(() => {
    const rows = data || [];
    return {
      totalCitas: rows.length,
      totalIngresos: rows.reduce((acc, row) => acc + row.precio, 0),
    };
  }, [data]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hoja del Día</h1>
          <p className="text-muted-foreground">Citas ordenadas por hora con detalle comercial del día.</p>
        </div>

        <div className="w-full md:w-64">
          <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de citas</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalCitas}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos del día</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currency(summary.totalIngresos)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Citas del día</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : !data?.length ? (
            <div className="text-center py-8 text-muted-foreground">No hay citas para la fecha seleccionada.</div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hora</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Servicio</TableHead>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Duración</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.hora}</TableCell>
                        <TableCell>{row.cliente}</TableCell>
                        <TableCell>{row.servicio}</TableCell>
                        <TableCell>{row.empleado}</TableCell>
                        <TableCell>{row.duracion ? `${row.duracion} min` : "—"}</TableCell>
                        <TableCell className="text-right font-medium">{currency(row.precio)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4 rounded-md border bg-muted/30 p-4 flex flex-col gap-1 text-sm md:text-base md:flex-row md:justify-end md:gap-8">
                <div>
                  <span className="text-muted-foreground">Total de citas:</span>{" "}
                  <span className="font-semibold">{summary.totalCitas}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total de ingresos:</span>{" "}
                  <span className="font-semibold">{currency(summary.totalIngresos)}</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DaySheet;
