import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: path.join(__dirname, '../.env') })

const db = new PrismaClient()

// ── Station data with real coordinates ──────────────────
const STATIONS = [
  { code: 'NDLS', name: 'New Delhi',       city: 'New Delhi',   lat: 28.6419, lng: 77.2194, platforms: 16 },
  { code: 'BCT',  name: 'Mumbai Central',  city: 'Mumbai',      lat: 18.9690, lng: 72.8205, platforms: 8 },
  { code: 'HWH',  name: 'Howrah Junction', city: 'Kolkata',     lat: 22.5839, lng: 88.3424, platforms: 23 },
  { code: 'MAS',  name: 'Chennai Central', city: 'Chennai',     lat: 13.0827, lng: 80.2707, platforms: 12 },
  { code: 'SBC',  name: 'Bengaluru City',  city: 'Bengaluru',   lat: 12.9767, lng: 77.5713, platforms: 10 },
  { code: 'BPL',  name: 'Bhopal Junction', city: 'Bhopal',      lat: 23.2599, lng: 77.4126, platforms: 6 },
  { code: 'PUNE', name: 'Pune Junction',   city: 'Pune',        lat: 18.5284, lng: 73.8742, platforms: 6 },
  { code: 'ADI',  name: 'Ahmedabad Junction', city: 'Ahmedabad', lat: 23.0225, lng: 72.5714, platforms: 10 },
  { code: 'LKO',  name: 'Lucknow NR',      city: 'Lucknow',     lat: 26.8467, lng: 80.9462, platforms: 8 },
  { code: 'BSB',  name: 'Varanasi Junction', city: 'Varanasi',  lat: 25.3176, lng: 82.9739, platforms: 9 },
  { code: 'NGP',  name: 'Nagpur Junction', city: 'Nagpur',      lat: 21.1458, lng: 79.0882, platforms: 8 },
  { code: 'JAI',  name: 'Jaipur Junction', city: 'Jaipur',      lat: 26.9124, lng: 75.7873, platforms: 6 },
  { code: 'PNBE', name: 'Patna Junction',  city: 'Patna',       lat: 25.5941, lng: 85.1376, platforms: 10 },
  { code: 'GWL',  name: 'Gwalior Junction',city: 'Gwalior',     lat: 26.2183, lng: 78.1828, platforms: 5 },
  { code: 'AGC',  name: 'Agra Cantt',      city: 'Agra',        lat: 27.1767, lng: 78.0081, platforms: 6 },
]

// ── Train definitions ────────────────────────────────────
const TRAINS = [
  { number: '12951', name: 'Mumbai Rajdhani Express', type: 'RAJDHANI', coaches: 22 },
  { number: '12301', name: 'Howrah Rajdhani Express', type: 'RAJDHANI', coaches: 20 },
  { number: '12002', name: 'Bhopal Shatabdi Express', type: 'SHATABDI', coaches: 16 },
  { number: '12028', name: 'Chennai Mail',             type: 'MAIL',     coaches: 22 },
  { number: '12627', name: 'Karnataka Express',        type: 'EXPRESS',  coaches: 24 },
  { number: '12904', name: 'Frontier Mail',            type: 'MAIL',     coaches: 20 },
  { number: '14115', name: 'Lucknow Mail',             type: 'MAIL',     coaches: 18 },
  { number: '12393', name: 'Sampoorna Kranti Express', type: 'EXPRESS',  coaches: 22 },
  { number: '12430', name: 'Shramjeevi Express',       type: 'EXPRESS',  coaches: 20 },
  { number: '22221', name: 'Rajdhani Express',         type: 'RAJDHANI', coaches: 20 },
]

// route: array of [stationCode, cumulativeMinutes, platform, arrival, departure]
const ROUTES: Record<string, Array<[string, number, number, string, string]>> = {
  '12951': [
    ['NDLS', 0,   4, '',      '16:00'],
    ['GWL',  120, 2, '18:00', '18:02'],
    ['BPL',  300, 1, '21:00', '21:05'],
    ['PUNE', 540, 3, '01:00', '01:05'],
    ['BCT',  660, 2, '03:00', ''],
  ],
  '12301': [
    ['NDLS', 0,   1, '',      '14:00'],
    ['AGC',  90,  2, '15:30', '15:32'],
    ['BSB',  300, 1, '19:00', '19:05'],
    ['PNBE', 420, 3, '21:00', '21:05'],
    ['HWH',  540, 5, '23:00', ''],
  ],
  '12002': [
    ['NDLS', 0,   3, '',      '06:00'],
    ['AGC',  90,  1, '07:30', '07:32'],
    ['GWL',  150, 2, '08:30', '08:32'],
    ['BPL',  240, 1, '10:00', ''],
  ],
  '12028': [
    ['NDLS', 0,   2, '',      '22:30'],
    ['NGP',  480, 3, '06:30', '06:35'],
    ['MAS',  900, 1, '15:30', ''],
  ],
  '12627': [
    ['NDLS', 0,   6, '',      '18:00'],
    ['BPL',  240, 2, '22:00', '22:05'],
    ['NGP',  420, 3, '01:00', '01:05'],
    ['SBC',  720, 1, '06:00', ''],
  ],
  '12904': [
    ['BCT',  0,   1, '',      '08:00'],
    ['PUNE', 120, 2, '10:00', '10:05'],
    ['BPL',  360, 3, '14:00', '14:05'],
    ['NDLS', 600, 4, '18:00', ''],
  ],
  '14115': [
    ['NDLS', 0,   5, '',      '22:00'],
    ['AGC',  90,  1, '23:30', '23:32'],
    ['LKO',  240, 2, '02:00', ''],
  ],
  '12393': [
    ['NDLS', 0,   2, '',      '18:00'],
    ['LKO',  240, 3, '22:00', '22:05'],
    ['BSB',  420, 1, '01:05', '01:10'],
    ['PNBE', 600, 2, '04:00', ''],
  ],
  '12430': [
    ['JAI',  0,   1, '',      '06:00'],
    ['AGC',  120, 3, '08:00', '08:02'],
    ['NDLS', 210, 2, '09:30', ''],
  ],
  '22221': [
    ['NDLS', 0,   1, '',      '16:30'],
    ['BPL',  240, 2, '20:30', '20:35'],
    ['NGP',  420, 3, '23:30', '23:35'],
    ['MAS',  900, 4, '09:30', ''],
  ],
}

// Hours ago each train departed (gives variety in positions)
const TRAIN_DEPARTURE_HOURS: Record<string, number> = {
  '12951': 4,
  '12301': 6,
  '12002': 2,
  '12028': 8,
  '12627': 3,
  '12904': 5,
  '14115': 1.5,
  '12393': 7,
  '12430': 2.5,
  '22221': 10,
}

const CLASSES = ['SL', '3A', '2A', '1A', 'CC']
const NAMES = [
  'Rahul Sharma', 'Priya Krishnan', 'Arjun Mehta', 'Sneha Nair', 'Vikram Singh',
  'Deepa Patel', 'Arun Kumar', 'Kavya Reddy', 'Ravi Verma', 'Ananya Iyer',
  'Suresh Gupta', 'Meera Joshi', 'Kartik Rao', 'Pooja Malhotra', 'Sanjay Bhatt',
  'Lakshmi Devi', 'Rohit Tiwari', 'Anjali Nair', 'Harish Pillai', 'Divya Sharma',
  'Manish Kumar', 'Sunita Yadav', 'Praveen Nair', 'Geeta Singh', 'Ramesh Reddy',
  'Usha Patel', 'Naresh Gupta', 'Rekha Verma', 'Vijay Kumar', 'Sarla Mehta',
]

async function seed() {
  console.log('🌱 Starting RailSense database seed...\n')

  // ── Clean existing data ──────────────────────────────
  console.log('Cleaning existing data...')
  await db.notification.deleteMany()
  await db.pNR.deleteMany()
  await db.agentFlag.deleteMany()
  await db.trainRun.deleteMany()
  await db.routeStop.deleteMany()
  await db.route.deleteMany()
  await db.platform.deleteMany()
  await db.train.deleteMany()
  await db.station.deleteMany()
  await db.user.deleteMany()

  // ── Seed Stations ────────────────────────────────────
  console.log('Creating stations...')
  const stationMap: Record<string, string> = {}
  for (const s of STATIONS) {
    const station = await db.station.create({
      data: { code: s.code, name: s.name, city: s.city, lat: s.lat, lng: s.lng, platforms: s.platforms },
    })
    stationMap[s.code] = station.id
    // Create platforms
    for (let i = 1; i <= s.platforms; i++) {
      await db.platform.create({ data: { stationId: station.id, number: i } })
    }
  }
  console.log(`  ✓ Created ${STATIONS.length} stations`)

  // ── Seed Trains + Routes ─────────────────────────────
  console.log('Creating trains and routes...')
  const trainMap: Record<string, string> = {}
  const trainRunMap: Record<string, string> = {}
  const today = new Date().toISOString().split('T')[0]
  const now = new Date()

  for (const t of TRAINS) {
    const train = await db.train.create({
      data: { number: t.number, name: t.name, type: t.type, totalCoaches: t.coaches },
    })
    trainMap[t.number] = train.id

    const routeStops = ROUTES[t.number]
    const totalMinutes = routeStops[routeStops.length - 1][1]
    const hoursAgo = TRAIN_DEPARTURE_HOURS[t.number] || 2
    const departedAt = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000)

    const route = await db.route.create({
      data: {
        trainId: train.id,
        name: `${t.name} Route`,
      },
    })

    for (let i = 0; i < routeStops.length; i++) {
      const [code, cumMin, platform, arrival, departure] = routeStops[i]
      await db.routeStop.create({
        data: {
          routeId: route.id,
          stationId: stationMap[code],
          stopOrder: i + 1,
          cumulativeMinutes: cumMin,
          platformNumber: platform,
          scheduledArrival: arrival || null,
          scheduledDeparture: departure || null,
        },
      })
    }

    // Initial position: calculate where train is right now
    const elapsedMin = (now.getTime() - departedAt.getTime()) / 60000
    let lastCode = routeStops[0][0]
    let nextCode = routeStops[1]?.[0] || null
    let progress = 0

    for (let i = 0; i < routeStops.length - 1; i++) {
      if (elapsedMin >= routeStops[i][1] && elapsedMin < routeStops[i + 1][1]) {
        lastCode = routeStops[i][0]
        nextCode = routeStops[i + 1][0]
        const segDur = routeStops[i + 1][1] - routeStops[i][1]
        const segEl = elapsedMin - routeStops[i][1]
        progress = (routeStops[i][1] / totalMinutes) * 100 + (segEl / totalMinutes) * 100
        break
      }
      if (elapsedMin >= routeStops[i + 1][1]) {
        lastCode = routeStops[i + 1][0]
        nextCode = routeStops[Math.min(i + 2, routeStops.length - 1)][0]
        progress = (routeStops[i + 1][1] / totalMinutes) * 100
      }
    }

    const lastStation = STATIONS.find(s => s.code === lastCode)
    const nextStation = STATIONS.find(s => s.code === nextCode)
    const lastIdx = routeStops.findIndex(s => s[0] === lastCode)
    const nextIdx = Math.min(lastIdx + 1, routeStops.length - 1)
    const segDuration = routeStops[nextIdx][1] - routeStops[lastIdx][1]
    const segElapsed = elapsedMin - routeStops[lastIdx][1]
    const t2 = segDuration > 0 ? Math.min(1, Math.max(0, segElapsed / segDuration)) : 0

    const currentLat = lastStation && nextStation
      ? lastStation.lat + (nextStation.lat - lastStation.lat) * t2
      : (lastStation?.lat || 28.6)
    const currentLng = lastStation && nextStation
      ? lastStation.lng + (nextStation.lng - lastStation.lng) * t2
      : (lastStation?.lng || 77.2)

    const run = await db.trainRun.create({
      data: {
        trainId: train.id,
        date: today,
        status: 'ON_TIME',
        delayMinutes: 0,
        currentLat,
        currentLng,
        currentSpeed: 110 + Math.random() * 30,
        lastStationCode: lastCode,
        nextStationCode: nextCode,
        progressPercent: Math.min(100, progress),
        departedAt,
        totalMinutes,
      },
    })
    trainRunMap[t.number] = run.id
  }
  console.log(`  ✓ Created ${TRAINS.length} trains with routes and active runs`)

  // ── Seed PNRs (3 per train) ──────────────────────────
  console.log('Creating PNR records...')
  let pnrCount = 0
  let nameIdx = 0

  for (const t of TRAINS) {
    const trainId = trainMap[t.number]
    const trainRunId = trainRunMap[t.number]
    const routeStops = ROUTES[t.number]
    const origins = routeStops.slice(0, -1).map(s => s[0])
    const dests = routeStops.slice(1).map(s => s[0])

    for (let p = 0; p < 3; p++) {
      const pnrNumber = `${t.number}${(p + 1).toString().padStart(4, '0')}`
      const coachNum = Math.floor(Math.random() * 8) + 1
      const seatNum = Math.floor(Math.random() * 72) + 1
      const cls = CLASSES[Math.floor(Math.random() * CLASSES.length)]
      const coach = `${cls[0]}${coachNum}`
      const origin = origins[Math.floor(Math.random() * origins.length)]
      const dest = dests[Math.floor(Math.random() * dests.length)]

      await db.pNR.create({
        data: {
          number: pnrNumber,
          trainId,
          trainRunId,
          passengerName: NAMES[nameIdx % NAMES.length],
          coach,
          seat: `${seatNum}`,
          class: cls,
          boardingStationCode: origin,
          destinationCode: dest,
        },
      })
      nameIdx++
      pnrCount++
    }
  }
  console.log(`  ✓ Created ${pnrCount} PNR records`)

  // ── Seed Users ───────────────────────────────────────
  console.log('Creating users...')
  const adminHash = await bcrypt.hash('password123', 10)
  const passHash = await bcrypt.hash('password123', 10)

  await db.user.create({
    data: {
      name: 'Admin Station Master',
      email: 'admin@railsense.com',
      password: adminHash,
      role: 'STATION_MASTER',
    },
  })
  await db.user.create({
    data: {
      name: 'Demo Passenger',
      email: 'passenger@railsense.com',
      password: passHash,
      role: 'PASSENGER',
    },
  })
  console.log(`  ✓ Created 2 users`)

  console.log('\n✅ RailSense database seeded successfully!\n')
  console.log('─────────────────────────────────────────────')
  console.log('Login credentials:')
  console.log('  📧 admin@railsense.com     / password123  (Station Master)')
  console.log('  📧 passenger@railsense.com / password123  (Passenger)')
  console.log('\nSample PNR numbers to try:')
  TRAINS.forEach(t => {
    console.log(`  ${t.name}: ${t.number}0001, ${t.number}0002, ${t.number}0003`)
  })
  console.log('─────────────────────────────────────────────\n')
}

seed()
  .catch(console.error)
  .finally(() => db.$disconnect())
