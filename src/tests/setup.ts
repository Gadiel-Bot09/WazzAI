import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock Next.js headers (for server components)
vi.mock('next/headers', () => ({
  cookies: () => ({
    getAll: () => [],
    get: () => null,
    set: vi.fn(),
  }),
  headers: () => new Headers(),
}))

// Mock env validation
vi.mock('@/env', () => ({
  env: {
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
    NEXTAUTH_SECRET: 'test-secret-that-is-at-least-32-chars',
    OPENAI_API_KEY: 'sk-test',
    GOOGLE_AI_API_KEY: 'AIza-test',
    STRIPE_SECRET_KEY: 'sk_test_stripe',
    STRIPE_WEBHOOK_SECRET: 'whsec_test',
    RESEND_API_KEY: 're_test',
    RESEND_FROM_EMAIL: 'test@test.com',
    EVOLUTION_API_URL: 'https://test-evolution.com',
    EVOLUTION_API_KEY: 'test-key',
    EVOLUTION_WEBHOOK_SECRET: 'test-webhook-secret-min-32-characters',
    NEXTAUTH_URL: 'http://localhost:3000',
    NODE_ENV: 'test',
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_stripe',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    NEXT_PUBLIC_DEFAULT_LOCALE: 'es',
  },
}))
