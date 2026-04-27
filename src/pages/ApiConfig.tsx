import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Key, Webhook, Zap } from "lucide-react";
import ApiKeysPanel from "@/components/api-config/ApiKeysPanel";
import WebhooksPanel from "@/components/api-config/WebhooksPanel";
import AutomationRulesPanel from "@/components/api-config/AutomationRulesPanel";

export default function ApiConfig() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración de API</h1>
        <p className="text-muted-foreground mt-2">
          Gestiona API keys, webhooks y reglas de automatización para integraciones externas
        </p>
      </div>

      <Tabs defaultValue="api-keys" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="api-keys" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="flex items-center gap-2">
            <Webhook className="h-4 w-4" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="automation" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Automatizaciones
          </TabsTrigger>
        </TabsList>

        <TabsContent value="api-keys" className="mt-6">
          <ApiKeysPanel />
        </TabsContent>

        <TabsContent value="webhooks" className="mt-6">
          <WebhooksPanel />
        </TabsContent>

        <TabsContent value="automation" className="mt-6">
          <AutomationRulesPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
