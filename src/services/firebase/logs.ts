import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  startAfter,
  type DocumentSnapshot,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

export type LogAction =
  | 'create_church' | 'update_church' | 'delete_church' | 'restore_church'
  | 'create_manager' | 'update_manager'
  | 'create_tithe' | 'update_tithe' | 'transfer_tithe' | 'set_donation'
  | 'create_expense' | 'update_expense' | 'delete_expense'
  | 'create_task' | 'update_task' | 'delete_task' | 'toggle_task'
  | 'update_settings' | 'update_profile'

export interface AuditLog {
  id: string
  userId: string
  userEmail: string
  userDisplayName: string
  action: LogAction
  entityType: string
  entityId?: string
  entityName?: string
  churchId?: string
  details?: string
  timestamp: Timestamp
}

const col = () => collection(db, 'logs')

export async function addLog(log: Omit<AuditLog, 'id' | 'timestamp'>) {
  try {
    await addDoc(col(), { ...log, timestamp: serverTimestamp() })
  } catch {
    // Logs são best-effort — nunca quebrar a operação principal
  }
}

export interface LogFilter {
  userId?: string
  action?: LogAction
  dateFrom?: Date
  dateTo?: Date
}

export async function getLogs(
  filter: LogFilter = {},
  pageSize = 50,
  cursor?: DocumentSnapshot,
): Promise<{ logs: AuditLog[]; lastDoc: DocumentSnapshot | null }> {
  const conditions = []

  if (filter.userId) conditions.push(where('userId', '==', filter.userId))
  if (filter.action) conditions.push(where('action', '==', filter.action))
  if (filter.dateFrom) conditions.push(where('timestamp', '>=', Timestamp.fromDate(filter.dateFrom)))
  if (filter.dateTo) conditions.push(where('timestamp', '<=', Timestamp.fromDate(filter.dateTo)))

  let q = query(col(), ...conditions, orderBy('timestamp', 'desc'), limit(pageSize))
  if (cursor) q = query(col(), ...conditions, orderBy('timestamp', 'desc'), startAfter(cursor), limit(pageSize))

  const snap = await getDocs(q)
  const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }) as AuditLog)
  const lastDoc = snap.docs[snap.docs.length - 1] ?? null
  return { logs, lastDoc }
}
