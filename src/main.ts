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
    isNaN(parseFloat(data.to)) ? data.to : `${data.to}@s.whatsapp.net`,
  )
  let body = ''
  for (const key in data) {
    if (key == 'body') {
      body = data[key]
      messageHeaders.set('body', body)
      continue
    }
    if (key == 'to') {
      continue
    }
    if (['text', 'image', 'video', 'document'].includes(key)) {
      continue
    }
    messageHeaders.set(key, data[key])
  }

  switch (body) {
    case 'text':
      await js.publish('jobs.wa_delivery', jc.encode(data.text), {
        headers: messageHeaders,
      })
      break

    case 'image':
      await js.publish(
        'jobs.wa_delivery',
        Buffer.from(data.image, 'base64').toString('utf-8'),
        {
          headers: messageHeaders,
        },
      )
      break

    case 'video':
      await js.publish(
        'jobs.wa_delivery',
        Buffer.from(data.video, 'base64').toString('utf-8'),
        {
          headers: messageHeaders,
        },
      )
      break

    case 'document':
      await js.publish(
        'jobs.wa_delivery',
        Buffer.from(data.document, 'base64').toString('utf-8'),
        {
          headers: messageHeaders,
        },
      )
  }
  nc.drain()
  return c.json({ message: 'ok' })
})

export default {
  port: Number(PORT),
  fetch: app.fetch,
}
