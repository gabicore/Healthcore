'use client'

import { Suspense, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
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

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!token) {
      toast.error('Token inválido ou ausente')
      return
    }
    setLoading(true)
    try {
      const result = await authClient.resetPassword({
        newPassword: password,
        token,
      })
      if (result.error) {
        toast.error(result.error.message || 'Não foi possível redefinir')
        return
      }
      toast.success('Senha atualizada')
      router.replace('/login')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Falha ao redefinir senha',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nova senha</CardTitle>
        <CardDescription>
          Defina uma senha forte (mín. 8 caracteres, letra maiúscula e número).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="password">Nova senha</FieldLabel>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
          </FieldGroup>
          <Button type="submit" className="mt-6 w-full" disabled={loading}>
            {loading ? 'Salvando…' : 'Salvar senha'}
          </Button>
        </form>
      </CardContent>
      <CardFooter>
        <Link href="/login" className="text-sm text-muted-foreground underline">
          Voltar ao login
        </Link>
      </CardFooter>
    </Card>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Carregando…</div>}>
      <ResetPasswordForm />
    </Suspense>
  )
}
