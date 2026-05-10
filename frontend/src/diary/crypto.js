/**
 * Dream Network — Criptografia local (Web Crypto API).
 *
 * Deriva uma chave AES-GCM da senha via PBKDF2,
 * cifra/decifra o texto do sonho no lado do cliente.
 *
 * NUNCA envia a chave ou o texto original para o servidor.
 */

const PBKDF2_ITERATIONS = 600_000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const KEY_LENGTH = 256;

/**
 * Deriva uma chave AES-GCM a partir da senha e de um salt.
 * Usa PBKDF2 com SHA-256 e 600.000 iterações.
 */
export async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Gera um salt aleatório e deriva a chave.
 * Retorna { key, salt }.
 */
export async function createKey(password) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const key = await deriveKey(password, salt);
  return { key, salt };
}

/**
 * Cifra o texto com AES-GCM.
 *
 * @param {string} plaintext - O texto do sonho.
 * @param {CryptoKey} key - Chave AES-GCM.
 * @returns {Promise<{iv: Uint8Array, ciphertext: ArrayBuffer}>}
 */
export async function encrypt(plaintext, key) {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plaintext)
  );
  return { iv, ciphertext };
}

/**
 * Decifra o texto cifrado com AES-GCM.
 *
 * @param {ArrayBuffer} ciphertext - Dados cifrados.
 * @param {CryptoKey} key - Chave AES-GCM.
 * @param {Uint8Array} iv - Vetor de inicialização.
 * @returns {Promise<string>} Texto original.
 * @throws Se a chave estiver errada ou dados corrompidos.
 */
export async function decrypt(ciphertext, key, iv) {
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );
  const dec = new TextDecoder();
  return dec.decode(decrypted);
}

/**
 * Converte ArrayBuffer para base64 (para armazenar no IndexedDB como string).
 */
export function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converte base64 para Uint8Array.
 */
export function base64ToBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
