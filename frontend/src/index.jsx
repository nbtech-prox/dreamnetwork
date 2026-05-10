import { render } from "solid-js/web";
import App from "./App";
import "./index.css";

var root = document.getElementById("root");

// ── Estado do formulário ──────────────────────────────────────────
var isRegister = false;

// ── Mostra página de login/registo ────────────────────────────────
function showLogin() {
  var title = isRegister ? "Junte-se à rede de sonhos." : "Bem-vindo de volta, sonhador.";
  var btnText = isRegister ? "🌙 Registrar" : "✨ Entrar";
  var toggleText = isRegister ? "Já tem conta? Faça login" : "Ainda não tem conta? Registre-se";
  var confirmField = isRegister
    ? '<div style="margin-bottom:1.25rem">' +
      '<label style="display:block;font-size:0.875rem;color:#9ca3af;margin-bottom:0.25rem">Confirmar senha</label>' +
      '<input id="login-confirm" type="password" placeholder="••••••" style="width:100%;background:#111827;border:1px solid #374151;border-radius:0.75rem;padding:0.75rem 1rem;color:#f3f4f6;outline:none" />' +
      "</div>"
    : "";

  root.innerHTML =
    '<div class="min-h-screen flex items-center justify-center p-4">' +
      '<div class="w-full max-w-md" style="animation:fadeIn 0.3s ease-in">' +
        '<div class="text-center mb-8">' +
          '<div style="font-size:4rem;margin-bottom:1rem">🌙</div>' +
          '<h1 style="font-size:1.875rem;font-weight:700;color:#91a7ff">Dream Network</h1>' +
          '<p style="color:#6b7280;margin-top:0.5rem" id="login-subtitle">' + title + "</p>" +
        "</div>" +
        '<div style="background:rgba(31,41,55,0.5);border:1px solid rgba(55,65,81,0.5);border-radius:1rem;padding:2rem">' +
          '<div style="margin-bottom:1.25rem">' +
            '<label style="display:block;font-size:0.875rem;color:#9ca3af;margin-bottom:0.25rem">Nome de utilizador</label>' +
            '<input id="login-user" type="text" placeholder="sonhador_anonimo" style="width:100%;background:#111827;border:1px solid #374151;border-radius:0.75rem;padding:0.75rem 1rem;color:#f3f4f6;outline:none" autocomplete="username" />' +
          "</div>" +
          '<div style="margin-bottom:1.25rem">' +
            '<label style="display:block;font-size:0.875rem;color:#9ca3af;margin-bottom:0.25rem">Senha</label>' +
            '<input id="login-pass" type="password" placeholder="••••••" style="width:100%;background:#111827;border:1px solid #374151;border-radius:0.75rem;padding:0.75rem 1rem;color:#f3f4f6;outline:none" autocomplete="current-password" />' +
          "</div>" +
          confirmField +
          '<button id="login-btn" style="width:100%;padding:0.75rem 1.5rem;background:#4c6ef5;color:white;font-weight:500;border:none;border-radius:0.75rem;cursor:pointer;margin-bottom:0.75rem">' + btnText + "</button>" +
          '<p style="text-align:center;font-size:0.875rem;color:#6b7280">' +
            '<button id="toggle-btn" style="background:none;border:none;color:#748ffc;cursor:pointer;font-size:0.875rem;padding:0">' + toggleText + "</button>" +
          "</p>" +
        "</div>" +
        '<div style="text-align:center;margin-top:1.5rem;font-size:0.75rem;color:#4b5563">' +
          '<p>🔒 O texto dos seus sonhos é cifrado localmente.</p>' +
          '<p>🌍 Apenas emoções e metadados anónimos são partilhados.</p>' +
        "</div>" +
      "</div>" +
    "</div>";

  // Event listener para o toggle login/registo
  document.getElementById("toggle-btn").addEventListener("click", function () {
    isRegister = !isRegister;
    showLogin();
  });
}

// ── Mostra loading ─────────────────────────────────────────────────
function showLoading() {
  root.innerHTML =
    '<div class="min-h-screen flex items-center justify-center">' +
      '<div class="text-center">' +
        '<span style="display:inline-block;width:2rem;height:2rem;border:3px solid #4c6ef5;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;margin-bottom:1rem"></span>' +
        '<p style="color:#6b7280">A carregar Dream Network…</p>' +
      "</div>" +
    "</div>";
}

// ── Inicia ─────────────────────────────────────────────────────────
var token = sessionStorage.getItem("dream_token");

if (!token) {
  isRegister = false;
  showLogin();
} else {
  showLoading();
  fetch("/api/auth/me", {
    headers: { Authorization: "Bearer " + token },
  })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (data) {
        window.__initialUser = data;
        root.innerHTML = "";
        render(function () { return App(); }, root);
      } else {
        sessionStorage.removeItem("dream_token");
        sessionStorage.removeItem("dream_password");
        isRegister = false;
        showLogin();
      }
    })
    .catch(function () {
      isRegister = false;
      showLogin();
    });
}
