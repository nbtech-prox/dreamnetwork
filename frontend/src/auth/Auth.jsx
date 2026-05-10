/**
 * Dream Network — Componente de Autenticação.
 *
 * Registo e Login com nome de utilizador + senha.
 * A senha também é usada localmente para derivar a chave de cifra.
 */

import { createSignal, Show, onMount } from "solid-js";

const API_BASE = "/api/auth";

export default function Auth(props) {
  const [isLogin, setIsLogin] = createSignal(true);
  const [username, setUsername] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [confirmPassword, setConfirmPassword] = createSignal("");
  const [error, setError] = createSignal(null);
  const [loading, setLoading] = createSignal(false);
  let btnRef;

  onMount(() => {
    if (btnRef) {
      btnRef.addEventListener("click", handleSubmit);
    }
  });

  const handleSubmit = async () => {
    setError(null);

    const user = username().trim();
    const pass = password();

    if (!user || !pass) {
      setError("Preencha todos os campos.");
      return;
    }

    if (!isLogin() && pass !== confirmPassword()) {
      setError("As senhas não coincidem.");
      return;
    }

    if (pass.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);

    try {
      const endpoint = isLogin() ? "/login" : "/register";
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: user, password: pass }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || `Erro ${response.status}`);
      }

      // Guarda token em sessionStorage
      if (data.token) {
        sessionStorage.setItem("dream_token", data.token);
      }
      // Guarda password para derivação de chave de cifra
      sessionStorage.setItem("dream_password", pass);

      // Notifica App com o token (em vez de reload)
      if (props.onSuccess) {
        props.onSuccess(data.token, pass);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="min-h-screen flex items-center justify-center p-4">
      <div class="w-full max-w-md fade-in">
        {/* Logo / Título */}
        <div class="text-center mb-8">
          <div class="text-6xl mb-4">🌙</div>
          <h1 class="text-3xl font-bold text-dream-300">Dream Network</h1>
          <p class="text-gray-500 mt-2">
            {isLogin()
              ? "Bem-vindo de volta, sonhador."
              : "Junte-se à rede de sonhos."}
          </p>
        </div>

        {/* Formulário */}
        <div
          class="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-8 space-y-5"
        >
          <div>
            <label class="block text-sm text-gray-400 mb-1">Nome de utilizador</label>
            <input
              type="text"
              value={username()}
              onInput={(e) => setUsername(e.target.value)}
              placeholder="sonhador_anonimo"
              class="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-dream-500 focus:border-transparent"
              disabled={loading()}
              autocomplete="username"
            />
          </div>

          <div>
            <label class="block text-sm text-gray-400 mb-1">Senha</label>
            <input
              type="password"
              value={password()}
              onInput={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              class="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-dream-500 focus:border-transparent"
              disabled={loading()}
              autocomplete={isLogin() ? "current-password" : "new-password"}
            />
          </div>

          <Show when={!isLogin()}>
            <div>
              <label class="block text-sm text-gray-400 mb-1">Confirmar senha</label>
              <input
                type="password"
                value={confirmPassword()}
                onInput={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••"
                class="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-dream-500 focus:border-transparent"
                disabled={loading()}
                autocomplete="new-password"
              />
            </div>
          </Show>

          <Show when={error()}>
            <div class="text-red-400 bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 text-sm">
              {error()}
            </div>
          </Show>

          <button
            ref={btnRef}
            type="button"
            disabled={loading()}
            class="w-full py-3 px-6 bg-dream-600 hover:bg-dream-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Show
              when={!loading()}
              fallback={
                <>
                  <span class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                  A processar…
                </>
              }
            >
              {isLogin() ? "✨ Entrar" : "🌙 Registrar"}
            </Show>
          </button>

          <p class="text-center text-sm text-gray-500">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin());
                setError(null);
              }}
              class="text-dream-400 hover:text-dream-300 transition-colors"
            >
              {isLogin()
                ? "Ainda não tem conta? Registre-se"
                : "Já tem conta? Faça login"}
            </button>
          </p>
        </div>

        {/* Rodapé informativo */}
        <div class="text-center mt-6 text-xs text-gray-600 space-y-1">
          <p>🔒 O texto dos seus sonhos é cifrado localmente antes de sair do seu dispositivo.</p>
          <p>🌍 Apenas emoções e metadados anónimos são partilhados (quando autorizado).</p>
        </div>
      </div>
    </div>
  );
}
