import { redirect } from 'next/navigation'

export default function DashboardIndex() {
  // Por defecto redirigimos al módulo de Chat/Bandeja de entrada
  redirect('/dashboard/chat')
}
