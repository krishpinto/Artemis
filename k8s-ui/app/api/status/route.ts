import { NextResponse } from 'next/server'
import { Client } from 'pg'
import Redis from 'ioredis'

export async function GET() {
  const result: any = { postgres: null, redis: null }

  // Try Postgres
  try {
    const pg = new Client({
      host: '127.0.0.1',
      port: parseInt(process.env.PG_PORT || '5432'),
      user: 'postgres',
      password: 'password123',
      database: 'mydb',
      connectionTimeoutMillis: 3000
    })
    await pg.connect()
    const tables = await pg.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
    `)
    const data: any = {}
    for (const row of tables.rows) {
      const name = row.table_name
      const rows = await pg.query(`SELECT * FROM ${name} LIMIT 10`)
      data[name] = rows.rows
    }
    await pg.end()
    result.postgres = { status: 'connected', tables: data }
  } catch (e: any) {
    result.postgres = { status: 'disconnected', error: e.message }
  }

  // Try Redis
  try {
    const redis = new Redis({
      host: '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      connectTimeout: 3000,
      lazyConnect: true
    })
    await redis.connect()
    const keys = await redis.keys('*')
    const data: any = {}
    for (const key of keys.slice(0, 20)) {
      data[key] = await redis.get(key)
    }
    await redis.quit()
    result.redis = { status: 'connected', keys: data }
  } catch (e: any) {
    result.redis = { status: 'disconnected', error: e.message }
  }

  return NextResponse.json(result)
}