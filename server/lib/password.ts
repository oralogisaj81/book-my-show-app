import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt)
const KEY_LENGTH = 64

export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = randomBytes(16).toString('hex')
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer
  return { hash: derivedKey.toString('hex'), salt }
}

export async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer
  const storedKey = Buffer.from(hash, 'hex')
  if (derivedKey.length !== storedKey.length) return false
  return timingSafeEqual(derivedKey, storedKey)
}
