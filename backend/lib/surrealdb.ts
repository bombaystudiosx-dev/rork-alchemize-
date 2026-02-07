import Surreal from 'surrealdb.js';

let db: Surreal | null = null;

export async function initSurrealDB() {
  if (db) return db;

  try {
    db = new Surreal();
    
    const endpoint = process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT;
    const namespace = process.env.EXPO_PUBLIC_RORK_DB_NAMESPACE;
    const token = process.env.EXPO_PUBLIC_RORK_DB_TOKEN;

    if (!endpoint || !namespace || !token) {
      console.warn('[SurrealDB] Missing configuration - running without remote sync');
      return null;
    }

    await Promise.race([
      db.connect(endpoint, {
        namespace,
        database: namespace,
        auth: token,
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 10000)
      )
    ]);

    console.log('[SurrealDB] Connected successfully');
    return db;
  } catch (error) {
    console.error('[SurrealDB] Connection error:', error);
    db = null;
    return null;
  }
}

export async function getSurrealDB() {
  if (!db) {
    await initSurrealDB();
  }
  return db;
}

export interface User {
  [key: string]: unknown;
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: number;
}
