import { z } from 'zod'
import { EXPENSE_CATEGORIES, PAYMENT_METHODS, RECURRENCE_RULES } from '@/types'

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
})

export const userProfileSchema = z.object({
  displayName: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  photoURL: z.string().url('URL inválida').optional().or(z.literal('')),
  avatarColor: z.string().optional(),
  birthDate: z.string().optional(),
  newPassword: z.string().min(6, 'Senha deve ter ao menos 6 caracteres').optional().or(z.literal('')),
  currentPassword: z.string().min(1, 'Informe a senha atual').optional().or(z.literal('')),
})

export const churchSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  address: z.string().optional(),
})

export const managerSchema = z.object({
  email: z.string().email('E-mail inválido'),
  displayName: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  password: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
  churchIds: z.array(z.string()).default([]),
})

export const titheDonorSchema = z.object({
  fullName: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  churchId: z.string().min(1, 'Selecione uma igreja'),
})

export const expenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES),
  subcategory: z.string().optional(),
  supplier: z.string().optional(),
  paymentMethod: z.enum(PAYMENT_METHODS),
  amount: z.string().min(1, 'Valor obrigatório'),
  date: z.string().min(1, 'Data obrigatória'),
  description: z.string().optional(),
  receiptReference: z.string().optional(),
  receiptLink: z.string().url('URL inválida').optional().or(z.literal('')),
  isRecurring: z.boolean().default(false),
  recurrenceRule: z.enum(RECURRENCE_RULES).optional(),
  churchId: z.string().min(1, 'Selecione uma igreja'),
})

export const taskSchema = z.object({
  title: z.string().min(1, 'Título obrigatório'),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  showInDailyPanel: z.boolean().default(true),
  churchId: z.string().optional(),
})

export const settingsSchema = z.object({
  missingDonationMonths: z.number().min(1).max(12),
})

export type LoginFormData = z.infer<typeof loginSchema>
export type UserProfileFormData = z.infer<typeof userProfileSchema>
export type ChurchFormData = z.infer<typeof churchSchema>
export type ManagerFormData = z.infer<typeof managerSchema>
export type TitheDonorFormData = z.infer<typeof titheDonorSchema>
export type ExpenseFormData = z.infer<typeof expenseSchema>
export type TaskFormData = z.infer<typeof taskSchema>
export type SettingsFormData = z.infer<typeof settingsSchema>
