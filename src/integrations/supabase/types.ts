export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      agenda_servicios: {
        Row: {
          created_at: string | null
          id: number
          id_agenda: number
          id_servicio: number
        }
        Insert: {
          created_at?: string | null
          id?: number
          id_agenda: number
          id_servicio: number
        }
        Update: {
          created_at?: string | null
          id?: number
          id_agenda?: number
          id_servicio?: number
        }
        Relationships: [
          {
            foreignKeyName: "agenda_servicios_id_agenda_fkey"
            columns: ["id_agenda"]
            isOneToOne: false
            referencedRelation: "agendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_servicios_id_agenda_fkey"
            columns: ["id_agenda"]
            isOneToOne: false
            referencedRelation: "vw_tiempos_ciclo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_servicios_id_servicio_fkey"
            columns: ["id_servicio"]
            isOneToOne: false
            referencedRelation: "servicios"
            referencedColumns: ["id"]
          },
        ]
      }
      agendas: {
        Row: {
          cambiado_por: string | null
          cerrada_por_usuario: string | null
          check_in_at: string | null
          check_out_at: string | null
          checkin_timestamp: string | null
          confirmacion_timestamp: string | null
          created_at: string | null
          estado: Database["public"]["Enums"]["cita_estado_enum"] | null
          fecha: string
          google_event_id: string | null
          hora_fin: string
          hora_inicio: string
          id: number
          id_cliente: number
          id_empleado: number | null
          id_servicio: number | null
          id_sucursal: number
          motivo_cancelacion: string | null
          observaciones: string | null
          origen: string | null
          updated_at: string | null
        }
        Insert: {
          cambiado_por?: string | null
          cerrada_por_usuario?: string | null
          check_in_at?: string | null
          check_out_at?: string | null
          checkin_timestamp?: string | null
          confirmacion_timestamp?: string | null
          created_at?: string | null
          estado?: Database["public"]["Enums"]["cita_estado_enum"] | null
          fecha: string
          google_event_id?: string | null
          hora_fin: string
          hora_inicio: string
          id?: number
          id_cliente: number
          id_empleado?: number | null
          id_servicio?: number | null
          id_sucursal: number
          motivo_cancelacion?: string | null
          observaciones?: string | null
          origen?: string | null
          updated_at?: string | null
        }
        Update: {
          cambiado_por?: string | null
          cerrada_por_usuario?: string | null
          check_in_at?: string | null
          check_out_at?: string | null
          checkin_timestamp?: string | null
          confirmacion_timestamp?: string | null
          created_at?: string | null
          estado?: Database["public"]["Enums"]["cita_estado_enum"] | null
          fecha?: string
          google_event_id?: string | null
          hora_fin?: string
          hora_inicio?: string
          id?: number
          id_cliente?: number
          id_empleado?: number | null
          id_servicio?: number | null
          id_sucursal?: number
          motivo_cancelacion?: string | null
          observaciones?: string | null
          origen?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agendas_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendas_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_clientes_ausentes"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "agendas_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_clientes_no_retenidos"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "agendas_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_clientes_recompra"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "agendas_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_clientes_saldos"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "agendas_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_no_show_rate"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "agendas_id_empleado_fkey"
            columns: ["id_empleado"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendas_id_empleado_fkey"
            columns: ["id_empleado"]
            isOneToOne: false
            referencedRelation: "vw_productividad_empleado"
            referencedColumns: ["id_empleado"]
          },
          {
            foreignKeyName: "agendas_id_servicio_fkey"
            columns: ["id_servicio"]
            isOneToOne: false
            referencedRelation: "servicios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendas_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendas_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "vw_pasivo_diferidos_sucursal"
            referencedColumns: ["id_sucursal"]
          },
        ]
      }
      anticipos: {
        Row: {
          created_at: string | null
          estado: Database["public"]["Enums"]["estado_anticipo_enum"]
          fecha_pago: string
          id: number
          id_cliente: number
          id_sucursal: number
          metodo_pago: string
          monto_mxn: number
          observacion: string | null
          referencia_pago: string | null
          saldo_disponible_mxn: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          estado?: Database["public"]["Enums"]["estado_anticipo_enum"]
          fecha_pago?: string
          id?: number
          id_cliente: number
          id_sucursal: number
          metodo_pago: string
          monto_mxn: number
          observacion?: string | null
          referencia_pago?: string | null
          saldo_disponible_mxn: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          estado?: Database["public"]["Enums"]["estado_anticipo_enum"]
          fecha_pago?: string
          id?: number
          id_cliente?: number
          id_sucursal?: number
          metodo_pago?: string
          monto_mxn?: number
          observacion?: string | null
          referencia_pago?: string | null
          saldo_disponible_mxn?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anticipos_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anticipos_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_clientes_ausentes"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "anticipos_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_clientes_no_retenidos"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "anticipos_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_clientes_recompra"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "anticipos_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_clientes_saldos"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "anticipos_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_no_show_rate"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "anticipos_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anticipos_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "vw_pasivo_diferidos_sucursal"
            referencedColumns: ["id_sucursal"]
          },
        ]
      }
      api_keys: {
        Row: {
          activo: boolean
          created_at: string
          created_by: string | null
          id: number
          key_hash: string
          last_used_at: string | null
          nombre: string
          permisos: Json
        }
        Insert: {
          activo?: boolean
          created_at?: string
          created_by?: string | null
          id?: number
          key_hash: string
          last_used_at?: string | null
          nombre: string
          permisos?: Json
        }
        Update: {
          activo?: boolean
          created_at?: string
          created_by?: string | null
          id?: number
          key_hash?: string
          last_used_at?: string | null
          nombre?: string
          permisos?: Json
        }
        Relationships: []
      }
      aplicacion_anticipo: {
        Row: {
          created_at: string | null
          fecha_aplicacion: string
          id: number
          id_anticipo: number
          id_venta: number
          monto_aplicado_mxn: number
          usuario_aplico: string
        }
        Insert: {
          created_at?: string | null
          fecha_aplicacion?: string
          id?: number
          id_anticipo: number
          id_venta: number
          monto_aplicado_mxn: number
          usuario_aplico: string
        }
        Update: {
          created_at?: string | null
          fecha_aplicacion?: string
          id?: number
          id_anticipo?: number
          id_venta?: number
          monto_aplicado_mxn?: number
          usuario_aplico?: string
        }
        Relationships: [
          {
            foreignKeyName: "aplicacion_anticipo_id_anticipo_fkey"
            columns: ["id_anticipo"]
            isOneToOne: false
            referencedRelation: "anticipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aplicacion_anticipo_id_anticipo_fkey"
            columns: ["id_anticipo"]
            isOneToOne: false
            referencedRelation: "vw_anticipos_detalle"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aplicacion_anticipo_id_venta_fkey"
            columns: ["id_venta"]
            isOneToOne: false
            referencedRelation: "ventas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aplicacion_anticipo_id_venta_fkey"
            columns: ["id_venta"]
            isOneToOne: false
            referencedRelation: "vw_ventas_desglose"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aplicacion_anticipo_id_venta_fkey"
            columns: ["id_venta"]
            isOneToOne: false
            referencedRelation: "vw_ventas_detalle_descuentos"
            referencedColumns: ["id_venta"]
          },
        ]
      }
      asistencias: {
        Row: {
          created_at: string | null
          estado: string | null
          fecha: string
          hora_checkin: string | null
          hora_checkout: string | null
          horas_trabajadas: number | null
          id: number
          id_empleado: number
          id_sucursal: number
          notas: string | null
          observaciones: string | null
          tipo_turno: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          estado?: string | null
          fecha: string
          hora_checkin?: string | null
          hora_checkout?: string | null
          horas_trabajadas?: number | null
          id?: number
          id_empleado: number
          id_sucursal: number
          notas?: string | null
          observaciones?: string | null
          tipo_turno?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          estado?: string | null
          fecha?: string
          hora_checkin?: string | null
          hora_checkout?: string | null
          horas_trabajadas?: number | null
          id?: number
          id_empleado?: number
          id_sucursal?: number
          notas?: string | null
          observaciones?: string | null
          tipo_turno?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asistencias_id_empleado_fkey"
            columns: ["id_empleado"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asistencias_id_empleado_fkey"
            columns: ["id_empleado"]
            isOneToOne: false
            referencedRelation: "vw_productividad_empleado"
            referencedColumns: ["id_empleado"]
          },
          {
            foreignKeyName: "asistencias_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asistencias_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "vw_pasivo_diferidos_sucursal"
            referencedColumns: ["id_sucursal"]
          },
        ]
      }
      automation_logs: {
        Row: {
          actions_executed: Json | null
          automation_rule_id: number | null
          created_at: string
          error_message: string | null
          id: number
          success: boolean
          trigger_data: Json | null
          trigger_event: string
        }
        Insert: {
          actions_executed?: Json | null
          automation_rule_id?: number | null
          created_at?: string
          error_message?: string | null
          id?: number
          success?: boolean
          trigger_data?: Json | null
          trigger_event: string
        }
        Update: {
          actions_executed?: Json | null
          automation_rule_id?: number | null
          created_at?: string
          error_message?: string | null
          id?: number
          success?: boolean
          trigger_data?: Json | null
          trigger_event?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_automation_rule_id_fkey"
            columns: ["automation_rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          actions: Json
          activo: boolean
          created_at: string
          id: number
          nombre: string
          trigger_config: Json
          trigger_type: string
          updated_at: string
        }
        Insert: {
          actions?: Json
          activo?: boolean
          created_at?: string
          id?: number
          nombre: string
          trigger_config?: Json
          trigger_type: string
          updated_at?: string
        }
        Update: {
          actions?: Json
          activo?: boolean
          created_at?: string
          id?: number
          nombre?: string
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      bitacora_acceso: {
        Row: {
          accion: string
          detalle_json: Json | null
          id: string
          id_usuario_afectado: string | null
          id_usuario_responsable: string
          ip_address: string | null
          motivo: string | null
          timestamp: string
          user_agent: string | null
        }
        Insert: {
          accion: string
          detalle_json?: Json | null
          id?: string
          id_usuario_afectado?: string | null
          id_usuario_responsable: string
          ip_address?: string | null
          motivo?: string | null
          timestamp?: string
          user_agent?: string | null
        }
        Update: {
          accion?: string
          detalle_json?: Json | null
          id?: string
          id_usuario_afectado?: string | null
          id_usuario_responsable?: string
          ip_address?: string | null
          motivo?: string | null
          timestamp?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      bitacora_accion: {
        Row: {
          accion: string
          created_at: string | null
          detalle_json: Json | null
          entidad: string
          id: string
          id_entidad: number | null
          timestamp: string | null
          usuario: string | null
        }
        Insert: {
          accion: string
          created_at?: string | null
          detalle_json?: Json | null
          entidad: string
          id?: string
          id_entidad?: number | null
          timestamp?: string | null
          usuario?: string | null
        }
        Update: {
          accion?: string
          created_at?: string | null
          detalle_json?: Json | null
          entidad?: string
          id?: string
          id_entidad?: number | null
          timestamp?: string | null
          usuario?: string | null
        }
        Relationships: []
      }
      bitacora_regla_comision: {
        Row: {
          accion: string
          antes_json: Json | null
          despues_json: Json | null
          id: string
          id_regla: number
          timestamp: string
          usuario_responsable: string
        }
        Insert: {
          accion: string
          antes_json?: Json | null
          despues_json?: Json | null
          id?: string
          id_regla: number
          timestamp?: string
          usuario_responsable: string
        }
        Update: {
          accion?: string
          antes_json?: Json | null
          despues_json?: Json | null
          id?: string
          id_regla?: number
          timestamp?: string
          usuario_responsable?: string
        }
        Relationships: [
          {
            foreignKeyName: "bitacora_regla_comision_id_regla_fkey"
            columns: ["id_regla"]
            isOneToOne: false
            referencedRelation: "parametros_comision"
            referencedColumns: ["id"]
          },
        ]
      }
      bloqueos_agenda: {
        Row: {
          created_at: string
          created_by: string | null
          fecha: string
          hora_fin: string
          hora_inicio: string
          id: number
          id_empleado: number | null
          id_sucursal: number
          motivo: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          fecha: string
          hora_fin: string
          hora_inicio: string
          id?: never
          id_empleado?: number | null
          id_sucursal: number
          motivo?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          fecha?: string
          hora_fin?: string
          hora_inicio?: string
          id?: never
          id_empleado?: number | null
          id_sucursal?: number
          motivo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bloqueos_agenda_id_empleado_fkey"
            columns: ["id_empleado"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bloqueos_agenda_id_empleado_fkey"
            columns: ["id_empleado"]
            isOneToOne: false
            referencedRelation: "vw_productividad_empleado"
            referencedColumns: ["id_empleado"]
          },
          {
            foreignKeyName: "bloqueos_agenda_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bloqueos_agenda_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "vw_pasivo_diferidos_sucursal"
            referencedColumns: ["id_sucursal"]
          },
        ]
      }
      campanias_marketing: {
        Row: {
          created_at: string | null
          descripcion: string | null
          estado: string | null
          fecha_fin: string | null
          fecha_inicio: string
          gasto_real: number | null
          id: number
          id_sucursal: number | null
          nombre: string
          objetivo: string | null
          presupuesto: number | null
          responsable: number | null
          resultados: string | null
          segmento: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          descripcion?: string | null
          estado?: string | null
          fecha_fin?: string | null
          fecha_inicio: string
          gasto_real?: number | null
          id?: number
          id_sucursal?: number | null
          nombre: string
          objetivo?: string | null
          presupuesto?: number | null
          responsable?: number | null
          resultados?: string | null
          segmento?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          descripcion?: string | null
          estado?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string
          gasto_real?: number | null
          id?: number
          id_sucursal?: number | null
          nombre?: string
          objetivo?: string | null
          presupuesto?: number | null
          responsable?: number | null
          resultados?: string | null
          segmento?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campanias_marketing_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campanias_marketing_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "vw_pasivo_diferidos_sucursal"
            referencedColumns: ["id_sucursal"]
          },
          {
            foreignKeyName: "campanias_marketing_responsable_fkey"
            columns: ["responsable"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campanias_marketing_responsable_fkey"
            columns: ["responsable"]
            isOneToOne: false
            referencedRelation: "vw_productividad_empleado"
            referencedColumns: ["id_empleado"]
          },
        ]
      }
      categoria_servicio: {
        Row: {
          activo: boolean | null
          created_at: string | null
          descripcion: string | null
          id: number
          nombre: string
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          descripcion?: string | null
          id?: number
          nombre: string
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          descripcion?: string | null
          id?: number
          nombre?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      citas_agendadas: {
        Row: {
          cliente: string
          creado_por: string | null
          created_at: string | null
          email: string | null
          equipo: string | null
          estado: string
          facturado: string | null
          fecha: string
          fecha_creacion: string | null
          hora_fin: string
          hora_inicio: string
          id: number
          numero_sms: string | null
          profesional: string | null
          reagendado: string | null
          recurso: string | null
          retencion: string | null
          servicio: string | null
          sucursal: string
          telefono: string | null
          updated_at: string | null
          valor_mxn: number | null
        }
        Insert: {
          cliente: string
          creado_por?: string | null
          created_at?: string | null
          email?: string | null
          equipo?: string | null
          estado: string
          facturado?: string | null
          fecha: string
          fecha_creacion?: string | null
          hora_fin: string
          hora_inicio: string
          id?: number
          numero_sms?: string | null
          profesional?: string | null
          reagendado?: string | null
          recurso?: string | null
          retencion?: string | null
          servicio?: string | null
          sucursal: string
          telefono?: string | null
          updated_at?: string | null
          valor_mxn?: number | null
        }
        Update: {
          cliente?: string
          creado_por?: string | null
          created_at?: string | null
          email?: string | null
          equipo?: string | null
          estado?: string
          facturado?: string | null
          fecha?: string
          fecha_creacion?: string | null
          hora_fin?: string
          hora_inicio?: string
          id?: number
          numero_sms?: string | null
          profesional?: string | null
          reagendado?: string | null
          recurso?: string | null
          retencion?: string | null
          servicio?: string | null
          sucursal?: string
          telefono?: string | null
          updated_at?: string | null
          valor_mxn?: number | null
        }
        Relationships: []
      }
      citas_canceladas: {
        Row: {
          cliente: string
          created_at: string | null
          email: string | null
          equipo: string | null
          estado: string | null
          facturado: boolean | null
          fecha_cita: string
          fecha_creacion: string | null
          hora_fin: string | null
          hora_inicio: string | null
          id: number
          numero_sms: string | null
          profesional: string | null
          reagendado: boolean | null
          retenido: boolean | null
          servicio: string | null
          staff_registro: string | null
          sucursal: string
          telefono: string | null
          updated_at: string | null
          valor_mxn: number | null
        }
        Insert: {
          cliente: string
          created_at?: string | null
          email?: string | null
          equipo?: string | null
          estado?: string | null
          facturado?: boolean | null
          fecha_cita: string
          fecha_creacion?: string | null
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: number
          numero_sms?: string | null
          profesional?: string | null
          reagendado?: boolean | null
          retenido?: boolean | null
          servicio?: string | null
          staff_registro?: string | null
          sucursal: string
          telefono?: string | null
          updated_at?: string | null
          valor_mxn?: number | null
        }
        Update: {
          cliente?: string
          created_at?: string | null
          email?: string | null
          equipo?: string | null
          estado?: string | null
          facturado?: boolean | null
          fecha_cita?: string
          fecha_creacion?: string | null
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: number
          numero_sms?: string | null
          profesional?: string | null
          reagendado?: boolean | null
          retenido?: boolean | null
          servicio?: string | null
          staff_registro?: string | null
          sucursal?: string
          telefono?: string | null
          updated_at?: string | null
          valor_mxn?: number | null
        }
        Relationships: []
      }
      citas_historial_estado: {
        Row: {
          cambiado_en: string
          cambiado_por: string
          estado_anterior:
            | Database["public"]["Enums"]["cita_estado_enum"]
            | null
          estado_nuevo: Database["public"]["Enums"]["cita_estado_enum"]
          id: string
          id_cita: number
          motivo: string | null
        }
        Insert: {
          cambiado_en?: string
          cambiado_por: string
          estado_anterior?:
            | Database["public"]["Enums"]["cita_estado_enum"]
            | null
          estado_nuevo: Database["public"]["Enums"]["cita_estado_enum"]
          id?: string
          id_cita: number
          motivo?: string | null
        }
        Update: {
          cambiado_en?: string
          cambiado_por?: string
          estado_anterior?:
            | Database["public"]["Enums"]["cita_estado_enum"]
            | null
          estado_nuevo?: Database["public"]["Enums"]["cita_estado_enum"]
          id?: string
          id_cita?: number
          motivo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "citas_historial_estado_id_cita_fkey"
            columns: ["id_cita"]
            isOneToOne: false
            referencedRelation: "agendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "citas_historial_estado_id_cita_fkey"
            columns: ["id_cita"]
            isOneToOne: false
            referencedRelation: "vw_tiempos_ciclo"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          activo: boolean | null
          apellidos: string | null
          created_at: string | null
          direccion: string | null
          email: string | null
          fecha_alta: string | null
          fecha_nacimiento: string | null
          fecha_ultima_visita: string | null
          genero: string | null
          id: number
          nombre: string
          notas: string | null
          numero_expediente: string | null
          saldo_contra: number | null
          saldo_favor: number | null
          sucursal_preferida: number | null
          telefono: string | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          apellidos?: string | null
          created_at?: string | null
          direccion?: string | null
          email?: string | null
          fecha_alta?: string | null
          fecha_nacimiento?: string | null
          fecha_ultima_visita?: string | null
          genero?: string | null
          id?: number
          nombre: string
          notas?: string | null
          numero_expediente?: string | null
          saldo_contra?: number | null
          saldo_favor?: number | null
          sucursal_preferida?: number | null
          telefono?: string | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          apellidos?: string | null
          created_at?: string | null
          direccion?: string | null
          email?: string | null
          fecha_alta?: string | null
          fecha_nacimiento?: string | null
          fecha_ultima_visita?: string | null
          genero?: string | null
          id?: number
          nombre?: string
          notas?: string | null
          numero_expediente?: string | null
          saldo_contra?: number | null
          saldo_favor?: number | null
          sucursal_preferida?: number | null
          telefono?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_sucursal_preferida_fkey"
            columns: ["sucursal_preferida"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_sucursal_preferida_fkey"
            columns: ["sucursal_preferida"]
            isOneToOne: false
            referencedRelation: "vw_pasivo_diferidos_sucursal"
            referencedColumns: ["id_sucursal"]
          },
        ]
      }
      clientes_eliminados: {
        Row: {
          apellidos: string | null
          created_at: string | null
          datos_completos: Json | null
          email: string | null
          fecha_eliminacion: string | null
          id: number
          id_cliente_original: number
          motivo_eliminacion: string | null
          nombre: string | null
          telefono: string | null
          usuario_responsable: string | null
        }
        Insert: {
          apellidos?: string | null
          created_at?: string | null
          datos_completos?: Json | null
          email?: string | null
          fecha_eliminacion?: string | null
          id?: never
          id_cliente_original: number
          motivo_eliminacion?: string | null
          nombre?: string | null
          telefono?: string | null
          usuario_responsable?: string | null
        }
        Update: {
          apellidos?: string | null
          created_at?: string | null
          datos_completos?: Json | null
          email?: string | null
          fecha_eliminacion?: string | null
          id?: never
          id_cliente_original?: number
          motivo_eliminacion?: string | null
          nombre?: string | null
          telefono?: string | null
          usuario_responsable?: string | null
        }
        Relationships: []
      }
      clientes_inactivos: {
        Row: {
          cliente: string
          created_at: string | null
          dias_sin_volver: number | null
          email: string | null
          estado: string | null
          gasto_total_mxn: number | null
          id: number
          numero_sms: string | null
          profesional: string
          telefono: string | null
          ultima_cita: string | null
          ultimo_servicio: string | null
          updated_at: string | null
        }
        Insert: {
          cliente: string
          created_at?: string | null
          dias_sin_volver?: number | null
          email?: string | null
          estado?: string | null
          gasto_total_mxn?: number | null
          id?: number
          numero_sms?: string | null
          profesional: string
          telefono?: string | null
          ultima_cita?: string | null
          ultimo_servicio?: string | null
          updated_at?: string | null
        }
        Update: {
          cliente?: string
          created_at?: string | null
          dias_sin_volver?: number | null
          email?: string | null
          estado?: string | null
          gasto_total_mxn?: number | null
          id?: number
          numero_sms?: string | null
          profesional?: string
          telefono?: string | null
          ultima_cita?: string | null
          ultimo_servicio?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      clientes_reporte: {
        Row: {
          apellido: string | null
          cantidad_citas: number | null
          ciudad: string | null
          cliente_id: number | null
          codigo_postal: string | null
          created_at: string | null
          direccion_1: string | null
          direccion_2: string | null
          email: string | null
          empresa: string | null
          es_vip: boolean | null
          estado: string | null
          estado_ultima_cita: string | null
          fecha_nacimiento: string | null
          fecha_registro: string | null
          fecha_ultimo_servicio: string | null
          id: number
          nombre: string | null
          nombre_completo: string
          profesional_ultimo_servicio: string | null
          semanas_ausente: number | null
          suburbio: string | null
          telefono: string | null
          telefono_movil: string | null
          ultima_cita_reservada_via: string | null
          ultimo_servicio: string | null
          updated_at: string | null
        }
        Insert: {
          apellido?: string | null
          cantidad_citas?: number | null
          ciudad?: string | null
          cliente_id?: number | null
          codigo_postal?: string | null
          created_at?: string | null
          direccion_1?: string | null
          direccion_2?: string | null
          email?: string | null
          empresa?: string | null
          es_vip?: boolean | null
          estado?: string | null
          estado_ultima_cita?: string | null
          fecha_nacimiento?: string | null
          fecha_registro?: string | null
          fecha_ultimo_servicio?: string | null
          id?: number
          nombre?: string | null
          nombre_completo: string
          profesional_ultimo_servicio?: string | null
          semanas_ausente?: number | null
          suburbio?: string | null
          telefono?: string | null
          telefono_movil?: string | null
          ultima_cita_reservada_via?: string | null
          ultimo_servicio?: string | null
          updated_at?: string | null
        }
        Update: {
          apellido?: string | null
          cantidad_citas?: number | null
          ciudad?: string | null
          cliente_id?: number | null
          codigo_postal?: string | null
          created_at?: string | null
          direccion_1?: string | null
          direccion_2?: string | null
          email?: string | null
          empresa?: string | null
          es_vip?: boolean | null
          estado?: string | null
          estado_ultima_cita?: string | null
          fecha_nacimiento?: string | null
          fecha_registro?: string | null
          fecha_ultimo_servicio?: string | null
          id?: number
          nombre?: string | null
          nombre_completo?: string
          profesional_ultimo_servicio?: string | null
          semanas_ausente?: number | null
          suburbio?: string | null
          telefono?: string | null
          telefono_movil?: string | null
          ultima_cita_reservada_via?: string | null
          ultimo_servicio?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      comisiones: {
        Row: {
          created_at: string | null
          estado: string | null
          fecha_pago: string | null
          id: number
          id_categoria_servicio: number | null
          id_empleado: number
          id_empleado_secundario: number | null
          id_sucursal: number
          id_venta: number | null
          id_venta_item: number | null
          monto_base: number
          monto_comision: number
          monto_comision_secundario: number | null
          notas: string | null
          periodo_fin: string
          periodo_inicio: string
          porcentaje_comision: number
          porcentaje_split: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          estado?: string | null
          fecha_pago?: string | null
          id?: number
          id_categoria_servicio?: number | null
          id_empleado: number
          id_empleado_secundario?: number | null
          id_sucursal: number
          id_venta?: number | null
          id_venta_item?: number | null
          monto_base: number
          monto_comision: number
          monto_comision_secundario?: number | null
          notas?: string | null
          periodo_fin: string
          periodo_inicio: string
          porcentaje_comision: number
          porcentaje_split?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          estado?: string | null
          fecha_pago?: string | null
          id?: number
          id_categoria_servicio?: number | null
          id_empleado?: number
          id_empleado_secundario?: number | null
          id_sucursal?: number
          id_venta?: number | null
          id_venta_item?: number | null
          monto_base?: number
          monto_comision?: number
          monto_comision_secundario?: number | null
          notas?: string | null
          periodo_fin?: string
          periodo_inicio?: string
          porcentaje_comision?: number
          porcentaje_split?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comisiones_id_categoria_servicio_fkey"
            columns: ["id_categoria_servicio"]
            isOneToOne: false
            referencedRelation: "categoria_servicio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comisiones_id_empleado_fkey"
            columns: ["id_empleado"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comisiones_id_empleado_fkey"
            columns: ["id_empleado"]
            isOneToOne: false
            referencedRelation: "vw_productividad_empleado"
            referencedColumns: ["id_empleado"]
          },
          {
            foreignKeyName: "comisiones_id_empleado_secundario_fkey"
            columns: ["id_empleado_secundario"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comisiones_id_empleado_secundario_fkey"
            columns: ["id_empleado_secundario"]
            isOneToOne: false
            referencedRelation: "vw_productividad_empleado"
            referencedColumns: ["id_empleado"]
          },
          {
            foreignKeyName: "comisiones_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comisiones_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "vw_pasivo_diferidos_sucursal"
            referencedColumns: ["id_sucursal"]
          },
          {
            foreignKeyName: "comisiones_id_venta_fkey"
            columns: ["id_venta"]
            isOneToOne: false
            referencedRelation: "ventas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comisiones_id_venta_fkey"
            columns: ["id_venta"]
            isOneToOne: false
            referencedRelation: "vw_ventas_desglose"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comisiones_id_venta_fkey"
            columns: ["id_venta"]
            isOneToOne: false
            referencedRelation: "vw_ventas_detalle_descuentos"
            referencedColumns: ["id_venta"]
          },
          {
            foreignKeyName: "comisiones_id_venta_item_fkey"
            columns: ["id_venta_item"]
            isOneToOne: false
            referencedRelation: "venta_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comisiones_id_venta_item_fkey"
            columns: ["id_venta_item"]
            isOneToOne: false
            referencedRelation: "vw_ventas_detalle_descuentos"
            referencedColumns: ["id_item"]
          },
        ]
      }
      configuracion_logs: {
        Row: {
          campo_modificado: string
          id: string
          modificado_en: string
          modificado_por: string
          notas: string | null
          valor_anterior: string | null
          valor_nuevo: string | null
        }
        Insert: {
          campo_modificado: string
          id?: string
          modificado_en?: string
          modificado_por: string
          notas?: string | null
          valor_anterior?: string | null
          valor_nuevo?: string | null
        }
        Update: {
          campo_modificado?: string
          id?: string
          modificado_en?: string
          modificado_por?: string
          notas?: string | null
          valor_anterior?: string | null
          valor_nuevo?: string | null
        }
        Relationships: []
      }
      daysheet_citas: {
        Row: {
          cliente: string
          created_at: string | null
          equipo: string | null
          estado: string
          fecha: string
          horario: string
          id: number
          notas_alertas: string | null
          precio_mxn: number | null
          profesional: string | null
          recurso: string | null
          servicio: string | null
          simbolo: string | null
          sucursal: string
          telefono: string | null
          updated_at: string | null
        }
        Insert: {
          cliente: string
          created_at?: string | null
          equipo?: string | null
          estado: string
          fecha: string
          horario: string
          id?: number
          notas_alertas?: string | null
          precio_mxn?: number | null
          profesional?: string | null
          recurso?: string | null
          servicio?: string | null
          simbolo?: string | null
          sucursal: string
          telefono?: string | null
          updated_at?: string | null
        }
        Update: {
          cliente?: string
          created_at?: string | null
          equipo?: string | null
          estado?: string
          fecha?: string
          horario?: string
          id?: number
          notas_alertas?: string | null
          precio_mxn?: number | null
          profesional?: string | null
          recurso?: string | null
          servicio?: string | null
          simbolo?: string | null
          sucursal?: string
          telefono?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      empleados: {
        Row: {
          activo: boolean | null
          apellidos: string | null
          cargo: string | null
          created_at: string | null
          email: string | null
          es_profesional: boolean | null
          especialidad: string | null
          fecha_contratacion: string | null
          fecha_termino: string | null
          horas_semana: number | null
          id: number
          id_sucursal: number | null
          nombre: string
          rut_o_rfc: string | null
          salario_hora: number | null
          telefono: string | null
          tipo_jornada: string | null
          updated_at: string | null
          vacaciones_disponibles: number | null
          vigencia_salario: string | null
        }
        Insert: {
          activo?: boolean | null
          apellidos?: string | null
          cargo?: string | null
          created_at?: string | null
          email?: string | null
          es_profesional?: boolean | null
          especialidad?: string | null
          fecha_contratacion?: string | null
          fecha_termino?: string | null
          horas_semana?: number | null
          id?: number
          id_sucursal?: number | null
          nombre: string
          rut_o_rfc?: string | null
          salario_hora?: number | null
          telefono?: string | null
          tipo_jornada?: string | null
          updated_at?: string | null
          vacaciones_disponibles?: number | null
          vigencia_salario?: string | null
        }
        Update: {
          activo?: boolean | null
          apellidos?: string | null
          cargo?: string | null
          created_at?: string | null
          email?: string | null
          es_profesional?: boolean | null
          especialidad?: string | null
          fecha_contratacion?: string | null
          fecha_termino?: string | null
          horas_semana?: number | null
          id?: number
          id_sucursal?: number | null
          nombre?: string
          rut_o_rfc?: string | null
          salario_hora?: number | null
          telefono?: string | null
          tipo_jornada?: string | null
          updated_at?: string | null
          vacaciones_disponibles?: number | null
          vigencia_salario?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empleados_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleados_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "vw_pasivo_diferidos_sucursal"
            referencedColumns: ["id_sucursal"]
          },
        ]
      }
      encuestas_satisfaccion: {
        Row: {
          calificacion_instalaciones: number | null
          calificacion_servicio: number | null
          comentarios: string | null
          created_at: string | null
          fecha_encuesta: string
          id: number
          id_cita: number | null
          id_cliente: number
          id_sucursal: number
          nps_score: number | null
        }
        Insert: {
          calificacion_instalaciones?: number | null
          calificacion_servicio?: number | null
          comentarios?: string | null
          created_at?: string | null
          fecha_encuesta?: string
          id?: number
          id_cita?: number | null
          id_cliente: number
          id_sucursal: number
          nps_score?: number | null
        }
        Update: {
          calificacion_instalaciones?: number | null
          calificacion_servicio?: number | null
          comentarios?: string | null
          created_at?: string | null
          fecha_encuesta?: string
          id?: number
          id_cita?: number | null
          id_cliente?: number
          id_sucursal?: number
          nps_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "encuestas_satisfaccion_id_cita_fkey"
            columns: ["id_cita"]
            isOneToOne: false
            referencedRelation: "agendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encuestas_satisfaccion_id_cita_fkey"
            columns: ["id_cita"]
            isOneToOne: false
            referencedRelation: "vw_tiempos_ciclo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encuestas_satisfaccion_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encuestas_satisfaccion_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_clientes_ausentes"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "encuestas_satisfaccion_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_clientes_no_retenidos"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "encuestas_satisfaccion_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_clientes_recompra"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "encuestas_satisfaccion_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_clientes_saldos"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "encuestas_satisfaccion_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_no_show_rate"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "encuestas_satisfaccion_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encuestas_satisfaccion_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "vw_pasivo_diferidos_sucursal"
            referencedColumns: ["id_sucursal"]
          },
        ]
      }
      facturacion_detalle: {
        Row: {
          cantidad: number
          cantidad_extra: number | null
          cliente: string
          created_at: string | null
          descripcion: string | null
          fecha: string
          id: number
          id_factura: string
          impuesto_extra_mxn: number | null
          impuesto_mxn: number | null
          monto_mxn: number
          monto_total_mxn: number
          precio_unitario_mxn: number
          profesional: string | null
          responsabilidad_paquete_mxn: number | null
          responsabilidad_paquete_total_mxn: number | null
          sucursal: string
          tipo: string
          updated_at: string | null
        }
        Insert: {
          cantidad?: number
          cantidad_extra?: number | null
          cliente: string
          created_at?: string | null
          descripcion?: string | null
          fecha: string
          id?: number
          id_factura: string
          impuesto_extra_mxn?: number | null
          impuesto_mxn?: number | null
          monto_mxn?: number
          monto_total_mxn?: number
          precio_unitario_mxn?: number
          profesional?: string | null
          responsabilidad_paquete_mxn?: number | null
          responsabilidad_paquete_total_mxn?: number | null
          sucursal: string
          tipo: string
          updated_at?: string | null
        }
        Update: {
          cantidad?: number
          cantidad_extra?: number | null
          cliente?: string
          created_at?: string | null
          descripcion?: string | null
          fecha?: string
          id?: number
          id_factura?: string
          impuesto_extra_mxn?: number | null
          impuesto_mxn?: number | null
          monto_mxn?: number
          monto_total_mxn?: number
          precio_unitario_mxn?: number
          profesional?: string | null
          responsabilidad_paquete_mxn?: number | null
          responsabilidad_paquete_total_mxn?: number | null
          sucursal?: string
          tipo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      gasto_clientes_periodo: {
        Row: {
          cantidad_citas: number | null
          cantidad_citas_periodo: number | null
          cantidad_grupos_citas: number | null
          cargo_adicional_mxn: number | null
          cliente: string
          created_at: string | null
          descuento_periodo_mxn: number | null
          email: string | null
          id: number
          monto_descuentos_mxn: number | null
          monto_facturado_final_mxn: number | null
          monto_facturado_total_mxn: number | null
          monto_productos_facturados_mxn: number | null
          monto_servicios_facturados_mxn: number | null
          monto_servicios_facturados_periodo_mxn: number | null
          numero_sms: string | null
          telefono: string | null
          updated_at: string | null
          valor_citas_mxn: number | null
          valor_citas_periodo_mxn: number | null
          visitas_registradas: number | null
        }
        Insert: {
          cantidad_citas?: number | null
          cantidad_citas_periodo?: number | null
          cantidad_grupos_citas?: number | null
          cargo_adicional_mxn?: number | null
          cliente: string
          created_at?: string | null
          descuento_periodo_mxn?: number | null
          email?: string | null
          id?: number
          monto_descuentos_mxn?: number | null
          monto_facturado_final_mxn?: number | null
          monto_facturado_total_mxn?: number | null
          monto_productos_facturados_mxn?: number | null
          monto_servicios_facturados_mxn?: number | null
          monto_servicios_facturados_periodo_mxn?: number | null
          numero_sms?: string | null
          telefono?: string | null
          updated_at?: string | null
          valor_citas_mxn?: number | null
          valor_citas_periodo_mxn?: number | null
          visitas_registradas?: number | null
        }
        Update: {
          cantidad_citas?: number | null
          cantidad_citas_periodo?: number | null
          cantidad_grupos_citas?: number | null
          cargo_adicional_mxn?: number | null
          cliente?: string
          created_at?: string | null
          descuento_periodo_mxn?: number | null
          email?: string | null
          id?: number
          monto_descuentos_mxn?: number | null
          monto_facturado_final_mxn?: number | null
          monto_facturado_total_mxn?: number | null
          monto_productos_facturados_mxn?: number | null
          monto_servicios_facturados_mxn?: number | null
          monto_servicios_facturados_periodo_mxn?: number | null
          numero_sms?: string | null
          telefono?: string | null
          updated_at?: string | null
          valor_citas_mxn?: number | null
          valor_citas_periodo_mxn?: number | null
          visitas_registradas?: number | null
        }
        Relationships: []
      }
      gastos_sucursal: {
        Row: {
          categoria: string
          created_at: string | null
          descripcion: string | null
          fecha: string
          id: number
          id_empleado_registro: number | null
          id_sucursal: number
          monto: number
          referencia: string | null
          updated_at: string | null
        }
        Insert: {
          categoria: string
          created_at?: string | null
          descripcion?: string | null
          fecha: string
          id?: number
          id_empleado_registro?: number | null
          id_sucursal: number
          monto: number
          referencia?: string | null
          updated_at?: string | null
        }
        Update: {
          categoria?: string
          created_at?: string | null
          descripcion?: string | null
          fecha?: string
          id?: number
          id_empleado_registro?: number | null
          id_sucursal?: number
          monto?: number
          referencia?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gastos_sucursal_id_empleado_registro_fkey"
            columns: ["id_empleado_registro"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_sucursal_id_empleado_registro_fkey"
            columns: ["id_empleado_registro"]
            isOneToOne: false
            referencedRelation: "vw_productividad_empleado"
            referencedColumns: ["id_empleado"]
          },
          {
            foreignKeyName: "gastos_sucursal_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_sucursal_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "vw_pasivo_diferidos_sucursal"
            referencedColumns: ["id_sucursal"]
          },
        ]
      }
      jornada_laboral: {
        Row: {
          activo: boolean | null
          created_at: string | null
          dia_semana: number
          hora_fin: string
          hora_inicio: string
          id: number
          id_empleado: number
          id_sucursal: number | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          dia_semana: number
          hora_fin: string
          hora_inicio: string
          id?: number
          id_empleado: number
          id_sucursal?: number | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          dia_semana?: number
          hora_fin?: string
          hora_inicio?: string
          id?: number
          id_empleado?: number
          id_sucursal?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jornada_laboral_id_empleado_fkey"
            columns: ["id_empleado"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jornada_laboral_id_empleado_fkey"
            columns: ["id_empleado"]
            isOneToOne: false
            referencedRelation: "vw_productividad_empleado"
            referencedColumns: ["id_empleado"]
          },
          {
            foreignKeyName: "jornada_laboral_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jornada_laboral_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "vw_pasivo_diferidos_sucursal"
            referencedColumns: ["id_sucursal"]
          },
        ]
      }
      lead_tags: {
        Row: {
          created_at: string
          id: number
          lead_id: number
          tag_id: number
        }
        Insert: {
          created_at?: string
          id?: number
          lead_id: number
          tag_id: number
        }
        Update: {
          created_at?: string
          id?: number
          lead_id?: number
          tag_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "lead_tags_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          canal_origen: string | null
          cita_id: number | null
          created_at: string
          email: string | null
          id: number
          nombre: string
          pipeline_stage: string | null
          telefono: string | null
          updated_at: string
        }
        Insert: {
          canal_origen?: string | null
          cita_id?: number | null
          created_at?: string
          email?: string | null
          id?: number
          nombre: string
          pipeline_stage?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          canal_origen?: string | null
          cita_id?: number | null
          created_at?: string
          email?: string | null
          id?: number
          nombre?: string
          pipeline_stage?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_cita_id_fkey"
            columns: ["cita_id"]
            isOneToOne: false
            referencedRelation: "agendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_cita_id_fkey"
            columns: ["cita_id"]
            isOneToOne: false
            referencedRelation: "vw_tiempos_ciclo"
            referencedColumns: ["id"]
          },
        ]
      }
      libro_diferidos: {
        Row: {
          created_at: string | null
          fecha: string
          id: number
          id_cliente: number
          id_referencia: number | null
          id_sucursal: number
          monto_mxn: number
          nota: string | null
          tipo: Database["public"]["Enums"]["tipo_movimiento_diferido_enum"]
        }
        Insert: {
          created_at?: string | null
          fecha?: string
          id?: number
          id_cliente: number
          id_referencia?: number | null
          id_sucursal: number
          monto_mxn: number
          nota?: string | null
          tipo: Database["public"]["Enums"]["tipo_movimiento_diferido_enum"]
        }
        Update: {
          created_at?: string | null
          fecha?: string
          id?: number
          id_cliente?: number
          id_referencia?: number | null
          id_sucursal?: number
          monto_mxn?: number
          nota?: string | null
          tipo?: Database["public"]["Enums"]["tipo_movimiento_diferido_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "libro_diferidos_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "libro_diferidos_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_clientes_ausentes"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "libro_diferidos_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_clientes_no_retenidos"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "libro_diferidos_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_clientes_recompra"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "libro_diferidos_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_clientes_saldos"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "libro_diferidos_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_no_show_rate"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "libro_diferidos_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "libro_diferidos_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "vw_pasivo_diferidos_sucursal"
            referencedColumns: ["id_sucursal"]
          },
        ]
      }
      libro_ingresos: {
        Row: {
          created_at: string | null
          fecha: string
          id: number
          id_cita: number | null
          id_cliente: number
          id_sucursal: number
          id_venta: number | null
          monto_mxn: number
          nota: string | null
        }
        Insert: {
          created_at?: string | null
          fecha?: string
          id?: number
          id_cita?: number | null
          id_cliente: number
          id_sucursal: number
          id_venta?: number | null
          monto_mxn: number
          nota?: string | null
        }
        Update: {
          created_at?: string | null
          fecha?: string
          id?: number
          id_cita?: number | null
          id_cliente?: number
          id_sucursal?: number
          id_venta?: number | null
          monto_mxn?: number
          nota?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "libro_ingresos_id_cita_fkey"
            columns: ["id_cita"]
            isOneToOne: false
            referencedRelation: "agendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "libro_ingresos_id_cita_fkey"
            columns: ["id_cita"]
            isOneToOne: false
            referencedRelation: "vw_tiempos_ciclo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "libro_ingresos_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "libro_ingresos_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_clientes_ausentes"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "libro_ingresos_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_clientes_no_retenidos"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "libro_ingresos_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_clientes_recompra"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "libro_ingresos_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_clientes_saldos"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "libro_ingresos_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_no_show_rate"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "libro_ingresos_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "libro_ingresos_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "vw_pasivo_diferidos_sucursal"
            referencedColumns: ["id_sucursal"]
          },
          {
            foreignKeyName: "libro_ingresos_id_venta_fkey"
            columns: ["id_venta"]
            isOneToOne: false
            referencedRelation: "ventas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "libro_ingresos_id_venta_fkey"
            columns: ["id_venta"]
            isOneToOne: false
            referencedRelation: "vw_ventas_desglose"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "libro_ingresos_id_venta_fkey"
            columns: ["id_venta"]
            isOneToOne: false
            referencedRelation: "vw_ventas_detalle_descuentos"
            referencedColumns: ["id_venta"]
          },
        ]
      }
      liquidacion_detalle: {
        Row: {
          comision_item_mxn: number
          created_at: string | null
          fecha_servicio: string
          id: number
          id_cita: number | null
          id_liquidacion: number
          id_servicio: number | null
          id_venta_item: number | null
          monto_venta_mxn: number
          porcentaje_comision: number
        }
        Insert: {
          comision_item_mxn: number
          created_at?: string | null
          fecha_servicio: string
          id?: number
          id_cita?: number | null
          id_liquidacion: number
          id_servicio?: number | null
          id_venta_item?: number | null
          monto_venta_mxn: number
          porcentaje_comision: number
        }
        Update: {
          comision_item_mxn?: number
          created_at?: string | null
          fecha_servicio?: string
          id?: number
          id_cita?: number | null
          id_liquidacion?: number
          id_servicio?: number | null
          id_venta_item?: number | null
          monto_venta_mxn?: number
          porcentaje_comision?: number
        }
        Relationships: [
          {
            foreignKeyName: "liquidacion_detalle_id_cita_fkey"
            columns: ["id_cita"]
            isOneToOne: false
            referencedRelation: "agendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liquidacion_detalle_id_cita_fkey"
            columns: ["id_cita"]
            isOneToOne: false
            referencedRelation: "vw_tiempos_ciclo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liquidacion_detalle_id_liquidacion_fkey"
            columns: ["id_liquidacion"]
            isOneToOne: false
            referencedRelation: "liquidacion_semanal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liquidacion_detalle_id_servicio_fkey"
            columns: ["id_servicio"]
            isOneToOne: false
            referencedRelation: "servicios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liquidacion_detalle_id_venta_item_fkey"
            columns: ["id_venta_item"]
            isOneToOne: false
            referencedRelation: "venta_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liquidacion_detalle_id_venta_item_fkey"
            columns: ["id_venta_item"]
            isOneToOne: false
            referencedRelation: "vw_ventas_detalle_descuentos"
            referencedColumns: ["id_item"]
          },
        ]
      }
      liquidacion_semanal: {
        Row: {
          ajustes_mxn: number | null
          aprobada_por: string | null
          comision_mxn: number | null
          created_at: string | null
          estado: string | null
          fecha_pago: string | null
          horas_trabajadas: number | null
          id: number
          id_empleado: number
          ingresos_reconocidos_mxn: number | null
          motivo_ajuste: string | null
          pagada_por: string | null
          salario_base_mxn: number | null
          semana_fin: string
          semana_inicio: string
          total_a_pagar_mxn: number | null
          updated_at: string | null
        }
        Insert: {
          ajustes_mxn?: number | null
          aprobada_por?: string | null
          comision_mxn?: number | null
          created_at?: string | null
          estado?: string | null
          fecha_pago?: string | null
          horas_trabajadas?: number | null
          id?: number
          id_empleado: number
          ingresos_reconocidos_mxn?: number | null
          motivo_ajuste?: string | null
          pagada_por?: string | null
          salario_base_mxn?: number | null
          semana_fin: string
          semana_inicio: string
          total_a_pagar_mxn?: number | null
          updated_at?: string | null
        }
        Update: {
          ajustes_mxn?: number | null
          aprobada_por?: string | null
          comision_mxn?: number | null
          created_at?: string | null
          estado?: string | null
          fecha_pago?: string | null
          horas_trabajadas?: number | null
          id?: number
          id_empleado?: number
          ingresos_reconocidos_mxn?: number | null
          motivo_ajuste?: string | null
          pagada_por?: string | null
          salario_base_mxn?: number | null
          semana_fin?: string
          semana_inicio?: string
          total_a_pagar_mxn?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "liquidacion_semanal_id_empleado_fkey"
            columns: ["id_empleado"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liquidacion_semanal_id_empleado_fkey"
            columns: ["id_empleado"]
            isOneToOne: false
            referencedRelation: "vw_productividad_empleado"
            referencedColumns: ["id_empleado"]
          },
        ]
      }
      lotes_producto: {
        Row: {
          costo_unitario_mxn: number
          fecha_caducidad: string
          fecha_registro_lote: string
          id: number
          id_producto: number
          numero_lote: string
        }
        Insert: {
          costo_unitario_mxn: number
          fecha_caducidad: string
          fecha_registro_lote?: string
          id?: number
          id_producto: number
          numero_lote: string
        }
        Update: {
          costo_unitario_mxn?: number
          fecha_caducidad?: string
          fecha_registro_lote?: string
          id?: number
          id_producto?: number
          numero_lote?: string
        }
        Relationships: [
          {
            foreignKeyName: "lotes_producto_id_producto_fkey"
            columns: ["id_producto"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      mensajes_enviados: {
        Row: {
          abierto: boolean | null
          canal: string
          contenido: string | null
          created_at: string | null
          estado: string | null
          fecha_apertura: string | null
          fecha_envio: string
          fecha_respuesta: string | null
          id: number
          id_campania: number | null
          id_cliente: number
          respondido: boolean | null
        }
        Insert: {
          abierto?: boolean | null
          canal: string
          contenido?: string | null
          created_at?: string | null
          estado?: string | null
          fecha_apertura?: string | null
          fecha_envio?: string
          fecha_respuesta?: string | null
          id?: number
          id_campania?: number | null
          id_cliente: number
          respondido?: boolean | null
        }
        Update: {
          abierto?: boolean | null
          canal?: string
          contenido?: string | null
          created_at?: string | null
          estado?: string | null
          fecha_apertura?: string | null
          fecha_envio?: string
          fecha_respuesta?: string | null
          id?: number
          id_campania?: number | null
          id_cliente?: number
          respondido?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "mensajes_enviados_id_campania_fkey"
            columns: ["id_campania"]
            isOneToOne: false
            referencedRelation: "campanias_marketing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensajes_enviados_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensajes_enviados_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_clientes_ausentes"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "mensajes_enviados_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_clientes_no_retenidos"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "mensajes_enviados_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_clientes_recompra"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "mensajes_enviados_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_clientes_saldos"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "mensajes_enviados_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_no_show_rate"
            referencedColumns: ["id_cliente"]
          },
        ]
      }
      merge_duplicados_log: {
        Row: {
          criterios: string | null
          detalles_fusion: Json | null
          id: number
          id_cliente_final: number
          ids_clientes_fusionados: number[]
          timestamp_merge: string | null
          usuario_responsable: string | null
        }
        Insert: {
          criterios?: string | null
          detalles_fusion?: Json | null
          id?: never
          id_cliente_final: number
          ids_clientes_fusionados: number[]
          timestamp_merge?: string | null
          usuario_responsable?: string | null
        }
        Update: {
          criterios?: string | null
          detalles_fusion?: Json | null
          id?: never
          id_cliente_final?: number
          ids_clientes_fusionados?: number[]
          timestamp_merge?: string | null
          usuario_responsable?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merge_duplicados_log_id_cliente_final_fkey"
            columns: ["id_cliente_final"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merge_duplicados_log_id_cliente_final_fkey"
            columns: ["id_cliente_final"]
            isOneToOne: false
            referencedRelation: "vw_clientes_ausentes"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "merge_duplicados_log_id_cliente_final_fkey"
            columns: ["id_cliente_final"]
            isOneToOne: false
            referencedRelation: "vw_clientes_no_retenidos"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "merge_duplicados_log_id_cliente_final_fkey"
            columns: ["id_cliente_final"]
            isOneToOne: false
            referencedRelation: "vw_clientes_recompra"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "merge_duplicados_log_id_cliente_final_fkey"
            columns: ["id_cliente_final"]
            isOneToOne: false
            referencedRelation: "vw_clientes_saldos"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "merge_duplicados_log_id_cliente_final_fkey"
            columns: ["id_cliente_final"]
            isOneToOne: false
            referencedRelation: "vw_no_show_rate"
            referencedColumns: ["id_cliente"]
          },
        ]
      }
      metas_productividad: {
        Row: {
          activo: boolean | null
          created_at: string | null
          fecha_fin: string
          fecha_inicio: string
          id: number
          id_empleado: number | null
          id_sucursal: number | null
          periodo: string
          tipo_meta: string
          valor_objetivo: number
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          fecha_fin: string
          fecha_inicio: string
          id?: number
          id_empleado?: number | null
          id_sucursal?: number | null
          periodo: string
          tipo_meta: string
          valor_objetivo: number
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          fecha_fin?: string
          fecha_inicio?: string
          id?: number
          id_empleado?: number | null
          id_sucursal?: number | null
          periodo?: string
          tipo_meta?: string
          valor_objetivo?: number
        }
        Relationships: [
          {
            foreignKeyName: "metas_productividad_id_empleado_fkey"
            columns: ["id_empleado"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metas_productividad_id_empleado_fkey"
            columns: ["id_empleado"]
            isOneToOne: false
            referencedRelation: "vw_productividad_empleado"
            referencedColumns: ["id_empleado"]
          },
          {
            foreignKeyName: "metas_productividad_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metas_productividad_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "vw_pasivo_diferidos_sucursal"
            referencedColumns: ["id_sucursal"]
          },
        ]
      }
      movimientos_inventario: {
        Row: {
          cantidad: number
          costo_unitario_mxn: number
          creado_por: string | null
          created_at: string
          id: number
          id_destino: number | null
          id_lote: number
          id_origen: number | null
          id_producto: number
          nota: string | null
          timestamp_movimiento: string
          tipo_movimiento: Database["public"]["Enums"]["tipo_movimiento_inventario_enum"]
        }
        Insert: {
          cantidad: number
          costo_unitario_mxn: number
          creado_por?: string | null
          created_at?: string
          id?: number
          id_destino?: number | null
          id_lote: number
          id_origen?: number | null
          id_producto: number
          nota?: string | null
          timestamp_movimiento?: string
          tipo_movimiento: Database["public"]["Enums"]["tipo_movimiento_inventario_enum"]
        }
        Update: {
          cantidad?: number
          costo_unitario_mxn?: number
          creado_por?: string | null
          created_at?: string
          id?: number
          id_destino?: number | null
          id_lote?: number
          id_origen?: number | null
          id_producto?: number
          nota?: string | null
          timestamp_movimiento?: string
          tipo_movimiento?: Database["public"]["Enums"]["tipo_movimiento_inventario_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_inventario_id_destino_fkey"
            columns: ["id_destino"]
            isOneToOne: false
            referencedRelation: "ubicaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_inventario_id_lote_fkey"
            columns: ["id_lote"]
            isOneToOne: false
            referencedRelation: "lotes_producto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_inventario_id_origen_fkey"
            columns: ["id_origen"]
            isOneToOne: false
            referencedRelation: "ubicaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_inventario_id_producto_fkey"
            columns: ["id_producto"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      notas_citas: {
        Row: {
          actualizado_en: string
          creado_en: string
          creado_por: string
          id: string
          id_cita: number
          nota: string
        }
        Insert: {
          actualizado_en?: string
          creado_en?: string
          creado_por: string
          id?: string
          id_cita: number
          nota: string
        }
        Update: {
          actualizado_en?: string
          creado_en?: string
          creado_por?: string
          id?: string
          id_cita?: number
          nota?: string
        }
        Relationships: [
          {
            foreignKeyName: "notas_citas_id_cita_fkey"
            columns: ["id_cita"]
            isOneToOne: false
            referencedRelation: "agendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_citas_id_cita_fkey"
            columns: ["id_cita"]
            isOneToOne: false
            referencedRelation: "vw_tiempos_ciclo"
            referencedColumns: ["id"]
          },
        ]
      }
      notas_clientes: {
        Row: {
          actualizado_en: string
          creado_en: string
          creado_por: string
          id: string
          id_cliente: number
          nota: string
        }
        Insert: {
          actualizado_en?: string
          creado_en?: string
          creado_por: string
          id?: string
          id_cliente: number
          nota: string
        }
        Update: {
          actualizado_en?: string
          creado_en?: string
          creado_por?: string
          id?: string
          id_cliente?: number
          nota?: string
        }
        Relationships: [
          {
            foreignKeyName: "notas_clientes_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_clientes_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_clientes_ausentes"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "notas_clientes_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_clientes_no_retenidos"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "notas_clientes_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_clientes_recompra"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "notas_clientes_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_clientes_saldos"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "notas_clientes_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_no_show_rate"
            referencedColumns: ["id_cliente"]
          },
        ]
      }
      pagos: {
        Row: {
          aplicado_a_venta: boolean | null
          created_at: string | null
          es_ingreso_diferido: boolean | null
          fecha_aplicacion: string | null
          fecha_pago: string
          id: number
          id_cliente: number
          id_sucursal: number
          id_venta: number | null
          metodo_pago: string | null
          monto: number
          notas: string | null
          referencia: string | null
          tipo_pago: Database["public"]["Enums"]["tipo_pago_enum"]
          updated_at: string | null
        }
        Insert: {
          aplicado_a_venta?: boolean | null
          created_at?: string | null
          es_ingreso_diferido?: boolean | null
          fecha_aplicacion?: string | null
          fecha_pago?: string
          id?: number
          id_cliente: number
          id_sucursal: number
          id_venta?: number | null
          metodo_pago?: string | null
          monto: number
          notas?: string | null
          referencia?: string | null
          tipo_pago?: Database["public"]["Enums"]["tipo_pago_enum"]
          updated_at?: string | null
        }
        Update: {
          aplicado_a_venta?: boolean | null
          created_at?: string | null
          es_ingreso_diferido?: boolean | null
          fecha_aplicacion?: string | null
          fecha_pago?: string
          id?: number
          id_cliente?: number
          id_sucursal?: number
          id_venta?: number | null
          metodo_pago?: string | null
          monto?: number
          notas?: string | null
          referencia?: string | null
          tipo_pago?: Database["public"]["Enums"]["tipo_pago_enum"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pagos_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_clientes_ausentes"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "pagos_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_clientes_no_retenidos"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "pagos_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_clientes_recompra"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "pagos_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_clientes_saldos"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "pagos_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_no_show_rate"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "pagos_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "vw_pasivo_diferidos_sucursal"
            referencedColumns: ["id_sucursal"]
          },
          {
            foreignKeyName: "pagos_id_venta_fkey"
            columns: ["id_venta"]
            isOneToOne: false
            referencedRelation: "ventas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_id_venta_fkey"
            columns: ["id_venta"]
            isOneToOne: false
            referencedRelation: "vw_ventas_desglose"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_id_venta_fkey"
            columns: ["id_venta"]
            isOneToOne: false
            referencedRelation: "vw_ventas_detalle_descuentos"
            referencedColumns: ["id_venta"]
          },
        ]
      }
      parametros_comision: {
        Row: {
          activo: boolean | null
          actualizado_por: string | null
          creado_por: string | null
          created_at: string | null
          fecha_fin: string | null
          fecha_inicio: string
          id: number
          id_categoria_servicio: number | null
          id_empleado: number | null
          id_servicio: number | null
          porcentaje: number
          prioridad: number
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          actualizado_por?: string | null
          creado_por?: string | null
          created_at?: string | null
          fecha_fin?: string | null
          fecha_inicio: string
          id?: number
          id_categoria_servicio?: number | null
          id_empleado?: number | null
          id_servicio?: number | null
          porcentaje: number
          prioridad?: number
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          actualizado_por?: string | null
          creado_por?: string | null
          created_at?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string
          id?: number
          id_categoria_servicio?: number | null
          id_empleado?: number | null
          id_servicio?: number | null
          porcentaje?: number
          prioridad?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parametros_comision_id_categoria_servicio_fkey"
            columns: ["id_categoria_servicio"]
            isOneToOne: false
            referencedRelation: "categoria_servicio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parametros_comision_id_empleado_fkey"
            columns: ["id_empleado"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parametros_comision_id_empleado_fkey"
            columns: ["id_empleado"]
            isOneToOne: false
            referencedRelation: "vw_productividad_empleado"
            referencedColumns: ["id_empleado"]
          },
          {
            foreignKeyName: "parametros_comision_id_servicio_fkey"
            columns: ["id_servicio"]
            isOneToOne: false
            referencedRelation: "servicios"
            referencedColumns: ["id"]
          },
        ]
      }
      parametros_sistema: {
        Row: {
          activo: boolean
          created_at: string | null
          formato_monetario: string
          id: number
          iva_incluido: boolean
          moneda: string
          pais: string
          periodo_comision_fin: string
          periodo_comision_inicio: string
          semana_laboral: string
          tasa_iva: number
          updated_at: string | null
        }
        Insert: {
          activo?: boolean
          created_at?: string | null
          formato_monetario?: string
          id?: number
          iva_incluido?: boolean
          moneda?: string
          pais?: string
          periodo_comision_fin?: string
          periodo_comision_inicio?: string
          semana_laboral?: string
          tasa_iva?: number
          updated_at?: string | null
        }
        Update: {
          activo?: boolean
          created_at?: string | null
          formato_monetario?: string
          id?: number
          iva_incluido?: boolean
          moneda?: string
          pais?: string
          periodo_comision_fin?: string
          periodo_comision_inicio?: string
          semana_laboral?: string
          tasa_iva?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      permisos: {
        Row: {
          aprobado_por: number | null
          created_at: string | null
          estado: Database["public"]["Enums"]["estado_permiso_enum"]
          fecha_fin: string
          fecha_inicio: string
          id: number
          id_empleado: number
          id_sucursal: number
          motivo: string | null
          notas_aprobacion: string | null
          tipo: string
          updated_at: string | null
        }
        Insert: {
          aprobado_por?: number | null
          created_at?: string | null
          estado?: Database["public"]["Enums"]["estado_permiso_enum"]
          fecha_fin: string
          fecha_inicio: string
          id?: number
          id_empleado: number
          id_sucursal: number
          motivo?: string | null
          notas_aprobacion?: string | null
          tipo: string
          updated_at?: string | null
        }
        Update: {
          aprobado_por?: number | null
          created_at?: string | null
          estado?: Database["public"]["Enums"]["estado_permiso_enum"]
          fecha_fin?: string
          fecha_inicio?: string
          id?: number
          id_empleado?: number
          id_sucursal?: number
          motivo?: string | null
          notas_aprobacion?: string | null
          tipo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "permisos_aprobado_por_fkey"
            columns: ["aprobado_por"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permisos_aprobado_por_fkey"
            columns: ["aprobado_por"]
            isOneToOne: false
            referencedRelation: "vw_productividad_empleado"
            referencedColumns: ["id_empleado"]
          },
          {
            foreignKeyName: "permisos_id_empleado_fkey"
            columns: ["id_empleado"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permisos_id_empleado_fkey"
            columns: ["id_empleado"]
            isOneToOne: false
            referencedRelation: "vw_productividad_empleado"
            referencedColumns: ["id_empleado"]
          },
          {
            foreignKeyName: "permisos_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permisos_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "vw_pasivo_diferidos_sucursal"
            referencedColumns: ["id_sucursal"]
          },
        ]
      }
      productos: {
        Row: {
          categoria: Database["public"]["Enums"]["categoria_producto_enum"]
          created_at: string
          descripcion: string | null
          esta_activo: boolean
          id: number
          nombre: string
          precio_venta_mxn: number | null
          proveedor: string | null
          sku: string | null
          unidad_medida: string
          updated_at: string
        }
        Insert: {
          categoria: Database["public"]["Enums"]["categoria_producto_enum"]
          created_at?: string
          descripcion?: string | null
          esta_activo?: boolean
          id?: number
          nombre: string
          precio_venta_mxn?: number | null
          proveedor?: string | null
          sku?: string | null
          unidad_medida?: string
          updated_at?: string
        }
        Update: {
          categoria?: Database["public"]["Enums"]["categoria_producto_enum"]
          created_at?: string
          descripcion?: string | null
          esta_activo?: boolean
          id?: number
          nombre?: string
          precio_venta_mxn?: number | null
          proveedor?: string | null
          sku?: string | null
          unidad_medida?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activo: boolean
          created_at: string | null
          email: string | null
          id: string
          id_empleado: number | null
          id_sucursal: number | null
          nombre_completo: string | null
          rol: string | null
          telefono: string | null
          ultimo_login: string | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean
          created_at?: string | null
          email?: string | null
          id: string
          id_empleado?: number | null
          id_sucursal?: number | null
          nombre_completo?: string | null
          rol?: string | null
          telefono?: string | null
          ultimo_login?: string | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean
          created_at?: string | null
          email?: string | null
          id?: string
          id_empleado?: number | null
          id_sucursal?: number | null
          nombre_completo?: string | null
          rol?: string | null
          telefono?: string | null
          ultimo_login?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_empleado_fkey"
            columns: ["id_empleado"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_id_empleado_fkey"
            columns: ["id_empleado"]
            isOneToOne: false
            referencedRelation: "vw_productividad_empleado"
            referencedColumns: ["id_empleado"]
          },
          {
            foreignKeyName: "profiles_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "vw_pasivo_diferidos_sucursal"
            referencedColumns: ["id_sucursal"]
          },
        ]
      }
      proyeccion_valor_futuro: {
        Row: {
          cantidad_clientes: number | null
          cantidad_servicios: number | null
          citas_agendadas: number | null
          clientes_online: number | null
          clientes_totales: number | null
          created_at: string | null
          id: number
          nuevos_clientes: number | null
          porcentaje_clientes: number | null
          profesional: string
          reservas_online: number | null
          reservas_online2: number | null
          servicios_agendados: number | null
          tipo: string
          updated_at: string | null
          valor_futuro_mxn: number | null
          valor_total_agendado_mxn: number | null
        }
        Insert: {
          cantidad_clientes?: number | null
          cantidad_servicios?: number | null
          citas_agendadas?: number | null
          clientes_online?: number | null
          clientes_totales?: number | null
          created_at?: string | null
          id?: number
          nuevos_clientes?: number | null
          porcentaje_clientes?: number | null
          profesional: string
          reservas_online?: number | null
          reservas_online2?: number | null
          servicios_agendados?: number | null
          tipo?: string
          updated_at?: string | null
          valor_futuro_mxn?: number | null
          valor_total_agendado_mxn?: number | null
        }
        Update: {
          cantidad_clientes?: number | null
          cantidad_servicios?: number | null
          citas_agendadas?: number | null
          clientes_online?: number | null
          clientes_totales?: number | null
          created_at?: string | null
          id?: number
          nuevos_clientes?: number | null
          porcentaje_clientes?: number | null
          profesional?: string
          reservas_online?: number | null
          reservas_online2?: number | null
          servicios_agendados?: number | null
          tipo?: string
          updated_at?: string | null
          valor_futuro_mxn?: number | null
          valor_total_agendado_mxn?: number | null
        }
        Relationships: []
      }
      resumen_productividad_personal: {
        Row: {
          canceladas: number | null
          completadas: number | null
          created_at: string | null
          facturado_mxn: number | null
          id: number
          no_show: number | null
          profesional: string
          servicio: string
          updated_at: string | null
        }
        Insert: {
          canceladas?: number | null
          completadas?: number | null
          created_at?: string | null
          facturado_mxn?: number | null
          id?: number
          no_show?: number | null
          profesional: string
          servicio: string
          updated_at?: string | null
        }
        Update: {
          canceladas?: number | null
          completadas?: number | null
          created_at?: string | null
          facturado_mxn?: number | null
          id?: number
          no_show?: number | null
          profesional?: string
          servicio?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      rol_definiciones: {
        Row: {
          activo: boolean
          created_at: string
          descripcion_rol: string
          permisos_json: Json
          rol_sistema: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          descripcion_rol: string
          permisos_json?: Json
          rol_sistema: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          descripcion_rol?: string
          permisos_json?: Json
          rol_sistema?: string
          updated_at?: string
        }
        Relationships: []
      }
      saldos_clientes: {
        Row: {
          id: number
          id_cliente: number
          saldo_a_favor_mxn: number | null
          saldo_en_contra_mxn: number | null
          ultima_actualizacion: string | null
        }
        Insert: {
          id?: never
          id_cliente: number
          saldo_a_favor_mxn?: number | null
          saldo_en_contra_mxn?: number | null
          ultima_actualizacion?: string | null
        }
        Update: {
          id?: never
          id_cliente?: number
          saldo_a_favor_mxn?: number | null
          saldo_en_contra_mxn?: number | null
          ultima_actualizacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saldos_clientes_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: true
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saldos_clientes_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: true
            referencedRelation: "vw_clientes_ausentes"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "saldos_clientes_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: true
            referencedRelation: "vw_clientes_no_retenidos"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "saldos_clientes_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: true
            referencedRelation: "vw_clientes_recompra"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "saldos_clientes_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: true
            referencedRelation: "vw_clientes_saldos"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "saldos_clientes_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: true
            referencedRelation: "vw_no_show_rate"
            referencedColumns: ["id_cliente"]
          },
        ]
      }
      servicios: {
        Row: {
          activo: boolean | null
          created_at: string | null
          descripcion: string | null
          duracion_minutos: number | null
          id: number
          id_categoria: number | null
          nombre: string
          precio: number
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          descripcion?: string | null
          duracion_minutos?: number | null
          id?: number
          id_categoria?: number | null
          nombre: string
          precio: number
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          descripcion?: string | null
          duracion_minutos?: number | null
          id?: number
          id_categoria?: number | null
          nombre?: string
          precio?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "servicios_id_categoria_fkey"
            columns: ["id_categoria"]
            isOneToOne: false
            referencedRelation: "categoria_servicio"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_actual: {
        Row: {
          cantidad_actual: number
          id: number
          id_lote: number
          id_producto: number
          id_ubicacion: number
          stock_maximo_configurado: number
          stock_minimo_configurado: number
          ultima_actualizacion: string
        }
        Insert: {
          cantidad_actual?: number
          id?: number
          id_lote: number
          id_producto: number
          id_ubicacion: number
          stock_maximo_configurado?: number
          stock_minimo_configurado?: number
          ultima_actualizacion?: string
        }
        Update: {
          cantidad_actual?: number
          id?: number
          id_lote?: number
          id_producto?: number
          id_ubicacion?: number
          stock_maximo_configurado?: number
          stock_minimo_configurado?: number
          ultima_actualizacion?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_actual_id_lote_fkey"
            columns: ["id_lote"]
            isOneToOne: false
            referencedRelation: "lotes_producto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_actual_id_producto_fkey"
            columns: ["id_producto"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_actual_id_ubicacion_fkey"
            columns: ["id_ubicacion"]
            isOneToOne: false
            referencedRelation: "ubicaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      sucursales: {
        Row: {
          activo: boolean | null
          correo_contacto: string | null
          created_at: string | null
          direccion: string
          estado: string | null
          id: number
          municipio: string | null
          nombre: string
          telefono: string | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          correo_contacto?: string | null
          created_at?: string | null
          direccion: string
          estado?: string | null
          id?: number
          municipio?: string | null
          nombre: string
          telefono?: string | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          correo_contacto?: string | null
          created_at?: string | null
          direccion?: string
          estado?: string | null
          id?: number
          municipio?: string | null
          nombre?: string
          telefono?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string | null
          created_at: string
          descripcion: string | null
          id: number
          nombre: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          descripcion?: string | null
          id?: number
          nombre: string
        }
        Update: {
          color?: string | null
          created_at?: string
          descripcion?: string | null
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      tarjetas_regalo: {
        Row: {
          activa: boolean | null
          codigo_tarjeta: string
          comprador_contacto: string | null
          comprador_nombre: string
          created_at: string | null
          fecha_emision: string | null
          fecha_uso_total: string | null
          id: number
          id_cliente_beneficiario: number | null
          monto_disponible_mxn: number
          monto_original_mxn: number
          sucursal_emision: number | null
          updated_at: string | null
        }
        Insert: {
          activa?: boolean | null
          codigo_tarjeta: string
          comprador_contacto?: string | null
          comprador_nombre: string
          created_at?: string | null
          fecha_emision?: string | null
          fecha_uso_total?: string | null
          id?: never
          id_cliente_beneficiario?: number | null
          monto_disponible_mxn: number
          monto_original_mxn: number
          sucursal_emision?: number | null
          updated_at?: string | null
        }
        Update: {
          activa?: boolean | null
          codigo_tarjeta?: string
          comprador_contacto?: string | null
          comprador_nombre?: string
          created_at?: string | null
          fecha_emision?: string | null
          fecha_uso_total?: string | null
          id?: never
          id_cliente_beneficiario?: number | null
          monto_disponible_mxn?: number
          monto_original_mxn?: number
          sucursal_emision?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tarjetas_regalo_id_cliente_beneficiario_fkey"
            columns: ["id_cliente_beneficiario"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarjetas_regalo_id_cliente_beneficiario_fkey"
            columns: ["id_cliente_beneficiario"]
            isOneToOne: false
            referencedRelation: "vw_clientes_ausentes"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "tarjetas_regalo_id_cliente_beneficiario_fkey"
            columns: ["id_cliente_beneficiario"]
            isOneToOne: false
            referencedRelation: "vw_clientes_no_retenidos"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "tarjetas_regalo_id_cliente_beneficiario_fkey"
            columns: ["id_cliente_beneficiario"]
            isOneToOne: false
            referencedRelation: "vw_clientes_recompra"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "tarjetas_regalo_id_cliente_beneficiario_fkey"
            columns: ["id_cliente_beneficiario"]
            isOneToOne: false
            referencedRelation: "vw_clientes_saldos"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "tarjetas_regalo_id_cliente_beneficiario_fkey"
            columns: ["id_cliente_beneficiario"]
            isOneToOne: false
            referencedRelation: "vw_no_show_rate"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "tarjetas_regalo_sucursal_emision_fkey"
            columns: ["sucursal_emision"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarjetas_regalo_sucursal_emision_fkey"
            columns: ["sucursal_emision"]
            isOneToOne: false
            referencedRelation: "vw_pasivo_diferidos_sucursal"
            referencedColumns: ["id_sucursal"]
          },
        ]
      }
      ubicaciones: {
        Row: {
          created_at: string
          id: number
          id_sucursal: number | null
          nombre_ubicacion: string
          tipo_ubicacion: Database["public"]["Enums"]["tipo_ubicacion_enum"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          id_sucursal?: number | null
          nombre_ubicacion: string
          tipo_ubicacion: Database["public"]["Enums"]["tipo_ubicacion_enum"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          id_sucursal?: number | null
          nombre_ubicacion?: string
          tipo_ubicacion?: Database["public"]["Enums"]["tipo_ubicacion_enum"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ubicaciones_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ubicaciones_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "vw_pasivo_diferidos_sucursal"
            referencedColumns: ["id_sucursal"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          id_sucursal: number | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          id_sucursal?: number | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          id_sucursal?: number | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "vw_pasivo_diferidos_sucursal"
            referencedColumns: ["id_sucursal"]
          },
        ]
      }
      venta_items: {
        Row: {
          cantidad: number
          codigo_promocion: string | null
          created_at: string | null
          descuento_porcentaje: number | null
          descuento_tipo: Database["public"]["Enums"]["tipo_descuento_enum"]
          descuento_valor: number
          id: number
          id_empleado: number | null
          id_producto: number | null
          id_servicio: number | null
          id_venta: number
          notas_descuento: string | null
          precio_final_mxn: number | null
          precio_original_mxn: number | null
          precio_unitario: number
          subtotal: number
          updated_at: string | null
        }
        Insert: {
          cantidad?: number
          codigo_promocion?: string | null
          created_at?: string | null
          descuento_porcentaje?: number | null
          descuento_tipo?: Database["public"]["Enums"]["tipo_descuento_enum"]
          descuento_valor?: number
          id?: number
          id_empleado?: number | null
          id_producto?: number | null
          id_servicio?: number | null
          id_venta: number
          notas_descuento?: string | null
          precio_final_mxn?: number | null
          precio_original_mxn?: number | null
          precio_unitario: number
          subtotal: number
          updated_at?: string | null
        }
        Update: {
          cantidad?: number
          codigo_promocion?: string | null
          created_at?: string | null
          descuento_porcentaje?: number | null
          descuento_tipo?: Database["public"]["Enums"]["tipo_descuento_enum"]
          descuento_valor?: number
          id?: number
          id_empleado?: number | null
          id_producto?: number | null
          id_servicio?: number | null
          id_venta?: number
          notas_descuento?: string | null
          precio_final_mxn?: number | null
          precio_original_mxn?: number | null
          precio_unitario?: number
          subtotal?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venta_items_id_producto_fkey"
            columns: ["id_producto"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venta_items_id_servicio_fkey"
            columns: ["id_servicio"]
            isOneToOne: false
            referencedRelation: "servicios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venta_items_id_venta_fkey"
            columns: ["id_venta"]
            isOneToOne: false
            referencedRelation: "ventas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venta_items_id_venta_fkey"
            columns: ["id_venta"]
            isOneToOne: false
            referencedRelation: "vw_ventas_desglose"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venta_items_id_venta_fkey"
            columns: ["id_venta"]
            isOneToOne: false
            referencedRelation: "vw_ventas_detalle_descuentos"
            referencedColumns: ["id_venta"]
          },
        ]
      }
      ventas: {
        Row: {
          anticipo_aplicado_mxn: number | null
          created_at: string | null
          descuento: number | null
          estado: string | null
          estado_venta: string
          fecha: string
          id: number
          id_cita: number | null
          id_cliente: number
          id_sucursal: number
          impuestos: number | null
          monto_descuento_mxn: number | null
          monto_final_mxn: number | null
          monto_original_mxn: number | null
          notas: string | null
          observacion: string | null
          origen: string | null
          saldo_pendiente_mxn: number | null
          subtotal: number
          total: number
          total_pagado_mxn: number | null
          updated_at: string | null
        }
        Insert: {
          anticipo_aplicado_mxn?: number | null
          created_at?: string | null
          descuento?: number | null
          estado?: string | null
          estado_venta: string
          fecha?: string
          id?: number
          id_cita?: number | null
          id_cliente: number
          id_sucursal: number
          impuestos?: number | null
          monto_descuento_mxn?: number | null
          monto_final_mxn?: number | null
          monto_original_mxn?: number | null
          notas?: string | null
          observacion?: string | null
          origen?: string | null
          saldo_pendiente_mxn?: number | null
          subtotal?: number
          total: number
          total_pagado_mxn?: number | null
          updated_at?: string | null
        }
        Update: {
          anticipo_aplicado_mxn?: number | null
          created_at?: string | null
          descuento?: number | null
          estado?: string | null
          estado_venta?: string
          fecha?: string
          id?: number
          id_cita?: number | null
          id_cliente?: number
          id_sucursal?: number
          impuestos?: number | null
          monto_descuento_mxn?: number | null
          monto_final_mxn?: number | null
          monto_original_mxn?: number | null
          notas?: string | null
          observacion?: string | null
          origen?: string | null
          saldo_pendiente_mxn?: number | null
          subtotal?: number
          total?: number
          total_pagado_mxn?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_ventas_cita"
            columns: ["id_cita"]
            isOneToOne: false
            referencedRelation: "agendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ventas_cita"
            columns: ["id_cita"]
            isOneToOne: false
            referencedRelation: "vw_tiempos_ciclo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_clientes_ausentes"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "ventas_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_clientes_no_retenidos"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "ventas_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_clientes_recompra"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "ventas_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_clientes_saldos"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "ventas_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_no_show_rate"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "ventas_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "vw_pasivo_diferidos_sucursal"
            referencedColumns: ["id_sucursal"]
          },
        ]
      }
      ventas_detalle: {
        Row: {
          cantidad: number | null
          cantidad_aux: number | null
          cliente: string
          created_at: string | null
          descripcion: string | null
          fecha_venta: string
          id: number
          id_factura: string
          impuesto_aux_mxn: number | null
          impuesto_mxn: number | null
          monto_linea_mxn: number | null
          monto_total_mxn: number | null
          precio_unitario_mxn: number | null
          profesional: string | null
          responsabilidad_paquete_mxn: number | null
          responsabilidad_paquete_total_mxn: number | null
          sucursal: string
          tipo: string
          updated_at: string | null
        }
        Insert: {
          cantidad?: number | null
          cantidad_aux?: number | null
          cliente: string
          created_at?: string | null
          descripcion?: string | null
          fecha_venta: string
          id?: number
          id_factura: string
          impuesto_aux_mxn?: number | null
          impuesto_mxn?: number | null
          monto_linea_mxn?: number | null
          monto_total_mxn?: number | null
          precio_unitario_mxn?: number | null
          profesional?: string | null
          responsabilidad_paquete_mxn?: number | null
          responsabilidad_paquete_total_mxn?: number | null
          sucursal: string
          tipo: string
          updated_at?: string | null
        }
        Update: {
          cantidad?: number | null
          cantidad_aux?: number | null
          cliente?: string
          created_at?: string | null
          descripcion?: string | null
          fecha_venta?: string
          id?: number
          id_factura?: string
          impuesto_aux_mxn?: number | null
          impuesto_mxn?: number | null
          monto_linea_mxn?: number | null
          monto_total_mxn?: number | null
          precio_unitario_mxn?: number | null
          profesional?: string | null
          responsabilidad_paquete_mxn?: number | null
          responsabilidad_paquete_total_mxn?: number | null
          sucursal?: string
          tipo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ventas_por_categoria_servicio: {
        Row: {
          cantidad_servicios: number
          categoria_servicio: string
          created_at: string | null
          id: number
          porcentaje_participacion: number
          updated_at: string | null
        }
        Insert: {
          cantidad_servicios?: number
          categoria_servicio: string
          created_at?: string | null
          id?: number
          porcentaje_participacion?: number
          updated_at?: string | null
        }
        Update: {
          cantidad_servicios?: number
          categoria_servicio?: string
          created_at?: string | null
          id?: number
          porcentaje_participacion?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      webhook_configs: {
        Row: {
          activo: boolean
          created_at: string
          eventos: Json
          headers: Json | null
          id: number
          nombre: string
          updated_at: string
          url: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          eventos?: Json
          headers?: Json | null
          id?: number
          nombre: string
          updated_at?: string
          url: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          eventos?: Json
          headers?: Json | null
          id?: number
          nombre?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string
          error_message: string | null
          evento: string
          id: number
          payload: Json
          response_body: string | null
          status_code: number | null
          webhook_config_id: number | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          evento: string
          id?: number
          payload: Json
          response_body?: string | null
          status_code?: number | null
          webhook_config_id?: number | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          evento?: string
          id?: number
          payload?: Json
          response_body?: string | null
          status_code?: number | null
          webhook_config_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_webhook_config_id_fkey"
            columns: ["webhook_config_id"]
            isOneToOne: false
            referencedRelation: "webhook_configs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      vw_anticipos_detalle: {
        Row: {
          cliente: string | null
          created_at: string | null
          dias_desde_registro: number | null
          estado: Database["public"]["Enums"]["estado_anticipo_enum"] | null
          fecha_pago: string | null
          id: number | null
          id_cliente: number | null
          id_sucursal: number | null
          metodo_pago: string | null
          monto_mxn: number | null
          num_aplicaciones: number | null
          observacion: string | null
          referencia_pago: string | null
          saldo_disponible_mxn: number | null
          sucursal: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anticipos_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anticipos_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_clientes_ausentes"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "anticipos_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_clientes_no_retenidos"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "anticipos_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_clientes_recompra"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "anticipos_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_clientes_saldos"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "anticipos_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_no_show_rate"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "anticipos_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anticipos_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "vw_pasivo_diferidos_sucursal"
            referencedColumns: ["id_sucursal"]
          },
        ]
      }
      vw_clientes_ausentes: {
        Row: {
          apellidos: string | null
          dias_desde_ultima_visita: number | null
          email: string | null
          fecha_ultima_visita: string | null
          id_cliente: number | null
          nombre: string | null
          telefono: string | null
          total_citas_historicas: number | null
        }
        Relationships: []
      }
      vw_clientes_duplicados: {
        Row: {
          apellidos: string | null
          criterio_duplicado: string | null
          email: string | null
          fecha_alta_1: string | null
          fecha_alta_2: string | null
          id_cliente_1: number | null
          id_cliente_2: number | null
          nombre: string | null
          telefono: string | null
        }
        Relationships: []
      }
      vw_clientes_eliminados: {
        Row: {
          apellidos: string | null
          datos_completos: Json | null
          email: string | null
          fecha_eliminacion: string | null
          id: number | null
          id_cliente_original: number | null
          motivo_eliminacion: string | null
          nombre: string | null
          telefono: string | null
          usuario_responsable: string | null
        }
        Insert: {
          apellidos?: string | null
          datos_completos?: Json | null
          email?: string | null
          fecha_eliminacion?: string | null
          id?: number | null
          id_cliente_original?: number | null
          motivo_eliminacion?: string | null
          nombre?: string | null
          telefono?: string | null
          usuario_responsable?: string | null
        }
        Update: {
          apellidos?: string | null
          datos_completos?: Json | null
          email?: string | null
          fecha_eliminacion?: string | null
          id?: number | null
          id_cliente_original?: number | null
          motivo_eliminacion?: string | null
          nombre?: string | null
          telefono?: string | null
          usuario_responsable?: string | null
        }
        Relationships: []
      }
      vw_clientes_no_retenidos: {
        Row: {
          apellidos: string | null
          email: string | null
          fecha_alta: string | null
          fecha_ultima_visita: string | null
          id_cliente: number | null
          nombre: string | null
          telefono: string | null
          total_citas: number | null
        }
        Relationships: []
      }
      vw_clientes_recompra: {
        Row: {
          apellidos: string | null
          citas_ultimo_mes: number | null
          citas_ultimo_trimestre: number | null
          email: string | null
          fecha_ultima_visita: string | null
          id_cliente: number | null
          nombre: string | null
          telefono: string | null
          total_citas: number | null
        }
        Relationships: []
      }
      vw_clientes_saldos: {
        Row: {
          apellidos: string | null
          email: string | null
          fecha_ultima_visita: string | null
          id_cliente: number | null
          nombre: string | null
          saldo_contra: number | null
          saldo_favor: number | null
          saldo_neto: number | null
          telefono: string | null
        }
        Insert: {
          apellidos?: string | null
          email?: string | null
          fecha_ultima_visita?: string | null
          id_cliente?: number | null
          nombre?: string | null
          saldo_contra?: number | null
          saldo_favor?: number | null
          saldo_neto?: never
          telefono?: string | null
        }
        Update: {
          apellidos?: string | null
          email?: string | null
          fecha_ultima_visita?: string | null
          id_cliente?: number | null
          nombre?: string | null
          saldo_contra?: number | null
          saldo_favor?: number | null
          saldo_neto?: never
          telefono?: string | null
        }
        Relationships: []
      }
      vw_no_show_rate: {
        Row: {
          apellidos: string | null
          cancelaciones_90_dias: number | null
          id_cliente: number | null
          no_shows_90_dias: number | null
          nombre: string | null
          riesgo_no_show: string | null
          total_citas_90_dias: number | null
        }
        Relationships: []
      }
      vw_ocupacion_cabinas: {
        Row: {
          citas_atendidas: number | null
          citas_canceladas: number | null
          fecha: string | null
          id_sucursal: number | null
          no_shows: number | null
          porcentaje_ocupacion: number | null
          sucursal_nombre: string | null
          total_citas: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agendas_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendas_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "vw_pasivo_diferidos_sucursal"
            referencedColumns: ["id_sucursal"]
          },
        ]
      }
      vw_pasivo_diferidos_sucursal: {
        Row: {
          id_sucursal: number | null
          pasivo_total_mxn: number | null
          sucursal: string | null
        }
        Relationships: []
      }
      vw_productividad_empleado: {
        Row: {
          citas_completadas_mes: number | null
          comision_mxn: number | null
          empleado_nombre: string | null
          horas_trabajadas: number | null
          id_empleado: number | null
          id_sucursal: number | null
          ingresos_reconocidos_mxn: number | null
          minutos_productivos: number | null
          sucursal_nombre: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empleados_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleados_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "vw_pasivo_diferidos_sucursal"
            referencedColumns: ["id_sucursal"]
          },
        ]
      }
      vw_reporte_descuentos: {
        Row: {
          categoria_servicio: string | null
          codigo_promocion: string | null
          descuento_promedio_pct: number | null
          fecha: string | null
          id_empleado: number | null
          id_sucursal: number | null
          num_items: number | null
          num_ventas: number | null
          profesional_nombre: string | null
          sucursal_nombre: string | null
          total_descuento_mxn: number | null
          total_final_mxn: number | null
          total_original_mxn: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ventas_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "vw_pasivo_diferidos_sucursal"
            referencedColumns: ["id_sucursal"]
          },
        ]
      }
      vw_reporte_diferidos: {
        Row: {
          fecha: string | null
          id_sucursal: number | null
          num_movimientos: number | null
          sucursal: string | null
          tipo:
            | Database["public"]["Enums"]["tipo_movimiento_diferido_enum"]
            | null
          total_monto: number | null
        }
        Relationships: [
          {
            foreignKeyName: "libro_diferidos_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "libro_diferidos_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "vw_pasivo_diferidos_sucursal"
            referencedColumns: ["id_sucursal"]
          },
        ]
      }
      vw_tiempos_ciclo: {
        Row: {
          check_in_at: string | null
          check_out_at: string | null
          checkin_timestamp: string | null
          confirmacion_timestamp: string | null
          estado: Database["public"]["Enums"]["cita_estado_enum"] | null
          fecha: string | null
          id: number | null
          id_cliente: number | null
          id_empleado: number | null
          id_sucursal: number | null
          minutos_confirmacion_a_llegada: number | null
          minutos_llegada_a_atencion: number | null
        }
        Insert: {
          check_in_at?: string | null
          check_out_at?: string | null
          checkin_timestamp?: string | null
          confirmacion_timestamp?: string | null
          estado?: Database["public"]["Enums"]["cita_estado_enum"] | null
          fecha?: string | null
          id?: number | null
          id_cliente?: number | null
          id_empleado?: number | null
          id_sucursal?: number | null
          minutos_confirmacion_a_llegada?: never
          minutos_llegada_a_atencion?: never
        }
        Update: {
          check_in_at?: string | null
          check_out_at?: string | null
          checkin_timestamp?: string | null
          confirmacion_timestamp?: string | null
          estado?: Database["public"]["Enums"]["cita_estado_enum"] | null
          fecha?: string | null
          id?: number | null
          id_cliente?: number | null
          id_empleado?: number | null
          id_sucursal?: number | null
          minutos_confirmacion_a_llegada?: never
          minutos_llegada_a_atencion?: never
        }
        Relationships: [
          {
            foreignKeyName: "agendas_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendas_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_clientes_ausentes"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "agendas_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_clientes_no_retenidos"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "agendas_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_clientes_recompra"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "agendas_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_clientes_saldos"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "agendas_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_no_show_rate"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "agendas_id_empleado_fkey"
            columns: ["id_empleado"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendas_id_empleado_fkey"
            columns: ["id_empleado"]
            isOneToOne: false
            referencedRelation: "vw_productividad_empleado"
            referencedColumns: ["id_empleado"]
          },
          {
            foreignKeyName: "agendas_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendas_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "vw_pasivo_diferidos_sucursal"
            referencedColumns: ["id_sucursal"]
          },
        ]
      }
      vw_usuarios_sistema: {
        Row: {
          activo: boolean | null
          created_at: string | null
          email: string | null
          id: string | null
          id_empleado: number | null
          id_sucursal: number | null
          nombre_completo: string | null
          roles: string[] | null
          sucursal_nombre: string | null
          telefono: string | null
          ultimo_login: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_empleado_fkey"
            columns: ["id_empleado"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_id_empleado_fkey"
            columns: ["id_empleado"]
            isOneToOne: false
            referencedRelation: "vw_productividad_empleado"
            referencedColumns: ["id_empleado"]
          },
          {
            foreignKeyName: "profiles_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "vw_pasivo_diferidos_sucursal"
            referencedColumns: ["id_sucursal"]
          },
        ]
      }
      vw_ventas_desglose: {
        Row: {
          cliente: string | null
          descuento: number | null
          estado_venta: string | null
          fecha: string | null
          id: number | null
          id_cliente: number | null
          id_sucursal: number | null
          metodos_pago: string | null
          monto_final_mxn: number | null
          promedio_descuento_porcentaje: number | null
          sucursal: string | null
          total: number | null
          total_precio_original: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ventas_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_clientes_ausentes"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "ventas_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_clientes_no_retenidos"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "ventas_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_clientes_recompra"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "ventas_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_clientes_saldos"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "ventas_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_no_show_rate"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "ventas_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "vw_pasivo_diferidos_sucursal"
            referencedColumns: ["id_sucursal"]
          },
        ]
      }
      vw_ventas_detalle_descuentos: {
        Row: {
          cantidad: number | null
          categoria_servicio: string | null
          cliente_nombre: string | null
          codigo_promocion: string | null
          created_at: string | null
          descuento_porcentaje_efectivo: number | null
          descuento_tipo:
            | Database["public"]["Enums"]["tipo_descuento_enum"]
            | null
          descuento_total_mxn: number | null
          descuento_valor: number | null
          estado_venta: string | null
          fecha_venta: string | null
          id_cliente: number | null
          id_empleado: number | null
          id_item: number | null
          id_servicio: number | null
          id_sucursal: number | null
          id_venta: number | null
          notas_descuento: string | null
          precio_final_mxn: number | null
          precio_original_mxn: number | null
          profesional_nombre: string | null
          servicio_nombre: string | null
          subtotal_final_mxn: number | null
          subtotal_original_mxn: number | null
          sucursal_nombre: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venta_items_id_servicio_fkey"
            columns: ["id_servicio"]
            isOneToOne: false
            referencedRelation: "servicios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_clientes_ausentes"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "ventas_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_clientes_no_retenidos"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "ventas_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_clientes_recompra"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "ventas_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_clientes_saldos"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "ventas_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_no_show_rate"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "ventas_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "vw_pasivo_diferidos_sucursal"
            referencedColumns: ["id_sucursal"]
          },
        ]
      }
    }
    Functions: {
      calcular_riesgo_no_show: {
        Args: { p_dias_atras?: number; p_id_cliente: number }
        Returns: string
      }
      generar_codigo_tarjeta: { Args: never; Returns: string }
      get_permisos_usuario: { Args: { _user_id: string }; Returns: Json }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      puede_acceder_sucursal: {
        Args: { _id_sucursal: number; _user_id: string }
        Returns: boolean
      }
      puede_cambiar_estado_cita: {
        Args: {
          _cita_id: number
          _estado_actual: Database["public"]["Enums"]["cita_estado_enum"]
          _estado_nuevo: Database["public"]["Enums"]["cita_estado_enum"]
          _user_id: string
        }
        Returns: boolean
      }
      registrar_accion_acceso: {
        Args: {
          _accion: string
          _detalle?: Json
          _id_afectado?: string
          _motivo?: string
          _user_id: string
        }
        Returns: string
      }
      resolver_regla_comision: {
        Args: {
          _fecha: string
          _id_categoria: number
          _id_empleado: number
          _id_servicio: number
        }
        Returns: {
          id_regla: number
          porcentaje: number
          prioridad: number
        }[]
      }
      tiene_permiso: {
        Args: { _permiso: string; _user_id: string }
        Returns: boolean
      }
      validar_transicion_estado: {
        Args: {
          estado_actual: Database["public"]["Enums"]["cita_estado_enum"]
          estado_nuevo: Database["public"]["Enums"]["cita_estado_enum"]
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "gerencia"
        | "recepcion"
        | "profesional"
        | "direccion"
        | "admin_rrhh"
        | "jefe_sucursal"
        | "colaborador"
      categoria_producto_enum:
        | "toxina"
        | "relleno"
        | "anestesia"
        | "guantes"
        | "mascarillas"
        | "jeringas"
        | "suturas"
        | "vendas"
        | "antisepticos"
        | "cremas"
        | "otros"
      cita_estado_enum:
        | "reservada"
        | "confirmada"
        | "llego_paciente"
        | "asistida"
        | "no_show"
        | "cancelada_cliente"
        | "cancelada_clinica"
        | "agendada"
        | "en_atencion"
        | "finalizada"
        | "cancelada"
        | "no_asiste"
      estado_anticipo_enum:
        | "registrado"
        | "aplicado_parcial"
        | "aplicado_total"
        | "reembolsado"
      estado_permiso_enum: "Aprobado" | "Denegado" | "En proceso"
      tipo_descuento_enum: "porcentaje" | "monto" | "ninguno"
      tipo_movimiento_diferido_enum:
        | "alta_anticipo"
        | "aplicacion"
        | "reembolso"
        | "ajuste"
      tipo_movimiento_inventario_enum:
        | "entrada_compra"
        | "salida_consumo"
        | "salida_venta"
        | "merma_caducado"
        | "transferencia"
      tipo_pago_enum: "venta" | "anticipo" | "abono" | "giftcard"
      tipo_ubicacion_enum: "sucursal" | "bodega"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "gerencia",
        "recepcion",
        "profesional",
        "direccion",
        "admin_rrhh",
        "jefe_sucursal",
        "colaborador",
      ],
      categoria_producto_enum: [
        "toxina",
        "relleno",
        "anestesia",
        "guantes",
        "mascarillas",
        "jeringas",
        "suturas",
        "vendas",
        "antisepticos",
        "cremas",
        "otros",
      ],
      cita_estado_enum: [
        "reservada",
        "confirmada",
        "llego_paciente",
        "asistida",
        "no_show",
        "cancelada_cliente",
        "cancelada_clinica",
        "agendada",
        "en_atencion",
        "finalizada",
        "cancelada",
        "no_asiste",
      ],
      estado_anticipo_enum: [
        "registrado",
        "aplicado_parcial",
        "aplicado_total",
        "reembolsado",
      ],
      estado_permiso_enum: ["Aprobado", "Denegado", "En proceso"],
      tipo_descuento_enum: ["porcentaje", "monto", "ninguno"],
      tipo_movimiento_diferido_enum: [
        "alta_anticipo",
        "aplicacion",
        "reembolso",
        "ajuste",
      ],
      tipo_movimiento_inventario_enum: [
        "entrada_compra",
        "salida_consumo",
        "salida_venta",
        "merma_caducado",
        "transferencia",
      ],
      tipo_pago_enum: ["venta", "anticipo", "abono", "giftcard"],
      tipo_ubicacion_enum: ["sucursal", "bodega"],
    },
  },
} as const
