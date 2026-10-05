# Web Push com FCM reaproveitando a fila AWS — design

Branch `teste-web-push`, criado a partir de `main`.

## Objetivo

Testar notificações push de verdade (app fechado, disparadas pelo servidor) no PWA,
reaproveitando a fila de push do Obra Prima sem alterar AWS nem backend.

## Achados que sustentam o desenho

- As Lambdas (`push-auth`, `push-token`, `push-fila`, `push-envio`) só repassam o que
  recebem: `push-envio` publica `{ GCM: JSON.stringify(notificacao) }` sem tocar no
  `fcmV1Message`. Nenhuma olha a plataforma do token.
- As platform applications SNS (`op-push-fcm`) usam FCM v1 com a service account do
  projeto Firebase do OP. Elas valem para o projeto inteiro: Android, iOS e o app
  Web novo usam a mesma.
- O projeto só tinha apps Android/iOS. Foi criado o app Web `PWA Teste Web Push`;
  a config dele fica no `.env.local`. A chave VAPID é opcional; sem ela o
  SDK usa a padrão do Firebase.
- O backend (`PortalObras/App/_Classes/Firebase/Firebase.vb`) manda só `data` +
  `apns`, sem `notification` nem `webpush`. `tipo_notificacao` e `id_atualizacao` saem
  como número, mas o FCM v1 exige string em `data`.
- Na web, quem exibe a notificação é sempre o service worker. O Chrome exige uma
  notificação visível para cada push, inclusive os de sincronização silenciosa.

## Decisões

- **Script local** chama `/token`, `/enviar` e `DELETE /token`, com o `AUTH_TOKEN` em
  `.env.local`. Chamar direto do navegador exporia o token de homologação no bundle.
- **Handler `push` próprio no SW** (`public/sw-custom.js`), sem Firebase no SW. O
  Firebase fica só na página para gerar o token sobre o registro do SW do
  vite-plugin-pwa. Assim a config `generateSW` continua igual e o payload cru do FCM
  fica visível.

## Componentes

| Arquivo | Papel |
|---|---|
| `src/firebase.js` | Config pública do app Web, `obterTokenFcm` e `apagarTokenFcm` |
| `src/PushReal.jsx` | Painel: gerar token, copiar comando de registro, apagar token, log dos pushes |
| `public/sw-custom.js` | Interpreta o payload (backend, `notification`, sincronização) e repassa o cru à página |
| `scripts/push.mjs` | `registrar`, `enviar [formato]`, `remover` |
| `.env.exemplo` | Modelo do `.env.local` |

## Formatos de envio

`backend` (padrão, strings), `backend-numerico` (como o backend serializa hoje),
`silencioso` (`tipo_notificacao` 4) e `notification` (`notification` no topo).

## Fora do escopo

Teste no celular (exige HTTPS; ver túnel no README), BNO, mudanças no backend.

## Perguntas que o teste responde

1. O payload atual do backend chega e é exibível na web?
2. `tipo_notificacao` numérico é rejeitado pelo FCM (bug latente)?
3. Como ficam os pushes silenciosos de sincronização no navegador?
