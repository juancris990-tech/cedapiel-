import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { parseDateOnlyToLocal } from "@/lib/date";
import { Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Appointment {
  id: number | string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: string;
  id_cliente: number;
  id_empleado: number;
  id_servicio: number;
  id_sucursal: number;
  clientes: { nombre: string; apellidos: string; email?: string; telefono?: string } | null;
  empleados: { nombre: string; apellidos: string } | null;
  sucursales: { nombre: string } | null;
  servicios: { nombre: string } | null;
  observaciones?: string;
  _source?: string;
}

interface AgendaTableViewProps {
  appointments: Appointment[];
  onAppointmentClick: (appointmentId: number | string) => void;
}

const getEstadoVariant = (estado: string) => {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    agendada: "outline",
    confirmada: "default",
    en_atencion: "secondary",
    finalizada: "default",
    cancelada: "destructive",
    no_asiste: "destructive",
  };
  return variants[estado] || "outline";
};

const estadoLabels: Record<string, string> = {
  agendada: "Agendada",
  confirmada: "Confirmada",
  en_atencion: "En atención",
  finalizada: "Finalizada",
  cancelada: "Cancelada",
  no_asiste: "No asiste",
};

export function AgendaTableView({ appointments, onAppointmentClick }: AgendaTableViewProps) {
  const navigate = useNavigate();

  const handleClientClick = (e: React.MouseEvent, clientId: number) => {
    e.stopPropagation();
    navigate(`/clientes/${clientId}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vista de Tabla - Agenda</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Correo electrónico</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Sucursal</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Hora inicio</TableHead>
                <TableHead>Hora término</TableHead>
                <TableHead>Profesional</TableHead>
                <TableHead>Servicio reservado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                    No hay citas para mostrar
                  </TableCell>
                </TableRow>
              ) : (
                appointments.map((apt) => (
                  <TableRow key={apt.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(parseDateOnlyToLocal(apt.fecha), "dd/MM/yyyy", { locale: es })}
                    </TableCell>
                    <TableCell className="font-medium">
                      <span 
                        className="hover:text-primary hover:underline cursor-pointer"
                        onClick={(e) => handleClientClick(e, apt.id_cliente)}
                      >
                        {apt.clientes?.nombre} {apt.clientes?.apellidos}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {apt.clientes?.email || "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {apt.clientes?.telefono || "-"}
                    </TableCell>
                    <TableCell>{apt.sucursales?.nombre}</TableCell>
                    <TableCell>
                      <Badge variant={getEstadoVariant(apt.estado)}>
                        {estadoLabels[apt.estado] || apt.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{apt.hora_inicio}</TableCell>
                    <TableCell className="whitespace-nowrap">{apt.hora_fin}</TableCell>
                    <TableCell>
                      {apt.empleados?.nombre} {apt.empleados?.apellidos}
                    </TableCell>
                    <TableCell>{apt.servicios?.nombre}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onAppointmentClick(apt.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
