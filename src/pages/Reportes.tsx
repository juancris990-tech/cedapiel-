import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, startOfMonth, endOfMonth, subDays, startOfYear, endOfYear, subMonths, subYears } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, TrendingUp, TrendingDown, Users, Calendar as CalendarIconLucide, DollarSign, RefreshCw, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

type PresetType = "mes" | "30dias" | "anio" | "personalizado";

const Reportes = () => {
  const [preset, setPreset] = useState<PresetType>("mes");
  const [selectedSucursal, setSelectedSucursal] = useState<string>("todas");
  const [selectedEmpleado, setSelectedEmpleado] = useState<string>("todos");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(startOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date | undefined>(endOfMonth(new Date()));

  // Calcular fechas según preset
  const handlePresetChange = (value: PresetType) => {
    setPreset(value);
    const today = new Date();
    switch (value) {
      case "mes":
        setDateFrom(startOfMonth(today));
        setDateTo(endOfMonth(today));
        break;
      case "30dias":
        setDateFrom(subDays(today, 30));
        setDateTo(today);
        break;
      case "anio":
        setDateFrom(startOfYear(today));
        setDateTo(endOfYear(today));
        break;
    }
  };

  // Obtener sucursales únicas desde los datos importados
  const { data: sucursalesData } = useQuery({
    queryKey: ["sucursales-reporte"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daysheet_citas")
        .select("sucursal");
      if (error) throw error;
      
      // Extraer sucursales únicas
      const sucursalesUnicas = Array.from(new Set(
        data.map(d => d.sucursal).filter(Boolean)
      )).sort();
      
      return sucursalesUnicas.map((nombre, index) => ({
        id: index + 1,
        nombre
      }));
    },
  });

  // Obtener profesionales únicos desde los datos importados
  const { data: profesionalesData } = useQuery({
    queryKey: ["profesionales-reporte"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daysheet_citas")
        .select("profesional");
      if (error) throw error;
      
      // Extraer profesionales únicos
      const profesionalesUnicos = Array.from(new Set(
        data.map(d => d.profesional).filter(Boolean)
      )).sort();
      
      return profesionalesUnicos.map((nombre, index) => ({
        id: index + 1,
        nombre
      }));
    },
  });

  // Fetch clientes reporte (importado)
  const { data: clientesReporte, isLoading: loadingClientes } = useQuery({
    queryKey: ["clientes-reporte"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes_reporte")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  // Fetch citas agendadas (importado) - SIN filtro de fecha (datos estáticos CSV)
  const { data: citasAgendadas, isLoading: loadingCitasAgendadas } = useQuery({
    queryKey: ["citas-agendadas-reporte"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("citas_agendadas")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  // Fetch daysheet (citas completadas) - SIN filtro de fecha (datos estáticos CSV)
  const { data: daysheetCitas } = useQuery({
    queryKey: ["daysheet-citas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daysheet_citas")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  // Fetch citas canceladas (importado) - SIN filtro de fecha (datos estáticos CSV)
  const { data: citasCanceladas } = useQuery({
    queryKey: ["citas-canceladas-reporte"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("citas_canceladas")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  // Fetch clientes inactivos (para retención)
  const { data: clientesInactivos } = useQuery({
    queryKey: ["clientes-inactivos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes_inactivos")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  // Fetch gasto clientes (para ventas)
  const { data: gastoClientes } = useQuery({
    queryKey: ["gasto-clientes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gasto_clientes_periodo")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  // Fetch resumen ejecutivo desde la vista
  const { data: resumenEjecutivo } = useQuery({
    queryKey: ["resumen-ejecutivo", selectedSucursal],
    queryFn: async () => {
      let query = (supabase as any).from("vw_resumen_ejecutivo").select("*");
      
      if (selectedSucursal !== "todas") {
        query = query.eq("id_sucursal", parseInt(selectedSucursal));
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch operación clínica desde la vista
  const { data: operacionClinica } = useQuery({
    queryKey: ["operacion-clinica", selectedSucursal],
    queryFn: async () => {
      let query = (supabase as any).from("vw_operacion_clinica").select("*");
      
      if (selectedSucursal !== "todas") {
        query = query.eq("id_sucursal", parseInt(selectedSucursal));
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch facturación detalle (importado) - SIN filtro de fecha (datos estáticos Excel)
  const { data: facturacionDetalle, isLoading: loadingVentas } = useQuery({
    queryKey: ["facturacion-detalle"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facturacion_detalle")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  // Fetch proyección valor futuro
  const { data: proyeccionFuturo } = useQuery({
    queryKey: ["proyeccion-futuro"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proyeccion_valor_futuro")
        .select("*");
      if (error) throw error;
      return data;
    },
  });


  // 🔧 Calcular KPIs usando EXCLUSIVAMENTE datos importados
  const kpis = useMemo(() => {
    if (!clientesReporte || !citasAgendadas || !daysheetCitas || !citasCanceladas || !facturacionDetalle) return null;

    // Aplicar filtros a los datos
    const daysheetFiltrado = daysheetCitas.filter(cita => {
      if (selectedSucursal !== "todas" && cita.sucursal !== selectedSucursal) return false;
      if (selectedEmpleado !== "todos" && cita.profesional !== selectedEmpleado) return false;
      return true;
    });

    const citasAgendadasFiltradas = citasAgendadas.filter(cita => {
      if (selectedSucursal !== "todas" && cita.sucursal !== selectedSucursal) return false;
      if (selectedEmpleado !== "todos" && cita.profesional !== selectedEmpleado) return false;
      return true;
    });

    const citasCanceladasFiltradas = citasCanceladas.filter(cita => {
      if (selectedSucursal !== "todas" && cita.sucursal !== selectedSucursal) return false;
      if (selectedEmpleado !== "todos" && cita.profesional !== selectedEmpleado) return false;
      return true;
    });

    const facturacionFiltrada = facturacionDetalle.filter(item => {
      if (selectedSucursal !== "todas" && item.sucursal !== selectedSucursal) return false;
      if (selectedEmpleado !== "todos" && item.profesional !== selectedEmpleado) return false;
      return true;
    });

    // 📊 1. CLIENTES TOTALES / NUEVOS
    // 📄 Archivo: Reporte de clientes.csv → clientes_reporte
    // Clientes Totales = número de filas
    // Clientes Nuevos = filas con cantidad_citas = 1
    const clientesTotales = clientesReporte.length;
    const clientesNuevos = clientesReporte.filter(c => c.cantidad_citas === 1).length;
    const pctNuevos = clientesTotales > 0 ? (clientesNuevos / clientesTotales * 100) : 0;

    // 📅 2. TOTAL DE CITAS
    // 📄 Archivos: 
    //    - Reporte de citas (lo que está agendado).csv → citas filtradas
    //    - Reporte DaySheet.csv → completadas filtradas
    //    - Reporte citas canceladas.csv → canceladas filtradas
    
    const citasFuturas = citasAgendadasFiltradas.length;
    const citasCompletadas = daysheetFiltrado.filter(c => 
      c.estado?.toLowerCase() === 'completed'
    ).length;
    const canceladas = citasCanceladasFiltradas.length;
    
    const totalCitas = citasFuturas + citasCompletadas + canceladas;

    // 🛠️ 3. SERVICIOS REALIZADOS
    // 📄 Archivo: Reporte DaySheet.csv → daysheet_citas completadas
    const serviciosRealizados = citasCompletadas;

    // 🚫 8. NO-SHOW RATE
    // 📄 Archivo: Reporte citas canceladas.csv → citas_canceladas
    const noShows = citasCanceladasFiltradas.length;
    const noShowRate = totalCitas > 0 ? (noShows / totalCitas * 100) : 0;

    // 💵 4. FACTURACIÓN TOTAL / TICKET PROMEDIO
    // 📄 Archivo: Detalles de facturación.xlsx → facturacion_detalle
    const facturacionTotal = facturacionFiltrada.reduce((sum, item) => 
      sum + (Number(item.monto_mxn) || 0), 0
    );
    
    const ticketPromedio = serviciosRealizados > 0 
      ? facturacionTotal / serviciosRealizados 
      : 0;

    // Separar facturación por tipo (usando monto_mxn)
    const facturacionServicios = facturacionFiltrada
      .filter(item => {
        const tipo = (item.tipo || '').toLowerCase();
        return tipo.includes('service') || tipo.includes('servic') || tipo.includes('appointment');
      })
      .reduce((sum, item) => sum + (Number(item.monto_mxn) || 0), 0);
    
    const facturacionProductos = facturacionFiltrada
      .filter(item => {
        const tipo = (item.tipo || '').toLowerCase();
        return tipo.includes('product') || tipo.includes('produc');
      })
      .reduce((sum, item) => sum + (Number(item.monto_mxn) || 0), 0);

    // ♻ 5. % RETENCIÓN
    // 📄 Archivos: 
    //    - Reporte de clientes.csv → clientes_reporte
    const clientesRecurrentes = clientesReporte.filter(c => 
      (c.cantidad_citas || 0) > 1
    ).length;
    const pctRetencion = clientesTotales > 0 
      ? (clientesRecurrentes / clientesTotales * 100) 
      : 0;

    // 🔄 6. % REAGENDAN
    // 📄 Archivo: Reporte de citas (lo que está agendado).csv → citas_agendadas
    const citasPorCliente: { [key: string]: number } = {};
    citasAgendadasFiltradas.forEach(cita => {
      const cliente = cita.cliente?.toLowerCase().trim() || '';
      if (cliente) {
        citasPorCliente[cliente] = (citasPorCliente[cliente] || 0) + 1;
      }
    });
    
    const clientesReagendan = Object.values(citasPorCliente).filter(numCitas => numCitas >= 2).length;
    const totalClientesConCita = Object.keys(citasPorCliente).length;
    const pctReagendan = totalClientesConCita > 0 
      ? (clientesReagendan / totalClientesConCita * 100) 
      : 0;

    // ⏳ 7. TIEMPO ENTRE VISITAS
    // 📄 Archivo: Reporte DaySheet.csv → daysheet_citas (ordenar por fecha)
    const clientesFechas: { [key: string]: Date[] } = {};
    
    daysheetFiltrado.forEach(cita => {
      if (cita.estado?.toLowerCase() === 'completed' && cita.cliente) {
        const cliente = cita.cliente.toLowerCase().trim();
        const fecha = new Date(cita.fecha);
        if (!isNaN(fecha.getTime())) {
          if (!clientesFechas[cliente]) {
            clientesFechas[cliente] = [];
          }
          clientesFechas[cliente].push(fecha);
        }
      }
    });
    
    let totalDiasEntreVisitas = 0;
    let contadorDiferencias = 0;
    
    Object.values(clientesFechas).forEach(fechas => {
      if (fechas.length > 1) {
        fechas.sort((a, b) => a.getTime() - b.getTime());
        for (let i = 1; i < fechas.length; i++) {
          const dias = (fechas[i].getTime() - fechas[i-1].getTime()) / (1000 * 60 * 60 * 24);
          totalDiasEntreVisitas += dias;
          contadorDiferencias++;
        }
      }
    });
    
    const tiempoPromedioDias = contadorDiferencias > 0 
      ? totalDiasEntreVisitas / contadorDiferencias 
      : 0;

    // 💰 9. VALOR FUTURO
    // 📄 Archivo: Reporte Valor futuro (ventas de lo que está agendado).csv → proyeccion_valor_futuro
    const valorFuturo = proyeccionFuturo?.reduce((sum, p) => 
      sum + (Number(p.valor_futuro_mxn) || 0), 0
    ) || 0;

    return {
      clientesTotales,
      clientesNuevos,
      pctNuevos: pctNuevos.toFixed(2),
      totalCitas,
      serviciosRealizados,
      noShows,
      noShowRate: noShowRate.toFixed(2),
      pctRetencion: pctRetencion.toFixed(2),
      pctReagendan: pctReagendan.toFixed(2),
      tiempoPromedioDias: tiempoPromedioDias.toFixed(1),
      ticketPromedio: ticketPromedio.toFixed(2),
      facturacionTotal: facturacionTotal.toFixed(2),
      facturacionServicios: facturacionServicios.toFixed(2),
      facturacionProductos: facturacionProductos.toFixed(2),
      valorFuturo: valorFuturo.toFixed(2),
      citasFuturas,
      canceladas,
    };
  }, [
    clientesReporte, 
    citasAgendadas, 
    daysheetCitas, 
    citasCanceladas,
    facturacionDetalle, 
    clientesInactivos,
    gastoClientes,
    proyeccionFuturo,
    selectedSucursal,
    selectedEmpleado,
    dateFrom, 
    dateTo
  ]);

  const isLoading = loadingClientes || loadingCitasAgendadas || loadingVentas;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reportes / Resumen Ejecutivo</h1>
          <p className="text-muted-foreground">Análisis de rendimiento y métricas clave</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href="/reportes/descuentos" className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Descuentos
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href="/reportes/diferidos" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Diferidos
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href="/reportes/ingresos" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Ingresos
            </a>
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Sucursal</label>
              <Select value={selectedSucursal} onValueChange={setSelectedSucursal}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las sucursales</SelectItem>
                  {sucursalesData?.map((s) => (
                    <SelectItem key={s.id} value={s.nombre}>
                      {s.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Profesional</label>
              <Select value={selectedEmpleado} onValueChange={setSelectedEmpleado}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los profesionales</SelectItem>
                  {profesionalesData?.map((p) => (
                    <SelectItem key={p.id} value={p.nombre}>
                      {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Período</label>
              <Select value={preset} onValueChange={(v) => handlePresetChange(v as PresetType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mes">Mes en curso</SelectItem>
                  <SelectItem value="30dias">Últimos 30 días</SelectItem>
                  <SelectItem value="anio">Año en curso</SelectItem>
                  <SelectItem value="personalizado">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button variant="outline" size="icon">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {preset === "personalizado" && (
            <div className="flex gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Desde</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "PPP", { locale: es }) : "Seleccionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Hasta</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "PPP", { locale: es }) : "Seleccionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPIs Cards */}
      {isLoading ? (
        <div className="text-center py-12">Cargando datos...</div>
      ) : kpis ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clientes Totales</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis.clientesTotales}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {kpis.clientesNuevos} nuevos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Citas</CardTitle>
                <CalendarIconLucide className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis.totalCitas}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {kpis.citasFuturas} futuras, {kpis.serviciosRealizados} completadas, {kpis.canceladas} canceladas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Servicios Realizados</CardTitle>
                <CalendarIconLucide className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis.serviciosRealizados}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {kpis.totalCitas > 0 ? ((kpis.serviciosRealizados / kpis.totalCitas) * 100).toFixed(1) : 0}% completadas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Facturación Total</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${parseFloat(kpis.facturacionTotal).toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Ticket promedio: ${parseFloat(kpis.ticketPromedio).toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">% Retención</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis.pctRetencion}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Clientes recurrentes
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">% Reagendan</CardTitle>
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis.pctReagendan}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Con cita futura
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tiempo Entre Visitas</CardTitle>
                <CalendarIconLucide className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis.tiempoPromedioDias}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  días promedio
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clientes Nuevos</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis.clientesNuevos}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {kpis.clientesTotales > 0 ? ((kpis.clientesNuevos / kpis.clientesTotales) * 100).toFixed(1) : 0}% del total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">No-show Rate</CardTitle>
                <CalendarIconLucide className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{kpis.noShowRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {kpis.noShows} no-shows de {kpis.totalCitas} citas
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Evolución de Citas</CardTitle>
                <CardDescription>Comparativa mensual</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    { tipo: "Futuras", cantidad: kpis.citasFuturas },
                    { tipo: "Completadas", cantidad: kpis.serviciosRealizados },
                    { tipo: "Canceladas", cantidad: kpis.canceladas },
                    { tipo: "No-shows", cantidad: kpis.noShows },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="tipo" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="cantidad" fill="hsl(var(--primary))" name="Citas" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Estado de Citas</CardTitle>
                <CardDescription>Distribución por estado</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Completadas", value: kpis.serviciosRealizados },
                        { name: "Otras", value: kpis.totalCitas - kpis.serviciosRealizados },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={80}
                      fill="hsl(var(--primary))"
                      dataKey="value"
                    >
                      <Cell fill="hsl(var(--primary))" />
                      <Cell fill="hsl(var(--muted))" />
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Facturación por Categoría</CardTitle>
                <CardDescription>Servicios vs Productos</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    { categoria: "Servicios", monto: parseFloat(kpis.facturacionServicios) },
                    { categoria: "Productos", monto: parseFloat(kpis.facturacionProductos) },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="categoria" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="monto" fill="hsl(var(--chart-2))" name="Facturación" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Comparativo de Facturación</CardTitle>
                <CardDescription>Período actual vs anteriores</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={[
                    { periodo: "Año Anterior", facturacion: 0 },
                    { periodo: "Mes Anterior", facturacion: 0 },
                    { periodo: "Actual", facturacion: parseFloat(kpis.facturacionTotal) },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="periodo" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                    <Legend />
                    <Line type="monotone" dataKey="facturacion" stroke="hsl(var(--chart-1))" name="Facturación" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-muted-foreground">No hay datos disponibles</div>
      )}
    </div>
  );
};

export default Reportes;
