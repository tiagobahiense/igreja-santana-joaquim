import { useState } from 'react'
import { Plus, Pencil, Trash2, RotateCcw, Church as ChurchIcon } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useChurches, useCreateChurch, useUpdateChurch, useSoftDeleteChurch, useHardDeleteChurch, useRestoreChurch } from '@/hooks/use-churches'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { FormField } from '@/components/FormField'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { churchSchema, type ChurchFormData } from '@/schemas'
import type { Church } from '@/types'

export function Churches() {
  const { data: churches = [], isLoading } = useChurches(true)
  const create = useCreateChurch()
  const update = useUpdateChurch()
  const softDelete = useSoftDeleteChurch()
  const hardDelete = useHardDeleteChurch()
  const restore = useRestoreChurch()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Church | null>(null)
  const [softDeleteTarget, setSoftDeleteTarget] = useState<Church | null>(null)
  const [hardDeleteTarget, setHardDeleteTarget] = useState<Church | null>(null)
  const [hardDeleteConfirm, setHardDeleteConfirm] = useState('')

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ChurchFormData>({
    resolver: zodResolver(churchSchema),
  })

  function openCreate() {
    setEditing(null)
    reset({ name: '', address: '' })
    setFormOpen(true)
  }

  function openEdit(church: Church) {
    setEditing(church)
    reset({ name: church.name, address: church.address ?? '' })
    setFormOpen(true)
  }

  async function onSubmit(data: ChurchFormData) {
    if (editing) {
      await update.mutateAsync({ id: editing.id, data })
    } else {
      await create.mutateAsync(data)
    }
    setFormOpen(false)
  }

  async function handleHardDelete() {
    if (!hardDeleteTarget || hardDeleteConfirm !== hardDeleteTarget.name) return
    await hardDelete.mutateAsync(hardDeleteTarget.id)
    setHardDeleteTarget(null)
    setHardDeleteConfirm('')
  }

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>

  return (
    <div>
      <PageHeader
        title="Igrejas"
        description="Gerencie as igrejas da paróquia"
        action={<Button onClick={openCreate} className="gap-2 gold-gradient text-white"><Plus className="w-4 h-4" />Nova Igreja</Button>}
      />

      {churches.length === 0 ? (
        <EmptyState icon={ChurchIcon} title="Nenhuma igreja cadastrada" action={<Button onClick={openCreate}>Cadastrar primeira igreja</Button>} />
      ) : (
        <div className="grid gap-3">
          {churches.map((church) => (
            <div key={church.id} className="glass-card rounded-xl p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm truncate">{church.name}</h3>
                  {!church.isActive && <Badge variant="warning">Inativa</Badge>}
                </div>
                {church.address && <p className="text-xs text-muted-foreground mt-0.5 truncate">{church.address}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!church.isActive ? (
                  <Button size="sm" variant="outline" onClick={() => restore.mutate(church.id)}>
                    <RotateCcw className="w-4 h-4" />
                    Restaurar
                  </Button>
                ) : (
                  <>
                    <Button size="icon" variant="ghost" onClick={() => openEdit(church)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-yellow-600" onClick={() => setSoftDeleteTarget(church)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
                {!church.isActive && (
                  <Button size="sm" variant="destructive" onClick={() => { setHardDeleteTarget(church); setHardDeleteConfirm('') }}>
                    <Trash2 className="w-4 h-4" />
                    Excluir
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Igreja' : 'Nova Igreja'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField label="Nome" error={errors.name?.message} required>
              <Input {...register('name')} placeholder="Nome da Igreja" />
            </FormField>
            <FormField label="Endereço" error={errors.address?.message}>
              <Input {...register('address')} placeholder="Rua, número, bairro..." />
            </FormField>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={create.isPending || update.isPending}>
                {editing ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Soft delete confirm */}
      <AlertDialog open={!!softDeleteTarget} onOpenChange={() => setSoftDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar Igreja?</AlertDialogTitle>
            <AlertDialogDescription>
              A igreja "<strong>{softDeleteTarget?.name}</strong>" ficará inativa. Os dados são preservados e podem ser restaurados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-yellow-600 hover:bg-yellow-700" onClick={() => { softDelete.mutate(softDeleteTarget!.id); setSoftDeleteTarget(null) }}>
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hard delete confirm */}
      <AlertDialog open={!!hardDeleteTarget} onOpenChange={() => setHardDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Permanentemente?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span>Esta ação é <strong>irreversível</strong>. Todos os dizimistas, dízimos e despesas desta igreja serão excluídos.</span>
              <br />
              <span>Digite o nome da igreja para confirmar: <strong>{hardDeleteTarget?.name}</strong></span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={hardDeleteConfirm}
            onChange={(e) => setHardDeleteConfirm(e.target.value)}
            placeholder={hardDeleteTarget?.name}
            className="my-2"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              disabled={hardDeleteConfirm !== hardDeleteTarget?.name || hardDelete.isPending}
              onClick={handleHardDelete}
            >
              {hardDelete.isPending ? 'Excluindo...' : 'Excluir permanentemente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
