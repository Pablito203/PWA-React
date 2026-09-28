import { useCallback, useEffect, useState } from 'react'

const conexao = () =>
  navigator.connection ?? navigator.mozConnection ?? navigator.webkitConnection

const ROTULO_TIPO = {
  wifi: 'Wi-Fi',
  cellular: 'Dados móveis',
  ethernet: 'Cabo (Ethernet)',
  bluetooth: 'Bluetooth',
  wimax: 'WiMAX',
  none: 'Sem rede',
  other: 'Outro',
  unknown: 'Desconhecido',
}

const ROTULO_GERACAO = {
  'slow-2g': '2G lento',
  '2g': '2G',
  '3g': '3G',
  '4g': '4G ou melhor',
}

const lerConexao = () => {
  const c = conexao()
  if (!c) return null
  return {
    type: c.type ?? null,
    effectiveType: c.effectiveType ?? null,
    downlink: c.downlink ?? null,
    rtt: c.rtt ?? null,
    saveData: Boolean(c.saveData),
  }
}

/**
 * Conectividade em duas camadas: o que o navegador declara
 * (navigator.onLine + Network Information API) e o que de fato responde
 * (uma requisição real de sondagem).
 */
export default function Rede() {
  const [online, setOnline] = useState(navigator.onLine)
  const [info, setInfo] = useState(lerConexao)
  const [sonda, setSonda] = useState({ estado: 'inicial', ms: null })

  // Bate num arquivo do próprio site com query única: a query impede
  // que o service worker responda pelo cache, então isso testa a rede.
  const sondar = useCallback(async () => {
    setSonda({ estado: 'testando', ms: null })
    const inicio = performance.now()
    try {
      const resposta = await fetch(`/favicon.svg?sonda=${Date.now()}`, {
        cache: 'no-store',
      })
      if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`)
      setSonda({ estado: 'alcancavel', ms: Math.round(performance.now() - inicio) })
    } catch {
      setSonda({ estado: 'inalcancavel', ms: null })
    }
  }, [])

  useEffect(() => {
    const atualizar = () => {
      setOnline(navigator.onLine)
      setInfo(lerConexao())
      sondar()
    }
    window.addEventListener('online', atualizar)
    window.addEventListener('offline', atualizar)

    const c = conexao()
    const aoMudar = () => setInfo(lerConexao())
    c?.addEventListener?.('change', aoMudar)

    sondar()
    return () => {
      window.removeEventListener('online', atualizar)
      window.removeEventListener('offline', atualizar)
      c?.removeEventListener?.('change', aoMudar)
    }
  }, [sondar])

  const tipo = info?.type
  const temTipo = tipo && tipo !== 'unknown'

  return (
    <section className="painel">
      <h2>Rede e conectividade</h2>
      <p className="ajuda">
        <code>navigator.onLine</code> só diz se existe uma interface de rede
        ativa — não garante internet. Por isso há também uma sondagem real.
      </p>

      <div className="acoes">
        <button type="button" onClick={sondar} disabled={sonda.estado === 'testando'}>
          {sonda.estado === 'testando' ? 'Testando…' : 'Testar conexão agora'}
        </button>
      </div>

      <dl className="infos">
        <div>
          <dt>navigator.onLine</dt>
          <dd className={online ? 'bom' : 'ruim'}>
            {online ? 'online' : 'offline'}
          </dd>
        </div>
        <div>
          <dt>Alcança o servidor</dt>
          <dd
            className={
              sonda.estado === 'alcancavel'
                ? 'bom'
                : sonda.estado === 'inalcancavel'
                  ? 'ruim'
                  : ''
            }
          >
            {sonda.estado === 'alcancavel'
              ? `sim · ${sonda.ms} ms`
              : sonda.estado === 'inalcancavel'
                ? 'não'
                : sonda.estado === 'testando'
                  ? 'testando…'
                  : '—'}
          </dd>
        </div>
        <div>
          <dt>Tipo de conexão</dt>
          <dd>{temTipo ? ROTULO_TIPO[tipo] ?? tipo : 'não informado'}</dd>
        </div>
        <div>
          <dt>Qualidade estimada</dt>
          <dd>
            {info?.effectiveType
              ? (ROTULO_GERACAO[info.effectiveType] ?? info.effectiveType)
              : '—'}
          </dd>
        </div>
        <div>
          <dt>Banda estimada</dt>
          <dd>{info?.downlink != null ? `${info.downlink} Mb/s` : '—'}</dd>
        </div>
        <div>
          <dt>Latência estimada</dt>
          <dd>{info?.rtt != null ? `${info.rtt} ms` : '—'}</dd>
        </div>
        <div>
          <dt>Economia de dados</dt>
          <dd>{info ? (info.saveData ? 'ligada' : 'desligada') : '—'}</dd>
        </div>
      </dl>

      {!info && (
        <p className="ajuda aviso">
          Este navegador não expõe a Network Information API — é o caso do
          Safari e do Firefox. Dá para saber se está online, mas não se é Wi-Fi
          ou dados móveis.
        </p>
      )}
      {info && !temTipo && (
        <p className="ajuda aviso">
          A API está disponível, mas não informa o tipo de rede. No desktop o
          Chrome costuma expor só a qualidade estimada; o campo Wi-Fi versus
          dados móveis aparece no Android.
        </p>
      )}
    </section>
  )
}
