import { sign } from 'hono/jwt'
import { JWT_SECRET } from './config'

const payload = process.env.PAYLOAD || '{"sub":"user","role":"admin"}'
const token = await sign(JSON.parse(payload), JWT_SECRET)
console.log(token)
