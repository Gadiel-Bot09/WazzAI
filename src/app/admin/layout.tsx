export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-screen w-full flex flex-col bg-background text-foreground">
      {children}
    </div>
  )
}
