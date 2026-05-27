/**
 * WazzAI — Core Database Types
 * Derived from Supabase schema
 * ============================================================
 */

// ============================================================
// ENUMS
// ============================================================

export type UserRole = 'owner' | 'admin' | 'operator'

export type ConversationStatus = 'open' | 'pending' | 'closed'

export type MessageType =
  | 'text'
  | 'image'
  | 'audio'
  | 'document'
  | 'video'
  | 'sticker'
  | 'location'
  | 'contact'
  | 'reaction'

export type MessageDirection = 'inbound' | 'outbound' | 'ai'

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed'

export type AIModel =
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'gemini-1.5-flash'
  | 'gemini-1.5-pro'

export type AITone = 'friendly' | 'professional' | 'formal'

export type AIFocusMode = 'attention' | 'scheduling' | 'both'

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'no_show'

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'paused'

export type FeatureRequestStatus =
  | 'planned'
  | 'in_progress'
  | 'done'
  | 'rejected'

export type WhatsAppInstanceStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'qr_code'

export type LeadPriority = 'low' | 'medium' | 'high' | 'urgent'

export type AuditAction =
  | 'user.login'
  | 'user.logout'
  | 'user.invite'
  | 'user.remove'
  | 'instance.create'
  | 'instance.delete'
  | 'instance.connect'
  | 'instance.disconnect'
  | 'conversation.assign'
  | 'conversation.close'
  | 'conversation.reopen'
  | 'ai.config.update'
  | 'knowledge.upload'
  | 'knowledge.delete'
  | 'appointment.create'
  | 'appointment.update'
  | 'appointment.cancel'
  | 'subscription.upgrade'
  | 'subscription.cancel'
  | 'subscription.reactivate'
  | 'org.suspend'
  | 'org.activate'
  | 'org.settings.update'
  | 'plan.create'
  | 'plan.update'

// ============================================================
// PLAN LIMITS (JSONB shape)
// ============================================================

export interface PlanLimits {
  /** Number of WhatsApp instances. -1 = unlimited */
  instances: number
  /** Messages per month. -1 = unlimited */
  messages_per_month: number
  /** Team operators. -1 = unlimited */
  operators: number
  /** Storage in GB */
  storage_gb: number
  /** AI responses per hour. -1 = unlimited */
  ai_responses_per_hour: number
  /** Number of knowledge base documents. -1 = unlimited */
  knowledge_base_docs: number
  /** Number of Kanban columns. -1 = unlimited */
  kanban_columns: number
}

// ============================================================
// PLANS
// ============================================================

export interface Plan {
  id: string
  name: string
  display_name: string
  price_monthly: number
  price_yearly: number
  stripe_price_id_monthly: string | null
  stripe_price_id_yearly: string | null
  limits: PlanLimits
  features: string[]
  is_active: boolean
  trial_days: number
  sort_order: number
  created_at: string
  updated_at: string
}

// ============================================================
// ORGANIZATIONS
// ============================================================

export interface Organization {
  id: string
  name: string
  slug: string
  plan_id: string | null
  logo_url: string | null
  website: string | null
  timezone: string
  locale: string
  is_active: boolean
  is_suspended: boolean
  suspension_reason: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  // Joined
  plan?: Plan
  subscription?: Subscription
}

// ============================================================
// USERS
// ============================================================

export interface NotificationPrefs {
  email_new_message: boolean
  email_appointment_reminder: boolean
  browser_push: boolean
}

export interface User {
  id: string
  org_id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  is_active: boolean
  last_seen_at: string | null
  notification_prefs: NotificationPrefs
  created_at: string
  updated_at: string
  // Joined
  organization?: Organization
}

// ============================================================
// SUBSCRIPTIONS
// ============================================================

export type BillingCycle = 'monthly' | 'yearly'

export interface Subscription {
  id: string
  org_id: string
  plan_id: string
  stripe_sub_id: string | null
  stripe_customer_id: string | null
  status: SubscriptionStatus
  billing_cycle: BillingCycle
  current_period_start: string | null
  current_period_end: string | null
  trial_start: string
  trial_end: string
  canceled_at: string | null
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
  // Joined
  plan?: Plan
}

// ============================================================
// WHATSAPP INSTANCES
// ============================================================

export interface WhatsAppInstance {
  id: string
  org_id: string
  name: string
  display_name: string | null
  phone_number: string | null
  evolution_instance_id: string | null
  status: WhatsAppInstanceStatus
  qr_code: string | null
  webhook_secret: string
  is_ai_enabled: boolean
  is_active: boolean
  connected_at: string | null
  disconnected_at: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  // Joined
  ai_config?: AIConfig
}

// ============================================================
// AI CONFIGS
// ============================================================

export interface AIConfig {
  id: string
  instance_id: string
  org_id: string
  model: AIModel
  tone: AITone
  focus_mode: AIFocusMode
  system_prompt: string | null
  context_messages: number
  temperature: number
  transfer_keywords: string[]
  is_active: boolean
  welcome_message: string | null
  fallback_message: string | null
  created_at: string
  updated_at: string
}

// ============================================================
// CONTACTS
// ============================================================

export interface Contact {
  id: string
  org_id: string
  phone_number: string
  name: string | null
  email: string | null
  avatar_url: string | null
  tags: string[]
  notes: string | null
  metadata: Record<string, unknown>
  is_blocked: boolean
  last_contact_at: string | null
  created_at: string
  updated_at: string
}

// ============================================================
// CONVERSATIONS
// ============================================================

export interface Conversation {
  id: string
  org_id: string
  instance_id: string
  contact_id: string
  assigned_to: string | null
  status: ConversationStatus
  is_ai_active: boolean
  unread_count: number
  last_message_at: string | null
  last_message_preview: string | null
  closed_at: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  // Joined
  contact?: Contact
  assigned_user?: User
  instance?: WhatsAppInstance
  messages?: Message[]
}

// ============================================================
// MESSAGES
// ============================================================

export interface Message {
  id: string
  conversation_id: string
  org_id: string
  sender_id: string | null
  evolution_msg_id: string | null
  direction: MessageDirection
  message_type: MessageType
  content: string | null
  media_url: string | null
  media_mime_type: string | null
  media_size_bytes: number | null
  media_filename: string | null
  status: MessageStatus
  is_internal_note: boolean
  is_deleted: boolean
  metadata: Record<string, unknown>
  sent_at: string
  delivered_at: string | null
  read_at: string | null
  created_at: string
  // Joined
  sender?: User
}

// ============================================================
// KNOWLEDGE BASE
// ============================================================

export interface KnowledgeBaseDocument {
  id: string
  org_id: string
  instance_id: string | null
  title: string
  content: string
  embedding: number[] | null
  source_filename: string | null
  source_url: string | null
  chunk_index: number
  total_chunks: number
  metadata: Record<string, unknown>
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface MatchDocumentResult {
  id: string
  title: string
  content: string
  similarity: number
  metadata: Record<string, unknown>
}

// ============================================================
// SERVICES
// ============================================================

export interface Service {
  id: string
  org_id: string
  name: string
  description: string | null
  duration_min: number
  price: number | null
  color: string
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

// ============================================================
// BUSINESS HOURS
// ============================================================

export interface BusinessHour {
  id: string
  instance_id: string
  org_id: string
  day_of_week: 0 | 1 | 2 | 3 | 4 | 5 | 6  // 0=Sunday
  open_time: string    // HH:MM
  close_time: string   // HH:MM
  is_active: boolean
  created_at: string
  updated_at: string
}

// ============================================================
// BLOCKED DAYS
// ============================================================

export interface BlockedDay {
  id: string
  instance_id: string
  org_id: string
  blocked_date: string  // YYYY-MM-DD
  reason: string | null
  created_at: string
}

// ============================================================
// APPOINTMENTS
// ============================================================

export interface Appointment {
  id: string
  org_id: string
  contact_id: string
  service_id: string | null
  assigned_to: string | null
  instance_id: string | null
  conversation_id: string | null
  title: string
  notes: string | null
  start_at: string
  end_at: string
  timezone: string
  status: AppointmentStatus
  reminder_24h_sent: boolean
  reminder_1h_sent: boolean
  cancellation_reason: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  // Joined
  contact?: Contact
  service?: Service
  assigned_user?: User
}

// ============================================================
// KANBAN
// ============================================================

export interface KanbanColumn {
  id: string
  org_id: string
  name: string
  color: string
  position: number
  is_default: boolean
  created_at: string
  updated_at: string
  // Joined
  leads?: Lead[]
}

export interface Lead {
  id: string
  org_id: string
  column_id: string
  contact_id: string
  instance_id: string | null
  assigned_to: string | null
  title: string | null
  estimated_value: number | null
  priority: LeadPriority
  tags: string[]
  position: number
  metadata: Record<string, unknown>
  last_activity_at: string
  created_at: string
  updated_at: string
  // Joined
  contact?: Contact
  assigned_user?: User
  column?: KanbanColumn
}

// ============================================================
// FEATURE REQUESTS
// ============================================================

export interface FeatureRequest {
  id: string
  title: string
  description: string | null
  status: FeatureRequestStatus
  votes: number
  created_by: string | null
  created_at: string
  updated_at: string
  // Joined
  creator?: User
  has_voted?: boolean  // computed for current user
}

export interface FeatureRequestVote {
  feature_request_id: string
  user_id: string
  created_at: string
}

// ============================================================
// AUDIT LOGS
// ============================================================

export interface AuditLog {
  id: string
  org_id: string | null
  user_id: string | null
  action: AuditAction
  target_type: string | null
  target_id: string | null
  metadata: Record<string, unknown>
  ip_address: string | null
  user_agent: string | null
  created_at: string
  // Joined
  user?: User
}

// ============================================================
// INVITATIONS
// ============================================================

export interface Invitation {
  id: string
  org_id: string
  email: string
  role: UserRole
  token: string
  invited_by: string | null
  accepted_at: string | null
  expires_at: string
  created_at: string
  // Joined
  invited_by_user?: User
  organization?: Organization
}

// ============================================================
// USAGE COUNTERS
// ============================================================

export interface UsageCounter {
  id: string
  org_id: string
  period_start: string  // YYYY-MM-DD
  period_end: string    // YYYY-MM-DD
  messages_count: number
  ai_responses: number
  storage_bytes: number
  created_at: string
  updated_at: string
}

// ============================================================
// ANALYTICS
// ============================================================

export interface ConversationMetrics {
  total_conversations: number
  open_conversations: number
  pending_conversations: number
  closed_conversations: number
  ai_resolved: number
  avg_resolution_time_min: number | null
  total_messages: number
  inbound_messages: number
  outbound_messages: number
  ai_messages: number
}

export interface MessagePerDay {
  message_date: string  // YYYY-MM-DD
  total: number
  inbound: number
  outbound: number
  ai: number
}

// ============================================================
// SUPABASE DATABASE TYPE (for client inference)
// ============================================================

export type Database = {
  public: {
    Tables: {
      plans: { Row: Plan; Insert: Partial<Plan>; Update: Partial<Plan> }
      organizations: { Row: Organization; Insert: Partial<Organization>; Update: Partial<Organization> }
      users: { Row: User; Insert: Partial<User>; Update: Partial<User> }
      subscriptions: { Row: Subscription; Insert: Partial<Subscription>; Update: Partial<Subscription> }
      whatsapp_instances: { Row: WhatsAppInstance; Insert: Partial<WhatsAppInstance>; Update: Partial<WhatsAppInstance> }
      ai_configs: { Row: AIConfig; Insert: Partial<AIConfig>; Update: Partial<AIConfig> }
      contacts: { Row: Contact; Insert: Partial<Contact>; Update: Partial<Contact> }
      conversations: { Row: Conversation; Insert: Partial<Conversation>; Update: Partial<Conversation> }
      messages: { Row: Message; Insert: Partial<Message>; Update: Partial<Message> }
      knowledge_base: { Row: KnowledgeBaseDocument; Insert: Partial<KnowledgeBaseDocument>; Update: Partial<KnowledgeBaseDocument> }
      services: { Row: Service; Insert: Partial<Service>; Update: Partial<Service> }
      business_hours: { Row: BusinessHour; Insert: Partial<BusinessHour>; Update: Partial<BusinessHour> }
      blocked_days: { Row: BlockedDay; Insert: Partial<BlockedDay>; Update: Partial<BlockedDay> }
      appointments: { Row: Appointment; Insert: Partial<Appointment>; Update: Partial<Appointment> }
      kanban_columns: { Row: KanbanColumn; Insert: Partial<KanbanColumn>; Update: Partial<KanbanColumn> }
      leads: { Row: Lead; Insert: Partial<Lead>; Update: Partial<Lead> }
      feature_requests: { Row: FeatureRequest; Insert: Partial<FeatureRequest>; Update: Partial<FeatureRequest> }
      feature_request_votes: { Row: FeatureRequestVote; Insert: Partial<FeatureRequestVote>; Update: Partial<FeatureRequestVote> }
      audit_logs: { Row: AuditLog; Insert: Partial<AuditLog>; Update: Partial<AuditLog> }
      invitations: { Row: Invitation; Insert: Partial<Invitation>; Update: Partial<Invitation> }
      usage_counters: { Row: UsageCounter; Insert: Partial<UsageCounter>; Update: Partial<UsageCounter> }
    }
    Functions: {
      match_documents: {
        Args: {
          query_embedding: number[]
          match_threshold?: number
          match_count?: number
          p_org_id?: string
          p_instance_id?: string
        }
        Returns: MatchDocumentResult[]
      }
      get_conversation_metrics: {
        Args: { p_org_id: string; p_date_from: string; p_date_to: string }
        Returns: ConversationMetrics[]
      }
      get_messages_per_day: {
        Args: { p_org_id: string; p_days_back?: number }
        Returns: MessagePerDay[]
      }
      auto_close_inactive_conversations: {
        Args: { inactivity_hours?: number }
        Returns: { closed_count: number }[]
      }
      increment_usage: {
        Args: {
          p_org_id: string
          p_messages?: number
          p_ai_responses?: number
          p_storage_bytes?: number
        }
        Returns: void
      }
      toggle_feature_vote: {
        Args: { p_feature_id: string; p_user_id: string }
        Returns: boolean
      }
    }
  }
}
