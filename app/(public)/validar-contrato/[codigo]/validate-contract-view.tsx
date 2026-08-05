'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { parseJson } from '@/lib/api-client'

type ValidationResult = {
  valid: boolean
  message: string
  number?: string
  signerName?: string
  signedAt?: string
  signedAtLabel?: string
  status?: string
  version?: number
  documentHash?: string
  validationCode?: string
}

export function ValidateContractView({ codigo }: { codigo: string }) {
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<ValidationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/validacao-contratos/${encodeURIComponent(codigo)}`)
      .then((res) => parseJson<ValidationResult>(res))
      .then((data) => {
        if (!cancelled) {
          setResult(data)
          setError(null)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Não foi possível validar o documento',
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [codigo])

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          Validando documento…
        </CardContent>
      </Card>
    )
  }

  if (error || !result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Validação indisponível</CardTitle>
          <CardDescription>{error ?? 'Tente novamente.'}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <div
          className={`mx-auto mb-2 flex size-12 items-center justify-center rounded-full ${
            result.valid
              ? 'bg-primary/10 text-primary'
              : 'bg-destructive/10 text-destructive'
          }`}
        >
          {result.valid ? (
            <CheckCircle2 className="size-7" />
          ) : (
            <XCircle className="size-7" />
          )}
        </div>
        <CardTitle>{result.message}</CardTitle>
        <CardDescription>
          Código {result.validationCode ?? codigo}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Contrato</dt>
            <dd className="font-medium">{result.number ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Assinante</dt>
            <dd className="font-medium">{result.signerName ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Data da assinatura</dt>
            <dd className="font-medium">{result.signedAtLabel ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              <Badge variant={result.valid ? 'secondary' : 'destructive'}>
                {result.status ?? (result.valid ? 'Assinado' : 'Inválido')}
              </Badge>
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Versão</dt>
            <dd className="font-medium">{result.version ?? '—'}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Hash SHA-256</dt>
            <dd className="break-all font-mono text-xs">
              {result.documentHash ?? '—'}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}
