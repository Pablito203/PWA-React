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

  if (acao === 'aprovar' || acao === 'reprovar') {
    event.waitUntil(registrarAprovacao(notification.data, acao))
    return
  }

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
      const destino = notification.data?.url ?? '/'
      if (janelas.length) {
        await janelas[0].focus()
        if (destino !== '/') await janelas[0].navigate(destino)
      } else {
        await self.clients.openWindow(destino)
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

self.addEventListener('push', (event) => {
  const payload = lerPayload(event.data)
  const {
    titulo,
    corpo,
    tag,
    silenciosa,
    acoes = [],
    url = '/',
  } = montarNotificacao(payload)

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(titulo, {
        body: corpo,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag,
        silent: silenciosa,
        actions: acoes,
        requireInteraction: acoes.length > 0,
        data: {
          url,
          origem: 'push',
          token: payload.data?.token,
          urlAprovacao: payload.data?.url_aprovacao,
        },
      }),
      avisarJanelas({ tipo: 'push', payload }),
    ])
  )
})

const ACOES_APROVACAO = [
  { action: 'aprovar', title: 'Aprovar' },
  { action: 'reprovar', title: 'Reprovar' },
]

async function registrarAprovacao({ token, urlAprovacao }, decisao) {
  try {
    const resposta = await fetch(urlAprovacao, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, decisao }),
    })
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`)
  } catch (erro) {
    await self.registration.showNotification('Falha ao registrar aprovação', {
      body: `${urlAprovacao}: ${erro.message}`,
      icon: '/pwa-192x192.png',
    })
  }
}

function urlDaTelaDeAprovacao(data) {
  const parametros = new URLSearchParams({
    api: data.url_aprovacao ?? '',
    mensagem: data.mensagem ?? '',
  })
  return `/aprovacao?${parametros}`
}

function lerPayload(dados) {
  if (!dados) return {}
  try {
    return dados.json()
  } catch {
    return { texto: dados.text() }
  }
}

function lerJson(texto) {
  try {
    return JSON.parse(texto)
  } catch {
    return {}
  }
}

// O Chrome exige notificação visível em todo push, inclusive nos de sincronização.
function montarNotificacao(payload) {
  const data = payload.data ?? {}

  if (payload.notification) {
    return {
      titulo: payload.notification.title ?? 'Push',
      corpo: payload.notification.body ?? '',
      tag: 'push-notification',
      silenciosa: false,
    }
  }

  if (Number(data.tipo_notificacao) === 1) {
    const grupo = lerJson(data.notificacao).group
    const aprovacao = grupo === 'aprovacao'
    return {
      titulo: data.titulo ?? 'Notificação',
      corpo: data.mensagem ?? '',
      tag: grupo ?? 'push-backend',
      silenciosa: false,
      acoes: aprovacao ? ACOES_APROVACAO : [],
      url: aprovacao ? urlDaTelaDeAprovacao(data) : '/',
    }
  }

  if (data.tipo_notificacao) {
    return {
      titulo: 'Sincronização recebida',
      corpo: `tipo_notificacao ${data.tipo_notificacao}`,
      tag: 'push-sincronizacao',
      silenciosa: true,
    }
  }

  return {
    titulo: 'Push recebido',
    corpo: payload.texto ?? 'Sem payload.',
    tag: 'push-teste',
    silenciosa: false,
  }
}
