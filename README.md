# Secretaria Sem Fila — Deploy no Railway

## Estrutura do projeto

```
secretaria-sem-fila/
├── backend/          ← API Node.js + Push + PostgreSQL
│   ├── src/
│   │   ├── server.js
│   │   ├── db.js
│   │   ├── push.js
│   │   └── routes/
│   │       ├── agendamentos.js
│   │       └── push.js
│   ├── package.json
│   ├── nixpacks.toml
│   └── .env.example
└── frontend/         ← React PWA
    ├── src/
    │   ├── App.jsx
    │   ├── main.jsx
    │   ├── sw.js
    │   ├── api.js
    │   ├── push.js
    │   └── components/
    │       └── PainelSecretaria.jsx
    ├── public/icons/  ← coloque icon-192.png e icon-512.png aqui
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── .env.example
```

---

## PASSO A PASSO COMPLETO

### Pré-requisitos
- Node.js instalado (`node --version`)
- Conta no Railway: https://railway.app
- Conta no GitHub: https://github.com

---

### PARTE 1 — Gerar as chaves VAPID (push)

No terminal, dentro da pasta `backend`:

```bash
cd backend
npm install
npx web-push generate-vapid-keys
```

Vai aparecer algo assim — guarde as duas chaves:
```
Public Key:  BM9abc...xyz
Private Key: K1def...uvw
```

---

### PARTE 2 — Subir o código no GitHub

1. Crie um repositório no GitHub chamado `secretaria-sem-fila`
2. Faça upload da pasta inteira (arraste os arquivos para o GitHub)
   - OU use o terminal:
   ```bash
   git init
   git add .
   git commit -m "primeiro commit"
   git remote add origin https://github.com/SEU_USUARIO/secretaria-sem-fila.git
   git push -u origin main
   ```

---

### PARTE 3 — Deploy do Backend no Railway

1. Acesse https://railway.app → **New Project**
2. Clique em **Deploy from GitHub repo** → selecione `secretaria-sem-fila`
3. Clique em **Add service** → **Database** → **PostgreSQL**
   - O Railway cria o banco e gera a variável `DATABASE_URL` automaticamente
4. Clique no serviço do backend → aba **Variables** → adicione:

| Variável           | Valor                                      |
|--------------------|--------------------------------------------|
| `VAPID_PUBLIC_KEY` | chave pública gerada no Passo 1            |
| `VAPID_PRIVATE_KEY`| chave privada gerada no Passo 1            |
| `VAPID_EMAIL`      | email da escola (ex: secretaria@escola.com)|
| `FRONTEND_URL`     | URL do frontend (preenche depois)          |
| `NODE_ENV`         | `production`                               |

5. Aba **Settings** → **Root Directory** → coloque `backend`
6. Clique em **Deploy** — aguarde ficar verde ✅
7. Copie a URL gerada (ex: `https://secretaria-backend.up.railway.app`)

---

### PARTE 4 — Deploy do Frontend no Railway

1. No mesmo projeto Railway → **New Service** → **GitHub Repo** (mesma repo)
2. Aba **Settings** → **Root Directory** → coloque `frontend`
3. Aba **Variables** → adicione:

| Variável       | Valor                                                  |
|----------------|--------------------------------------------------------|
| `VITE_API_URL` | URL do backend + `/api` (ex: `https://...railway.app/api`) |

4. Em **Settings** → **Build Command**: `npm run build`
5. Em **Settings** → **Start Command**: `npx serve dist -l $PORT`
   - Para o comando `serve` funcionar, adicione também em **Variables**:
   - `PORT` = `3000`
6. Clique em **Deploy** — aguarde ficar verde ✅
7. Copie a URL do frontend

---

### PARTE 5 — Conectar os dois serviços

1. Volte ao serviço do **backend** no Railway
2. Aba **Variables** → edite `FRONTEND_URL` com a URL real do frontend
3. Clique em **Redeploy**

---

### PARTE 6 — Criar os ícones do app

Coloque na pasta `frontend/public/icons/`:
- `icon-192.png` (192×192 px) — ícone do app
- `icon-512.png` (512×512 px) — ícone grande

Dica grátis: use o Canva (canva.com) com fundo azul `#1B3A6B` e texto branco.

---

### PARTE 7 — Ativar o push na secretaria

1. Abra o app no navegador da secretaria (Chrome ou Edge)
2. Clique em **Painel** (botão no header)
3. Clique em **Ativar push** → autorize as notificações
4. Pronto! A cada novo agendamento, o navegador da secretaria recebe um alerta 🔔

---

## Testar localmente (antes do deploy)

```bash
# Terminal 1 — backend
cd backend
cp .env.example .env
# edite o .env com suas chaves
npm run dev

# Terminal 2 — frontend
cd frontend
cp .env.example .env
# VITE_API_URL=http://localhost:3001/api
npm install
npm run dev
```

Abra: http://localhost:5173

---

## Custo

| Serviço          | Plano      | Custo          |
|------------------|------------|----------------|
| Railway Backend  | Starter    | ~$5/mês ou grátis com créditos |
| Railway PostgreSQL| Starter   | incluído       |
| Railway Frontend | Starter    | incluído       |

Railway oferece **$5 de crédito grátis por mês** — o projeto cabe dentro desse limite.

---

## Dúvidas

Email do concurso: boaspraticasqae@educacao.sp.gov.br
