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
  setDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Tithe, DonationRecord } from '@/types'
import { MONTHS, type MonthKey } from '@/lib/utils'
import { updateSummary } from './summaries'

const col = () => collection(db, 'tithes')

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
  if (data.phone) payload.phone = data.phone
  if (data.birthDate) payload.birthDate = data.birthDate
  if (data.createdBy) payload.createdBy = data.createdBy

  const ref = await addDoc(col(), payload)
  return ref.id
}

export async function updateTithe(id: string, data: Partial<Pick<Tithe, 'fullName' | 'phone' | 'birthDate' | 'churchId' | 'isActive' | 'externalId'>>) {
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

export async function setDonationsYear(
  tithesId: string,
  churchId: string,
  year: number,
  donations: Partial<Record<MonthKey, number>>,
) {
  const ref = doc(db, 'tithes', tithesId, 'donations', String(year))
  await setDoc(ref, { ...donations, updatedAt: serverTimestamp() }, { merge: true })

  const monthsToUpdate = new Set<number>()
  for (const month of MONTHS) {
    if ((donations[month.key] ?? 0) > 0) {
      monthsToUpdate.add(monthKeyToIndex(month.key) + 1)
    }
  }
  await Promise.all(
    [...monthsToUpdate].map((month) => updateSummary(churchId, year, month)),
  )
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
  const byExternalId = new Map(existing.filter((t) => t.externalId).map((t) => [t.externalId!, t]))
  const byName = new Map(existing.map((t) => [normalizeName(t.fullName), t]))

  let created = 0
  let updated = 0

  const sortedRows = [...rows].sort((a, b) => a.fullName.localeCompare(b.fullName, 'pt-BR'))

  for (const row of sortedRows) {
    const match =
      byExternalId.get(row.externalId)
      ?? byName.get(normalizeName(row.fullName))

    if (match) {
      await updateTithe(match.id, {
        fullName: row.fullName,
        phone: row.phone,
        externalId: row.externalId,
        isActive: true,
      })
      await setDonationsYear(match.id, churchId, year, row.donations)
      byExternalId.set(row.externalId, { ...match, externalId: row.externalId })
      byName.set(normalizeName(row.fullName), match)
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

    await setDonationsYear(id, churchId, year, row.donations)
    created++
  }

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
