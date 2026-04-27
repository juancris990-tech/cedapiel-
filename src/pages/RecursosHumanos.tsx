import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, DollarSign, CheckCircle2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/layout/AppLayout";
import EmpleadoContratoCard from "@/components/rrhh/EmpleadoContratoCard";
import AsistenciaPanel from "@/components/rrhh/AsistenciaPanel";
import PermisosPanel from "@/components/rrhh/PermisosPanel";
import ProductividadPanel from "@/components/rrhh/ProductividadPanel";
import { LiquidacionPanel } from "@/components/rrhh/LiquidacionPanel";
import { ParametrosComisionPanel } from "@/components/rrhh/ParametrosComisionPanel";
import { Skeleton } from "@/components/ui/skeleton";

export default function RecursosHumanos() {
  const [activeTab, setActiveTab] = useState("contratos");

  const { data: empleados, isLoading } = useQuery({
    queryKey: ["empleados-rrhh"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empleados")
        .select(`
          *,
          sucursales:id_sucursal (
            id,
            nombre
          )
        `)
        .order('activo', { ascending: false })
        .order("nombre");

      if (error) throw error;
      return data || [];
    },
  });

  const empleadosActivos = empleados?.filter((e) => e.activo) || [];
  const empleadosInactivos = empleados?.filter((e) => !e.activo) || [];
  const profesionales = empleadosActivos.filter(e => e.es_profesional);

  // KPI stats - Productividad
  const { data: statsProductividad } = useQuery({
    queryKey: ['stats-productividad-semana'],
    queryFn: async () => {
      const hoy = new Date();
      const inicioSemana = new Date(hoy);
      inicioSemana.setDate(hoy.getDate() - hoy.getDay() + (hoy.getDay() === 0 ? -6 : 1));
      
      const { data, error } = await supabase
        .from('vw_productividad_empleado')
        .select('*')
        .gte('semana_inicio', inicioSemana.toISOString().split('T')[0]);
      
      if (error) throw error;
      return data || [];
    },
  });

  // KPI stats - Citas de la semana
  const { data: citasSemana } = useQuery({
    queryKey: ['citas-semana-rrhh'],
    queryFn: async () => {
      const hoy = new Date();
      const inicioSemana = new Date(hoy);
      inicioSemana.setDate(hoy.getDate() - hoy.getDay() + (hoy.getDay() === 0 ? -6 : 1));
      const finSemana = new Date(inicioSemana);
      finSemana.setDate(inicioSemana.getDate() + 6);
      
      const { data, error } = await supabase
        .from('agendas')
        .select('*')
        .gte('fecha', inicioSemana.toISOString().split('T')[0])
        .lte('fecha', finSemana.toISOString().split('T')[0])
        .not('id_empleado', 'is', null);
      
      if (error) throw error;
      return data || [];
    },
  });

  const totalHorasSemana = statsProductividad?.reduce((sum, e) => sum + Number(e.horas_trabajadas || 0), 0) || 0;
  const totalComisionesSemana = statsProductividad?.reduce((sum, e) => sum + Number(e.comision_mxn || 0), 0) || 0;
  
  // Calcular métricas de agenda
  const citasCompletadas = citasSemana?.filter(c => c.estado === 'asistida' || c.estado === 'finalizada').length || 0;
  const citasTotales = citasSemana?.length || 0;
  const tasaAsistencia = citasTotales > 0 ? ((citasCompletadas / citasTotales) * 100).toFixed(1) : '0.0';
  
  // Calcular utilización real (horas trabajadas vs horas disponibles)
  const horasDisponiblesSemana = empleadosActivos.reduce((sum, e) => sum + Number(e.horas_semana || 0), 0);
  const utilizacionReal = horasDisponiblesSemana > 0 ? ((totalHorasSemana / horasDisponiblesSemana) * 100).toFixed(1) : '0.0';

  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Recursos Humanos</h1>
        <p className="text-muted-foreground">
          Gestión integral de personal, nómina, asistencia y productividad
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empleados Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{empleadosActivos.length}</div>
            <p className="text-xs text-muted-foreground">
              {profesionales.length} profesionales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Citas Completadas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{citasCompletadas}</div>
            <p className="text-xs text-muted-foreground">
              de {citasTotales} programadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Asistencia</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tasaAsistencia}%</div>
            <p className="text-xs text-muted-foreground">
              Semana actual
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comisiones Semana</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalComisionesSemana.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              MXN proyectado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs con módulos */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="contratos">Contratos</TabsTrigger>
              <TabsTrigger value="asistencia">Asistencia</TabsTrigger>
              <TabsTrigger value="permisos">Permisos</TabsTrigger>
              <TabsTrigger value="productividad">Productividad</TabsTrigger>
              <TabsTrigger value="liquidacion">Nómina Semanal</TabsTrigger>
              <TabsTrigger value="comisiones">Comisiones</TabsTrigger>
            </TabsList>

        {/* Contratos */}
        <TabsContent value="contratos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Empleados Activos</CardTitle>
              <CardDescription>
                Personal con contrato vigente
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {empleadosActivos.map((empleado) => (
                    <EmpleadoContratoCard key={empleado.id} empleado={empleado} />
                  ))}
                  {empleadosActivos.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No hay empleados activos registrados
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Asistencia */}
        <TabsContent value="asistencia">
          <AsistenciaPanel />
        </TabsContent>

        {/* Permisos */}
        <TabsContent value="permisos">
          <PermisosPanel />
        </TabsContent>

        {/* Productividad */}
        <TabsContent value="productividad">
          <ProductividadPanel />
        </TabsContent>

        {/* Liquidación/Nómina Semanal */}
        <TabsContent value="liquidacion">
          <LiquidacionPanel />
        </TabsContent>

        {/* Parámetros de Comisión - Ahora muestra submenu */}
        <TabsContent value="comisiones">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Gestión de Comisiones</CardTitle>
                <CardDescription>
                  Administra reglas, cálculos y simulaciones de comisiones
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button 
                    onClick={() => window.location.href = '/rrhh/comisiones/reglas'} 
                    variant="outline" 
                    className="h-24 flex-col"
                  >
                    <div className="text-center">
                      <div className="text-lg font-semibold">Reglas</div>
                      <div className="text-sm text-muted-foreground">Gestionar porcentajes por persona/categoría</div>
                    </div>
                  </Button>
                  <Button 
                    onClick={() => window.location.href = '/rrhh/comisiones/calculo'} 
                    variant="outline" 
                    className="h-24 flex-col"
                  >
                    <div className="text-center">
                      <div className="text-lg font-semibold">Cálculo</div>
                      <div className="text-sm text-muted-foreground">Comisiones por periodo</div>
                    </div>
                  </Button>
                  <Button 
                    onClick={() => window.location.href = '/rrhh/comisiones/simulador'} 
                    variant="outline" 
                    className="h-24 flex-col"
                  >
                    <div className="text-center">
                      <div className="text-lg font-semibold">Simulador</div>
                      <div className="text-sm text-muted-foreground">Probar escenarios</div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            {/* Parámetros legacy para compatibilidad */}
            <ParametrosComisionPanel />
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </AppLayout>
  );
}
