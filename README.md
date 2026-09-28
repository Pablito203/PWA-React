# PWA React — bancada de testes

Aplicação React mínima para testar, num aparelho real, o que uma PWA consegue
(e o que não consegue) fazer. Cada seção isola uma capacidade e mostra na tela
o estado detectado, os erros e o resultado.

## Requisitos

- Node.js >= 22.12
- Navegador com suporte a service worker

## Como rodar

```bash
npm install
npm run dev      # desenvolvimento
```

Para testar PWA de verdade (instalação, offline, notificações) use o build:

```bash
npm run build
npm run preview  # http://localhost:4173
```

Câmera, microfone, biometria e notificações exigem **HTTPS ou localhost**. Para
testar no celular, exponha o preview por um túnel:

```bash
npx localtunnel --port 4173
```

## O que a bancada testa

| Seção | Cobre |
|---|---|
| Cards de status | Conexão, modo de exibição (aba × standalone), service worker, instalação |
| Rede e conectividade | `navigator.onLine`, Network Information API (Wi-Fi × dados móveis), sondagem real de alcance |
| Câmera | `getUserMedia`, troca de lente, captura em canvas |
| Câmera nativa | `<input capture>` — abre o app de câmera do sistema |
| Galeria e arquivos | Seleção múltipla de imagens e de qualquer tipo de arquivo |
| Notificações | Permissão, notificação local pelo service worker, ações (responder inline / marcar como lida) |
| Downloads e links | `<a download>` com blob/data/arquivo real, `target="_blank"`, `window.open`, Web Share |
| Biometria | WebAuthn com autenticador de plataforma (digital, Face ID, Windows Hello) |
| Microfone | `MediaRecorder`, medidor de nível ao vivo, reprodução e download |
| Estado persistido | Contador em `localStorage`, para checar sobrevivência entre sessões |

## Notas de plataforma

- **iOS**: não existe `beforeinstallprompt` — a instalação é manual pelo menu
  Compartilhar, e a tela mostra o passo a passo. Notificações só funcionam com o
  app instalado na tela de início. O app instalado tem armazenamento **separado**
  do Safari.
- **Tipo de conexão** (Wi-Fi × dados móveis) só é exposto pelo Chrome no Android.
- **Resposta inline** em notificação (`type: 'text'`) é Chrome/Android.
- Após cada `npm run build`, o service worker serve a versão antiga até atualizar.
  Use o botão "Atualizar agora" na tela ou faça um hard reload.

## Estrutura

```
public/sw-custom.js   handlers de notificação e push anexados ao SW do Workbox
src/usePwa.js         estado de PWA: SW, online, display-mode, prompt de instalação
src/App.jsx           composição das seções
vite.config.js        manifest e Workbox (vite-plugin-pwa)
```

## Stack

React 19 · Vite 8 · vite-plugin-pwa (Workbox, `generateSW`)
