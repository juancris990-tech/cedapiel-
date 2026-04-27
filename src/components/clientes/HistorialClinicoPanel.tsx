import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, Download, FileText } from "lucide-react";
import { HistorialClinicoTimeline } from "./HistorialClinicoTimeline";
import { format, subMonths } from "date-fns";

interface HistorialClinicoPanelProps {
  clienteId: number;
}

export const HistorialClinicoPanel = ({ clienteId }: HistorialClinicoPanelProps) => {
  const [tipoFiltro, setTipoFiltro] = useState<string>("todos");
  const [rangoMeses, setRangoMeses] = useState<string>("6");

  const { data: cliente } = useQuery({
    queryKey: ["cliente", clienteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nombre, apellidos, email, telefono, numero_expediente")
        .eq("id", clienteId)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: historial, isLoading } = useQuery({
    queryKey: ["historial-clinico", clienteId, tipoFiltro, rangoMeses],
    queryFn: async () => {
      const fechaDesde = subMonths(new Date(), parseInt(rangoMeses));
      
      // Obtener citas
      let citasQuery = supabase
        .from("agendas")
        .select(`
          id,
          fecha,
          hora_inicio,
          estado,
          observaciones,
          empleados:id_empleado(nombre, apellidos),
          servicios:id_servicio(nombre)
        `)
        .eq("id_cliente", clienteId)
        .gte("fecha", format(fechaDesde, "yyyy-MM-dd"))
        .order("fecha", { ascending: false });

      const { data: citas, error: citasError } = await citasQuery;
      if (citasError) throw citasError;

      // Obtener notas de citas
      let notasQuery = supabase
        .from("notas_citas")
        .select(`
          id,
          nota,
          creado_en,
          agendas!inner(id_cliente, fecha),
          profiles:creado_por(nombre_completo)
        `)
        .eq("agendas.id_cliente", clienteId)
        .gte("agendas.fecha", format(fechaDesde, "yyyy-MM-dd"))
        .order("creado_en", { ascending: false });

      const { data: notas, error: notasError } = await notasQuery;
      if (notasError) throw notasError;

      // Obtener notas de cliente
      let notasClienteQuery = supabase
        .from("notas_clientes")
        .select(`
          id,
          nota,
          creado_en,
          profiles:creado_por(nombre_completo)
        `)
        .eq("id_cliente", clienteId)
        .gte("creado_en", fechaDesde.toISOString())
        .order("creado_en", { ascending: false });

      const { data: notasCliente, error: notasClienteError } = await notasClienteQuery;
      if (notasClienteError) throw notasClienteError;

      // Combinar y formatear todos los items
      const items = [];

      if (tipoFiltro === "todos" || tipoFiltro === "cita") {
        citas?.forEach((cita: any) => {
          items.push({
            id: `cita-${cita.id}`,
            tipo: "cita" as const,
            fecha: `${cita.fecha}T${cita.hora_inicio || "00:00:00"}`,
            titulo: cita.servicios?.nombre || "Cita",
            descripcion: cita.observaciones,
            profesional: cita.empleados ? `${cita.empleados.nombre} ${cita.empleados.apellidos}` : undefined,
            estado: cita.estado,
          });
        });
      }

      if (tipoFiltro === "todos" || tipoFiltro === "nota") {
        notas?.forEach((nota: any) => {
          items.push({
            id: `nota-cita-${nota.id}`,
            tipo: "nota" as const,
            fecha: nota.creado_en,
            titulo: "Nota de cita",
            descripcion: nota.nota,
            profesional: nota.profiles?.nombre_completo,
          });
        });

        notasCliente?.forEach((nota: any) => {
          items.push({
            id: `nota-cliente-${nota.id}`,
            tipo: "nota" as const,
            fecha: nota.creado_en,
            titulo: "Nota clínica",
            descripcion: nota.nota,
            profesional: nota.profiles?.nombre_completo,
          });
        });
      }

      // Ordenar por fecha descendente
      items.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

      return items;
    },
  });

  const handleExportPDF = async () => {
    // TODO: Implementar exportación PDF
    console.log("Exportar PDF del historial clínico");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Historial Clínico</CardTitle>
              <CardDescription>
                {cliente && `${cliente.nombre} ${cliente.apellidos || ""}`}
                {cliente?.numero_expediente && ` - Exp: ${cliente.numero_expediente}`}
              </CardDescription>
            </div>
            <Button onClick={handleExportPDF} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <Label>Tipo de registro</Label>
              <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="cita">Citas</SelectItem>
                  <SelectItem value="nota">Notas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Rango de tiempo</Label>
              <Select value={rangoMeses} onValueChange={setRangoMeses}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Último mes</SelectItem>
                  <SelectItem value="3">Últimos 3 meses</SelectItem>
                  <SelectItem value="6">Últimos 6 meses</SelectItem>
                  <SelectItem value="12">Último año</SelectItem>
                  <SelectItem value="999">Todo el historial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <HistorialClinicoTimeline items={historial || []} />
          )}
        </CardContent>
      </Card>
    </div>
  );
};