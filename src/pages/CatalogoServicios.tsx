import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ServiciosPanel } from "@/components/catalogo/ServiciosPanel";
import { CategoriasPanel } from "@/components/catalogo/CategoriasPanel";
import { Sparkles, FolderTree } from "lucide-react";

const CatalogoServicios = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Catálogo de Servicios</h1>
        <p className="text-muted-foreground">
          Administra los servicios y categorías disponibles en el sistema
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Gestión del Catálogo</CardTitle>
          <CardDescription>
            Crea, edita y organiza los servicios que ofreces a tus clientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="servicios" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="servicios" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Servicios
              </TabsTrigger>
              <TabsTrigger value="categorias" className="flex items-center gap-2">
                <FolderTree className="h-4 w-4" />
                Categorías
              </TabsTrigger>
            </TabsList>
            <TabsContent value="servicios" className="mt-6">
              <ServiciosPanel />
            </TabsContent>
            <TabsContent value="categorias" className="mt-6">
              <CategoriasPanel />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default CatalogoServicios;
