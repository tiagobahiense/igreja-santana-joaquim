# Deploy no Cloudflare Pages

## 1. Variáveis de ambiente

### Opção A — `.env.production` (recomendado, já no repositório)

O projeto inclui `.env.production` com a config **pública** do Firebase Web.  
O Vite carrega esse arquivo automaticamente em `npm run build`, inclusive no Cloudflare Pages — **não depende** das variáveis do dashboard.

> A API key do Firebase Web não é segredo; a proteção vem das regras do Firestore, Auth e restrição de domínio no Google Cloud Console.

### Opção B — Variáveis no Cloudflare (opcional, sobrescrevem o arquivo)

Se preferir configurar só no Cloudflare, adicione em **Settings → Environment variables** (Production):

| Variável | Exemplo |
|----------|---------|
| `VITE_FIREBASE_API_KEY` | valor do Firebase Console (`AIzaSy...`) |
| `VITE_FIREBASE_AUTH_DOMAIN` | `igreja-santana-joaquim-77097.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `igreja-santana-joaquim-77097` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `719058029987` |
| `VITE_FIREBASE_APP_ID` | `1:719058029987:web:ab7772bbf63069eab85e16` |

**Atenção:** no Cloudflare, marque as variáveis para o ambiente **Production** e faça rebuild após salvar. Se ainda assim não entrarem no bundle, use a opção A.

## 2. Comandos de build

| Campo | Valor |
|-------|-------|
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |

### Deploy command

Para **Cloudflare Pages** conectado ao Git, deixe o **Deploy command vazio** — o Pages publica o `dist` automaticamente.

> **Não** use `[assets]` no `wrangler.toml` — isso é só para Workers, e quebra o build do Pages.

O roteamento SPA já está em `public/_redirects` (`/* /index.html 200`).

## 3. Domínio autorizado no Firebase

Em **Authentication → Settings → Authorized domains**, adicione:

- `localhost`
- Seu domínio Cloudflare (ex.: `igreja-santana-joaquim.pages.dev`)

## 4. Após configurar

1. Salve as variáveis no Cloudflare
2. **Retry build** ou faça um novo push
3. Confirme no console do navegador que não há mais `auth/invalid-api-key`
