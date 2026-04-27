import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface DailyStackedData {
  fecha: string;
  servicios: number;
  productos: number;
}

interface StackedDailyChartProps {
  data: DailyStackedData[];
  totalServicios: number;
  totalProductos: number;
  totalGeneral: number;
}

export const StackedDailyChart = ({ 
  data, 
  totalServicios, 
  totalProductos, 
  totalGeneral 
}: StackedDailyChartProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatCurrencyShort = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}k`;
    }
    return `$${value}`;
  };

  return (
    <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium text-white">Ventas Diarias</CardTitle>
        <p className="text-sm text-[#888]">Desglose de servicios y productos por día</p>
      </CardHeader>
      
      <div className="px-6 py-4 space-y-3 border-b border-[#2a2a2a]">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-[#242424] hover:bg-[#2a2a2a] transition-colors cursor-default">
          <div className="w-3 h-3 rounded-full bg-primary flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-white">Servicios</p>
            <p className="text-xs text-[#888]">Ingresos por servicios prestados</p>
          </div>
          <p className="text-sm font-semibold text-white">{formatCurrency(totalServicios)}</p>
        </div>
        
        <div className="flex items-center gap-3 p-3 rounded-lg bg-[#242424] hover:bg-[#2a2a2a] transition-colors cursor-default">
          <div className="w-3 h-3 rounded-full bg-secondary flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-white">Productos</p>
            <p className="text-xs text-[#888]">Ingresos por venta de productos</p>
          </div>
          <p className="text-sm font-semibold text-white">{formatCurrency(totalProductos)}</p>
        </div>
        
        <div className="flex items-center gap-3 p-3 rounded-lg bg-[#242424] border border-[#3a3a3a]">
          <div className="w-3 h-3 rounded-full bg-white flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-white">Total General</p>
            <p className="text-xs text-[#888]">Suma de servicios y productos</p>
          </div>
          <p className="text-base font-bold text-white">{formatCurrency(totalGeneral)}</p>
        </div>
      </div>
      <CardContent className="pt-4">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart 
            data={data}
            margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#2a2a2a" 
              vertical={false}
            />
            <XAxis 
              dataKey="fecha" 
              stroke="#666"
              tick={{ fontSize: 11, fill: "#888" }}
              tickLine={false}
              axisLine={{ stroke: "#2a2a2a" }}
            />
            <YAxis 
              stroke="#666"
              tickFormatter={formatCurrencyShort}
              tick={{ fontSize: 11, fill: "#888" }}
              tickLine={false}
              axisLine={{ stroke: "#2a2a2a" }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "#1a1a1a", 
                border: "1px solid #3a3a3a",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgb(0 0 0 / 0.4)"
              }}
              labelStyle={{ 
                color: "#fff",
                fontWeight: "500",
                marginBottom: "4px"
              }}
              formatter={(value: number, name: string) => [
                formatCurrency(value), 
                name === "servicios" ? "Servicios" : "Productos"
              ]}
              cursor={{ fill: "#333", opacity: 0.5 }}
            />
            <Bar 
              dataKey="servicios" 
              stackId="a" 
              fill="hsl(var(--primary))" 
              name="servicios"
              radius={[0, 0, 0, 0]}
            />
            <Bar 
              dataKey="productos" 
              stackId="a" 
              fill="hsl(var(--secondary))" 
              name="productos"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
