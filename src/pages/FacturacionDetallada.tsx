import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Receipt, Wallet } from "lucide-react";
import { toast } from "sonner";

interface FacturacionDetalleRow {
  id: number;
  id_factura: string;
  fecha: string;
  cliente: string;
  tipo: string;
  descripcion: string | null;
  monto_total_mxn: number;
}

interface FacturaAgrupada {
  idFactura: string;
  fecha: string;
  cliente: string;
  servicios: string;
  subtotal: number;
  descuento: number;
  total: number;
}

const getMonthRange = (month: string) => {
  const [yearRaw, monthRaw] = month.split("-");
  const year = Number(yearRaw);
  const monthIndex = Number(monthRaw) - 1;

  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 0);

  const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);
  return {
    from: toIsoDate(start),
    to: toIsoDate(end),
  };
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(value);

const isDiscountRow = (row: FacturacionDetalleRow) => {
  const tipo = (row.tipo || "").toLowerCase();
  return tipo.includes("discount") || row.monto_total_mxn < 0;
};

export default function FacturacionDetallada() {
  const [monthFilter, setMonthFilter] = useState(() => format(new Date(), "yyyy-MM"));

  const { from, to } = useMemo(() => getMonthRange(monthFilter), [monthFilter]);

  const { data, isLoading } = useQuery({
    queryKey: ["facturacion-detallada", monthFilter],
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) throw new Error("No autorizado");

      const firstResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/facturacion-detalle?fecha_inicio=${from}&fecha_fin=${to}&page=1&limit=1000`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      );

      if (!firstResponse.ok) throw new Error("Error al cargar facturación");
      const firstPage = await firstResponse.json();

      const rows: FacturacionDetalleRow[] = [...(firstPage.data || [])];
      const totalPages = Number(firstPage.total_pages || 1);

      if (totalPages > 1) {
        const pending = [];
        for (let page = 2; page <= totalPages; page += 1) {
          pending.push(
            fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/facturacion-detalle?fecha_inicio=${from}&fecha_fin=${to}&page=${page}&limit=1000`,
              {
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                },
              },
            ).then(async (res) => {
              if (!res.ok) throw new Error("Error al paginar facturación");
              const json = await res.json();
              return json.data || [];
            }),
          );
        }

        const pages = await Promise.all(pending);
        for (const pageRows of pages) rows.push(...pageRows);
      }

      return rows;
    },
  });

  const facturas = useMemo<FacturaAgrupada[]>(() => {
    const grouped = new Map<string, FacturaAgrupada & { serviciosSet: Set<string> }>();

    for (const row of data || []) {
      const key = row.id_factura || `SIN-FOLIO-${row.id}`;
      const current =
        grouped.get(key) || {
          idFactura: row.id_factura,
          fecha: row.fecha,
          cliente: row.cliente,
          servicios: "",
          subtotal: 0,
          descuento: 0,
          total: 0,
          serviciosSet: new Set<string>(),
        };

      const amount = Number(row.monto_total_mxn || 0);
      const isDiscount = isDiscountRow(row);

      current.total += amount;
      if (isDiscount) {
        current.descuento += Math.abs(amount);
      } else {
        current.subtotal += amount;
        if (row.descripcion) current.serviciosSet.add(row.descripcion);
      }

      if (new Date(row.fecha).getTime() > new Date(current.fecha).getTime()) {
        current.fecha = row.fecha;
      }

      if (!current.cliente && row.cliente) {
        current.cliente = row.cliente;
      }

      grouped.set(key, current);
    }

    return [...grouped.values()]
      .map((invoice) => ({
        idFactura: invoice.idFactura,
        fecha: invoice.fecha,
        cliente: invoice.cliente,
        servicios: Array.from(invoice.serviciosSet).join(", ") || "-",
        subtotal: invoice.subtotal,
        descuento: invoice.descuento,
        total: invoice.total,
      }))
      .sort((a, b) => {
        const dateDiff = new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
        if (dateDiff !== 0) return dateDiff;
        return (b.idFactura || "").localeCompare(a.idFactura || "");
      });
  }, [data]);

  const totalFacturadoMes = facturas.reduce((sum, f) => sum + f.total, 0);
  const totalFacturas = facturas.length;
  const ticketPromedio = totalFacturas > 0 ? totalFacturadoMes / totalFacturas : 0;

  const exportCsv = () => {
    if (!facturas.length) {
      toast.error("No hay facturas para exportar");
      return;
    }

    const headers = ["Fecha", "Folio/ID", "Cliente", "Servicios", "Subtotal", "Descuento", "Total"];
    const rows = facturas.map((f) => [
      format(new Date(f.fecha), "dd/MM/yyyy"),
      f.idFactura,
      f.cliente,
      f.servicios,
      f.subtotal.toFixed(2),
      f.descuento.toFixed(2),
      f.total.toFixed(2),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `facturacion_detallada_${monthFilter}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Facturación Detallada</h1>
          <p className="text-muted-foreground">Facturas consolidadas por mes con detalle de servicios</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="w-[180px]"
          />
          <Button variant="outline" onClick={exportCsv}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total facturado del mes</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalFacturadoMes)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de facturas</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFacturas}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket promedio</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(ticketPromedio)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Facturación del periodo</CardTitle>
          <CardDescription>
            Desde <Badge variant="outline">{from}</Badge> hasta <Badge variant="outline">{to}</Badge>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Folio / ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Servicios</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-right">Descuento</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      Cargando facturación...
                    </TableCell>
                  </TableRow>
                ) : !facturas.length ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      Sin facturas para el mes seleccionado
                    </TableCell>
                  </TableRow>
                ) : (
                  facturas.map((factura) => (
                    <TableRow key={factura.idFactura}>
                      <TableCell>{format(new Date(factura.fecha), "dd/MM/yyyy")}</TableCell>
                      <TableCell className="font-medium">{factura.idFactura}</TableCell>
                      <TableCell>{factura.cliente || "-"}</TableCell>
                      <TableCell className="max-w-[340px] truncate" title={factura.servicios}>
                        {factura.servicios}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(factura.subtotal)}</TableCell>
                      <TableCell className="text-right">
                        {factura.descuento > 0 ? formatCurrency(factura.descuento) : "-"}
                      </TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(factura.total)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
