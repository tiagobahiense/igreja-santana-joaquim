/**
 * Script de seed do admin — rode UMA vez: npm run seed:admin
 * Requer variáveis de ambiente em .env.local:
 *   FIREBASE_ADMIN_EMAIL
 *   FIREBASE_ADMIN_PASSWORD
 *   VITE_FIREBASE_API_KEY
 *   VITE_FIREBASE_AUTH_DOMAIN
 *   VITE_FIREBASE_PROJECT_ID
 *
 * Este script usa o SDK cliente (não Admin SDK), pois não há billing/Cloud Functions.
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.local manually
const envPath = resolve(process.cwd(), '.env.local')
let env = {}
try {
  const lines = readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const [key, ...rest] = line.split('=')
    if (key && rest.length) env[key.trim()] = rest.join('=').trim()
  }
} catch {
  console.error('❌ Arquivo .env.local não encontrado. Crie-o com as variáveis necessárias.')
  process.exit(1)
}

const { FIREBASE_ADMIN_EMAIL, FIREBASE_ADMIN_PASSWORD, VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID } = env

if (!FIREBASE_ADMIN_EMAIL || !FIREBASE_ADMIN_PASSWORD) {
  console.error('❌ FIREBASE_ADMIN_EMAIL e FIREBASE_ADMIN_PASSWORD são obrigatórios no .env.local')
  process.exit(1)
}

// Use Firebase REST API to create the admin user
const API_KEY = VITE_FIREBASE_API_KEY

async function createOrSignInUser() {
  // Try to sign up first
  const signUpRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: FIREBASE_ADMIN_EMAIL, password: FIREBASE_ADMIN_PASSWORD, returnSecureToken: true }),
    }
  )

  if (signUpRes.ok) {
    const data = await signUpRes.json()
    console.log('✅ Usuário admin criado no Firebase Auth:', data.email)
    return data.localId
  }

  const signUpError = await signUpRes.json()

  if (signUpError.error?.message === 'EMAIL_EXISTS') {
    // Sign in instead
    const signInRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: FIREBASE_ADMIN_EMAIL, password: FIREBASE_ADMIN_PASSWORD, returnSecureToken: true }),
      }
    )
    const signInData = await signInRes.json()
    if (!signInRes.ok) throw new Error(JSON.stringify(signInData.error))
    console.log('ℹ️  Usuário já existe, usando UID existente:', signInData.email)
    return signInData.localId
  }

  throw new Error(JSON.stringify(signUpError.error))
}

async function setAdminFlag(uid, idToken) {
  const projectId = VITE_FIREBASE_PROJECT_ID
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      fields: {
        email: { stringValue: FIREBASE_ADMIN_EMAIL },
        displayName: { stringValue: 'Admin Matriz' },
        isAdmin: { booleanValue: true },
        churchIds: { arrayValue: { values: [] } },
        createdAt: { timestampValue: new Date().toISOString() },
        updatedAt: { timestampValue: new Date().toISOString() },
      },
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(JSON.stringify(err))
  }
  console.log('✅ Flag isAdmin = true gravada no Firestore para UID:', uid)
}

async function getIdToken() {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: FIREBASE_ADMIN_EMAIL, password: FIREBASE_ADMIN_PASSWORD, returnSecureToken: true }),
    }
  )
  const data = await res.json()
  if (!res.ok) throw new Error(JSON.stringify(data.error))
  return { uid: data.localId, idToken: data.idToken }
}

async function main() {
  console.log('🔧 Iniciando seed do admin...')
  try {
    await createOrSignInUser()
    const { uid, idToken } = await getIdToken()
    await setAdminFlag(uid, idToken)
    console.log('\n🎉 Admin configurado com sucesso!')
    console.log('   E-mail:', FIREBASE_ADMIN_EMAIL)
    console.log('   UID:', uid)
    console.log('\n⚠️  IMPORTANTE: Configure as Firestore Security Rules antes de produção!')
  } catch (err) {
    console.error('❌ Erro:', err.message)
    process.exit(1)
  }
}

main()
