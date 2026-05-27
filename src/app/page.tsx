import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold gradient-text">WazzAI</h1>
        <p className="text-muted-foreground">WhatsApp AI Management Platform</p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/auth/login"
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/auth/register"
            className="px-6 py-2 border border-border rounded-lg font-medium hover:bg-muted transition-colors"
          >
            Registrarse
          </Link>
        </div>
      </div>
    </main>
  )
}
