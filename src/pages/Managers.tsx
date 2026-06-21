import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Users as UsersIcon, Pencil } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { getManagers, updateManagerChurches } from '@/services/firebase/users'
import { createManagerAccount } from '@/services/firebase/auth'
import { addLog } from '@/services/firebase/logs'
import { useAuthStore } from '@/stores/auth.store'
import { useChurches } from '@/hooks/use-churches'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Avatar } from '@/components/Avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/FormField'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { managerSchema, type ManagerFormData } from '@/schemas'
import { toast } from '@/hooks/use-toast'

export function Managers() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const { data: managers = [], isLoading, isError, error } = useQuery({
    queryKey: ['managers'],
    queryFn: getManagers,
    staleTime: 1000 * 60 * 5,
  })
  const { data: churches = [] } = useChurches()
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<{ uid: string; name: string; churchIds: string[] } | null>(null)
  const [editChurchIds, setEditChurchIds] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ManagerFormData>({ resolver: zodResolver(managerSchema) })

  const createMutation = useMutation({
    mutationFn: (data: ManagerFormData) =>
      createManagerAccount(data.email, data.password, data.displayName, data.churchIds),
    onSuccess: (_uid, data) => {
      qc.invalidateQueries({ queryKey: ['managers'] })
      if (user) addLog({ userId: user.uid, userEmail: user.email, userDisplayName: user.displayName, action: 'create_manager', entityType: 'user', entityName: data.displayName })
      toast({ title: 'Gestor criado!', variant: 'success' } as Parameters<typeof toast>[0])
      setFormOpen(false)
      reset()
    },
    onError: (err: unknown) => {
      const code = (err as { code?: string })?.code ?? ''
      const msg = code === 'auth/email-already-in-use'
        ? 'Este e-mail já existe no Auth. Use "Reparar perfil" ou exclua no Firebase Console.'
        : code === 'permission-denied'
          ? 'Sem permissão para gravar o perfil. Verifique as regras do Firestore.'
          : code === 'auth/weak-password'
            ? 'Senha muito fraca (mínimo 6 caracteres)'
            : 'Erro ao criar gestor. Tente novamente.'
      toast({ title: msg, variant: 'destructive' })
    },
  })

  const updateChurchesMutation = useMutation({
    mutationFn: ({ uid, churchIds }: { uid: string; churchIds: string[] }) =>
      updateManagerChurches(uid, churchIds),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['managers'] })
      toast({ title: 'Igrejas atualizadas!', variant: 'success' } as Parameters<typeof toast>[0])
      setEditTarget(null)
      if (user) {
        addLog({
          userId: user.uid,
          userEmail: user.email,
          userDisplayName: user.displayName,
          action: 'update_manager',
          entityType: 'user',
          entityId: variables.uid,
        })
      }
    },
    onError: () => toast({ title: 'Erro ao atualizar igrejas do gestor', variant: 'destructive' }),
  })

  function openEditChurches(manager: { uid: string; displayName: string; churchIds?: string[] }) {
    setEditTarget({ uid: manager.uid, name: manager.displayName, churchIds: manager.churchIds ?? [] })
    setEditChurchIds(manager.churchIds ?? [])
  }

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>

  if (isError) {
    const message = (error as { message?: string })?.message ?? 'Erro desconhecido'
    return (
      <div className="p-8 text-center space-y-2">
        <p className="text-destructive font-medium">Erro ao carregar gestores</p>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">{message}</p>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Gestores"
        description="Gerencie os gestores das igrejas"
        action={
          <Button onClick={() => { reset(); setFormOpen(true) }} className="gap-2 gold-gradient text-white">
            <Plus className="w-4 h-4" />Novo Gestor
          </Button>
        }
      />

      {managers.length === 0 ? (
        <EmptyState icon={UsersIcon} title="Nenhum gestor cadastrado" />
      ) : (
        <div className="grid gap-3">
          {managers.map((m) => (
            <div key={m.uid} className="glass-card rounded-xl p-4 flex items-center gap-4">
              <Avatar name={m.displayName} photoURL={m.photoURL} avatarColor={m.avatarColor} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm">{m.displayName}</p>
                  {(m.churchIds ?? []).length === 0 && (
                    <Badge variant="secondary" className="text-xs">Nenhuma igreja</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{m.email}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(m.churchIds ?? []).map((cid) => {
                    const church = churches.find((c) => c.id === cid)
                    return church ? <Badge key={cid} variant="secondary" className="text-xs">{church.name}</Badge> : null
                  })}
                </div>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => openEditChurches(m)}>
                <Pencil className="w-3.5 h-3.5" />Igrejas
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Gestor</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
            <FormField label="Nome" error={errors.displayName?.message} required>
              <Input {...register('displayName')} placeholder="Nome completo" />
            </FormField>
            <FormField label="E-mail" error={errors.email?.message} required>
              <Input type="email" {...register('email')} placeholder="email@exemplo.com" />
            </FormField>
            <FormField label="Senha" error={errors.password?.message} required>
              <Input type="password" {...register('password')} placeholder="Mínimo 6 caracteres" />
            </FormField>
            <FormField label="Igrejas" error={errors.churchIds?.message}>
              <Controller
                control={control}
                name="churchIds"
                defaultValue={[]}
                render={({ field }) => (
                  <div className="flex flex-col gap-2 border rounded-md p-3 bg-background max-h-40 overflow-y-auto">
                    {churches.map((c) => (
                      <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          value={c.id}
                          checked={field.value.includes(c.id)}
                          onChange={(e) => {
                            if (e.target.checked) field.onChange([...field.value, c.id])
                            else field.onChange(field.value.filter((v) => v !== c.id))
                          }}
                          className="accent-primary"
                        />
                        {c.name}
                      </label>
                    ))}
                  </div>
                )}
              />
            </FormField>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Criando...' : 'Criar Gestor'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Igrejas — {editTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              O gestor só acessa dízimos e despesas das igrejas selecionadas.
            </p>
            <div className="flex flex-col gap-2 border rounded-md p-3 bg-background max-h-48 overflow-y-auto">
              {churches.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editChurchIds.includes(c.id)}
                    onChange={(e) => {
                      if (e.target.checked) setEditChurchIds([...editChurchIds, c.id])
                      else setEditChurchIds(editChurchIds.filter((id) => id !== c.id))
                    }}
                    className="accent-primary"
                  />
                  {c.name}
                </label>
              ))}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>Cancelar</Button>
              <Button
                disabled={updateChurchesMutation.isPending}
                onClick={() => editTarget && updateChurchesMutation.mutate({ uid: editTarget.uid, churchIds: editChurchIds })}
              >
                {updateChurchesMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
