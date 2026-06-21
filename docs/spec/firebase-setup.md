# Firebase — Guia de preparação

Checklist prático para conectar o projeto ao Firebase que você criou.

> **Sem Firebase Storage** — permanece no plano Spark gratuito, sem cartão de crédito.

---

## 1. Serviços a ativar (plano Spark / gratuito)

| Serviço | Ação |
|---------|------|
| **Authentication** | Sign-in method → **E-mail/Senha** → Ativar |
| **Cloud Firestore** | Create database → **Production mode** → região preferencial: `southamerica-east1` |
| **Storage** | **Não ativar** — fora do escopo v1 |

---

## 2. Registrar app Web

1. Firebase Console → ⚙️ Project settings → **Your apps**
2. Add app → **Web** (`</>`)
3. Apelido sugerido: `gestao-paroquia-web`
4. Copiar o objeto `firebaseConfig`

Exemplo do que você receberá:

```javascript
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...", // pode ignorar — não usamos Storage
  messagingSenderId: "...",
  appId: "..."
};
```

---

## 3. Criar `.env.local` na raiz do projeto

```env
VITE_FIREBASE_API_KEY=sua_api_key
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu-projeto-id
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123

# Usado apenas em script local de seed (não vai para o bundle Vite)
FIREBASE_ADMIN_EMAIL=seu-email-admin@dominio.com
FIREBASE_ADMIN_PASSWORD=sua-senha-segura
```

> **Nunca** commite `.env.local`. O arquivo `.gitignore` incluirá essa entrada.

---

## 4. Domínios autorizados (Auth)

Em **Authentication → Settings → Authorized domains**, garantir:

- `localhost`
- Domínio de produção (ex.: `seu-app.pages.dev` no Cloudflare ou `seu-app.vercel.app`)

Deploy Cloudflare: [`docs/cloudflare-deploy.md`](../cloudflare-deploy.md)

---

## 5. O que me enviar / ter pronto para a implementação

Você **não precisa** colar senhas no chat. Basta:

1. Confirmar que **Auth** e **Firestore** estão ativos
2. Ter o `.env.local` preenchido localmente na sua máquina
3. Informar o **Project ID** (público, não é segredo)

Opcional: exportar regras atuais se já tiver configurado algo.

---

## 6. Conta admin inicial

Na implementação forneceremos um script `npm run seed:admin` que:

1. Cria usuário no Firebase Auth com e-mail/senha do `.env`
2. Grava documento `users/{uid}` com `isAdmin: true`

Execute **uma vez** após o primeiro deploy local.

---

## 7. Alternativas sem Storage

| Antes (Storage) | Agora (v1) |
|-----------------|------------|
| Upload foto de perfil | Avatar com **iniciais** + cor escolhida; URL externa opcional |
| Anexo de comprovante | Campo **referência** (texto) + link externo opcional (Drive, etc.) |

---

## 8. Limites do plano gratuito (monitorar)

| Recurso | Limite diário (aprox.) |
|---------|------------------------|
| Firestore reads | 50.000 |
| Firestore writes | 20.000 |
| Auth | 10.000 verificações/mês (suficiente) |

A spec em [`SPEC.md`](./SPEC.md) descreve estratégias de otimização (docs de resumo, paginação, cache).

---

## 9. O que **não** precisa fazer

- Upgrade para plano Blaze
- Ativar Firebase Storage
- Ativar Cloud Functions
- Configurar billing / cartão de crédito
- Google Analytics (opcional; pode ignorar na v1)
