import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  type DocumentSnapshot,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Expense } from '@/types'

const col = () => collection(db, 'expenses')

export interface ExpenseFilter {
  churchId?: string
  category?: string
  year?: number
  month?: number
}

function filterActive(expenses: Expense[]): Expense[] {
  return expenses.filter((e) => e.isActive !== false)
}

function sortByDateDesc(expenses: Expense[]): Expense[] {
  return [...expenses].sort((a, b) => b.date.toMillis() - a.date.toMillis())
}

export async function getExpenses(
  filter: ExpenseFilter,
  pageSize = 50,
  cursor?: DocumentSnapshot,
): Promise<{ expenses: Expense[]; lastDoc: DocumentSnapshot | null }> {
  const q = filter.churchId
    ? query(col(), where('churchId', '==', filter.churchId))
    : query(col())

  const snap = await getDocs(q)
  let expenses = filterActive(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Expense))

  if (filter.category) {
    expenses = expenses.filter((e) => e.category === filter.category)
  }

  expenses = sortByDateDesc(expenses)

  const startIndex = cursor
    ? expenses.findIndex((e) => e.id === cursor.id) + 1
    : 0
  const page = expenses.slice(startIndex, startIndex + pageSize)
  const lastDoc = page.length > 0
    ? snap.docs.find((d) => d.id === page[page.length - 1].id) ?? null
    : null

  return { expenses: page, lastDoc }
}

export async function createExpense(data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = await addDoc(col(), {
    ...data,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateExpense(id: string, data: Partial<Expense>) {
  await updateDoc(doc(db, 'expenses', id), { ...data, updatedAt: serverTimestamp() })
}

export async function deleteExpense(id: string) {
  await updateDoc(doc(db, 'expenses', id), { isActive: false, updatedAt: serverTimestamp() })
}

export async function getExpensesForPeriod(
  churchId: string,
  year: number,
  month: number,
): Promise<Expense[]> {
  const start = new Date(year, month - 1, 1).getTime()
  const end = new Date(year, month, 1).getTime()

  const snap = await getDocs(query(col(), where('churchId', '==', churchId)))
  return filterActive(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Expense))
    .filter((e) => {
      const ms = e.date.toMillis()
      return ms >= start && ms < end
    })
    .sort((a, b) => b.date.toMillis() - a.date.toMillis())
}
