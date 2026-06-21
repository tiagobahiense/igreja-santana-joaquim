/**
 * Repara gestor órfão: existe no Firebase Auth mas sem documento em users/
 * Uso: npm run repair:manager
 *
 * Variáveis em .env.local (ou env do terminal):
 *   FIREBASE_ADMIN_EMAIL / FIREBASE_ADMIN_PASSWORD
 *   MANAGER_EMAIL
 *   MANAGER_DISPLAY_NAME
 *   MANAGER_PASSWORD  (obrigatório — usado só para obter o UID correto)
 *   MANAGER_CHURCH_IDS (opcional, ids separados por vírgula)
 *   MANAGER_UID (opcional — se já souber o UID do Firebase Console)
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

const envPath = resolve(process.cwd(), '.env.local')
const fileEnv = {}
try {
  readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
    const [key, ...rest] = line.split('=')
    if (key && rest.length) fileEnv[key.trim()] = rest.join('=').trim()
  })
} catch {
  console.error('❌ Arquivo .env.local não encontrado.')
  process.exit(1)
}

const env = { ...fileEnv, ...process.env }

const {
  FIREBASE_ADMIN_EMAIL,
  FIREBASE_ADMIN_PASSWORD,
  MANAGER_EMAIL,
  MANAGER_DISPLAY_NAME,
  MANAGER_PASSWORD,
  MANAGER_UID,
  MANAGER_CHURCH_IDS = '',
  VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_PROJECT_ID,
} = env

if (!FIREBASE_ADMIN_EMAIL || !FIREBASE_ADMIN_PASSWORD || !MANAGER_EMAIL || !MANAGER_DISPLAY_NAME) {
  console.error('❌ Defina: FIREBASE_ADMIN_EMAIL, FIREBASE_ADMIN_PASSWORD, MANAGER_EMAIL, MANAGER_DISPLAY_NAME')
  process.exit(1)
}

if (!MANAGER_UID && !MANAGER_PASSWORD) {
  console.error('❌ Informe MANAGER_PASSWORD (senha do gestor) ou MANAGER_UID (copiado do Firebase Console).')
  process.exit(1)
}

const churchIds = MANAGER_CHURCH_IDS.split(',').map((s) => s.trim()).filter(Boolean)
const API_KEY = VITE_FIREBASE_API_KEY

async function signIn(email, password) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  )
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message ?? JSON.stringify(data.error))
  return { uid: data.localId, idToken: data.idToken }
}

async function resolveManagerUid() {
  if (MANAGER_UID) return MANAGER_UID
  const { uid } = await signIn(MANAGER_EMAIL, MANAGER_PASSWORD)
  return uid
}

async function createManagerProfile(uid, adminIdToken) {
  const projectId = VITE_FIREBASE_PROJECT_ID
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminIdToken}`,
    },
    body: JSON.stringify({
      fields: {
        email: { stringValue: MANAGER_EMAIL },
        displayName: { stringValue: MANAGER_DISPLAY_NAME },
        isAdmin: { booleanValue: false },
        churchIds: {
          arrayValue: { values: churchIds.map((id) => ({ stringValue: id })) },
        },
        activeChurchId: churchIds[0]
          ? { stringValue: churchIds[0] }
          : { nullValue: null },
        createdAt: { timestampValue: new Date().toISOString() },
        updatedAt: { timestampValue: new Date().toISOString() },
      },
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(JSON.stringify(err))
  }
}

async function main() {
  console.log('🔧 Reparando perfil do gestor:', MANAGER_EMAIL)
  try {
    const managerUid = await resolveManagerUid()
    console.log('   UID do gestor:', managerUid)

    const { uid: adminUid, idToken: adminIdToken } = await signIn(FIREBASE_ADMIN_EMAIL, FIREBASE_ADMIN_PASSWORD)

    if (managerUid === adminUid) {
      throw new Error('UID do gestor coincide com o admin — verifique MANAGER_EMAIL/MANAGER_PASSWORD')
    }

    await createManagerProfile(managerUid, adminIdToken)

    console.log('\n✅ Perfil criado no Firestore!')
    console.log('   O gestor já pode fazer login com a senha original.')
  } catch (err) {
    console.error('❌ Erro:', err.message)
    process.exit(1)
  }
}

main()
