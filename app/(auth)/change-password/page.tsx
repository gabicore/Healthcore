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

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await fetch('/api/users/me/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const json = await response.json()
      if (!response.ok || !json.success) {
        throw new Error(json?.error?.message || 'Falha ao alterar senha')
      }
      toast.success('Senha alterada com sucesso')
      setCurrentPassword('')
      setNewPassword('')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Não foi possível alterar',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alterar senha</CardTitle>
        <CardDescription>
          Você precisa estar autenticado para trocar a senha.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="current">Senha atual</FieldLabel>
              <Input
                id="current"
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="next">Nova senha</FieldLabel>
              <Input
                id="next"
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </Field>
          </FieldGroup>
          <Button type="submit" className="mt-6 w-full" disabled={loading}>
            {loading ? 'Salvando…' : 'Atualizar senha'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="gap-4">
        <Link href="/login" className="text-sm text-muted-foreground underline">
          Login
        </Link>
        <Link href="/" className="text-sm text-muted-foreground underline">
          Voltar ao app
        </Link>
      </CardFooter>
    </Card>
  )
}
