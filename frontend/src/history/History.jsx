/**
 * Dream Network — Histórico de Sonhos.
 *
 * Lê os sonhos do IndexedDB (cifrados) e permite decifrá-los
 * com a senha guardada em sessão.
 */

import { createSignal, Show, onMount, For } from "solid-js";
import { listDreams } from "../diary/db";
import { deriveKey, decrypt, base64ToBuffer } from "../diary/crypto";

var EMOTION_ICONS = {alegria:"😊",medo:"😨",tristeza:"😢",raiva:"😡",surpresa:"😲",neutro:"😐"};
var EMOTION_COLORS = {alegria:"text-yellow-400",medo:"text-purple-400",tristeza:"text-blue-400",raiva:"text-red-400",surpresa:"text-orange-400",neutro:"text-gray-400"};

export default function History() {
  var [dreams, setDreams] = createSignal([]);
  var [loading, setLoading] = createSignal(true);
  var [decryptedId, setDecryptedId] = createSignal(null);
  var [decryptedText, setDecryptedText] = createSignal("");
  var [decryptError, setDecryptError] = createSignal(null);

  var loadDreams = function () {
    setLoading(true);
    listDreams()
      .then(function (list) { setDreams(list); })
      .catch(function () { setDreams([]); })
      .finally(function () { setLoading(false); });
  };

  onMount(loadDreams);

  var handleDecrypt = async function (dream) {
    setDecryptError(null);
    var password = sessionStorage.getItem("dream_password");
    if (!password) {
      setDecryptError("Senha não disponível — faça login novamente.");
      return;
    }
    try {
      var salt = base64ToBuffer(dream.salt);
      var iv = base64ToBuffer(dream.iv);
      var ciphertext = base64ToBuffer(dream.encryptedText);
      var key = await deriveKey(password, salt);
      var text = await decrypt(ciphertext, key, iv);
      setDecryptedId(dream.id);
      setDecryptedText(text);
    } catch (err) {
      setDecryptError("Erro ao decifrar: " + (err.message || "senha incorreta?"));
    }
  };

  return (
    <div class="fade-in max-w-2xl mx-auto p-4">
      <h2 class="text-2xl font-bold mb-4 text-dream-300">📋 Histórico de Sonhos</h2>

      <Show when={loading()}>
        <div class="flex items-center justify-center h-32">
          <span class="animate-spin inline-block w-6 h-6 border-2 border-dream-500 border-t-transparent rounded-full"></span>
        </div>
      </Show>

      <Show when={!loading() && dreams().length === 0}>
        <div class="text-center py-16 text-gray-500">
          <div class="text-4xl mb-4">📭</div>
          <p>Nenhum sonho guardado ainda.</p>
          <p class="text-sm">Escreva o primeiro sonho no 📓 Diário!</p>
        </div>
      </Show>

      <Show when={!loading() && dreams().length > 0}>
        <div class="mb-4 flex items-center justify-between">
          <p class="text-sm text-gray-500">{dreams().length} sonho(s) guardado(s)</p>
          <button onClick={loadDreams} class="text-xs text-dream-400 hover:text-dream-300">🔄 Atualizar</button>
        </div>

        <div class="space-y-3">
          <For each={dreams()}>
            {function (dream) {
              var date = new Date(dream.timestamp);
              var dateStr = date.toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
              var icon = EMOTION_ICONS[dream.emotion] || "😐";
              var color = EMOTION_COLORS[dream.emotion] || "text-gray-400";
              var isOpen = decryptedId() === dream.id;

              return (
                <div class="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2">
                      <span class="text-lg">{icon}</span>
                      <span class={"text-sm font-medium " + color}>
                        {dream.emotion ? dream.emotion.charAt(0).toUpperCase() + dream.emotion.slice(1) : "---"}
                      </span>
                    </div>
                    <div class="flex items-center gap-3">
                      <span class="text-xs text-gray-600">{dateStr}</span>
                      <Show when={dream.shared}>
                        <span class="text-xs text-green-600" title="Partilhado anonimamente">🌍</span>
                      </Show>
                    </div>
                  </div>

                  <Show when={!isOpen}>
                    <button onClick={function () { handleDecrypt(dream); }}
                      class="text-sm text-dream-400 hover:text-dream-300 transition-colors">
                      🔓 Decifrar sonho
                    </button>
                  </Show>

                  <Show when={isOpen}>
                    <div class="mt-2 p-3 bg-gray-900/50 border border-gray-700 rounded-lg">
                      <p class="text-sm text-gray-200 whitespace-pre-wrap">{decryptedText()}</p>
                      <button onClick={function () { setDecryptedId(null); setDecryptedText(""); }}
                        class="mt-2 text-xs text-gray-500 hover:text-gray-300 transition-colors">
                        ✕ Fechar
                      </button>
                    </div>
                  </Show>

                  <Show when={decryptError() && isOpen}>
                    <div class="mt-2 text-sm text-red-400">{decryptError()}</div>
                  </Show>
                </div>
              );
            }}
          </For>
        </div>
      </Show>
    </div>
  );
}
