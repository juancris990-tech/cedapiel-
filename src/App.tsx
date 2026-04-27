import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Agenda from "./pages/Agenda";
import Ventas from "./pages/Ventas";
import POS from "./pages/POS";
import Finanzas from "./pages/Finanzas";
import RecursosHumanos from "./pages/RecursosHumanos";
import ApiConfig from "./pages/ApiConfig";
import Marketing from "./pages/Marketing";
import CRM from "./pages/CRM";
import Reportes from "./pages/Reportes";
import ReporteDescuentos from "./pages/ReporteDescuentos";
import ReporteDiferidos from "./pages/ReporteDiferidos";
import IngresosReconocidos from "./pages/IngresosReconocidos";
import ReglasComision from "./pages/ReglasComision";
import CalculoComisiones from "./pages/CalculoComisiones";
import SimuladorComision from "./pages/SimuladorComision";
import Configuracion from "./pages/Configuracion";
import Clientes from "./pages/Clientes";
import ClientePerfil from "./pages/ClientePerfil";
import Inventario from "./pages/Inventario";
import InventarioProductos from "./pages/InventarioProductos";
import InventarioMovimientos from "./pages/InventarioMovimientos";
import InventarioReportes from "./pages/InventarioReportes";
import Usuarios from "./pages/Usuarios";
import UsuarioPerfil from "./pages/UsuarioPerfil";
import MiPerfil from "./pages/MiPerfil";
import FacturacionDetalle from "./pages/FacturacionDetalle";
import ClientesInactivos from "./pages/ClientesInactivos";
import CitasCanceladas from "./pages/CitasCanceladas";
import GastoClientes from "./pages/GastoClientes";
import DaySheet from "./pages/DaySheet";
import CitasAgendadas from "./pages/CitasAgendadas";
import ClientesReporte from "./pages/ClientesReporte";
import ClienteReporteDetalle from "./pages/ClienteReporteDetalle";
import VentasDetalle from "./pages/VentasDetalle";
import Productividad from "./pages/Productividad";
import ProyeccionValorFuturo from "./pages/ProyeccionValorFuturo";
import VentasCategorias from "./pages/VentasCategorias";
import CatalogoServicios from "./pages/CatalogoServicios";
import AppLayout from "./components/layout/AppLayout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<AppLayout><Dashboard /></AppLayout>} />
          <Route path="/agenda" element={<AppLayout><Agenda /></AppLayout>} />
          <Route path="/ventas" element={<AppLayout><Ventas /></AppLayout>} />
          <Route path="/pos" element={<AppLayout><POS /></AppLayout>} />
          <Route path="/finanzas" element={<AppLayout><Finanzas /></AppLayout>} />
          <Route path="/rrhh" element={<RecursosHumanos />} />
          <Route path="/api-config" element={<AppLayout><ApiConfig /></AppLayout>} />
          <Route path="/marketing" element={<AppLayout><Marketing /></AppLayout>} />
          <Route path="/crm" element={<AppLayout><CRM /></AppLayout>} />
          <Route path="/reportes" element={<AppLayout><Reportes /></AppLayout>} />
          <Route path="/reportes/descuentos" element={<AppLayout><ReporteDescuentos /></AppLayout>} />
          <Route path="/reportes/diferidos" element={<AppLayout><ReporteDiferidos /></AppLayout>} />
          <Route path="/reportes/ingresos" element={<AppLayout><IngresosReconocidos /></AppLayout>} />
          <Route path="/rrhh/comisiones/reglas" element={<AppLayout><ReglasComision /></AppLayout>} />
          <Route path="/rrhh/comisiones/calculo" element={<AppLayout><CalculoComisiones /></AppLayout>} />
          <Route path="/rrhh/comisiones/simulador" element={<AppLayout><SimuladorComision /></AppLayout>} />
            <Route path="/configuracion" element={<AppLayout><Configuracion /></AppLayout>} />
            <Route path="/clientes" element={<AppLayout><Clientes /></AppLayout>} />
            <Route path="/clientes/:id" element={<AppLayout><ClientePerfil /></AppLayout>} />
            <Route path="/inventario" element={<AppLayout><Inventario /></AppLayout>} />
          <Route path="/inventario/productos" element={<AppLayout><InventarioProductos /></AppLayout>} />
          <Route path="/inventario/movimientos" element={<AppLayout><InventarioMovimientos /></AppLayout>} />
          <Route path="/inventario/reportes" element={<AppLayout><InventarioReportes /></AppLayout>} />
          <Route path="/facturacion-detalle" element={<AppLayout><FacturacionDetalle /></AppLayout>} />
          <Route path="/clientes-inactivos" element={<AppLayout><ClientesInactivos /></AppLayout>} />
          <Route path="/citas-canceladas" element={<AppLayout><CitasCanceladas /></AppLayout>} />
          <Route path="/gasto-clientes" element={<AppLayout><GastoClientes /></AppLayout>} />
          <Route path="/daysheet" element={<AppLayout><DaySheet /></AppLayout>} />
          <Route path="/citas-agendadas" element={<AppLayout><CitasAgendadas /></AppLayout>} />
          <Route path="/clientes-reporte" element={<AppLayout><ClientesReporte /></AppLayout>} />
          <Route path="/clientes-reporte/:id" element={<AppLayout><ClienteReporteDetalle /></AppLayout>} />
          <Route path="/ventas-detalle" element={<AppLayout><VentasDetalle /></AppLayout>} />
          <Route path="/productividad" element={<AppLayout><Productividad /></AppLayout>} />
          <Route path="/proyeccion-valor-futuro" element={<AppLayout><ProyeccionValorFuturo /></AppLayout>} />
          <Route path="/ventas-categorias" element={<AppLayout><VentasCategorias /></AppLayout>} />
          <Route path="/catalogo-servicios" element={<AppLayout><CatalogoServicios /></AppLayout>} />
          <Route path="/usuarios" element={<Usuarios />} />
          <Route path="/usuarios/:id" element={<UsuarioPerfil />} />
          <Route path="/mi-perfil" element={<MiPerfil />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
