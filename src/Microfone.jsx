import { useCallback, useEffect, useRef, useState } from 'react'

const SUPORTADO =
  typeof window !== 'undefined' &&
  Boolean(navigator.mediaDevices?.getUserMedia) &&
  Boolean(window.MediaRecorder)

// Safari não grava webm; mp4/aac é o fallback dele.
const CANDIDATOS = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4;codecs=mp4a.40.2',
  'audio/mp4',
  'audio/ogg;codecs=opus',
]

const escolherFormato = () =>
  CANDIDATOS.find((t) => window.MediaRecorder?.isTypeSupported?.(t)) ?? ''

const mmss = (segundos) =>
  `${String(Math.floor(segundos / 60)).padStart(2, '0')}:${String(
    Math.floor(segundos % 60)
  ).padStart(2, '0')}`

/**
 * Grava áudio do microfone com MediaRecorder e mostra o nível de entrada
 * em tempo real, para dar para ver que o mic está realmente captando.
 */
export default function Microfone() {
  const streamRef = useRef(null)
  const recorderRef = useRef(null)
  const audioCtxRef = useRef(null)
  const rafRef = useRef(null)
  const pedacosRef = useRef([])
  const inicioRef = useRef(0)

  const [gravando, setGravando] = useState(false)
  const [nivel, setNivel] = useState(0)
  const [tempo, setTempo] = useState(0)
  const [gravacao, setGravacao] = useState(null)
  const [erro, setErro] = useState(null)
  const [formato] = useState(escolherFormato)
  const [dispositivos, setDispositivos] = useState(0)

  const encerrar = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    audioCtxRef.current?.close().catch(() => {})
    audioCtxRef.current = null
    setNivel(0)
  }, [])

  useEffect(() => encerrar, [encerrar])
  useEffect(
    () => () => gravacao?.url && URL.revokeObjectURL(gravacao.url),
    [gravacao]
  )

  function medirNivel(stream) {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    audioCtxRef.current = ctx
    const analisador = ctx.createAnalyser()
    analisador.fftSize = 1024
    ctx.createMediaStreamSource(stream).connect(analisador)

    const buffer = new Uint8Array(analisador.fftSize)
    const loop = () => {
      analisador.getByteTimeDomainData(buffer)
      // RMS do sinal, normalizado em torno de 128 (silêncio).
      let soma = 0
      for (const v of buffer) soma += (v - 128) ** 2
      const rms = Math.sqrt(soma / buffer.length) / 128
      setNivel(Math.min(1, rms * 3))
      setTempo((Date.now() - inicioRef.current) / 1000)
      rafRef.current = requestAnimationFrame(loop)
    }
    loop()
  }

  async function iniciar() {
    setErro(null)
    if (!SUPORTADO) {
      setErro('MediaRecorder ou getUserMedia indisponível neste navegador.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      streamRef.current = stream

      const recorder = new MediaRecorder(
        stream,
        formato ? { mimeType: formato } : undefined
      )
      recorderRef.current = recorder
      pedacosRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size) pedacosRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(pedacosRef.current, {
          type: recorder.mimeType || 'audio/webm',
        })
        setGravacao((anterior) => {
          if (anterior?.url) URL.revokeObjectURL(anterior.url)
          return {
            url: URL.createObjectURL(blob),
            tamanho: blob.size,
            tipo: blob.type,
            duracao: (Date.now() - inicioRef.current) / 1000,
          }
        })
        encerrar()
        setGravando(false)
      }

      inicioRef.current = Date.now()
      recorder.start(250)
      setGravando(true)
      setTempo(0)
      medirNivel(stream)

      const devices = await navigator.mediaDevices.enumerateDevices()
      setDispositivos(devices.filter((d) => d.kind === 'audioinput').length)
    } catch (e) {
      setErro(`${e.name}: ${e.message}`)
      encerrar()
      setGravando(false)
    }
  }

  function parar() {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }

  const extensao = (gravacao?.tipo ?? formato).includes('mp4') ? 'm4a' : 'webm'

  return (
    <section className="painel">
      <h2>Microfone</h2>
      <p className="ajuda">
        Grava com <code>MediaRecorder</code>. O medidor abaixo mostra o nível de
        entrada em tempo real — fale e ele deve reagir.
      </p>

      <div className="medidor" role="meter" aria-label="Nível de entrada">
        <div className="medidor-barra" style={{ width: `${nivel * 100}%` }} />
      </div>

      <div className="acoes">
        {!gravando ? (
          <button type="button" onClick={iniciar} disabled={!SUPORTADO}>
            Gravar
          </button>
        ) : (
          <button type="button" className="secundario" onClick={parar}>
            Parar ({mmss(tempo)})
          </button>
        )}
        {gravacao && (
          <a
            className="botao-link"
            href={gravacao.url}
            download={`gravacao.${extensao}`}
          >
            Baixar áudio
          </a>
        )}
      </div>

      {erro && <p className="erro">{erro}</p>}

      <dl className="infos">
        <div>
          <dt>Estado</dt>
          <dd>{gravando ? 'gravando' : gravacao ? 'pronto' : 'parado'}</dd>
        </div>
        <div>
          <dt>Formato</dt>
          <dd className="quebra">{gravacao?.tipo || formato || 'padrão'}</dd>
        </div>
        <div>
          <dt>Duração</dt>
          <dd>{gravacao ? `${gravacao.duracao.toFixed(1)} s` : mmss(tempo)}</dd>
        </div>
        <div>
          <dt>Microfones</dt>
          <dd>{dispositivos || '—'}</dd>
        </div>
      </dl>

      {gravacao && (
        <figure className="captura">
          <audio src={gravacao.url} controls />
          <figcaption className="ajuda">
            {(gravacao.tamanho / 1024).toFixed(1)} KB · {gravacao.tipo}
          </figcaption>
        </figure>
      )}
    </section>
  )
}
