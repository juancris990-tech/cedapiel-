import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, FileText, Stethoscope, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface HistorialItem {
  id: string;
  tipo: "cita" | "atencion" | "nota";
  fecha: string;
  titulo: string;
  descripcion?: string;
  profesional?: string;
  estado?: string;
}

interface HistorialClinicoTimelineProps {
  items: HistorialItem[];
}

const getIcon = (tipo: string) => {
  switch (tipo) {
    case "cita":
      return <Calendar className="h-4 w-4" />;
    case "atencion":
      return <Stethoscope className="h-4 w-4" />;
    case "nota":
      return <FileText className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
};

const getColorClass = (tipo: string) => {
  switch (tipo) {
    case "cita":
      return "bg-primary";
    case "atencion":
      return "bg-secondary";
    case "nota":
      return "bg-accent";
    default:
      return "bg-muted";
  }
};

export const HistorialClinicoTimeline = ({ items }: HistorialClinicoTimelineProps) => {
  if (!items || items.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <p>No hay registros en el historial clínico</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={item.id} className="relative">
          {index !== items.length - 1 && (
            <div className="absolute left-6 top-12 h-full w-0.5 bg-border" />
          )}
          
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${getColorClass(item.tipo)} text-primary-foreground`}>
                  {getIcon(item.tipo)}
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-foreground">{item.titulo}</h4>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(item.fecha), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {item.tipo}
                    </Badge>
                  </div>
                  
                  {item.descripcion && (
                    <p className="text-sm text-foreground">{item.descripcion}</p>
                  )}
                  
                  {item.profesional && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>{item.profesional}</span>
                    </div>
                  )}
                  
                  {item.estado && (
                    <Badge variant={
                      item.estado === "finalizada" || item.estado === "asistida" || item.estado === "completada" ? "default" :
                      item.estado === "cancelada" || item.estado === "cancelada_cliente" || item.estado === "cancelada_clinica" ? "destructive" :
                      item.estado === "confirmada" ? "default" :
                      item.estado === "en_atencion" || item.estado === "llego_paciente" ? "secondary" :
                      "outline"
                    }>
                      {item.estado === "agendada" ? "Agendada" :
                       item.estado === "confirmada" ? "Confirmada" :
                       item.estado === "en_atencion" ? "En atención" :
                       item.estado === "finalizada" ? "Finalizada" :
                       item.estado === "cancelada" ? "Cancelada" :
                       item.estado === "no_asiste" ? "No asiste" :
                       item.estado === "reservada" ? "Reservada" :
                       item.estado === "llego_paciente" ? "Paciente llegó" :
                       item.estado === "asistida" ? "Atendida" :
                       item.estado === "no_show" ? "No se presentó" :
                       item.estado === "cancelada_cliente" ? "Cancelada por cliente" :
                       item.estado === "cancelada_clinica" ? "Cancelada por clínica" :
                       item.estado}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
};