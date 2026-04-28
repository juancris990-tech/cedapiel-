import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Bell,
  BriefcaseBusiness,
  Building2,
  Clock3,
  ExternalLink,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Plug,
  Save,
  Settings2,
  Sparkles,
  Users,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type BusinessSettings = {
  nombreNegocio: string;
  logoUrl: string;
  direccion: string;
  horarioApertura: string;
  horarioCierre: string;
};

type NotificationSettings = {
  whatsappRecordatorios: boolean;
  emailRecordatorios: boolean;
};

type IntegrationSettings = {
  whatsappConectado: boolean;
};

const BUSINESS_STORAGE_KEY = "cedapiel.business-settings";
const NOTIFICATION_STORAGE_KEY = "cedapiel.notification-settings";
const INTEGRATION_STORAGE_KEY = "cedapiel.integration-settings";

const defaultBusinessSettings: BusinessSettings = {
  nombreNegocio: "Cedapiel",
  logoUrl: "",
  direccion: "",
  horarioApertura: "09:00",
  horarioCierre: "19:00",
};

const defaultNotificationSettings: NotificationSettings = {
  whatsappRecordatorios: true,
  emailRecordatorios: false,
};

const defaultIntegrationSettings: IntegrationSettings = {
  whatsappConectado: false,
};

const diasSemana = [
  { value: "lunes", label: "Lunes" },
  { value: "martes", label: "Martes" },
  { value: "miércoles", label: "Miércoles" },
  { value: "jueves", label: "Jueves" },
  { value: "viernes", label: "Viernes" },
  { value: "sábado", label: "Sábado" },
  { value: "domingo", label: "Domingo" },
];

const configSchema = z.object({
  pais: z.string().min(1, "El país es requerido"),
  moneda: z.string().min(1, "La moneda es requerida"),
  formato_monetario: z.string().min(1, "El formato monetario es requerido"),
  iva_incluido: z.boolean(),
  tasa_iva: z.number().min(0).max(100),
  semana_laboral: z.string().min(1, "Debe seleccionar al menos un día"),
  periodo_comision_inicio: z.string().min(1, "El día de inicio es requerido"),
  periodo_comision_fin: z.string().min(1, "El día de fin es requerido"),
});

type ConfigFormData = z.infer<typeof configSchema>;

const Configuracion = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDias, setSelectedDias] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("negocio");
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>(defaultBusinessSettings);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(defaultNotificationSettings);
  const [integrationSettings, setIntegrationSettings] = useState<IntegrationSettings>(defaultIntegrationSettings);

  const { data: empleados = [], isLoading: isLoadingEmpleados } = useQuery({
    queryKey: ["configuracion-empleados-quick-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empleados")
        .select("id, nombre, apellidos, activo, especialidad")
        .order("activo", { ascending: false })
        .order("nombre")
        .limit(6);

      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: servicios = [], isLoading: isLoadingServicios } = useQuery({
    queryKey: ["configuracion-servicios-quick-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("servicios")
        .select("id, nombre, activo, precio")
        .order("activo", { ascending: false })
        .order("nombre")
        .limit(8);

      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: config, isLoading } = useQuery({
    queryKey: ["configuracion"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parametros_sistema")
        .select("*")
        .eq("activo", true)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<ConfigFormData>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      pais: "México",
      moneda: "MXN",
      formato_monetario: "$1,000.00",
      iva_incluido: true,
      tasa_iva: 16,
      semana_laboral: "lunes,martes,miércoles,jueves,viernes,sábado",
      periodo_comision_inicio: "sábado",
      periodo_comision_fin: "viernes",
    },
  });

  const formatoMonetario = watch("formato_monetario");
  const moneda = watch("moneda");

  useEffect(() => {
    const storedBusiness = localStorage.getItem(BUSINESS_STORAGE_KEY);
    const storedNotifications = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    const storedIntegrations = localStorage.getItem(INTEGRATION_STORAGE_KEY);

    if (storedBusiness) {
      try {
        setBusinessSettings({ ...defaultBusinessSettings, ...JSON.parse(storedBusiness) });
      } catch {
        setBusinessSettings(defaultBusinessSettings);
      }
    }

    if (storedNotifications) {
      try {
        setNotificationSettings({ ...defaultNotificationSettings, ...JSON.parse(storedNotifications) });
      } catch {
        setNotificationSettings(defaultNotificationSettings);
      }
    }

    if (storedIntegrations) {
      try {
        setIntegrationSettings({ ...defaultIntegrationSettings, ...JSON.parse(storedIntegrations) });
      } catch {
        setIntegrationSettings(defaultIntegrationSettings);
      }
    }
  }, []);

  useEffect(() => {
    if (config) {
      reset({
        pais: config.pais,
        moneda: config.moneda,
        formato_monetario: config.formato_monetario,
        iva_incluido: config.iva_incluido,
        tasa_iva: config.tasa_iva,
        semana_laboral: config.semana_laboral,
        periodo_comision_inicio: config.periodo_comision_inicio,
        periodo_comision_fin: config.periodo_comision_fin,
      });
      setSelectedDias(config.semana_laboral.split(","));
    }
  }, [config, reset]);

  const formatPreview = (amount: number): string => {
    const simbolo = moneda === "MXN" ? "$" : moneda === "USD" ? "$" : "€";
    const formatted = amount.toLocaleString("es-MX", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${simbolo}${formatted}`;
  };

  const empleadosActivos = useMemo(() => empleados.filter((empleado) => empleado.activo), [empleados]);
  const serviciosActivos = useMemo(() => servicios.filter((servicio) => servicio.activo), [servicios]);

  const updateMutation = useMutation({
    mutationFn: async (data: ConfigFormData) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) throw new Error("Usuario no autenticado");

      const { data: currentConfig } = await supabase
        .from("parametros_sistema")
        .select("*")
        .eq("activo", true)
        .single();

      const { error: updateError } = await supabase
        .from("parametros_sistema")
        .update({
          pais: data.pais,
          moneda: data.moneda,
          formato_monetario: data.formato_monetario,
          iva_incluido: data.iva_incluido,
          tasa_iva: data.tasa_iva,
          semana_laboral: data.semana_laboral,
          periodo_comision_inicio: data.periodo_comision_inicio,
          periodo_comision_fin: data.periodo_comision_fin,
          updated_at: new Date().toISOString(),
        })
        .eq("activo", true);

      if (updateError) throw updateError;

      const logs = [];
      if (currentConfig) {
        for (const [key, value] of Object.entries(data)) {
          if (currentConfig[key] !== value) {
            logs.push({
              campo_modificado: key,
              valor_anterior: String(currentConfig[key]),
              valor_nuevo: String(value),
              modificado_por: session.session.user.id,
              notas: `Cambio realizado desde la interfaz de configuración`,
            });
          }
        }
      }

      if (logs.length > 0) {
        const { error: logError } = await supabase
          .from("configuracion_logs")
          .insert(logs);

        if (logError) console.error("Error al guardar logs:", logError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["configuracion"] });
      toast({
        title: "Configuración actualizada",
        description: "Los cambios se han guardado correctamente",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la configuración",
        variant: "destructive",
      });
    },
  });

  const handleDiaToggle = (dia: string) => {
    const newDias = selectedDias.includes(dia)
      ? selectedDias.filter((d) => d !== dia)
      : [...selectedDias, dia];
    setSelectedDias(newDias);
    setValue("semana_laboral", newDias.join(","), { shouldDirty: true });
  };

  const handleReset = () => {
    if (config) {
      reset({
        pais: config.pais,
        moneda: config.moneda,
        formato_monetario: config.formato_monetario,
        iva_incluido: config.iva_incluido,
        tasa_iva: config.tasa_iva,
        semana_laboral: config.semana_laboral,
        periodo_comision_inicio: config.periodo_comision_inicio,
        periodo_comision_fin: config.periodo_comision_fin,
      });
      setSelectedDias(config.semana_laboral.split(","));
    }

    setBusinessSettings(defaultBusinessSettings);
    localStorage.removeItem(BUSINESS_STORAGE_KEY);
  };

  const onSubmit = (data: ConfigFormData) => {
    updateMutation.mutate(data);
  };

  const saveBusinessSettings = () => {
    localStorage.setItem(BUSINESS_STORAGE_KEY, JSON.stringify(businessSettings));
    toast({
      title: "Negocio actualizado",
      description: "Se guardó la configuración de identidad y operación del negocio",
    });
  };

  const saveNotificationSettings = () => {
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notificationSettings));
    toast({
      title: "Notificaciones actualizadas",
      description: "Preferencias de recordatorios guardadas correctamente",
    });
  };

  const toggleWhatsappIntegration = () => {
    const updated = { whatsappConectado: !integrationSettings.whatsappConectado };
    setIntegrationSettings(updated);
    localStorage.setItem(INTEGRATION_STORAGE_KEY, JSON.stringify(updated));
  };

  const sectionHeader = (
    icon: React.ReactNode,
    title: string,
    description: string,
  ) => (
    <div className="mb-4">
      <div className="flex items-center gap-2">
        <div className="rounded-md bg-primary/10 p-2 text-primary">{icon}</div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Configuración</h1>
        <p className="text-muted-foreground mt-2">
          Centraliza los ajustes de negocio, personal, servicios, notificaciones e integraciones
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto gap-1">
          <TabsTrigger value="negocio" className="flex items-center gap-2 py-2">
            <Building2 className="h-4 w-4" />
            Negocio
          </TabsTrigger>
          <TabsTrigger value="personal" className="flex items-center gap-2 py-2">
            <Users className="h-4 w-4" />
            Empleados/Personal
          </TabsTrigger>
          <TabsTrigger value="servicios" className="flex items-center gap-2 py-2">
            <Sparkles className="h-4 w-4" />
            Servicios
          </TabsTrigger>
          <TabsTrigger value="notificaciones" className="flex items-center gap-2 py-2">
            <Bell className="h-4 w-4" />
            Notificaciones
          </TabsTrigger>
          <TabsTrigger value="integraciones" className="flex items-center gap-2 py-2">
            <Plug className="h-4 w-4" />
            Integraciones
          </TabsTrigger>
        </TabsList>

        <TabsContent value="negocio" className="mt-6 space-y-6">
          {sectionHeader(
            <BriefcaseBusiness className="h-4 w-4" />,
            "Negocio",
            "Configura nombre, logo, horarios, dirección y parámetros operativos generales",
          )}

          <Card>
            <CardHeader>
              <CardTitle>Identidad del negocio</CardTitle>
              <CardDescription>Datos base visibles para el equipo y las operaciones</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre-negocio">Nombre del negocio</Label>
                  <Input
                    id="nombre-negocio"
                    value={businessSettings.nombreNegocio}
                    onChange={(e) => setBusinessSettings((prev) => ({ ...prev, nombreNegocio: e.target.value }))}
                    placeholder="Cedapiel"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logo-negocio">Logo (URL)</Label>
                  <Input
                    id="logo-negocio"
                    value={businessSettings.logoUrl}
                    onChange={(e) => setBusinessSettings((prev) => ({ ...prev, logoUrl: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="horario-apertura" className="flex items-center gap-1">
                    <Clock3 className="h-3.5 w-3.5" /> Horario apertura
                  </Label>
                  <Input
                    id="horario-apertura"
                    type="time"
                    value={businessSettings.horarioApertura}
                    onChange={(e) => setBusinessSettings((prev) => ({ ...prev, horarioApertura: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="horario-cierre" className="flex items-center gap-1">
                    <Clock3 className="h-3.5 w-3.5" /> Horario cierre
                  </Label>
                  <Input
                    id="horario-cierre"
                    type="time"
                    value={businessSettings.horarioCierre}
                    onChange={(e) => setBusinessSettings((prev) => ({ ...prev, horarioCierre: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="direccion-negocio" className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> Dirección
                </Label>
                <Input
                  id="direccion-negocio"
                  value={businessSettings.direccion}
                  onChange={(e) => setBusinessSettings((prev) => ({ ...prev, direccion: e.target.value }))}
                  placeholder="Av. Principal 123, Ciudad"
                />
              </div>

              <div className="flex justify-end">
                <Button type="button" onClick={saveBusinessSettings}>
                  <Save className="w-4 h-4 mr-2" />
                  Guardar datos del negocio
                </Button>
              </div>
            </CardContent>
          </Card>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Información regional y moneda</CardTitle>
                <CardDescription>Configura país y moneda de operación</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pais">País</Label>
                    <Input id="pais" {...register("pais")} placeholder="México" />
                    {errors.pais && <p className="text-sm text-destructive">{errors.pais.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="moneda">Moneda</Label>
                    <Select
                      value={watch("moneda")}
                      onValueChange={(value) => setValue("moneda", value, { shouldDirty: true })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MXN">MXN - Peso Mexicano</SelectItem>
                        <SelectItem value="USD">USD - Dólar Americano</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.moneda && <p className="text-sm text-destructive">{errors.moneda.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="formato_monetario">Formato monetario</Label>
                  <Input id="formato_monetario" {...register("formato_monetario")} placeholder="$1,000.00" />
                  {errors.formato_monetario && (
                    <p className="text-sm text-destructive">{errors.formato_monetario.message}</p>
                  )}
                </div>

                <Alert>
                  <Settings2 className="h-4 w-4" />
                  <AlertDescription>
                    Vista previa de monto: <span className="font-semibold text-primary">{formatPreview(1234.56)}</span>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Impuestos y operación semanal</CardTitle>
                <CardDescription>Controla IVA, semana laboral y ciclo de comisiones</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="iva_incluido">IVA incluido en precios</Label>
                      <p className="text-sm text-muted-foreground">Define si los precios mostrados incluyen IVA</p>
                    </div>
                    <Switch
                      id="iva_incluido"
                      checked={watch("iva_incluido")}
                      onCheckedChange={(checked) => setValue("iva_incluido", checked, { shouldDirty: true })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tasa_iva">Tasa de IVA (%)</Label>
                    <Input
                      id="tasa_iva"
                      type="number"
                      step="0.01"
                      {...register("tasa_iva", { valueAsNumber: true })}
                      placeholder="16.00"
                    />
                    {errors.tasa_iva && <p className="text-sm text-destructive">{errors.tasa_iva.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Semana laboral</Label>
                  <div className="flex flex-wrap gap-2">
                    {diasSemana.map((dia) => (
                      <Button
                        key={dia.value}
                        type="button"
                        variant={selectedDias.includes(dia.value) ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleDiaToggle(dia.value)}
                      >
                        {dia.label}
                      </Button>
                    ))}
                  </div>
                  {errors.semana_laboral && <p className="text-sm text-destructive mt-2">{errors.semana_laboral.message}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="periodo_comision_inicio">Día de inicio comisión</Label>
                    <Select
                      value={watch("periodo_comision_inicio")}
                      onValueChange={(value) => setValue("periodo_comision_inicio", value, { shouldDirty: true })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {diasSemana.map((dia) => (
                          <SelectItem key={dia.value} value={dia.value}>
                            {dia.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.periodo_comision_inicio && (
                      <p className="text-sm text-destructive">{errors.periodo_comision_inicio.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="periodo_comision_fin">Día de fin comisión</Label>
                    <Select
                      value={watch("periodo_comision_fin")}
                      onValueChange={(value) => setValue("periodo_comision_fin", value, { shouldDirty: true })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {diasSemana.map((dia) => (
                          <SelectItem key={dia.value} value={dia.value}>
                            {dia.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.periodo_comision_fin && (
                      <p className="text-sm text-destructive">{errors.periodo_comision_fin.message}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={handleReset} disabled={updateMutation.isPending}>
                Restablecer
              </Button>
              <Button type="submit" disabled={!isDirty || updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Guardar cambios del sistema
                  </>
                )}
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="personal" className="mt-6 space-y-6">
          {sectionHeader(
            <Users className="h-4 w-4" />,
            "Empleados / Personal",
            "Accede rápidamente al equipo para revisar estado y editar su información",
          )}

          <Card>
            <CardHeader>
              <CardTitle>Lista rápida de personal</CardTitle>
              <CardDescription>
                {empleadosActivos.length} activos de {empleados.length} registrados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoadingEmpleados ? (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Cargando personal...
                </div>
              ) : empleados.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay empleados registrados todavía.</p>
              ) : (
                empleados.map((empleado) => (
                  <div key={empleado.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium">{`${empleado.nombre ?? ""} ${empleado.apellidos ?? ""}`.trim() || "Sin nombre"}</p>
                      <p className="text-xs text-muted-foreground">
                        {empleado.especialidad || "Sin especialidad"} · {empleado.activo ? "Activo" : "Inactivo"}
                      </p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link to="/rrhh">
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                      </Link>
                    </Button>
                  </div>
                ))
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                <Button asChild>
                  <Link to="/rrhh">
                    Gestionar personal <ExternalLink className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/usuarios">
                    Usuarios y permisos <ExternalLink className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="servicios" className="mt-6 space-y-6">
          {sectionHeader(
            <Sparkles className="h-4 w-4" />,
            "Servicios",
            "Consulta rápidamente el catálogo y entra a editar servicios y categorías",
          )}

          <Card>
            <CardHeader>
              <CardTitle>Catálogo de servicios</CardTitle>
              <CardDescription>
                {serviciosActivos.length} activos de {servicios.length} en total
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoadingServicios ? (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Cargando servicios...
                </div>
              ) : servicios.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay servicios registrados.</p>
              ) : (
                servicios.slice(0, 5).map((servicio) => (
                  <div key={servicio.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium">{servicio.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {servicio.activo ? "Activo" : "Inactivo"} · {formatPreview(Number(servicio.precio ?? 0))}
                      </p>
                    </div>
                    <Badge variant={servicio.activo ? "default" : "secondary"}>
                      {servicio.activo ? "Disponible" : "No disponible"}
                    </Badge>
                  </div>
                ))
              )}

              <Button asChild>
                <Link to="/catalogo-servicios">
                  Ir al catálogo <ExternalLink className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notificaciones" className="mt-6 space-y-6">
          {sectionHeader(
            <Bell className="h-4 w-4" />,
            "Notificaciones",
            "Activa o desactiva recordatorios automáticos para clientes y equipo",
          )}

          <Card>
            <CardHeader>
              <CardTitle>Recordatorios automáticos</CardTitle>
              <CardDescription>Canales de envío para recordatorios de citas y seguimiento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-green-600" /> WhatsApp
                  </p>
                  <p className="text-sm text-muted-foreground">Enviar recordatorios y confirmaciones por WhatsApp</p>
                </div>
                <Switch
                  checked={notificationSettings.whatsappRecordatorios}
                  onCheckedChange={(checked) =>
                    setNotificationSettings((prev) => ({ ...prev, whatsappRecordatorios: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-600" /> Email
                  </p>
                  <p className="text-sm text-muted-foreground">Enviar recordatorios y notificaciones por correo electrónico</p>
                </div>
                <Switch
                  checked={notificationSettings.emailRecordatorios}
                  onCheckedChange={(checked) =>
                    setNotificationSettings((prev) => ({ ...prev, emailRecordatorios: checked }))
                  }
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={saveNotificationSettings}>
                  <Save className="w-4 h-4 mr-2" />
                  Guardar preferencias
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integraciones" className="mt-6 space-y-6">
          {sectionHeader(
            <Plug className="h-4 w-4" />,
            "Integraciones",
            "Monitorea el estado de conexión de canales externos y herramientas",
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" /> WhatsApp Business
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      integrationSettings.whatsappConectado
                        ? "border-green-500/40 bg-green-500/10 text-green-700"
                        : "border-red-500/40 bg-red-500/10 text-red-700"
                    }
                  >
                    {integrationSettings.whatsappConectado ? "Conectado" : "Pendiente de configurar"}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Estado de canal para envío de recordatorios y mensajes automáticos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Mantén este canal activo para automatizar confirmaciones y reducir ausencias.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={toggleWhatsappIntegration}>
                    {integrationSettings.whatsappConectado ? "Marcar como pendiente" : "Marcar como conectado"}
                  </Button>
                  <Button asChild>
                    <Link to="/api-config">
                      Ir a configuración API <ExternalLink className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Email transaccional</CardTitle>
                <CardDescription>Canal secundario para confirmaciones y resúmenes</CardDescription>
              </CardHeader>
              <CardContent>
                <Badge variant="secondary">Disponible</Badge>
                <p className="text-sm text-muted-foreground mt-3">
                  Úsalo como respaldo para clientes que no usan WhatsApp.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Configuracion;
