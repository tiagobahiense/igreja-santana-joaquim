import {
  collection,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { UserProfile } from '@/types'

const col = () => collection(db, 'users')

export async function getManagers(): Promise<UserProfile[]> {
  const q = query(col(), orderBy('displayName'))
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ uid: d.id, ...d.data() }) as UserProfile)
    .filter((u) => !u.isAdmin)
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const q = query(col(), orderBy('displayName'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }) as UserProfile)
}

export async function getUser(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  return { uid: snap.id, ...snap.data() } as UserProfile
}

export async function updateManagerChurches(uid: string, churchIds: string[]) {
  const current = await getUser(uid)
  const activeStillValid = current?.activeChurchId && churchIds.includes(current.activeChurchId)
  await updateDoc(doc(db, 'users', uid), {
    churchIds,
    activeChurchId: activeStillValid ? current!.activeChurchId : (churchIds[0] ?? null),
    updatedAt: serverTimestamp(),
  })
}

export async function setActiveChurch(uid: string, churchId: string) {
  await updateDoc(doc(db, 'users', uid), {
    activeChurchId: churchId,
    updatedAt: serverTimestamp(),
  })
}
