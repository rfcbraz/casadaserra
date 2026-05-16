# 🏡 Casa da Serra — Backend API

Backend Node.js + PostgreSQL para o sistema de reservas da Casa da Serra.

---

## Stack

- **Node.js** + **Express** — servidor HTTP
- **PostgreSQL** — base de dados
- **Prisma** — ORM (queries, migrações, seed)
- **JWT** — autenticação do painel admin
- **Nodemailer** — emails de confirmação
- **Stripe** — pagamentos online
- **Helmet + Rate Limit** — segurança

---

## Instalação local

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar variáveis de ambiente
```bash
cp .env.example .env
```
Edita o `.env` com os teus dados (base de dados, email, Stripe).

### 3. Criar a base de dados (PostgreSQL local)
```bash
# Instala PostgreSQL se ainda não tiveres
# Mac: brew install postgresql
# Ubuntu: sudo apt install postgresql

# Cria a base de dados
createdb casadaserra
```
Ou usa o **Railway** (recomendado — ver secção Deploy).

### 4. Correr as migrações
```bash
npx prisma migrate dev --name init
```

### 5. Popular com dados iniciais
```bash
npm run db:seed
```

### 6. Iniciar o servidor
```bash
npm run dev       # desenvolvimento (hot reload)
npm start         # produção
```

O servidor arranca em `http://localhost:3001`.

---

## API — Endpoints

### Público

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | Health check |
| GET | `/api/rooms` | Lista todos os quartos |
| GET | `/api/rooms/:id` | Detalhes de um quarto |
| GET | `/api/availability?checkIn=&checkOut=` | Quartos disponíveis |
| GET | `/api/availability/room/:id?year=&month=` | Datas ocupadas de um quarto |
| POST | `/api/reservations` | Criar reserva |
| GET | `/api/reservations/:id` | Consultar reserva |

### Admin (requer token JWT)

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/admin/login` | Login |
| GET | `/api/admin/me` | Dados do admin |
| GET | `/api/admin/stats` | Estatísticas do dashboard |
| GET | `/api/reservations` | Listar reservas |
| PATCH | `/api/reservations/:id/status` | Atualizar estado |
| DELETE | `/api/reservations/:id` | Cancelar reserva |
| POST | `/api/rooms` | Criar quarto |
| PATCH | `/api/rooms/:id` | Editar quarto |
| DELETE | `/api/rooms/:id` | Desativar quarto |
| POST | `/api/availability/block` | Bloquear datas |
| DELETE | `/api/availability/block` | Desbloquear datas |

### Exemplo — Criar reserva
```bash
curl -X POST http://localhost:3001/api/reservations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Silva",
    "email": "joao@email.com",
    "phone": "+351960000000",
    "roomId": "uuid-do-quarto",
    "checkIn": "2026-06-01",
    "checkOut": "2026-06-04",
    "guests": 2,
    "breakfast": true
  }'
```

### Exemplo — Login admin
```bash
curl -X POST http://localhost:3001/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@casadaserra.pt", "password": "a-tua-password"}'
```

---

## Deploy no Railway (recomendado)

1. Cria conta em [railway.app](https://railway.app)
2. Cria um novo projeto → **"Deploy from GitHub repo"**
3. Adiciona um plugin **PostgreSQL** ao projeto
4. Em **Variables**, copia o conteúdo do `.env.example` e preenche
   - O `DATABASE_URL` é gerado automaticamente pelo Railway
5. Railway faz deploy automático em cada `git push`

### Variáveis obrigatórias no Railway
```
DATABASE_URL        → gerado automaticamente
JWT_SECRET          → string aleatória longa
ADMIN_EMAIL         → o teu email
ADMIN_PASSWORD      → password segura
SMTP_HOST/USER/PASS → configuração de email
FRONTEND_URL        → URL do teu site
NODE_ENV            → production
```

Após o deploy, corre o seed uma vez:
```bash
railway run npm run db:seed
```

---

## Emails (configuração Gmail)

1. Ativa a **Verificação em 2 passos** na conta Google
2. Em [myaccount.google.com](https://myaccount.google.com) → Segurança → **App Passwords**
3. Gera uma password para "Mail"
4. Usa essa password em `SMTP_PASS` no `.env`

---

## Próximos passos

- [ ] Integração Stripe (pagamentos)
- [ ] Painel admin completo no frontend
- [ ] Sincronização com iCal (Airbnb/Booking)
- [ ] Multi-idioma nos emails
