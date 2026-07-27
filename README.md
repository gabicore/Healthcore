# HealthCore

Gestão de estúdio (Pilates / fisioterapia) — Next.js App Router + Prisma + MySQL + Better Auth.

## Setup local

```bash
cp .env.example .env
# Ajuste DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL

npm install
npm run db:generate
npx prisma migrate deploy   # ou: npm run db:push
npm run db:seed
npm run dev
```

Admin inicial (seed):

- e-mail: `admin@healthcore.com`
- senha temporária: `Admin@123`

## Autenticação

- Better Auth com sessões em cookies **HttpOnly**, **Secure** (prod), **SameSite=Lax**
- Senhas com **Argon2** (`Account.password`)
- Registro público desabilitado — só Admin cria usuários (`POST /api/users`)
- Lockout após 5 tentativas; rate limit no sign-in
- Auditoria em `auth_audit_log`
- Middleware protege rotas da UI e `/api/*` (exceto `/api/auth` e `/api/health`)

### Rotas auth

| Rota | Função |
|---|---|
| `/login` | Login |
| `/forgot-password` | Recuperação |
| `/reset-password?token=` | Nova senha |
| `/change-password` | Troca (autenticado) |
| `/api/auth/*` | Better Auth |
| `/api/users` | Registrar (ADMIN+) |
| `/api/users/me` | Perfil |
| `/api/users/me/password` | Alterar senha |
| `/api/users/me/sessions` | Listar/revogar sessões |

E-mails de reset/verificação: log no console nesta fase (`ConsoleEmailSender`).

## Deploy Hostinger

1. Variáveis: `DATABASE_URL` com host **`localhost`**, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (URL pública do site)
2. `npm install && npx prisma migrate deploy && npm run build && npm run start`
3. Não rode seed de novo se o banco já tiver dados — só a migration de auth + create manual do admin se necessário

```env
DATABASE_URL="mysql://USER:SENHA@localhost:3306/DB"
BETTER_AUTH_SECRET="..."
BETTER_AUTH_URL="https://seu-dominio.hostingersite.com"
NEXT_PUBLIC_APP_URL="https://seu-dominio.hostingersite.com"
```
