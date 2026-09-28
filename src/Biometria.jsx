import { useEffect, useState } from 'react'

const CHAVE = 'pwa-teste-credencial'

const paraBase64Url = (buffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

const deBase64Url = (texto) => {
  const base64 = texto.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

// Sem back-end, o desafio é gerado aqui só para exercitar a API.
const desafio = () => crypto.getRandomValues(new Uint8Array(32))

const SUPORTADO =
  typeof window !== 'undefined' && Boolean(window.PublicKeyCredential)

/**
 * Teste de WebAuthn com autenticador de plataforma — digital, Face ID,
 * Windows Hello. Cadastra uma credencial e depois exige verificação
 * biométrica para "entrar".
 */
export default function Biometria() {
  const [plataforma, setPlataforma] = useState(null) // biometria embutida?
  const [credencial, setCredencial] = useState(() =>
    JSON.parse(localStorage.getItem(CHAVE) || 'null')
  )
  const [status, setStatus] = useState(null)
  const [erro, setErro] = useState(null)
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    if (!SUPORTADO) return setPlataforma(false)
    PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
      .then(setPlataforma)
      .catch(() => setPlataforma(false))
  }, [])

  async function cadastrar() {
    setErro(null)
    setStatus(null)
    setOcupado(true)
    try {
      const cred = await navigator.credentials.create({
        publicKey: {
          challenge: desafio(),
          rp: { name: 'Teste PWA', id: location.hostname },
          user: {
            id: crypto.getRandomValues(new Uint8Array(16)),
            name: 'usuario@teste.local',
            displayName: 'Usuário de Teste',
          },
          // ES256 e RS256 cobrem praticamente todos os autenticadores.
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 },
            { type: 'public-key', alg: -257 },
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            residentKey: 'preferred',
          },
          timeout: 60000,
          attestation: 'none',
        },
      })

      const dados = {
        id: cred.id,
        tipo: cred.authenticatorAttachment ?? 'platform',
        transports: cred.response.getTransports?.() ?? [],
        criadaEm: new Date().toLocaleString('pt-BR'),
      }
      localStorage.setItem(CHAVE, JSON.stringify(dados))
      setCredencial(dados)
      setStatus('Credencial cadastrada com sucesso.')
    } catch (e) {
      setErro(`${e.name}: ${e.message}`)
    } finally {
      setOcupado(false)
    }
  }

  async function autenticar() {
    setErro(null)
    setStatus(null)
    setOcupado(true)
    try {
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: desafio(),
          rpId: location.hostname,
          allowCredentials: credencial
            ? [{ type: 'public-key', id: deBase64Url(credencial.id) }]
            : [],
          userVerification: 'required',
          timeout: 60000,
        },
      })
      const flags = new Uint8Array(assertion.response.authenticatorData)[32]
      setStatus(
        `Autenticado. userVerified=${Boolean(flags & 0x04)} · assinatura ${paraBase64Url(
          assertion.response.signature
        ).slice(0, 16)}…`
      )
    } catch (e) {
      setErro(`${e.name}: ${e.message}`)
    } finally {
      setOcupado(false)
    }
  }

  function esquecer() {
    localStorage.removeItem(CHAVE)
    setCredencial(null)
    setStatus(null)
    setErro(null)
  }

  return (
    <section className="painel">
      <h2>Biometria (WebAuthn)</h2>
      <p className="ajuda">
        Usa o autenticador de plataforma do aparelho — digital, Face ID ou
        Windows Hello. Exige HTTPS ou localhost. Cadastre uma credencial e
        depois autentique com ela.
      </p>

      <div className="acoes">
        <button type="button" onClick={cadastrar} disabled={!SUPORTADO || ocupado}>
          {credencial ? 'Cadastrar novamente' : 'Cadastrar biometria'}
        </button>
        <button
          type="button"
          onClick={autenticar}
          disabled={!SUPORTADO || ocupado || !credencial}
        >
          Autenticar
        </button>
        {credencial && (
          <button type="button" className="secundario" onClick={esquecer}>
            Esquecer credencial
          </button>
        )}
      </div>

      {status && <p className="sucesso">{status}</p>}
      {erro && <p className="erro">{erro}</p>}

      <dl className="infos">
        <div>
          <dt>WebAuthn</dt>
          <dd>{SUPORTADO ? 'disponível' : 'indisponível'}</dd>
        </div>
        <div>
          <dt>Biometria no aparelho</dt>
          <dd>
            {plataforma === null
              ? 'verificando…'
              : plataforma
                ? 'sim'
                : 'não detectada'}
          </dd>
        </div>
        <div>
          <dt>Credencial salva</dt>
          <dd className="quebra">
            {credencial ? `${credencial.id.slice(0, 18)}…` : '—'}
          </dd>
        </div>
        <div>
          <dt>Cadastrada em</dt>
          <dd>{credencial?.criadaEm ?? '—'}</dd>
        </div>
      </dl>

      <p className="ajuda aviso">
        Atenção: isto é só um teste da API. O desafio é gerado no próprio
        navegador e a assinatura não é conferida por servidor algum — não tem
        valor de segurança real.
      </p>
    </section>
  )
}
