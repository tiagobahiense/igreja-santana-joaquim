import type { Timestamp } from 'firebase/firestore'
import type { MonthKey } from '@/lib/utils'

// ─── User ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  uid: string
  email: string
  displayName: string
  photoURL?: string
  avatarColor?: string
  birthDate?: Timestamp
  isAdmin: boolean
  churchIds: string[]
  activeChurchId?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ─── Church ───────────────────────────────────────────────────────────────────

export interface Church {
  id: string
  name: string
  address?: string
  isActive: boolean
  deletedAt?: Timestamp
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ─── Dizimista (Tithe donor) ──────────────────────────────────────────────────

export interface Tithe {
  id: string
  churchId: string
  fullName: string
  phone?: string
  birthDate?: Timestamp
  isActive: boolean
  transferredFrom?: string
  createdBy?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type DonationRecord = Partial<Record<MonthKey, number>> & {
  updatedAt: Timestamp
}

// ─── Expense ──────────────────────────────────────────────────────────────────

export const EXPENSE_CATEGORIES = [
  'Manutenção',
  'Energia',
  'Água',
  'Internet/Telefone',
  'Pastoral',
  'Litúrgico',
  'Administrativo',
  'Obras',
  'Outros',
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export const PAYMENT_METHODS = ['Dinheiro', 'Pix', 'Cartão', 'Transferência', 'Cheque'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const RECURRENCE_RULES = ['monthly', 'yearly'] as const
export type RecurrenceRule = (typeof RECURRENCE_RULES)[number]

export interface Expense {
  id: string
  churchId: string
  category: ExpenseCategory
  subcategory?: string
  supplier?: string
  paymentMethod: PaymentMethod
  amount: number
  date: Timestamp
  description?: string
  receiptReference?: string
  receiptLink?: string
  isRecurring: boolean
  recurrenceRule?: RecurrenceRule
  isActive: boolean
  createdBy?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ─── Parish Event (agenda da matriz) ───────────────────────────────────────────

export interface ParishEvent {
  id: string
  title: string
  description?: string
  startAt: Timestamp
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ─── Task ─────────────────────────────────────────────────────────────────────

export interface Task {
  id: string
  userId: string
  churchId?: string
  title: string
  description?: string
  dueDate?: Timestamp
  completed: boolean
  showInDailyPanel: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface GlobalSettings {
  missingDonationMonths: number
  updatedAt: Timestamp
  updatedBy: string
}

// ─── Summary ──────────────────────────────────────────────────────────────────

export interface MonthlySummary {
  id: string
  churchId: string
  year: number
  month: number
  totalDonations: number
  totalExpenses: number
  activeTithesCount: number
  updatedAt: Timestamp
}
