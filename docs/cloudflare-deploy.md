# Deploy no Cloudflare Pages

## 1. Variáveis de ambiente (obrigatório)

O build **precisa** das variáveis `VITE_*` no momento do `npm run build`.  
Sem elas, o app em produção quebra com `auth/invalid-api-key`.

No Cloudflare Dashboard → **Workers & Pages** → seu projeto → **Settings** → **Environment variables**, adicione (Production e Preview):

| Variável | Exemplo |
|----------|---------|
| `VITE_FIREBASE_API_KEY` | valor do Firebase Console |
| `VITE_FIREBASE_AUTH_DOMAIN` | `igreja-santana-joaquim.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `igreja-santana-joaquim` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `936127307094` |
| `VITE_FIREBASE_APP_ID` | `1:936127307094:web:...` |

Use os mesmos valores do seu `.env.local` local.

## 2. Comandos de build

| Campo | Valor |
|-------|-------|
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |

### Deploy command

Para **Cloudflare Pages** conectado ao Git, deixe o **Deploy command vazio** — o Pages publica o `dist` automaticamente.

Se usar `npx wrangler deploy`, o `wrangler.toml` já inclui `[assets]` apontando para `./dist`.

## 3. Domínio autorizado no Firebase

Em **Authentication → Settings → Authorized domains**, adicione:

- `localhost`
- Seu domínio Cloudflare (ex.: `igreja-santana-joaquim.pages.dev`)

## 4. Após configurar

1. Salve as variáveis no Cloudflare
2. **Retry build** ou faça um novo push
3. Confirme no console do navegador que não há mais `auth/invalid-api-key`
