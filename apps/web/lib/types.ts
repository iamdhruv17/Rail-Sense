// Shared types between frontend and backend

export type TrainStatus = 'ON_TIME' | 'DELAYED' | 'SEVERELY_DELAYED' | 'CANCELLED'
export type FlagSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type FlagType = 'DELAY_DETECTED' | 'CASCADE_RISK' | 'PLATFORM_CONFLICT' | 'SEVERELY_DELAYED'
export type UserRole = 'PASSENGER' | 'STATION_MASTER'
export type TrainType = 'RAJDHANI' | 'SHATABDI' | 'EXPRESS' | 'PASSENGER' | 'DURONTO' | 'MAIL'

export interface TrainPosition {
  trainId: string
  trainRunId: string
  trainNumber: string
  trainName: string
  trainType: string
  lat: number
  lng: number
  speed: number
  delayMinutes: number
  status: TrainStatus
  lastStation: string
  lastStationName: string
  nextStation: string
  nextStationName: string
  progressPercent: number
  updatedAt: string
}

export interface AgentFlag {
  id: string
  trainRunId: string
  type: FlagType
  severity: FlagSeverity
  reasoning: string
  suggestion: string
  rawData: any
  isResolved: boolean
  resolvedBy?: string | null
  resolvedAt?: string | null
  resolution?: string | null
  createdAt: string
  trainRun?: {
    id: string
    delayMinutes: number
    status: string
    train: {
      number: string
      name: string
      type: string
    }
  }
}

export interface Station {
  id: string
  code: string
  name: string
  city: string
  lat: number
  lng: number
  platforms: number
}

export interface Train {
  id: string
  number: string
  name: string
  type: string
  totalCoaches: number
}

export interface RouteStop {
  id: string
  stopOrder: number
  scheduledArrival?: string | null
  scheduledDeparture?: string | null
  platformNumber: number
  cumulativeMinutes: number
  station: Station
  liveETA?: string
  liveDelay?: number
  stopStatus?: 'PASSED' | 'CURRENT' | 'UPCOMING'
}

export interface TrainDetail extends Train {
  currentRun?: {
    id: string
    status: TrainStatus
    delayMinutes: number
    currentLat?: number | null
    currentLng?: number | null
    currentSpeed: number
    lastStationCode?: string | null
    nextStationCode?: string | null
    progressPercent: number
    departedAt: string
    AgentFlags?: AgentFlag[]
  }
  route?: {
    id: string
    name: string
    stops: RouteStop[]
  }
}

export interface PNRData {
  id: string
  number: string
  passengerName: string
  coach: string
  seat: string
  class: string
  boardingStationCode: string
  destinationCode: string
  train: TrainDetail
}

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
}

export interface AuthResponse {
  token: string
  user: User
}

export interface DashboardStats {
  totalActive: number
  delayed: number
  severelyDelayed: number
  criticalFlags: number
  resolvedToday: number
  onTime: number
}

export interface SocketEvents {
  'trains:positions': TrainPosition[]
  'agent:flag': AgentFlag
  'agent:resolved': { flagId: string; resolution: string }
  'train:update': TrainPosition
}
