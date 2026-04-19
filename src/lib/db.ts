import mysql from 'mysql2/promise'
import fs from 'fs'

const connectionConfig = {
  host: process.env.TIDB_HOST,
  port: parseInt(process.env.TIDB_PORT || '4000'),
  user: process.env.TIDB_USER,
  password: process.env.TIDB_PASSWORD,
  database: process.env.TIDB_DATABASE,
  ssl: {
    minVersion: 'TLSv1.2',
    ca: process.env.TIDB_SSL_CA && fs.existsSync(process.env.TIDB_SSL_CA) 
        ? fs.readFileSync(process.env.TIDB_SSL_CA) 
        : undefined,
    rejectUnauthorized: false // Often required for TiDB Cloud
  }
}

export async function query(sql: string, params: any[] = []) {
  const connection = await mysql.createConnection(connectionConfig)
  try {
    const [results] = await connection.execute(sql, params)
    return results
  } finally {
    await connection.end()
  }
}
