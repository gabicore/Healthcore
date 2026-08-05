'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import SignaturePad from 'signature_pad'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { parseJson } from '@/lib/api-client'
import { formatShortDate } from '@/lib/contract-document-client'
import type { PublicSigningContract } from '@/lib/contracts-signing-types'
import { cn } from '@/lib/utils'

type SignSuccess = {
  signedAt: string
  signerName: string
  validationCode: string
  documentHash: string
  number: string
  version: number
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(d)
}

function buildSignedHtml(input: {
  data: PublicSigningContract
  signerName: string
  signedAt: string
  validationCode: string
  documentHash: string
  signatureImage?: string
}) {
  const {
    data,
    signerName,
    signedAt,
    validationCode,
    documentHash,
    signatureImage,
  } = input
  const body = escapeHtml(data.clausesDocument || '—').replaceAll('\n', '<br/>')
  const sigImg = signatureImage
    ? `<img src="${signatureImage}" alt="Assinatura" style="max-width:240px;height:auto;margin:8px auto;display:block;" />`
    : ''

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Contrato ${escapeHtml(data.number)} — Assinado</title>
  <style>
    @page { size: A4; margin: 1.1cm; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; line-height: 1.3; color: #111; max-width: 210mm; margin: 0 auto; padding: 12px 16px; }
    h1 { font-size: 12pt; text-align: center; text-transform: uppercase; }
    h2 { font-size: 11pt; text-transform: uppercase; border-bottom: 1px solid #222; padding-bottom: 2px; margin-top: 14px; }
    .field { font-size: 10pt; margin: 2px 0; }
    .footer { margin-top: 18px; padding-top: 8px; border-top: 1px solid #999; font-size: 8pt; color: #333; }
    .no-print { text-align: right; margin-bottom: 10px; }
    @media print { .no-print { display: none !important; } }
  </style>
</head>
<body>
  <div class="no-print"><button onclick="window.print()">Imprimir / Salvar PDF</button></div>
  <h1>Contrato de prestação de serviços</h1>
  <p class="field"><strong>Contrato:</strong> ${escapeHtml(data.number)} · versão ${data.version}</p>
  <p class="field"><strong>Aluno:</strong> ${escapeHtml(data.studentName)}</p>
  <p class="field"><strong>Plano:</strong> ${escapeHtml(data.planLabel)}</p>
  <p class="field"><strong>Vigência:</strong> ${escapeHtml(formatShortDate(data.startDate))} a ${escapeHtml(formatShortDate(data.endDate))}</p>
  <p class="field"><strong>Valor final mensal:</strong> ${escapeHtml(data.monthlyValueLabel)}</p>
  <p class="field"><strong>Dia de vencimento:</strong> Dia ${data.dueDay}</p>
  <p class="field"><strong>Forma de pagamento:</strong> ${escapeHtml(data.paymentMethod)}</p>
  <p class="field"><strong>Multa / juros:</strong> ${data.lateFeePercent}% / ${data.interestPercent}% a.m.</p>
  <h2>Cláusulas contratuais</h2>
  <div style="font-size:10pt;text-align:justify;">${body}</div>
  <h2>Assinatura do contratante</h2>
  ${sigImg}
  <p class="field" style="text-align:center;"><strong>${escapeHtml(signerName)}</strong></p>
  <div class="footer">
    <p><strong>Documento assinado eletronicamente.</strong></p>
    <p>Assinante: ${escapeHtml(signerName)}</p>
    <p>Data e hora: ${escapeHtml(formatDateTime(signedAt))}</p>
    <p>Contrato: ${escapeHtml(data.number)}</p>
    <p>Código de validação: ${escapeHtml(validationCode)}</p>
    <p>Hash SHA-256: ${escapeHtml(documentHash)}</p>
  </div>
</body>
</html>`
}

export function SignContractView({ token }: { token: string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<PublicSigningContract | null>(null)
  const [accepted, setAccepted] = useState(false)
  const [signerName, setSignerName] = useState('')
  const [hasStroke, setHasStroke] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<SignSuccess | null>(null)
  const [signatureImage, setSignatureImage] = useState<string | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const padRef = useRef<SignaturePad | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/assinatura-contratos/${encodeURIComponent(token)}`)
      .then((res) => parseJson<PublicSigningContract>(res))
      .then((payload) => {
        if (cancelled) return
        setData(payload)
        if (payload.alreadySigned && payload.signerName && payload.signedAt) {
          setSuccess({
            signedAt: payload.signedAt,
            signerName: payload.signerName,
            validationCode: payload.validationCode ?? '',
            documentHash: payload.documentHash ?? '',
            number: payload.number,
            version: payload.version,
          })
        }
        setError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof Error
            ? err.message
            : 'Não foi possível carregar o contrato',
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    if (!data || data.alreadySigned || success) return
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1)
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * ratio
      canvas.height = rect.height * ratio
      const ctx = canvas.getContext('2d')
      ctx?.scale(ratio, ratio)
      padRef.current?.clear()
      setHasStroke(false)
    }

    const pad = new SignaturePad(canvas, {
      backgroundColor: 'rgb(255,255,255)',
      penColor: 'rgb(17,17,17)',
    })
    pad.addEventListener('endStroke', () => {
      setHasStroke(!pad.isEmpty())
    })
    padRef.current = pad
    resize()
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      pad.off()
      padRef.current = null
    }
  }, [data, success])

  const canSubmit =
    accepted && signerName.trim().length >= 3 && hasStroke && !submitting

  async function handleSign() {
    if (!canSubmit || !padRef.current) return
    setSubmitting(true)
    try {
      const image = padRef.current.toDataURL('image/png')
      const result = await parseJson<SignSuccess>(
        await fetch(`/api/assinatura-contratos/${encodeURIComponent(token)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accepted: true,
            signerName: signerName.trim(),
            signatureImage: image,
          }),
        }),
      )
      setSignatureImage(image)
      setSuccess(result)
      toast.success('Contrato assinado com sucesso')
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Não foi possível assinar',
      )
    } finally {
      setSubmitting(false)
    }
  }

  function openSignedPdf() {
    if (!data || !success) return
    const html = buildSignedHtml({
      data,
      signerName: success.signerName,
      signedAt: success.signedAt,
      validationCode: success.validationCode,
      documentHash: success.documentHash,
      signatureImage: signatureImage ?? undefined,
    })
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const win = window.open(url, '_blank')
    if (!win) {
      URL.revokeObjectURL(url)
      toast.error('Permita pop-ups para visualizar o PDF')
      return
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          Carregando contrato…
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Link inválido</CardTitle>
          <CardDescription>
            {error ?? 'Este link de assinatura não está disponível.'}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (success) {
    const validationHref = success.validationCode
      ? `/validar-contrato/${encodeURIComponent(success.validationCode)}`
      : null
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CheckCircle2 className="size-7" />
          </div>
          <CardTitle>Contrato assinado</CardTitle>
          <CardDescription>
            Assinatura registrada em {formatDateTime(success.signedAt)}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Contrato</dt>
              <dd className="font-medium">{success.number}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Assinante</dt>
              <dd className="font-medium">{success.signerName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Código de validação</dt>
              <dd className="font-mono text-sm">{success.validationCode}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Versão</dt>
              <dd className="font-medium">{success.version}</dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={openSignedPdf}>
              Visualizar / baixar PDF
            </Button>
            {validationHref ? (
              <Link
                href={validationHref}
                className={cn(
                  'inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted',
                )}
              >
                Validar documento
              </Link>
            ) : null}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Assinar contrato {data.number}</CardTitle>
            <Badge variant="secondary">{data.statusLabel}</Badge>
          </div>
          <CardDescription>
            {data.studentName} · versão {data.version}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <section>
            <h3 className="mb-2 text-sm font-medium">Plano e condições</h3>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Plano</dt>
                <dd>{data.planLabel}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Vigência</dt>
                <dd>
                  {formatShortDate(data.startDate)} a{' '}
                  {formatShortDate(data.endDate)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Valor mensal</dt>
                <dd>{data.monthlyValueLabel}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Desconto</dt>
                <dd>
                  {data.discountPercent > 0
                    ? `${data.discountPercent}%`
                    : 'Não aplicável'}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Vencimento</dt>
                <dd>Dia {data.dueDay}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Pagamento</dt>
                <dd>{data.paymentMethod}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Multa / juros</dt>
                <dd>
                  {data.lateFeePercent}% / {data.interestPercent}% a.m.
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Responsável financeiro</dt>
                <dd>{data.financialResponsible}</dd>
              </div>
            </dl>
          </section>

          <Separator />

          <section>
            <h3 className="mb-2 text-sm font-medium">Cláusulas</h3>
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {data.clausesDocument || '—'}
            </div>
          </section>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aceite e assinatura</CardTitle>
          <CardDescription>
            Preencha os campos abaixo para assinar eletronicamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <label className="flex items-start gap-3 text-sm leading-relaxed">
              <input
                type="checkbox"
                className="mt-1 size-4 accent-primary"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
              />
              <span>
                Declaro que li e concordo com todas as condições e cláusulas
                deste contrato.
              </span>
            </label>

            <Field>
              <FieldLabel htmlFor="signer-name">Nome completo</FieldLabel>
              <Input
                id="signer-name"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Digite seu nome completo"
                autoComplete="name"
              />
            </Field>

            <Field>
              <FieldLabel>Assinatura</FieldLabel>
              <div
                className={cn(
                  'overflow-hidden rounded-md border bg-white',
                  'touch-none',
                )}
              >
                <canvas
                  ref={canvasRef}
                  className="h-40 w-full cursor-crosshair"
                />
              </div>
              <div className="mt-2 flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    padRef.current?.clear()
                    setHasStroke(false)
                  }}
                >
                  Limpar
                </Button>
              </div>
            </Field>

            <Button
              type="button"
              disabled={!canSubmit}
              onClick={() => void handleSign()}
            >
              {submitting ? 'Assinando…' : 'Assinar contrato'}
            </Button>
          </FieldGroup>
        </CardContent>
      </Card>
    </div>
  )
}
