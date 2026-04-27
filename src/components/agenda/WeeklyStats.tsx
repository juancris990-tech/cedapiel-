import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, CalendarX, Calendar, TrendingDown } from "lucide-react";

interface WeeklyStatsProps {
  appointments: Array<{ estado: string }>;
}

export function WeeklyStats({ appointments }: WeeklyStatsProps) {
  const total = appointments.length;
  const porEstado = appointments.reduce((acc, apt) => {
    acc[apt.estado] = (acc[apt.estado] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const finalizada = porEstado.finalizada || 0;
  const noAsiste = porEstado.no_asiste || 0;
  const canceladas = porEstado.cancelada || 0;
  const noShowRate = total > 0 ? ((noAsiste / total) * 100).toFixed(1) : "0.0";

  const estadosInfo = [
    { estado: "agendada", label: "Agendada", color: "bg-gray-500" },
    { estado: "confirmada", label: "Confirmada", color: "bg-blue-500" },
    { estado: "en_atencion", label: "En Atención", color: "bg-yellow-500" },
    { estado: "finalizada", label: "Finalizada", color: "bg-green-500" },
    { estado: "cancelada", label: "Cancelada", color: "bg-red-500" },
    { estado: "no_asiste", label: "No Asiste", color: "bg-orange-500" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Citas</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{total}</div>
          <div className="flex flex-wrap gap-1 mt-2">
            {estadosInfo.map(({ estado, label, color }) => (
              porEstado[estado] > 0 && (
                <Badge key={estado} variant="outline" className={`${color} text-white text-xs`}>
                  {label}: {porEstado[estado]}
                </Badge>
              )
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Finalizadas</CardTitle>
          <CalendarCheck className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{finalizada}</div>
          <p className="text-xs text-muted-foreground">
            {total > 0 ? ((finalizada / total) * 100).toFixed(1) : 0}% del total
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">No Asiste</CardTitle>
          <TrendingDown className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{noShowRate}%</div>
          <p className="text-xs text-muted-foreground">
            {noAsiste} de {total} citas
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Canceladas</CardTitle>
          <CalendarX className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{canceladas}</div>
          <p className="text-xs text-muted-foreground">
            {total > 0 ? ((canceladas / total) * 100).toFixed(1) : 0}% del total
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
