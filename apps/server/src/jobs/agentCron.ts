import cron from 'node-cron'
import { Server } from 'socket.io'
import { PrismaClient } from '@prisma/client'
import { updateAllPositions, getAllPositions } from '../services/simulationService'
import { processDelayedTrains } from '../services/agentService'
import { detectConflicts, createFlagsForConflicts } from '../services/cascadeService'
import { emitTrainPositions, emitNewFlag } from '../services/socketService'

const db = new PrismaClient()
let cycleCount = 0

export function startAgentCron(io: Server) {
  // Run every 30 seconds
  cron.schedule('*/30 * * * * *', async () => {
    cycleCount++
    const startTime = Date.now()
    console.log(`\n[Agent] ⚡ Cycle #${cycleCount} starting...`)

    try {
      // Step 1: Update all train positions with delay simulation
      await updateAllPositions()
      console.log(`[Agent] ✓ Positions updated`)

      // Step 2: Get updated positions and emit to all clients
      const positions = await getAllPositions()
      emitTrainPositions(positions)
      console.log(`[Agent] ✓ Positions emitted to ${io.engine.clientsCount} clients`)

      // Step 3: Process newly delayed trains → create flags
      await processDelayedTrains()

      // Step 4: Detect cascade/platform conflicts
      const conflicts = await detectConflicts()
      if (conflicts.length > 0) {
        await createFlagsForConflicts(conflicts)
        console.log(`[Agent] ✓ Created ${conflicts.length} conflict flag(s)`)
      }

      // Step 5: Emit all active flags
      const activeFlags = await db.agentFlag.findMany({
        where: { isResolved: false },
        include: {
          trainRun: {
            include: { train: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      })

      if (activeFlags.length > 0) {
        io.emit('agent:flags', activeFlags)
      }

      const duration = Date.now() - startTime
      console.log(`[Agent] ✓ Cycle complete in ${duration}ms | Active flags: ${activeFlags.length}`)
    } catch (err: any) {
      console.error('[Agent] ✗ Cycle error:', err.message)
    }
  })

  console.log('[Agent] 🤖 Agent cron scheduled — runs every 30 seconds')
}
