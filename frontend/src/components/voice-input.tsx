"use client"

import { cn } from "@/lib/utils"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Mic, StopCircle, X, Send, PauseCircle, PlayCircle } from "lucide-react"

interface VoiceInputProps {
  onTranscript: (transcript: string) => void
  onCancel: () => void
  autoSubmit?: boolean
}

// Declare SpeechRecognition type
declare global {
  interface Window {
    webkitSpeechRecognition: any
  }
}

export default function VoiceInput({ onTranscript, onCancel, autoSubmit = false }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(true)
  const [transcript, setTranscript] = useState("")
  const [isPaused, setIsPaused] = useState(false)
  const [visualizer, setVisualizer] = useState<number[]>(Array(20).fill(5))

  const recognitionRef = useRef<any>(null)

  // Simulated audio visualization
  useEffect(() => {
    if (isRecording && !isPaused) {
      const interval = setInterval(() => {
        setVisualizer(
          Array(20)
            .fill(0)
            .map(() => Math.floor(Math.random() * 20) + 5),
        )
      }, 100)
      return () => clearInterval(interval)
    }
  }, [isRecording, isPaused])

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.webkitSpeechRecognition

      if (!SpeechRecognition) {
        alert("Speech recognition is not supported in this browser. Use Chrome on desktop.")
        console.error("SpeechRecognition not available")
        onCancel()
        return
      }

      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = "en-US"

      recognition.onstart = () => {
        console.log("Speech recognition started")
      }

      recognition.onresult = (event: any) => {
        let interimTranscript = ""
        let finalTranscript = ""

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          const text = result[0].transcript
          if (result.isFinal) {
            finalTranscript += text
            console.log("Final:", text)
          } else {
            interimTranscript += text
            console.log("Interim:", text)
          }
        }

        if (finalTranscript && autoSubmit) {
          recognition.stop()
          setIsRecording(false)
          onTranscript(finalTranscript.trim())
        } else {
          setTranscript(finalTranscript || interimTranscript)
        }
      }

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error)
        alert("Speech recognition error: " + event.error)
        setIsRecording(false)
      }

      recognition.onend = () => {
        console.log("Speech recognition ended")
        // Don't restart automatically; only resume if explicitly toggled
      }

      recognitionRef.current = recognition
      recognition.start()

      return () => {
        recognition.stop()
        recognitionRef.current = null
      }
    }
  }, [onCancel, autoSubmit, onTranscript])

  const togglePause = () => {
    const recognition = recognitionRef.current
    if (!recognition) return

    if (isPaused) {
      console.log("Resuming recognition")
      recognition.start()
    } else {
      console.log("Pausing recognition")
      recognition.stop()
    }
    setIsPaused(!isPaused)
  }

  const stopRecording = () => {
    const recognition = recognitionRef.current
    if (recognition) {
      recognition.stop()
      console.log("Manually stopped recognition")
    }
    setIsRecording(false)
  }

  const handleSubmit = () => {
    if (transcript.trim()) {
      onTranscript(transcript.trim())
    } else {
      onCancel()
    }
  }

  return (
    <div className="mb-4 p-4 bg-muted rounded-lg animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium flex items-center gap-2">
          {isRecording ? (
            <>
              <Mic size={18} className={cn("text-red-500", isPaused ? "" : "animate-pulse")} />
              <span>{isPaused ? "Paused" : "Recording..."}</span>
            </>
          ) : (
            <span>Recording complete</span>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel} className="transition-all duration-200 hover:rotate-90">
          <X size={18} />
        </Button>
      </div>

      {/* Audio visualizer */}
      {isRecording && !isPaused && (
        <div className="flex items-center justify-center h-8 gap-[2px] mb-2">
          {visualizer.map((height, i) => (
            <div
              key={i}
              className="w-1 bg-primary rounded-full transition-all duration-100 ease-in-out"
              style={{ height: `${height}px` }}
            ></div>
          ))}
        </div>
      )}

      <div className="min-h-[60px] p-3 bg-background rounded border">{transcript || "Speak now..."}</div>

      <div className="flex justify-end gap-2 mt-2">
        {isRecording ? (
          <>
            <Button variant="outline" onClick={togglePause} className="transition-all duration-200">
              {isPaused ? (
                <>
                  <PlayCircle size={16} className="mr-2" />
                  Resume
                </>
              ) : (
                <>
                  <PauseCircle size={16} className="mr-2" />
                  Pause
                </>
              )}
            </Button>
            <Button variant="secondary" onClick={stopRecording} className="transition-all duration-200">
              <StopCircle size={16} className="mr-2" />
              Stop Recording
            </Button>
          </>
        ) : (
          <Button onClick={handleSubmit} className="transition-all duration-200">
            <Send size={16} className="mr-2" />
            Use Transcript
          </Button>
        )}
      </div>
    </div>
  )
}
