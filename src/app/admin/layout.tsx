export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      {/* Admin Sidebar */}
      <aside className="w-64 border-r bg-sidebar">
        <div className="flex h-16 items-center border-b px-6">
          <span className="text-lg font-semibold">Admin Panel</span>
        </div>
        <nav className="p-4">
          <p className="text-sm text-muted-foreground">Admin navigation coming in Phase 11</p>
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1">
        <header className="flex h-16 items-center border-b bg-background px-6">
          <span className="text-sm text-muted-foreground">Super Admin</span>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
