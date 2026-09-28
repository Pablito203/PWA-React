import { useCallback, useEffect, useRef, useState } from 'react'

const SUPORTADO = Boolean(navigator.mediaDevices?.getUserMedia)

export default function Camera() {
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  const [ativa, setAtiva] = useState(false)
  const [erro, setErro] = useState(null)
  const [facing, setFacing] = useState('environment')
  const [camadas, setCamadas] = useState([]) // dispositivos de vídeo
  const [foto, setFoto] = useState(null)
  const [permissao, setPermissao] = useState('desconhecida')

  // Estado da permissão, quando o navegador expõe a Permissions API.
  useEffect(() => {
    let status
    navigator.permissions
      ?.query({ name: 'camera' })
      .then((s) => {
        status = s
        setPermissao(s.state)
        s.onchange = () => setPermissao(s.state)
      })
      .catch(() => setPermissao('indisponível'))
    return () => {
      if (status) status.onchange = null
    }
  }, [])

  const parar = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setAtiva(false)
  }, [])

  // Encerra a câmera ao desmontar: sem isso o LED fica aceso.
  useEffect(() => parar, [parar])

  async function iniciar(modo = facing) {
    setErro(null)
    if (!SUPORTADO) {
      setErro('getUserMedia indisponível neste navegador ou fora de HTTPS.')
      return
    }
    parar()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: modo }, width: { ideal: 1280 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setAtiva(true)
      setFacing(modo)
      // A lista só traz rótulos depois da permissão concedida.
      const devices = await navigator.mediaDevices.enumerateDevices()
      setCamadas(devices.filter((d) => d.kind === 'videoinput'))
    } catch (e) {
      setErro(`${e.name}: ${e.message}`)
      setAtiva(false)
    }
  }

  function capturar() {
    const video = videoRef.current
    if (!video || !ativa) return
    if (!video.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    setFoto(canvas.toDataURL('image/png'))
  }

  const trilha = streamRef.current?.getVideoTracks()[0]
  const config = trilha?.getSettings?.()

  return (
    <section className="painel">
      <h2>Câmera</h2>
      <p className="ajuda">
        Testa <code>getUserMedia</code>: exige HTTPS ou localhost e permissão do
        usuário. Em PWA instalado o prompt aparece igual ao do navegador.
      </p>

      <div className="camera-palco">
        <video
          ref={videoRef}
          playsInline
          muted
          className={ativa ? '' : 'oculto'}
        />
        {!ativa && (
          <div className="camera-vazio">
            {SUPORTADO ? 'Câmera desligada' : 'Sem suporte a getUserMedia'}
          </div>
        )}
      </div>

      <div className="acoes">
        {!ativa ? (
          <button type="button" onClick={() => iniciar()} disabled={!SUPORTADO}>
            Ligar câmera
          </button>
        ) : (
          <button type="button" className="secundario" onClick={parar}>
            Desligar
          </button>
        )}
        <button
          type="button"
          className="secundario"
          onClick={() =>
            iniciar(facing === 'environment' ? 'user' : 'environment')
          }
          disabled={!SUPORTADO}
        >
          {facing === 'environment' ? 'Usar frontal' : 'Usar traseira'}
        </button>
        <button type="button" onClick={capturar} disabled={!ativa}>
          Tirar foto
        </button>
        {foto && (
          <a className="botao-link" href={foto} download="captura.png">
            Baixar foto
          </a>
        )}
      </div>

      {erro && <p className="erro">{erro}</p>}

      <dl className="infos">
        <div>
          <dt>Permissão</dt>
          <dd>{permissao}</dd>
        </div>
        <div>
          <dt>Resolução</dt>
          <dd>{config ? `${config.width}x${config.height}` : '—'}</dd>
        </div>
        <div>
          <dt>Lente</dt>
          <dd>{ativa ? (config?.facingMode ?? facing) : '—'}</dd>
        </div>
        <div>
          <dt>Câmeras detectadas</dt>
          <dd>{camadas.length || '—'}</dd>
        </div>
      </dl>

      {foto && (
        <figure className="captura">
          <img src={foto} alt="Última captura da câmera" />
          <figcaption className="ajuda">Última captura (PNG)</figcaption>
        </figure>
      )}
    </section>
  )
}
