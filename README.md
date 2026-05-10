# Dream Network 🌙

**Rede Social de Sonhos** — Uma aplicação web onde utilizadores anónimos registam sonhos, o navegador extrai emoções localmente (sem enviar o texto original) e metadados anónimos alimentam um grafo de associações.

## Stack

| Camada        | Tecnologia                                     |
|---------------|------------------------------------------------|
| Back-end      | FastAPI (Python 3.11), Uvicorn                 |
| Banco relacional | PostgreSQL 15                               |
| Banco de grafos  | Neo4j 5 (Community)                         |
| Filas         | Redis + Celery                                 |
| Front-end     | SolidJS + Vite + Tailwind CSS                  |
| NLP local     | Transformers.js (Xenova/bert-base-multilingual-uncased quantizado) |
| Criptografia  | Web Crypto API (AES-GCM + PBKDF2)              |
| Containerização | Docker + Docker Compose                      |
| Deploy        | Dokploy (VPS Hostinger)                        |

## Funcionalidades (MVP)

1. **Autenticação anónima** — nome de utilizador + senha. Hash bcrypt no servidor, derivação de chave local (PBKDF2).
2. **Diário cifrado localmente** — texto cifrado com AES-GCM antes de sair do dispositivo. Análise de emoção via Transformers.js em Web Worker.
3. **Partilha anónima** — apenas emoção, timestamp e hash do utilizador são enviados para o servidor. **Nunca o texto do sonho.**
4. **Grafo de emoções** — Neo4j com visualização D3.js force layout.
5. **Gamificação** — pontos e streak por partilha diária.

---

## 💻 Desenvolvimento Local

### Pré-requisitos

- Docker & Docker Compose
- Node.js 20+ (opcional, para frontend standalone)
- Python 3.11+ (opcional, para backend standalone)

### 1. Clonar e configurar

```bash
git clone https://github.com/nbtech-prox/dreamnetwork.git
cd dreamnetwork
cp .env.example .env
```

Edite `.env` se necessário (as predefinições funcionam para dev local).

### 2. Subir tudo com Docker Compose

```bash
docker-compose up --build
```

Isto inicia:
- `postgres` — PostgreSQL 15 na porta 5432
- `neo4j` — Neo4j 5 nas portas 7474 (web UI) e 7687 (Bolt)
- `redis` — Redis 7 na porta 6379
- `api` — FastAPI com hot-reload na porta 8000
- `celery-worker` — Worker Celery para processamento do grafo

### 3. Iniciar o front-end (separado, com hot-reload)

```bash
cd frontend
npm install
npm run dev
```

O frontend abre em **http://localhost:3000**.

> O Vite faz proxy de `/api/*` para `http://localhost:8000`.

### 4. Testar manualmente

1. Aceda a **http://localhost:3000**
2. Registe um novo utilizador
3. Escreva um sonho e clique em "Salvar e Processar"
4. Ative "Compartilhar anonimamente" e salve
5. Verifique o grafo em **/graph**
6. Consulte os desafios em **/challenges**
7. Verifique o endpoint: `curl http://localhost:8000/api/graph/emotions`

---

## 🧪 Teste de Endpoints (curl)

```bash
# Healthcheck
curl http://localhost:8000/api/health

# Registar
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"teste","password":"123456"}'

# Login (guarda cookie)
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"teste","password":"123456"}' \
  -c cookies.txt

# Ver sessão
curl http://localhost:8000/api/auth/me -b cookies.txt

# Partilhar metadado
curl -X POST http://localhost:8000/api/shares \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"emotion":"alegria","timestamp":"2025-05-09T20:00:00+00:00"}'

# Grafo de emoções
curl http://localhost:8000/api/graph/emotions -b cookies.txt

# Desafios
curl http://localhost:8000/api/challenges -b cookies.txt
```

---

## 🚀 Deploy no Dokploy (Hostinger VPS)

### Pré-requisitos na VPS

- Dokploy instalado e configurado (https://dokploy.com)
- Docker & Docker Compose
- Git
- Domínio apontado para o IP da VPS (ex: `dreamnetwork.seusite.com`)

### Passo a Passo

#### 1. SSH para a VPS

```bash
ssh root@SEU_IP_VPS
```

#### 2. Clonar o repositório

```bash
cd /opt
git clone https://github.com/nbtech-prox/dreamnetwork.git
cd dreamnetwork
```

#### 3. Configurar variáveis de ambiente para produção

```bash
cp .env.example .env
nano .env
```

Preencha:

```env
POSTGRES_PASSWORD=senha_forte_aqui_32_caracteres
NEO4J_PASSWORD=outra_senha_forte_neo4j
SECRET_KEY=chave_aleatoria_jwt_64_caracteres
JWT_EXPIRY_HOURS=24
BACKEND_CORS_ORIGINS=https://dreamnetwork.seusite.com
```

#### 4. Gerar SECRET_KEY segura

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

#### 5. Usar o Dokploy para fazer deploy

No painel do Dokploy:

1. **Criar um novo projeto** chamado `dreamnetwork`
2. **Adicionar stack** → selecionar `docker-compose.prod.yml`
3. **Definir o diretório de trabalho** como `/opt/dreamnetwork`
4. **Injetar variáveis de ambiente** do ficheiro `.env`
5. **Clicar em "Deploy"**

Ou, via CLI do Dokploy:

```bash
dokploy stack deploy \
  --project dreamnetwork \
  --stack docker-compose.prod.yml \
  --env-file .env
```

#### 6. (Opcional) Configurar domínio e SSL

Se quiser usar apenas o frontend com nginx na porta 80:

1. No Dokploy, aponte o domínio `dreamnetwork.seusite.com` para o container `frontend` (porta 80)
2. Ative Let's Encrypt SSL no painel do Dokploy

Se quiser SSL para a API também, configure um reverse proxy (Caddy/Traefik) ou use o proxy SSL do Dokploy.

#### 7. Verificar o deploy

```bash
docker-compose -f docker-compose.prod.yml ps
# Todos os serviços devem estar "Up"

curl http://localhost:8000/api/health
# {"status":"ok","timestamp":"..."}
```

Aceda a **https://dreamnetwork.seusite.com** no browser.

---

## 🔐 Arquitetura de Segurança

```
         Navegador (cliente)
         ┌─────────────────────────────────────┐
         │ 1. User escreve sonho               │
         │ 2. Transformers.js extrai emoção    │
         │ 3. AES-GCM cifra o texto            │
         │ 4. IndexedDB guarda cifrado         │
         │ 5. Se "partilhar":                  │
         │    → POST /api/shares               │
         │      { emotion, timestamp, hash }   │
         └────────────┬────────────────────────┘
                      │ apenas metadados anónimos
                      ▼
         Servidor FastAPI
         ┌─────────────────────────────────────┐
         │ 1. Valida JWT                        │
         │ 2. Guarda metadados no PostgreSQL    │
         │ 3. Envia task para Celery            │
         └────────────┬────────────────────────┘
                      │
                      ▼
         Neo4j (grafo de emoções)
```

**Notas de segurança:**
- O texto do sonho **nunca** sai do navegador
- A senha nunca é armazenada em plaintext (bcrypt + PBKDF2)
- A chave de cifra é derivada localmente e nunca transmitida
- O JWT é transportado em cookie httpOnly (não acessível por JS)
- Apenas metadados anónimos (emoção + timestamp + hash) são partilhados

---

## 📁 Estrutura do Projeto

```
dreamnetwork/
├── .env.example              # Variáveis de ambiente (template)
├── docker-compose.yml        # Dev: todos os serviços + hot-reload
├── docker-compose.prod.yml   # Produção: otimizado para Dokploy
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/
│   │       └── 001_initial.py
│   └── app/
│       ├── main.py           # FastAPI app + auth endpoints
│       ├── config.py         # Config (Pydantic Settings)
│       ├── database.py       # SQLAlchemy async engine
│       ├── models.py         # User, SharedDream
│       ├── auth.py           # JWT, bcrypt, dependências
│       ├── celery_worker.py  # Celery app
│       ├── routers/
│       │   ├── shares.py     # POST /api/shares
│       │   ├── graph.py      # GET /api/graph/emotions
│       │   └── challenges.py # GET /api/challenges
│       └── tasks/
│           └── neo4j_tasks.py # Worker Celery para Neo4j
├── frontend/
│   ├── Dockerfile            # Multi-stage build + nginx
│   ├── nginx.conf            # Reverse proxy para API
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── src/
│       ├── index.jsx
│       ├── index.css
│       ├── App.jsx           # App principal + navegação
│       ├── auth/
│       │   └── Auth.jsx      # Login / Registo
│       ├── diary/
│       │   ├── Diary.jsx     # Editor de sonhos
│       │   ├── crypto.js     # AES-GCM + PBKDF2
│       │   └── db.js         # IndexedDB (idb)
│       ├── worker/
│       │   └── emotionWorker.js  # Transformers.js worker
│       ├── explore/
│       │   └── Graph.jsx     # D3.js force layout
│       └── challenges/
│           └── Challenges.jsx # Gamificação
└── README.md
```

---

## ⚠️ Troubleshooting

### O Transformers.js não carrega no Firefox

Algumas versões do Firefox têm limitações com workers WASM. O sistema faz fallback para análise baseada em palavras-chave (menos precisa, mas funcional).

### Erro de conexão ao Neo4j

O worker Celery tem retry automático (3 tentativas). Se persistir, verifique as credenciais no `.env`.

### CORS no desenvolvimento

O Vite faz proxy de `/api/*` para `localhost:8000`. Se aceder diretamente ao backend, use a extensão `BACKEND_CORS_ORIGINS`.

### Resetar dados de desenvolvimento

```bash
docker-compose down -v
docker-compose up --build
```

Isto remove volumes (PostgreSQL e Neo4j) e recria tudo de raiz.

---

## 📄 Licença

MIT — NBTech

---

Feito com 🌙 por [Nuno Batista](https://www.nbtech.pt)
