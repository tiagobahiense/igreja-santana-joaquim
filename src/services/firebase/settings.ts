import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { GlobalSettings } from '@/types'

const SETTINGS_DOC = doc(db, 'settings', 'global')

export async function getSettings(): Promise<GlobalSettings> {
  const snap = await getDoc(SETTINGS_DOC)
  if (!snap.exists()) {
    return {
      missingDonationMonths: 2,
    } as GlobalSettings
  }
  return snap.data() as GlobalSettings
}

export async function updateSettings(
  data: Partial<Pick<GlobalSettings, 'missingDonationMonths'>>,
  updatedBy: string,
) {
  await setDoc(
    SETTINGS_DOC,
    { ...data, updatedBy, updatedAt: serverTimestamp() },
    { merge: true },
  )
}
