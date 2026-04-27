import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, DollarSign, TrendingUp } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { useEffect } from "react";

const Dashboard = () => {
  const queryClient = useQueryClient();

  // Fetch dashboard metrics from real system data
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      // Get current month date range
      const now = new Date();
      const primerDia = startOfMonth(now).toISOString().split('T')[0];
      const ultimoDia = endOfMonth(now).toISOString().split('T')[0];

      const [citasRes, ventasRes, clientesRes] = await Promise.all([
        supabase
          .from("agendas")
          .select("*")
          .gte("fecha", primerDia)
          .lte("fecha", ultimoDia),
        supabase
          .from("ventas")
          .select("*, venta_items(*)")
          .eq("estado_venta", "cerrada")
          .gte("fecha", primerDia)
          .lte("fecha", ultimoDia),
        supabase
          .from("clientes")
          .select("id")
          .eq("activo", true)
      ]);

      const citas = citasRes.data || [];
      const ventas = ventasRes.data || [];
      const clientes = clientesRes.data || [];

      // Calculate total appointments
      const totalCitas = citas.length;

      // Calculate total active clients
      const totalClientes = clientes.length;

      // Calculate total sales from closed sales
      const totalVentas = ventas.reduce((sum, v) => {
        const subtotal = v.venta_items?.reduce((s: number, item: any) => 
          s + Number(item.subtotal || 0), 0) || 0;
        return sum + subtotal;
      }, 0);

      // Calculate average ticket
      const promedioTicket = ventas.length > 0 ? totalVentas / ventas.length : 0;

      return {
        totalCitas,
        totalClientes,
        totalVentas,
        promedioTicket,
      };
    },
  });

  // Setup realtime subscriptions for dashboard updates
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agendas'
        },
        () => {
          // Refetch stats when appointments change
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ventas'
        },
        () => {
          // Refetch stats when sales change
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'venta_items'
        },
        () => {
          // Refetch stats when sale items change
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const metrics = [
    {
      title: "Citas del Mes",
      value: stats?.totalCitas || 0,
      icon: Calendar,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Clientes Activos",
      value: stats?.totalClientes || 0,
      icon: Users,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      title: "Ventas Totales",
      value: `$${stats?.totalVentas.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`,
      icon: DollarSign,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Ticket Promedio",
      value: `$${stats?.promedioTicket.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`,
      icon: TrendingUp,
      color: "text-info",
      bgColor: "bg-info/10",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Resumen ejecutivo de Cedapiel
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.title}
              </CardTitle>
              <div className={`${metric.bgColor} p-2 rounded-lg`}>
                <metric.icon className={`h-4 w-4 ${metric.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Bienvenido a Cedapiel</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Sistema clínico integral para gestión de agendas, atenciones y ventas.
            </p>
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-primary" />
                <span>Gestiona citas y agendas por sucursal</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-success" />
                <span>Visualiza reportes de ventas consolidados</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-info" />
                <span>Analiza métricas clave del negocio</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próximas Funciones</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Vista semanal de agenda con filtros avanzados</li>
              <li>• Gestión completa de estados de citas</li>
              <li>• Reportes de ventas con gráficos interactivos</li>
              <li>• Exportación a Excel/PDF</li>
              <li>• Historial clínico de pacientes</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
