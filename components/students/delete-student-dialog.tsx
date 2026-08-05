'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { removeStudentFromStore } from '@/lib/data'
import { deleteStudent } from '@/lib/students-api'

type DeleteStudentDialogProps = {
  open: boolean
  studentId: string
  studentName: string
  onOpenChange: (open: boolean) => void
  onDeleted: () => void
}

export function DeleteStudentDialog({
  open,
  studentId,
  studentName,
  onOpenChange,
  onDeleted,
}: DeleteStudentDialogProps) {
  const [adminPassword, setAdminPassword] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!open) {
      setAdminPassword('')
      setDeleting(false)
    }
  }, [open])

  async function handleConfirm() {
    if (!adminPassword.trim()) {
      toast.error('Informe a senha do administrador')
      return
    }

    setDeleting(true)
    try {
      await deleteStudent(studentId, adminPassword)
      removeStudentFromStore(studentId)
      toast.success('Pessoa excluída', { description: studentName })
      onOpenChange(false)
      onDeleted()
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Não foi possível excluir a pessoa',
      )
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!deleting}>
        <DialogHeader>
          <DialogTitle>Excluir perfil da pessoa?</DialogTitle>
          <DialogDescription>
            Esta ação remove permanentemente o perfil de{' '}
            <span className="font-medium text-foreground">{studentName}</span>,
            incluindo contratos, pagamentos, avaliações e histórico clínico.
            Não é possível desfazer. Confirme com a senha do administrador.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <Label htmlFor="admin-password-delete">Senha do administrador</Label>
          <Input
            id="admin-password-delete"
            type="password"
            autoComplete="current-password"
            value={adminPassword}
            disabled={deleting}
            onChange={(e) => setAdminPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void handleConfirm()
              }
            }}
            placeholder="Digite a senha do admin"
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={deleting}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={deleting || !adminPassword.trim()}
            onClick={() => void handleConfirm()}
          >
            {deleting ? 'Excluindo…' : 'Excluir perfil'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
