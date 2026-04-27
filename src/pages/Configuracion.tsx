import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, RotateCcw, Eye } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const [previewAmount, setPreviewAmount] = useState(1234.56);
  const [selectedDias, setSelectedDias] = useState<string[]>([]);

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
  };

  const onSubmit = (data: ConfigFormData) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Configuración General</h1>
        <p className="text-muted-foreground mt-2">
          Gestiona los parámetros del sistema que se aplican a todas las operaciones
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Información Regional</CardTitle>
            <CardDescription>
              Configura el país y la moneda del sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pais">País</Label>
                <Input
                  id="pais"
                  {...register("pais")}
                  placeholder="México"
                />
                {errors.pais && (
                  <p className="text-sm text-destructive">{errors.pais.message}</p>
                )}
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
                {errors.moneda && (
                  <p className="text-sm text-destructive">{errors.moneda.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Formato Monetario</CardTitle>
            <CardDescription>
              Define cómo se mostrarán los montos en el sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="formato_monetario">Formato Numérico</Label>
              <Input
                id="formato_monetario"
                {...register("formato_monetario")}
                placeholder="$1,000.00"
              />
              {errors.formato_monetario && (
                <p className="text-sm text-destructive">{errors.formato_monetario.message}</p>
              )}
            </div>

            <Alert>
              <Eye className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Vista previa:</span>
                  <span className="text-lg font-bold text-primary">
                    {formatPreview(previewAmount)}
                  </span>
                </div>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configuración de IVA</CardTitle>
            <CardDescription>
              Define si el IVA está incluido en los precios y su tasa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="iva_incluido">IVA Incluido en Precios</Label>
                <p className="text-sm text-muted-foreground">
                  Los precios mostrados incluyen IVA
                </p>
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
              {errors.tasa_iva && (
                <p className="text-sm text-destructive">{errors.tasa_iva.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Semana Laboral</CardTitle>
            <CardDescription>
              Selecciona los días de operación del negocio
            </CardDescription>
          </CardHeader>
          <CardContent>
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
            {errors.semana_laboral && (
              <p className="text-sm text-destructive mt-2">{errors.semana_laboral.message}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Período de Comisiones</CardTitle>
            <CardDescription>
              Define el ciclo semanal de cálculo de comisiones
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="periodo_comision_inicio">Día de Inicio</Label>
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
                <Label htmlFor="periodo_comision_fin">Día de Fin</Label>
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

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={!isDirty || updateMutation.isPending}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Restablecer Valores
          </Button>
          <Button
            type="submit"
            disabled={!isDirty || updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Guardar Cambios
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default Configuracion;
