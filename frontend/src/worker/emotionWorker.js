/**
 * Dream Network — Web Worker para análise de emoções.
 *
 * Carrega o modelo Transformers.js (Xenova/bert-base-multilingual-uncased)
 * num Web Worker isolado para não bloquear a UI.
 *
 * Mensagens recebidas:
 *   { type: "analyze", text: string }
 *
 * Mensagens enviadas:
 *   { type: "result", emotion: string, confidence: number }
 *   { type: "error", message: string }
 *   { type: "loading", status: string }
 */

import { pipeline, env } from "@huggingface/transformers";

// Configura o ambiente para o worker
env.allowLocalModels = false;
env.useBrowserCache = true;

// Mapeamento de labels do modelo para as 6 emoções da app
const EMOTION_MAP = {
  alegria: "alegria",
  joy: "alegria",
  happy: "alegria",
  medo: "medo",
  fear: "medo",
  tristeza: "tristeza",
  sadness: "tristeza",
  sad: "tristeza",
  raiva: "raiva",
  anger: "raiva",
  angry: "raiva",
  surpresa: "surpresa",
  surprise: "surpresa",
  neutro: "neutro",
  neutral: "neutro",
};

// Labels que o modelo pode produzir (mapeamos para as nossas)
const LABEL_MAP = {
  LABEL_0: "neutro",
  LABEL_1: "alegria",
  LABEL_2: "medo",
  LABEL_3: "tristeza",
  LABEL_4: "raiva",
  LABEL_5: "surpresa",
};

let classifier = null;

/**
 * Inicializa o pipeline de classificação de sentimentos.
 * O download do modelo ocorre na primeira execução.
 */
async function loadModel() {
  if (classifier) return classifier;

  self.postMessage({ type: "loading", status: "A carregar modelo de emoções…" });

  try {
    // Usamos um modelo de sentimentos para classificação de 6 emoções
    classifier = await pipeline(
      "text-classification",
      "Xenova/bert-base-multilingual-uncased-sentiment",
      {
        quantized: true,
        progress_callback: (progress) => {
          if (progress.status === "progress") {
            const pct = Math.round(
              (progress.loaded / progress.total) * 100
            );
            self.postMessage({ type: "loading", status: `A descarregar modelo… ${pct}%` });
          }
        },
      }
    );
    self.postMessage({ type: "loading", status: "Modelo carregado!" });
    return classifier;
  } catch (err) {
    self.postMessage({
      type: "error",
      message: `Falha ao carregar modelo: ${err.message}`,
    });
    throw err;
  }
}

/**
 * Mapeia o resultado do modelo para uma das 6 emoções da app.
 */
function mapEmotion(label, score) {
  // Tenta mapear pelo label primeiro
  const mapped = LABEL_MAP[label] || EMOTION_MAP[label?.toLowerCase()];
  if (mapped) return { emotion: mapped, confidence: score };

  // Fallback: procura no texto da label
  if (label) {
    const lower = label.toLowerCase();
    for (const [key, value] of Object.entries(EMOTION_MAP)) {
      if (lower.includes(key)) return { emotion: value, confidence: score };
    }
  }

  return { emotion: "neutro", confidence: score };
}

/**
 * Processa uma mensagem do worker principal.
 */
self.addEventListener("message", async (event) => {
  const { type, text } = event.data;

  if (type !== "analyze") return;

  try {
    const pipe = await loadModel();
    const result = await pipe(text, {
      topk: 3,
    });

    // Pega o resultado com maior confiança
    const best = result[0];
    const { emotion, confidence } = mapEmotion(best.label, best.score);

    self.postMessage({
      type: "result",
      emotion,
      confidence: Math.round(confidence * 100) / 100,
    });
  } catch (err) {
    self.postMessage({
      type: "error",
      message: `Erro na análise: ${err.message}`,
    });
  }
});
