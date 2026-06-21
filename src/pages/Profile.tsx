import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Save, ArrowLeft } from 'lucide-react'
import { Timestamp } from 'firebase/firestore'
import { useAuthStore } from '@/stores/auth.store'
import { updateUserProfile, changePassword } from '@/services/firebase/auth'
import { auth } from '@/lib/firebase'
import { Avatar } from '@/components/Avatar'
import { PageHeader } from '@/components/PageHeader'
import { FormField } from '@/components/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { userProfileSchema, type UserProfileFormData } from '@/schemas'
import { AVATAR_COLORS } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'

export function Profile() {
  const navigate = useNavigate()
  const { user, setUser } = useAuthStore()
  const [saving, setSaving] = useState(false)
  const [selectedColor, setSelectedColor] = useState(user?.avatarColor ?? AVATAR_COLORS[0])

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<UserProfileFormData>({
    resolver: zodResolver(userProfileSchema),
    defaultValues: {
      displayName: user?.displayName ?? '',
      photoURL: user?.photoURL ?? '',
      birthDate: user?.birthDate ? user.birthDate.toDate().toISOString().split('T')[0] : '',
      newPassword: '',
      currentPassword: '',
    },
  })

  const watchName = watch('displayName') || user?.displayName || 'U'
  const watchPhotoURL = watch('photoURL')

  async function onSubmit(data: UserProfileFormData) {
    if (!user || !auth.currentUser) return
    setSaving(true)
    try {
      if (data.newPassword && data.currentPassword) {
        await changePassword(auth.currentUser, data.currentPassword, data.newPassword)
      }

      const updates: Parameters<typeof updateUserProfile>[1] = {
        displayName: data.displayName,
        photoURL: data.photoURL || undefined,
        avatarColor: selectedColor,
        birthDate: data.birthDate ? Timestamp.fromDate(new Date(data.birthDate)) : undefined,
      }

      await updateUserProfile(user.uid, updates)
      setUser({ ...user, ...updates })
      toast({ title: 'Perfil atualizado!', variant: 'success' } as Parameters<typeof toast>[0])
      navigate(-1)
    } catch (err: unknown) {
      const msg = err instanceof Error && err.message.includes('wrong-password')
        ? 'Senha atual incorreta'
        : 'Erro ao atualizar perfil'
      toast({ title: msg, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <PageHeader
        title="Editar Perfil"
        action={
          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="w-4 h-4" />Voltar
          </Button>
        }
      />

      {/* Avatar preview */}
      <div className="flex justify-center">
        <Avatar
          name={watchName}
          photoURL={watchPhotoURL || undefined}
          avatarColor={selectedColor}
          size="lg"
        />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Card className="glass-card">
          <CardHeader><CardTitle>Dados pessoais</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Nome" error={errors.displayName?.message} required>
              <Input {...register('displayName')} placeholder="Seu nome completo" />
            </FormField>
            <FormField label="Data de nascimento" error={errors.birthDate?.message}>
              <Input type="date" {...register('birthDate')} />
            </FormField>
            <FormField label="URL da foto (opcional)" error={errors.photoURL?.message}>
              <Input {...register('photoURL')} placeholder="https://..." />
              <p className="text-xs text-muted-foreground">Cole o link de uma foto já hospedada na internet.</p>
            </FormField>

            <div>
              <p className="text-sm font-medium mb-2">Cor do avatar</p>
              <div className="flex flex-wrap gap-2">
                {AVATAR_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className="w-8 h-8 rounded-full ring-2 ring-offset-2 transition-all"
                    style={{
                      backgroundColor: color,
                      outline: selectedColor === color ? `3px solid ${color}` : '3px solid transparent',
                    }}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader><CardTitle>Alterar senha</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Senha atual" error={errors.currentPassword?.message}>
              <Input type="password" {...register('currentPassword')} placeholder="••••••••" />
            </FormField>
            <FormField label="Nova senha" error={errors.newPassword?.message}>
              <Input type="password" {...register('newPassword')} placeholder="Mínimo 6 caracteres" />
            </FormField>
            <p className="text-xs text-muted-foreground">Deixe em branco para não alterar a senha.</p>
          </CardContent>
        </Card>

        <Button type="submit" disabled={saving} className="w-full gold-gradient text-white gap-2">
          <Save className="w-4 h-4" />
          {saving ? 'Salvando...' : 'Salvar Perfil'}
        </Button>
      </form>
    </div>
  )
}
