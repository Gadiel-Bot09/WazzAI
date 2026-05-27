import { describe, it, expect } from 'vitest'
import {
  registerSchema,
  loginSchema,
  createOrganizationSchema,
  createContactSchema,
  createAppointmentSchema,
  createInstanceSchema,
  updateAIConfigSchema,
  createServiceSchema,
  businessHourSchema,
  moveLeadSchema,
  planLimitsSchema,
} from '@/types/validators'
import {
  generateSlug,
  isLimitExceeded,
  formatBytes,
  sanitizePhone,
  phoneToJid,
  jidToPhone,
} from '@/lib/utils/server'

// ============================================================
// VALIDATOR TESTS
// ============================================================

describe('registerSchema', () => {
  it('accepts valid registration data', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'Secure123',
      confirm_password: 'Secure123',
      full_name: 'Juan García',
      org_name: 'Mi Empresa',
    })
    expect(result.success).toBe(true)
  })

  it('rejects mismatched passwords', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'Secure123',
      confirm_password: 'Different123',
      full_name: 'Juan García',
      org_name: 'Mi Empresa',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.errors.map((e) => e.path.join('.'))
      expect(paths).toContain('confirm_password')
    }
  })

  it('rejects weak passwords (no uppercase)', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'weakpassword1',
      confirm_password: 'weakpassword1',
      full_name: 'Juan García',
      org_name: 'Mi Empresa',
    })
    expect(result.success).toBe(false)
  })

  it('rejects passwords without numbers', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'NoNumbersHere',
      confirm_password: 'NoNumbersHere',
      full_name: 'Juan García',
      org_name: 'Mi Empresa',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = registerSchema.safeParse({
      email: 'not-an-email',
      password: 'Secure123',
      confirm_password: 'Secure123',
      full_name: 'Juan García',
      org_name: 'Mi Empresa',
    })
    expect(result.success).toBe(false)
  })

  it('normalizes email to lowercase', () => {
    const result = registerSchema.safeParse({
      email: 'USER@EXAMPLE.COM',
      password: 'Secure123',
      confirm_password: 'Secure123',
      full_name: 'Juan García',
      org_name: 'Mi Empresa',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.email).toBe('user@example.com')
    }
  })
})

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: '' })
    expect(result.success).toBe(false)
  })
})

describe('createOrganizationSchema', () => {
  it('accepts valid org data', () => {
    const result = createOrganizationSchema.safeParse({
      name: 'My Business',
      timezone: 'America/Mexico_City',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid slug format', () => {
    const result = createOrganizationSchema.safeParse({
      name: 'My Business',
      slug: 'Invalid Slug!',
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid slug', () => {
    const result = createOrganizationSchema.safeParse({
      name: 'My Business',
      slug: 'my-business-123',
    })
    expect(result.success).toBe(true)
  })
})

describe('createContactSchema', () => {
  it('accepts valid contact', () => {
    const result = createContactSchema.safeParse({
      phone_number: '+5219991234567',
      name: 'María López',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid phone', () => {
    const result = createContactSchema.safeParse({
      phone_number: '123',
    })
    expect(result.success).toBe(false)
  })

  it('defaults tags to empty array', () => {
    const result = createContactSchema.safeParse({ phone_number: '+5219991234567' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.tags).toEqual([])
  })
})

describe('createAppointmentSchema', () => {
  it('accepts valid appointment', () => {
    const result = createAppointmentSchema.safeParse({
      contact_id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Consulta médica',
      start_at: '2026-06-01T10:00:00.000Z',
      end_at: '2026-06-01T11:00:00.000Z',
    })
    expect(result.success).toBe(true)
  })

  it('rejects appointment where end is before start', () => {
    const result = createAppointmentSchema.safeParse({
      contact_id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Consulta médica',
      start_at: '2026-06-01T11:00:00.000Z',
      end_at: '2026-06-01T10:00:00.000Z',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.errors.map((e) => e.path.join('.'))
      expect(paths).toContain('end_at')
    }
  })
})

describe('updateAIConfigSchema', () => {
  it('accepts valid AI config update', () => {
    const result = updateAIConfigSchema.safeParse({
      model: 'gpt-4o',
      tone: 'professional',
      temperature: 0.7,
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid model', () => {
    const result = updateAIConfigSchema.safeParse({ model: 'invalid-model' })
    expect(result.success).toBe(false)
  })

  it('rejects temperature out of range', () => {
    const result = updateAIConfigSchema.safeParse({ temperature: 3.0 })
    expect(result.success).toBe(false)
  })
})

describe('businessHourSchema', () => {
  it('validates correct business hour', () => {
    const result = businessHourSchema.safeParse({
      day_of_week: 1,
      open_time: '09:00',
      close_time: '18:00',
      is_active: true,
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid time format', () => {
    const result = businessHourSchema.safeParse({
      day_of_week: 1,
      open_time: '9:00',  // missing leading zero
      close_time: '18:00',
      is_active: true,
    })
    expect(result.success).toBe(false)
  })

  it('rejects day_of_week out of range', () => {
    const result = businessHourSchema.safeParse({
      day_of_week: 7,  // 0-6 only
      open_time: '09:00',
      close_time: '18:00',
      is_active: true,
    })
    expect(result.success).toBe(false)
  })
})

describe('planLimitsSchema', () => {
  it('accepts -1 as unlimited', () => {
    const result = planLimitsSchema.safeParse({
      instances: -1,
      messages_per_month: -1,
      operators: -1,
      storage_gb: 100,
      ai_responses_per_hour: -1,
      knowledge_base_docs: -1,
      kanban_columns: -1,
    })
    expect(result.success).toBe(true)
  })

  it('rejects negative storage_gb below 0', () => {
    const result = planLimitsSchema.safeParse({
      instances: 5,
      messages_per_month: 1000,
      operators: 10,
      storage_gb: -5,
      ai_responses_per_hour: 100,
      knowledge_base_docs: 50,
      kanban_columns: 20,
    })
    expect(result.success).toBe(false)
  })
})

// ============================================================
// UTILITY FUNCTION TESTS
// ============================================================

describe('generateSlug', () => {
  it('converts to lowercase with hyphens', () => {
    expect(generateSlug('Mi Empresa Genial')).toBe('mi-empresa-genial')
  })

  it('removes accents', () => {
    expect(generateSlug('Café & Más')).toBe('cafe-mas')
  })

  it('deduplicates hyphens', () => {
    expect(generateSlug('Hello   World')).toBe('hello-world')
  })

  it('truncates to 50 characters', () => {
    const long = 'a'.repeat(100)
    expect(generateSlug(long).length).toBeLessThanOrEqual(50)
  })

  it('removes special characters', () => {
    expect(generateSlug('Hello! @World #2024')).toBe('hello-world-2024')
  })
})

describe('isLimitExceeded', () => {
  it('returns false when -1 (unlimited)', () => {
    expect(isLimitExceeded(1000, -1)).toBe(false)
  })

  it('returns true when at or above limit', () => {
    expect(isLimitExceeded(5, 5)).toBe(true)
    expect(isLimitExceeded(6, 5)).toBe(true)
  })

  it('returns false when below limit', () => {
    expect(isLimitExceeded(3, 5)).toBe(false)
  })
})

describe('formatBytes', () => {
  it('formats zero bytes', () => {
    expect(formatBytes(0)).toBe('0 B')
  })

  it('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1 KB')
  })

  it('formats megabytes', () => {
    expect(formatBytes(1024 * 1024)).toBe('1 MB')
  })

  it('formats gigabytes', () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB')
  })
})

describe('sanitizePhone', () => {
  it('removes non-digit characters except plus', () => {
    expect(sanitizePhone('(999) 123-4567')).toBe('9991234567')
    expect(sanitizePhone('+52 (999) 123-4567')).toBe('+529991234567')
  })
})

describe('phoneToJid / jidToPhone', () => {
  it('converts phone to JID format', () => {
    expect(phoneToJid('+5219991234567')).toBe('5219991234567@s.whatsapp.net')
  })

  it('converts JID back to phone', () => {
    expect(jidToPhone('5219991234567@s.whatsapp.net')).toBe('+5219991234567')
  })
})
