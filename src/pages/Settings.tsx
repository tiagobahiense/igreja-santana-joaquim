import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Settings2 } from 'lucide-react'
import { getSettings, updateSettings } from '@/services/firebase/settings'
import { useAuthStore } from '@/stores/auth.store'
import { PageHeader } from '@/components/PageHeader'
import { FormField } from '@/components/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { settingsSchema, type SettingsFormData } from '@/schemas'
import { toast } from '@/hooks/use-toast'

export function Settings() {
  const { user } = useAuthStore()
  const qc = useQueryClient()

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
    staleTime: 1000 * 60 * 10,
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: { missingDonationMonths: 2 },
  })

  useEffect(() => {
    if (settings) reset({ missingDonationMonths: settings.missingDonationMonths })
  }, [settings, reset])

  const mutation = useMutation({
    mutationFn: (data: SettingsFormData) =>
      updateSettings({ missingDonationMonths: data.missingDonationMonths }, user!.uid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] })
      toast({ title: 'Configurações salvas!', variant: 'success' } as Parameters<typeof toast>[0])
    },
  })

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>

  return (
    <div className="max-w-lg space-y-6">
      <PageHeader title="Configurações" description="Parâmetros globais do sistema" />

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-primary" />
            Alertas de Dízimos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <FormField
              label="Meses sem doação para alertar"
              error={errors.missingDonationMonths?.message}
              required
            >
              <Input
                type="number"
                min={1}
                max={12}
                {...register('missingDonationMonths', { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">
                Após quantos meses consecutivos sem doação o dizimista deve aparecer nos alertas.
              </p>
            </FormField>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
