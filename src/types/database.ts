// ============================================================
// ValorePro — Supabase Database Types (auto-generated)
// ============================================================
// Run `npx supabase gen types typescript` to regenerate
// ============================================================

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    public: {
        Tables: {
            addresses: {
                Row: {
                    cep: string
                    city: string
                    complement: string | null
                    created_at: string
                    id: string
                    is_default: boolean
                    label: string
                    neighborhood: string
                    number: string
                    state: string
                    street: string
                    user_id: string
                }
                Insert: {
                    cep: string
                    city: string
                    complement?: string | null
                    created_at?: string
                    id?: string
                    is_default?: boolean
                    label?: string
                    neighborhood: string
                    number: string
                    state: string
                    street: string
                    user_id: string
                }
                Update: {
                    cep?: string
                    city?: string
                    complement?: string | null
                    created_at?: string
                    id?: string
                    is_default?: boolean
                    label?: string
                    neighborhood?: string
                    number?: string
                    state?: string
                    street?: string
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "addresses_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    },
                ]
            }
            cards: {
                Row: {
                    brand: string
                    created_at: string
                    expiry_month: number
                    expiry_year: number
                    holder_name: string
                    id: string
                    is_default: boolean
                    last_four: string
                    token: string
                    user_id: string
                }
                Insert: {
                    brand: string
                    created_at?: string
                    expiry_month: number
                    expiry_year: number
                    holder_name: string
                    id?: string
                    is_default?: boolean
                    last_four: string
                    token: string
                    user_id: string
                }
                Update: {
                    brand?: string
                    created_at?: string
                    expiry_month?: number
                    expiry_year?: number
                    holder_name?: string
                    id?: string
                    is_default?: boolean
                    last_four?: string
                    token?: string
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "cards_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    },
                ]
            }
            notifications: {
                Row: {
                    id: string
                    user_id: string
                    type: string
                    title: string
                    message: string
                    data: Json
                    read: boolean
                    created_at: string
                    read_at: string | null
                }
                Insert: {
                    id?: string
                    user_id: string
                    type: string
                    title: string
                    message: string
                    data?: Json
                    read?: boolean
                    created_at?: string
                    read_at?: string | null
                }
                Update: {
                    id?: string
                    user_id?: string
                    type?: string
                    title?: string
                    message?: string
                    data?: Json
                    read?: boolean
                    created_at?: string
                    read_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "notifications_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    },
                ]
            }
            price_alerts: {
                Row: {
                    best_price_found: number | null
                    best_store_name: string | null
                    best_store_url: string | null
                    check_count: number
                    created_at: string
                    current_price: number | null
                    expires_at: string | null
                    id: string
                    last_checked_at: string | null
                    product_name: string
                    search_term: string
                    status: Database["public"]["Enums"]["alert_status"]
                    target_price: number
                    triggered_at: string | null
                    updated_at: string
                    user_id: string
                }
                Insert: {
                    best_price_found?: number | null
                    best_store_name?: string | null
                    best_store_url?: string | null
                    check_count?: number
                    created_at?: string
                    current_price?: number | null
                    expires_at?: string | null
                    id?: string
                    last_checked_at?: string | null
                    product_name: string
                    search_term: string
                    status?: Database["public"]["Enums"]["alert_status"]
                    target_price: number
                    triggered_at?: string | null
                    updated_at?: string
                    user_id: string
                }
                Update: {
                    best_price_found?: number | null
                    best_store_name?: string | null
                    best_store_url?: string | null
                    check_count?: number
                    created_at?: string
                    current_price?: number | null
                    expires_at?: string | null
                    id?: string
                    last_checked_at?: string | null
                    product_name?: string
                    search_term?: string
                    status?: Database["public"]["Enums"]["alert_status"]
                    target_price?: number
                    triggered_at?: string | null
                    updated_at?: string
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "price_alerts_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    },
                ]
            }
            price_history: {
                Row: {
                    id: string
                    price: number
                    product_term: string
                    recorded_at: string
                    store_domain: string
                    store_name: string
                }
                Insert: {
                    id?: string
                    price: number
                    product_term: string
                    recorded_at?: string
                    store_domain: string
                    store_name: string
                }
                Update: {
                    id?: string
                    price?: number
                    product_term?: string
                    recorded_at?: string
                    store_domain?: string
                    store_name?: string
                }
                Relationships: []
            }
            purchases: {
                Row: {
                    address_id: string | null
                    audit_log: Json | null
                    card_id: string | null
                    completed_at: string | null
                    confirmed_at: string | null
                    created_at: string
                    error_message: string | null
                    id: string
                    order_number: string | null
                    product_price: number
                    product_title: string
                    product_url: string
                    result_id: string | null
                    savings: number | null
                    search_id: string | null
                    shipping_cost: number
                    shipping_days: number | null
                    status: Database["public"]["Enums"]["purchase_status"]
                    store_domain: string
                    store_id: string | null
                    store_name: string
                    total_price: number
                    trust_score: number
                    updated_at: string
                    user_id: string
                }
                Insert: {
                    address_id?: string | null
                    audit_log?: Json | null
                    card_id?: string | null
                    completed_at?: string | null
                    confirmed_at?: string | null
                    created_at?: string
                    error_message?: string | null
                    id?: string
                    order_number?: string | null
                    product_price: number
                    product_title: string
                    product_url: string
                    result_id?: string | null
                    savings?: number | null
                    search_id?: string | null
                    shipping_cost?: number
                    shipping_days?: number | null
                    status?: Database["public"]["Enums"]["purchase_status"]
                    store_domain: string
                    store_id?: string | null
                    store_name: string
                    total_price: number
                    trust_score?: number
                    updated_at?: string
                    user_id: string
                }
                Update: {
                    address_id?: string | null
                    audit_log?: Json | null
                    card_id?: string | null
                    completed_at?: string | null
                    confirmed_at?: string | null
                    created_at?: string
                    error_message?: string | null
                    id?: string
                    order_number?: string | null
                    product_price?: number
                    product_title?: string
                    product_url?: string
                    result_id?: string | null
                    savings?: number | null
                    search_id?: string | null
                    shipping_cost?: number
                    shipping_days?: number | null
                    status?: Database["public"]["Enums"]["purchase_status"]
                    store_domain?: string
                    store_id?: string | null
                    store_name?: string
                    total_price?: number
                    trust_score?: number
                    updated_at?: string
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "purchases_address_id_fkey"
                        columns: ["address_id"]
                        isOneToOne: false
                        referencedRelation: "addresses"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "purchases_card_id_fkey"
                        columns: ["card_id"]
                        isOneToOne: false
                        referencedRelation: "cards"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "purchases_result_id_fkey"
                        columns: ["result_id"]
                        isOneToOne: false
                        referencedRelation: "results"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "purchases_search_id_fkey"
                        columns: ["search_id"]
                        isOneToOne: false
                        referencedRelation: "searches"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "purchases_store_id_fkey"
                        columns: ["store_id"]
                        isOneToOne: false
                        referencedRelation: "stores"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "purchases_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    },
                ]
            }
            results: {
                Row: {
                    available: boolean
                    cash_price: number
                    created_at: string
                    id: string
                    image_url: string | null
                    installment_price: number | null
                    is_best: boolean
                    product_url: string
                    rank: number | null
                    raw_data: Json | null
                    search_id: string
                    shipping_cost: number
                    shipping_days: number | null
                    source: string
                    store_domain: string
                    store_id: string | null
                    store_name: string
                    title: string
                    total_price: number
                    trust_score: number
                }
                Insert: {
                    available?: boolean
                    cash_price: number
                    created_at?: string
                    id?: string
                    image_url?: string | null
                    installment_price?: number | null
                    is_best?: boolean
                    product_url: string
                    rank?: number | null
                    raw_data?: Json | null
                    search_id: string
                    shipping_cost?: number
                    shipping_days?: number | null
                    source: string
                    store_domain: string
                    store_id?: string | null
                    store_name: string
                    title: string
                    total_price: number
                    trust_score?: number
                }
                Update: {
                    available?: boolean
                    cash_price?: number
                    created_at?: string
                    id?: string
                    image_url?: string | null
                    installment_price?: number | null
                    is_best?: boolean
                    product_url?: string
                    rank?: number | null
                    raw_data?: Json | null
                    search_id?: string
                    shipping_cost?: number
                    shipping_days?: number | null
                    source?: string
                    store_domain?: string
                    store_id?: string | null
                    store_name?: string
                    title?: string
                    total_price?: number
                    trust_score?: number
                }
                Relationships: [
                    {
                        foreignKeyName: "results_search_id_fkey"
                        columns: ["search_id"]
                        isOneToOne: false
                        referencedRelation: "searches"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "results_store_id_fkey"
                        columns: ["store_id"]
                        isOneToOne: false
                        referencedRelation: "stores"
                        referencedColumns: ["id"]
                    },
                ]
            }
            searches: {
                Row: {
                    best_price: number | null
                    category: string | null
                    completed_at: string | null
                    created_at: string
                    duration_ms: number | null
                    error_message: string | null
                    id: string
                    identified_product: string | null
                    query: string
                    search_term: string | null
                    sources_queried: Json | null
                    status: Database["public"]["Enums"]["search_status"]
                    total_results: number
                    user_id: string | null
                    worst_price: number | null
                }
                Insert: {
                    best_price?: number | null
                    category?: string | null
                    completed_at?: string | null
                    created_at?: string
                    duration_ms?: number | null
                    error_message?: string | null
                    id?: string
                    identified_product?: string | null
                    query: string
                    search_term?: string | null
                    sources_queried?: Json | null
                    status?: Database["public"]["Enums"]["search_status"]
                    total_results?: number
                    user_id?: string | null
                    worst_price?: number | null
                }
                Update: {
                    best_price?: number | null
                    category?: string | null
                    completed_at?: string | null
                    created_at?: string
                    duration_ms?: number | null
                    error_message?: string | null
                    id?: string
                    identified_product?: string | null
                    query?: string
                    search_term?: string | null
                    sources_queried?: Json | null
                    status?: Database["public"]["Enums"]["search_status"]
                    total_results?: number
                    user_id?: string | null
                    worst_price?: number | null
                }
                Relationships: [
                    {
                        foreignKeyName: "searches_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    },
                ]
            }
            stores: {
                Row: {
                    alerts: Json | null
                    cnpj: string | null
                    cnpj_status: string | null
                    created_at: string
                    domain: string
                    domain_age_years: number | null
                    google_rating: number | null
                    google_reviews: number | null
                    id: string
                    last_verified_at: string | null
                    name: string
                    reclame_aqui_resolved: number | null
                    reclame_aqui_score: number | null
                    ssl_valid: boolean | null
                    trust_level: Database["public"]["Enums"]["trust_level"]
                    trust_score: number
                    updated_at: string
                }
                Insert: {
                    alerts?: Json | null
                    cnpj?: string | null
                    cnpj_status?: string | null
                    created_at?: string
                    domain: string
                    domain_age_years?: number | null
                    google_rating?: number | null
                    google_reviews?: number | null
                    id?: string
                    last_verified_at?: string | null
                    name: string
                    reclame_aqui_resolved?: number | null
                    reclame_aqui_score?: number | null
                    ssl_valid?: boolean | null
                    trust_level?: Database["public"]["Enums"]["trust_level"]
                    trust_score?: number
                    updated_at?: string
                }
                Update: {
                    alerts?: Json | null
                    cnpj?: string | null
                    cnpj_status?: string | null
                    created_at?: string
                    domain?: string
                    domain_age_years?: number | null
                    google_rating?: number | null
                    google_reviews?: number | null
                    id?: string
                    last_verified_at?: string | null
                    name?: string
                    reclame_aqui_resolved?: number | null
                    reclame_aqui_score?: number | null
                    ssl_valid?: boolean | null
                    trust_level?: Database["public"]["Enums"]["trust_level"]
                    trust_score?: number
                    updated_at?: string
                }
                Relationships: []
            }
            users: {
                Row: {
                    auth_id: string | null
                    avatar_url: string | null
                    cpf: string | null
                    created_at: string
                    email: string
                    id: string
                    name: string
                    phone: string | null
                    plan: Database["public"]["Enums"]["user_plan"]
                    searches_limit: number
                    searches_today: number
                    updated_at: string
                }
                Insert: {
                    auth_id?: string | null
                    avatar_url?: string | null
                    cpf?: string | null
                    created_at?: string
                    email: string
                    id?: string
                    name: string
                    phone?: string | null
                    plan?: Database["public"]["Enums"]["user_plan"]
                    searches_limit?: number
                    searches_today?: number
                    updated_at?: string
                }
                Update: {
                    auth_id?: string | null
                    avatar_url?: string | null
                    cpf?: string | null
                    created_at?: string
                    email?: string
                    id?: string
                    name?: string
                    phone?: string | null
                    plan?: Database["public"]["Enums"]["user_plan"]
                    searches_today?: number
                    updated_at?: string
                }
                Relationships: []
            }
            subscriptions: {
                Row: {
                    id: string
                    user_id: string
                    plan: string
                    status: Database["public"]["Enums"]["subscription_status"]
                    pagarme_subscription_id: string | null
                    pagarme_customer_id: string | null
                    card_id: string | null
                    current_period_start: string | null
                    current_period_end: string | null
                    cancelled_at: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    plan?: string
                    status?: Database["public"]["Enums"]["subscription_status"]
                    pagarme_subscription_id?: string | null
                    pagarme_customer_id?: string | null
                    card_id?: string | null
                    current_period_start?: string | null
                    current_period_end?: string | null
                    cancelled_at?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    plan?: string
                    status?: Database["public"]["Enums"]["subscription_status"]
                    pagarme_subscription_id?: string | null
                    pagarme_customer_id?: string | null
                    card_id?: string | null
                    current_period_start?: string | null
                    current_period_end?: string | null
                    cancelled_at?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "subscriptions_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: true
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "subscriptions_card_id_fkey"
                        columns: ["card_id"]
                        isOneToOne: false
                        referencedRelation: "cards"
                        referencedColumns: ["id"]
                    }
                ]
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            alert_status: "active" | "paused" | "triggered" | "expired"
            purchase_status: "pending" | "confirmed" | "processing" | "completed" | "failed" | "cancelled"
            search_status: "pending" | "processing" | "completed" | "failed"
            subscription_status: "active" | "past_due" | "cancelled" | "trialing"
            trust_level: "safe" | "caution" | "risky"
            user_plan: "free" | "pro" | "premium" | "ilimitado" | "enterprise"
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

// Convenience type helpers
type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<T extends keyof DefaultSchema["Tables"]> =
    DefaultSchema["Tables"][T]["Row"]

export type TablesInsert<T extends keyof DefaultSchema["Tables"]> =
    DefaultSchema["Tables"][T]["Insert"]

export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> =
    DefaultSchema["Tables"][T]["Update"]

export type Enums<T extends keyof DefaultSchema["Enums"]> =
    DefaultSchema["Enums"][T]
