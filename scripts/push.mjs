import { readFile, rm, writeFile } from 'node:fs/promises'

const ARQUIVO_ENV = '.env.local'
const ARQUIVO_REGISTRO = '.push-registro.local'
const ARQUIVO_TOKEN_DISPOSITIVO = '.push-token.local'

try {
  process.loadEnvFile(ARQUIVO_ENV)
} catch {
  encerrar(`Arquivo ${ARQUIVO_ENV} não encontrado. Copie .env.exemplo para ${ARQUIVO_ENV} e preencha.`)
}

const {
  PUSH_API_URL,
  PUSH_AUTH_TOKEN,
  PUSH_AMBIENTE = 'OP',
  APROVACAO_API_URL = 'http://localhost:3000/aprovacoes',
} = process.env

if (!PUSH_API_URL || !PUSH_AUTH_TOKEN) {
  encerrar(`Preencha PUSH_API_URL e PUSH_AUTH_TOKEN em ${ARQUIVO_ENV}.`)
}

const formatos = {
  backend: () => mensagemDoBackend({ tipoNumerico: false }),
  'backend-numerico': () => mensagemDoBackend({ tipoNumerico: true }),
  silencioso: mensagemDeSincronizacao,
  notification: mensagemComNotification,
  aprovacao: mensagemDeAprovacao,
}

const comandos = { registrar, enviar, remover }

const [comando, argumento] = process.argv.slice(2)

if (!comandos[comando]) {
  encerrar('Uso: node scripts/push.mjs <registrar [TOKEN_FCM] | enviar [FORMATO] | remover>')
}

await comandos[comando](argumento)

async function registrar(tokenInformado) {
  const tokenFcm = tokenInformado ?? (await lerTokenDoDispositivo())

  const resposta = await chamarApi('POST', '/token', {
    ambiente: PUSH_AMBIENTE,
    token: tokenFcm,
  })
  const endpoint = resposta.EndpointArn.split('/').at(-1)

  await writeFile(ARQUIVO_REGISTRO, JSON.stringify({ token: tokenFcm, endpoint }))
  console.log(`\nEndpoint registrado: ${endpoint}`)
}

async function enviar(formato = 'backend') {
  if (!formatos[formato]) {
    encerrar(`Formato inválido. Use: ${Object.keys(formatos).join(', ')}`)
  }

  const registro = await lerRegistro()

  await chamarApi('POST', '/enviar', [
    {
      notificacao: { fcmV1Message: { message: formatos[formato](registro) } },
      tokens: [registro.endpoint],
      ambiente: PUSH_AMBIENTE,
    },
  ])
}

async function remover() {
  await chamarApi('DELETE', '/token', {
    ambiente: PUSH_AMBIENTE,
    token: (await lerRegistro()).endpoint,
  })
  await rm(ARQUIVO_REGISTRO)
  console.log('\nEndpoint removido.')
}

function mensagemDoBackend({ tipoNumerico }) {
  const titulo = `Teste backend ${horaAtual()}`
  const mensagem = 'Payload no mesmo formato do Firebase.vb.'
  const conteudo = {
    group: 'mensagem',
    type: 222,
    titulo,
    subtitulo: 'Teste Web Push',
    id: 0,
    id_notificacao: 0,
    id_empresa: 0,
    id_obra: 0,
    conteudo: mensagem,
  }

  return {
    data: {
      titulo,
      mensagem,
      notificacao: JSON.stringify(conteudo),
      tipo_notificacao: tipoNumerico ? 1 : '1',
    },
    apns: {
      payload: {
        aps: {
          alert: { title: titulo, body: mensagem },
          category: String(conteudo.type),
          'mutable-content': 1,
        },
      },
    },
  }
}

function mensagemDeSincronizacao() {
  return {
    data: {
      atualizacao: JSON.stringify({ origem: 'teste-web-push', hora: horaAtual() }),
      id_atualizacao: '1',
      tipo_notificacao: '4',
    },
  }
}

function mensagemComNotification() {
  const titulo = `Teste notification ${horaAtual()}`
  return {
    notification: { title: titulo, body: 'Payload com notification no topo.' },
    data: { titulo },
  }
}

function mensagemDeAprovacao({ token }) {
  const titulo = 'Teste notificação de aprovação'
  const mensagem = `Solicitação de teste às ${horaAtual()}. Aprovar ou reprovar?`
  const conteudo = {
    group: 'aprovacao',
    type: 282,
    titulo,
    id: 0,
    id_notificacao: 0,
    conteudo: mensagem,
  }

  return {
    data: {
      titulo,
      mensagem,
      notificacao: JSON.stringify(conteudo),
      tipo_notificacao: '1',
      token,
      url_aprovacao: APROVACAO_API_URL,
    },
  }
}

async function chamarApi(metodo, rota, corpo) {
  const resposta = await fetch(PUSH_API_URL.replace(/\/$/, '') + rota, {
    method: metodo,
    headers: {
      Authorization: PUSH_AUTH_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(corpo),
  })
  const texto = await resposta.text()

  console.log(`${metodo} ${rota} -> ${resposta.status}`)
  console.log(texto)

  if (!resposta.ok) process.exit(1)
  return texto ? JSON.parse(texto) : null
}

async function lerTokenDoDispositivo() {
  try {
    return (await readFile(ARQUIVO_TOKEN_DISPOSITIVO, 'utf8')).trim()
  } catch {
    encerrar('Nenhum token salvo. Gere o token na página ou informe: npm run push:registrar -- TOKEN_FCM')
  }
}

async function lerRegistro() {
  try {
    return JSON.parse(await readFile(ARQUIVO_REGISTRO, 'utf8'))
  } catch {
    encerrar('Nenhum endpoint registrado. Rode npm run push:registrar -- TOKEN_FCM antes.')
  }
}

function horaAtual() {
  return new Date().toLocaleTimeString('pt-BR')
}

function encerrar(mensagem) {
  console.error(mensagem)
  process.exit(1)
}
