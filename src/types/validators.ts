import { z } from 'zod'
import type {
  UserRole,
  AIModel,
  AITone,
  AIFocusMode,
  AppointmentStatus,
  ConversationStatus,
  LeadPriority,
  MessageType,
  BillingCycle,
} from './database.types'

// ============================================================
// SHARED VALIDATORS
// ============================================================

export const uuidSchema = z.string().uuid()
export const phoneSchema = z.string().regex(/^\+?[1-9]\d{7,14}$/, 'Número de teléfono inválido')
export const emailSchema = z.string().email('Email inválido').toLowerCase()
export const urlSchema = z.string().url('URL inválida')
export const colorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color hex inválido')
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

// ============================================================
// PLAN LIMITS
// ============================================================

export const planLimitsSchema = z.object({
  instances: z.number().int().min(-1),
  messages_per_month: z.number().int().min(-1),
  operators: z.number().int().min(-1),
  storage_gb: z.number().min(0),
  ai_responses_per_hour: z.number().int().min(-1),
  knowledge_base_docs: z.number().int().min(-1),
  kanban_columns: z.number().int().min(-1),
})

// ============================================================
// PLAN VALIDATORS
// ============================================================

export const createPlanSchema = z.object({
  name: z.string().min(2).max(50).toLowerCase(),
  display_name: z.string().min(2).max(100),
  price_monthly: z.number().min(0),
  price_yearly: z.number().min(0),
  stripe_price_id_monthly: z.string().optional(),
  stripe_price_id_yearly: z.string().optional(),
  limits: planLimitsSchema,
  features: z.array(z.string().max(200)),
  trial_days: z.number().int().min(0).max(365).default(14),
  sort_order: z.number().int().default(0),
})

export const updatePlanSchema = createPlanSchema.partial()

// ============================================================
// ORGANIZATION VALIDATORS
// ============================================================

export const createOrganizationSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  slug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug solo puede contener letras minúsculas, números y guiones')
    .optional(), // auto-generated if not provided
  timezone: z.string().default('America/Mexico_City'),
  locale: z.enum(['es', 'en']).default('es'),
  website: urlSchema.optional().or(z.literal('')),
})

export const updateOrganizationSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  logo_url: urlSchema.optional(),
  website: urlSchema.optional().or(z.literal('')),
  timezone: z.string().optional(),
  locale: z.enum(['es', 'en']).optional(),
  metadata: z.record(z.unknown()).optional(),
})

// ============================================================
// USER VALIDATORS
// ============================================================

export const registerSchema = z
  .object({
    email: emailSchema,
    password: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
      .regex(/[0-9]/, 'Debe contener al menos un número'),
    confirm_password: z.string(),
    full_name: z.string().min(2).max(100).trim(),
    org_name: z.string().min(2).max(100).trim(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm_password'],
  })

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'La contraseña es requerida'),
})

export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
      .regex(/[0-9]/, 'Debe contener al menos un número'),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm_password'],
  })

export const updateUserSchema = z.object({
  full_name: z.string().min(2).max(100).trim().optional(),
  avatar_url: urlSchema.optional(),
  notification_prefs: z
    .object({
      email_new_message: z.boolean(),
      email_appointment_reminder: z.boolean(),
      browser_push: z.boolean(),
    })
    .optional(),
})

export const inviteUserSchema = z.object({
  email: emailSchema,
  role: z.enum(['admin', 'operator'] as const),
})

export const changeUserRoleSchema = z.object({
  user_id: uuidSchema,
  role: z.enum(['admin', 'operator'] as const),
})

// ============================================================
// WHATSAPP INSTANCE VALIDATORS
// ============================================================

export const createInstanceSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  display_name: z.string().min(2).max(100).trim().optional(),
})

export const updateInstanceSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  display_name: z.string().min(2).max(100).trim().optional(),
  is_ai_enabled: z.boolean().optional(),
})

// ============================================================
// AI CONFIG VALIDATORS
// ============================================================

const aiModelValues: AIModel[] = ['gpt-4o', 'gpt-4o-mini', 'gemini-1.5-flash', 'gemini-1.5-pro']
const aiToneValues: AITone[] = ['friendly', 'professional', 'formal']
const aiFocusModeValues: AIFocusMode[] = ['attention', 'scheduling', 'both']

export const updateAIConfigSchema = z.object({
  model: z.enum(aiModelValues as [AIModel, ...AIModel[]]).optional(),
  tone: z.enum(aiToneValues as [AITone, ...AITone[]]).optional(),
  focus_mode: z.enum(aiFocusModeValues as [AIFocusMode, ...AIFocusMode[]]).optional(),
  system_prompt: z.string().max(4000).optional(),
  context_messages: z.number().int().min(1).max(50).optional(),
  temperature: z.number().min(0).max(2).optional(),
  transfer_keywords: z.array(z.string().max(50)).max(20).optional(),
  is_active: z.boolean().optional(),
  welcome_message: z.string().max(1000).optional(),
  fallback_message: z.string().max(1000).optional(),
})

// ============================================================
// CONTACT VALIDATORS
// ============================================================

export const createContactSchema = z.object({
  phone_number: phoneSchema,
  name: z.string().min(1).max(200).trim().optional(),
  email: emailSchema.optional(),
  tags: z.array(z.string().max(50)).max(20).default([]),
  notes: z.string().max(5000).optional(),
  metadata: z.record(z.unknown()).default({}),
})

export const updateContactSchema = createContactSchema.partial().extend({
  is_blocked: z.boolean().optional(),
})

export const searchContactsSchema = z.object({
  q: z.string().max(200).optional(),
  tags: z.array(z.string()).optional(),
  is_blocked: z.boolean().optional(),
  ...paginationSchema.shape,
})

// ============================================================
// CONVERSATION VALIDATORS
// ============================================================

const conversationStatusValues: ConversationStatus[] = ['open', 'pending', 'closed']

export const updateConversationSchema = z.object({
  status: z.enum(conversationStatusValues as [ConversationStatus, ...ConversationStatus[]]).optional(),
  assigned_to: uuidSchema.optional().nullable(),
  is_ai_active: z.boolean().optional(),
})

export const filterConversationsSchema = z.object({
  status: z.enum(conversationStatusValues as [ConversationStatus, ...ConversationStatus[]]).optional(),
  instance_id: uuidSchema.optional(),
  assigned_to: uuidSchema.optional(),
  unread_only: z.coerce.boolean().optional(),
  q: z.string().max(200).optional(),
  ...paginationSchema.shape,
})

// ============================================================
// MESSAGE VALIDATORS
// ============================================================

export const sendTextMessageSchema = z.object({
  conversation_id: uuidSchema,
  content: z.string().min(1).max(4096).trim(),
  is_internal_note: z.boolean().default(false),
})

export const sendMediaMessageSchema = z.object({
  conversation_id: uuidSchema,
  message_type: z.enum(['image', 'audio', 'document', 'video'] as const),
  media_url: urlSchema,
  media_filename: z.string().max(255).optional(),
  content: z.string().max(1024).optional(), // caption
})

// ============================================================
// KNOWLEDGE BASE VALIDATORS
// ============================================================

export const uploadKnowledgeDocSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  instance_id: uuidSchema.optional(), // null = global for org
  is_active: z.boolean().default(true),
})

// ============================================================
// SERVICE VALIDATORS
// ============================================================

export const createServiceSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  description: z.string().max(1000).optional(),
  duration_min: z.number().int().min(5).max(480),
  price: z.number().min(0).optional(),
  color: colorSchema.default('#6366f1'),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
})

export const updateServiceSchema = createServiceSchema.partial()

// ============================================================
// BUSINESS HOURS VALIDATORS
// ============================================================

export const businessHourSchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  open_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato HH:MM inválido'),
  close_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato HH:MM inválido'),
  is_active: z.boolean(),
})

export const updateBusinessHoursSchema = z.object({
  hours: z.array(businessHourSchema).min(1).max(7),
})

export const createBlockedDaySchema = z.object({
  blocked_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD inválido'),
  reason: z.string().max(200).optional(),
})

// ============================================================
// APPOINTMENT VALIDATORS
// ============================================================

const appointmentStatusValues: AppointmentStatus[] = [
  'pending', 'confirmed', 'cancelled', 'completed', 'no_show',
]

export const createAppointmentSchema = z
  .object({
    contact_id: uuidSchema,
    service_id: uuidSchema.optional(),
    assigned_to: uuidSchema.optional(),
    instance_id: uuidSchema.optional(),
    conversation_id: uuidSchema.optional(),
    title: z.string().min(1).max(200).trim(),
    notes: z.string().max(2000).optional(),
    start_at: z.string().datetime({ message: 'Fecha de inicio inválida' }),
    end_at: z.string().datetime({ message: 'Fecha de fin inválida' }),
    timezone: z.string().default('America/Mexico_City'),
  })
  .refine((data) => new Date(data.end_at) > new Date(data.start_at), {
    message: 'La fecha de fin debe ser posterior a la de inicio',
    path: ['end_at'],
  })

export const updateAppointmentSchema = z.object({
  status: z.enum(appointmentStatusValues as [AppointmentStatus, ...AppointmentStatus[]]).optional(),
  start_at: z.string().datetime().optional(),
  end_at: z.string().datetime().optional(),
  title: z.string().min(1).max(200).trim().optional(),
  notes: z.string().max(2000).optional(),
  assigned_to: uuidSchema.optional(),
  cancellation_reason: z.string().max(500).optional(),
})

export const filterAppointmentsSchema = z.object({
  status: z.enum(appointmentStatusValues as [AppointmentStatus, ...AppointmentStatus[]]).optional(),
  service_id: uuidSchema.optional(),
  assigned_to: uuidSchema.optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  ...paginationSchema.shape,
})

// ============================================================
// KANBAN VALIDATORS
// ============================================================

export const createKanbanColumnSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  color: colorSchema.default('#6366f1'),
  position: z.number().int().min(0).default(0),
})

export const updateKanbanColumnSchema = createKanbanColumnSchema.partial()

export const reorderKanbanColumnsSchema = z.object({
  columns: z.array(
    z.object({
      id: uuidSchema,
      position: z.number().int().min(0),
    })
  ).min(1),
})

const leadPriorityValues: LeadPriority[] = ['low', 'medium', 'high', 'urgent']

export const createLeadSchema = z.object({
  column_id: uuidSchema,
  contact_id: uuidSchema,
  instance_id: uuidSchema.optional(),
  assigned_to: uuidSchema.optional(),
  title: z.string().max(200).trim().optional(),
  estimated_value: z.number().min(0).optional(),
  priority: z.enum(leadPriorityValues as [LeadPriority, ...LeadPriority[]]).default('medium'),
  tags: z.array(z.string().max(50)).max(20).default([]),
  metadata: z.record(z.unknown()).default({}),
})

export const updateLeadSchema = createLeadSchema.partial()

export const moveLeadSchema = z.object({
  lead_id: uuidSchema,
  column_id: uuidSchema,
  position: z.number().min(0),
})

// ============================================================
// FEATURE REQUEST VALIDATORS
// ============================================================

export const createFeatureRequestSchema = z.object({
  title: z.string().min(5).max(200).trim(),
  description: z.string().max(2000).optional(),
})

// ============================================================
// SUBSCRIPTION VALIDATORS
// ============================================================

const billingCycleValues: BillingCycle[] = ['monthly', 'yearly']

export const createCheckoutSchema = z.object({
  plan_id: uuidSchema,
  billing_cycle: z.enum(billingCycleValues as [BillingCycle, ...BillingCycle[]]),
})

// ============================================================
// ANALYTICS VALIDATORS
// ============================================================

export const analyticsDateRangeSchema = z.object({
  date_from: z.string().datetime(),
  date_to: z.string().datetime(),
})

export const exportDataSchema = z.object({
  entity: z.enum(['conversations', 'contacts', 'appointments']),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
})

// ============================================================
// WEBHOOK VALIDATORS
// ============================================================

export const evolutionWebhookSchema = z.object({
  event: z.string(),
  instance: z.string(),
  data: z.record(z.unknown()),
  destination: z.string().optional(),
  date_time: z.string().optional(),
  sender: z.string().optional(),
  server_url: z.string().optional(),
  apikey: z.string().optional(),
})

export const stripeWebhookSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.object({
    object: z.record(z.unknown()),
  }),
})

// ============================================================
// ONBOARDING VALIDATORS
// ============================================================

export const onboardingStep1Schema = z.object({
  org_name: z.string().min(2).max(100).trim(),
  timezone: z.string().default('America/Mexico_City'),
})

export const onboardingStep2Schema = z.object({
  instance_name: z.string().min(2).max(100).trim(),
})

export const onboardingStep3Schema = updateAIConfigSchema

export const onboardingStep4Schema = z.object({
  invites: z.array(
    z.object({
      email: emailSchema,
      role: z.enum(['admin', 'operator'] as const),
    })
  ).max(10),
})

// ============================================================
// INFERRED TYPES from Zod schemas
// ============================================================

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type InviteUserInput = z.infer<typeof inviteUserSchema>
export type CreateInstanceInput = z.infer<typeof createInstanceSchema>
export type UpdateAIConfigInput = z.infer<typeof updateAIConfigSchema>
export type CreateContactInput = z.infer<typeof createContactSchema>
export type UpdateContactInput = z.infer<typeof updateContactSchema>
export type SendTextMessageInput = z.infer<typeof sendTextMessageSchema>
export type SendMediaMessageInput = z.infer<typeof sendMediaMessageSchema>
export type CreateServiceInput = z.infer<typeof createServiceSchema>
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>
export type CreateKanbanColumnInput = z.infer<typeof createKanbanColumnSchema>
export type CreateLeadInput = z.infer<typeof createLeadSchema>
export type MoveLeadInput = z.infer<typeof moveLeadSchema>
export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>
export type EvolutionWebhookPayload = z.infer<typeof evolutionWebhookSchema>
export type OnboardingStep1Input = z.infer<typeof onboardingStep1Schema>
export type OnboardingStep2Input = z.infer<typeof onboardingStep2Schema>
export type OnboardingStep4Input = z.infer<typeof onboardingStep4Schema>
