'use client'

import { useState, useEffect } from 'react'
import ChatInterface from '@/components/chat-interface'
import Sidebar from '@/components/sidebar'
import { v4 as uuidv4 } from 'uuid'
import axios from 'axios'
import { cn } from '@/lib/utils'

// Define message interface for type safety
interface Message {
  id: string
  role: 'user' | 'gemini' | 'system'
  content: string
  files?: {
    name: string
    type: string
    size: number
    analysisMode?: 'text_only' | 'visual' | 'full'
  }[]
  extractedText?: string
}

// Define your API base URL constant
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081'

export default function Home() {
  // Core state management
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [userId, setUserId] = useState<string | null>('123')
  const [isLoading, setIsLoading] = useState(false)

  // On component mount, check for existing userId in localStorage or create a new one
  useEffect(() => {
    // Get or create userId
    let storedUserId = localStorage.getItem('userId')
    if (!storedUserId) {
      // storedUserId = uuidv4() // Generate a unique user ID
      localStorage.setItem('userId', '123')
    }
    setUserId('123')

    // Get last active session if available
    const lastSession = localStorage.getItem('lastSessionId')
    if (lastSession) {
      setSessionId(lastSession)
    } else {
      // If no last session, create a new one
      createNewSession()
    }
  }, [])

  // Store the last active session whenever it changes
  useEffect(() => {
    if (sessionId) {
      localStorage.setItem('lastSessionId', sessionId)
      // Fetch chat history if we have a sessionId
      fetchChatHistory(sessionId)
    }
  }, [sessionId])

  // Create a new chat session
  const createNewSession = async () => {
    setIsLoading(true)
    try {
      const response = await axios.post(`${API_BASE_URL}/api/reset`, {
        user_id: userId,
      })

      const sessionIdFromAPI = response.data.session_id
      setSessionId(sessionIdFromAPI)
      setMessages([]) // Reset messages as we're creating a new session
    } catch (error) {
      console.error('Error creating new session:', error)
      const fallbackId = uuidv4()
      setSessionId(fallbackId)
      setMessages([])
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch chat history for a given session
  const fetchChatHistory = async (sid: string) => {
    setIsLoading(true)
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/history?session_id=${sid}`
      )

      if (response.data.history && Array.isArray(response.data.history)) {
        // Convert backend history format to our frontend format
        const convertedMessages = response.data.history.map(
          (msg: any, index: number) => ({
            id: `hist-${index}`,
            role: msg.role, // The backend uses 'user' and 'gemini' roles
            content: msg.content,
          })
        )
        setMessages(convertedMessages)
      }
    } catch (error) {
      console.error('Error fetching chat history:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className={cn('flex h-screen bg-background')}>
      <Sidebar
        activeChatId={sessionId}
        setActiveChatId={setSessionId}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        fetchChatHistory={fetchChatHistory}
        createNewSession={createNewSession}
        userId={userId || ''}
      />
      <ChatInterface
        sidebarOpen={sidebarOpen}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        sessionId={sessionId}
        messages={messages}
        setMessages={setMessages}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
        userId={userId || ''}
      />
    </main>
  )
}
