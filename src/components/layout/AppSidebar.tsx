import { NavLink } from "react-router-dom";
import {
  Calendar,
  LayoutDashboard,
  Receipt,
  Activity,
  BarChart3,
  Settings,
  Users,
  DollarSign,
  Megaphone,
  Package,
  Shield,
  UserCog,
  ShoppingCart,
  Webhook,
  Kanban,
  FileText,
  UserX,
  XCircle,
  TrendingUp,
  CalendarClock,
  CalendarCheck,
  ClipboardList,
  ReceiptText,
  TrendingDown,
  Coins,
  PieChart,
  Sparkles,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Agenda",
    url: "/agenda",
    icon: Calendar,
  },
  {
    title: "Ventas",
    url: "/ventas",
    icon: Receipt,
  },
  {
    title: "POS (Punto de Venta)",
    url: "/pos",
    icon: ShoppingCart,
  },
  {
    title: "Finanzas",
    url: "/finanzas",
    icon: DollarSign,
  },
  {
    title: "Recursos Humanos",
    url: "/rrhh",
    icon: Users,
  },
  {
    title: "Marketing y CRM",
    url: "/marketing",
    icon: Megaphone,
  },
  {
    title: "CRM - Pipeline",
    url: "/crm",
    icon: Kanban,
  },
  {
    title: "Inventario",
    url: "/inventario",
    icon: Package,
  },
  {
    title: "Catálogo de Servicios",
    url: "/catalogo-servicios",
    icon: Sparkles,
  },
  {
    title: "Facturación Detallada",
    url: "/facturacion-detalle",
    icon: FileText,
  },
  {
    title: "Clientes Inactivos",
    url: "/clientes-inactivos",
    icon: UserX,
  },
  {
    title: "Citas Canceladas",
    url: "/citas-canceladas",
    icon: XCircle,
  },
      {
        title: "Gasto de Clientes",
        url: "/gasto-clientes",
        icon: TrendingUp,
      },
      {
        title: "DaySheet",
        url: "/daysheet",
        icon: CalendarClock,
      },
      {
        title: "Citas Agendadas",
        url: "/citas-agendadas",
        icon: CalendarCheck,
      },
      {
        title: "Reporte de Clientes",
        url: "/clientes-reporte",
        icon: ClipboardList,
      },
      {
        title: "Reporte de Ventas",
        url: "/ventas-detalle",
        icon: ReceiptText,
      },
      {
        title: "Productividad Personal",
        url: "/productividad",
        icon: TrendingDown,
      },
      {
        title: "Proyección Valor Futuro",
        url: "/proyeccion-valor-futuro",
        icon: Coins,
      },
      {
        title: "Ventas por Categoría",
        url: "/ventas-categorias",
        icon: PieChart,
      },
      {
        title: "Reportes",
        url: "/reportes",
        icon: BarChart3,
      },
  {
    title: "Usuarios",
    url: "/usuarios",
    icon: Shield,
  },
  {
    title: "API Config",
    url: "/api-config",
    icon: Webhook,
  },
  {
    title: "Mi Perfil",
    url: "/mi-perfil",
    icon: UserCog,
  },
  {
    title: "Configuración",
    url: "/configuracion",
    icon: Settings,
  },
];

const AppSidebar = () => {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent>
        <div className="flex items-center gap-2 px-4 py-6">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <span className="font-semibold text-lg bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Cedapiel
            </span>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-muted/50"
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;
