import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  /**
   * Server-side environment variables
   * NOT exposed to the browser
   */
  server: {
    // ── Supabase ────────────────────────────────────────────
    /** Supabase project URL (e.g. https://xxxx.supabase.co) */
    SUPABASE_URL: z.string().url(),
    /** Service role key — full access, server-side only */
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

    // ── Authentication ──────────────────────────────────────
    /** NextAuth/Supabase JWT secret */
    NEXTAUTH_SECRET: z.string().min(32),

    // ── OpenAI ─────────────────────────────────────────────
    /** OpenAI API key for GPT-4o and embeddings */
    OPENAI_API_KEY: z.string().startsWith('sk-'),

    // ── Google Gemini ───────────────────────────────────────
    /** Google AI Studio API key for Gemini models */
    GOOGLE_AI_API_KEY: z.string().min(1).optional(),

    // ── Stripe ─────────────────────────────────────────────
    /** Stripe secret key (sk_live_ or sk_test_) */
    STRIPE_SECRET_KEY: z.string().startsWith('sk_').optional(),
    /** Stripe webhook signing secret (whsec_...) */
    STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_').optional(),

    // ── Resend ─────────────────────────────────────────────
    /** Resend API key for transactional emails */
    RESEND_API_KEY: z.string().startsWith('re_').optional(),
    /** From address for outgoing emails */
    RESEND_FROM_EMAIL: z.string().email().optional(),

    // ── Evolution API (WhatsApp) ────────────────────────────
    /** Base URL of your Evolution API v2 instance */
    EVOLUTION_API_URL: z.string().url(),
    /** Global API key for Evolution API */
    EVOLUTION_API_KEY: z.string().min(1),
    /** HMAC secret to verify Evolution webhook signatures */
    EVOLUTION_WEBHOOK_SECRET: z.string().min(32),

    // ── Rate Limiting ───────────────────────────────────────
    /** Upstash Redis REST URL for rate limiting */
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    /** Upstash Redis REST token */
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

    // ── Platform ────────────────────────────────────────────
    /** Base URL of the app (e.g. https://app.wazzai.com) */
    NEXTAUTH_URL: z.string().url().optional(),
    /** Node environment */
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  },

  /**
   * Client-side environment variables
   * Must be prefixed with NEXT_PUBLIC_
   */
  client: {
    /** Supabase URL — safe to expose */
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    /** Supabase anon key — safe to expose (RLS protects data) */
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    /** Stripe publishable key */
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_').optional(),
    /** Application base URL */
    NEXT_PUBLIC_APP_URL: z.string().url(),
    /** Default locale */
    NEXT_PUBLIC_DEFAULT_LOCALE: z.enum(['es', 'en']).default('es'),
  },

  /**
   * Map process.env — required by @t3-oss/env-nextjs
   */
  runtimeEnv: {
    // Server
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    EVOLUTION_API_URL: process.env.EVOLUTION_API_URL,
    EVOLUTION_API_KEY: process.env.EVOLUTION_API_KEY,
    EVOLUTION_WEBHOOK_SECRET: process.env.EVOLUTION_WEBHOOK_SECRET,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NODE_ENV: process.env.NODE_ENV,
    // Client
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_DEFAULT_LOCALE: process.env.NEXT_PUBLIC_DEFAULT_LOCALE,
  },

  skipValidation: process.env.SKIP_ENV_VALIDATION === 'true',
  emptyStringAsUndefined: true,
})
