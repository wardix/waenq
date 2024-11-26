import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { jwt } from 'hono/jwt'
import { connect, headers, JSONCodec } from 'nats'
import { JWT_SECRET, NATS_SERVERS, NATS_TOKEN, PORT } from './config'

const app = new Hono()
const jc = JSONCodec()

app.use(logger())

app.get('/', (c) => c.json({ message: 'OK' }))

app.post('/v2/messages', jwt({ secret: JWT_SECRET }), async (c) => {
  const data = await c.req.json()
  const nc = await connect({
    servers: NATS_SERVERS,
    token: NATS_TOKEN,
  })
  const js = nc.jetstream()
  const messageHeaders = headers()

  messageHeaders.set(
    'to',
    btoa(
      `${data.to}`.endsWith('@g.us') || `${data.to}`.endsWith('@s.whatsapp.net')
        ? data.to
        : `${data.to}@s.whatsapp.net`,
    ),
  )
  messageHeaders.set('body', btoa(data.body))
  for (const key in data) {
    if (!['body', 'to', 'text', 'image', 'video', 'document'].includes(key)) {
      messageHeaders.set(key, btoa(data[key]))
    }
  }
  const payload =
    data.body === 'text'
      ? jc.encode(data.text)
      : new Uint8Array(Buffer.from(data[data.body], 'base64'))
  await js.publish('jobs.wa_delivery', payload, { headers: messageHeaders })

  nc.drain()
  return c.json({ message: 'ok' })
})

export default {
  port: Number(PORT),
  fetch: app.fetch,
}
