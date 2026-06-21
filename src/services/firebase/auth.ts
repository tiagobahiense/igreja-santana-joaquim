import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  createUserWithEmailAndPassword,
  deleteUser,
  type User,
} from 'firebase/auth'
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, secondaryAuth } from '@/lib/firebase'
import type { UserProfile } from '@/types'

export async function signIn(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password)
}

export async function signOut() {
  return firebaseSignOut(auth)
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  const data = snap.data()
  return {
    uid,
    ...data,
    churchIds: Array.isArray(data.churchIds) ? data.churchIds : [],
  } as UserProfile
}

export async function createManagerAccount(
  email: string,
  password: string,
  displayName: string,
  churchIds: string[],
): Promise<string> {
  const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password)
  const uid = credential.user.uid
  try {
    await setDoc(doc(db, 'users', uid), {
      email,
      displayName,
      isAdmin: false,
      churchIds,
      activeChurchId: churchIds[0] ?? null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    try {
      await deleteUser(credential.user)
    } catch {
      // Conta pode ficar órfã no Auth — use npm run repair:manager
    }
    throw error
  } finally {
    await firebaseSignOut(secondaryAuth)
  }
  return uid
}

export async function updateUserProfile(
  uid: string,
  data: Partial<Omit<UserProfile, 'uid' | 'email' | 'isAdmin' | 'createdAt'>>,
) {
  await updateDoc(doc(db, 'users', uid), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function changePassword(user: User, currentPassword: string, newPassword: string) {
  const credential = EmailAuthProvider.credential(user.email!, currentPassword)
  await reauthenticateWithCredential(user, credential)
  await updatePassword(user, newPassword)
}

export function getCurrentUser() {
  return auth.currentUser
}
