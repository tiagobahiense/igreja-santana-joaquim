import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  Timestamp,
  type FieldValue,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { ParishEvent } from '@/types'

const col = () => collection(db, 'events')

export async function getEvents(from: Date, to: Date): Promise<ParishEvent[]> {
  const q = query(col(), orderBy('startAt', 'asc'))
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as ParishEvent)
    .filter((e) => {
      const t = e.startAt.toDate()
      return t >= from && t <= to
    })
}

export async function getUpcomingEvents(limitDays = 14): Promise<ParishEvent[]> {
  const from = new Date()
  from.setHours(0, 0, 0, 0)
  const to = new Date(from)
  to.setDate(to.getDate() + limitDays)
  to.setHours(23, 59, 59, 999)
  return getEvents(from, to)
}

export async function createEvent(data: {
  title: string
  description?: string
  startAt: Date
  createdBy: string
}): Promise<string> {
  const ref = await addDoc(col(), {
    title: data.title,
    description: data.description ?? '',
    startAt: Timestamp.fromDate(data.startAt),
    createdBy: data.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateEvent(
  id: string,
  data: {
    title?: string
    description?: string
    startAt?: Date
  },
) {
  const payload: {
    updatedAt: FieldValue
    title?: string
    description?: string
    startAt?: Timestamp
  } = { updatedAt: serverTimestamp() }
  if (data.title !== undefined) payload.title = data.title
  if (data.description !== undefined) payload.description = data.description
  if (data.startAt !== undefined) payload.startAt = Timestamp.fromDate(data.startAt)
  await updateDoc(doc(db, 'events', id), payload)
}

export async function deleteEvent(id: string) {
  await deleteDoc(doc(db, 'events', id))
}
