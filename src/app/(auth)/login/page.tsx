import Link from 'next/link'

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Sign in to Prometheus</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your credentials to access your dashboard
        </p>
      </div>
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <p className="text-center text-muted-foreground">
          Login form coming in Phase 1
        </p>
      </div>
      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  )
}
