/*
 * Anexado ao service worker gerado pelo Workbox (workbox.importScripts).
 * Ações de notificação só existem no service worker: `new Notification()`
 * na página não aceita o campo `actions`.
 */

// Repassa o que aconteceu na notificação para as janelas abertas.
async function avisarJanelas(mensagem) {
  const janelas = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  })
  for (const janela of janelas) janela.postMessage(mensagem)
  return janelas
}

self.addEventListener('notificationclick', (event) => {
  const { notification } = event
  // Sem `action` o usuário clicou no corpo da notificação.
  const acao = event.action || 'corpo'
  // Resposta digitada na ação do tipo "text" (Chrome no Android).
  const resposta = event.reply ?? null

  // "Marcar como lida" resolve na própria notificação: nada de abrir o app.
  if (acao !== 'lida') notification.close()
  else notification.close()

  event.waitUntil(
    (async () => {
      const janelas = await avisarJanelas({
        tipo: 'notificacao',
        evento: 'click',
        acao,
        resposta,
        tag: notification.tag,
        dados: notification.data ?? null,
      })

      // Só traz o app para frente se não for uma ação silenciosa.
      if (acao === 'lida') return
      if (janelas.length) {
        await janelas[0].focus()
      } else {
        await self.clients.openWindow(notification.data?.url ?? '/')
      }
    })()
  )
})

self.addEventListener('notificationclose', (event) => {
  event.waitUntil(
    avisarJanelas({
      tipo: 'notificacao',
      evento: 'close',
      acao: null,
      resposta: null,
      tag: event.notification.tag,
    })
  )
})

// Permite testar push real pelo DevTools (Application > Service Workers > Push).
self.addEventListener('push', (event) => {
  let dados = { titulo: 'Push recebido', corpo: 'Sem payload.' }
  try {
    if (event.data) dados = { ...dados, ...event.data.json() }
  } catch {
    dados.corpo = event.data?.text() ?? dados.corpo
  }
  event.waitUntil(
    self.registration.showNotification(dados.titulo, {
      body: dados.corpo,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: 'push-teste',
      data: { origem: 'push' },
      actions: [
        { action: 'responder', title: 'Responder', type: 'text', placeholder: 'Sua resposta' },
        { action: 'lida', title: 'Marcar como lida' },
      ],
    })
  )
})
