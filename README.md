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

### 3. Preparar o PostgreSQL

#### Opção A — PostgreSQL local
Se ainda não tens PostgreSQL instalado:
- **Windows (pgAdmin / PostgreSQL installer)**: instala o PostgreSQL e cria uma base de dados chamada `casadaserra`
- **macOS**: `brew install postgresql`
- **Ubuntu**: `sudo apt install postgresql`

Depois cria a base de dados:
```bash
createdb casadaserra
```

No `.env`, usa algo como:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/casadaserra?schema=public"
```

Se estiveres a usar um utilizador diferente, substitui `postgres` pelo teu nome de utilizador e a password pela tua password.

#### Opção B — Railway
Se preferires usar o Railway, copia o `DATABASE_URL` que o Railway gera para o teu projeto para o `.env`.

### 4. Verificar a ligação à base de dados
```bash
npm run db:check
```

### 5. Criar as tabelas e popular dados iniciais
```bash
npm run db:setup
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
| GET | `/api/rooms` | Lista todas as unidades |
| GET | `/api/rooms/:id` | Detalhes de uma unidade |
| GET | `/api/availability?checkIn=&checkOut=` | Unidades disponíveis |
| GET | `/api/availability/room/:id?year=&month=` | Datas ocupadas de uma unidade |
| POST | `/api/reservations` | Enviar pedido de reserva para aprovação do proprietário |
| POST | `/api/reservations/:id/cancel-checkout` | Cancelar um Checkout não pago e libertar as datas |
| GET | `/api/reservations/:id` | Consultar reserva |
| GET | `/ical/:roomId.ics` | Exportar calendário iCal da unidade |

O proprietário aceita apenas estadias de, no mínimo, duas noites consecutivas. A regra é aplicada tanto na pesquisa de disponibilidade como na criação e confirmação de reservas.

O proprietário aprova ou recusa cada pedido no backoffice. Após a aprovação, o hóspede recebe por email um link Stripe Checkout para pagamento integral por cartão, válido por 35 minutos. O estado passa a `PAID` apenas após o webhook `payment_intent.succeeded`; cancelamentos de reservas pagas iniciam um reembolso integral idempotente. Configura `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` e `FRONTEND_URL` no ambiente do servidor e aponta o webhook Stripe para `/webhooks/stripe`, com os eventos `payment_intent.succeeded` e `checkout.session.expired`. Aplica as migrações com `npm run db:migrate` antes de publicar esta versão.

## Booking.com

O projeto tem feeds iCal de disponibilidade, mas a integração com a API oficial da Booking.com ainda depende de acesso aprovado à Connectivity API e credenciais da propriedade. Sem esse acesso, não é possível sincronizar reservas completas nem fazer alterações de disponibilidade em tempo real.

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
| GET | `/ical/:roomId.ics` | Exportar calendário iCal da unidade |

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
    "guests": 2
  }'
```

### Exemplo — Login admin
```bash
curl -X POST http://localhost:3001/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@casadaserra.pt", "password": "a-tua-password"}'
```

---

## Publicação no GitHub Pages

Este repositório já inclui um workflow em [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml) para publicar o site estático em GitHub Pages sempre que houver push para `main`.

Depois do push, ativa o GitHub Pages no GitHub:
1. Vai a `Settings` → `Pages`.
2. Em `Build and deployment`, escolhe `GitHub Actions`.
3. O site ficará disponível em `https://<utilizador>.github.io/<repositório>/` após a primeira execução do workflow.

---

## Deploy no Railway (recomendado)

1. Cria conta em [railway.app](https://railway.app)
2. Cria um novo projeto → **"Deploy from GitHub repo"**
3. Adiciona um plugin **PostgreSQL** ao projeto
4. Em **Variables**, copia o conteúdo do `.env.example` e preenche
   - O `DATABASE_URL` é gerado automaticamente pelo Railway
5. Railway faz deploy automático em cada `git push`

O comando `npm start` executa `setup-db.js`, que mantém os campos de pagamento e o estado `AWAITING_PAYMENT` da tabela de reservas compatíveis com a versão atual. Continua a aplicar `npm run db:migrate` no deploy para executar as restantes migrações.

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
- [x] Sincronização com iCal (Airbnb/Booking)
- [ ] Multi-idioma nos emails
