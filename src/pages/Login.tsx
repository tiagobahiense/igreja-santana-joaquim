import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, LogIn, Church } from 'lucide-react'
import { motion } from 'motion/react'
import { signIn, getUserProfile, signOut } from '@/services/firebase/auth'
import { useAuthStore } from '@/stores/auth.store'
import { loginSchema, type LoginFormData } from '@/schemas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/FormField'
import { toast } from '@/hooks/use-toast'

export function Login() {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) })

  async function onSubmit(data: LoginFormData) {
    setLoading(true)
    try {
      const credential = await signIn(data.email, data.password)
      const profile = await getUserProfile(credential.user.uid)
      if (!profile) throw new Error('Perfil não encontrado')
      setUser(profile)
      navigate('/dashboard')
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? ''
      const msg = code === 'auth/invalid-credential' || code === 'auth/wrong-password'
        ? 'E-mail ou senha incorretos'
        : err instanceof Error && err.message === 'Perfil não encontrado'
          ? 'Conta sem perfil cadastrado. Peça ao administrador para concluir o cadastro.'
          : 'Erro ao entrar. Verifique suas credenciais.'
      if (err instanceof Error && err.message === 'Perfil não encontrado') {
        await signOut()
      }
      toast({ title: msg, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center church-gradient relative overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -right-32 w-[32rem] h-[32rem] rounded-full bg-white/5" />
        <div className="absolute top-1/3 left-1/4 w-64 h-64 rounded-full bg-yellow-400/5" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md mx-4"
      >
        <div className="glass rounded-3xl p-8 shadow-2xl border border-white/20">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 mb-3">
              <Church className="w-8 h-8 text-yellow-300" />
            </div>
            <h1 className="text-2xl font-bold text-white">Sant'Ana e São Joaquim</h1>
            <p className="text-white/60 text-sm mt-1">Sistema de Gestão Paroquial</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" autoComplete="on">
            <FormField label="E-mail" error={errors.email?.message} required>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                autoComplete="username"
                className="bg-white/90"
                {...register('email')}
              />
            </FormField>

            <FormField label="Senha" error={errors.password?.message} required>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="bg-white/90 pr-10"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </FormField>

            <Button type="submit" className="w-full mt-6 gold-gradient text-white" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entrando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="w-4 h-4" />
                  Entrar
                </span>
              )}
            </Button>
          </form>

          <p className="text-center text-white/40 text-xs mt-6">
            Acesso restrito a membros autorizados
          </p>
        </div>
      </motion.div>
    </div>
  )
}
