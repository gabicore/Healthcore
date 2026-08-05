'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/page-header'
import { InlineField } from '@/components/students/inline-field'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { StudioProfile } from '@/lib/data'
import { fetchStudio, updateStudio } from '@/lib/settings-api'

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}

export function SettingsPage() {
  const [studioData, setStudioData] = useState<StudioProfile | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const studio = await fetchStudio()
        if (!cancelled) setStudioData(studio)
      } catch (err: unknown) {
        if (!cancelled) {
          toast.error(
            errorMessage(err, 'Não foi possível carregar as configurações'),
          )
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  function notify(label: string) {
    toast.success(`${label} atualizado`, { duration: 1800 })
  }

  if (!studioData) {
    return (
      <>
        <PageHeader
          title="Configurações"
          description="Dados do estúdio"
        />
        <div className="p-4 text-sm text-muted-foreground md:p-6">
          Carregando configurações…
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Configurações"
        description="Dados do estúdio"
      />

      <div className="flex flex-col gap-6 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Estúdio</CardTitle>
            <CardDescription>
              Dados do espaço · clique para editar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
              <InlineField
                label="Nome"
                value={studioData.name}
                onSave={async (name) => {
                  try {
                    setStudioData(await updateStudio({ name }))
                    notify('Nome')
                  } catch (err) {
                    toast.error(errorMessage(err, 'Não foi possível salvar'))
                  }
                }}
              />
              <InlineField
                label="Responsável"
                value={studioData.owner}
                onSave={async (owner) => {
                  try {
                    setStudioData(await updateStudio({ owner }))
                    notify('Responsável')
                  } catch (err) {
                    toast.error(errorMessage(err, 'Não foi possível salvar'))
                  }
                }}
              />
              <InlineField
                label="E-mail"
                type="email"
                value={studioData.email}
                onSave={async (email) => {
                  try {
                    setStudioData(await updateStudio({ email }))
                    notify('E-mail')
                  } catch (err) {
                    toast.error(errorMessage(err, 'Não foi possível salvar'))
                  }
                }}
              />
              <InlineField
                label="Telefone"
                type="tel"
                value={studioData.phone}
                onSave={async (phone) => {
                  try {
                    setStudioData(await updateStudio({ phone }))
                    notify('Telefone')
                  } catch (err) {
                    toast.error(errorMessage(err, 'Não foi possível salvar'))
                  }
                }}
              />
              <InlineField
                label="CNPJ"
                value={studioData.cnpj}
                placeholder="00.000.000/0000-00"
                onSave={async (cnpj) => {
                  try {
                    setStudioData(await updateStudio({ cnpj }))
                    notify('CNPJ')
                  } catch (err) {
                    toast.error(errorMessage(err, 'Não foi possível salvar'))
                  }
                }}
              />
              <InlineField
                label="Endereço"
                value={studioData.address}
                className="sm:col-span-2 lg:col-span-3"
                onSave={async (address) => {
                  try {
                    setStudioData(await updateStudio({ address }))
                    notify('Endereço')
                  } catch (err) {
                    toast.error(errorMessage(err, 'Não foi possível salvar'))
                  }
                }}
              />
              <div className="flex flex-col gap-0.5 py-2">
                <dt className="text-xs text-muted-foreground">Plano HealthCore</dt>
                <dd className="pt-1">
                  <Badge variant="outline">{studioData.plan}</Badge>
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
