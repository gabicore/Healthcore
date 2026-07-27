'use client'

import { useEffect, useId, useState } from 'react'
import { Check, X } from 'lucide-react'
import { toast } from 'sonner'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

type Option = { value: string; label: string }

type InlineFieldProps = {
  label: string
  value: string
  displayValue?: string
  type?: 'text' | 'email' | 'tel' | 'date' | 'number' | 'textarea' | 'select'
  options?: Option[]
  placeholder?: string
  onSave: (value: string) => void
  className?: string
  valueClassName?: string
  emptyLabel?: string
}

export function InlineField({
  label,
  value,
  displayValue,
  type = 'text',
  options = [],
  placeholder,
  onSave,
  className,
  valueClassName,
  emptyLabel = 'Clique para preencher',
}: InlineFieldProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const fieldId = useId()

  useEffect(() => {
    if (!editing) setDraft(value)
  }, [value, editing])

  useEffect(() => {
    if (!editing || type === 'select') return
    const el = document.getElementById(fieldId) as
      | HTMLInputElement
      | HTMLTextAreaElement
      | null
    el?.focus()
    if (el && 'select' in el) el.select()
  }, [editing, type, fieldId])

  function commit(next = draft) {
    const trimmed = typeof next === 'string' ? next.trim() : next
    setEditing(false)
    if (trimmed === value) return
    onSave(trimmed)
    toast.success(`${label} atualizado`, { duration: 1800 })
  }

  function cancel() {
    setDraft(value)
    setEditing(false)
  }

  function startEdit() {
    setDraft(value)
    setEditing(true)
  }

  const shown = displayValue ?? value
  const isEmpty = !shown

  return (
    <div className={cn('flex flex-col gap-0.5 py-2', className)}>
      <dt className="text-xs text-muted-foreground">
        <label htmlFor={editing ? fieldId : undefined}>{label}</label>
      </dt>
      <dd>
        {editing ? (
          <div className="flex flex-col gap-1.5">
            {type === 'select' ? (
              <Select
                value={draft || null}
                onValueChange={(v) => {
                  const next = v ?? ''
                  setDraft(next)
                  commit(next)
                }}
              >
                <SelectTrigger id={fieldId} className="w-full">
                  <SelectValue placeholder={placeholder ?? 'Selecione'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {options.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            ) : type === 'textarea' ? (
              <Textarea
                id={fieldId}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.preventDefault()
                    cancel()
                  }
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault()
                    commit()
                  }
                }}
                onBlur={() => commit()}
                placeholder={placeholder}
                className="min-h-20"
              />
            ) : (
              <Input
                id={fieldId}
                type={type}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.preventDefault()
                    cancel()
                  }
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    commit()
                  }
                }}
                onBlur={() => commit()}
                placeholder={placeholder}
              />
            )}
            {type !== 'select' ? (
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => commit()}
                  aria-label="Salvar"
                >
                  <Check className="size-3.5 text-primary" />
                </Button>
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={cancel}
                  aria-label="Cancelar"
                >
                  <X className="size-3.5 text-muted-foreground" />
                </Button>
                {type === 'textarea' ? (
                  <span className="text-[10px] text-muted-foreground">
                    ⌘/Ctrl + Enter para salvar
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : (
          <button
            type="button"
            onClick={startEdit}
            className={cn(
              'group w-full rounded-md px-1.5 py-1 text-left text-sm transition-colors',
              '-mx-1.5 hover:bg-muted/70 focus-visible:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
              isEmpty ? 'italic text-muted-foreground' : 'text-foreground',
              valueClassName,
            )}
            title="Clique para editar"
          >
            <span className="break-words whitespace-pre-wrap">
              {isEmpty ? emptyLabel : shown}
            </span>
          </button>
        )}
      </dd>
    </div>
  )
}
