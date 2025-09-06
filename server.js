import express from 'express'
import morgan from 'morgan'
import cors from 'cors'
import * as dotenv from 'dotenv'
import { AccessToken } from 'livekit-server-sdk'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())
app.use(morgan('dev'))

const {
  LIVEKIT_API_KEY,
  LIVEKIT_API_SECRET,
  LIVEKIT_URL,
  PORT = 4000
} = process.env

function validateEnv() {
  const problems = []
  if (!LIVEKIT_API_KEY) problems.push('LIVEKIT_API_KEY ausente')
  if (!LIVEKIT_API_SECRET) problems.push('LIVEKIT_API_SECRET ausente')
  if (!LIVEKIT_URL) problems.push('LIVEKIT_URL ausente')
  if (LIVEKIT_URL && !/^wss:\/\//i.test(LIVEKIT_URL)) {
    problems.push('LIVEKIT_URL deve começar com wss://')
  }
  return problems
}

app.get('/health', (_req, res) => {
  const problems = validateEnv()
  res.json({
    ok: problems.length === 0,
    LIVEKIT_URL: LIVEKIT_URL || null,
    problems
  })
})

app.post('/join', async (req, res) => {
  try {

    const { room, identity, name } = req.body || {}
    if (!room || !identity) {
      return res.status(400).json({ error: 'Parâmetros obrigatórios: room, identity' })
    }

    const problems = validateEnv && validateEnv()
    if (problems && problems.length) {
      return res.status(500).json({ error: 'Config do LiveKit inválida', details: problems })
    }

    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      {
        identity: String(identity),
        name: String(name || identity),
      }
    )

    at.addGrant({
      room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    })

    const token = await at.toJwt()
    return res.json({ token, url: process.env.LIVEKIT_URL })
  } catch (e) {
    console.error('JOIN ERROR:', e)
    return res.status(500).json({ error: String(e?.message || e) })
  }
})


app.listen(PORT, () => {
  console.log('lol-voice-server listening on http://localhost:' + PORT)
})
