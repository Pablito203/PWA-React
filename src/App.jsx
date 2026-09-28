import { useEffect, useState } from 'react'
import { usePwa } from './usePwa'
import Camera from './Camera'
import CameraNativa from './CameraNativa'
import Arquivos from './Arquivos'
import Biometria from './Biometria'
import Microfone from './Microfone'
import Rede from './Rede'
import Downloads from './Downloads'
import Notificacoes from './Notificacoes'

const STORAGE_KEY = 'pwa-teste-contador'

export default function App() {
  const pwa = usePwa()

  // Contador persistido: serve para checar se o estado sobrevive
  // ao fechar/reabrir o app instalado.
  const [contador, setContador] = useState(() =>
    Number(localStorage.getItem(STORAGE_KEY) ?? 0)
  )
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(contador))
  }, [contador])

  return (
    <main className="app">
      <header className="hero">
        <span className="badge">React + Vite + Workbox</span>
        <h1>Teste de PWA 2</h1>
        <p>
          Página mínima para verificar instalação, service worker e
          funcionamento offline.
        </p>
      </header>

      <section className="grid">
        <Card
          titulo="Conexão"
          valor={pwa.online ? 'Online' : 'Offline'}
          tom={pwa.online ? 'ok' : 'alerta'}
          detalhe="Desligue a rede (ou use o modo offline do DevTools) para testar o cache."
        />
        <Card
          titulo="Modo de exibição"
          valor={pwa.standalone ? 'Standalone' : 'Aba do navegador'}
          tom={pwa.standalone ? 'ok' : 'neutro'}
          detalhe="Standalone significa que o app foi aberto instalado, sem a barra do navegador."
        />
        <Card
          titulo="Service worker"
          valor={pwa.offlineReady ? 'Cache pronto' : 'Registrando...'}
          tom={pwa.offlineReady ? 'ok' : 'neutro'}
          detalhe="Confira em DevTools > Application > Service Workers."
        />
        <Card
          titulo="Instalação"
          valor={
            pwa.standalone || pwa.installed
              ? 'Instalado'
              : pwa.canInstall
                ? 'Disponível'
                : pwa.ios
                  ? 'Manual (iOS)'
                  : 'Indisponível agora'
          }
          tom={
            pwa.standalone || pwa.installed
              ? 'ok'
              : pwa.canInstall || pwa.ios
                ? 'neutro'
                : 'alerta'
          }
          detalhe={
            pwa.ios
              ? 'O iOS não expõe beforeinstallprompt — só dá para instalar pelo menu Compartilhar.'
              : 'O prompt exige HTTPS (ou localhost) e um build servido por npm run preview.'
          }
        />
      </section>

      <section className="painel">
        <h2>Ações</h2>
        <div className="acoes">
          {!pwa.ios && (
            <button
              type="button"
              onClick={pwa.install}
              disabled={!pwa.canInstall}
            >
              Instalar app
            </button>
          )}
          <button
            type="button"
            className="secundario"
            onClick={() => pwa.updateServiceWorker(true)}
            disabled={!pwa.needRefresh}
          >
            {pwa.needRefresh ? 'Atualizar agora' : 'Sem atualização pendente'}
          </button>
        </div>
      </section>

      <section className="painel">
        <h2>Estado persistido</h2>
        <p className="ajuda">
          Incremente, feche o app e abra de novo: o valor deve continuar o mesmo
          (localStorage).
        </p>
        <div className="contador">
          <button
            type="button"
            className="secundario"
            onClick={() => setContador((n) => n - 1)}
          >
            -
          </button>
          <strong>{contador}</strong>
          <button type="button" onClick={() => setContador((n) => n + 1)}>
            +
          </button>
        </div>

        {pwa.ios && !pwa.standalone && (
          <div className="instrucoes">
            <strong>Instalar no iOS é manual.</strong>
            <ol>
              <li>
                Abra este site no <b>Safari</b> — em outros navegadores do iOS a
                opção pode não aparecer.
              </li>
              <li>
                Toque em <b>Compartilhar</b> (o quadrado com a seta para cima).
              </li>
              <li>
                Role a lista e escolha <b>Adicionar à Tela de Início</b>.
              </li>
              <li>
                Abra o app pelo ícone criado — o card acima deve virar{' '}
                <b>Standalone</b>.
              </li>
            </ol>
            <p className="ajuda">
              Sem esse passo, notificações não funcionam no iOS e o
              armazenamento é o do Safari, não o do app.
            </p>
          </div>
        )}
      </section>

      <Rede />

      <Camera />

      <CameraNativa />

      <Arquivos />

      <Notificacoes />

      <Downloads />

      <Biometria />

      <Microfone />

      <footer className="rodape">
        Build: <code>npm run build</code> e depois{' '}
        <code>npm run preview</code> para o teste completo de PWA.
      </footer>
    </main>
  )
}

function Card({ titulo, valor, detalhe, tom }) {
  return (
    <article className={`card tom-${tom}`}>
      <h3>{titulo}</h3>
      <p className="valor">{valor}</p>
      <p className="ajuda">{detalhe}</p>
    </article>
  )
}
