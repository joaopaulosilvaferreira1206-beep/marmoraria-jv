/**
 * offlineSync.js
 * Cache de leitura + fila de escrita para modo offline.
 *
 * Leituras (GET):  tenta network → guarda em IndexedDB → serve cache se offline.
 * Escritas (POST/PATCH/DELETE): tenta network → se falhar, enfileira localmente.
 *
 * Tabelas multi-passo (vendas, orcamentos, pedidos) precisam de internet:
 * o interceptor deixa a requisição falhar normalmente nesses casos.
 */

import { getDB, tableFromUrl } from './db'

// ── Tabelas que podem ser escritas offline (operações simples, sem FK) ─────────
const TABELAS_OFFLINE = new Set(['clientes', 'fornecedores', 'materiais', 'entradas', 'perdas'])

// ── Cache ─────────────────────────────────────────────────────────────────────

export async function salvarCache(tabela, registros) {
  if (!Array.isArray(registros) || registros.length === 0) return
  const db = await getDB()
  const tx = db.transaction([tabela, 'cache_keys'], 'readwrite')
  const store = tx.objectStore(tabela)
  await store.clear()
  await Promise.all(registros.map(r => store.put(r)))
  await tx.objectStore('cache_keys').put(Date.now(), tabela)
  await tx.done
}

export async function lerCache(tabela) {
  try {
    const db = await getDB()
    return await db.getAll(tabela)
  } catch {
    return []
  }
}

// ── Fila de mutações offline ──────────────────────────────────────────────────

export async function enfileirar(tabela, method, url, body, headers) {
  const db = await getDB()
  await db.add('sync_queue', { tabela, method, url, body, headers, ts: Date.now() })
  dispatchEvent(new CustomEvent('sync-queue-changed'))
}

export async function tamanhoFila() {
  const db = await getDB()
  return db.count('sync_queue')
}

// ── Sincronização ─────────────────────────────────────────────────────────────

let syncando = false

export async function sincronizar() {
  if (syncando || !navigator.onLine) return
  syncando = true
  try {
    const db  = await getDB()
    const fila = await db.getAll('sync_queue')
    for (const item of fila) {
      try {
        await fetch(item.url, {
          method:  item.method,
          headers: item.headers,
          body:    item.body !== null && item.body !== undefined ? JSON.stringify(item.body) : undefined,
        })
        await db.delete('sync_queue', item.qid)
      } catch {
        break // Para na primeira falha; tenta de novo no próximo online
      }
    }
  } finally {
    syncando = false
    dispatchEvent(new CustomEvent('sync-queue-changed'))
  }
}

// ── Deduplicação de requests concorrentes idênticos ─────────────────────────
// Se duas queries iguais dispararem ao mesmo tempo, só uma vai à rede.
const inflight = new Map()

// ── Fetch interceptado para o cliente Supabase ───────────────────────────────

export async function offlineFetch(input, init = {}) {
  const url    = typeof input === 'string' ? input : input.url
  const method = (init.method || 'GET').toUpperCase()

  // Não intercepta auth, storage, edge functions — só PostgREST
  if (!url.includes('/rest/v1/')) {
    return fetch(input, init)
  }

  const tabela = tableFromUrl(url)

  // ── Leitura (GET) ───────────────────────────────────────────────────────────
  if (method === 'GET') {
    // Deduplicação: requests idênticos em paralelo compartilham a mesma promise
    const key = url
    if (inflight.has(key)) return inflight.get(key)

    const promise = (async () => {
      try {
        const res = await fetch(input, init)
        if (res.ok) {
          res.clone().json().then(dados => {
            if (tabela && Array.isArray(dados)) salvarCache(tabela, dados)
          }).catch(() => {})
          return res
        }
        return res
      } catch {
        if (tabela) {
          const cache = await lerCache(tabela)
          if (cache.length > 0) {
            return new Response(JSON.stringify(cache), {
              status:  200,
              headers: { 'Content-Type': 'application/json', 'Content-Range': `0-${cache.length - 1}/${cache.length}` },
            })
          }
        }
        return new Response(JSON.stringify([]), {
          status:  200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    })()

    inflight.set(key, promise)
    promise.finally(() => inflight.delete(key))
    return promise
  }

  // ── Escrita (POST / PATCH / DELETE) ────────────────────────────────────────
  try {
    return await fetch(input, init)
  } catch {
    // Só enfileira tabelas simples; as multi-step (vendas, etc.) falham normalmente
    if (tabela && TABELAS_OFFLINE.has(tabela)) {
      const body = init.body ? JSON.parse(init.body) : null
      await enfileirar(tabela, method, url, body, {
        'Content-Type':  'application/json',
        'apikey':        init.headers?.['apikey']        || '',
        'Authorization': init.headers?.['Authorization'] || '',
        'Prefer':        init.headers?.['Prefer']        || '',
      })

      // Resposta sintética de sucesso para não quebrar a UI
      if (method === 'DELETE') {
        return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } })
      }
      const registros = Array.isArray(body) ? body : [body]
      const com_id    = registros.map(r => ({ ...r, id: r.id ?? crypto.randomUUID() }))
      return new Response(JSON.stringify(com_id), {
        status:  201,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    // Tabelas multi-step: deixa a exception propagar → Supabase retorna {error}
    throw new TypeError('Failed to fetch')
  }
}
