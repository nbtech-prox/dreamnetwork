import { createSignal, Show, onMount } from "solid-js";

var EMOTION_COLORS = {alegria:"#facc15",medo:"#a78bfa",tristeza:"#60a5fa",raiva:"#f87171",surpresa:"#fb923c",neutro:"#9ca3af"};
var EMOTION_ICONS = {alegria:"😊",medo:"😨",tristeza:"😢",raiva:"😡",surpresa:"😲",neutro:"😐"};

export default function Graph() {
  var [loading, setLoading] = createSignal(true);
  var [error, setError] = createSignal(null);
  var [nodes, setNodes] = createSignal([]);
  var [selected, setSelected] = createSignal(null);
  var svgRef;

  var loadData = function () {
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
        setNodes(data.nodes || []);
        // Agenda desenho para depois do DOM atualizar
        requestAnimationFrame(function () {
          if (svgRef && data.nodes && data.nodes.length > 0) {
            drawSVG(data.nodes);
          }
        });
      })
      .catch(function (err) { setError(err.message); })
      .finally(function () { setLoading(false); });
  };

  var drawSVG = function (nodesArr) {
    var svg = svgRef;
    if (!svg) return;
    svg.innerHTML = "";

    var W = 600, H = 500;
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", H);

    var cx = W / 2, cy = H / 2;
    var angleStep = (2 * Math.PI) / nodesArr.length;
    var radius = Math.min(W, H) / 2 - 80;

    var circles = [];
    nodesArr.forEach(function (n, i) {
      var angle = i * angleStep - Math.PI / 2;
      var x = cx + radius * Math.cos(angle);
      var y = cy + radius * Math.sin(angle);
      var r = Math.max(Math.sqrt((n.count || 1) * 20), 25);
      circles.push({ x: x, y: y, r: r, data: n });
    });

    // Desenha links (linhas entre emoções do mesmo user)
    // Para cada par de emoções, desenha uma linha se houver co-ocorrência
    // (os links vêm do servidor, mas aqui desenhamos todas as combinações simples)

    // Círculos e labels
    circles.forEach(function (c) {
      var ns = "http://www.w3.org/2000/svg";

      // Círculo
      var circle = document.createElementNS(ns, "circle");
      circle.setAttribute("cx", c.x);
      circle.setAttribute("cy", c.y);
      circle.setAttribute("r", c.r);
      circle.setAttribute("fill", EMOTION_COLORS[c.data.name] || "#9ca3af");
      circle.setAttribute("stroke", "#1f2937");
      circle.setAttribute("stroke-width", "3");
      circle.style.cursor = "pointer";
      circle.addEventListener("click", function () { setSelected(c.data); });
      svg.appendChild(circle);

      // Ícone
      var icon = document.createElementNS(ns, "text");
      icon.setAttribute("x", c.x);
      icon.setAttribute("y", c.y + 6);
      icon.setAttribute("text-anchor", "middle");
      icon.setAttribute("font-size", "22px");
      icon.style.pointerEvents = "none";
      icon.textContent = EMOTION_ICONS[c.data.name] || "❓";
      svg.appendChild(icon);

      // Nome + contagem
      var name = document.createElementNS(ns, "text");
      name.setAttribute("x", c.x);
      name.setAttribute("y", c.y + c.r + 20);
      name.setAttribute("text-anchor", "middle");
      name.setAttribute("font-size", "13px");
      name.setAttribute("fill", "#d1d5db");
      name.style.pointerEvents = "none";
      name.textContent = c.data.name.charAt(0).toUpperCase() + c.data.name.slice(1) + " (" + c.data.count + ")";
      svg.appendChild(name);
    });

    // Tooltip when clicking: show node info
    svg.addEventListener("click", function (e) {
      if (e.target.tagName !== "circle") {
        setSelected(null);
      }
    });
  };

  onMount(loadData);

  return (
    <div class="fade-in max-w-3xl mx-auto p-4">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-2xl font-bold text-dream-300">🌐 Grafo de Emoções</h2>
        <button onClick={loadData} class="px-4 py-2 bg-dream-600 hover:bg-dream-700 text-white text-sm rounded-lg transition-colors">🔄 Recarregar</button>
      </div>
      <p class="text-sm text-gray-500 mb-6">
        Visualização anónima das emoções partilhadas pela comunidade.
        Clique num nó para ver detalhes.
      </p>

      <Show when={loading()}>
        <div class="flex items-center justify-center h-64">
          <span class="animate-spin inline-block w-6 h-6 border-2 border-dream-500 border-t-transparent rounded-full"></span>
        </div>
      </Show>

      <Show when={error()}>
        <div class="text-red-400 bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 text-sm mb-4">⚠ {error()}</div>
      </Show>

      <Show when={!loading() && nodes().length === 0}>
        <div class="text-center py-16 text-gray-500">
          <div class="text-4xl mb-4">🌌</div>
          <p>Ainda não há dados suficientes para o grafo.</p>
          <p class="text-sm">Partilhe sonhos para ver o grafo ganhar forma!</p>
        </div>
      </Show>

      <Show when={!loading() && nodes().length > 0}>
        <div class="bg-gray-800/30 border border-gray-700/50 rounded-2xl p-4 overflow-hidden">
          <svg ref={svgRef} width="100%" height="500"></svg>
        </div>

        <Show when={selected()}>
          <div class="mt-4 bg-gray-800/50 border border-gray-700/50 rounded-xl px-6 py-4">
            <div class="flex items-center gap-3">
              <span class="text-2xl">{EMOTION_ICONS[selected().name]}</span>
              <div>
                <p class="font-medium text-gray-200">{selected().name.charAt(0).toUpperCase() + selected().name.slice(1)}</p>
                <p class="text-sm text-gray-400">{selected().count} sonho(s) partilhado(s)</p>
              </div>
              <button onClick={function () { setSelected(null); }} class="ml-auto text-gray-500 hover:text-gray-300">✕</button>
            </div>
          </div>
        </Show>
      </Show>
    </div>
  );
}
