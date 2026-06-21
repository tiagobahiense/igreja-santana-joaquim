import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

function env(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name]
  if (value && value !== 'undefined') return value
  throw new Error(
    `Firebase não configurado: ${name} ausente no bundle. ` +
    'Rode o build com .env.production ou defina VITE_FIREBASE_* no ambiente de build.',
  )
}

const firebaseConfig = {
  apiKey: env('VITE_FIREBASE_API_KEY'),
  authDomain: env('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: env('VITE_FIREBASE_PROJECT_ID'),
  messagingSenderId: env('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: env('VITE_FIREBASE_APP_ID'),
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

// Instância secundária: criar contas sem trocar a sessão do admin
const secondaryApp = getApps().find((a) => a.name === 'Secondary') ?? initializeApp(firebaseConfig, 'Secondary')
export const secondaryAuth = getAuth(secondaryApp)
