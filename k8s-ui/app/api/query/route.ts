import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'

export async function POST(req: NextRequest) {
  const { query } = await req.json()

  if (!query?.trim()) {
    return NextResponse.json({ error: 'No query provided' }, { status: 400 })
  }

  const pg = new Client({
    host: process.env.PG_HOST || '127.0.0.1',
    port: parseInt(process.env.PG_PORT || '5432'),
    user: 'postgres',
    password: 'password123',
    database: 'mydb',
    connectionTimeoutMillis: 3000
  })

  try {
    await pg.connect()
    const result = await pg.query(query)
    await pg.end()
    return NextResponse.json({
      rows: result.rows,
      rowCount: result.rowCount,
      fields: result.fields?.map((f: { name: any }) => f.name) || []
    })
  } catch (e: any) {
    await pg.end().catch(() => {})
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}