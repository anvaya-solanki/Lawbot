import { openai } from "@ai-sdk/openai"
import { streamText } from "ai"

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

export async function POST(req: Request) {
  const { messages, files } = await req.json()

  // You would process files here if needed
  // For example, you might want to analyze images or extract text from PDFs

  const result = streamText({
    model: openai("gpt-4o"),
    messages,
    system: "You are a helpful AI assistant. Answer questions concisely and accurately.",
  })

  return result.toDataStreamResponse()
}
