'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Bot, ArrowLeft, Download, Trash2, Copy, Share2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import MessageItem from '@/components/message-item'
import ThemeToggle from '@/components/theme-toggle'
import UserProfile from '@/components/user-profile'
import axios from 'axios'
import Link from 'next/link'

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

interface ChatHistoryResponse {
  history: Array<{
    role: string
    content: string
    files?: {
      name: string
      type: string
      size: number
      analysisMode?: 'text_only' | 'visual' | 'full'
    }[]
  }>
  session_id: string
}

// API base URL - make it configurable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export default function ChatHistoryView() {
  const { sessionId } = useParams()
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchChatHistory()
  }, [sessionId])

  const fetchChatHistory = async () => {
    if (!sessionId) return

    try {
      setIsLoading(true)
      const response = await axios.get<ChatHistoryResponse>(
        `${API_BASE_URL}/api/history?session_id=${sessionId}`
      )

      if (response.data.history) {
        // Convert backend history format to our frontend format
        const convertedMessages = response.data.history.map((msg, index) => ({
          id: `hist-${index}`,
          role: msg.role === 'user' ? 'user' : 'gemini',
          content: msg.content,
          files: msg.files || undefined,
        }))
        setMessages(convertedMessages)
      }
    } catch (error) {
      console.error('Error fetching chat history:', error)
      setError('Failed to load chat history. Please try again later.')
    } finally {
      setIsLoading(false)
    }
  }

  // Scroll to bottom when messages load
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleShareChat = async () => {
    if (!sessionId) return

    try {
      const response = await axios.post(`${API_BASE_URL}/api/share`, {
        session_id: sessionId,
      })

      if (response.data.share_id) {
        const shareUrl = `${window.location.origin}/shared/${response.data.share_id}`
        navigator.clipboard
          .writeText(shareUrl)
          .then(() => {
            alert('Share link copied to clipboard!')
          })
          .catch(() => {
            alert(`Share link: ${shareUrl}`)
          })
      }
    } catch (error) {
      console.error('Error sharing chat:', error)
      alert('Failed to create share link. Please try again.')
    }
  }

  const handleExportChat = () => {
    if (messages.length === 0) return

    const exportData = {
      chat_id: sessionId,
      exported_at: new Date().toISOString(),
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        timestamp: new Date().toISOString(),
      })),
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chat-export-${sessionId}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleTextToSpeech = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text)
    window.speechSynthesis.speak(utterance)
  }

  return (
    <div className='flex flex-col w-full h-screen overflow-hidden'>
      {/* Header */}
      <div className='h-14 border-b border-border flex items-center justify-between px-6'>
        <div className='flex items-center gap-2'>
          <Link href='/'>
            <Button variant='ghost' size='icon' title='Back to chats'>
              <ArrowLeft size={18} />
            </Button>
          </Link>
          <h1 className='font-semibold'>
            Chat History{' '}
            {sessionId ? `${String(sessionId).substring(0, 8)}...` : ''}
          </h1>
        </div>
        <div className='flex items-center gap-2'>
          <Button
            variant='ghost'
            size='icon'
            onClick={handleExportChat}
            title='Export chat'
            disabled={messages.length === 0}
          >
            <Download size={18} />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            onClick={handleShareChat}
            title='Share chat'
            disabled={messages.length === 0}
          >
            <Share2 size={18} />
          </Button>

          <ThemeToggle />
          <UserProfile />
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className='flex-1 p-4 overflow-y-auto max-h-[calc(100vh-128px)]'>
        {isLoading ? (
          <div className='h-full flex items-center justify-center'>
            <div className='text-center'>
              <div className='animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4'></div>
              <p className='text-muted-foreground'>Loading chat history...</p>
            </div>
          </div>
        ) : error ? (
          <div className='h-full flex flex-col items-center justify-center text-center p-8'>
            <div className='text-destructive mb-4'>⚠️</div>
            <h2 className='text-xl font-bold mb-2'>
              Couldn't Load Chat History
            </h2>
            <p className='text-muted-foreground max-w-md'>{error}</p>
            <Button asChild className='mt-4'>
              <Link href='/chat'>Return to Your Chats</Link>
            </Button>
          </div>
        ) : messages.length === 0 ? (
          <div className='h-full flex flex-col items-center justify-center text-center p-8'>
            <Bot size={48} className='text-muted-foreground mb-4' />
            <h2 className='text-2xl font-bold mb-2'>No messages found</h2>
            <p className='text-muted-foreground max-w-md'>
              This chat appears to be empty or may have been deleted.
            </p>
          </div>
        ) : (
          <div className='space-y-6 pb-4'>
            {messages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                onTextToSpeech={handleTextToSpeech}
              />
            ))}

            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Footer with action buttons */}
      <div className='border-t border-border p-4 bg-background'>
        <div className='flex items-center justify-center text-sm text-muted-foreground'>
          <p>
            This is a read-only shared conversation. Want to start your own?
          </p>
          <Button asChild variant='link' className='ml-1 p-0'>
            <Link href='/chat'>Start chatting</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
