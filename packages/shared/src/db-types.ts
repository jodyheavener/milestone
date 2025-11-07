export type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json | undefined }
	| Json[];

export type Database = {
	graphql_public: {
		Tables: {
			[_ in never]: never;
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			graphql: {
				Args: {
					extensions?: Json;
					operationName?: string;
					query?: string;
					variables?: Json;
				};
				Returns: Json;
			};
		};
		Enums: {
			[_ in never]: never;
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
	public: {
		Tables: {
			billing_customers: {
				Row: {
					created_at: string;
					id: string;
					stripe_customer_id: string;
					user_id: string;
				};
				Insert: {
					created_at?: string;
					id?: string;
					stripe_customer_id: string;
					user_id: string;
				};
				Update: {
					created_at?: string;
					id?: string;
					stripe_customer_id?: string;
					user_id?: string;
				};
				Relationships: [];
			};
			content_chunk: {
				Row: {
					chunk_index: number;
					created_at: string;
					embedding: string | null;
					id: string;
					model: string | null;
					project_id: string | null;
					source_id: string;
					source_type: string;
					text: string;
					text_tsv: unknown;
				};
				Insert: {
					chunk_index: number;
					created_at?: string;
					embedding?: string | null;
					id?: string;
					model?: string | null;
					project_id?: string | null;
					source_id: string;
					source_type: string;
					text: string;
					text_tsv?: unknown;
				};
				Update: {
					chunk_index?: number;
					created_at?: string;
					embedding?: string | null;
					id?: string;
					model?: string | null;
					project_id?: string | null;
					source_id?: string;
					source_type?: string;
					text?: string;
					text_tsv?: unknown;
				};
				Relationships: [
					{
						foreignKeyName: "content_chunk_project_id_fkey";
						columns: ["project_id"];
						isOneToOne: false;
						referencedRelation: "project";
						referencedColumns: ["id"];
					},
				];
			};
			context_entry: {
				Row: {
					content: string;
					content_tsv: unknown;
					created_at: string;
					id: string;
					metadata: Json | null;
					updated_at: string;
					user_id: string;
				};
				Insert: {
					content: string;
					content_tsv?: unknown;
					created_at?: string;
					id?: string;
					metadata?: Json | null;
					updated_at?: string;
					user_id: string;
				};
				Update: {
					content?: string;
					content_tsv?: unknown;
					created_at?: string;
					id?: string;
					metadata?: Json | null;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [];
			};
			context_entry_embedding: {
				Row: {
					context_entry_id: string;
					created_at: string;
					embedding: string | null;
					id: string;
					model: string;
					project_id: string | null;
				};
				Insert: {
					context_entry_id: string;
					created_at?: string;
					embedding?: string | null;
					id?: string;
					model: string;
					project_id?: string | null;
				};
				Update: {
					context_entry_id?: string;
					created_at?: string;
					embedding?: string | null;
					id?: string;
					model?: string;
					project_id?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "context_entry_embedding_context_entry_id_fkey";
						columns: ["context_entry_id"];
						isOneToOne: false;
						referencedRelation: "context_entry";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "context_entry_embedding_project_id_fkey";
						columns: ["project_id"];
						isOneToOne: false;
						referencedRelation: "project";
						referencedColumns: ["id"];
					},
				];
			};
			context_entry_project: {
				Row: {
					context_entry_id: string;
					created_at: string;
					project_id: string;
				};
				Insert: {
					context_entry_id: string;
					created_at?: string;
					project_id: string;
				};
				Update: {
					context_entry_id?: string;
					created_at?: string;
					project_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "context_entry_project_context_entry_id_fkey";
						columns: ["context_entry_id"];
						isOneToOne: false;
						referencedRelation: "context_entry";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "context_entry_project_project_id_fkey";
						columns: ["project_id"];
						isOneToOne: false;
						referencedRelation: "project";
						referencedColumns: ["id"];
					},
				];
			};
			conversation: {
				Row: {
					created_at: string;
					id: string;
					project_id: string;
					title: string | null;
					updated_at: string;
				};
				Insert: {
					created_at?: string;
					id?: string;
					project_id: string;
					title?: string | null;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					id?: string;
					project_id?: string;
					title?: string | null;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "conversation_project_id_fkey";
						columns: ["project_id"];
						isOneToOne: false;
						referencedRelation: "project";
						referencedColumns: ["id"];
					},
				];
			};
			conversation_entry: {
				Row: {
					content: string;
					content_tsv: unknown;
					conversation_id: string;
					created_at: string;
					id: string;
					metadata: Json | null;
					role: string;
				};
				Insert: {
					content: string;
					content_tsv?: unknown;
					conversation_id: string;
					created_at?: string;
					id?: string;
					metadata?: Json | null;
					role: string;
				};
				Update: {
					content?: string;
					content_tsv?: unknown;
					conversation_id?: string;
					created_at?: string;
					id?: string;
					metadata?: Json | null;
					role?: string;
				};
				Relationships: [
					{
						foreignKeyName: "conversation_entry_conversation_id_fkey";
						columns: ["conversation_id"];
						isOneToOne: false;
						referencedRelation: "conversation";
						referencedColumns: ["id"];
					},
				];
			};
			conversation_entry_embedding: {
				Row: {
					conversation_entry_id: string;
					created_at: string;
					embedding: string | null;
					id: string;
					model: string;
					project_id: string;
				};
				Insert: {
					conversation_entry_id: string;
					created_at?: string;
					embedding?: string | null;
					id?: string;
					model: string;
					project_id: string;
				};
				Update: {
					conversation_entry_id?: string;
					created_at?: string;
					embedding?: string | null;
					id?: string;
					model?: string;
					project_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "conversation_entry_embedding_conversation_entry_id_fkey";
						columns: ["conversation_entry_id"];
						isOneToOne: false;
						referencedRelation: "conversation_entry";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "conversation_entry_embedding_project_id_fkey";
						columns: ["project_id"];
						isOneToOne: false;
						referencedRelation: "project";
						referencedColumns: ["id"];
					},
				];
			};
			entitlements: {
				Row: {
					agentic_limit: number;
					created_at: string;
					projects_limit: number;
					resets_at: string | null;
					source: Json | null;
					updated_at: string;
					user_id: string;
				};
				Insert: {
					agentic_limit?: number;
					created_at?: string;
					projects_limit?: number;
					resets_at?: string | null;
					source?: Json | null;
					updated_at?: string;
					user_id: string;
				};
				Update: {
					agentic_limit?: number;
					created_at?: string;
					projects_limit?: number;
					resets_at?: string | null;
					source?: Json | null;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [];
			};
			file: {
				Row: {
					context_entry_id: string;
					created_at: string;
					extracted_text: string | null;
					extracted_text_tsv: unknown;
					file_size: number;
					id: string;
					mime_type: string;
					parser: string | null;
					storage_path: string;
				};
				Insert: {
					context_entry_id: string;
					created_at?: string;
					extracted_text?: string | null;
					extracted_text_tsv?: unknown;
					file_size: number;
					id?: string;
					mime_type: string;
					parser?: string | null;
					storage_path: string;
				};
				Update: {
					context_entry_id?: string;
					created_at?: string;
					extracted_text?: string | null;
					extracted_text_tsv?: unknown;
					file_size?: number;
					id?: string;
					mime_type?: string;
					parser?: string | null;
					storage_path?: string;
				};
				Relationships: [
					{
						foreignKeyName: "file_context_entry_id_fkey";
						columns: ["context_entry_id"];
						isOneToOne: false;
						referencedRelation: "context_entry";
						referencedColumns: ["id"];
					},
				];
			};
			profile: {
				Row: {
					created_at: string;
					employer_description: string | null;
					employer_name: string | null;
					employer_website: string | null;
					flags: string[];
					id: string;
					job_title: string | null;
					name: string;
					updated_at: string;
				};
				Insert: {
					created_at?: string;
					employer_description?: string | null;
					employer_name?: string | null;
					employer_website?: string | null;
					flags?: string[];
					id: string;
					job_title?: string | null;
					name: string;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					employer_description?: string | null;
					employer_name?: string | null;
					employer_website?: string | null;
					flags?: string[];
					id?: string;
					job_title?: string | null;
					name?: string;
					updated_at?: string;
				};
				Relationships: [];
			};
			project: {
				Row: {
					created_at: string;
					goal: string;
					id: string;
					title: string;
					updated_at: string;
					user_id: string;
				};
				Insert: {
					created_at?: string;
					goal: string;
					id?: string;
					title: string;
					updated_at?: string;
					user_id: string;
				};
				Update: {
					created_at?: string;
					goal?: string;
					id?: string;
					title?: string;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [];
			};
			search_config: {
				Row: {
					chunk_overlap: number;
					chunk_size: number;
					embedding_dim: number;
					embedding_model: string;
					filters: Json | null;
					id: string;
					project_id: string;
					rerank_model: string | null;
				};
				Insert: {
					chunk_overlap: number;
					chunk_size: number;
					embedding_dim: number;
					embedding_model: string;
					filters?: Json | null;
					id?: string;
					project_id: string;
					rerank_model?: string | null;
				};
				Update: {
					chunk_overlap?: number;
					chunk_size?: number;
					embedding_dim?: number;
					embedding_model?: string;
					filters?: Json | null;
					id?: string;
					project_id?: string;
					rerank_model?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "search_config_project_id_fkey";
						columns: ["project_id"];
						isOneToOne: true;
						referencedRelation: "project";
						referencedColumns: ["id"];
					},
				];
			};
			stripe_prices: {
				Row: {
					created_at: string;
					currency: string;
					id: string;
					metadata: Json | null;
					recurring_interval: string | null;
					stripe_price_id: string;
					stripe_product_id: string;
					type: string;
					unit_amount: number;
					updated_at: string;
					usage_type: string;
				};
				Insert: {
					created_at?: string;
					currency: string;
					id?: string;
					metadata?: Json | null;
					recurring_interval?: string | null;
					stripe_price_id: string;
					stripe_product_id: string;
					type: string;
					unit_amount: number;
					updated_at?: string;
					usage_type?: string;
				};
				Update: {
					created_at?: string;
					currency?: string;
					id?: string;
					metadata?: Json | null;
					recurring_interval?: string | null;
					stripe_price_id?: string;
					stripe_product_id?: string;
					type?: string;
					unit_amount?: number;
					updated_at?: string;
					usage_type?: string;
				};
				Relationships: [
					{
						foreignKeyName: "stripe_prices_stripe_product_id_fkey";
						columns: ["stripe_product_id"];
						isOneToOne: false;
						referencedRelation: "stripe_products";
						referencedColumns: ["id"];
					},
				];
			};
			stripe_products: {
				Row: {
					active: boolean;
					created_at: string;
					description: string | null;
					id: string;
					metadata: Json | null;
					name: string;
					stripe_product_id: string;
					updated_at: string;
				};
				Insert: {
					active?: boolean;
					created_at?: string;
					description?: string | null;
					id?: string;
					metadata?: Json | null;
					name: string;
					stripe_product_id: string;
					updated_at?: string;
				};
				Update: {
					active?: boolean;
					created_at?: string;
					description?: string | null;
					id?: string;
					metadata?: Json | null;
					name?: string;
					stripe_product_id?: string;
					updated_at?: string;
				};
				Relationships: [];
			};
			subscription_items: {
				Row: {
					created_at: string;
					id: string;
					metadata: Json | null;
					quantity: number;
					stripe_price_id: string;
					stripe_subscription_item_id: string;
					subscription_id: string;
					updated_at: string;
					usage_type: string;
				};
				Insert: {
					created_at?: string;
					id?: string;
					metadata?: Json | null;
					quantity?: number;
					stripe_price_id: string;
					stripe_subscription_item_id: string;
					subscription_id: string;
					updated_at?: string;
					usage_type?: string;
				};
				Update: {
					created_at?: string;
					id?: string;
					metadata?: Json | null;
					quantity?: number;
					stripe_price_id?: string;
					stripe_subscription_item_id?: string;
					subscription_id?: string;
					updated_at?: string;
					usage_type?: string;
				};
				Relationships: [
					{
						foreignKeyName: "subscription_items_stripe_price_id_fkey";
						columns: ["stripe_price_id"];
						isOneToOne: false;
						referencedRelation: "stripe_prices";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "subscription_items_subscription_id_fkey";
						columns: ["subscription_id"];
						isOneToOne: false;
						referencedRelation: "subscriptions";
						referencedColumns: ["id"];
					},
				];
			};
			subscriptions: {
				Row: {
					cancel_at_period_end: boolean;
					created_at: string;
					current_period_end: string | null;
					current_period_start: string | null;
					id: string;
					status: string;
					stripe_subscription_id: string;
					updated_at: string;
					user_id: string;
				};
				Insert: {
					cancel_at_period_end?: boolean;
					created_at?: string;
					current_period_end?: string | null;
					current_period_start?: string | null;
					id?: string;
					status: string;
					stripe_subscription_id: string;
					updated_at?: string;
					user_id: string;
				};
				Update: {
					cancel_at_period_end?: boolean;
					created_at?: string;
					current_period_end?: string | null;
					current_period_start?: string | null;
					id?: string;
					status?: string;
					stripe_subscription_id?: string;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [];
			};
			task: {
				Row: {
					completed_at: string | null;
					created_at: string;
					description: string;
					id: string;
					project_id: string;
					updated_at: string;
				};
				Insert: {
					completed_at?: string | null;
					created_at?: string;
					description: string;
					id?: string;
					project_id: string;
					updated_at?: string;
				};
				Update: {
					completed_at?: string | null;
					created_at?: string;
					description?: string;
					id?: string;
					project_id?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "task_project_id_fkey";
						columns: ["project_id"];
						isOneToOne: false;
						referencedRelation: "project";
						referencedColumns: ["id"];
					},
				];
			};
			usage_counters: {
				Row: {
					agentic_requests_used: number;
					created_at: string;
					period_end: string;
					period_start: string;
					projects_used: number;
					updated_at: string;
					user_id: string;
				};
				Insert: {
					agentic_requests_used?: number;
					created_at?: string;
					period_end: string;
					period_start: string;
					projects_used?: number;
					updated_at?: string;
					user_id: string;
				};
				Update: {
					agentic_requests_used?: number;
					created_at?: string;
					period_end?: string;
					period_start?: string;
					projects_used?: number;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [];
			};
			usage_events: {
				Row: {
					created_at: string;
					delta: number;
					id: string;
					op_type: string;
					subscription_item_id: string | null;
					user_id: string;
				};
				Insert: {
					created_at?: string;
					delta?: number;
					id?: string;
					op_type: string;
					subscription_item_id?: string | null;
					user_id: string;
				};
				Update: {
					created_at?: string;
					delta?: number;
					id?: string;
					op_type?: string;
					subscription_item_id?: string | null;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "usage_events_subscription_item_id_fkey";
						columns: ["subscription_item_id"];
						isOneToOne: false;
						referencedRelation: "subscription_items";
						referencedColumns: ["id"];
					},
				];
			};
			website: {
				Row: {
					address: string;
					context_entry_id: string;
					created_at: string;
					extracted_content: string | null;
					extracted_content_tsv: unknown;
					id: string;
					last_updated_at: string | null;
					page_title: string | null;
				};
				Insert: {
					address: string;
					context_entry_id: string;
					created_at?: string;
					extracted_content?: string | null;
					extracted_content_tsv?: unknown;
					id?: string;
					last_updated_at?: string | null;
					page_title?: string | null;
				};
				Update: {
					address?: string;
					context_entry_id?: string;
					created_at?: string;
					extracted_content?: string | null;
					extracted_content_tsv?: unknown;
					id?: string;
					last_updated_at?: string | null;
					page_title?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "website_context_entry_id_fkey";
						columns: ["context_entry_id"];
						isOneToOne: false;
						referencedRelation: "context_entry";
						referencedColumns: ["id"];
					},
				];
			};
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			authorize_operation: {
				Args: { p_op_type: string; p_user_id: string };
				Returns: Json;
			};
			cleanup_files_job: { Args: never; Returns: undefined };
			delete_user: { Args: never; Returns: undefined };
			get_search_config: {
				Args: { project_id: string };
				Returns: {
					chunk_overlap: number;
					chunk_size: number;
					embedding_dim: number;
					embedding_model: string;
					filters: Json;
					id: string;
					rerank_model: string;
				}[];
			};
			init_search_config: {
				Args: {
					chunk_overlap?: number;
					chunk_size?: number;
					embedding_dim?: number;
					embedding_model?: string;
					filters?: Json;
					project_id: string;
					rerank_model?: string;
				};
				Returns: string;
			};
			search_content_chunks: {
				Args: {
					match_count?: number;
					match_threshold?: number;
					project_id: string;
					query_embedding: string;
					source_types?: string[];
				};
				Returns: {
					chunk_index: number;
					id: string;
					metadata: Json;
					similarity: number;
					source_id: string;
					source_type: string;
					text: string;
				}[];
			};
			search_content_hybrid: {
				Args: {
					match_count?: number;
					match_threshold?: number;
					project_id: string;
					query_text: string;
					source_types?: string[];
					text_weight?: number;
					vector_weight?: number;
				};
				Returns: {
					chunk_index: number;
					id: string;
					metadata: Json;
					similarity: number;
					source_id: string;
					source_type: string;
					text: string;
				}[];
			};
			search_similar_context_entries: {
				Args: {
					exclude_context_entry_id?: string;
					match_count?: number;
					match_threshold?: number;
					project_id: string;
					query_embedding: string;
				};
				Returns: {
					content: string;
					context_entry_id: string;
					id: string;
					metadata: Json;
					similarity: number;
				}[];
			};
			sync_stripe_catalog: { Args: never; Returns: undefined };
		};
		Enums: {
			[_ in never]: never;
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
	keyof Database,
	"public"
>];

export type Tables<
	DefaultSchemaTableNameOrOptions extends
		| keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
				DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
			DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
			Row: infer R;
		}
		? R
		: never
	: DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
				DefaultSchema["Views"])
		? (DefaultSchema["Tables"] &
				DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
				Row: infer R;
			}
			? R
			: never
		: never;

export type TablesInsert<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema["Tables"]
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
			Insert: infer I;
		}
		? I
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
		? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
				Insert: infer I;
			}
			? I
			: never
		: never;

export type TablesUpdate<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema["Tables"]
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
			Update: infer U;
		}
		? U
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
		? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
				Update: infer U;
			}
			? U
			: never
		: never;

export type Enums<
	DefaultSchemaEnumNameOrOptions extends
		| keyof DefaultSchema["Enums"]
		| { schema: keyof DatabaseWithoutInternals },
	EnumName extends DefaultSchemaEnumNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
		: never = never,
> = DefaultSchemaEnumNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
	: DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
		? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
		: never;

export type CompositeTypes<
	PublicCompositeTypeNameOrOptions extends
		| keyof DefaultSchema["CompositeTypes"]
		| { schema: keyof DatabaseWithoutInternals },
	CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
		: never = never,
> = PublicCompositeTypeNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
	: PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
		? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
		: never;

export const Constants = {
	graphql_public: {
		Enums: {},
	},
	public: {
		Enums: {},
	},
} as const;
