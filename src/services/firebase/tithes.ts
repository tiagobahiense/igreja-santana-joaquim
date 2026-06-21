import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  setDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Tithe, DonationRecord } from '@/types'
import { MONTHS, type MonthKey } from '@/lib/utils'
import { updateSummary } from './summaries'

const col = () => collection(db, 'tithes')

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>
}

export async function getNextExternalId(churchId: string): Promise<string> {
  const all = await getTithes(churchId, true)
  const nums = all
    .map((t) => t.externalId?.match(/^DZ-(\d+)$/)?.[1])
    .filter(Boolean)
    .map((n) => parseInt(n!, 10))
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1
  return `DZ-${String(next).padStart(4, '0')}`
}

export async function getTithes(churchId: string, includeInactive = false): Promise<Tithe[]> {
  const q = query(col(), where('churchId', '==', churchId))
  const snap = await getDocs(q)
  let tithes = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Tithe)
  if (!includeInactive) {
    tithes = tithes.filter((t) => t.isActive !== false)
  }
  return tithes.sort((a, b) => a.fullName.localeCompare(b.fullName, 'pt-BR'))
}

export async function createTithe(data: {
  churchId: string
  externalId?: string
  fullName: string
  phone?: string
  birthDate?: Date | import('firebase/firestore').Timestamp
  createdBy?: string
}): Promise<string> {
  const payload: Record<string, unknown> = {
    churchId: data.churchId,
    fullName: data.fullName,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  if (data.externalId) payload.externalId = data.externalId
  else payload.externalId = await getNextExternalId(data.churchId)
  if (data.phone) payload.phone = data.phone
  if (data.birthDate) payload.birthDate = data.birthDate
  if (data.createdBy) payload.createdBy = data.createdBy

  const ref = await addDoc(col(), payload)
  return ref.id
}

export async function updateTithe(id: string, data: Partial<Pick<Tithe, 'fullName' | 'phone' | 'birthDate' | 'churchId' | 'isActive' | 'externalId'>>) {
  await updateDoc(doc(db, 'tithes', id), { ...stripUndefined(data as Record<string, unknown>), updatedAt: serverTimestamp() })
}

export async function softDeleteTithe(id: string) {
  await updateDoc(doc(db, 'tithes', id), {
    isActive: false,
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function restoreTithe(id: string) {
  await updateDoc(doc(db, 'tithes', id), {
    isActive: true,
    deletedAt: null,
    updatedAt: serverTimestamp(),
  })
}

export async function hardDeleteTithe(id: string) {
  const donationsSnap = await getDocs(collection(db, 'tithes', id, 'donations'))
  await Promise.all(donationsSnap.docs.map((d) => deleteDoc(d.ref)))
  await deleteDoc(doc(db, 'tithes', id))
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

export async function setDonationsYear(
  tithesId: string,
  churchId: string,
  year: number,
  donations: Partial<Record<MonthKey, number>>,
  options?: { skipSummary?: boolean },
): Promise<number[]> {
  const ref = doc(db, 'tithes', tithesId, 'donations', String(year))
  await setDoc(ref, { ...donations, updatedAt: serverTimestamp() }, { merge: true })

  const monthsToUpdate: number[] = []
  for (const month of MONTHS) {
    if ((donations[month.key] ?? 0) > 0) {
      monthsToUpdate.push(monthKeyToIndex(month.key) + 1)
    }
  }

  if (!options?.skipSummary) {
    await Promise.all(
      monthsToUpdate.map((month) => updateSummary(churchId, year, month)),
    )
  }

  return monthsToUpdate
}

export interface ImportTitheRow {
  externalId: string
  fullName: string
  phone?: string
  donations: Partial<Record<MonthKey, number>>
}

export interface ImportTithesResult {
  created: number
  updated: number
}

function normalizeName(name: string): string {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

export async function importTithesFromCsv(
  churchId: string,
  year: number,
  rows: ImportTitheRow[],
  createdBy?: string,
): Promise<ImportTithesResult> {
  const existing = await getTithes(churchId, true)
  const byName = new Map(existing.map((t) => [normalizeName(t.fullName), t]))

  let created = 0
  let updated = 0

  const sortedRows = [...rows].sort((a, b) => a.fullName.localeCompare(b.fullName, 'pt-BR'))

  sortedRows.forEach((row, index) => {
    row.externalId = `DZ-${String(index + 1).padStart(4, '0')}`
  })

  const monthsToRefresh = new Set<number>()

  for (const row of sortedRows) {
    const match = byName.get(normalizeName(row.fullName))

    if (match) {
      const patch: Parameters<typeof updateTithe>[1] = {
        fullName: row.fullName,
        externalId: row.externalId,
        isActive: true,
      }
      if (row.phone) patch.phone = row.phone

      await updateTithe(match.id, patch)
      const months = await setDonationsYear(match.id, churchId, year, row.donations, { skipSummary: true })
      months.forEach((m) => monthsToRefresh.add(m))
      byName.set(normalizeName(row.fullName), { ...match, externalId: row.externalId })
      updated++
      continue
    }

    const id = await createTithe({
      churchId,
      externalId: row.externalId,
      fullName: row.fullName,
      phone: row.phone,
      createdBy,
    })

    const months = await setDonationsYear(id, churchId, year, row.donations, { skipSummary: true })
    months.forEach((m) => monthsToRefresh.add(m))
    byName.set(normalizeName(row.fullName), {
      id,
      churchId,
      externalId: row.externalId,
      fullName: row.fullName,
      isActive: true,
    } as Tithe)
    created++
  }

  await Promise.all(
    [...monthsToRefresh].map((month) => updateSummary(churchId, year, month)),
  )

  return { created, updated }
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
