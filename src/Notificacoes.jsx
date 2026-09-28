import { useEffect, useRef, useState } from 'react'

const SUPORTADO =
  typeof window !== 'undefined' &&
  'Notification' in window &&
  'serviceWorker' in navigator

// `actions` exige service worker; nem todo navegador implementa.
const SUPORTA_ACOES = SUPORTADO && 'actions' in Notification.prototype

const MAX_ACOES = SUPORTADO ? (Notification.maxActions ?? 0) : 0

export default function Notificacoes() {
  const [permissao, setPermissao] = useState(
    SUPORTADO ? Notification.permission : 'indisponível'
  )
  const [registro, setRegistro] = useState([])
  const [erro, setErro] = useState(null)
  const [agendada, setAgendada] = useState(0)
  const contadorRef = useRef(0)
  const timerRef = useRef(null)

  function anotar(texto, tom = 'neutro') {
    contadorRef.current += 1
    setRegistro((anteriores) =>
      [
        {
          id: contadorRef.current,
          hora: new Date().toLocaleTimeString('pt-BR'),
          texto,
          tom,
        },
        ...anteriores,
      ].slice(0, 8)
    )
  }

  // O service worker avisa a página quando o usuário interage com a notificação.
  useEffect(() => {
    if (!SUPORTADO) return
    const aoReceber = (event) => {
      const m = event.data
      if (m?.tipo !== 'notificacao') return
      if (m.evento === 'close') {
        anotar(`Notificação "${m.tag}" dispensada`)
        return
      }
      if (m.acao === 'responder') {
        anotar(
          m.resposta
            ? `Resposta enviada: "${m.resposta}"`
            : 'Ação "Responder" acionada (sem campo de texto neste navegador)',
          'ok'
        )
      } else if (m.acao === 'lida') {
        anotar('Marcado como lido — o app nem precisou abrir', 'ok')
      } else {
        anotar('Clique no corpo da notificação — app trazido para frente', 'ok')
      }
    }
    navigator.serviceWorker.addEventListener('message', aoReceber)
    return () =>
      navigator.serviceWorker.removeEventListener('message', aoReceber)
  }, [])

  useEffect(() => () => clearInterval(timerRef.current), [])

  async function pedirPermissao() {
    setErro(null)
    try {
      const resultado = await Notification.requestPermission()
      setPermissao(resultado)
      anotar(`Permissão: ${resultado}`, resultado === 'granted' ? 'ok' : 'falha')
    } catch (e) {
      setErro(`${e.name}: ${e.message}`)
    }
  }

  async function mostrar({ comAcoes, atraso = 0 }) {
    setErro(null)
    if (Notification.permission !== 'granted') {
      setErro('Conceda a permissão antes de disparar notificações.')
      return
    }

    const disparar = async () => {
      try {
        const reg = await navigator.serviceWorker.ready
        await reg.showNotification(
          comAcoes ? 'Nova mensagem de Ana' : 'Notificação simples',
          {
            body: comAcoes
              ? 'Você consegue responder sem abrir o app.'
              : 'Disparada pelo service worker, sem ações.',
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            tag: comAcoes ? 'mensagem-ana' : 'simples',
            renotify: true,
            requireInteraction: comAcoes,
            data: { url: '/', origem: 'local' },
            ...(comAcoes && {
              actions: [
                {
                  action: 'responder',
                  title: 'Responder',
                  type: 'text',
                  placeholder: 'Digite sua resposta',
                },
                { action: 'lida', title: 'Marcar como lida' },
              ],
            }),
          }
        )
        anotar(
          comAcoes ? 'Notificação com ações exibida' : 'Notificação exibida'
        )
      } catch (e) {
        setErro(`${e.name}: ${e.message}`)
      }
    }

    if (!atraso) return disparar()

    // Contagem regressiva: dá tempo de minimizar o app e testar em segundo plano.
    setAgendada(atraso / 1000)
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setAgendada((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current)
          disparar()
          return 0
        }
        return s - 1
      })
    }, 1000)
  }

  return (
    <section className="painel">
      <h2>Notificações</h2>
      <p className="ajuda">
        Disparadas pelo service worker — é o único jeito de ter{' '}
        <code>actions</code>. A ação "Responder" abre um campo de texto na
        própria notificação; "Marcar como lida" resolve sem abrir o app.
      </p>

      <div className="acoes">
        <button
          type="button"
          onClick={pedirPermissao}
          disabled={!SUPORTADO || permissao === 'granted'}
        >
          {permissao === 'granted' ? 'Permissão concedida' : 'Pedir permissão'}
        </button>
        <button
          type="button"
          className="secundario"
          onClick={() => mostrar({ comAcoes: false })}
          disabled={permissao !== 'granted'}
        >
          Notificação simples
        </button>
        <button
          type="button"
          onClick={() => mostrar({ comAcoes: true })}
          disabled={permissao !== 'granted'}
        >
          Com ações (responder / lida)
        </button>
        <button
          type="button"
          className="secundario"
          onClick={() => mostrar({ comAcoes: true, atraso: 8000 })}
          disabled={permissao !== 'granted' || agendada > 0}
        >
          {agendada > 0
            ? `Em ${agendada}s...`
            : 'Agendar em 8s (minimize o app)'}
        </button>
      </div>

      {erro && <p className="erro">{erro}</p>}

      <dl className="infos">
        <div>
          <dt>Permissão</dt>
          <dd
            className={
              permissao === 'granted'
                ? 'bom'
                : permissao === 'denied'
                  ? 'ruim'
                  : ''
            }
          >
            {permissao}
          </dd>
        </div>
        <div>
          <dt>Suporte a ações</dt>
          <dd>{SUPORTA_ACOES ? 'sim' : 'não'}</dd>
        </div>
        <div>
          <dt>Máximo de ações</dt>
          <dd>{MAX_ACOES || '—'}</dd>
        </div>
        <div>
          <dt>Push API</dt>
          <dd>{'PushManager' in window ? 'disponível' : 'indisponível'}</dd>
        </div>
      </dl>

      {registro.length > 0 && (
        <ul className="registro">
          {registro.map((linha) => (
            <li key={linha.id} className={`registro-${linha.tom}`}>
              <span className="hora">{linha.hora}</span> {linha.texto}
            </li>
          ))}
        </ul>
      )}

      <p className="ajuda aviso">
        Estas são notificações locais. Para push de verdade (app fechado,
        disparado pelo servidor) é preciso <code>PushManager.subscribe</code>{' '}
        com chave VAPID e um back-end. No iOS, notificação só funciona com o app
        instalado na tela de início.
      </p>
    </section>
  )
}
