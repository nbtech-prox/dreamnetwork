import { createSignal, Show } from "solid-js";
import Diary from "./diary/Diary";
import Graph from "./explore/Graph";
import Challenges from "./challenges/Challenges";
import History from "./history/History";
import Stats from "./stats/Stats";
import Badges from "./badges/Badges";

// ── Verifica sessão ANTES de montar o SolidJS ──────────────────────
// (executado no index.jsx, fora do SolidJS)
window.__checkSession = function () {
  var token = sessionStorage.getItem("dream_token");
  if (!token) return null;
  return fetch("/api/auth/me", {
    headers: { Authorization: "Bearer " + token },
  })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (!data) {
        sessionStorage.removeItem("dream_token");
        sessionStorage.removeItem("dream_password");
      }
      return data;
    });
};

// ── App ────────────────────────────────────────────────────────────
export default function App() {
  var initialUser = window.__initialUser || null;
  var initialPoints = initialUser ? initialUser.points || 0 : 0;
  var initialStreak = initialUser ? initialUser.streak || 0 : 0;
  var initialPass = sessionStorage.getItem("dream_password") || "";

  const [user, setUser] = createSignal(initialUser);
  const [password, setPassword] = createSignal(initialPass);
  const [points, setPoints] = createSignal(initialPoints);
  const [streak, setStreak] = createSignal(initialStreak);
  const [page, setPage] = createSignal("home");
  var sharedToday = function () { return false; };

  if (!user()) {
    return null; // index.jsx mostra o login se App retornar null
  }

  const handleLogout = function () {
    fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(function(){});
    sessionStorage.removeItem("dream_token");
    sessionStorage.removeItem("dream_password");
    window.location.reload();
  };

  var NavLink = function (p) {
    return (
      <button onClick={function () { setPage(p.target); }}
        class={"px-3 py-1.5 rounded-lg text-sm transition-colors " + (page() === p.target ? "bg-dream-600/30 text-dream-300" : "text-gray-400 hover:text-gray-200")}>{p.children}</button>
    );
  };

  return (
    <div class="min-h-screen flex flex-col">
      <header class="bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-40">
        <div class="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={function () { setPage("home"); }} class="flex items-center gap-2 text-lg font-bold text-dream-300 hover:text-dream-200">
            <span>🌙</span><span class="hidden sm:inline">Dream Network</span>
          </button>
          <nav class="flex items-center gap-4">
            <NavLink target="diary">📓 Diário</NavLink>
            <NavLink target="history">📋 Histórico</NavLink>
            <NavLink target="stats">📊 Estatísticas</NavLink>
            <NavLink target="graph">🌐 Grafo</NavLink>
            <NavLink target="badges">🏅 Conquistas</NavLink>
            <NavLink target="challenges">🏆 Desafios</NavLink>
          </nav>
          <div class="flex items-center gap-3">
            <span class="hidden sm:inline text-sm text-gray-400">{user()?.username}</span>
            <div class="flex items-center gap-1 text-sm"><span class="text-yellow-400">⭐</span><span class="text-gray-300">{points()}</span></div>
            <button onClick={handleLogout} class="text-xs text-gray-600 hover:text-gray-400">Sair</button>
          </div>
        </div>
      </header>
      <main class="flex-1 max-w-4xl mx-auto w-full py-6">
        <Show when={page() === "home"}><HomePage points={points} streak={streak} onNavigate={setPage} /></Show>
        <Show when={page() === "diary"}><Diary password={password} points={points} streak={streak} sharedToday={sharedToday} onUpdate={function (d) { if (d.points !== undefined) setPoints(d.points); if (d.streak !== undefined) setStreak(d.streak); }} /></Show>
        <Show when={page() === "history"}><History /></Show>
        <Show when={page() === "stats"}><Stats /></Show>
        <Show when={page() === "badges"}><Badges /></Show>
        <Show when={page() === "graph"}><Graph /></Show>
        <Show when={page() === "challenges"}><Challenges onUpdate={function (d) { if (d.points !== undefined) setPoints(d.points); if (d.streak !== undefined) setStreak(d.streak); }} /></Show>
      </main>
      <footer class="border-t border-gray-800 py-4 text-center text-xs text-gray-600">
        <p>Dream Network — Sonhos cifrados localmente.</p>
        <p class="mt-1"><a href="https://github.com/nbtech-prox/dreamnetwork" class="text-dream-500 hover:text-dream-400" target="_blank">GitHub</a> · Feito com 🌙</p>
      </footer>
    </div>
  );
}

function HomePage(props) {
  return (
    <div class="fade-in text-center px-4 py-12">
      <div class="text-7xl mb-6">🌙</div>
      <h1 class="text-4xl font-bold text-dream-300 mb-4">Bem-vindo à Dream Network</h1>
      <p class="text-gray-400 max-w-lg mx-auto mb-8">Registe os seus sonhos, descubra padrões emocionais e explore o grafo anónimo de emoções partilhadas pela comunidade.</p>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
        <button onClick={function () { props.onNavigate("diary"); }} class="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6 hover:bg-gray-800 hover:border-dream-600/50 transition-all group text-left">
          <div class="text-3xl mb-2">📓</div><h3 class="font-semibold text-gray-200 group-hover:text-dream-300">Escrever Sonho</h3><p class="text-sm text-gray-500 mt-1">Registe e processe os seus sonhos</p>
        </button>
        <button onClick={function () { props.onNavigate("graph"); }} class="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6 hover:bg-gray-800 hover:border-dream-600/50 transition-all group text-left">
          <div class="text-3xl mb-2">🌐</div><h3 class="font-semibold text-gray-200 group-hover:text-dream-300">Grafo de Emoções</h3><p class="text-sm text-gray-500 mt-1">Explore as conexões emocionais</p>
        </button>
        <button onClick={function () { props.onNavigate("challenges"); }} class="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6 hover:bg-gray-800 hover:border-dream-600/50 transition-all group text-left">
          <div class="text-3xl mb-2">🏆</div><h3 class="font-semibold text-gray-200 group-hover:text-dream-300">Desafios</h3><p class="text-sm text-gray-500 mt-1">Ganhe pontos e mantenha a streak</p>
        </button>
      </div>
      <Show when={props.points() > 0}>
        <div class="mt-8 bg-gray-800/30 border border-gray-700/50 rounded-2xl p-6 max-w-sm mx-auto">
          <div class="flex items-center justify-center gap-6">
            <div><p class="text-3xl font-bold text-yellow-400">{props.points()}</p><p class="text-xs text-gray-500">pontos</p></div>
            <div class="text-gray-600 text-2xl">·</div>
            <div><p class="text-3xl font-bold text-orange-400">{props.streak()}</p><p class="text-xs text-gray-500">dias streak</p></div>
          </div>
        </div>
      </Show>
    </div>
  );
}
