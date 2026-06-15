import { openDB } from 'idb'

const DB_NAME    = 'marmoraria-jv'
const DB_VERSION = 1

const TABELAS = [
  'materiais', 'clientes', 'fornecedores', 'vendas',
  'orcamentos', 'entradas', 'pedidos', 'perdas', 'perfis',
]

let dbPromise = null

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        for (const tabela of TABELAS) {
          if (!db.objectStoreNames.contains(tabela)) {
            db.createObjectStore(tabela, { keyPath: 'id' })
          }
        }
        if (!db.objectStoreNames.contains('sync_queue')) {
          const store = db.createObjectStore('sync_queue', { keyPath: 'qid', autoIncrement: true })
          store.createIndex('by_ts', 'ts')
        }
        if (!db.objectStoreNames.contains('cache_keys')) {
          db.createObjectStore('cache_keys')
        }
      },
    })
  }
  return dbPromise
}

// Extrai o nome da tabela da URL PostgREST (/rest/v1/materiais?...)
export function tableFromUrl(url) {
  const m = url.match(/\/rest\/v1\/([^?!()]+)/)
  return m ? m[1] : null
}
