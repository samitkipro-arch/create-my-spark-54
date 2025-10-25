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
      categories: {
        Row: {
          created_at: string
          id: string
          label: string
          org_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          org_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          org_id: string
          phone: string | null
          vat_number: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          org_id: string
          phone?: string | null
          vat_number?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          org_id?: string
          phone?: string | null
          vat_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          comment: string | null
          created_at: string
          is_active: boolean
          last_sign_in_at: string | null
          org_id: string
          receipts_processed_count: number
          role: Database["public"]["Enums"]["role_type"]
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          is_active?: boolean
          last_sign_in_at?: string | null
          org_id: string
          receipts_processed_count?: number
          role?: Database["public"]["Enums"]["role_type"]
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          is_active?: boolean
          last_sign_in_at?: string | null
          org_id?: string
          receipts_processed_count?: number
          role?: Database["public"]["Enums"]["role_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      orgs: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company: string | null
          created_at: string
          first_name: string | null
          last_name: string | null
          phone: string | null
          role_title: string | null
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          role_title?: string | null
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          role_title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      recus: {
        Row: {
          adresse: string | null
          analysis_report_url: string | null
          category_id: string | null
          client_id: string | null
          created_at: string
          date_recu: string | null
          date_traitement: string | null
          enseigne: string | null
          id: number
          image_url: string | null
          montant_ht: number | null
          montant_ttc: number | null
          moyen_paiement: string | null
          notes: string | null
          numero_recu: string | null
          org_id: string
          processed_by: string | null
          source: string | null
          status: Database["public"]["Enums"]["receipt_status"]
          tva: number | null
          updated_at: string
          ville: string | null
        }
        Insert: {
          adresse?: string | null
          analysis_report_url?: string | null
          category_id?: string | null
          client_id?: string | null
          created_at?: string
          date_recu?: string | null
          date_traitement?: string | null
          enseigne?: string | null
          id?: number
          image_url?: string | null
          montant_ht?: number | null
          montant_ttc?: number | null
          moyen_paiement?: string | null
          notes?: string | null
          numero_recu?: string | null
          org_id: string
          processed_by?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["receipt_status"]
          tva?: number | null
          updated_at?: string
          ville?: string | null
        }
        Update: {
          adresse?: string | null
          analysis_report_url?: string | null
          category_id?: string | null
          client_id?: string | null
          created_at?: string
          date_recu?: string | null
          date_traitement?: string | null
          enseigne?: string | null
          id?: number
          image_url?: string | null
          montant_ht?: number | null
          montant_ttc?: number | null
          moyen_paiement?: string | null
          notes?: string | null
          numero_recu?: string | null
          org_id?: string
          processed_by?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["receipt_status"]
          tva?: number | null
          updated_at?: string
          ville?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recus_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recus_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recus_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      recus_feed: {
        Row: {
          adresse: string | null
          analysis_report_url: string | null
          category_id: string | null
          category_label: string | null
          client_id: string | null
          client_name: string | null
          created_at: string | null
          date_recu: string | null
          date_traitement: string | null
          enseigne: string | null
          id: number | null
          image_url: string | null
          montant_ht: number | null
          montant_ttc: number | null
          moyen_paiement: string | null
          notes: string | null
          numero_recu: string | null
          org_id: string | null
          source: string | null
          status: Database["public"]["Enums"]["receipt_status"] | null
          tva: number | null
          ville: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recus_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recus_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recus_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      is_org_member: { Args: { p_org: string }; Returns: boolean }
      recus_feed_list: {
        Args: {
          p_client_ids: string[]
          p_from: string
          p_limit: number
          p_offset: number
          p_search: string
          p_statuses: Database["public"]["Enums"]["receipt_status"][]
          p_to: string
        }
        Returns: {
          adresse: string | null
          analysis_report_url: string | null
          category_id: string | null
          category_label: string | null
          client_id: string | null
          client_name: string | null
          created_at: string | null
          date_recu: string | null
          date_traitement: string | null
          enseigne: string | null
          id: number | null
          image_url: string | null
          montant_ht: number | null
          montant_ttc: number | null
          moyen_paiement: string | null
          notes: string | null
          numero_recu: string | null
          org_id: string | null
          source: string | null
          status: Database["public"]["Enums"]["receipt_status"] | null
          tva: number | null
          ville: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "recus_feed"
          isOneToOne: false
          isSetofReturn: true
        }
      }
    }
    Enums: {
      payment_method: "CB" | "Virement" | "Especes" | "Cheque" | "Autre"
      receipt_status: "en_attente" | "en_cours" | "traite" | "rejete"
      role_type: "owner" | "admin" | "viewer"
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
      payment_method: ["CB", "Virement", "Especes", "Cheque", "Autre"],
      receipt_status: ["en_attente", "en_cours", "traite", "rejete"],
      role_type: ["owner", "admin", "viewer"],
    },
  },
} as const
