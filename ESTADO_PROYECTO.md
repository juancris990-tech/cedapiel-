# Estado del Proyecto — Cedapiel / ClinicFlow

Handoff para que Juan tome el proyecto y lo lleve hasta el cierre del Hito 3 y la puesta en producción.

**Última actualización**: 2026-04-27
**Autor**: Ignacio Giaverini (44K Agencia IA)
**Destinatario**: Juan (responsable del cierre del proyecto)

---

## 1. Resumen ejecutivo

Software a medida (CRM/ERP completo + agentes IA) para **Cedapiel** — cadena de clínicas estéticas en México (Nuevo León). Construido por **44K Agencia IA** sobre Lovable.dev, React + Supabase.

- **Avance ponderado**: ~73% del contrato.
- **Hito 1** (BD): entregado ✓
- **Hito 2** (núcleo funcional): entregado ✓ (con observaciones menores)
- **Hito 3** (front final + 2 agentes IA + producción): en curso, ~40%.
- **Plazo contractual**: vencido (90 días desde 23-sep-2025 → vencimiento original 22-dic-2025). Sin penalización por cláusula 8 del contrato.
- **Próximo cobro pendiente**: USD 1.100 al entregar Hito 3 + activación de mensualidad USD 630/mes.
- **Referencia visual de la UI**: [GetTimely.com](https://www.gettimely.com/) — el software que el cliente usa actualmente y del que viene migrando. La interfaz nueva debe sentirse familiar para ellos.

---

## 2. Partes y contrato

| Concepto | Detalle |
|---|---|
| **Prestador** | Ignacio Antonio Giaverini Gutiérrez (RUT 20.658.412-2) — 44K Agencia IA, Santiago, Chile |
| **Cliente** | Ceda Piel S.A. de C.V. (RFC CPI1607233C9) — San Pedro Garza García, Nuevo León, México |
| **Representante cliente** | Óscar García, Director General — oscargb@cedapiel.com |
| **Firma del contrato** | 19/09/2025 |
| **Inicio del proyecto** | 23/09/2025 |
| **Plazo** | 90 días corridos |
| **Total contrato** | USD 7.200 (suma de hitos; el contrato declara 7.500, hay descuadre tipográfico de USD 300 que se decidió no disputar) |
| **Mensualidad post-aprobación** | USD 630/mes + USD 90/sede adicional |

Contrato base: `Software para Cedapiel  (1).pdf` (no commiteado al repo).

---

## 3. Alcance contractual (cláusula 2)

El alcance comprende **5 ítems mínimos**:

1. **Base de datos**: modelado lógico/físico, scripts, migraciones, código de acceso.
2. **Back-end e integraciones**: agenda, recordatorios, CRM, POS-inventario, reportes base.
3. **Agentes de IA**:
   - Agente de **WhatsApp**: atención + agenda/reagenda + recordatorios.
   - Agente de **Base de Datos / RAG**: consultas ejecutivas, KPIs, segmentos, reportes.
4. **Front-end**: agenda, CRM, caja, inventario, KPIs + embudos/funnels.
5. **Capacitación + manual de operación digital**.

---

## 4. Estado de pagos

| # | Pago | Disparador (cláusula 4) | Monto | Estado |
|---|---|---|---|---|
| 1 | Inicio | Al contratar (D0) | USD 2.500 | Cobrado |
| 2 | Hito 1 | Al entregar Hito 1 (D30) | USD 2.500 | Cobrado |
| 3 | Hito 2 | Al entregar Hito 2 (D60) — anticipo Hito 3 | USD 1.100 | Cobrado |
| 4 | **Hito 3** | Al entregar Hito 3 (D90) | **USD 1.100** | **Pendiente** |
| — | Mensualidad | Tras aprobación (15 días post-entrega final) | USD 630/mes | No iniciada |

**Cobrado al día**: USD 6.100 / USD 7.200.

---

## 5. Estado por hito

### Hito 1 (D0–D30) — BD ✓ ENTREGADO

- 82 migraciones SQL en [`supabase/migrations/`](supabase/migrations/) (rango 2025-10-17 → 2026-01-20).
- ~70 tablas con índices, RLS y triggers.
- Acceso técnico: proyecto Supabase activo (`ckiwuneigsdotfwrxmbu.supabase.co`).

### Hito 2 (D31–D60) — Núcleo funcional ✓ ENTREGADO

Funcionalidades núcleo en operación:

- **Agenda**: vista semanal/diaria, citas, bloqueos, estados, filtros, edición.
- **CRM**: pipeline Kanban con leads, tags, drag-and-drop, API REST.
- **POS**: carrito, búsqueda, anticipos, pagos, edición de items, ventas pendientes.
- **Inventario**: productos, lotes, stock actual, ubicaciones, movimientos.
- **Marketing**: campañas, segmentación, mensajes.
- **Reportes base**: ventas, comisiones, productividad, descuentos, diferidos, ingresos reconocidos, gasto clientes, clientes inactivos, ventas por categoría, facturación detalle, daysheet, citas canceladas/agendadas, proyección valor futuro.
- **RRHH**: asistencias, jornada laboral, comisiones, liquidación, contratos, permisos, productividad.
- **Configuración API**: API keys, webhooks, motor de reglas de automatización.
- **48 edge functions** en [`supabase/functions/`](supabase/functions/) (importadores CSV/Excel, APIs públicas, lógica de negocio).
- **Pipeline de datos para IA**: existe la base (tablas `clientes_reporte`, `ventas_detalle`, `facturacion_detalle`, etc.) — falta dejarlo formalmente armado como dataset.

### Hito 3 (D61–D90) — Front final + 2 agentes IA + producción — EN CURSO ~40%

| Entregable | Avance | Detalle |
|---|---|---|
| Front-end final operativo | ~90% | 42 páginas en [`src/pages/`](src/pages/), faltan ajustes UI según referencia que dará el cliente |
| Agente WhatsApp conectado | ~35% | [`webhook-agendar-cita`](supabase/functions/webhook-agendar-cita/index.ts) (366 líneas, Gemini 2.5 Flash) con 3 tools: `consultar_horarios`, `buscar_o_crear_cliente`, `crear_cita`. **Falta**: tabla `conversaciones_agendamiento` (marcada como pendiente en doc), tools de reagenda/cancelación, recordatorios, integración Meta WhatsApp Business real, plantillas aprobadas. |
| Agente Base de Datos / RAG | **0%** | No existe. Hay que: instalar pgvector en Supabase, generar embeddings de tablas operativas, crear edge function `agente-rag` que reciba pregunta NL y responda con KPIs/segmentos, agregar UI de consulta. |
| Puesta en producción + estabilización | ~20% | Falta: deploy formal del front (Vercel u otra), migración de datos reales del cliente, capacitación al equipo, smoke tests, monitoreo básico. |

---

## 6. Stack técnico

### Frontend
- **Framework**: Vite 5 + React 18 + TypeScript
- **UI**: shadcn-ui (Radix UI) + Tailwind CSS
- **Estado/datos**: TanStack Query 5 + Supabase Client
- **Routing**: React Router v6
- **Forms**: react-hook-form + Zod
- **Otros**: dnd-kit (CRM Kanban), recharts (dashboards), date-fns, xlsx (importadores)

### Backend
- **BaaS**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Edge Functions**: Deno + TypeScript
- **IA**: Lovable AI Gateway (`ai.gateway.lovable.dev`), modelo `google/gemini-2.5-flash`

### Infraestructura externa pendiente de conectar
- **Mensajería**: Meta WhatsApp Business API (cliente provee credenciales)
- **Email transaccional**: a definir (Resend o SendGrid)
- **Automatizaciones complejas**: n8n (no instanciado aún)
- **Hosting frontend**: a definir (Vercel sugerido, o Lovable Cloud)

### Variables de entorno ([`.env`](.env))
```
VITE_SUPABASE_PROJECT_ID="ckiwuneigsdotfwrxmbu"
VITE_SUPABASE_URL="https://ckiwuneigsdotfwrxmbu.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="..."  # anon key, segura para frontend
```

Las claves de servicio (`SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY`) viven en el panel de Supabase Edge Functions, no en el repo.

---

## 7. Estructura del repositorio

```
.
├── src/
│   ├── pages/              # 42 páginas (rutas en App.tsx)
│   ├── components/
│   │   ├── agenda/         # calendario semanal/diario, diálogos cita
│   │   ├── api-config/     # API keys, webhooks, reglas automatización
│   │   ├── catalogo/       # servicios y categorías
│   │   ├── clientes/       # ficha cliente, historial, anticipos, saldos
│   │   ├── finanzas/       # gastos, rentabilidad
│   │   ├── layout/         # AppLayout, AppHeader, AppSidebar
│   │   ├── marketing/      # campañas, mensajes, segmentación
│   │   ├── pos/            # carrito, pagos, anticipos
│   │   ├── rrhh/           # comisiones, asistencia, contratos
│   │   ├── ui/             # shadcn primitives
│   │   ├── usuarios/       # gestión usuarios
│   │   └── ventas/         # gráficos, detalle items
│   ├── hooks/              # useUserRoles, usePermissions, useCurrentUser
│   ├── integrations/supabase/  # client, types
│   └── lib/                # utils, date helpers
├── supabase/
│   ├── migrations/         # 82 archivos SQL
│   ├── functions/          # 48 edge functions Deno
│   └── config.toml
├── public/
├── scripts/                # importadores TypeScript ad-hoc
├── *.md                    # documentación técnica por módulo (10 docs)
├── package.json            # bun lockfile presente
├── vite.config.ts
└── tailwind.config.ts
```

### Documentación técnica de módulos ya escrita

- [API_DOCUMENTATION.md](API_DOCUMENTATION.md) — endpoints públicos para integraciones externas (n8n)
- [AGENDAMIENTO_AUTOMATICO.md](AGENDAMIENTO_AUTOMATICO.md) — flujo completo agente WhatsApp
- [CITAS_AGENDADAS.md](CITAS_AGENDADAS.md), [CITAS_CANCELADAS.md](CITAS_CANCELADAS.md), [DAYSHEET.md](DAYSHEET.md)
- [FACTURACION_DETALLE.md](FACTURACION_DETALLE.md), [GASTO_CLIENTES.md](GASTO_CLIENTES.md)
- [CLIENTES_INACTIVOS.md](CLIENTES_INACTIVOS.md), [VENTAS_CATEGORIAS.md](VENTAS_CATEGORIAS.md)
- [PROYECCION_VALOR_FUTURO.md](PROYECCION_VALOR_FUTURO.md)

---

## 8. Pendientes para cerrar Hito 3

### Bloque 0 — Investigación previa (ANTES de tocar código)

0. **Revisar a fondo [GetTimely.com](https://www.gettimely.com/)** — es el software que Cedapiel usa actualmente y del que vienen migrando. El cliente espera que la nueva interfaz sea **muy similar a GetTimely** para que el equipo no sufra el cambio. Tarea concreta:
   - Crear cuenta de prueba en GetTimely (tienen trial gratis).
   - Recorrer todas las pantallas: agenda, ficha de cliente, POS, reportes, configuración, marketing.
   - Tomar capturas y notas de cada vista.
   - Identificar las diferencias entre GetTimely y nuestro front actual.
   - Enviar a Ignacio un documento corto (puede ser un Loom + capturas + notas) con los puntos donde nuestra UI debería ajustarse para parecerse más a GetTimely.
   - **Importante**: hay otro producto llamado `timely.com` (sin el "get") — NO es ese, es **gettimely.com** (clínicas/salud/estética). Confirmar que el dominio sea correcto antes de empezar.

   Esto define el alcance real del trabajo de UI del Bloque A punto 4. Sin esta revisión no se puede decidir cuánto rediseño hacer.

### Bloque A — Software (lo que falta construir)

1. **Migración** SQL para crear tabla `conversaciones_agendamiento` (esquema en [AGENDAMIENTO_AUTOMATICO.md:421-444](AGENDAMIENTO_AUTOMATICO.md#L421-L444)). Desbloquea el flujo WhatsApp end-to-end.
2. **Agente WhatsApp** completo:
   - Agregar tools `reagendar_cita`, `cancelar_cita`, `enviar_recordatorio` a [`webhook-agendar-cita`](supabase/functions/webhook-agendar-cita/index.ts).
   - Edge function de cron diario para recordatorios 24h antes.
   - Conector real Meta WhatsApp Business API (cliente entrega credenciales — cláusula 6 contrato).
   - Plantillas de mensaje aprobadas en Meta Business Manager.
3. **Agente RAG / Base de Datos**:
   - Habilitar extensión `pgvector` en Supabase.
   - Pipeline de embeddings para `clientes_reporte`, `ventas_detalle`, `facturacion_detalle`, `agendas`.
   - Edge function `agente-rag` con tool calling sobre dataset.
   - UI de consulta en lenguaje natural (sugerencia: nueva ruta `/asistente-ia` o panel en `/reportes`).
4. **Rediseño UI estilo GetTimely** — aplicar los hallazgos del Bloque 0 al front actual. El objetivo no es clonar pixel-perfect, sino que un usuario que viene de GetTimely sienta que está en un terreno familiar (mismas zonas de la pantalla, mismos patrones de interacción, misma jerarquía visual).

### Bloque B — Puesta en producción

5. Deploy del frontend (Vercel u opción equivalente).
6. **Migración de datos** del software actual del cliente al nuevo (formato a confirmar — Excel/CSV/API).
7. Smoke tests end-to-end con datos reales.
8. Monitoreo básico (logs en Supabase + alertas mínimas).

### Bloque C — Cierre formal

9. **Manual de usuario final** (no técnico, para el equipo de Cedapiel).
10. **Capacitación**: 1-2 sesiones grabadas con el equipo, sobre datos reales ya migrados.
11. Entrega formal por correo a Óscar García → arranca reloj de 15 días para observaciones (cláusula 4) → cobro USD 1.100 + activación mensualidad USD 630/mes.

---

## 9. Plan de cierre acordado — Opción B

Estrategia confirmada con el cliente: **entrega formal del Hito 3 antes de la migración**, encuadrando la migración + capacitación dentro del entregable contractual "puesta en producción y estabilización" (cláusula 4, Hito 3).

**Calendario tentativo** (a ajustar tras reunión con el cliente):

| Fecha | Hito |
|---|---|
| Mié 2026-04-29 | Reunión con Óscar — recoger feedback de UI, lista final de pendientes, confirmación de fecha de migración de datos |
| Lun 2026-05-04 | Software 100% funcional con todos los pendientes Bloque A cerrados |
| Mié 2026-05-06 | Reunión técnica para plan de migración + preparación de equipo cliente |
| Vie 2026-05-08 | **Entrega formal Hito 3** por correo (factura USD 1.100 emitida) |
| Sem 2026-05-11 | Migración de datos + capacitación (dentro del período de estabilización) |
| Mar 2026-05-13 | Cobro USD 1.100 (5 días desde notificación, cláusula 7) |
| Sáb 2026-05-23 | Vencimiento de los 15 días → aprobación automática si no hay observaciones |
| Dom 2026-05-24 | **Arranca mensualidad USD 630/mes** |

---

## 10. Pendientes de input del cliente

Lo que necesita Óscar entregar para que el cierre avance:

1. **Export de datos a migrar** — formato y estructura (Excel/CSV/export de GetTimely).
2. **Credenciales Meta WhatsApp Business** (cláusula 6 del contrato — son por cuenta del cliente).
3. **Lista escrita de funcionalidades faltantes** que mencionó en reuniones previas.

> Nota: la referencia visual NO se le pide al cliente — la sacamos directamente investigando GetTimely (Bloque 0).

---

## 11. Riesgos y deuda técnica abierta

1. **Sin git history** previo a este zip — no hay trazabilidad de quién hizo qué cambio. Mitigación: arrancar de cero con repo limpio en GitHub.
2. **`.env` con anon key commiteado** — es la pública (segura por diseño en Supabase), pero conviene auditar que el `SUPABASE_SERVICE_ROLE_KEY` no haya sido expuesto en otro lado.
3. **Inconsistencia tipográfica en el contrato**: total declarado USD 7.500, suma de hitos USD 7.200. No se va a disputar.
4. **Modelo IA = Gemini 2.5 Flash via Lovable Gateway** — el contrato no lo limita, pero hay que documentar la dependencia para el cliente (afecta cláusula 6 si Lovable cobra por uso).
5. **Scope creep absorbido**: el repo construye RRHH, comisiones, libros contables, tarjetas de regalo, etc. — no están explícitos en cláusula 2. Decisión actual: dejarlo como cortesía dentro del Hito 2, no facturar extra. Conviene mencionarlo por escrito al cierre como "valor agregado".
6. **`bun.lockb` vs `package-lock.json`** ambos presentes — definir un único gestor (sugerido: `bun` ya que está usando Lovable). Eliminar el otro.

---

## 12. Cómo correr el proyecto local

Requisitos: Node 20+ y bun (o npm).

```bash
# Instalar dependencias
bun install
# o: npm install

# Levantar dev server
bun run dev
# Abre http://localhost:8080 (configurado en vite.config.ts)

# Build de producción
bun run build

# Linter
bun run lint
```

El proyecto se conecta directamente al Supabase remoto del cliente (`ckiwuneigsdotfwrxmbu`). No hay setup local de DB necesario.

Para crear un nuevo edge function:
```bash
supabase functions new mi-funcion
# Editar supabase/functions/mi-funcion/index.ts
supabase functions deploy mi-funcion
```

---

## 13. Cuentas y accesos

| Servicio | Acceso |
|---|---|
| Supabase | Proyecto `ckiwuneigsdotfwrxmbu` — credenciales con Ignacio |
| Lovable | https://lovable.dev/projects/67023aef-0019-4212-9160-a4ecc77a741a |
| GitHub | A crear (sugerido: `44k-agencia/cedapiel-clinicflow` privado) |
| Meta WhatsApp Business | Pendiente — provee Cedapiel |
| Hosting frontend | A definir |

---

## 14. Plan de cierre — pasos para Juan

Juan toma el proyecto y lo lleva hasta la entrega final. Estos son los pasos secuenciales sugeridos. Cada paso tiene un entregable claro al final.

### Paso 1 — Onboarding (1–2 días)

- Leer este documento de punta a punta.
- Leer el contrato `Software para Cedapiel  (1).pdf` (alcance, hitos, pagos).
- Leer la documentación técnica por módulo (los `.md` en la raíz).
- Pedir a Ignacio: invitación al repo GitHub, acceso al panel de Supabase, acceso al proyecto Lovable.
- Levantar el proyecto local (`bun install` + `bun run dev`) y navegar las 42 páginas.
- **Entregable**: confirmación a Ignacio de que está corriendo local y entendió el alcance.

### Paso 2 — Investigación de GetTimely (2–3 días)

- Crear cuenta de prueba en [GetTimely.com](https://www.gettimely.com/) (trial gratis).
- Recorrer cada módulo: agenda, clientes, POS, inventario, reportes, marketing, configuración.
- Capturas de pantalla de cada vista relevante.
- Comparar contra el front actual de ClinicFlow.
- **Entregable a Ignacio**: documento con (a) capturas anotadas de GetTimely, (b) tabla comparativa GetTimely vs ClinicFlow por pantalla, (c) propuesta de cambios concretos al front. Formato libre — Notion, Google Doc o Loom + PDF.
- **Bloqueo**: no avanzar al Paso 3 hasta que Ignacio valide la propuesta de cambios.

### Paso 3 — Cerrar agente WhatsApp (5–7 días)

- Crear migración SQL `conversaciones_agendamiento` (esquema en [AGENDAMIENTO_AUTOMATICO.md](AGENDAMIENTO_AUTOMATICO.md)).
- Agregar tools al edge function [`webhook-agendar-cita`](supabase/functions/webhook-agendar-cita/index.ts): `reagendar_cita`, `cancelar_cita`.
- Crear edge function nueva para envío de recordatorios automáticos (cron diario, busca citas de mañana, envía template de WhatsApp).
- Pedir a Óscar credenciales Meta WhatsApp Business.
- Configurar plantillas de mensaje en Meta Business Manager (saludo inicial, confirmación de cita, recordatorio 24h, reagenda, cancelación).
- Conectar el conector real (reemplazar el fetch a `ai.gateway.lovable.dev` cuando sea respuesta final, agregar fetch a Graph API de Meta para envío real).
- **Entregable**: probar flujo end-to-end por WhatsApp con un número real (puede ser tuyo). Demo grabada.

### Paso 4 — Construir agente RAG (7–10 días)

- Habilitar extensión `pgvector` en Supabase (panel → Database → Extensions).
- Crear tabla `documentos_rag` con columna `embedding vector(1536)`.
- Edge function `generar-embeddings`: cron diario que toma rows nuevos/actualizados de `clientes_reporte`, `ventas_detalle`, `facturacion_detalle`, `agendas`, los formatea como texto plano y guarda embedding (usando OpenAI `text-embedding-3-small` o el modelo equivalente vía Lovable Gateway).
- Edge function `agente-rag`: recibe pregunta NL → genera embedding de la pregunta → busca top-K por similitud coseno → arma prompt con contexto → llama Gemini 2.5 Flash → devuelve respuesta + fuentes.
- Front: ruta `/asistente-ia` con chat estilo ChatGPT (pregunta → respuesta + fuentes citadas).
- **Entregable**: probar 10 preguntas tipo "cuánto vendió la sucursal X el mes pasado", "qué cliente tiene más visitas canceladas", "cuál es el ticket promedio por profesional". Demo grabada.

### Paso 5 — Rediseño UI según GetTimely (5–7 días)

- Aplicar los cambios validados en el Paso 2.
- Foco: agenda (vista semanal/diaria), ficha de cliente, POS — son las 3 pantallas más usadas día a día.
- No tocar reportes ni configuración salvo que sea crítico.
- **Entregable**: front rediseñado, con los componentes alineados a GetTimely.

### Paso 6 — Deploy a producción (1–2 días)

- Crear cuenta en Vercel si no tiene.
- Vincular GitHub repo (lo conecta Ignacio una vez).
- Configurar variables de entorno en Vercel (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`).
- Deploy a `cedapiel.vercel.app` (o dominio custom si Cedapiel lo provee).
- Smoke tests: login, crear cita, vender en POS, ver reporte.
- **Entregable**: URL de producción funcionando.

### Paso 7 — Migración de datos del cliente (3–5 días, depende del cliente)

- Pedir a Óscar el export de su software actual (GetTimely tiene export propio).
- Mapear campos GetTimely → tablas ClinicFlow.
- Escribir scripts de migración (en `scripts/` ya hay un ejemplo: [`import-facturacion.ts`](scripts/import-facturacion.ts)). Los importadores existentes en `supabase/functions/*-importar/` también sirven como template.
- Probar con dataset chico antes de migrar todo.
- **Entregable**: datos reales del cliente cargados en producción.

### Paso 8 — Capacitación + manual (2–3 días)

- Manual de usuario final en Notion/PDF — no técnico, orientado a las personas que van a usar el sistema día a día (recepcionistas, profesionales, gerencia).
- 1–2 sesiones de capacitación con el equipo de Cedapiel, grabadas en Loom o similar.
- **Entregable**: link al manual + grabaciones.

### Paso 9 — Entrega formal Hito 3

- Escribir correo formal a Óscar García (oscargb@cedapiel.com) anunciando entrega del Hito 3.
- Adjuntar: URL de producción, manual, link a grabaciones, lista de entregables cumplidos por cláusula del contrato.
- Coordinar con Ignacio el envío (la entrega contractual la hace Ignacio como prestador firmante).
- A partir del envío:
  - 5 días para que Óscar pague los USD 1.100 (cláusula 7).
  - 15 días corridos para que el cliente revise (cláusula 4). Si no hay observaciones, queda aprobado automáticamente.
- **Entregable**: correo enviado + acuse de recibo.

### Paso 10 — Estabilización (15 días post-entrega)

- Resolver cualquier observación que Óscar marque.
- Monitorear logs de Supabase y Vercel los primeros días.
- **Cierre**: aprobación → arranca mensualidad USD 630/mes.

---

**Tiempo total estimado**: ~5 a 7 semanas de trabajo concentrado, dependiendo de la velocidad del cliente para entregar credenciales y datos.

**Comunicación con Ignacio**: check-in por video cada 3–4 días para revisar avance. Cualquier bloqueo grave → mensaje inmediato.

---

## 15. Próximas acciones inmediatas

- [ ] Ignacio: inicializar repo git limpio + push a GitHub privado + invitar a Juan.
- [ ] Ignacio: dar acceso a Juan al panel de Supabase y al proyecto Lovable.
- [ ] Juan: completar Paso 1 (onboarding).
- [ ] Juan: arrancar Paso 2 (investigación GetTimely).
- [ ] Ignacio: reunión con Óscar (mié 29 abr) — recoger lista escrita de pendientes y confirmar entrega del export de datos.
- [ ] Ignacio: comunicar a Óscar la fecha estimada de entrega Hito 3 (~6 semanas desde hoy).
