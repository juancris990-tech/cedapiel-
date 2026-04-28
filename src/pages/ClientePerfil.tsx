import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Phone, Mail, Calendar, FileText,
  ShoppingCart, Image, Activity, Clock, User,
  AlertCircle, Hash
} from "lucide-react";
import { CitasClientePanel } from "@/components/clientes/CitasClientePanel";
import { NotasClientePanel } from "@/components/clientes/NotasClientePanel";
import { VentasClientePanel } from "@/components/clientes/VentasClientePanel";

export default function ClientePerfil() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const clienteId = parseInt(id || "0");

  // Datos del cliente
  const { data: cliente, isLoading } = useQuery({
    queryKey: ["cliente", clienteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .eq("id", clienteId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!clienteId,
  });

  // Stats: historial de citas del cliente
  const { data: citasData } = useQuery({
    queryKey: ["cliente-citas-stats", clienteId],
    queryFn: async () => {
      const { data } = await supabase
        .from("citas")
        .select("id, fecha, estado, precio_total")
        .eq("cliente_id", clienteId)
        .order("fecha", { ascending: false });
      return data || [];
    },
    enabled: !!clienteId,
  });

  if (isLoading) {
    return <div className="text-center py-8">Cargando ficha del cliente...</div>;
  }
  if (!cliente) {
    return <div className="text-center py-8">Cliente no encontrado</div>;
  }

  // Calcular stats
  const totalCitas = citasData?.length || 0;
  const totalGasto = citasData?.reduce((sum, c) => sum + (Number(c.precio_total) || 0), 0) || 0;
  const noShows = citasData?.filter((c) => c.estado === "no_show").length || 0;
  const ultimaVisita = citasData?.find((c) => c.estado === "completada");

  // Iniciales para el avatar
  const iniciales = [cliente.nombre?.[0], cliente.apellidos?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase() || "?";

  // Badge tipo de cliente según historial
  const getTipoCliente = () => {
    if (totalCitas >= 20) return { label: "VIP ⭐", cls: "bg-yellow-100 text-yellow-800 border border-yellow-300" };
    if (totalCitas >= 5)  return { label: "Regular", cls: "bg-blue-100 text-blue-800 border border-blue-300" };
    return { label: "Nuevo", cls: "bg-green-100 text-green-800 border border-green-300" };
  };
  const tipo = getTipoCliente();

  return (
    <div className="space-y-5 md:space-y-6">

      {/* ── Header ── */}
      <div className="rounded-2xl border border-border/70 bg-card p-4 md:p-5 shadow-sm flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate("/clientes")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Ficha del cliente</h1>
          <p className="text-muted-foreground text-sm md:text-base">Información y seguimiento completo en una sola vista</p>
        </div>
      </div>

      {/* ── Tarjeta de perfil mejorada ── */}
      <Card className="border-border/70 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6 items-start">

            {/* Avatar con iniciales */}
            <div className="flex-shrink-0">
              <div className="h-20 w-20 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-2xl font-bold select-none">
                {iniciales}
              </div>
            </div>

            {/* Datos principales */}
            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-bold">
                  {cliente.nombre} {cliente.apellidos || ""}
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${tipo.cls}`}>
                  {tipo.label}
                </span>
                {noShows > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-300">
                    {noShows} no-show{noShows > 1 ? "s" : ""}
                  </span>
                )}
                {cliente.alertas && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-300">
                    <AlertCircle className="h-3 w-3" /> Alerta
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                {cliente.telefono && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span>{cliente.telefono}</span>
                  </div>
                )}
                {cliente.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{cliente.email}</span>
                  </div>
                )}
                {cliente.fecha_nacimiento && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Nac. {cliente.fecha_nacimiento}</span>
                  </div>
                )}
                {cliente.referido_por && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>Referido por: {cliente.referido_por}</span>
                  </div>
                )}
                {ultimaVisita && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>Última visita: {ultimaVisita.fecha}</span>
                  </div>
                )}
              </div>

              {/* Banner de alerta interna */}
              {cliente.alertas && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span><strong>Alerta interna:</strong> {cliente.alertas}</span>
                </div>
              )}
            </div>

            {/* Chips de stats */}
            <div className="flex flex-row md:flex-col gap-3 flex-shrink-0">
              <div className="text-center bg-muted rounded-xl p-3 min-w-[80px]">
                <p className="text-2xl font-bold">{totalCitas}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Citas</p>
              </div>
              <div className="text-center bg-muted rounded-xl p-3 min-w-[80px]">
                <p className="text-xl font-bold">${totalGasto.toLocaleString("es-MX")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Gastado</p>
              </div>
              {noShows > 0 && (
                <div className="text-center bg-red-50 border border-red-200 rounded-xl p-3 min-w-[80px]">
                  <p className="text-2xl font-bold text-red-600">{noShows}</p>
                  <p className="text-xs text-red-500 mt-0.5">No-shows</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Tabs expandidos (6 tabs como GetTimely) ── */}
      <Tabs defaultValue="citas" className="w-full">
        <TabsList className="w-full grid grid-cols-3 md:grid-cols-6 h-auto gap-1 bg-transparent p-0">
          <TabsTrigger value="citas" className="flex items-center gap-1 text-xs sm:text-sm">
            <Calendar className="h-3.5 w-3.5 sm:mr-1" />
            <span className="hidden sm:inline">Citas</span>
          </TabsTrigger>
          <TabsTrigger value="ventas" className="flex items-center gap-1 text-xs sm:text-sm">
            <ShoppingCart className="h-3.5 w-3.5 sm:mr-1" />
            <span className="hidden sm:inline">Ventas</span>
          </TabsTrigger>
          <TabsTrigger value="notas" className="flex items-center gap-1 text-xs sm:text-sm">
            <FileText className="h-3.5 w-3.5 sm:mr-1" />
            <span className="hidden sm:inline">Notas</span>
          </TabsTrigger>
          <TabsTrigger value="fotos" className="flex items-center gap-1 text-xs sm:text-sm">
            <Image className="h-3.5 w-3.5 sm:mr-1" />
            <span className="hidden sm:inline">Fotos</span>
          </TabsTrigger>
          <TabsTrigger value="documentos" className="flex items-center gap-1 text-xs sm:text-sm">
            <Hash className="h-3.5 w-3.5 sm:mr-1" />
            <span className="hidden sm:inline">Docs</span>
          </TabsTrigger>
          <TabsTrigger value="historial" className="flex items-center gap-1 text-xs sm:text-sm">
            <Activity className="h-3.5 w-3.5 sm:mr-1" />
            <span className="hidden sm:inline">Historial</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab: Citas */}
        <TabsContent value="citas">
          <CitasClientePanel clienteId={clienteId} />
        </TabsContent>

        {/* Tab: Ventas */}
        <TabsContent value="ventas">
          <VentasClientePanel clienteId={clienteId} />
        </TabsContent>

        {/* Tab: Notas */}
        <TabsContent value="notas">
          <NotasClientePanel clienteId={clienteId} />
        </TabsContent>

        {/* Tab: Fotos (próximamente) */}
        <TabsContent value="fotos">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Galería de Fotos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Image className="h-14 w-14 mb-4 opacity-20" />
                <p className="font-semibold text-base">Sin fotos registradas</p>
                <p className="text-sm mt-1">Las fotos antes/después del tratamiento aparecerán aquí</p>
                <Button variant="outline" className="mt-5" disabled>
                  + Subir foto (próximamente)
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Documentos (próximamente) */}
        <TabsContent value="documentos">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documentos y Consentimientos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <FileText className="h-14 w-14 mb-4 opacity-20" />
                <p className="font-semibold text-base">Sin documentos adjuntos</p>
                <p className="text-sm mt-1">Consentimientos firmados y formularios aparecerán aquí</p>
                <Button variant="outline" className="mt-5" disabled>
                  + Subir documento (próximamente)
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Historial de actividad */}
        <TabsContent value="historial">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Registro de Actividad
              </CardTitle>
            </CardHeader>
            <CardContent>
              {citasData && citasData.length > 0 ? (
                <div className="space-y-1">
                  {citasData.map((cita, i) => (
                    <div key={i} className="flex items-center gap-3 py-2.5 border-b last:border-0">
                      <div className={`h-2 w-2 rounded-full flex-shrink-0 ${
                        cita.estado === "completada" ? "bg-green-500" :
                        cita.estado === "no_show"    ? "bg-red-500" :
                        cita.estado === "cancelada"  ? "bg-gray-400" :
                        "bg-blue-500"
                      }`} />
                      <div className="flex-1">
                        <p className="text-sm">
                          Cita —{" "}
                          <span className={`font-medium capitalize ${
                            cita.estado === "completada" ? "text-green-700" :
                            cita.estado === "no_show"    ? "text-red-700" :
                            cita.estado === "cancelada"  ? "text-gray-500" :
                            "text-blue-700"
                          }`}>
                            {cita.estado?.replace("_", " ") || "pendiente"}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">{cita.fecha}</p>
                      </div>
                      {cita.precio_total && (
                        <p className="text-sm font-medium text-right">
                          ${Number(cita.precio_total).toLocaleString("es-MX")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Activity className="h-10 w-10 mb-3 opacity-20" />
                  <p>Sin actividad registrada</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
