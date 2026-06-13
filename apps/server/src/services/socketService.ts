import { Server, Socket } from 'socket.io'
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()
let io: Server

export function initSocketService(socketServer: Server) {
  io = socketServer

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`)

    // Subscribe to a specific train
    socket.on('subscribe:train', (trainNumber: string) => {
      socket.join(`train:${trainNumber}`)
      console.log(`[Socket] ${socket.id} subscribed to train:${trainNumber}`)
    })

    // Station master resolves a flag
    socket.on('flag:resolve', async ({ flagId, resolution }: { flagId: string; resolution: string }) => {
      try {
        const flag = await db.agentFlag.update({
          where: { id: flagId },
          data: { isResolved: true, resolvedAt: new Date(), resolution },
        })
        io.emit('agent:resolved', { flagId, resolution })
        console.log(`[Socket] Flag ${flagId} resolved`)
      } catch (err) {
        socket.emit('error', { message: 'Failed to resolve flag' })
      }
    })

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`)
    })
  })
}

export function getIO(): Server {
  return io
}

export function emitTrainPositions(positions: any[]) {
  if (io) io.emit('trains:positions', positions)
}

export function emitNewFlag(flag: any) {
  if (io) io.emit('agent:flag', flag)
}

export function emitToTrain(trainNumber: string, event: string, data: any) {
  if (io) io.to(`train:${trainNumber}`).emit(event, data)
}
