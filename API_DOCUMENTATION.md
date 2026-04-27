# API REST - Sistema de Agenda + CRM + Automatizaciones

## Autenticación

Todas las API requests requieren autenticación mediante:
- **Header**: `x-api-key: YOUR_API_KEY` (para integraciones externas como n8n)
- **Header**: `Authorization: Bearer YOUR_JWT_TOKEN` (para usuarios autenticados)

## Endpoints

### 1. AGENDA - Disponibilidad de Slots

**GET** `/api-agenda-slots`

Consulta slots disponibles para agendar citas.

**Query Parameters:**
- `fecha_desde` (requerido): Fecha inicio YYYY-MM-DD
- `fecha_hasta` (requerido): Fecha fin YYYY-MM-DD
- `doctor_id` (opcional): ID del empleado/doctor
- `sucursal_id` (opcional): ID de la sucursal
- `servicio_id` (opcional): ID del servicio

**Response 200:**
```json
{
  "slots": [
    {
      "fecha": "2025-01-20",
      "hora_inicio": "09:00",
      "duracion_minutos": 60,
      "disponible": true
    }
  ],
  "total": 48
}
```

**Ejemplo cURL:**
```bash
curl -X GET "https://ckiwuneigsdotfwrxmbu.supabase.co/functions/v1/api-agenda-slots?fecha_desde=2025-01-20&fecha_hasta=2025-01-22&doctor_id=1" \
  -H "x-api-key: YOUR_API_KEY"
```

---

### 2. AGENDA - Crear Cita

**POST** `/api-agenda-citas`

Crea una nueva cita en el sistema.

**Body:**
```json
{
  "cliente_id": 1,
  "doctor_id": 2,
  "sucursal_id": 1,
  "servicio_id": 3,
  "fecha_inicio": "2025-01-20T10:00:00",
  "fecha_fin": "2025-01-20T11:00:00",
  "origen": "whatsapp"
}
```

**Response 201:**
```json
{
  "id": 123,
  "id_cliente": 1,
  "id_empleado": 2,
  "id_sucursal": 1,
  "id_servicio": 3,
  "fecha": "2025-01-20",
  "hora_inicio": "10:00",
  "hora_fin": "11:00",
  "duracion_minutos": 60,
  "estado": "reservada",
  "origen": "whatsapp",
  "created_at": "2025-01-15T12:00:00Z"
}
```

**Ejemplo cURL:**
```bash
curl -X POST "https://ckiwuneigsdotfwrxmbu.supabase.co/functions/v1/api-agenda-citas" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "cliente_id": 1,
    "doctor_id": 2,
    "sucursal_id": 1,
    "servicio_id": 3,
    "fecha_inicio": "2025-01-20T10:00:00",
    "origen": "whatsapp"
  }'
```

**Triggers:**
- `on_appointment_created` - Dispara automatizaciones configuradas

---

### 3. AGENDA - Obtener Cita

**GET** `/api-agenda-citas/{id}`

Obtiene los detalles de una cita específica.

**Response 200:**
```json
{
  "id": 123,
  "fecha": "2025-01-20",
  "hora_inicio": "10:00",
  "estado": "confirmada",
  "cliente": {
    "id": 1,
    "nombre": "Juan",
    "apellidos": "Pérez",
    "telefono": "+52123456789"
  },
  "empleado": {
    "id": 2,
    "nombre": "Dr. Carlos",
    "especialidad": "Ortodoncista"
  },
  "servicio": {
    "id": 3,
    "nombre": "Limpieza dental",
    "precio_mxn": 800
  }
}
```

---

### 4. AGENDA - Actualizar Cita

**PATCH** `/api-agenda-citas/{id}`

Actualiza una cita existente (cambiar fecha, estado, etc).

**Body:**
```json
{
  "estado": "confirmada",
  "fecha_inicio": "2025-01-20T11:00:00"
}
```

**Triggers:**
- `on_appointment_confirmed` - Si estado cambia a "confirmada"

---

### 5. AGENDA - Cancelar Cita

**PATCH** `/api-agenda-citas/{id}/cancelar`

Cancela una cita específica.

**Body:**
```json
{
  "motivo": "paciente",
  "comentario": "El paciente tuvo un imprevisto"
}
```

**Motivos válidos:**
- `paciente` - Cancelación por parte del paciente
- `clinica` - Cancelación por parte de la clínica

**Triggers:**
- `on_appointment_cancelled`

---

### 6. CRM - Listar Leads

**GET** `/api-crm-leads`

Lista todos los leads del CRM con sus tags y citas asociadas.

**Query Parameters:**
- `pipeline_stage` (opcional): Filtrar por etapa del pipeline

**Response 200:**
```json
{
  "leads": [
    {
      "id": 1,
      "nombre": "María García",
      "telefono": "+52987654321",
      "email": "maria@example.com",
      "canal_origen": "facebook",
      "pipeline_stage": "lead_nuevo",
      "tags": [
        {
          "tag": {
            "id": 1,
            "nombre": "interesado",
            "color": "#3b82f6"
          }
        }
      ],
      "cita": {
        "id": 45,
        "fecha": "2025-01-22",
        "estado": "reservada"
      }
    }
  ],
  "total": 15
}
```

---

### 7. CRM - Obtener Lead

**GET** `/api-crm-leads/{id}`

Obtiene los detalles completos de un lead.

---

### 8. CRM - Crear Lead

**POST** `/api-crm-leads`

Crea un nuevo lead en el CRM.

**Body:**
```json
{
  "nombre": "Pedro López",
  "telefono": "+52111222333",
  "email": "pedro@example.com",
  "canal_origen": "whatsapp",
  "pipeline_stage": "lead_nuevo",
  "cita_id": null
}
```

**Response 201:**
```json
{
  "id": 20,
  "nombre": "Pedro López",
  "telefono": "+52111222333",
  "pipeline_stage": "lead_nuevo",
  "created_at": "2025-01-15T14:30:00Z"
}
```

---

### 9. CRM - Actualizar Lead

**PATCH** `/api-crm-leads/{id}`

Actualiza un lead (cambiar etapa del pipeline, datos, etc).

**Body:**
```json
{
  "pipeline_stage": "cita_confirmada",
  "_old_pipeline_stage": "lead_nuevo"
}
```

**Triggers:**
- `on_pipeline_stage_changed` - Si cambia la etapa del pipeline

---

### 10. CRM - Gestionar Tags del Lead

**PATCH** `/api-crm-leads/{id}/tags`

Agrega o remueve tags de un lead.

**Body:**
```json
{
  "add": ["confirmado", "interesado"],
  "remove": ["pendiente"]
}
```

**Response 200:**
```json
{
  "id": 20,
  "nombre": "Pedro López",
  "tags": [
    {
      "tag": {
        "id": 1,
        "nombre": "confirmado",
        "color": "#10b981"
      }
    },
    {
      "tag": {
        "id": 3,
        "nombre": "interesado",
        "color": "#3b82f6"
      }
    }
  ]
}
```

**Triggers:**
- `on_tag_added` - Por cada tag agregado
- `on_tag_removed` - Por cada tag removido

---

### 11. CRM - Listar Tags

**GET** `/api-crm-tags`

Lista todos los tags disponibles en el sistema.

**Response 200:**
```json
{
  "tags": [
    {
      "id": 1,
      "nombre": "confirmado",
      "descripcion": "Cita confirmada por el paciente",
      "color": "#10b981",
      "created_at": "2025-01-10T10:00:00Z"
    }
  ],
  "total": 5
}
```

---

### 12. CRM - Crear Tag

**POST** `/api-crm-tags`

Crea un nuevo tag.

**Body:**
```json
{
  "nombre": "vip",
  "descripcion": "Cliente VIP",
  "color": "#fbbf24"
}
```

---

### 13. WEBHOOKS - Emitir Evento

**POST** `/api-webhooks`

Emite un evento a todos los webhooks configurados que escuchan ese evento.

**Body:**
```json
{
  "event": "appointment.confirmed",
  "appointment_id": 123,
  "lead_id": 45,
  "doctor_id": 2,
  "fecha_inicio": "2025-01-20T10:00:00"
}
```

**Response 200:**
```json
{
  "event": "appointment.confirmed",
  "webhooks_notified": 2,
  "results": [
    {
      "webhook_id": 1,
      "webhook_name": "n8n Notificaciones WhatsApp",
      "status": 200,
      "success": true
    },
    {
      "webhook_id": 2,
      "webhook_name": "Zapier CRM Sync",
      "status": 200,
      "success": true
    }
  ]
}
```

**Eventos disponibles:**
- `appointment.created`
- `appointment.confirmed`
- `appointment.cancelled`
- `appointment.updated`
- `lead.created`
- `lead.tag_added`
- `lead.tag_removed`
- `lead.stage_changed`

---

## Sistema de Automatizaciones

El sistema incluye un motor de automatizaciones que ejecuta acciones basadas en triggers.

### Triggers Disponibles:

1. **on_appointment_created** - Cuando se crea una cita
2. **on_appointment_confirmed** - Cuando una cita se confirma
3. **on_appointment_cancelled** - Cuando una cita se cancela
4. **on_tag_added** - Cuando se agrega un tag a un lead
5. **on_tag_removed** - Cuando se remueve un tag
6. **on_pipeline_stage_changed** - Cuando cambia la etapa del pipeline

### Acciones Disponibles:

1. **update_appointment** - Actualiza el estado de una cita
2. **update_lead_stage** - Cambia la etapa del pipeline del lead
3. **add_tag** - Agrega un tag al lead
4. **webhook** - Emite un evento webhook

### Ejemplo de Regla de Automatización:

```json
{
  "nombre": "Auto-confirmar cita cuando se agrega tag confirmado",
  "trigger_type": "on_tag_added",
  "trigger_config": {
    "tag": "confirmado"
  },
  "actions": [
    {
      "type": "update_appointment",
      "estado": "confirmada"
    },
    {
      "type": "update_lead_stage",
      "stage": "cita_confirmada"
    }
  ],
  "activo": true
}
```

---

## Integración con n8n

### Paso 1: Configurar Webhook en n8n

1. Crea un nuevo workflow en n8n
2. Agrega un nodo "Webhook" como trigger
3. Copia la URL del webhook

### Paso 2: Registrar Webhook en el Sistema

Inserta en la tabla `webhook_configs`:

```sql
INSERT INTO public.webhook_configs (nombre, url, eventos, activo)
VALUES (
  'n8n Notificaciones WhatsApp',
  'https://your-n8n-instance.com/webhook/YOUR_WEBHOOK_ID',
  '["appointment.created", "appointment.confirmed", "lead.tag_added"]',
  true
);
```

### Paso 3: En n8n, Procesar el Webhook

El payload recibido en n8n tendrá este formato:

```json
{
  "event": "appointment.confirmed",
  "timestamp": "2025-01-15T14:30:00Z",
  "appointment_id": 123,
  "lead_id": 45,
  "fecha_inicio": "2025-01-20T10:00:00"
}
```

### Paso 4: Enviar WhatsApp desde n8n

Usa el nodo "HTTP Request" o un nodo específico de WhatsApp Business API para enviar mensajes basados en los eventos.

---

## Códigos de Estado HTTP

- **200 OK** - Solicitud exitosa
- **201 Created** - Recurso creado exitosamente
- **400 Bad Request** - Parámetros faltantes o inválidos
- **401 Unauthorized** - API key o token inválido
- **404 Not Found** - Recurso no encontrado
- **405 Method Not Allowed** - Método HTTP no permitido
- **409 Conflict** - Conflicto (ej: tag duplicado)
- **500 Internal Server Error** - Error del servidor

---

## Gestión de API Keys

Las API keys se almacenan en la tabla `api_keys` con hash SHA-256. Para crear una:

```sql
INSERT INTO public.api_keys (nombre, key_hash, permisos, activo, created_by)
VALUES (
  'n8n Integration',
  encode(digest('YOUR_SECRET_KEY', 'sha256'), 'hex'),
  '{"read": true, "write": true}',
  true,
  auth.uid()
);
```

Luego usa `YOUR_SECRET_KEY` en el header `x-api-key` de tus requests.

---

## Logs y Auditoría

### Webhook Logs

Todos los intentos de entrega de webhooks se registran en `webhook_logs`:

```sql
SELECT * FROM public.webhook_logs
WHERE webhook_config_id = 1
ORDER BY created_at DESC
LIMIT 20;
```

### Automation Logs

Todas las ejecuciones de automatizaciones se registran en `automation_logs`:

```sql
SELECT * FROM public.automation_logs
WHERE success = false
ORDER BY created_at DESC;
```

### Bitácora de Acciones

Todas las operaciones importantes se registran en `bitacora_accion`:

```sql
SELECT * FROM public.bitacora_accion
WHERE entidad = 'agendas'
  AND accion = 'crear_cita_api'
ORDER BY timestamp DESC;
```
