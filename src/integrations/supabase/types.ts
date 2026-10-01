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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      arquivos: {
        Row: {
          id: string
          importado_em: string
          importado_por: string | null
          nome: string
          total_invertidos: number
          total_linhas: number
          total_pontos: number
          total_suspeitos: number
        }
        Insert: {
          id?: string
          importado_em?: string
          importado_por?: string | null
          nome: string
          total_invertidos?: number
          total_linhas?: number
          total_pontos?: number
          total_suspeitos?: number
        }
        Update: {
          id?: string
          importado_em?: string
          importado_por?: string | null
          nome?: string
          total_invertidos?: number
          total_linhas?: number
          total_pontos?: number
          total_suspeitos?: number
        }
        Relationships: []
      }
      avisos_linha: {
        Row: {
          id: string
          titulo: string
          mensagem: string
          tipo: string
          codigo_linha: string | null
          inicio_em: string
          fim_em: string
          ativo: boolean
          criado_por: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          titulo: string
          mensagem: string
          tipo?: string
          codigo_linha?: string | null
          inicio_em?: string
          fim_em: string
          ativo?: boolean
          criado_por?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          titulo?: string
          mensagem?: string
          tipo?: string
          codigo_linha?: string | null
          inicio_em?: string
          fim_em?: string
          ativo?: boolean
          criado_por?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      auditoria: {
        Row: {
          created_at: string
          dado_anterior: Json | null
          dado_novo: Json | null
          id: string
          operacao: string
          registro_id: string | null
          tabela: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          dado_anterior?: Json | null
          dado_novo?: Json | null
          id?: string
          operacao: string
          registro_id?: string | null
          tabela: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          dado_anterior?: Json | null
          dado_novo?: Json | null
          id?: string
          operacao?: string
          registro_id?: string | null
          tabela?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      horarios: {
        Row: {
          ativo: boolean
          created_at: string
          dia_tipo: string
          horario: string
          id: string
          linha_id: string
          observacao: string | null
          sentido: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          dia_tipo: string
          horario: string
          id?: string
          linha_id: string
          observacao?: string | null
          sentido?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          dia_tipo?: string
          horario?: string
          id?: string
          linha_id?: string
          observacao?: string | null
          sentido?: string
        }
        Relationships: [
          {
            foreignKeyName: "horarios_linha_id_fkey"
            columns: ["linha_id"]
            isOneToOne: false
            referencedRelation: "linhas"
            referencedColumns: ["id"]
          },
        ]
      }
      importacoes: {
        Row: {
          arquivo: string
          created_at: string
          criado_por: string | null
          erros: Json
          id: string
          numero: number
          previa: Json | null
          publicado_em: string | null
          status: string
          total_bairros: number
          total_cidades: number
          total_linhas: number
          total_pontos: number
          total_trajetos: number
        }
        Insert: {
          arquivo: string
          created_at?: string
          criado_por?: string | null
          erros?: Json
          id?: string
          numero?: number
          previa?: Json | null
          publicado_em?: string | null
          status?: string
          total_bairros?: number
          total_cidades?: number
          total_linhas?: number
          total_pontos?: number
          total_trajetos?: number
        }
        Update: {
          arquivo?: string
          created_at?: string
          criado_por?: string | null
          erros?: Json
          id?: string
          numero?: number
          previa?: Json | null
          publicado_em?: string | null
          status?: string
          total_bairros?: number
          total_cidades?: number
          total_linhas?: number
          total_pontos?: number
          total_trajetos?: number
        }
        Relationships: []
      }
      itinerarios: {
        Row: {
          id: string
          import_batch_id: string | null
          latitude: number | null
          linha_id: string
          longitude: number | null
          ordem: number
          ponto_id: string
          sentido: string
        }
        Insert: {
          id?: string
          import_batch_id?: string | null
          latitude?: number | null
          linha_id: string
          longitude?: number | null
          ordem: number
          ponto_id: string
          sentido?: string
        }
        Update: {
          id?: string
          import_batch_id?: string | null
          latitude?: number | null
          linha_id?: string
          longitude?: number | null
          ordem?: number
          ponto_id?: string
          sentido?: string
        }
        Relationships: [
          {
            foreignKeyName: "itinerarios_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "importacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itinerarios_linha_id_fkey"
            columns: ["linha_id"]
            isOneToOne: false
            referencedRelation: "linhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itinerarios_ponto_id_fkey"
            columns: ["ponto_id"]
            isOneToOne: false
            referencedRelation: "pontos"
            referencedColumns: ["id"]
          },
        ]
      }
      linhas: {
        Row: {
          ativo: boolean
          busca: string | null
          cidade: string | null
          created_at: string
          destino: string | null
          id: string
          import_batch_id: string | null
          nome: string | null
          numero: string
          origem: string | null
          original_description: string | null
          original_id: string | null
          original_name: string | null
          sentido: string
          sentido_nome: string | null
          updated_at: string
          variante: string | null
        }
        Insert: {
          ativo?: boolean
          busca?: string | null
          cidade?: string | null
          created_at?: string
          destino?: string | null
          id?: string
          import_batch_id?: string | null
          nome?: string | null
          numero: string
          origem?: string | null
          original_description?: string | null
          original_id?: string | null
          original_name?: string | null
          sentido?: string
          sentido_nome?: string | null
          updated_at?: string
          variante?: string | null
        }
        Update: {
          ativo?: boolean
          busca?: string | null
          cidade?: string | null
          created_at?: string
          destino?: string | null
          id?: string
          import_batch_id?: string | null
          nome?: string | null
          numero?: string
          origem?: string | null
          original_description?: string | null
          original_id?: string | null
          original_name?: string | null
          sentido?: string
          sentido_nome?: string | null
          updated_at?: string
          variante?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "linhas_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "importacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      localidades: {
        Row: {
          bairro: string | null
          busca: string | null
          cidade: string | null
          created_at: string
          id: string
          import_batch_id: string | null
          latitude: number | null
          longitude: number | null
          nome: string
          rua: string | null
          slug: string
          tipo: string
          total_pontos: number
        }
        Insert: {
          bairro?: string | null
          busca?: string | null
          cidade?: string | null
          created_at?: string
          id?: string
          import_batch_id?: string | null
          latitude?: number | null
          longitude?: number | null
          nome: string
          rua?: string | null
          slug: string
          tipo: string
          total_pontos?: number
        }
        Update: {
          bairro?: string | null
          busca?: string | null
          cidade?: string | null
          created_at?: string
          id?: string
          import_batch_id?: string | null
          latitude?: number | null
          longitude?: number | null
          nome?: string
          rua?: string | null
          slug?: string
          tipo?: string
          total_pontos?: number
        }
        Relationships: [
          {
            foreignKeyName: "localidades_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "importacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      paradas: {
        Row: {
          arquivo_id: string
          bairro: string | null
          created_at: string
          descricao_original: string | null
          id: string
          invertido: boolean
          kml_id: string | null
          lat_editada: number | null
          lat_original: number
          lon_editada: number | null
          lon_original: number
          nome: string | null
          ordem: number
          rota_id: string
          rua: string | null
          suspeito: boolean
          tipo: string | null
          updated_at: string
        }
        Insert: {
          arquivo_id: string
          bairro?: string | null
          created_at?: string
          descricao_original?: string | null
          id?: string
          invertido?: boolean
          kml_id?: string | null
          lat_editada?: number | null
          lat_original: number
          lon_editada?: number | null
          lon_original: number
          nome?: string | null
          ordem: number
          rota_id: string
          rua?: string | null
          suspeito?: boolean
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          arquivo_id?: string
          bairro?: string | null
          created_at?: string
          descricao_original?: string | null
          id?: string
          invertido?: boolean
          kml_id?: string | null
          lat_editada?: number | null
          lat_original?: number
          lon_editada?: number | null
          lon_original?: number
          nome?: string | null
          ordem?: number
          rota_id?: string
          rua?: string | null
          suspeito?: boolean
          tipo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "paradas_arquivo_id_fkey"
            columns: ["arquivo_id"]
            isOneToOne: false
            referencedRelation: "arquivos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paradas_rota_id_fkey"
            columns: ["rota_id"]
            isOneToOne: false
            referencedRelation: "rotas"
            referencedColumns: ["id"]
          },
        ]
      }
      pontos: {
        Row: {
          ativo: boolean
          bairro: string | null
          busca: string | null
          cidade: string | null
          codigo: string | null
          created_at: string
          endereco: string | null
          id: string
          import_batch_id: string | null
          latitude: number
          longitude: number
          nome: string | null
          original_description: string | null
          original_id: string | null
          original_name: string | null
          rua: string | null
          tipo: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          bairro?: string | null
          busca?: string | null
          cidade?: string | null
          codigo?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          import_batch_id?: string | null
          latitude: number
          longitude: number
          nome?: string | null
          original_description?: string | null
          original_id?: string | null
          original_name?: string | null
          rua?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          bairro?: string | null
          busca?: string | null
          cidade?: string | null
          codigo?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          import_batch_id?: string | null
          latitude?: number
          longitude?: number
          nome?: string | null
          original_description?: string | null
          original_id?: string | null
          original_name?: string | null
          rua?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pontos_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "importacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      rotas: {
        Row: {
          arquivo_id: string
          ativo: boolean
          codigo: string
          created_at: string
          descricao_original: string | null
          destino: string | null
          id: string
          kml_id: string | null
          nome: string | null
          origem: string | null
          sentido: string
          trajeto_editado: Json | null
          trajeto_original: Json
          updated_at: string
        }
        Insert: {
          arquivo_id: string
          ativo?: boolean
          codigo: string
          created_at?: string
          descricao_original?: string | null
          destino?: string | null
          id?: string
          kml_id?: string | null
          nome?: string | null
          origem?: string | null
          sentido?: string
          trajeto_editado?: Json | null
          trajeto_original?: Json
          updated_at?: string
        }
        Update: {
          arquivo_id?: string
          ativo?: boolean
          codigo?: string
          created_at?: string
          descricao_original?: string | null
          destino?: string | null
          id?: string
          kml_id?: string | null
          nome?: string | null
          origem?: string | null
          sentido?: string
          trajeto_editado?: Json | null
          trajeto_original?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rotas_arquivo_id_fkey"
            columns: ["arquivo_id"]
            isOneToOne: false
            referencedRelation: "arquivos"
            referencedColumns: ["id"]
          },
        ]
      }
      trajetos: {
        Row: {
          ativo: boolean
          distancia_km: number | null
          geometria: Json
          id: string
          import_batch_id: string | null
          linha_id: string
          sentido: string
        }
        Insert: {
          ativo?: boolean
          distancia_km?: number | null
          geometria: Json
          id?: string
          import_batch_id?: string | null
          linha_id: string
          sentido?: string
        }
        Update: {
          ativo?: boolean
          distancia_km?: number | null
          geometria?: Json
          id?: string
          import_batch_id?: string | null
          linha_id?: string
          sentido?: string
        }
        Relationships: [
          {
            foreignKeyName: "trajetos_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "importacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trajetos_linha_id_fkey"
            columns: ["linha_id"]
            isOneToOne: false
            referencedRelation: "linhas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      buscar_linhas_por_local: {
        Args: { termo: string }
        Returns: {
          destino: string
          linha_id: string
          nome: string
          numero: string
          origem: string
          sentido: string
          sentido_nome: string
          total_pontos: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      linhas_do_ponto: {
        Args: { _ponto_id: string }
        Returns: {
          destino: string
          linha_id: string
          nome: string
          numero: string
          origem: string
          sentido: string
        }[]
      }
      normalizar: { Args: { t: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "editor"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "editor"],
    },
  },
} as const
