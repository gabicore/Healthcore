'use client'

import { useEffect, useId, useState } from 'react'
import { Check, X } from 'lucide-react'

import { Input } from '@/components/ui/input'
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

type InlineCellProps = {
  value: string
  displayValue?: string
  type?: 'text' | 'number' | 'select'
  options?: Option[]
  placeholder?: string
  emptyLabel?: string
  className?: string
  onSave: (value: string) => void
}

export function InlineCell({
  value,
  displayValue,
  type = 'text',
  options = [],
  placeholder,
  emptyLabel = 'Clique para editar',
  className,
  onSave,
}: InlineCellProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const fieldId = useId()

  useEffect(() => {
    if (!editing) setDraft(value)
  }, [value, editing])

  useEffect(() => {
    if (!editing || type === 'select') return
    const el = document.getElementById(fieldId) as HTMLInputElement | null
    el?.focus()
    el?.select()
  }, [editing, type, fieldId])

  function commit(next = draft) {
    const trimmed = typeof next === 'string' ? next.trim() : next
    setEditing(false)
    if (trimmed === value) return
    onSave(trimmed)
  }

  function cancel() {
    setDraft(value)
    setEditing(false)
  }

  const shown = displayValue ?? value
  const isEmpty = !shown

  if (editing) {
    if (type === 'select') {
      return (
        <Select
          value={draft || null}
          onValueChange={(v) => {
            const next = v ?? ''
            setDraft(next)
            commit(next)
          }}
          items={Object.fromEntries(
            options.map((opt) => [opt.value, opt.label]),
          )}
        >
          <SelectTrigger id={fieldId} size="sm" className={cn('w-full', className)}>
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
      )
    }

    return (
      <div className={cn('flex items-center gap-1', className)}>
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
          className="h-7"
        />
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
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(value)
        setEditing(true)
      }}
      className={cn(
        'w-full rounded-md px-1.5 py-1 text-left text-sm transition-colors',
        '-mx-1.5 hover:bg-muted/70 focus-visible:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
        isEmpty ? 'italic text-muted-foreground' : 'text-foreground',
        className,
      )}
      title="Clique para editar"
    >
      {isEmpty ? emptyLabel : shown}
    </button>
  )
}
