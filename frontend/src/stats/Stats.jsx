/**
 * Dream Network — Estatísticas de Emoções.
 *
 * Gráfico de barras horizontal com a distribuição das emoções
 * partilhadas por todos os utilizadores.
 */

import { createSignal, Show, onMount, For } from "solid-js";

var EMOTION_LABELS = {alegria:"Alegria",medo:"Medo",tristeza:"Tristeza",raiva:"Raiva",surpresa:"Surpresa",neutro:"Neutro"};
var EMOTION_COLORS = {alegria:"#facc15",medo:"#a78bfa",tristeza:"#60a5fa",raiva:"#f87171",surpresa:"#fb923c",neutro:"#9ca3af"};
var EMOTION_ICONS = {alegria:"😊",medo:"😨",tristeza:"😢",raiva:"😡",surpresa:"😲",neutro:"😐"};

export default function Stats() {
  var [emotions, setEmotions] = createSignal([]);
  var [total, setTotal] = createSignal(0);
  var [loading, setLoading] = createSignal(true);
  var [error, setError] = createSignal(null);

  var loadStats = function () {
    setLoading(true);
    setError(null);
    var tok = sessionStorage.getItem("dream_token");
    var hdrs = {};
    if (tok) hdrs.Authorization = "Bearer " + tok;

    fetch("/api/graph/emotions", { headers: hdrs })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        var nodes = data.nodes || [];
        // Ordenar por contagem descendente
        nodes.sort(function (a, b) { return (b.count || 0) - (a.count || 0); });
        var soma = nodes.reduce(function (acc, n) { return acc + (n.count || 0); }, 0);
        setEmotions(nodes);
        setTotal(soma);
      })
      .catch(function (err) { setError(err.message); })
      .finally(function () { setLoading(false); });
  };

  onMount(loadStats);

  return (
    <div class="fade-in max-w-2xl mx-auto p-4">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-2xl font-bold text-dream-300">📊 Estatísticas de Emoções</h2>
        <button onClick={loadStats} class="px-4 py-2 bg-dream-600 hover:bg-dream-700 text-white text-sm rounded-lg transition-colors">🔄 Recarregar</button>
      </div>
      <p class="text-sm text-gray-500 mb-6">
        Distribuição das emoções detetadas nos sonhos partilhados anonimamente.
      </p>

      <Show when={loading()}>
        <div class="flex items-center justify-center h-32">
          <span class="animate-spin inline-block w-6 h-6 border-2 border-dream-500 border-t-transparent rounded-full"></span>
        </div>
      </Show>

      <Show when={error()}>
        <div class="text-red-400 bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 text-sm mb-4">⚠ {error()}</div>
      </Show>

      <Show when={!loading() && emotions().length === 0}>
        <div class="text-center py-16 text-gray-500">
          <div class="text-4xl mb-4">📭</div>
          <p>Nenhum sonho partilhado ainda.</p>
          <p class="text-sm">Partilhe sonhos no 📓 Diário para ver estatísticas!</p>
        </div>
      </Show>

      <Show when={!loading() && emotions().length > 0}>
        <div class="bg-gray-800/30 border border-gray-700/50 rounded-2xl p-6 mb-6">
          <div class="text-center mb-6">
            <span class="text-3xl font-bold text-white">{total()}</span>
            <span class="text-gray-500 ml-2">sonhos partilhados</span>
          </div>

          {/* Barras */}
          <div class="space-y-4">
            <For each={emotions()}>
              {function (em) {
                var pct = total() > 0 ? Math.round((em.count / total()) * 100) : 0;
                var color = EMOTION_COLORS[em.name] || "#9ca3af";
                var icon = EMOTION_ICONS[em.name] || "❓";
                var label = EMOTION_LABELS[em.name] || em.name;

                return (
                  <div>
                    <div class="flex items-center justify-between mb-1">
                      <div class="flex items-center gap-2">
                        <span>{icon}</span>
                        <span class="text-sm text-gray-200">{label}</span>
                      </div>
                      <div class="text-sm text-gray-400">
                        <span class="font-medium text-white">{em.count}</span>
                        <span class="ml-1">({pct}%)</span>
                      </div>
                    </div>
                    <div class="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
                      <div style={{
                        width: pct + "%",
                        background: color,
                      }} class="h-full rounded-full transition-all duration-500"></div>
                    </div>
                  </div>
                );
              }}
            </For>
          </div>
        </div>

        {/* Legenda */}
        <div class="bg-gray-800/30 border border-gray-700/50 rounded-2xl p-6">
          <h3 class="text-sm font-semibold text-gray-300 mb-3">Distribuição completa</h3>
          <div class="flex flex-wrap gap-3">
            <For each={emotions()}>
              {function (em) {
                var pct = total() > 0 ? Math.round((em.count / total()) * 100) : 0;
                return (
                  <div class="flex items-center gap-2 bg-gray-700/40 rounded-lg px-3 py-2">
                    <span style={{ color: EMOTION_COLORS[em.name] }} class="text-lg">{EMOTION_ICONS[em.name]}</span>
                    <span class="text-sm text-gray-300">{EMOTION_LABELS[em.name] || em.name}</span>
                    <span class="text-sm text-gray-500">{pct}%</span>
                  </div>
                );
              }}
            </For>
          </div>
        </div>
      </Show>
    </div>
  );
}
