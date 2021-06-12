import levelup from 'levelup'
import rocksdb from 'rocksdb'
import encode from 'encoding-down'
import path from 'path'
import env from '../utils/env'
import logger from '../utils/logger'
import { DB_ENCODING_DEFAULT } from './db_encoding'

const dbMap = new Map()

export const DB_TOUCHED_AT = 'DB_TOUCHED_AT'

export const DB_BLOCK = 0
export const DB_WINDOW = 1
export const DB_BLOB = 2

export const DB_KEYS = Object.freeze([DB_BLOCK, DB_WINDOW, DB_BLOB])

const checkDb = async (db) => {
  let touchedAt

  try {
    touchedAt = await db.get(DB_TOUCHED_AT)
  } catch (error) {
    logger.debug(error)
  }

  if (typeof touchedAt !== 'number') {
    throw new Error('DB not initialized, run `pnpm db_init`.')
  }
  return db
}

export const setupDb = (dbs = [], readonlyDbs = []) =>
  Promise.all(
    [...dbs.map(getDb), ...readonlyDbs.map(getReadonlyDb)].map(checkDb)
  )

export const getDb = (key, options = {}) => {
  let db = dbMap.get(key)

  if (db) {
    return db
  }

  db = levelup(
    encode(rocksdb(path.join(env.dbPrefix, `${key}`)), DB_ENCODING_DEFAULT),
    options
  )
  dbMap.set(key, db)

  return db
}

export const getReadonlyDb = (key, options = {}) =>
  getDb(key, { ...options, readOnly: true })
