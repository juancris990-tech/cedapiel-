import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Calendar, Clock, DollarSign, Briefcase, Award } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import ContratoDialog from "./ContratoDialog";

interface EmpleadoContratoCardProps {
  empleado: any;
  readonly?: boolean;
}

const EmpleadoContratoCard = ({ empleado, readonly = false }: EmpleadoContratoCardProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "$0.00";
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);
  };

  const calcularAntiguedad = () => {
    if (!empleado.fecha_contratacion) return "N/A";
    const diff = new Date().getTime() - new Date(empleado.fecha_contratacion).getTime();
    const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365));
    const months = Math.floor((diff % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30));
    
    if (years > 0) {
      return `${years} ${years === 1 ? 'año' : 'años'}${months > 0 ? ` ${months}m` : ''}`;
    }
    return `${months} ${months === 1 ? 'mes' : 'meses'}`;
  };

  const getDiasHastaVencimiento = () => {
    if (!empleado.fecha_termino) return null;
    const diff = new Date(empleado.fecha_termino).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const diasVencimiento = getDiasHastaVencimiento();

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">
                {empleado.nombre} {empleado.apellidos}
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Briefcase className="h-3 w-3" />
                {empleado.sucursales?.nombre || "Sin sucursal"}
              </CardDescription>
            </div>
            {!readonly && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDialogOpen(true)}
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </div>
          {empleado.es_profesional && empleado.especialidad && (
            <Badge variant="secondary" className="w-fit">
              <Award className="h-3 w-3 mr-1" />
              {empleado.especialidad}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span>Salario/Hora</span>
              </div>
              <p className="text-lg font-bold text-primary">
                {formatCurrency(empleado.salario_hora)}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Horas/Semana</span>
              </div>
              <p className="text-lg font-bold">
                {empleado.horas_semana || "N/A"}
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Jornada:</span>
              <Badge variant="outline">{empleado.tipo_jornada || "No definida"}</Badge>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Antigüedad:</span>
              <span className="font-medium">{calcularAntiguedad()}</span>
            </div>

            {empleado.fecha_contratacion && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Contratación:</span>
                <span className="font-medium">
                  {format(new Date(empleado.fecha_contratacion), "dd MMM yyyy", { locale: es })}
                </span>
              </div>
            )}

            {empleado.vigencia_salario && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Vigencia salario:</span>
                <span className="font-medium">
                  {format(new Date(empleado.vigencia_salario), "dd MMM yyyy", { locale: es })}
                </span>
              </div>
            )}

            {empleado.fecha_termino && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Fecha término:</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {format(new Date(empleado.fecha_termino), "dd MMM yyyy", { locale: es })}
                  </span>
                  {diasVencimiento !== null && diasVencimiento > 0 && diasVencimiento <= 30 && (
                    <Badge variant="destructive" className="text-xs">
                      {diasVencimiento} días
                    </Badge>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Vacaciones disponibles:</span>
              <Badge variant={Number(empleado.vacaciones_disponibles) > 0 ? "default" : "secondary"}>
                {empleado.vacaciones_disponibles || 0} días
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {!readonly && (
        <ContratoDialog
          empleado={empleado}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}
    </>
  );
};

export default EmpleadoContratoCard;
