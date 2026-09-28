import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

// iPadOS 13+ se declara como Mac; o toque é o que o denuncia.
const IOS =
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

/**
 * Reúne o estado de PWA que interessa em um teste:
 * atualização do service worker, prontidão offline, conectividade,
 * modo de exibição e o prompt de instalação.
 */
export function usePwa() {
  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW()

  const [online, setOnline] = useState(navigator.onLine)
  const [installEvent, setInstallEvent] = useState(null)
  const [installed, setInstalled] = useState(false)
  const [standalone, setStandalone] = useState(
    () =>
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
  )

  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])

  useEffect(() => {
    const onPrompt = (event) => {
      event.preventDefault()
      setInstallEvent(event)
    }
    const onInstalled = () => {
      setInstalled(true)
      setInstallEvent(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)

    const media = window.matchMedia('(display-mode: standalone)')
    const onDisplayChange = (event) => setStandalone(event.matches)
    media.addEventListener('change', onDisplayChange)

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
      media.removeEventListener('change', onDisplayChange)
    }
  }, [])

  async function install() {
    if (!installEvent) return
    await installEvent.prompt()
    const { outcome } = await installEvent.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setInstallEvent(null)
  }

  return {
    // No iOS não existe beforeinstallprompt: a instalação é sempre manual.
    ios: IOS,
    online,
    standalone,
    installed,
    canInstall: Boolean(installEvent),
    install,
    offlineReady,
    needRefresh,
    updateServiceWorker,
  }
}
