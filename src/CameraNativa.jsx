import { useEffect, useRef, useState } from 'react'

/**
 * Abre o app de câmera do sistema via <input capture>.
 * Não há preview no app: o usuário sai, fotografa com toda a UI da OEM
 * (zoom, flash, HDR, filtros) e volta com um File.
 */
export default function CameraNativa() {
  const inputRef = useRef(null)
  const [arquivo, setArquivo] = useState(null)
  const [url, setUrl] = useState(null)
  const [dimensoes, setDimensoes] = useState(null)

  // Libera o object URL anterior para não vazar memória.
  useEffect(() => () => url && URL.revokeObjectURL(url), [url])

  function aoSelecionar(evento) {
    const file = evento.target.files?.[0]
    if (!file) return
    if (url) URL.revokeObjectURL(url)

    const novaUrl = URL.createObjectURL(file)
    setArquivo(file)
    setUrl(novaUrl)
    setDimensoes(null)

    const img = new Image()
    img.onload = () => setDimensoes(`${img.naturalWidth}x${img.naturalHeight}`)
    img.src = novaUrl

    // Permite escolher o mesmo arquivo de novo em seguida.
    evento.target.value = ''
  }

  return (
    <section className="painel">
      <h2>Câmera nativa do sistema</h2>
      <p className="ajuda">
        Usa <code>&lt;input type="file" accept="image/*" capture&gt;</code>. No
        celular abre o app de câmera do fabricante — com zoom, flash e todo o
        processamento dele. No desktop cai no seletor de arquivos.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={aoSelecionar}
        hidden
      />

      <div className="acoes">
        <button type="button" onClick={() => inputRef.current?.click()}>
          Abrir câmera do sistema
        </button>
        {url && (
          <>
            <a className="botao-link" href={url} download={arquivo.name}>
              Baixar
            </a>
            <button
              type="button"
              className="secundario"
              onClick={() => {
                URL.revokeObjectURL(url)
                setArquivo(null)
                setUrl(null)
                setDimensoes(null)
              }}
            >
              Limpar
            </button>
          </>
        )}
      </div>

      <dl className="infos">
        <div>
          <dt>Arquivo</dt>
          <dd className="quebra">{arquivo?.name ?? '—'}</dd>
        </div>
        <div>
          <dt>Tipo</dt>
          <dd>{arquivo?.type || '—'}</dd>
        </div>
        <div>
          <dt>Tamanho</dt>
          <dd>{arquivo ? `${(arquivo.size / 1024 / 1024).toFixed(2)} MB` : '—'}</dd>
        </div>
        <div>
          <dt>Dimensões</dt>
          <dd>{dimensoes ?? '—'}</dd>
        </div>
      </dl>

      {url && (
        <figure className="captura">
          <img src={url} alt="Foto tirada pelo app de câmera do sistema" />
          <figcaption className="ajuda">
            Foto vinda do app nativo. No celular, compare as dimensões com as
            da captura por getUserMedia acima.
          </figcaption>
        </figure>
      )}
    </section>
  )
}
