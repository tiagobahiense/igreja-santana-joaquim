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
  orderBy,
  limit,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Church } from '@/types'
import { findMatrizChurch } from '@/lib/churches'

const col = () => collection(db, 'churches')

export async function getChurches(includeInactive = false): Promise<Church[]> {
  const snap = await getDocs(query(col(), orderBy('name')))
  const churches = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Church)
  if (includeInactive) return churches
  return churches.filter((c) => c.isActive !== false)
}

export async function getChurch(id: string): Promise<Church | null> {
  const snap = await getDoc(doc(db, 'churches', id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Church
}

export async function resolveMatrizChurch(): Promise<Church | null> {
  const churches = await getChurches(true)
  const found = findMatrizChurch(churches)
  if (found) return found

  const tithesSnap = await getDocs(
    query(collection(db, 'tithes'), where('isActive', '==', true), limit(1)),
  )
  if (!tithesSnap.empty) {
    const churchId = tithesSnap.docs[0].data().churchId as string
    return churches.find((c) => c.id === churchId) ?? await getChurch(churchId)
  }

  return null
}

export async function createChurch(data: { name: string; address?: string }): Promise<string> {
  const ref = await addDoc(col(), {
    ...data,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateChurch(id: string, data: Partial<Pick<Church, 'name' | 'address'>>) {
  await updateDoc(doc(db, 'churches', id), { ...data, updatedAt: serverTimestamp() })
}

export async function softDeleteChurch(id: string) {
  await updateDoc(doc(db, 'churches', id), {
    isActive: false,
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function hardDeleteChurch(id: string) {
  // Delete tithes donors in this church
  const tithesSnap = await getDocs(
    query(collection(db, 'tithes'), where('churchId', '==', id)),
  )
  await Promise.all(
    tithesSnap.docs.map(async (tithe) => {
      // Delete donation subcollection docs
      const donationsSnap = await getDocs(collection(db, 'tithes', tithe.id, 'donations'))
      await Promise.all(donationsSnap.docs.map((d) => deleteDoc(d.ref)))
      await deleteDoc(tithe.ref)
    }),
  )

  // Delete expenses
  const expensesSnap = await getDocs(
    query(collection(db, 'expenses'), where('churchId', '==', id)),
  )
  await Promise.all(expensesSnap.docs.map((d) => deleteDoc(d.ref)))

  // Delete summaries
  const summariesSnap = await getDocs(
    query(collection(db, 'summaries'), where('churchId', '==', id)),
  )
  await Promise.all(summariesSnap.docs.map((d) => deleteDoc(d.ref)))

  // Finally delete the church
  await deleteDoc(doc(db, 'churches', id))
}

export async function restoreChurch(id: string) {
  await updateDoc(doc(db, 'churches', id), {
    isActive: true,
    deletedAt: null,
    updatedAt: serverTimestamp(),
  })
}
