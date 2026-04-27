import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function SimuladorComision() {
  const [idEmpleado, setIdEmpleado] = useState("");
  const [idServicio, setIdServicio] = useState("NONE");
  const [idCategoria, setIdCategoria] = useState("NONE");
  const [baseMxn, setBaseMxn] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [resultado, setResultado] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const { data: empleados } = useQuery({
    queryKey: ['empleados-activos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('empleados')
        .select('id, nombre, apellidos')
        .eq('activo', true)
        .order('nombre');
      if (error) throw error;
      return data;
    },
  });

  const { data: categorias } = useQuery({
    queryKey: ['categorias-servicio'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categoria_servicio')
        .select('id, nombre')
        .eq('activo', true)
        .order('nombre');
      if (error) throw error;
      return data;
    },
  });

  const { data: servicios } = useQuery({
    queryKey: ['servicios-activos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('servicios')
        .select('id, nombre')
        .eq('activo', true)
        .order('nombre');
      if (error) throw error;
      return data;
    },
  });

  const handleSimular = async () => {
    if (!idEmpleado || !baseMxn) {
      toast.error("Debes seleccionar un empleado e ingresar la base");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('simular-comision', {
        method: 'POST',
        body: {
          id_empleado: parseInt(idEmpleado),
          id_servicio: idServicio && idServicio !== "NONE" ? parseInt(idServicio) : null,
          id_categoria: idCategoria && idCategoria !== "NONE" ? parseInt(idCategoria) : null,
          base_mxn: parseFloat(baseMxn),
          fecha,
        },
      });

      if (error) throw error;

      setResultado(data);
      toast.success("Simulación completada");
    } catch (error: any) {
      console.error('Error en simulación:', error);
      toast.error(error.message || "Error al simular");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold">Simulador de Comisiones</h1>
          <p className="text-muted-foreground">
            Calcula la comisión que se aplicaría para un escenario específico
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Parámetros de Simulación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Empleado *</Label>
                <Select value={idEmpleado} onValueChange={setIdEmpleado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar empleado" />
                  </SelectTrigger>
                  <SelectContent>
                    {empleados?.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>
                        {emp.nombre} {emp.apellidos}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Servicio (opcional)</Label>
                <Select value={idServicio} onValueChange={setIdServicio}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar servicio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Sin servicio específico</SelectItem>
                    {servicios?.map((serv) => (
                      <SelectItem key={serv.id} value={serv.id.toString()}>
                        {serv.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Categoría (opcional)</Label>
                <Select 
                  value={idCategoria} 
                  onValueChange={setIdCategoria}
                  disabled={idServicio !== "NONE"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Sin categoría específica</SelectItem>
                    {categorias?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Base (MXN) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={baseMxn}
                  onChange={(e) => setBaseMxn(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <Button 
              onClick={handleSimular} 
              disabled={loading}
              className="w-full"
            >
              <Calculator className="w-4 h-4 mr-2" />
              {loading ? "Simulando..." : "Simular Comisión"}
            </Button>
          </CardContent>
        </Card>

        {resultado && (
          <Card>
            <CardHeader>
              <CardTitle>Resultado de la Simulación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground">Base</div>
                  <div className="text-2xl font-bold">
                    ${resultado.base_mxn.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground">% Aplicado</div>
                  <div className="text-2xl font-bold text-orange-600">
                    {resultado.porcentaje_aplicado}%
                  </div>
                </div>

                <div className="p-4 bg-primary/10 rounded-lg">
                  <div className="text-sm text-muted-foreground">Comisión</div>
                  <div className="text-2xl font-bold text-primary">
                    ${resultado.comision_mxn.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {resultado.fuente_regla ? (
                <div className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">Regla Aplicada</div>
                    <Badge>Prioridad {resultado.fuente_regla.prioridad}</Badge>
                  </div>
                  <div className="text-sm">{resultado.fuente_regla.descripcion}</div>
                  <div className="text-xs text-muted-foreground">
                    Vigencia: {resultado.fuente_regla.vigencia}
                  </div>
                </div>
              ) : (
                <div className="p-4 border border-yellow-500 rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
                  <div className="font-medium text-yellow-900 dark:text-yellow-100">
                    No se encontró ninguna regla aplicable
                  </div>
                  <div className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                    Se aplicó 0% de comisión porque no hay ninguna regla que coincida con los criterios.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
