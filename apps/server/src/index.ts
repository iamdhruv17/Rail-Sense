import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server } from 'socket.io'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env') })

import authRoutes from './routes/auth'
import trainRoutes from './routes/trains'
import stationRoutes from './routes/stations'
import pnrRoutes from './routes/pnr'
import alertRoutes from './routes/alerts'
import agentRoutes from './routes/agent'
import { errorHandler, notFound } from './middleware/errorHandler'
import { initSocketService } from './services/socketService'
import { startAgentCron } from './jobs/agentCron'
import { updateAllPositions } from './services/simulationService'

const app = express()
const httpServer = createServer(app)

const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '')

const io = new Server(httpServer, {
  cors: {
    origin: FRONTEND_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
})

// ── Middleware ──────────────────────────────────────────
app.use(cors({ origin: FRONTEND_URL, credentials: true }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ── Routes ──────────────────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api/trains', trainRoutes)
app.use('/api/stations', stationRoutes)
app.use('/api/pnr', pnrRoutes)
app.use('/api/flags', alertRoutes)
app.use('/api/agent', agentRoutes)

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    message: '🚂 RailSense API running',
  })
})

app.use(notFound)
app.use(errorHandler)

// ── Init ────────────────────────────────────────────────
async function bootstrap() {
  // Initialize socket service
  initSocketService(io)

  // Run initial position update
  try {
    await updateAllPositions()
    console.log('[Bootstrap] Initial train positions calculated')
  } catch (err: any) {
    console.warn('[Bootstrap] Could not update positions (DB may not be seeded yet):', err.message)
  }

  // Start the agent loop
  startAgentCron(io)

  const PORT = parseInt(process.env.PORT || '3001')
  httpServer.listen(PORT, () => {
    console.log(`\n🚂 RailSense Server`)
    console.log(`   API:    http://localhost:${PORT}/api`)
    console.log(`   Health: http://localhost:${PORT}/api/health`)
    console.log(`   Socket: ws://localhost:${PORT}`)
    console.log(`   Mode:   ${process.env.USE_OLLAMA === 'true' ? '🧠 Ollama AI' : '📋 Rule-based'} reasoning\n`)
  })
}

bootstrap().catch(console.error)
