import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Task } from '@/types'

const col = () => collection(db, 'tasks')

export async function getTasks(userId: string): Promise<Task[]> {
  const q = query(col(), where('userId', '==', userId), orderBy('dueDate', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Task)
}

export async function getDailyPanelTasks(userId: string): Promise<Task[]> {
  const q = query(
    col(),
    where('userId', '==', userId),
    where('showInDailyPanel', '==', true),
    where('completed', '==', false),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Task)
}

export async function createTask(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = await addDoc(col(), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateTask(id: string, data: Partial<Task>) {
  await updateDoc(doc(db, 'tasks', id), { ...data, updatedAt: serverTimestamp() })
}

export async function deleteTask(id: string) {
  await deleteDoc(doc(db, 'tasks', id))
}

export async function toggleTask(id: string, completed: boolean) {
  await updateDoc(doc(db, 'tasks', id), { completed, updatedAt: serverTimestamp() })
}
