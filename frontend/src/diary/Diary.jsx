/**
 * Dream Network — Componente do Diário de Sonhos.
 *
 * O utilizador escreve o sonho, o browser processa localmente
 * (extrai emoção via Transformers.js, cifra com Web Crypto),
 * guarda no IndexedDB e, opcionalmente, partilha metadados anónimos.
 */

import { createSignal, Show } from "solid-js";
import { createKey, encrypt, bufferToBase64 } from "./crypto";
import { saveDream, markShared } from "./db";

const EMOTION_ICONS = {
  alegria: "😊",
  medo: "😨",
  tristeza: "😢",
  raiva: "😡",
  surpresa: "😲",
  neutro: "😐",
};

const EMOTION_COLORS = {
  alegria: "text-yellow-400",
  medo: "text-purple-400",
  tristeza: "text-blue-400",
  raiva: "text-red-400",
  surpresa: "text-orange-400",
  neutro: "text-gray-400",
};

export default function Diary(props) {
  const [text, setText] = createSignal("");
  const [saving, setSaving] = createSignal(false);
  const [emotion, setEmotion] = createSignal(null);
  const [confidence, setConfidence] = createSignal(null);
  const [workerStatus, setWorkerStatus] = createSignal(null);
  const [shared, setShared] = createSignal(false);
  const [error, setError] = createSignal(null);
  const [success, setSuccess] = createSignal(null);
  const [workerReady, setWorkerReady] = createSignal(false);
  const [modelSupport, setModelSupport] = createSignal(true);

  let workerRef = null;

  /**
   * Inicializa o Web Worker na montagem do componente.
   */
  const initWorker = () => {
    try {
      // Verifica suporte a WebAssembly (necessário para Transformers.js)
      if (typeof WebAssembly === "undefined" || !WebAssembly.instantiate) {
        setModelSupport(false);
        setWorkerStatus("Navegador não suporta WebAssembly. A análise de emoções está desativada.");
        return;
      }

      workerRef = new Worker(
        new URL("/src/worker/emotionWorker.js", import.meta.url),
        { type: "module" }
      );

      workerRef.onmessage = (event) => {
        const { type, emotion: emo, confidence: conf, message, status } = event.data;

        switch (type) {
          case "loading":
            setWorkerStatus(status);
            break;
          case "result":
            setEmotion(emo);
            setConfidence(conf);
            setWorkerStatus(`Emoção detectada: ${emo} (${Math.round(conf * 100)}%)`);
            setWorkerReady(true);
            break;
          case "error":
            setError(message);
            setWorkerStatus("Falha na análise de emoções.");
            setWorkerReady(true);
            break;
        }
      };

      workerRef.onerror = (err) => {
        console.error("[Worker] Error:", err);
        setWorkerStatus("Worker error — a análise de emoções pode não funcionar.");
        setWorkerReady(true);
      };

      setWorkerReady(true);
    } catch (err) {
      console.error("[Worker] Init error:", err);
      setModelSupport(false);
      setWorkerStatus("Falha ao iniciar worker de análise.");
      setWorkerReady(true);
    }
  };

  /**
   * Handler de "Salvar e Processar".
   */
  const handleSave = async () => {
    setError(null);
    setSuccess(null);

    const dreamText = text().trim();
    if (!dreamText) {
      setError("Escreva o seu sonho antes de salvar.");
      return;
    }

    setSaving(true);
    setWorkerStatus("A processar…");

    try {
      // ── 1. Analisar emoção (se worker disponível) ──
      let detectedEmotion = "neutro";
      let detectedConfidence = 0;

      if (workerRef && modelSupport()) {
        try {
          const result = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error("Timeout na análise de emoções"));
            }, 30000);

            workerRef.onmessage = (event) => {
              if (event.data.type === "result") {
                clearTimeout(timeout);
                resolve(event.data);
              } else if (event.data.type === "error") {
                clearTimeout(timeout);
                reject(new Error(event.data.message));
              }
            };

            workerRef.postMessage({ type: "analyze", text: dreamText });
          });

          detectedEmotion = result.emotion;
          detectedConfidence = result.confidence;
        } catch (err) {
          console.warn("[Diary] Emotion analysis failed, using fallback:", err);
          // Fallback: análise simples baseada em palavras-chave
          detectedEmotion = fallbackEmotion(dreamText);
          detectedConfidence = 0.5;
        }
      }

      // ── 2. Cifrar o texto ──
      setWorkerStatus("A cifrar…");
      const password = props.password?.();
      if (!password) {
        setError("Sessão expirada — faça login novamente.");
        setSaving(false);
        return;
      }

      const { key, salt } = await createKey(password);
      const { iv, ciphertext } = await encrypt(dreamText, key);

      const encryptedBase64 = bufferToBase64(ciphertext);
      const ivBase64 = bufferToBase64(iv);
      const saltBase64 = bufferToBase64(salt);

      // ── 3. Guardar no IndexedDB ──
      const timestamp = new Date().toISOString();
      await saveDream({
        encryptedText: encryptedBase64,
        iv: ivBase64,
        salt: saltBase64,
        emotion: detectedEmotion,
        timestamp,
        shared: shared(),
      });

      setEmotion(detectedEmotion);
      setConfidence(detectedConfidence);

      // ── 4. Partilhar (se ativado) ──
      if (shared()) {
        setWorkerStatus("A partilhar anonimamente…");
        try {
          const response = await fetch("/api/shares", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer " + (sessionStorage.getItem("dream_token") || ""),
            },
            body: JSON.stringify({
              emotion: detectedEmotion,
              timestamp,
            }),
          });

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.detail || `HTTP ${response.status}`);
          }

          const data = await response.json();
          await markShared(null);
          if (typeof props.onUpdate === 'function') {
            props.onUpdate({ points: data.points, streak: data.streak });
          }
          setSuccess(
            `Sonho salvo e partilhado! +${data.points || 10} pontos, streak: ${data.streak || 0} 🔥`
          );
        } catch (err) {
          console.error("[Diary] Share failed:", err);
          setSuccess(`Sonho guardado localmente (falha ao partilhar: ${err.message})`);
        }
      } else {
        setSuccess("Sonho guardado localmente! 💾");
      }

      setText("");
      setShared(false);
    } catch (err) {
      console.error("[Diary] Save error:", err);
      setError(`Erro ao guardar: ${err.message}`);
    } finally {
      setSaving(false);
      setWorkerStatus(null);
    }
  };

  // Inicia o worker na primeira renderização
  if (typeof window !== "undefined" && !workerRef) {
    initWorker();
  }

  return (
    <div class="fade-in max-w-2xl mx-auto p-4">
      <h2 class="text-2xl font-bold mb-4 text-dream-300">📓 Diário de Sonhos</h2>

      {/* Pontuação e Streak */}
      <Show when={props.points() !== undefined}>
        <div class="flex gap-6 mb-6 text-sm bg-gray-800/50 rounded-xl p-4">
          <div class="flex items-center gap-2">
            <span class="text-yellow-400 text-lg">⭐</span>
            <span class="text-gray-300">{props.points()} pontos</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-orange-400 text-lg">🔥</span>
            <span class="text-gray-300">Streak: {props.streak()} dias</span>
          </div>
          <Show when={typeof props.sharedToday === 'function' ? props.sharedToday() : false}>
            <span class="text-green-400 text-sm ml-auto">✓ Partilhado hoje</span>
          </Show>
        </div>
      </Show>

      {/* Campo de texto */}
      <textarea
        value={text()}
        onInput={(e) => setText(e.target.value)}
        placeholder="O que sonhou esta noite?"
        class="w-full min-h-[200px] bg-gray-800 border border-gray-700 rounded-xl p-4 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-dream-500 focus:border-transparent resize-y"
        disabled={saving()}
      />

      {/* Status do Worker */}
      <Show when={workerStatus()}>
        <p class="text-xs text-gray-500 mt-2">{workerStatus()}</p>
      </Show>
      <Show when={!modelSupport()}>
        <p class="text-xs text-yellow-500 mt-2">
          ⚠ WebAssembly não suportado. A análise de emoções foi desativada.
          Pode guardar o sonho normalmente.
        </p>
      </Show>

      {/* Emoção detectada */}
      <Show when={emotion()}>
        <div class="mt-4 flex items-center gap-2">
          <span class="text-2xl">{EMOTION_ICONS[emotion()]}</span>
          <span class={`font-medium ${EMOTION_COLORS[emotion()]}`}>
            {emotion().charAt(0).toUpperCase() + emotion().slice(1)}
          </span>
          <Show when={confidence()}>
            <span class="text-xs text-gray-500">
              ({Math.round(confidence() * 100)}%)
            </span>
          </Show>
        </div>
      </Show>

      {/* Opção de partilha */}
      <label class="flex items-center gap-3 mt-4 cursor-pointer">
        <input
          type="checkbox"
          checked={shared()}
          onChange={(e) => setShared(e.target.checked)}
          class="w-5 h-5 rounded bg-gray-800 border-gray-600 text-dream-500 focus:ring-dream-500"
        />
        <span class="text-sm text-gray-400">
          Compartilhar anonimamente (apenas emoção e timestamp)
        </span>
      </label>

      {/* Mensagens de erro / sucesso */}
      <Show when={error()}>
        <div class="mt-4 text-red-400 bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 text-sm">
          {error()}
        </div>
      </Show>
      <Show when={success()}>
        <div class="mt-4 text-green-400 bg-green-900/30 border border-green-800 rounded-lg px-4 py-3 text-sm">
          {success()}
        </div>
      </Show>

      {/* Botão */}
      <button
        onClick={handleSave}
        disabled={saving()}
        class="mt-6 w-full py-3 px-6 bg-dream-600 hover:bg-dream-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        <Show
          when={!saving()}
          fallback={
            <>
              <span class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
              A processar…
            </>
          }
        >
          🌙 Salvar e Processar
        </Show>
      </button>
    </div>
  );
}

/**
 * Fallback básico de análise de emoções baseado em palavras-chave.
 * Usado quando o Transformers.js não está disponível.
 */
function fallbackEmotion(text) {
  const lower = text.toLowerCase();
  const scores = {
    alegria: 0,
    medo: 0,
    tristeza: 0,
    raiva: 0,
    surpresa: 0,
    neutro: 0,
  };

  const keywords = {
    alegria: [
      "feliz", "alegre", "content", "satisfeito", "maravilhoso",
      "incrível", "ótimo", "bom", "bonito", "amor", "riso",
      "sorriso", "felicidade", "alegria", "divertido",
    ],
    medo: [
      "medo", "assustado", "terror", "horror", "pânico",
      "ansiedade", "preocupado", "ameaça", "perigo", "monstro",
      "escuro", "perseguir", "gritar", "morrer",
    ],
    tristeza: [
      "triste", "choro", "chorar", "lágrima", "saudade",
      "perda", "solidão", "sozinho", "abandonado", "morreu",
      "falecido", "partiu", "falta", "dor", "coração partido",
    ],
    raiva: [
      "raiva", "zangado", "ódio", "irritado", "fúria",
      "briga", "discussão", "gritar", "bater", "violência",
      "injustiça", "revolta", "ódio",
    ],
    surpresa: [
      "surpresa", "inesperado", "repentino", "choque",
      "espanto", "admiração", "uau", "nossa", "impressionante",
      "milagre", "apareceu", "descobrir",
    ],
  };

  for (const [emotion, words] of Object.entries(keywords)) {
    for (const word of words) {
      if (lower.includes(word)) {
        scores[emotion] += 1;
      }
    }
  }

  const maxScore = Math.max(...Object.values(scores));
  if (maxScore === 0) return "neutro";

  return Object.entries(scores).find(([, s]) => s === maxScore)[0];
}
