import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  type DocumentSnapshot,
  Timestamp,
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

export async function getExpenses(
  filter: ExpenseFilter,
  pageSize = 50,
  cursor?: DocumentSnapshot,
): Promise<{ expenses: Expense[]; lastDoc: DocumentSnapshot | null }> {
  const conditions = [where('isActive', '==', true)]

  if (filter.churchId) conditions.push(where('churchId', '==', filter.churchId))
  if (filter.category) conditions.push(where('category', '==', filter.category))

  let q = query(col(), ...conditions, orderBy('date', 'desc'), limit(pageSize))
  if (cursor) q = query(col(), ...conditions, orderBy('date', 'desc'), startAfter(cursor), limit(pageSize))

  const snap = await getDocs(q)
  const expenses = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Expense)
  const lastDoc = snap.docs[snap.docs.length - 1] ?? null
  return { expenses, lastDoc }
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
  const start = Timestamp.fromDate(new Date(year, month - 1, 1))
  const end = Timestamp.fromDate(new Date(year, month, 1))
  const q = query(
    col(),
    where('churchId', '==', churchId),
    where('isActive', '==', true),
    where('date', '>=', start),
    where('date', '<', end),
    orderBy('date', 'desc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Expense)
}
