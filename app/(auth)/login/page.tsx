'use client'

import { Suspense, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Activity } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { authClient } from '@/lib/auth/client'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/'
  const [email, setEmail] = useState('admin@healthcore.com')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await authClient.signIn.email({
        email,
        password,
        rememberMe,
      })
      if (result.error) {
        toast.error(result.error.message || 'Falha no login')
        return
      }
      const role = (result.data?.user as { role?: string } | undefined)?.role
      if (role) {
        document.cookie = `sf_role=${role}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
      }
      toast.success('Bem-vindo ao HealthCore')
      router.replace(next)
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Não foi possível entrar',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-border/60 shadow-lg shadow-teal-900/5">
      <CardHeader className="space-y-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Activity className="size-5" />
        </div>
        <div>
          <CardTitle className="text-2xl">HealthCore</CardTitle>
          <CardDescription>
            Entre com seu e-mail corporativo para continuar.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">E-mail</FieldLabel>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Senha</FieldLabel>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="size-4 rounded border"
              />
              Manter conectado
            </label>
          </FieldGroup>
          <Button type="submit" className="mt-6 w-full" disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-between text-sm">
        <Link
          href="/forgot-password"
          className="text-muted-foreground underline-offset-4 hover:underline"
        >
          Esqueci a senha
        </Link>
        <Link
          href="/change-password"
          className="text-muted-foreground underline-offset-4 hover:underline"
        >
          Trocar senha
        </Link>
      </CardFooter>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="text-sm text-muted-foreground">Carregando…</div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
