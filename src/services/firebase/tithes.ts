import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  setDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Tithe, DonationRecord } from '@/types'
import type { MonthKey } from '@/lib/utils'
import { updateSummary } from './summaries'

const col = () => collection(db, 'tithes')

export async function getTithes(churchId: string, includeInactive = false): Promise<Tithe[]> {
  const conditions = [where('churchId', '==', churchId)]
  if (!includeInactive) conditions.push(where('isActive', '==', true))
  const q = query(col(), ...conditions, orderBy('fullName'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Tithe)
}

export async function createTithe(data: {
  churchId: string
  fullName: string
  phone?: string
  birthDate?: Date | import('firebase/firestore').Timestamp
}): Promise<string> {
  const ref = await addDoc(col(), {
    ...data,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateTithe(id: string, data: Partial<Pick<Tithe, 'fullName' | 'phone' | 'birthDate' | 'churchId' | 'isActive'>>) {
  await updateDoc(doc(db, 'tithes', id), { ...data, updatedAt: serverTimestamp() })
}

export async function transferTithe(id: string, newChurchId: string, fromChurchId: string) {
  await updateDoc(doc(db, 'tithes', id), {
    churchId: newChurchId,
    transferredFrom: fromChurchId,
    updatedAt: serverTimestamp(),
  })
}

// ─── Donations grid ────────────────────────────────────────────────────────────

export async function getDonations(tithesId: string, year: number): Promise<DonationRecord | null> {
  const snap = await getDoc(doc(db, 'tithes', tithesId, 'donations', String(year)))
  if (!snap.exists()) return null
  return snap.data() as DonationRecord
}

export async function setDonation(
  tithesId: string,
  churchId: string,
  year: number,
  month: MonthKey,
  valueInCents: number,
) {
  const ref = doc(db, 'tithes', tithesId, 'donations', String(year))
  await setDoc(ref, { [month]: valueInCents, updatedAt: serverTimestamp() }, { merge: true })
  // Update monthly summary
  await updateSummary(churchId, year, monthKeyToIndex(month) + 1)
}

function monthKeyToIndex(key: MonthKey): number {
  const keys = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']
  return keys.indexOf(key)
}

export async function getAllDonationsForYear(
  churchId: string,
  year: number,
): Promise<Map<string, DonationRecord>> {
  const tithes = await getTithes(churchId)
  const result = new Map<string, DonationRecord>()
  await Promise.all(
    tithes.map(async (t) => {
      const donations = await getDonations(t.id, year)
      if (donations) result.set(t.id, donations)
    }),
  )
  return result
}
