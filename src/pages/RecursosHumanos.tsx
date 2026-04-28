import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Award, CheckCircle2, Trophy, Users } from "lucide-react";
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
  const [busquedaEmpleado, setBusquedaEmpleado] = useState("");

  const now = new Date();
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const finMes = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

  const ESTADOS_COMPLETADOS = new Set(["asistida", "finalizada", "completada", "completed"]);
  const normalizeEstado = (estado?: string | null) => (estado || "").toLowerCase().trim();
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(value || 0);

  const initials = (nombre?: string | null, apellidos?: string | null) => {
    const full = `${nombre || ""} ${apellidos || ""}`.trim();
    if (!full) return "--";
    const parts = full.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  };

  const fullName = (nombre?: string | null, apellidos?: string | null) =>
    `${nombre || ""} ${apellidos || ""}`.trim() || "Sin nombre";

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
  const profesionales = empleadosActivos.filter((e) => e.es_profesional);

  const { data: resumenMes } = useQuery({
    queryKey: ["rrhh-resumen-mes", inicioMes, finMes],
    queryFn: async () => {
      const [agendasRes, ventasRes] = await Promise.all([
        supabase
          .from("agendas")
          .select("id, id_empleado, estado, fecha")
          .gte("fecha", inicioMes)
          .lte("fecha", finMes)
          .not("id_empleado", "is", null),
        supabase
          .from("ventas")
          .select("id_cita, estado_venta, total, monto_final_mxn, fecha")
          .gte("fecha", inicioMes)
          .lte("fecha", finMes),
      ]);

      if (agendasRes.error) throw agendasRes.error;
      if (ventasRes.error) throw ventasRes.error;

      return {
        agendasMes: agendasRes.data || [],
        ventasMes: ventasRes.data || [],
      };
    },
  });

  const metricasMensuales = useMemo(() => {
    const agendasMes = resumenMes?.agendasMes || [];
    const ventasMes = resumenMes?.ventasMes || [];

    const citasPorEmpleado = new Map<number, number>();
    const ingresosPorEmpleado = new Map<number, number>();
    const agendaById = new Map<number, number>();

    agendasMes.forEach((agenda) => {
      if (!agenda.id_empleado) return;
      agendaById.set(agenda.id, agenda.id_empleado);
      if (!ESTADOS_COMPLETADOS.has(normalizeEstado(agenda.estado))) return;
      citasPorEmpleado.set(agenda.id_empleado, (citasPorEmpleado.get(agenda.id_empleado) || 0) + 1);
    });

    ventasMes.forEach((venta) => {
      if ((venta.estado_venta || "").toLowerCase() !== "cerrada") return;
      if (!venta.id_cita) return;
      const idEmpleado = agendaById.get(venta.id_cita);
      if (!idEmpleado) return;

      const monto = Number(venta.monto_final_mxn ?? venta.total ?? 0);
      ingresosPorEmpleado.set(idEmpleado, (ingresosPorEmpleado.get(idEmpleado) || 0) + monto);
    });

    const rows = (empleados || []).map((emp) => {
      const nombreCompleto = fullName(emp.nombre, emp.apellidos);
      return {
        id: emp.id,
        nombreCompleto,
        especialidadCargo: emp.especialidad || emp.cargo || "Sin especialidad/cargo",
        citasMes: citasPorEmpleado.get(emp.id) || 0,
        ingresosMes: ingresosPorEmpleado.get(emp.id) || 0,
        activo: Boolean(emp.activo),
        iniciales: initials(emp.nombre, emp.apellidos),
      };
    });

    const totalCitasCompletadasMes = rows.reduce((sum, row) => sum + row.citasMes, 0);
    const empleadoDelMes = [...rows].sort((a, b) => b.citasMes - a.citasMes)[0] || null;
    const topIngresos = [...rows]
      .filter((row) => row.ingresosMes > 0)
      .sort((a, b) => b.ingresosMes - a.ingresosMes)
      .slice(0, 3);

    return {
      rows,
      totalCitasCompletadasMes,
      empleadoDelMes,
      topIngresos,
    };
  }, [resumenMes, empleados]);

  const empleadosFiltrados = useMemo(() => {
    const term = busquedaEmpleado.trim().toLowerCase();
    if (!term) return metricasMensuales.rows;
    return metricasMensuales.rows.filter((row) => row.nombreCompleto.toLowerCase().includes(term));
  }, [metricasMensuales.rows, busquedaEmpleado]);

  const medalForPosition = (index: number) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return "";
  };

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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total empleados activos</CardTitle>
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
            <CardTitle className="text-sm font-medium">Citas completadas este mes</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metricasMensuales.totalCitasCompletadasMes}</div>
            <p className="text-xs text-muted-foreground">
              Suma de todos los empleados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empleado del mes</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold truncate">
              {metricasMensuales.empleadoDelMes?.nombreCompleto || "Sin datos"}
            </div>
            <p className="text-xs text-muted-foreground">
              {metricasMensuales.empleadoDelMes
                ? `${metricasMensuales.empleadoDelMes.citasMes} citas completadas`
                : "Aún no hay citas completadas"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 3 por ingresos del mes</CardTitle>
            <CardDescription>Ranking según ventas cerradas asociadas a citas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metricasMensuales.topIngresos.length > 0 ? (
                metricasMensuales.topIngresos.map((emp, index) => (
                  <div key={emp.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xl" aria-hidden>
                        {medalForPosition(index)}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{emp.nombreCompleto}</p>
                        <p className="text-xs text-muted-foreground">{emp.citasMes} citas</p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold whitespace-nowrap">{formatCurrency(emp.ingresosMes)}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No hay ingresos registrados este mes.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="space-y-3">
            <div>
              <CardTitle>Equipo</CardTitle>
              <CardDescription>Productividad e ingresos por empleado del mes actual</CardDescription>
            </div>
            <Input
              value={busquedaEmpleado}
              onChange={(e) => setBusquedaEmpleado(e.target.value)}
              placeholder="Buscar por nombre de empleado"
            />
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Especialidad / Cargo</TableHead>
                    <TableHead className="text-right">Citas del mes</TableHead>
                    <TableHead className="text-right">Ingresos del mes</TableHead>
                    <TableHead className="text-right">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {empleadosFiltrados.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback>{emp.iniciales}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{emp.nombreCompleto}</span>
                        </div>
                      </TableCell>
                      <TableCell>{emp.especialidadCargo}</TableCell>
                      <TableCell className="text-right">{emp.citasMes}</TableCell>
                      <TableCell className="text-right">{formatCurrency(emp.ingresosMes)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={emp.activo ? "default" : "secondary"}>
                          {emp.activo ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}

                  {empleadosFiltrados.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No se encontraron empleados para la búsqueda actual.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
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
