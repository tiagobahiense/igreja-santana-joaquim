import { useMemo, useState } from 'react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay,
  addMonths, subMonths, isToday, parseISO,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, ChevronLeft, ChevronRight, CalendarDays, Clock, Trash2, Pencil } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuthStore } from '@/stores/auth.store'
import { useEventsInRange, useCreateEvent, useUpdateEvent, useDeleteEvent } from '@/hooks/use-events'
import { PageHeader } from '@/components/PageHeader'
import { AuthorTag } from '@/components/AuthorTag'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/FormField'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { eventSchema, type EventFormData } from '@/schemas'
import type { ParishEvent } from '@/types'
import { cn } from '@/lib/utils'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function Agenda() {
  const { user } = useAuthStore()
  const [cursor, setCursor] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date())
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ParishEvent | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ParishEvent | null>(null)

  const monthStart = startOfMonth(cursor)
  const monthEnd = endOfMonth(cursor)
  const gridStart = new Date(monthStart)
  gridStart.setDate(gridStart.getDate() - gridStart.getDay())
  const gridEnd = new Date(monthEnd)
  gridEnd.setDate(gridEnd.getDate() + (6 - gridEnd.getDay()))
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const { data: events = [] } = useEventsInRange(gridStart, gridEnd)
  const createEvent = useCreateEvent()
  const updateEvent = useUpdateEvent()
  const deleteEvent = useDeleteEvent()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
  })

  const eventsByDay = useMemo(() => {
    const map = new Map<string, ParishEvent[]>()
    for (const e of events) {
      const key = format(e.startAt.toDate(), 'yyyy-MM-dd')
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    }
    return map
  }, [events])

  const selectedEvents = selectedDay
    ? eventsByDay.get(format(selectedDay, 'yyyy-MM-dd')) ?? []
    : []

  function openCreate(day?: Date) {
    const d = day ?? selectedDay ?? new Date()
    setEditing(null)
    reset({
      title: '',
      description: '',
      date: format(d, 'yyyy-MM-dd'),
      time: '09:00',
    })
    setFormOpen(true)
  }

  function openEdit(event: ParishEvent) {
    setEditing(event)
    const d = event.startAt.toDate()
    reset({
      title: event.title,
      description: event.description ?? '',
      date: format(d, 'yyyy-MM-dd'),
      time: format(d, 'HH:mm'),
    })
    setFormOpen(true)
  }

  async function onSubmit(data: EventFormData) {
    const startAt = parseISO(`${data.date}T${data.time}:00`)
    if (editing) {
      await updateEvent.mutateAsync({ id: editing.id, data: { title: data.title, description: data.description, startAt } })
    } else {
      await createEvent.mutateAsync({
        title: data.title,
        description: data.description,
        startAt,
        createdBy: user!.uid,
      })
    }
    setFormOpen(false)
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Agenda da Matriz"
        description="Eventos e lembretes da paróquia"
        action={
          <Button onClick={() => openCreate()} className="gap-2 gold-gradient text-white">
            <Plus className="w-4 h-4" />Novo evento
          </Button>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 glass-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={() => setCursor(subMonths(cursor, 1))}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h2 className="font-semibold capitalize">{format(cursor, 'MMMM yyyy', { locale: ptBR })}</h2>
            <Button variant="ghost" size="icon" onClick={() => setCursor(addMonths(cursor, 1))}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const key = format(day, 'yyyy-MM-dd')
              const dayEvents = eventsByDay.get(key) ?? []
              const inMonth = isSameMonth(day, cursor)
              const selected = selectedDay && isSameDay(day, selectedDay)
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    'min-h-[72px] rounded-lg border p-1.5 text-left transition-colors',
                    inMonth ? 'bg-background' : 'bg-muted/30 text-muted-foreground',
                    selected && 'ring-2 ring-primary border-primary/30',
                    isToday(day) && 'border-primary/50',
                  )}
                >
                  <span className={cn('text-xs font-medium', isToday(day) && 'text-primary')}>
                    {format(day, 'd')}
                  </span>
                  {dayEvents.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {dayEvents.slice(0, 2).map((e) => (
                        <div key={e.id} className="text-[9px] truncate rounded px-1 py-0.5 bg-primary/10 text-primary">
                          {format(e.startAt.toDate(), 'HH:mm')} {e.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-[9px] text-muted-foreground">+{dayEvents.length - 2}</div>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">
              {selectedDay ? format(selectedDay, "d 'de' MMMM", { locale: ptBR }) : 'Selecione um dia'}
            </h3>
          </div>

          {selectedEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nenhum evento neste dia.</p>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map((event) => (
                <div key={event.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{event.title}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {format(event.startAt.toDate(), 'HH:mm')}
                      </p>
                    </div>
                    <div className="flex gap-0.5 shrink-0">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(event)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(event)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  {event.description && (
                    <p className="text-xs text-muted-foreground">{event.description}</p>
                  )}
                  <AuthorTag userId={event.createdBy} />
                </div>
              ))}
            </div>
          )}

          {selectedDay && (
            <Button variant="outline" size="sm" className="w-full mt-4 gap-1.5" onClick={() => openCreate(selectedDay)}>
              <Plus className="w-3.5 h-3.5" />Adicionar neste dia
            </Button>
          )}
        </div>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar evento' : 'Novo evento'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField label="Título" error={errors.title?.message} required>
              <Input {...register('title')} placeholder="Ex.: Reunião pastoral" />
            </FormField>
            <FormField label="Descrição" error={errors.description?.message}>
              <Input {...register('description')} placeholder="Detalhes (opcional)" />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Data" error={errors.date?.message} required>
                <Input type="date" {...register('date')} />
              </FormField>
              <FormField label="Horário" error={errors.time?.message} required>
                <Input type="time" {...register('time')} />
              </FormField>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createEvent.isPending || updateEvent.isPending}>
                {editing ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir evento?</AlertDialogTitle>
            <AlertDialogDescription>"{deleteTarget?.title}" será removido da agenda.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => { deleteEvent.mutate(deleteTarget!.id); setDeleteTarget(null) }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
