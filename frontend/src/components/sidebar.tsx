'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import axios from 'axios'
import {
  PlusIcon,
  SearchIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SparklesIcon,
} from 'lucide-react'
import ChatHistoryItem from './chat-history-item'
import { cn } from '@/lib/utils'

// Base URL for API calls - configure from environment variable in production
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081'

interface ChatMessage {
  role: string
  content: string
  timestamp?: string
}

interface Chat {
  id: string
  title: string
  lastMessage: string
  timestamp: Date
  messages?: ChatMessage[]
}

interface SidebarProps {
  activeChatId: string | null
  setActiveChatId: (id: string | null) => void
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  fetchChatHistory: (sid: string) => Promise<void>
  createNewSession: () => Promise<void>
  userId: string
}

export default function Sidebar({
  activeChatId,
  setActiveChatId,
  isOpen,
  setIsOpen,
  fetchChatHistory,
  createNewSession,
  userId,
}: SidebarProps) {
  const [chats, setChats] = useState<Chat[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  // Load all chat history on initial mount
  useEffect(() => {
    if (userId) {
      fetchAllChats()
    }
  }, [userId])

  const fetchAllChats = async () => {
    if (!userId) return

    setIsLoading(true)
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/user-chats?user_id=${userId}`
      )

      if (response.data.chats && Array.isArray(response.data.chats)) {
        // Transform API response to our Chat format
        const formattedChats = response.data.chats.map((chat: any) => ({
          id: chat.id,
          title: chat.title || 'Untitled Chat',
          lastMessage: chat.lastMessage || 'No messages yet',
          timestamp: new Date(chat.timestamp || Date.now()),
        }))

        setChats(formattedChats)

        // If we have chats but no active chat, set the first one active
        if (formattedChats.length > 0 && !activeChatId) {
          setActiveChatId(formattedChats[0].id)
        }
      }
    } catch (error) {
      console.error('Error fetching all chats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateNewChat = async () => {
    await createNewSession()
    fetchAllChats() // Refresh chat list after creation
  }

  const deleteChat = async (id: string) => {
    try {
      // Call the delete-chat endpoint from the Flask backend
      await axios.post(`${API_BASE_URL}/api/delete-chat`, {
        session_id: id,
      })

      // Update local state
      const updatedChats = chats.filter((chat) => chat.id !== id)
      setChats(updatedChats)

      if (activeChatId === id) {
        // If we're deleting the active chat, switch to another one or create new
        if (updatedChats.length > 0) {
          setActiveChatId(updatedChats[0].id)
        } else {
          // Create a new chat if we deleted the last one
          handleCreateNewChat()
        }
      }
    } catch (error) {
      console.error('Error deleting chat:', error)
    }
  }

  const renameChat = async (id: string, newTitle: string) => {
    try {
      // Call rename-chat endpoint from the Flask backend
      await axios.post(`${API_BASE_URL}/api/rename-chat`, {
        session_id: id,
        title: newTitle,
      })

      // Update local state
      const updatedChats = chats.map((chat) =>
        chat.id === id ? { ...chat, title: newTitle } : chat
      )
      setChats(updatedChats)
    } catch (error) {
      console.error('Error renaming chat:', error)
    }
  }

  const shareChat = (id: string) => {
    // Generate a shareable URL for the chat
    const shareableUrl = `${window.location.origin}/chat/${id}`

    navigator.clipboard
      .writeText(shareableUrl)
      .then(() => {
        alert(`Shareable link copied to clipboard: ${shareableUrl}`)
      })
      .catch((err) => {
        console.error('Failed to copy share link:', err)
        alert(`Share link for chat ${id} generated!`)
      })
  }

  const filteredChats = chats.filter(
    (chat) =>
      chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <>
      {/* Sidebar toggle button - only shown when sidebar is closed */}
      <Button
        variant='secondary'
        size='icon'
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'absolute top-3 left-3 z-50 h-8 w-8 rounded-full border border-border bg-neutral-700 shadow-md transition-all duration-300',
          isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
        )}
      >
        <ChevronRightIcon size={16} />
      </Button>

      <div
        ref={sidebarRef}
        className={cn(
          'h-full border-r border-border flex flex-col bg-muted/30 relative transition-all duration-300 ease-in-out',
          isOpen ? 'w-72' : 'w-0'
        )}
      >
        <div
          className={cn(
            'p-4 flex items-center justify-between',
            isOpen ? '' : 'hidden'
          )}
        >
          <Button
            onClick={handleCreateNewChat}
            className={cn(
              'w-full flex items-center justify-center gap-2',
              isOpen ? '' : 'hidden'
            )}
            variant='outline'
            disabled={isLoading}
          >
            <PlusIcon size={16} />
            New Chat
          </Button>

          <Button
            variant='secondary'
            size='icon'
            onClick={() => setIsOpen(false)}
            className='h-8 w-8 ml-2 flex-shrink-0'
          >
            <ChevronLeftIcon size={16} />
          </Button>
        </div>

        <div className={cn('px-4 mb-2', isOpen ? '' : 'hidden')}>
          <div className='relative'>
            <SearchIcon
              size={16}
              className='absolute left-2 top-2.5 text-muted-foreground'
            />
            <Input
              placeholder='Search chats...'
              className='pl-8'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <ScrollArea className='flex-1 px-2'>
          <div className='space-y-2 pb-4'>
            {isLoading && (
              <div className='text-center py-2 text-muted-foreground'>
                Loading...
              </div>
            )}

            {!isLoading &&
              filteredChats.map((chat) => (
                <ChatHistoryItem
                  key={chat.id}
                  chat={chat}
                  isActive={chat.id === activeChatId}
                  onClick={() => {
                    setActiveChatId(chat.id)
                    // Fetch the latest chat history when selecting a chat
                    fetchChatHistory(chat.id)
                  }}
                  onDelete={() => deleteChat(chat.id)}
                  onRename={(newTitle) => renameChat(chat.id, newTitle)}
                  onShare={() => shareChat(chat.id)}
                />
              ))}

            {!isLoading && filteredChats.length === 0 && (
              <div className='text-center py-8 text-muted-foreground'>
                {searchQuery
                  ? 'No matching chats found'
                  : 'No chat history yet'}
              </div>
            )}
          </div>
        </ScrollArea>

        <div
          className={cn('p-4 border-t border-border', isOpen ? '' : 'hidden')}
        >
          <Button
            variant='outline'
            className='w-full flex items-center justify-center gap-2 bg-primary/5 hover:bg-primary/10'
          >
            <SparklesIcon size={16} className='text-primary' />
            <span className='font-medium'>Upgrade Plan</span>
          </Button>
          <div className='text-xs text-muted-foreground mt-2 text-center'>
            Gemini Chatbot v1.0
          </div>
        </div>
      </div>
    </>
  )
}
