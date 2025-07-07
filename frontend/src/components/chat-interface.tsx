// 'use client'

// import type React from 'react'

// import { useState, useRef, useEffect } from 'react'
// import { Button } from '@/components/ui/button'
// import { Textarea } from '@/components/ui/textarea'
// import { ScrollArea } from '@/components/ui/scroll-area'
// import { Send, Mic, Paperclip, Bot, Share2, Volume2 } from 'lucide-react'
// import { cn } from '@/lib/utils'
// import { toast } from 'sonner'
// import VoiceInput from './voice-input'
// import FileUpload from './file-upload'
// import UserProfile from './user-profile'
// import ThemeToggle from './theme-toggle'
// import FileDisplay from './file-display'
// import MessageItem from './message-item'
// import axios from 'axios'
// import { Checkbox } from '@/components/ui/checkbox'
// import { Label } from '@/components/ui/label'

// // API base URL - make it configurable
// const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081'

// interface Message {
//   id: string
//   role: 'user' | 'gemini' | 'system'
//   content: string
//   files?: {
//     name: string
//     type: string
//     size: number
//     analysisMode?: 'text_only' | 'visual' | 'full'
//   }[]
//   extractedText?: string
// }

// interface ChatInterfaceProps {
//   sidebarOpen: boolean
//   toggleSidebar: () => void
//   sessionId: string | null
//   messages: Message[]
//   setMessages: (messages: Message[]) => void
//   isLoading: boolean
//   setIsLoading: (isLoading: boolean) => void
// }

// export default function ChatInterface({
//   sidebarOpen,
//   toggleSidebar,
//   sessionId,
//   messages,
//   setMessages,
//   isLoading,
//   setIsLoading,
// }: ChatInterfaceProps) {
//   const [isRecording, setIsRecording] = useState(false)
//   const [showFileUpload, setShowFileUpload] = useState(false)
//   const [files, setFiles] = useState<File[]>([])
//   const [fileAnalysisMode, setFileAnalysisMode] = useState<
//     Record<string, 'text_only' | 'visual' | 'full'>
//   >({})
//   const [isVoiceMode, setIsVoiceMode] = useState(false)
//   const [input, setInput] = useState('')
//   const [isStreaming, setIsStreaming] = useState(false)
//   const [streamedContent, setStreamedContent] = useState('')
//   const messagesEndRef = useRef<HTMLDivElement>(null)
//   const scrollAreaRef = useRef<HTMLDivElement>(null)

//   // State for checkboxes
//   const [fetchCases, setFetchCases] = useState(false)
//   const [fetchNews, setFetchNews] = useState(false)
//   const [summarize, setSummarize] = useState(false)

//   // Improved scroll to bottom when messages change
//   useEffect(() => {
//     if (messagesEndRef.current) {
//       messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
//     }
//   }, [messages, streamedContent])

//   const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
//     setInput(e.target.value)
//   }

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault()
//     if (input.trim() === '' && files.length === 0) return

//     // Add file metadata to message
//     const fileMetadata = files.map((file) => ({
//       name: file.name,
//       type: file.type,
//       size: file.size,
//       analysisMode: fileAnalysisMode[file.name] || 'text_only',
//     }))

//     // Add user message to chat
//     const userMessage: Message = {
//       id: Date.now().toString(),
//       role: 'user',
//       content: input,
//       files: files.length > 0 ? fileMetadata : undefined,
//     }

//     setMessages([...messages, userMessage])
//     setInput('')
//     setIsLoading(true)

//     try {
//       // Create FormData for file upload
//       const formData = new FormData()
//       formData.append('message', input)
//       if (sessionId) {
//         formData.append('session_id', sessionId)
//       }

//       // Append files to formData
//       files.forEach((file, index) => {
//         formData.append(`file${index}`, file)
//         // Add analysis mode for each file
//         const mode = fileAnalysisMode[file.name] || 'text_only'
//         formData.append(`analysisMode${index}`, mode)
//         // Is this a scanned document?
//         const isScanned = mode === 'visual' || mode === 'full'
//         formData.append(`isScanned${index}`, isScanned.toString())
//       })

//       // Add checkbox values to formData
//       formData.append('fetchCases', fetchCases.toString())
//       formData.append('fetchNews', fetchNews.toString())
//       formData.append('summarize', summarize.toString())

//       // Send message and files to API
//       const response = await axios.post(`${API_BASE_URL}/api/chat`, formData, {
//         headers: {
//           'Content-Type': 'multipart/form-data',
//         },
//       })

//       console.log(response.data)

//       // Start streaming effect
//       setIsStreaming(true)

//       // Simulate streaming by displaying the response character by character
//       const responseContent = response.data.response
//       let displayedContent = ''

//       for (let i = 0; i < responseContent.length; i++) {
//         await new Promise((resolve) => setTimeout(resolve, 10)) // Adjust timing for realistic effect
//         displayedContent += responseContent[i]
//         setStreamedContent(displayedContent)
//       }

//       // Add the complete message to the messages array
//       const assistantMessage: Message = {
//         id: Date.now().toString(),
//         role: 'gemini',
//         content: responseContent,
//       }

//       setMessages([...messages, userMessage, assistantMessage])
//       setIsStreaming(false)
//       setStreamedContent('')

//       // Clear files after successful submission
//       setFiles([])
//       setFileAnalysisMode({})

//       // Reset checkboxes after submission
//       // setFetchCases(false)
//       // setFetchNews(false)
//       // setSummarize(false)
//     } catch (error) {
//       console.error('Error sending message:', error)
//       // Show error message to user
//       const errorMessage: Message = {
//         id: Date.now().toString(),
//         role: 'system',
//         content: 'Failed to get a response. Please try again.',
//       }
//       setMessages([...messages, userMessage, errorMessage])
//     } finally {
//       setIsLoading(false)
//       setIsStreaming(false)
//     }
//   }

//   const handleVoiceInput = (transcript: string) => {
//     setInput(input + transcript)
//     setIsRecording(false)
//   }

//   const handleFileSelect = (
//     selectedFiles: File[],
//     analysisTypes: Record<string, 'text_only' | 'visual' | 'full'>
//   ) => {
//     setFiles((prev) => [...prev, ...selectedFiles])
//     // Update file analysis modes
//     setFileAnalysisMode((prev) => ({ ...prev, ...analysisTypes }))
//     setShowFileUpload(false)
//   }

//   const removeFile = (index: number) => {
//     const fileToRemove = files[index]
//     setFiles(files.filter((_, i) => i !== index))
//     // Remove the file's analysis mode from state
//     if (fileToRemove) {
//       const updatedAnalysisModes = { ...fileAnalysisMode }
//       delete updatedAnalysisModes[fileToRemove.name]
//       setFileAnalysisMode(updatedAnalysisModes)
//     }
//   }

//   const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
//     if (e.key === 'Enter' && !e.shiftKey) {
//       e.preventDefault()
//       const form = e.currentTarget.form
//       if (form) form.requestSubmit()
//     }
//   }

//   const shareCurrentChat = () => {
//     // In a real app, this would generate a shareable link for the current conversation
//     if (sessionId) {
//       const shareableUrl = `${window.location.origin}/chat/${sessionId}`
//       navigator.clipboard
//         .writeText(shareableUrl)
//         .then(() => {
//           toast.success('Chat link copied to clipboard!')
//         })
//         .catch(() => {
//           toast.info(`Share this chat with ID: ${sessionId}`)
//         })
//     } else {
//       toast.error('Cannot share until the conversation is saved.')
//     }
//   }

//   const toggleVoiceMode = () => {
//     setIsVoiceMode(!isVoiceMode)
//     if (!isVoiceMode) {
//       // When enabling voice mode, start recording
//       setIsRecording(true)
//     } else {
//       // When disabling voice mode, stop recording
//       setIsRecording(false)
//     }
//   }

//   // Function to handle text-to-speech
//   const handleTextToSpeech = (text: string) => {
//     const utterance = new SpeechSynthesisUtterance(text)
//     window.speechSynthesis.speak(utterance)
//   }

//   return (
//     <div className='flex flex-col w-full h-screen overflow-hidden'>
//       {/* Header */}
//       <div className='h-14 border-b border-border flex items-center justify-between px-6'>
//         <div className='flex items-center'>
//           <h1 className='font-semibold'>
//             {sessionId
//               ? `Chat ${sessionId.substring(0, 8)}...`
//               : 'New Conversation'}
//           </h1>
//         </div>
//         <div className='flex items-center gap-2'>
//           <ThemeToggle />
//           <Button
//             variant='ghost'
//             size='icon'
//             onClick={shareCurrentChat}
//             title='Share this chat'
//           >
//             <Share2 size={18} />
//           </Button>
//           <UserProfile />
//         </div>
//       </div>

//       {/* Main Layout */}
//       <div className='flex flex-col flex-1 overflow-hidden'>
//         {/* File Display Area */}
//         {files.length > 0 && (
//           <div className='border-b border-border'>
//             <FileDisplay
//               files={files}
//               onRemove={removeFile}
//               analysisModes={fileAnalysisMode}
//               onChangeAnalysisMode={(fileName, mode) => {
//                 setFileAnalysisMode((prev) => ({ ...prev, [fileName]: mode }))
//               }}
//             />
//           </div>
//         )}

//         {/* Messages Area */}
//         <div className='flex-1 overflow-hidden' ref={scrollAreaRef}>
//           <ScrollArea className='h-full'>
//             <div className='p-4'>
//               {messages.length === 0 ? (
//                 <div className='h-full flex flex-col items-center justify-center text-center p-8'>
//                   <Bot size={48} className='text-muted-foreground mb-4' />
//                   <h2 className='text-2xl font-bold mb-2'>
//                     How can I help you today?
//                   </h2>
//                   <p className='text-muted-foreground max-w-md'>
//                     Ask me anything! I can help with information, creative
//                     tasks, problem-solving, and more. You can also upload files
//                     for analysis.
//                   </p>
//                 </div>
//               ) : (
//                 <div className='space-y-6 pb-4'>
//                   {messages.map((message) => (
//                     <div key={message.id} className='mb-4'>
//                       <MessageItem
//                         message={message}
//                         onTextToSpeech={handleTextToSpeech}
//                         // sidebarOpen={sidebarOpen}
//                       />
//                     </div>
//                   ))}

//                   {/* Streaming message */}
//                   {isStreaming && streamedContent && (
//                     <div className='flex items-start gap-3 mb-4'>
//                       <div className='h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground'>
//                         <Bot size={18} />
//                       </div>
//                       <div className='flex-1'>
//                         <div className='prose dark:prose-invert'>
//                           {streamedContent}
//                           <span className='animate-pulse'>▋</span>
//                         </div>
//                       </div>
//                     </div>
//                   )}

//                   <div ref={messagesEndRef} />
//                 </div>
//               )}
//             </div>
//           </ScrollArea>
//         </div>

//         {/* Input Area */}
//         <div className='border-t border-border p-4'>
//           {/* Voice Input */}
//           {isRecording && (
//             <VoiceInput
//               onTranscript={handleVoiceInput}
//               onCancel={() => {
//                 setIsRecording(false)
//                 if (isVoiceMode) setIsVoiceMode(false)
//               }}
//               autoSubmit={isVoiceMode}
//             />
//           )}

//           {/* File Upload Dialog */}
//           {showFileUpload && (
//             <FileUpload
//               onFileSelect={handleFileSelect}
//               onClose={() => setShowFileUpload(false)}
//             />
//           )}

//           {/* Text Input Form */}
//           <form onSubmit={handleSubmit} className='relative'>
//             <Textarea
//               value={input}
//               onChange={handleInputChange}
//               onKeyDown={handleKeyDown}
//               placeholder={
//                 isVoiceMode
//                   ? 'Listening for voice input...'
//                   : 'Type a message...'
//               }
//               className='min-h-[60px] w-full resize-none pr-24 py-3 mb-2'
//               disabled={isLoading || isVoiceMode}
//             />

//             {/* Checkboxes */}
//             <div className='flex items-center gap-6 mb-2 px-2'>
//               <div className='flex items-center space-x-2'>
//                 <Checkbox
//                   id='fetch-cases'
//                   checked={fetchCases}
//                   onCheckedChange={(checked) => setFetchCases(checked === true)}
//                 />
//                 <Label htmlFor='fetch-cases' className='text-sm font-medium'>
//                   Fetch Cases
//                 </Label>
//               </div>

//               <div className='flex items-center space-x-2'>
//                 <Checkbox
//                   id='fetch-news'
//                   checked={fetchNews}
//                   onCheckedChange={(checked) => setFetchNews(checked === true)}
//                 />
//                 <Label htmlFor='fetch-news' className='text-sm font-medium'>
//                   Fetch News
//                 </Label>
//               </div>

//               <div className='flex items-center space-x-2'>
//                 <Checkbox
//                   id='summarize'
//                   checked={summarize}
//                   onCheckedChange={(checked) => setSummarize(checked === true)}
//                 />
//                 <Label htmlFor='summarize' className='text-sm font-medium'>
//                   Summarize
//                 </Label>
//               </div>
//             </div>

//             <div className='absolute right-2 bottom-12 flex items-center gap-1'>
//               <Button
//                 type='button'
//                 size='icon'
//                 variant={isVoiceMode ? 'default' : 'ghost'}
//                 onClick={toggleVoiceMode}
//                 className={cn(
//                   'transition-all duration-200',
//                   isVoiceMode ? 'bg-primary text-primary-foreground' : ''
//                 )}
//                 title={isVoiceMode ? 'Disable voice mode' : 'Enable voice mode'}
//               >
//                 {isVoiceMode ? <Volume2 size={18} /> : <Mic size={18} />}
//               </Button>
//               <Button
//                 type='button'
//                 size='icon'
//                 variant='ghost'
//                 onClick={() => setShowFileUpload(true)}
//                 disabled={isLoading}
//                 title='Attach files'
//                 className='transition-all duration-200 hover:bg-muted'
//               >
//                 <Paperclip size={18} />
//               </Button>
//               <Button
//                 type='submit'
//                 size='icon'
//                 disabled={
//                   (input.trim() === '' && files.length === 0) || isLoading
//                 }
//                 title='Send message'
//                 className='transition-all duration-200'
//               >
//                 <Send size={18} />
//               </Button>
//             </div>
//           </form>
//         </div>
//       </div>
//     </div>
//   )
// }
'use client'

import type React from 'react'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send, Mic, Paperclip, Bot, Share2, Volume2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import VoiceInput from './voice-input'
import FileUpload from './file-upload'
import UserProfile from './user-profile'
import ThemeToggle from './theme-toggle'
import FileDisplay from './file-display'
import MessageItem from './message-item'
import axios from 'axios'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

// API base URL - make it configurable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081'

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

interface ChatInterfaceProps {
  sidebarOpen: boolean
  toggleSidebar: () => void
  sessionId: string | null
  messages: Message[]
  setMessages: (messages: Message[]) => void
  isLoading: boolean
  setIsLoading: (isLoading: boolean) => void
}

export default function ChatInterface({
  sidebarOpen,
  toggleSidebar,
  sessionId,
  messages,
  setMessages,
  isLoading,
  setIsLoading,
}: ChatInterfaceProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [fileAnalysisMode, setFileAnalysisMode] = useState<
    Record<string, 'text_only' | 'visual' | 'full'>
  >({})
  const [isVoiceMode, setIsVoiceMode] = useState(false)
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamedContent, setStreamedContent] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // State for checkboxes
  const [fetchCases, setFetchCases] = useState(false)
  const [fetchNews, setFetchNews] = useState(false)
  const [summarize, setSummarize] = useState(false)

  // Improved scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, streamedContent])

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() === '' && files.length === 0) return

    // Add file metadata to message
    const fileMetadata = files.map((file) => ({
      name: file.name,
      type: file.type,
      size: file.size,
      analysisMode: fileAnalysisMode[file.name] || 'text_only',
    }))

    // Add user message to chat
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      files: files.length > 0 ? fileMetadata : undefined,
    }

    setMessages([...messages, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Create FormData for file upload
      const formData = new FormData()
      formData.append('message', input)
      if (sessionId) {
        formData.append('session_id', sessionId)
      }

      // Append files to formData
      files.forEach((file, index) => {
        formData.append(`file${index}`, file)
        // Add analysis mode for each file
        const mode = fileAnalysisMode[file.name] || 'text_only'
        formData.append(`analysisMode${index}`, mode)
        // Is this a scanned document?
        const isScanned = mode === 'visual' || mode === 'full'
        formData.append(`isScanned${index}`, isScanned.toString())
      })

      // Add checkbox values to formData
      formData.append('fetchCases', fetchCases.toString())
      formData.append('fetchNews', fetchNews.toString())
      formData.append('summarize', summarize.toString())

      // Send message and files to API
      const response = await axios.post(`${API_BASE_URL}/api/chat`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      console.log(response.data)

      // Start streaming effect
      setIsStreaming(true)

      // Simulate streaming by displaying the response character by character
      const responseContent = response.data.response
      let displayedContent = ''

      for (let i = 0; i < responseContent.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 10)) // Adjust timing for realistic effect
        displayedContent += responseContent[i]
        setStreamedContent(displayedContent)
      }

      // Add the complete message to the messages array
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'gemini',
        content: responseContent,
      }

      setMessages([...messages, userMessage, assistantMessage])
      setIsStreaming(false)
      setStreamedContent('')

      // Clear files after successful submission
      setFiles([])
      setFileAnalysisMode({})

      // Reset checkboxes after submission
      // setFetchCases(false)
      // setFetchNews(false)
      // setSummarize(false)
    } catch (error) {
      console.error('Error sending message:', error)
      // Show error message to user
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'system',
        content: 'Failed to get a response. Please try again.',
      }
      setMessages([...messages, userMessage, errorMessage])
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
    }
  }

  const handleVoiceInput = (transcript: string) => {
    setInput(input + transcript)
    setIsRecording(false)
  }

  const handleFileSelect = (
    selectedFiles: File[],
    analysisTypes: Record<string, 'text_only' | 'visual' | 'full'>
  ) => {
    setFiles((prev) => [...prev, ...selectedFiles])
    // Update file analysis modes
    setFileAnalysisMode((prev) => ({ ...prev, ...analysisTypes }))
    setShowFileUpload(false)
  }

  const removeFile = (index: number) => {
    const fileToRemove = files[index]
    setFiles(files.filter((_, i) => i !== index))
    // Remove the file's analysis mode from state
    if (fileToRemove) {
      const updatedAnalysisModes = { ...fileAnalysisMode }
      delete updatedAnalysisModes[fileToRemove.name]
      setFileAnalysisMode(updatedAnalysisModes)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const form = e.currentTarget.form
      if (form) form.requestSubmit()
    }
  }

  const shareCurrentChat = () => {
    // In a real app, this would generate a shareable link for the current conversation
    if (sessionId) {
      const shareableUrl = `${window.location.origin}/chat/${sessionId}`
      navigator.clipboard
        .writeText(shareableUrl)
        .then(() => {
          toast.success('Chat link copied to clipboard!')
        })
        .catch(() => {
          toast.info(`Share this chat with ID: ${sessionId}`)
        })
    } else {
      toast.error('Cannot share until the conversation is saved.')
    }
  }

  const toggleVoiceMode = () => {
    setIsVoiceMode(!isVoiceMode)
    if (!isVoiceMode) {
      // When enabling voice mode, start recording
      setIsRecording(true)
    } else {
      // When disabling voice mode, stop recording
      setIsRecording(false)
    }
  }

  // Function to handle text-to-speech
  const handleTextToSpeech = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text)
    window.speechSynthesis.speak(utterance)
  }

  return (
    <div className='flex flex-col w-full h-screen overflow-hidden'>
      {/* Header */}
      <div className='h-14 border-b border-border flex items-center justify-between px-6'>
        <div className='flex items-center'>
          <h1 className='font-semibold'>
            {sessionId
              ? `Chat ${sessionId.substring(0, 8)}...`
              : 'New Conversation'}
          </h1>
        </div>
        <div className='flex items-center gap-2'>
          <ThemeToggle />
          <Button
            variant='ghost'
            size='icon'
            onClick={shareCurrentChat}
            title='Share this chat'
          >
            <Share2 size={18} />
          </Button>
          <UserProfile />
        </div>
      </div>

      {/* Main Layout */}
      <div className='flex flex-col flex-1 overflow-hidden'>
        {/* File Display Area */}
        {files.length > 0 && (
          <div className='border-b border-border'>
            <FileDisplay
              files={files}
              onRemove={removeFile}
              analysisModes={fileAnalysisMode}
              onChangeAnalysisMode={(fileName, mode) => {
                setFileAnalysisMode((prev) => ({ ...prev, [fileName]: mode }))
              }}
            />
          </div>
        )}

        {/* Messages Area */}
        <div className='flex-1 overflow-hidden' ref={scrollAreaRef}>
          <ScrollArea className='h-full'>
            <div className='p-4'>
              {messages.length === 0 ? (
                <div className='h-full flex flex-col items-center justify-center text-center p-8'>
                  <Bot size={48} className='text-muted-foreground mb-4' />
                  <h2 className='text-2xl font-bold mb-2'>
                    How can I help you today?
                  </h2>
                  <p className='text-muted-foreground max-w-md'>
                    Ask me anything! I can help with information, creative
                    tasks, problem-solving, and more. You can also upload files
                    for analysis.
                  </p>
                </div>
              ) : (
                <div className='space-y-6 pb-4'>
                  {messages.map((message) => (
                    <div key={message.id} className='mb-4'>
                      <MessageItem
                        message={message}
                        onTextToSpeech={handleTextToSpeech}
                      />
                    </div>
                  ))}

                  {/* Streaming message */}
                  {isStreaming && streamedContent && (
                    <div className='flex items-start gap-3 mb-4'>
                      <div className='h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground'>
                        <Bot size={18} />
                      </div>
                      <div className='flex-1'>
                        <div className='prose dark:prose-invert'>
                          {streamedContent}
                          <span className='animate-pulse'>▋</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Input Area */}
        <div className='border-t border-border p-4'>
          {/* Voice Input */}
          {isRecording && (
            <VoiceInput
              onTranscript={handleVoiceInput}
              onCancel={() => {
                setIsRecording(false)
                if (isVoiceMode) setIsVoiceMode(false)
              }}
              autoSubmit={isVoiceMode}
            />
          )}

          {/* File Upload Dialog */}
          {showFileUpload && (
            <FileUpload
              onFileSelect={handleFileSelect}
              onClose={() => setShowFileUpload(false)}
            />
          )}

          {/* Text Input Form */}
          <form onSubmit={handleSubmit} className='relative'>
            <Textarea
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={
                isVoiceMode
                  ? 'Listening for voice input...'
                  : 'Type a message...'
              }
              className='min-h-[60px] w-full resize-none pr-24 py-3 mb-2'
              disabled={isLoading || isVoiceMode}
            />

            {/* Checkboxes */}
            <div className='flex items-center gap-6 mb-2 px-2'>
              <div className='flex items-center space-x-2'>
                <Checkbox
                  id='fetch-cases'
                  checked={fetchCases}
                  onCheckedChange={(checked) => setFetchCases(checked === true)}
                />
                <Label htmlFor='fetch-cases' className='text-sm font-medium'>
                  Fetch Cases
                </Label>
              </div>

              <div className='flex items-center space-x-2'>
                <Checkbox
                  id='fetch-news'
                  checked={fetchNews}
                  onCheckedChange={(checked) => setFetchNews(checked === true)}
                />
                <Label htmlFor='fetch-news' className='text-sm font-medium'>
                  Fetch News
                </Label>
              </div>

              <div className='flex items-center space-x-2'>
                <Checkbox
                  id='summarize'
                  checked={summarize}
                  onCheckedChange={(checked) => setSummarize(checked === true)}
                />
                <Label htmlFor='summarize' className='text-sm font-medium'>
                  Summarize
                </Label>
              </div>
            </div>

            <div className='absolute right-2 bottom-12 flex items-center gap-1'>
              <Button
                type='button'
                size='icon'
                variant={isVoiceMode ? 'default' : 'ghost'}
                onClick={toggleVoiceMode}
                className={cn(
                  'transition-all duration-200',
                  isVoiceMode ? 'bg-primary text-primary-foreground' : ''
                )}
                title={isVoiceMode ? 'Disable voice mode' : 'Enable voice mode'}
              >
                {isVoiceMode ? <Mic size={18} /> : <Mic size={18} />}
              </Button>
              <Button
                type='button'
                size='icon'
                variant='ghost'
                onClick={() => setShowFileUpload(true)}
                disabled={isLoading}
                title='Attach files'
                className='transition-all duration-200 hover:bg-muted'
              >
                <Paperclip size={18} />
              </Button>
              <Button
                type='submit'
                size='icon'
                disabled={
                  (input.trim() === '' && files.length === 0) || isLoading
                }
                title='Send message'
                className='transition-all duration-200'
              >
                <Send size={18} />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}