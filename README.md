# StudioFlow

Gestão de estúdio (Pilates / fisioterapia) — Next.js App Router + Prisma + MySQL.

## Stack

- **UI:** Next.js (`app/`), React
- **API:** Route Handlers em `app/api/*` (mesmo domínio)
- **Banco:** MySQL (Hostinger ou local)
- **ORM:** Prisma

## Setup local

1. Copie o ambiente:

```bash
cp .env.example .env
```

2. Ajuste `DATABASE_URL` no `.env`:

```env
DATABASE_URL="mysql://USER:PASSWORD@127.0.0.1:3306/studioflow"
```

3. Instale dependências e gere o client:

```bash
npm install
npm run db:generate
```

4. Crie as tabelas e popule com os mocks:

```bash
# MySQL local via Docker/OrbStack (opcional)
orb start   # se usar OrbStack
docker compose up -d
# .env: DATABASE_URL="mysql://root:root@127.0.0.1:3306/studioflow"

npm run db:push
# ou: npx prisma migrate deploy
npm run db:seed
```

5. Suba o app:

```bash
npm run dev
```

API de alunos: `GET/POST /api/alunos`, `GET/PATCH/DELETE /api/alunos/[id]`.

## Scripts de banco

| Script | Função |
|---|---|
| `npm run db:generate` | Gera o Prisma Client |
| `npm run db:push` | Sincroniza o schema com o MySQL (dev) |
| `npm run db:migrate` | Cria migration (`prisma migrate dev`) |
| `npm run db:seed` | Popula studio, planos, alunos, etc. |
| `npm run db:studio` | Abre o Prisma Studio |

## Deploy na Hostinger (Node)

1. No painel, crie um banco **MySQL** e anote usuário, senha, host e nome do DB.
2. Defina a variável de ambiente no app Node:

```env
DATABASE_URL="mysql://USUARIO:SENHA@HOST:3306/NOME_DO_BANCO"
```

Na Hostinger, o host costuma ser `localhost` quando o app Node e o MySQL ficam no mesmo servidor.

3. Build e start (Node):

```bash
npm install
npx prisma generate
npx prisma migrate deploy
# ou, na primeira vez / sem migrations versionadas:
# npx prisma db push
npm run db:seed   # opcional, só na 1ª carga
npm run build
npm run start
```

4. UI e API no mesmo domínio: `/` e `/api/*`.

### Checklist rápido Hostinger

- [ ] Banco MySQL criado
- [ ] `DATABASE_URL` configurada no painel
- [ ] `prisma generate` no build (já incluso em `npm run build`)
- [ ] `prisma migrate deploy` ou `db push` após o deploy
- [ ] App Node com `next start` (não use static export)

## Escopo atual

- Schema completo (studio, planos, alunos, agenda, financeiro, contratos, campanhas…)
- Seed a partir dos mocks de `lib/data.ts`
- CRUD REST de **Alunos** + listagem/perfil/cadastro na UI
- Agenda, financeiro e campanhas ainda usam mock até a próxima fase
- Auth / multi-tenant SaaS: fora desta entrega
