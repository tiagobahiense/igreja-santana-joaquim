import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { MonthlySummary } from '@/types'
import { getTithes } from './tithes'
import { getExpensesForPeriod } from './expenses'

function summaryId(churchId: string, year: number, month: number) {
  return `${churchId}_${year}_${String(month).padStart(2, '0')}`
}

export async function getSummary(churchId: string, year: number, month: number): Promise<MonthlySummary | null> {
  const snap = await getDoc(doc(db, 'summaries', summaryId(churchId, year, month)))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as MonthlySummary
}

export async function getSummariesForYear(churchId: string, year: number): Promise<MonthlySummary[]> {
  const q = query(
    collection(db, 'summaries'),
    where('churchId', '==', churchId),
    where('year', '==', year),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as MonthlySummary)
}

export async function getAllSummariesForYear(year: number): Promise<MonthlySummary[]> {
  const q = query(collection(db, 'summaries'), where('year', '==', year))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as MonthlySummary)
}

export async function updateSummary(churchId: string, year: number, month: number) {
  // Recalculate donations for this month
  const tithes = await getTithes(churchId)
  const activeTithesCount = tithes.length

  // Get all donation docs for the year and sum the month
  const monthKeys = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']
  const monthKey = monthKeys[month - 1]

  let totalDonations = 0
  await Promise.all(
    tithes.map(async (t) => {
      const donSnap = await getDoc(doc(db, 'tithes', t.id, 'donations', String(year)))
      if (donSnap.exists()) {
        const data = donSnap.data()
        totalDonations += (data[monthKey] as number) ?? 0
      }
    }),
  )

  // Get expenses for this month
  const expenses = await getExpensesForPeriod(churchId, year, month)
  const totalExpenses = expenses
    .filter((e) => (e.type ?? 'expense') === 'expense')
    .reduce((sum, e) => sum + e.amount, 0)
  const totalOtherIncome = expenses
    .filter((e) => e.type === 'income')
    .reduce((sum, e) => sum + e.amount, 0)

  const id = summaryId(churchId, year, month)
  await setDoc(
    doc(db, 'summaries', id),
    {
      churchId,
      year,
      month,
      totalDonations,
      totalExpenses,
      totalOtherIncome,
      activeTithesCount,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}
