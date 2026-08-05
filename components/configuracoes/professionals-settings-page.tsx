'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/page-header'
import { InlineCell } from '@/components/financeiro/inline-cell'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Professional } from '@/lib/data'
import {
  createProfessional,
  deleteProfessional,
  fetchProfessionals,
  updateProfessional,
} from '@/lib/settings-api'

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}

export function ProfessionalsSettingsPage() {
  const [team, setTeam] = useState<Professional[] | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const professionals = await fetchProfessionals()
        if (!cancelled) setTeam(professionals)
      } catch (err: unknown) {
        if (!cancelled) {
          toast.error(
            errorMessage(err, 'Não foi possível carregar os profissionais'),
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

  async function reloadProfessionals() {
    setTeam(await fetchProfessionals())
  }

  if (!team) {
    return (
      <>
        <PageHeader
          title="Profissionais"
          description="Equipe disponível na agenda e evoluções"
        />
        <div className="p-4 text-sm text-muted-foreground md:p-6">
          Carregando profissionais…
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Profissionais"
        description="Equipe disponível na agenda e evoluções"
      >
        <Button
          size="sm"
          onClick={async () => {
            try {
              await createProfessional()
              await reloadProfessionals()
              toast.success('Profissional adicionado')
            } catch (err) {
              toast.error(errorMessage(err, 'Não foi possível adicionar'))
            }
          }}
        >
          <Plus data-icon="inline-start" />
          Adicionar
        </Button>
      </PageHeader>

      <div className="flex flex-col gap-5 p-4 md:p-6">
        <Card className="overflow-hidden py-0">
          <CardHeader className="border-b py-4">
            <CardTitle className="text-base">Cadastro da equipe</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Nome</TableHead>
                <TableHead className="hidden sm:table-cell">Função</TableHead>
                <TableHead className="hidden md:table-cell">Registro</TableHead>
                <TableHead className="hidden lg:table-cell">E-mail</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {team.map((professional) => (
                <TableRow key={professional.id}>
                  <TableCell>
                    <InlineCell
                      value={professional.name}
                      className="font-medium"
                      onSave={async (name) => {
                        if (!name) return
                        try {
                          await updateProfessional(professional.id, { name })
                          await reloadProfessionals()
                          notify('Nome')
                        } catch (err) {
                          toast.error(
                            errorMessage(err, 'Não foi possível salvar'),
                          )
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <InlineCell
                      value={professional.role}
                      onSave={async (role) => {
                        try {
                          await updateProfessional(professional.id, { role })
                          await reloadProfessionals()
                          notify('Função')
                        } catch (err) {
                          toast.error(
                            errorMessage(err, 'Não foi possível salvar'),
                          )
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <InlineCell
                      value={professional.registration}
                      onSave={async (registration) => {
                        try {
                          await updateProfessional(professional.id, {
                            registration,
                          })
                          await reloadProfessionals()
                          notify('Registro')
                        } catch (err) {
                          toast.error(
                            errorMessage(err, 'Não foi possível salvar'),
                          )
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <InlineCell
                      value={professional.email}
                      onSave={async (email) => {
                        try {
                          await updateProfessional(professional.id, { email })
                          await reloadProfessionals()
                          notify('E-mail')
                        } catch (err) {
                          toast.error(
                            errorMessage(err, 'Não foi possível salvar'),
                          )
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Excluir ${professional.name}`}
                      onClick={async () => {
                        try {
                          await deleteProfessional(professional.id)
                          await reloadProfessionals()
                          toast.success('Profissional removido', {
                            description: professional.name,
                          })
                        } catch (err) {
                          toast.error(
                            errorMessage(
                              err,
                              'Mantenha ao menos um profissional',
                            ),
                          )
                        }
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </>
  )
}
