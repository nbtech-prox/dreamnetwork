/**
 * Dream Network — Camada de persistência local (IndexedDB).
 *
 * Usa a biblioteca `idb` para uma API simples baseada em Promises.
 *
 * Esquema:
 *   - dreams: { id (auto), encryptedText (string base64), iv (string base64),
 *               salt (string base64), emotion (string), timestamp (string ISO),
 *               shared (boolean) }
 */

import { openDB } from "idb";

const DB_NAME = "dream-network";
const DB_VERSION = 1;
const STORE_NAME = "dreams";

let dbPromise = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: "id",
            autoIncrement: true,
          });
          store.createIndex("timestamp", "timestamp", { unique: false });
          store.createIndex("emotion", "emotion", { unique: false });
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Salva um sonho cifrado no IndexedDB.
 *
 * @param {object} dreamData
 * @param {string} dreamData.encryptedText - Texto cifrado em base64.
 * @param {string} dreamData.iv - IV em base64.
 * @param {string} dreamData.salt - Salt em base64.
 * @param {string} dreamData.emotion - Emoção detectada.
 * @param {string} dreamData.timestamp - ISO timestamp.
 * @param {boolean} dreamData.shared - Se foi partilhado.
 * @returns {Promise<number>} ID do registo inserido.
 */
export async function saveDream(dreamData) {
  try {
    const db = await getDb();
    const id = await db.add(STORE_NAME, {
      ...dreamData,
      createdAt: new Date().toISOString(),
    });
    return id;
  } catch (err) {
    console.error("[DB] Error saving dream:", err);
    throw new Error("Falha ao guardar sonho localmente.");
  }
}

/**
 * Lista todos os sonhos do IndexedDB, do mais recente ao mais antigo.
 */
export async function listDreams() {
  try {
    const db = await getDb();
    const dreams = await db.getAll(STORE_NAME);
    return dreams.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );
  } catch (err) {
    console.error("[DB] Error listing dreams:", err);
    throw new Error("Falha ao listar sonhos.");
  }
}

/**
 * Obtém um sonho pelo ID.
 */
export async function getDream(id) {
  try {
    const db = await getDb();
    return db.get(STORE_NAME, id);
  } catch (err) {
    console.error("[DB] Error getting dream:", err);
    throw new Error("Falha ao buscar sonho.");
  }
}

/**
 * Atualiza o campo 'shared' de um sonho.
 */
export async function markShared(id, shared = true) {
  try {
    const db = await getDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const dream = await tx.store.get(id);
    if (dream) {
      dream.shared = shared;
      await tx.store.put(dream);
    }
    await tx.done;
    return true;
  } catch (err) {
    console.error("[DB] Error marking dream shared:", err);
    return false;
  }
}

/**
 * Apaga um sonho pelo ID.
 */
export async function deleteDream(id) {
  try {
    const db = await getDb();
    await db.delete(STORE_NAME, id);
    return true;
  } catch (err) {
    console.error("[DB] Error deleting dream:", err);
    return false;
  }
}
