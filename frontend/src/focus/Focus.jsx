/**
 * Dream Network — Modo Foco.
 *
 * Ecrã inteiro só com o editor de sonhos, sem distrações.
 * Apenas o campo de texto + botão salvar + toggle partilha.
 */

import { createSignal, Show } from "solid-js";
import { createKey, encrypt, bufferToBase64 } from "../diary/crypto";
import { saveDream } from "../diary/db";

var EMOTION_ICONS = {alegria:"😊",medo:"😨",tristeza:"😢",raiva:"😡",surpresa:"😲",neutro:"😐"};

var EMOTION_LABELS = {alegria:"Alegria",medo:"Medo",tristeza:"Tristeza",raiva:"Raiva",surpresa:"Surpresa",neutro:"Neutro"};

function fallbackEmotion(text) {
  var lower = text.toLowerCase();
  var scores = {alegria:0,medo:0,tristeza:0,raiva:0,surpresa:0,neutro:0};
  var kw = {alegria:["feliz","alegre","amor","riso","bonito","alegria","divertido"],medo:["medo","assustado","terror","pânico","monstro","perigo"],tristeza:["triste","choro","saudade","perda","solidão","sozinho"],raiva:["raiva","ódio","zangado","briga","violência","furioso"],surpresa:["surpresa","inesperado","choque","milagre","uau"]};
  for (var e in kw) { kw[e].forEach(function(w){if(lower.includes(w))scores[e]++;}); }
  var max = Math.max(...Object.values(scores));
  return max === 0 ? "neutro" : Object.entries(scores).find(function(x){return x[1]===max;})[0];
}

export default function Focus(props) {
  var [text, setText] = createSignal("");
  var [saving, setSaving] = createSignal(false);
  var [shared, setShared] = createSignal(false);
  var [emotion, setEmotion] = createSignal(null);
  var [msg, setMsg] = createSignal(null);
  var [msgType, setMsgType] = createSignal("success");

  var handleSave = async function () {
    var dreamText = text().trim();
    if (!dreamText) { setMsgType("error"); setMsg("Escreva o seu sonho!"); return; }
    setSaving(true); setMsg(null);

    try {
      // Detetar emoção (fallback, sem worker)
      var detected = fallbackEmotion(dreamText);
      setEmotion(detected);

      // Cifrar
      var password = sessionStorage.getItem("dream_password");
      if (!password) { setMsgType("error"); setMsg("Faça login novamente."); setSaving(false); return; }

      var keyData = await createKey(password);
      var encrypted = await encrypt(dreamText, keyData.key);
      var ts = new Date().toISOString();

      await saveDream({
        encryptedText: bufferToBase64(encrypted.ciphertext),
        iv: bufferToBase64(encrypted.iv),
        salt: bufferToBase64(keyData.salt),
        emotion: detected, timestamp: ts, shared: shared(),
      });

      // Partilhar se ativo
      if (shared()) {
        var tok = sessionStorage.getItem("dream_token");
        var hdrs = { "Content-Type": "application/json" };
        if (tok) hdrs.Authorization = "Bearer " + tok;

        var resp = await fetch("/api/shares", {
          method: "POST", headers: hdrs,
          body: JSON.stringify({ emotion: detected, timestamp: ts }),
        });

        if (resp.ok) {
          var data = await resp.json();
          setMsgType("success");
          setMsg("🌙 Sonho salvo e partilhado! +" + (data.points || 10) + " pts");
        } else {
          setMsgType("success");
          setMsg("💾 Sonho guardado (falha ao partilhar)");
        }
      } else {
        setMsgType("success");
        setMsg("💾 Sonho guardado!");
      }

      setText("");
      setShared(false);
    } catch (err) {
      setMsgType("error");
      setMsg("Erro: " + (err.message || "desconhecido"));
    } finally { setSaving(false); }
  };

  var handleKeyDown = function (e) {
    // Ctrl+Enter ou Cmd+Enter para salvar
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
    // Escape para sair do modo foco
    if (e.key === "Escape") {
      e.preventDefault();
      if (typeof props.onExit === "function") props.onExit();
    }
  };

  return (
    <div class="fixed inset-0 z-50 bg-gray-950 flex flex-col"
      onKeyDown={handleKeyDown} tabindex="0">
      {/* Barra minimalista */}
      <div class="flex items-center justify-between px-6 py-3 border-b border-gray-800">
        <div class="flex items-center gap-3">
          <span class="text-lg">🌙</span>
          <span class="text-sm text-gray-400">Modo Foco</span>
          <Show when={emotion()}>
            <span class="text-sm text-gray-500 ml-2">
              {EMOTION_ICONS[emotion()]} {EMOTION_LABELS[emotion()]}
            </span>
          </Show>
        </div>
        <div class="flex items-center gap-3">
          <label class="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
            <input type="checkbox" checked={shared()}
              onChange={function(e){setShared(e.target.checked);}}
              class="w-4 h-4 rounded bg-gray-800 border-gray-600 text-dream-500" />
            Anónimo
          </label>
          <span class="text-xs text-gray-600">Ctrl+Enter</span>
          <button onClick={function(){if(typeof props.onExit==="function")props.onExit();}}
            class="text-xs text-gray-500 hover:text-gray-300 transition-colors">
            ✕ Sair (Esc)
          </button>
        </div>
      </div>

      {/* Editor a ecrã inteiro */}
      <div class="flex-1 flex flex-col p-6">
        <textarea value={text()} onInput={function(e){setText(e.target.value);}}
          placeholder="O que sonhou esta noite?"
          class="flex-1 w-full bg-transparent border-none text-gray-100 text-xl leading-relaxed placeholder-gray-700 focus:outline-none resize-none"
          style="min-height: 300px;" />

        {/* Mensagem */}
        <Show when={msg()}>
          <div class={"text-sm mb-4 px-4 py-3 rounded-lg " + (msgType() === "error"
            ? "bg-red-900/30 text-red-400" : "bg-green-900/30 text-green-400")}>
            {msg()}
          </div>
        </Show>

        {/* Botão salvar */}
        <div class="flex justify-center pt-4 border-t border-gray-800">
          <button onClick={handleSave} disabled={saving()}
            class="w-full max-w-md py-4 px-8 bg-dream-600 hover:bg-dream-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-xl text-lg transition-colors flex items-center justify-center gap-2">
            <Show when={!saving()} fallback={
              <><span class="animate-spin inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full"></span>A processar…</>
            }>
              🌙 Salvar Sonho
            </Show>
          </button>
        </div>
      </div>
    </div>
  );
}
