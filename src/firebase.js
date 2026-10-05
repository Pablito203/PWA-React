import { initializeApp } from 'firebase/app'
import {
  deleteToken,
  getMessaging,
  getToken,
  isSupported,
} from 'firebase/messaging'

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
})

export const pushSuportado = isSupported

export async function obterTokenFcm() {
  const serviceWorkerRegistration = await navigator.serviceWorker.ready
  return getToken(getMessaging(app), {
    serviceWorkerRegistration,
    vapidKey: import.meta.env.VITE_FCM_VAPID_KEY,
  })
}

export function apagarTokenFcm() {
  return deleteToken(getMessaging(app))
}
