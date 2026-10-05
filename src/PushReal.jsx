import { useEffect, useRef, useState } from 'react'
import { apagarTokenFcm, obterTokenFcm, pushSuportado } from './firebase'

function tituloDoPush(payload) {
  return (
    payload.notification?.title ??
    payload.data?.titulo ??
    (payload.data?.tipo_notificacao
      ? `Sincronização (tipo ${payload.data.tipo_notificacao})`
      : 'Push sem título')
  )
}

async function enviarTokenAoPc(token) {
  try {
    const resposta = await fetch('/api/token-dispositivo', {
      method: 'POST',
      body: token,
    })
    return resposta.ok
  } catch {
    return false
  }
}

export default function PushReal() {
  const [suportado, setSuportado] = useState(null)
  const [token, setToken] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState(null)
  const [copiado, setCopiado] = useState(false)
  const [salvoNoPc, setSalvoNoPc] = useState(null)
  const [recebidos, setRecebidos] = useState([])
  const contadorRef = useRef(0)

  useEffect(() => {
    pushSuportado().then(setSuportado)
  }, [])

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const aoReceber = (event) => {
      if (event.data?.tipo !== 'push') return
      contadorRef.current += 1
      setRecebidos((anteriores) =>
        [
          {
            id: contadorRef.current,
            hora: new Date().toLocaleTimeString('pt-BR'),
            payload: event.data.payload,
          },
          ...anteriores,
        ].slice(0, 10)
      )
    }
    navigator.serviceWorker.addEventListener('message', aoReceber)
    return () =>
      navigator.serviceWorker.removeEventListener('message', aoReceber)
  }, [])

  async function gerarToken() {
    setErro(null)
    setCarregando(true)
    try {
      const novoToken = await obterTokenFcm()
      setToken(novoToken)
      setSalvoNoPc(await enviarTokenAoPc(novoToken))
    } catch (e) {
      setErro(`${e.code ?? e.name}: ${e.message}`)
    } finally {
      setCarregando(false)
    }
  }

  async function apagarToken() {
    setErro(null)
    try {
      await apagarTokenFcm()
      setToken(null)
    } catch (e) {
      setErro(`${e.code ?? e.name}: ${e.message}`)
    }
  }

  const comandoRegistro = `npm run push:registrar -- ${token}`

  async function copiarComando() {
    await navigator.clipboard.writeText(comandoRegistro)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <section className="painel">
      <h2>Push real (FCM)</h2>
      <p className="ajuda">
        Gera o token FCM deste navegador. Registre-o na fila de push de
        homologação pelo script local e dispare com{' '}
        <code>npm run push:enviar</code>. Funciona com o app fechado.
      </p>

      <div className="acoes">
        <button
          type="button"
          onClick={gerarToken}
          disabled={!suportado || carregando}
        >
          {carregando ? 'Gerando...' : token ? 'Gerar de novo' : 'Gerar token FCM'}
        </button>
        <button
          type="button"
          className="secundario"
          onClick={copiarComando}
          disabled={!token}
        >
          {copiado ? 'Copiado!' : 'Copiar comando de registro'}
        </button>
        <button
          type="button"
          className="secundario"
          onClick={apagarToken}
          disabled={!token}
        >
          Apagar token
        </button>
      </div>

      {erro && <p className="erro">{erro}</p>}

      <dl className="infos">
        <div>
          <dt>FCM no navegador</dt>
          <dd className={suportado ? 'bom' : suportado === false ? 'ruim' : ''}>
            {suportado === null ? '...' : suportado ? 'suportado' : 'não suportado'}
          </dd>
        </div>
        <div>
          <dt>Salvo no PC</dt>
          <dd className={salvoNoPc ? 'bom' : salvoNoPc === false ? 'ruim' : ''}>
            {salvoNoPc === null ? '—' : salvoNoPc ? 'sim' : 'não'}
          </dd>
        </div>
        <div>
          <dt>Token</dt>
          <dd className="quebra">{token ?? '—'}</dd>
        </div>
      </dl>

      {recebidos.length > 0 && (
        <ul className="registro">
          {recebidos.map((item) => (
            <li key={item.id}>
              <details>
                <summary>
                  <span className="hora">{item.hora}</span>
                  {tituloDoPush(item.payload)}
                </summary>
                <pre className="payload">
                  {JSON.stringify(item.payload, null, 2)}
                </pre>
              </details>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
