import { useEffect, useRef, useState } from 'react'

const formatarTamanho = (bytes) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function categoria(file) {
  const tipo = file.type
  if (tipo.startsWith('image/')) return 'imagem'
  if (tipo.startsWith('audio/')) return 'audio'
  if (tipo.startsWith('video/')) return 'video'
  if (tipo === 'application/pdf') return 'pdf'
  return 'outro'
}

/**
 * Dois seletores: galeria (só imagens) e storage (qualquer arquivo).
 * A diferença para a câmera nativa é a ausência do atributo `capture` —
 * sem ele o sistema oferece galeria e gerenciador de arquivos.
 */
export default function Arquivos() {
  const galeriaRef = useRef(null)
  const storageRef = useRef(null)
  const [itens, setItens] = useState([])
  const [origem, setOrigem] = useState(null)

  // Revoga todos os object URLs quando a lista muda ou o componente sai.
  useEffect(() => {
    return () => itens.forEach((i) => URL.revokeObjectURL(i.url))
  }, [itens])

  function aoSelecionar(evento, rotulo) {
    const files = [...(evento.target.files ?? [])]
    if (!files.length) return

    setItens((anteriores) => {
      anteriores.forEach((i) => URL.revokeObjectURL(i.url))
      return files.map((file, indice) => ({
        id: `${file.name}-${file.lastModified}-${indice}`,
        file,
        url: URL.createObjectURL(file),
        tipo: categoria(file),
      }))
    })
    setOrigem(rotulo)
    evento.target.value = ''
  }

  function limpar() {
    itens.forEach((i) => URL.revokeObjectURL(i.url))
    setItens([])
    setOrigem(null)
  }

  const total = itens.reduce((soma, i) => soma + i.file.size, 0)

  return (
    <section className="painel">
      <h2>Galeria e arquivos</h2>
      <p className="ajuda">
        Sem o atributo <code>capture</code>, o <code>input file</code> abre a
        galeria ou o gerenciador de arquivos. Aceita seleção múltipla. O botão
        de arquivos não declara <code>accept</code> de propósito — é isso que
        evita o Android oferecer câmera e gravador junto.
      </p>

      <input
        ref={galeriaRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => aoSelecionar(e, 'Galeria de imagens')}
      />
      {/*
        Sem `accept`: com image/*, audio/* ou video/* o Android monta um
        chooser com Câmera / Filmadora / Gravador. Omitir o atributo abre
        direto o gerenciador de arquivos.
      */}
      <input
        ref={storageRef}
        type="file"
        multiple
        hidden
        onChange={(e) => aoSelecionar(e, 'Armazenamento')}
      />

      <div className="acoes">
        <button type="button" onClick={() => galeriaRef.current?.click()}>
          Escolher da galeria
        </button>
        <button type="button" onClick={() => storageRef.current?.click()}>
          Procurar arquivos
        </button>
        {itens.length > 0 && (
          <button type="button" className="secundario" onClick={limpar}>
            Limpar
          </button>
        )}
      </div>

      <dl className="infos">
        <div>
          <dt>Origem</dt>
          <dd>{origem ?? '—'}</dd>
        </div>
        <div>
          <dt>Selecionados</dt>
          <dd>{itens.length || '—'}</dd>
        </div>
        <div>
          <dt>Tamanho total</dt>
          <dd>{itens.length ? formatarTamanho(total) : '—'}</dd>
        </div>
      </dl>

      {itens.length > 0 && (
        <ul className="lista-arquivos">
          {itens.map((item) => (
            <ItemArquivo key={item.id} item={item} />
          ))}
        </ul>
      )}
    </section>
  )
}

function ItemArquivo({ item }) {
  const { file, url, tipo } = item

  return (
    <li className="arquivo">
      <div className="arquivo-visual">
        {tipo === 'imagem' && <img src={url} alt={file.name} />}
        {tipo === 'video' && <video src={url} controls playsInline />}
        {tipo !== 'imagem' && tipo !== 'video' && (
          <span className={`selo selo-${tipo}`}>
            {tipo === 'pdf' ? 'PDF' : tipo === 'audio' ? '♪' : 'FILE'}
          </span>
        )}
      </div>

      <div className="arquivo-dados">
        <strong className="quebra">{file.name}</strong>
        <span className="ajuda">
          {file.type || 'tipo desconhecido'} · {formatarTamanho(file.size)}
        </span>
        {tipo === 'audio' && <audio src={url} controls />}
        <div className="arquivo-acoes">
          <a href={url} target="_blank" rel="noreferrer">
            Abrir
          </a>
          <a href={url} download={file.name}>
            Baixar
          </a>
        </div>
      </div>
    </li>
  )
}
