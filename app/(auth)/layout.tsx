export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950">
      <div className="w-full max-w-md p-8 bg-white dark:bg-zinc-900 rounded-xl border border-border shadow-sm">
        {children}
      </div>
    </div>
  )
}
