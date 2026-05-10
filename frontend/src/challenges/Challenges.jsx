/**
 * Dream Network — Componente de Desafios Diários (Gamificação).
 *
 * Exibe os desafios disponíveis, progresso do utilizador,
 * e permite reivindicar recompensas.
 */

import { createSignal, createResource, Show } from "solid-js";

const API_BASE = "/api/challenges";

export default function Challenges(props) {
  // Usamos createResource para dados reactivos
  const [refetchTrigger, setRefetchTrigger] = createSignal(0);

  const [challengesData, { mutate, refetch }] = createResource(
    refetchTrigger,
    async () => {
      var tok = sessionStorage.getItem("dream_token");
      var hdrs = {};
      if (tok) hdrs["Authorization"] = "Bearer " + tok;
      const response = await fetch(API_BASE, { headers: hdrs });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    }
  );

  const [claiming, setClaiming] = createSignal(false);
  const [message, setMessage] = createSignal(null);

  const handleClaimDaily = async () => {
    setClaiming(true);
    setMessage(null);

    try {
      var claimTok = sessionStorage.getItem("dream_token");
      var claimHdrs = {};
      if (claimTok) claimHdrs["Authorization"] = "Bearer " + claimTok;
      const response = await fetch(`${API_BASE}/claim-daily`, {
        method: "POST",
        headers: claimHdrs,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || `HTTP ${response.status}`);
      }

      setMessage({ type: "success", text: data.message });

      // Atualiza pontos/streak no pai e localmente
      if (props.onUpdate) {
        props.onUpdate({ points: data.points, streak: data.streak });
      }

      // Recarrega os dados
      refetch();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div class="fade-in max-w-2xl mx-auto p-4">
      <h2 class="text-2xl font-bold mb-4 text-dream-300">🏆 Desafios</h2>

      {/* Loading */}
      <Show when={challengesData.loading}>
        <div class="flex items-center justify-center h-24">
          <span class="animate-spin inline-block w-5 h-5 border-2 border-dream-500 border-t-transparent rounded-full"></span>
        </div>
      </Show>

      {/* Error */}
      <Show when={challengesData.error}>
        <div class="text-red-400 bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 text-sm mb-4">
          ⚠ Erro ao carregar desafios: {challengesData.error.message}
        </div>
      </Show>

      {/* Conteúdo */}
      <Show when={challengesData()}>
        <div class="space-y-4">
          {/* Card de Pontos e Streak */}
          <div class="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-3">
                <span class="text-3xl">⭐</span>
                <div>
                  <p class="text-2xl font-bold text-yellow-400">
                    {challengesData().points}
                  </p>
                  <p class="text-sm text-gray-500">Pontos totais</p>
                </div>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-3xl">🔥</span>
                <div>
                  <p class="text-2xl font-bold text-orange-400">
                    {challengesData().streak}
                  </p>
                  <p class="text-sm text-gray-500">Dias consecutivos</p>
                </div>
              </div>
            </div>

            {/* Barra de progresso visual da streak */}
            <div class="w-full bg-gray-700 rounded-full h-2 mt-2">
              <div
                class="bg-gradient-to-r from-orange-500 to-yellow-500 h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min((challengesData().streak / 30) * 100, 100)}%`,
                }}
              ></div>
            </div>
            <p class="text-xs text-gray-600 mt-1">
              {challengesData().streak >= 30
                ? "🔥 Lenda! 30+ dias de streak!"
                : `${30 - challengesData().streak} dias para a marca de 30 dias`}
            </p>
          </div>

          {/* Desafio Diário */}
          <div class="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
            <div class="flex items-start justify-between">
              <div>
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-xl">📅</span>
                  <h3 class="font-semibold text-gray-200">Desafio Diário</h3>
                </div>
                <p class="text-gray-400 text-sm">
                  {challengesData().daily_challenge?.title}
                </p>
                <p class="text-xs text-gray-600 mt-1">
                  Recompensa: +{challengesData().daily_challenge?.points} pontos
                </p>
              </div>
              <div class="text-right">
                <Show
                  when={challengesData().daily_challenge?.completed}
                  fallback={
                    <button
                      onClick={handleClaimDaily}
                      disabled={claiming()}
                      class="px-5 py-2 bg-dream-600 hover:bg-dream-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <Show
                        when={!claiming()}
                        fallback={
                          <span class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                        }
                      >
                        Reivindicar
                      </Show>
                    </button>
                  }
                >
                  <span class="bg-green-900/50 text-green-400 px-3 py-1 rounded-lg text-sm">
                    ✓ Completo
                  </span>
                </Show>
              </div>
            </div>
          </div>

          {/* Mensagens */}
          <Show when={message()}>
            <div
              class={`rounded-lg px-4 py-3 text-sm ${
                message().type === "success"
                  ? "bg-green-900/30 border border-green-800 text-green-400"
                  : "bg-red-900/30 border border-red-800 text-red-400"
              }`}
            >
              {message().text}
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
}
