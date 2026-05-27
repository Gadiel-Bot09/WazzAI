'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { generateSlug, ok, err } from '@/lib/utils/server'
import type { ActionResult } from '@/lib/utils/server'
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  onboardingStep1Schema,
  type RegisterInput,
  type LoginInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
  type OnboardingStep1Input,
} from '@/types/validators'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// ============================================================
// REGISTER
// ============================================================

export async function registerAction(
  input: RegisterInput
): Promise<ActionResult<{ userId: string }>> {
  const parse = registerSchema.safeParse(input)
  if (!parse.success) {
    return err('Datos de registro inválidos', parse.error.flatten().fieldErrors)
  }

  const { email, password, full_name } = parse.data
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })

  if (error) {
    if (error.message.includes('already registered')) {
      return err('Este email ya está registrado. Inicia sesión.')
    }
    return err(error.message)
  }

  if (!data.user) {
    return err('Error al crear la cuenta. Inténtalo de nuevo.')
  }

  return ok({ userId: data.user.id }, 'Revisa tu email para verificar tu cuenta')
}

// ============================================================
// LOGIN
// ============================================================

export async function loginAction(
  input: LoginInput
): Promise<ActionResult<{ redirectTo: string }>> {
  const parse = loginSchema.safeParse(input)
  if (!parse.success) {
    return err('Credenciales inválidas', parse.error.flatten().fieldErrors)
  }

  const { email, password } = parse.data
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      return err('Email o contraseña incorrectos')
    }
    if (error.message.includes('Email not confirmed')) {
      return err('Verifica tu email antes de iniciar sesión')
    }
    return err(error.message)
  }

  if (!data.user) return err('Error al iniciar sesión')

  // Update last_seen_at — cast to any to bypass simplified Database type
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any)
    .from('users')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', data.user.id)

  // Check if onboarding is complete
  const onboardingCompleted = data.user.user_metadata?.onboarding_completed === true
  const redirectTo = onboardingCompleted ? '/dashboard' : '/dashboard/onboarding'

  return ok({ redirectTo })
}

// ============================================================
// LOGOUT
// ============================================================

export async function logoutAction(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/auth/login')
}

// ============================================================
// FORGOT PASSWORD
// ============================================================

export async function forgotPasswordAction(
  input: ForgotPasswordInput
): Promise<ActionResult<void>> {
  const parse = forgotPasswordSchema.safeParse(input)
  if (!parse.success) {
    return err('Email inválido', parse.error.flatten().fieldErrors)
  }

  const { email } = parse.data
  const supabase = await createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
  })

  if (error) {
    // Don't reveal if the email exists or not (security)
    console.error('[forgotPasswordAction]', error.message)
  }

  // Always return success to prevent email enumeration
  return ok(undefined, 'Si el email existe, recibirás un enlace de recuperación')
}

// ============================================================
// RESET PASSWORD
// ============================================================

export async function resetPasswordAction(
  input: ResetPasswordInput
): Promise<ActionResult<void>> {
  const parse = resetPasswordSchema.safeParse(input)
  if (!parse.success) {
    return err('Contraseña inválida', parse.error.flatten().fieldErrors)
  }

  const { password } = parse.data
  const supabase = await createClient()

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return err('Error al restablecer la contraseña. El enlace puede haber expirado.')
  }

  return ok(undefined, 'Contraseña restablecida. Ya puedes iniciar sesión.')
}

// ============================================================
// GOOGLE OAUTH
// ============================================================

export async function signInWithGoogleAction(): Promise<ActionResult<{ url: string }>> {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })

  if (error || !data.url) {
    return err('Error al iniciar sesión con Google')
  }

  return ok({ url: data.url })
}

// ============================================================
// ONBOARDING — Step 1: Create Organization
// ============================================================

export async function createOrganizationAction(
  input: OnboardingStep1Input
): Promise<ActionResult<{ orgId: string; orgSlug: string }>> {
  const parse = onboardingStep1Schema.safeParse(input)
  if (!parse.success) {
    return err('Datos inválidos', parse.error.flatten().fieldErrors)
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return err('No autenticado')

  const admin = createAdminClient()

  // Generate unique slug
  let slug = generateSlug(parse.data.org_name)
  const { count } = await admin
    .from('organizations')
    .select('*', { count: 'exact', head: true })
    .eq('slug', slug)

  if (count && count > 0) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`
  }

  // Call the DB function — cast to any to bypass simplified Database type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any).rpc('create_organization_with_owner', {
    p_user_id: user.id,
    p_user_email: user.email ?? '',
    p_user_name: user.user_metadata?.full_name ?? '',
    p_org_name: parse.data.org_name,
    p_org_slug: slug,
    p_timezone: parse.data.timezone,
  })

  if (error) {
    console.error('[createOrganizationAction]', error)
    return err('Error al crear la organización')
  }

  const result = data as { org_id: string; org_slug: string }

  return ok({ orgId: result.org_id, orgSlug: result.org_slug })
}

// ============================================================
// ONBOARDING — Mark as complete
// ============================================================

export async function completeOnboardingAction(): Promise<ActionResult<void>> {
  const supabase = await createClient()

  const { error } = await supabase.auth.updateUser({
    data: { onboarding_completed: true },
  })

  if (error) return err('Error al completar el onboarding')

  revalidatePath('/dashboard')
  return ok(undefined)
}

// ============================================================
// AUTH CALLBACK — handles OAuth redirects
// ============================================================

export async function exchangeCodeForSession(code: string): Promise<ActionResult<void>> {
  const supabase = await createClient()

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return err('Error al procesar el callback de autenticación')
  }

  return ok(undefined)
}
