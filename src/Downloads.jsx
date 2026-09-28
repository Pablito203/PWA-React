import { useEffect, useMemo, useRef, useState } from 'react'

const TEXTO = [
  'Arquivo de teste gerado pelo PWA.',
  'Se você está lendo isto, o download funcionou neste modo de exibição.',
  '',
].join('\n')

const DATA_URL = `data:text/plain;charset=utf-8,${encodeURIComponent(TEXTO)}`
const EXTERNO = 'https://example.com'

/**
 * Compara as várias formas de entregar um arquivo ou abrir um link.
 * O que funciona na aba do navegador nem sempre funciona no app
 * instalado — no iOS em standalone várias destas falham em silêncio.
 */
export default function Downloads() {
  const [registro, setRegistro] = useState([])
  const contadorRef = useRef(0)

  const blobUrl = useMemo(
    () => URL.createObjectURL(new Blob([TEXTO], { type: 'text/plain' })),
    []
  )
  useEffect(() => () => URL.revokeObjectURL(blobUrl), [blobUrl])

  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true

  function anotar(texto, tom = 'neutro') {
    contadorRef.current += 1
    const hora = new Date().toLocaleTimeString('pt-BR')
    setRegistro((anteriores) =>
      [{ id: contadorRef.current, hora, texto, tom }, ...anteriores].slice(0, 8)
    )
  }

  function abrirProgramatico(url, rotulo) {
    const janela = window.open(url, '_blank', 'noopener')
    // Popup bloqueado ou ignorado pelo modo standalone devolve null.
    anotar(
      janela
        ? `window.open(${rotulo}) retornou uma janela`
        : `window.open(${rotulo}) devolveu null — bloqueado ou ignorado`,
      janela ? 'ok' : 'falha'
    )
  }

  async function compartilhar() {
    if (!navigator.share) {
      anotar('navigator.share indisponível neste navegador', 'falha')
      return
    }
    const arquivo = new File([TEXTO], 'teste.txt', { type: 'text/plain' })
    try {
      if (navigator.canShare?.({ files: [arquivo] })) {
        await navigator.share({ files: [arquivo], title: 'Arquivo de teste' })
        anotar('Compartilhamento com arquivo concluído', 'ok')
      } else {
        await navigator.share({ title: 'Teste PWA', url: location.href })
        anotar('Compartilhou o link (arquivos não suportados aqui)', 'ok')
      }
    } catch (e) {
      anotar(`share falhou — ${e.name}: ${e.message}`, 'falha')
    }
  }

  return (
    <section className="painel">
      <h2>Downloads e abertura de links</h2>
      <p className="ajuda">
        Cada botão usa uma técnica diferente. Rode na aba do navegador, depois
        no app instalado, e compare — o modo atual é{' '}
        <strong>{standalone ? 'standalone (instalado)' : 'aba do navegador'}</strong>.
      </p>

      <h3 className="subtitulo">Baixar arquivo</h3>
      <div className="acoes">
        <a
          className="botao-link"
          href={blobUrl}
          download="teste-blob.txt"
          onClick={() => anotar('Clique em <a download> com blob URL')}
        >
          download · blob
        </a>
        <a
          className="botao-link"
          href={DATA_URL}
          download="teste-data.txt"
          onClick={() => anotar('Clique em <a download> com data URL')}
        >
          download · data URL
        </a>
        <a
          className="botao-link"
          href="/pwa-512x512.png"
          download="icone.png"
          onClick={() => anotar('Clique em <a download> com arquivo do servidor')}
        >
          download · arquivo real
        </a>
        <button type="button" className="secundario" onClick={compartilhar}>
          Web Share (alternativa)
        </button>
      </div>

      <h3 className="subtitulo">Abrir em nova aba</h3>
      <div className="acoes">
        <a
          className="botao-link"
          href={blobUrl}
          target="_blank"
          rel="noreferrer"
          onClick={() => anotar('Clique em target=_blank com blob URL')}
        >
          _blank · blob
        </a>
        <a
          className="botao-link"
          href="/pwa-512x512.png"
          target="_blank"
          rel="noreferrer"
          onClick={() => anotar('Clique em target=_blank mesma origem')}
        >
          _blank · mesma origem
        </a>
        <a
          className="botao-link"
          href={EXTERNO}
          target="_blank"
          rel="noreferrer"
          onClick={() => anotar('Clique em target=_blank fora do escopo')}
        >
          _blank · site externo
        </a>
        <button
          type="button"
          className="secundario"
          onClick={() => abrirProgramatico(blobUrl, 'blob')}
        >
          window.open · blob
        </button>
        <button
          type="button"
          className="secundario"
          onClick={() => abrirProgramatico(EXTERNO, 'externo')}
        >
          window.open · externo
        </button>
      </div>

      <h3 className="subtitulo">Sair do escopo na mesma aba</h3>
      <div className="acoes">
        <a
          className="botao-link"
          href={EXTERNO}
          onClick={() => anotar('Navegação para fora do scope, sem _blank')}
        >
          navegar para example.com
        </a>
      </div>

      <dl className="infos">
        <div>
          <dt>Modo</dt>
          <dd>{standalone ? 'standalone' : 'navegador'}</dd>
        </div>
        <div>
          <dt>navigator.share</dt>
          <dd>{navigator.share ? 'disponível' : 'indisponível'}</dd>
        </div>
        <div>
          <dt>Compartilhar arquivos</dt>
          <dd>
            {navigator.canShare?.({
              files: [new File(['x'], 'x.txt', { type: 'text/plain' })],
            })
              ? 'suportado'
              : 'não suportado'}
          </dd>
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
        O registro só confirma que o clique aconteceu — o navegador não avisa se
        o download foi de fato salvo. Confira a pasta de downloads do aparelho.
      </p>
    </section>
  )
}
