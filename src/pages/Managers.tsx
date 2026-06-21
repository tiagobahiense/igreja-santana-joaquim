import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Users as UsersIcon } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { getManagers } from '@/services/firebase/users'
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
  const { data: managers = [], isLoading } = useQuery({
    queryKey: ['managers'],
    queryFn: getManagers,
    staleTime: 1000 * 60 * 5,
  })
  const { data: churches = [] } = useChurches()
  const [formOpen, setFormOpen] = useState(false)

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
    onError: (err: Error) => {
      const msg = err.message.includes('email-already-in-use')
        ? 'Este e-mail já está em uso'
        : 'Erro ao criar gestor'
      toast({ title: msg, variant: 'destructive' })
    },
  })

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>

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
                <p className="font-semibold text-sm">{m.displayName}</p>
                <p className="text-xs text-muted-foreground">{m.email}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {m.churchIds.map((cid) => {
                    const church = churches.find((c) => c.id === cid)
                    return church ? <Badge key={cid} variant="secondary" className="text-xs">{church.name}</Badge> : null
                  })}
                </div>
              </div>
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
    </div>
  )
}
