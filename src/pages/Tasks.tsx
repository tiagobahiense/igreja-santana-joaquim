import { useState } from 'react'
import { Plus, CheckSquare, Trash2, Check, Clock } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Timestamp } from 'firebase/firestore'
import { useAuthStore } from '@/stores/auth.store'
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, useToggleTask } from '@/hooks/use-tasks'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { FormField } from '@/components/FormField'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { taskSchema, type TaskFormData } from '@/schemas'
import type { Task } from '@/types'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

export function Tasks() {
  const { user } = useAuthStore()
  const { data: tasks = [], isLoading } = useTasks(user?.uid ?? '')
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const toggleTask = useToggleTask()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all')

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: { showInDailyPanel: true },
  })

  function openCreate() {
    setEditing(null)
    reset({ title: '', description: '', dueDate: '', showInDailyPanel: true })
    setFormOpen(true)
  }

  function openEdit(task: Task) {
    setEditing(task)
    reset({
      title: task.title,
      description: task.description ?? '',
      dueDate: task.dueDate ? task.dueDate.toDate().toISOString().split('T')[0] : '',
      showInDailyPanel: task.showInDailyPanel,
    })
    setFormOpen(true)
  }

  async function onSubmit(data: TaskFormData) {
    const payload = {
      userId: user!.uid,
      title: data.title,
      description: data.description || undefined,
      dueDate: data.dueDate ? Timestamp.fromDate(new Date(data.dueDate)) : undefined,
      showInDailyPanel: data.showInDailyPanel,
      completed: false,
    }
    if (editing) {
      await updateTask.mutateAsync({ id: editing.id, data: payload })
    } else {
      await createTask.mutateAsync(payload as Parameters<typeof createTask.mutateAsync>[0])
    }
    setFormOpen(false)
  }

  const filtered = tasks.filter((t) => {
    if (filter === 'pending') return !t.completed
    if (filter === 'done') return t.completed
    return true
  })

  const isOverdue = (task: Task) =>
    task.dueDate && task.dueDate.toDate() < new Date() && !task.completed

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tarefas"
        description="Seus lembretes e tarefas pessoais"
        action={
          <Button onClick={openCreate} className="gap-2 gold-gradient text-white">
            <Plus className="w-4 h-4" />Nova Tarefa
          </Button>
        }
      />

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['all', 'pending', 'done'] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? 'default' : 'outline'}
            onClick={() => setFilter(f)}
          >
            {{ all: 'Todas', pending: 'Pendentes', done: 'Concluídas' }[f]}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={CheckSquare} title="Nenhuma tarefa" action={<Button onClick={openCreate}>Criar tarefa</Button>} />
      ) : (
        <div className="grid gap-2">
          {filtered.map((task) => (
            <div
              key={task.id}
              className={cn(
                'glass-card rounded-xl p-4 flex items-start gap-3 transition-opacity',
                task.completed && 'opacity-60',
              )}
            >
              <button
                onClick={() => toggleTask.mutate({ id: task.id, completed: !task.completed })}
                className={cn(
                  'mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                  task.completed
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'border-border hover:border-primary',
                )}
              >
                {task.completed && <Check className="w-3 h-3" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={cn('font-medium text-sm', task.completed && 'line-through text-muted-foreground')}>
                  {task.title}
                </p>
                {task.description && <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>}
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  {task.dueDate && (
                    <span className={cn('text-xs flex items-center gap-1', isOverdue(task) ? 'text-destructive' : 'text-muted-foreground')}>
                      <Clock className="w-3 h-3" />
                      {formatDate(task.dueDate.toDate())}
                      {isOverdue(task) && <Badge variant="destructive" className="text-[10px] px-1 py-0">Atrasada</Badge>}
                    </span>
                  )}
                  {task.showInDailyPanel && <Badge variant="secondary" className="text-[10px] px-1 py-0">Painel</Badge>}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(task)}>
                  <CheckSquare className="w-3 h-3" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(task)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField label="Título" error={errors.title?.message} required>
              <Input {...register('title')} placeholder="Título da tarefa" />
            </FormField>
            <FormField label="Descrição" error={errors.description?.message}>
              <Input {...register('description')} placeholder="Detalhes (opcional)" />
            </FormField>
            <FormField label="Data de vencimento" error={errors.dueDate?.message}>
              <Input type="date" {...register('dueDate')} />
            </FormField>
            <div className="flex items-center gap-3">
              <Controller control={control} name="showInDailyPanel" render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} id="show-panel" />
              )} />
              <Label htmlFor="show-panel">Mostrar no painel central</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createTask.isPending || updateTask.isPending}>
                {editing ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
            <AlertDialogDescription>"{deleteTarget?.title}" será excluída permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => { deleteTask.mutate(deleteTarget!.id); setDeleteTarget(null) }}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
