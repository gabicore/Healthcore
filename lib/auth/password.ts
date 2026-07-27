import { hash, verify } from '@node-rs/argon2'

const argonOptions = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, argonOptions)
}

export async function verifyPassword(
  hashValue: string,
  password: string,
): Promise<boolean> {
  try {
    return await verify(hashValue, password, argonOptions)
  } catch {
    return false
  }
}
