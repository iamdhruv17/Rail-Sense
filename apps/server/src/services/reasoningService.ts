import axios from 'axios'

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'
const USE_OLLAMA = process.env.USE_OLLAMA === 'true'

let ollamaAvailable: boolean | null = null

async function checkOllama(): Promise<boolean> {
  if (ollamaAvailable !== null) return ollamaAvailable
  try {
    await axios.get(`${OLLAMA_URL}/api/tags`, { timeout: 2000 })
    console.log('[Reasoning] Ollama detected — using LLM reasoning')
    ollamaAvailable = true
  } catch {
    console.log('[Reasoning] Ollama not available — using rule-based reasoning')
    ollamaAvailable = false
  }
  return ollamaAvailable
}

async function reasonWithOllama(prompt: string): Promise<string> {
  const resp = await axios.post(
    `${OLLAMA_URL}/api/generate`,
    { model: 'llama3', prompt, stream: false },
    { timeout: 30000 }
  )
  return resp.data.response || ''
}

interface ReasoningInput {
  type: 'DELAY_DETECTED' | 'CASCADE_RISK' | 'PLATFORM_CONFLICT' | 'SEVERELY_DELAYED'
  trainNumber: string
  trainName: string
  delayMinutes?: number
  lastStation?: string
  nextStation?: string
  revisedETA?: string
  stationName?: string
  conflictTime?: string
  otherTrain?: string
  platformNumber?: number
  alternatePlatform?: number
  affectedPassengers?: number
  train1?: string
  train2?: string
}

interface ReasoningOutput {
  reasoning: string
  suggestion: string
}

function ruleBasedReasoning(input: ReasoningInput): ReasoningOutput {
  switch (input.type) {
    case 'DELAY_DETECTED':
      return {
        reasoning: `Train ${input.trainName} (${input.trainNumber}) is running ${input.delayMinutes} minutes behind schedule. Last reported at ${input.lastStation || 'en route'}. Revised arrival at ${input.nextStation || 'next station'}: ${input.revisedETA || 'recalculating'}. The delay appears to have accumulated over the last few segments. Passengers on this train and connecting services may be affected.`,
        suggestion: `Issue platform change advisory at ${input.nextStation}. Update PNR-linked passengers via push notification. Inform connecting train crew of expected delay.`,
      }

    case 'CASCADE_RISK':
      return {
        reasoning: `Delay in ${input.trainName} (${input.trainNumber}) creates a potential platform conflict at ${input.stationName}. ${input.otherTrain} is scheduled on Platform ${input.platformNumber} at ${input.conflictTime}. Without intervention, ${input.affectedPassengers || 'multiple'} downstream passengers will miss connections. This is a cascade risk — early action can prevent compounding delays.`,
        suggestion: `Reassign ${input.otherTrain} to Platform ${input.alternatePlatform || 'an adjacent platform'} immediately. Notify station master at ${input.stationName} to prepare alternate platform. Update digital departure boards.`,
      }

    case 'PLATFORM_CONFLICT':
      return {
        reasoning: `Platform ${input.platformNumber} at ${input.stationName} has overlapping occupancy between ${input.train1} and ${input.train2} at ${input.conflictTime}. Both trains cannot safely use the same platform simultaneously. Immediate reassignment is required to avoid safety incident and operational disruption.`,
        suggestion: `Move ${input.train2} to Platform ${input.alternatePlatform || 'next available platform'}. Issue PA announcement at ${input.stationName}. Alert RPF personnel for platform crowd management.`,
      }

    case 'SEVERELY_DELAYED':
      return {
        reasoning: `Train ${input.trainName} (${input.trainNumber}) is severely delayed by ${input.delayMinutes} minutes — classified as SEVERELY DELAYED status. This level of delay will impact all connecting services at destination stations. Passengers have been waiting significantly longer than scheduled.`,
        suggestion: `Escalate to Divisional Control Office immediately. Issue full passenger advisory with updated ETA. Check if express reschedule path is available to recover some delay. Consider if catering service extension is required.`,
      }

    default:
      return {
        reasoning: `Anomaly detected for train ${input.trainName} (${input.trainNumber}). Manual review recommended.`,
        suggestion: `Review train status and contact station master for assessment.`,
      }
  }
}

export async function generateReasoning(input: ReasoningInput): Promise<ReasoningOutput> {
  if (USE_OLLAMA && (await checkOllama())) {
    try {
      const prompt = buildOllamaPrompt(input)
      const response = await reasonWithOllama(prompt)
      const parts = parseOllamaResponse(response)
      return parts
    } catch (err) {
      console.warn('[Reasoning] Ollama call failed, falling back to rule-based')
    }
  }
  return ruleBasedReasoning(input)
}

function buildOllamaPrompt(input: ReasoningInput): string {
  return `You are RailSense, an AI operations agent for Indian Railways. Analyze this situation and respond concisely.

Situation: ${JSON.stringify(input, null, 2)}

Respond in exactly this format:
REASONING: [2-3 sentence plain English explanation of what happened and why it matters]
SUGGESTION: [1-2 sentence actionable recommendation for station master]`
}

function parseOllamaResponse(response: string): ReasoningOutput {
  const reasoningMatch = response.match(/REASONING:\s*(.+?)(?=SUGGESTION:|$)/s)
  const suggestionMatch = response.match(/SUGGESTION:\s*(.+?)$/s)
  return {
    reasoning: reasoningMatch?.[1]?.trim() || response.substring(0, 300),
    suggestion: suggestionMatch?.[1]?.trim() || 'Review situation and take appropriate action.',
  }
}
