/**
 * Dream Network — Lembrete Diário.
 *
 * Pede permissão para notificações e agenda um lembrete
 * diário para não quebrar a streak.
 */

import { createSignal, Show, onMount, onCleanup } from "solid-js";

export default function Reminder() {
  var [permitido, setPermitido] = createSignal(Notification.permission === "granted");
  var [hora, setHora] = createSignal(localStorage.getItem("dream_reminder_hour") || "21:00");
  var [ativo, setAtivo] = createSignal(localStorage.getItem("dream_reminder_active") === "true");
  var [status, setStatus] = createSignal("");
  var intervalo = null;

  var pedirPermissao = function () {
    Notification.requestPermission().then(function (p) {
      setPermitido(p === "granted");
      if (p === "granted") {
        setStatus("✅ Notificações permitidas!");
      } else {
        setStatus("❌ Permissão negada — ative nas definições do browser.");
      }
    });
  };

  var testarNotificacao = function () {
    if (Notification.permission !== "granted") {
      setStatus("❌ Permissão necessária primeiro.");
      return;
    }
    new Notification("🌙 Dream Network", {
      body: "Lembrete configurado! Vou avisá-lo diariamente às " + hora() + ".",
      icon: "/favicon.svg",
    });
    setStatus("🔔 Notificação de teste enviada!");
  };

  var ativar = function () {
    if (Notification.permission !== "granted") {
      pedirPermissao();
      return;
    }
    var nova = !ativo();
    setAtivo(nova);
    localStorage.setItem("dream_reminder_active", nova ? "true" : "false");
    localStorage.setItem("dream_reminder_hour", hora());
    setStatus(nova ? "⏰ Lembrete ativo para as " + hora() : "⏸ Lembrete desativado");
  };

  var alterarHora = function (e) {
    setHora(e.target.value);
    localStorage.setItem("dream_reminder_hour", e.target.value);
    if (ativo()) {
      setStatus("⏰ Hora atualizada para " + e.target.value);
    }
  };

  // Verificar a cada minuto se é hora de notificar
  if (typeof window !== "undefined") {
    intervalo = setInterval(function () {
      if (!ativo() || Notification.permission !== "granted") return;
      var agora = new Date();
      var h = String(agora.getHours()).padStart(2, "0");
      var m = String(agora.getMinutes()).padStart(2, "0");
      var agoraStr = h + ":" + m;
      if (agoraStr === hora()) {
        new Notification("🌙 Dream Network", {
          body: "Hora de escrever o sonho de hoje! Não quebre a streak! 🔥",
          icon: "/favicon.svg",
        });
      }
    }, 60000);
  }

  onCleanup(function () {
    if (intervalo) clearInterval(intervalo);
  });

  return (
    <div class="fade-in max-w-2xl mx-auto p-4">
      <h2 class="text-2xl font-bold mb-4 text-dream-300">⏰ Lembrete Diário</h2>
      <p class="text-sm text-gray-500 mb-6">
        Receba uma notificação todos os dias à hora escolhida para não
        quebrar a streak. 🔥
      </p>

      <div class="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6 space-y-6">
        {/* Permissão */}
        <div>
          <h3 class="text-sm font-semibold text-gray-300 mb-2">1. Permissão de notificações</h3>
          <Show when={Notification.permission === "granted"}>
            <div class="flex items-center gap-2 text-sm text-green-400">
              <span>✅ Notificações permitidas</span>
            </div>
          </Show>
          <Show when={Notification.permission !== "granted"}>
            <button onClick={pedirPermissao}
              class="px-4 py-2 bg-dream-600 hover:bg-dream-700 text-white text-sm rounded-lg transition-colors">
              🔔 Ativar notificações
            </button>
          </Show>
        </div>

        {/* Hora */}
        <div>
          <h3 class="text-sm font-semibold text-gray-300 mb-2">2. Escolher hora</h3>
          <input type="time" value={hora()} onInput={alterarHora}
            class="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 text-lg focus:outline-none focus:ring-2 focus:ring-dream-500" />
        </div>

        {/* Ativar/Desativar */}
        <div>
          <h3 class="text-sm font-semibold text-gray-300 mb-2">3. Ativar lembrete</h3>
          <button onClick={ativar}
            class={"px-6 py-3 rounded-xl text-white font-medium transition-colors " + (ativo()
              ? "bg-green-700 hover:bg-green-600"
              : "bg-dream-600 hover:bg-dream-700")}>
            {ativo() ? "⏰ Lembrete ativo — Desativar" : "🔕 Ativar lembrete"}
          </button>
        </div>

        {/* Testar */}
        <Show when={Notification.permission === "granted"}>
          <div>
            <button onClick={testarNotificacao}
              class="text-sm text-dream-400 hover:text-dream-300 transition-colors">
              🔔 Enviar notificação de teste
            </button>
          </div>
        </Show>

        {/* Status */}
        <Show when={status()}>
          <div class="text-sm text-gray-400 bg-gray-900/50 rounded-lg px-4 py-3">{status()}</div>
        </Show>
      </div>

      <div class="mt-6 text-xs text-gray-600 space-y-1">
        <p>💡 As notificações funcionam mesmo com o site fechado (se o browser estiver aberto).</p>
        <p>⏰ O lembrete é verificado a cada minuto.</p>
        <p>🔒 Configuração guardada localmente no seu browser.</p>
      </div>
    </div>
  );
}
