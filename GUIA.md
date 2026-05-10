# Dream Network — Guia do Utilizador

## 🌙 O que é?

Rede social **anónima** de sonhos. Escreves os teus sonhos, o browser
analisa a emoção localmente, cifra o texto e só partilha metadados
(emoção + timestamp) se autorizares.

**O texto do sonho NUNCA sai do teu computador.**

---

## 📓 Diário de Sonhos

**O que faz:** Escrever e processar sonhos.

**Como usar:**
1. Escreve o sonho na caixa de texto
2. Opcional: ativa "Compartilhar anonimamente"
3. Clica em "🌙 Salvar e Processar"

**O que acontece quando clicas em "Salvar e Processar":**

```
1. Web Worker carrega o modelo Transformers.js (no teu browser)
2. O modelo analisa o texto e extrai uma emoção:
   😊 Alegria | 😨 Medo | 😢 Tristeza | 😡 Raiva | 😲 Surpresa | 😐 Neutro
3. O texto é CIFRADO com AES-GCM + a tua senha (PBKDF2)
4. O texto cifrado é guardado no IndexedDB (base de dados local do browser)
5. Se ativaste "Compartilhar", envia para o servidor:
   → { emotion: "alegria", timestamp: "2025-...", user_hash: "abc123..." }
   → NUNCA envia o texto do sonho
```

**Onde fica guardado cada coisa:**
- Texto cifrado → IndexedDB (local, no teu browser)
- Chave de cifra → derivada da tua senha (nunca transmitida)
- Metadados (emoção) → servidor (PostgreSQL) e grafo (Neo4j)
- Pontos/streak → servidor

---

## 🌐 Grafo de Emoções

**O que mostra:** Visualização interativa das emoções partilhadas
por TODOS os utilizadores que ativaram "Compartilhar anonimamente".

**Como usar:**
1. Vê os nós coloridos — cada cor é uma emoção
2. Arrasta os nós com o rato
3. Clica num nó para ver quantos sonhos têm essa emoção
4. O tamanho do nó = quantidade de sonhos com essa emoção

**Cores:**
- 🟡 Amarelo = Alegria
- 🟣 Roxo = Medo  
- 🔵 Azul = Tristeza
- 🔴 Vermelho = Raiva
- 🟠 Laranja = Surpresa
- ⚪ Cinzento = Neutro

**Quando aparece algo:** Só depois de partilhares pelo menos um sonho
(ou outro utilizador partilhar). O worker Celery processa e cria os nós
no Neo4j.

---

## 🏆 Desafios (Gamificação)

**O que mostra:** Os teus pontos e streak (dias consecutivos).

**Regras:**
- Partilhar um sonho → +10 pontos
- Partilhar em dias consecutivos → aumenta a streak
- Se falhas um dia → streak volta a 1
- Desafio diário: "Escreva e partilhe um sonho hoje"

**Barra de progresso:** Mostra o teu progresso para a meta de 30 dias
de streak.

---

## 🔐 Segurança e Privacidade

| O quê | Onde | Quem vê |
|---|---|---|
| Texto do sonho (original) | Só no teu browser, em memória | Só tu |
| Texto cifrado | IndexedDB (local) | Só tu (com a tua senha) |
| Chave de cifra | Derivada da senha (PBKDF2) | Só tu |
| Emoção detectada | Servidor (se partilhares) | Todos (anónimo) |
| Timestamp | Servidor (se partilhares) | Todos |
| User hash | Servidor (hash SHA-256 do username) | Todos (não revela username) |
| Username + hash | PostgreSQL | Só o servidor |
| Pontos / Streak | PostgreSQL | Só tu (via API) |

**Nunca é enviado para o servidor:**
- O texto do sonho (original ou cifrado)
- A chave de cifra
- A senha (só o hash bcrypt)

---

## 🧠 Análise de Emoções (Transformers.js)

- Modelo: `Xenova/bert-base-multilingual-uncased-sentiment`
- Executa num **Web Worker** (não bloqueia a UI)
- Descarregado na primeira utilização (~20MB)
- Funciona **offline** depois de descarregado
- Fallback: se o navegador não suportar WebAssembly, usa análise
  por palavras-chave (menos precisa mas funcional)

**O modelo é multilingue** — funciona com texto em português, inglês,
espanhol, etc.

---

## 🚀 Para Começar

1. Abre http://localhost:3000
2. Regista-te ou faz login
3. Vai a 📓 **Diário**
4. Escreve um sonho (ex: "sonhei que estava a voar sobre o oceano")
5. Ativa "Compartilhar anonimamente"
6. Clica em "🌙 Salvar e Processar"
7. Vai a 🌐 **Grafo** para veres o nó da emoção
8. Vai a 🏆 **Desafios** para veres os teus pontos
9. Repete nos dias seguintes para aumentar a streak 🔥

---

## 🔧 Troubleshooting

**"A carregar Dream Network…" infinito**
→ F5 ou Ctrl+Shift+R (hard refresh)

**Botão "Entrar" não funciona**
→ Clica com o rato (não carregues Enter)
→ Ou cola no console: `sessionStorage.clear();location.reload()`

**Transformers.js não carrega**
→ Aguarda o download do modelo (~20MB na primeira vez)
→ Se não carregar, usa fallback de palavras-chave

**Grafo vazio**
→ Partilha um sonho primeiro e aguarda o worker Celery processar
→ O processamento pode demorar alguns segundos

---

*Dream Network — Sonhos cifrados localmente. Privacidade em primeiro lugar.*
