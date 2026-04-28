import { type ComponentType } from "react";
import { NavLink } from "react-router-dom";
import {
  Activity,
  BarChart3,
  Calendar,
  CalendarCheck,
  CalendarClock,
  ClipboardList,
  Coins,
  DollarSign,
  FileText,
  Kanban,
  LayoutDashboard,
  Megaphone,
  Package,
  PieChart,
  Receipt,
  ReceiptText,
  Settings,
  Shield,
  ShoppingCart,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserCog,
  UserX,
  Users,
  Webhook,
  XCircle,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

type MenuItem = {
  title: string;
  url: string;
  icon: ComponentType<{ className?: string }>;
};

const primaryItems: MenuItem[] = [
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
];

const operationItems: MenuItem[] = [
  {
    title: "Clientes",
    url: "/clientes",
    icon: Users,
  },
  {
    title: "Catálogo de Servicios",
    url: "/catalogo-servicios",
    icon: Sparkles,
  },
  {
    title: "Citas Canceladas",
    url: "/citas-canceladas",
    icon: XCircle,
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
    title: "Gasto de Clientes",
    url: "/gasto-clientes",
    icon: TrendingUp,
  },
  {
    title: "Clientes Inactivos",
    url: "/clientes-inactivos",
    icon: UserX,
  },
];

const reportingItems: MenuItem[] = [
  {
    title: "Reportes",
    url: "/reportes",
    icon: BarChart3,
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
    title: "Facturación Detallada",
    url: "/facturacion-detalle",
    icon: FileText,
  },
];

const adminItems: MenuItem[] = [
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

const renderItems = (items: MenuItem[]) =>
  items.map((item) => (
    <SidebarMenuItem key={item.title}>
      <SidebarMenuButton asChild>
        <NavLink
          to={item.url}
          className={({ isActive }) =>
            isActive
              ? "bg-primary/10 text-primary font-medium shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          }
        >
          <item.icon className="h-4 w-4" />
          <span>{item.title}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  ));

const AppSidebar = () => {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border/80 bg-sidebar">
      <SidebarContent>
        <div className="flex items-center gap-2 px-3 py-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-sm">
            <Activity className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <p className="font-semibold text-sm leading-none">Cedapiel</p>
              <p className="text-[11px] text-muted-foreground mt-1">ClinicFlow</p>
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Navegación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(primaryItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!isCollapsed && (
          <SidebarGroup>
            <SidebarGroupLabel>Operación</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{renderItems(operationItems)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {!isCollapsed && (
          <SidebarGroup>
            <SidebarGroupLabel>Análisis</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{renderItems(reportingItems)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarFooter className="border-t border-sidebar-border/80">
          <SidebarGroup>
            <SidebarGroupLabel>Administración</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{renderItems(adminItems)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarFooter>
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;
