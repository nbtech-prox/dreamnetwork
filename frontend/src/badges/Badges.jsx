/**
 * Dream Network — Badges / Conquistas.
 *
 * Calcula conquistas com base nos dados do utilizador
 * (streak, pontos, emoções partilhadas).
 */

import { createSignal, Show, onMount, For } from "solid-js";

var BADGES = [
  { id:"first-dream", icon:"🌟", name:"Primeiro Sonho", desc:"Partilhe o seu primeiro sonho", check:function(d){return d.sharedCount >= 1;} },
  { id:"streak-3", icon:"🔥", name:"3 Dias Seguidos", desc:"Mantenha 3 dias de streak", check:function(d){return d.streak >= 3;} },
  { id:"streak-7", icon:"🔥", name:"Semana de Fogo", desc:"Mantenha 7 dias de streak", check:function(d){return d.streak >= 7;} },
  { id:"streak-30", icon:"💎", name:"Mestre da Disciplina", desc:"Mantenha 30 dias de streak", check:function(d){return d.streak >= 30;} },
  { id:"dreams-5", icon:"📖", name:"Aprendiz de Histórias", desc:"Partilhe 5 sonhos", check:function(d){return d.sharedCount >= 5;} },
  { id:"dreams-10", icon:"📖", name:"Contador de Histórias", desc:"Partilhe 10 sonhos", check:function(d){return d.sharedCount >= 10;} },
  { id:"dreams-50", icon:"📚", name:"Biblioteca de Sonhos", desc:"Partilhe 50 sonhos", check:function(d){return d.sharedCount >= 50;} },
  { id:"emotions-all", icon:"🎭", name:"Mestre das Emoções", desc:"Detete todas as 6 emoções", check:function(d){return d.emotionSet && d.emotionSet.size >= 6;} },
  { id:"emotions-3", icon:"🎨", name:"Explorador Emocional", desc:"Detete 3 emoções diferentes", check:function(d){return d.emotionSet && d.emotionSet.size >= 3;} },
  { id:"points-100", icon:"⭐", name:"Centenário", desc:"Acumule 100 pontos", check:function(d){return d.points >= 100;} },
];

export default function Badges() {
  var [badges, setBadges] = createSignal([]);
  var [loading, setLoading] = createSignal(true);
  var [stats, setStats] = createSignal(null);

  var loadBadges = function () {
    setLoading(true);
    var tok = sessionStorage.getItem("dream_token");
    var hdrs = {};
    if (tok) hdrs.Authorization = "Bearer " + tok;

    // Buscar dados de challenges + shares em paralelo
    Promise.all([
      fetch("/api/challenges", { headers: hdrs }).then(function(r){return r.json();}),
      fetch("/api/shares", { headers: hdrs }).then(function(r){return r.json();}),
    ])
      .then(function (results) {
        var chal = results[0];
        var shares = results[1] || [];

        var earned = [];
        var emotionSet = new Set();

        shares.forEach(function (s) {
          if (s.emotion) emotionSet.add(s.emotion);
        });

        var data = {
          points: chal.points || 0,
          streak: chal.streak || 0,
          sharedCount: shares.length || (chal.points > 0 ? Math.ceil(chal.points / 10) : 0),
          emotionSet: emotionSet,
        };

        setStats(data);

        // Avaliar cada badge
        BADGES.forEach(function (b) {
          earned.push({
            id: b.id,
            icon: b.icon,
            name: b.name,
            desc: b.desc,
            earned: b.check(data),
          });
        });

        setBadges(earned);
      })
      .catch(function () { setBadges([]); })
      .finally(function () { setLoading(false); });
  };

  onMount(loadBadges);

  var earnedCount = function () {
    return badges().filter(function (b) { return b.earned; }).length;
  };

  var totalCount = BADGES.length;

  return (
    <div class="fade-in max-w-2xl mx-auto p-4">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-2xl font-bold text-dream-300">🏅 Conquistas</h2>
        <button onClick={loadBadges} class="px-4 py-2 bg-dream-600 hover:bg-dream-700 text-white text-sm rounded-lg transition-colors">🔄 Recarregar</button>
      </div>

      <Show when={loading()}>
        <div class="flex items-center justify-center h-32">
          <span class="animate-spin inline-block w-6 h-6 border-2 border-dream-500 border-t-transparent rounded-full"></span>
        </div>
      </Show>

      <Show when={!loading() && stats()}>
        <div class="bg-gray-800/30 border border-gray-700/50 rounded-2xl p-6 mb-6 text-center">
          <div class="text-3xl font-bold text-white">{earnedCount()}/{totalCount}</div>
          <p class="text-sm text-gray-500">conquistas desbloqueadas</p>
          <div class="mt-3 flex items-center justify-center gap-6 text-sm text-gray-400">
            <span>⭐ {stats().points} pontos</span>
            <span>🔥 {stats().streak} dias streak</span>
            <span>📖 {stats().sharedCount} sonhos</span>
            <span>🎭 {stats().emotionSet.size}/6 emoções</span>
          </div>
        </div>
      </Show>

      <Show when={!loading()}>
        <div class="space-y-2">
          <For each={BADGES}>
            {function (badge) {
              var earned = badges().find(function (b) { return b.id === badge.id; });
              var isEarned = earned ? earned.earned : false;

              return (
                <div class={"rounded-xl p-4 border transition-all " + (isEarned
                  ? "bg-gray-800/50 border-dream-600/50"
                  : "bg-gray-800/20 border-gray-700/30 opacity-50")}>
                  <div class="flex items-center gap-3">
                    <span class={"text-2xl " + (isEarned ? "" : "grayscale")}>{badge.icon}</span>
                    <div class="flex-1">
                      <p class={"font-medium " + (isEarned ? "text-gray-200" : "text-gray-500")}>{badge.name}</p>
                      <p class={"text-sm " + (isEarned ? "text-gray-400" : "text-gray-600")}>{badge.desc}</p>
                    </div>
                    <Show when={isEarned}>
                      <span class="text-green-400 text-lg">✅</span>
                    </Show>
                    <Show when={!isEarned}>
                      <span class="text-gray-600 text-lg">🔒</span>
                    </Show>
                  </div>
                </div>
              );
            }}
          </For>
        </div>
      </Show>
    </div>
  );
}
