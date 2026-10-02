import type { CapacitorConfig } from '@capacitor/cli'

const urlDoSiteHospedado = 'https://1k0kcbs6-4173.brs.devtunnels.ms/'

const config: CapacitorConfig = {
  appId: 'br.com.testepwa.app',
  appName: 'Teste PWA',
  webDir: 'dist',
  server: urlDoSiteHospedado
    ? { url: urlDoSiteHospedado, cleartext: urlDoSiteHospedado.startsWith('http:') }
    : undefined,
}

export default config
