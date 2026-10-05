import { useState } from 'react'
import { obterTokenFcm } from './firebase'

export default function TelaAprovacao() {
  const parametros = new URLSearchParams(location.search)
  const urlAprovacao = parametros.get('api')
  const mensagem = parametros.get('mensagem')
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState(null)

  async function decidir(decisao) {
    setEnviando(true)
    try {
      const resposta = await fetch(urlAprovacao, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: await obterTokenFcm(), decisao }),
      })
      setResultado(
        resposta.ok
          ? { tom: 'ok', texto: await resposta.text() }
          : { tom: 'falha', texto: `Falha: HTTP ${resposta.status}` }
      )
    } catch (e) {
      setResultado({ tom: 'falha', texto: `Falha: ${e.message}` })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="app">
      <section className="painel">
        <h2>Aprovação</h2>
        <p>{mensagem ?? 'Solicitação sem descrição.'}</p>

        <div className="acoes">
          <button
            type="button"
            onClick={() => decidir('aprovar')}
            disabled={!urlAprovacao || enviando || resultado?.tom === 'ok'}
          >
            Aprovar
          </button>
          <button
            type="button"
            className="secundario"
            onClick={() => decidir('reprovar')}
            disabled={!urlAprovacao || enviando || resultado?.tom === 'ok'}
          >
            Reprovar
          </button>
        </div>

        {!urlAprovacao && (
          <p className="erro">Link sem a URL da API de aprovação.</p>
        )}
        {resultado && (
          <p className={resultado.tom === 'ok' ? 'sucesso quebra' : 'erro'}>
            {resultado.texto}
          </p>
        )}

        <p>
          <a href="/">Voltar para a bancada</a>
        </p>
      </section>
    </main>
  )
}
