'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await authClient.requestPasswordReset({
        email,
        redirectTo: '/reset-password',
      })
      if (result.error) {
        toast.error(result.error.message || 'Não foi possível enviar o e-mail')
        return
      }
      toast.success('Se o e-mail existir, enviamos o link de redefinição', {
        description: 'Em desenvolvimento o link aparece no log do servidor.',
      })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Falha ao solicitar reset',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recuperar senha</CardTitle>
        <CardDescription>
          Informe o e-mail da conta. Enviaremos um link de redefinição.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">E-mail</FieldLabel>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
          </FieldGroup>
          <Button type="submit" className="mt-6 w-full" disabled={loading}>
            {loading ? 'Enviando…' : 'Enviar link'}
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
