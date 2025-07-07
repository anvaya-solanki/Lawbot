'use client'

import React, { useEffect, useState } from 'react'
import {
  Bot,
  User,
  Volume2,
  FileText,
  CheckCircle,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { toast } from 'sonner'
import remarkGfm from 'remark-gfm'

interface MessageProps {
  message: {
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
    metadata?: {
      fetchCases: boolean
      fetchNews: boolean
      summarize: boolean
    }
    additionalContext?: {
      legal_cases?: string
      news_articles?: string
      summary?: string
    }
  }
  onTextToSpeech: (text: string) => void
  isStreaming?: boolean
}

export default function MessageItem({
  message,
  onTextToSpeech,
  isStreaming = false,
}: MessageProps) {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'gemini'
  const isSystem = message.role === 'system'
  const [copied, setCopied] = useState(false)
  const [rated, setRated] = useState<'up' | 'down' | null>(null)

  // Handle file information display
  const hasFiles = message.files && message.files.length > 0

  // Check for additional context data
  const hasLegalCases = message.additionalContext?.legal_cases
  const hasNewsArticles = message.additionalContext?.news_articles
  const hasSummary = message.additionalContext?.summary
  const hasAdditionalContent = hasLegalCases || hasNewsArticles || hasSummary

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Content copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRate = (rating: 'up' | 'down') => {
    setRated(rating)
    toast.success(`Thank you for your feedback${rating === 'up' ? '!' : '.'}`)
  }

  return (
    <div
      className={cn('flex items-start gap-3 w-full', isUser ? 'flex-row-reverse' : '')}
      style={{
        justifyContent: isUser ? 'flex-end' : 'flex-start' // Force alignment
      }}
    >
      {/* Avatar */}
      <div
        className={cn(
          'h-8 w-8 rounded-full flex items-center justify-center',
          isUser
            ? 'bg-secondary text-secondary-foreground'
            : isAssistant
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
        )}
      >
        {isUser ? (
          <User size={18} />
        ) : isAssistant ? (
          <Bot size={18} />
        ) : (
          <FileText size={18} />
        )}
      </div>

      {/* Message Content */}
      <div
        className={cn('flex-1 max-w-[85%]')}
        style={{
          marginLeft: isUser ? 'auto' : '0', // Push user messages right
          marginRight: isUser ? '0' : 'auto', // Push assistant messages left
          display: 'flex',
          flexDirection: 'column',
          alignItems: isUser ? 'flex-end' : 'flex-start', // Align the content container
          wordBreak: 'break-word',
        }}
      >
        {/* Checkbox Indicators (for assistant messages) */}
        {isAssistant && message.metadata && (
          <div className='flex gap-2 mb-1 self-start'>
            {message.metadata.fetchCases && (
              <Badge variant='outline' className='flex items-center gap-1'>
                <CheckCircle size={12} />
                <span className='text-xs'>Cases</span>
              </Badge>
            )}
            {message.metadata.fetchNews && (
              <Badge variant='outline' className='flex items-center gap-1'>
                <CheckCircle size={12} />
                <span className='text-xs'>News</span>
              </Badge>
            )}
            {message.metadata.summarize && (
              <Badge variant='outline' className='flex items-center gap-1'>
                <CheckCircle size={12} />
                <span className='text-xs'>Summary</span>
              </Badge>
            )}
          </div>
        )}

        {/* File information */}
        {hasFiles && (
          <div className='mb-2 self-start w-full'>
            <div className='text-sm text-muted-foreground'>
              Attached {message.files!.length} file
              {message.files!.length !== 1 ? 's' : ''}:
            </div>
            <div className='flex flex-wrap gap-2 mt-1'>
              {message.files!.map((file, index) => (
                <Badge
                  key={index}
                  variant='secondary'
                  className='flex items-center gap-1'
                >
                  <FileText size={12} />
                  <span className='text-xs truncate max-w-[150px]'>
                    {file.name}
                    {file.analysisMode && ` (${file.analysisMode})`}
                  </span>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Message Text Content - This is the key part for alignment and styling */}
        <div
          className={cn(
            'prose dark:prose-invert max-w-none p-3 rounded-lg',
            isUser
              ? 'bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-900'
              : isSystem
                ? 'bg-muted/30 text-muted-foreground italic'
                : 'bg-gray-100 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700'
          )}
          style={{
            textAlign: 'left', // Always keep text left-aligned for readability
            alignSelf: isUser ? 'flex-end' : 'flex-start', // This positions the content block
            minWidth: isUser ? 'auto' : '100%', // Allow user messages to shrink to fit content
            maxWidth: '100%', // Prevent overflow
            // wordBreak: 'break-word'
          }}
        >
          <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ href, children }) => (
              <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'blue', textDecoration: 'underline', position: 'relative', zIndex: '15' }} onMouseOver={(e) =>
                ((e.currentTarget) as HTMLAnchorElement).style.color = '#1e40af'
              }
              onMouseOut={(e) =>
                ((e.currentTarget) as HTMLAnchorElement).style.color = 'blue'
              }>
                {children}
              </a>
            ),
          }}
          >{message.content}</ReactMarkdown>
          


          {isStreaming && <span className='animate-pulse'>▋</span>}
        </div>

        {/* Additional Context Accordion (Legal Cases, News, Summary) */}
        {hasAdditionalContent && !isUser && (
          <div className='mt-4 self-start w-full'>
            <Accordion type='single' collapsible className='w-full'>
              {hasLegalCases && (
                <AccordionItem value='legal-cases'>
                  <AccordionTrigger className='text-sm font-medium'>
                    Legal Cases
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className='p-3 bg-muted/30 rounded-md text-sm overflow-auto max-h-64'>
                      <ReactMarkdown>
                        {message.additionalContext!.legal_cases!}
                      </ReactMarkdown>
                    </div>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() =>
                        copyToClipboard(message.additionalContext!.legal_cases!)
                      }
                      className='mt-2'
                    >
                      {copied ? (
                        <Check size={14} className='mr-1' />
                      ) : (
                        <Copy size={14} className='mr-1' />
                      )}
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                  </AccordionContent>
                </AccordionItem>
              )}

              {hasNewsArticles && (
                <AccordionItem value='news'>
                  <AccordionTrigger className='text-sm font-medium'>
                    News Articles
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className='p-3 bg-muted/30 rounded-md text-sm overflow-auto max-h-64'>
                      <ReactMarkdown>
                        {message.additionalContext!.news_articles!}
                      </ReactMarkdown>
                    </div>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() =>
                        copyToClipboard(
                          message.additionalContext!.news_articles!
                        )
                      }
                      className='mt-2'
                    >
                      {copied ? (
                        <Check size={14} className='mr-1' />
                      ) : (
                        <Copy size={14} className='mr-1' />
                      )}
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                  </AccordionContent>
                </AccordionItem>
              )}

              {hasSummary && (
                <AccordionItem value='summary'>
                  <AccordionTrigger className='text-sm font-medium'>
                    Summary
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className='p-3 bg-muted/30 rounded-md text-sm'>
                      <ReactMarkdown>
                        {message.additionalContext!.summary!}
                      </ReactMarkdown>
                    </div>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() =>
                        copyToClipboard(message.additionalContext!.summary!)
                      }
                      className='mt-2'
                    >
                      {copied ? (
                        <Check size={14} className='mr-1' />
                      ) : (
                        <Copy size={14} className='mr-1' />
                      )}
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </div>
        )}

        {/* Action buttons for assistant messages */}
        {isAssistant && !isStreaming && (
          <div className='mt-3 flex gap-2 self-start'>
            <Button
              size='sm'
              variant='ghost'
              className='h-8 px-2 text-muted-foreground hover:text-foreground'
              onClick={() => onTextToSpeech(message.content)}
            >
              <Volume2 size={16} className='mr-1' />
              <span className='text-xs'>Listen</span>
            </Button>

            <Button
              size='sm'
              variant='ghost'
              className='h-8 px-2 text-muted-foreground hover:text-foreground'
              onClick={() => copyToClipboard(message.content)}
            >
              {copied ? (
                <Check size={16} className='mr-1' />
              ) : (
                <Copy size={16} className='mr-1' />
              )}
              <span className='text-xs'>{copied ? 'Copied' : 'Copy'}</span>
            </Button>

            <Button
              size='sm'
              variant={rated === 'up' ? 'secondary' : 'ghost'}
              className='h-8 px-2 text-muted-foreground hover:text-foreground'
              onClick={() => handleRate('up')}
            >
              <ThumbsUp size={16} className='mr-1' />
            </Button>

            <Button
              size='sm'
              variant={rated === 'down' ? 'secondary' : 'ghost'}
              className='h-8 px-2 text-muted-foreground hover:text-foreground'
              onClick={() => handleRate('down')}
            >
              <ThumbsDown size={16} />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

















// 'use client'

// import React, { useState } from 'react'
// import {
//   Bot,
//   User,
//   Volume2,
//   FileText,
//   CheckCircle,
//   Copy,
//   Check,
//   ThumbsUp,
//   ThumbsDown,
// } from 'lucide-react'
// import { Button } from '@/components/ui/button'
// import { Badge } from '@/components/ui/badge'
// import { cn } from '@/lib/utils'
// import ReactMarkdown from 'react-markdown'
// import {
//   Accordion,
//   AccordionContent,
//   AccordionItem,
//   AccordionTrigger,
// } from '@/components/ui/accordion'
// import { toast } from 'sonner'

// interface MessageProps {
//   message: {
//     id: string
//     role: 'user' | 'gemini' | 'system'
//     content: string
//     files?: {
//       name: string
//       type: string
//       size: number
//       analysisMode?: 'text_only' | 'visual' | 'full'
//     }[]
//     extractedText?: string
//     metadata?: {
//       fetchCases: boolean
//       fetchNews: boolean
//       summarize: boolean
//     }
//     additionalContext?: {
//       legal_cases?: string
//       news_articles?: string
//       summary?: string
//     }
//   }
//   onTextToSpeech: (text: string) => void
//   isStreaming?: boolean
// }

// export default function MessageItem({
//   message,
//   onTextToSpeech,
//   isStreaming = false,
// }: MessageProps) {
//   const isUser = message.role === 'user'
//   const isAssistant = message.role === 'gemini'
//   const isSystem = message.role === 'system'
//   const [copied, setCopied] = useState(false)
//   const [rated, setRated] = useState<'up' | 'down' | null>(null)

//   // Handle file information display
//   const hasFiles = message.files && message.files.length > 0

//   // Check for additional context data
//   const hasLegalCases = message.additionalContext?.legal_cases
//   const hasNewsArticles = message.additionalContext?.news_articles
//   const hasSummary = message.additionalContext?.summary
//   const hasAdditionalContent = hasLegalCases || hasNewsArticles || hasSummary

//   const copyToClipboard = (text: string) => {
//     navigator.clipboard.writeText(text)
//     setCopied(true)
//     toast.success('Content copied to clipboard')
//     setTimeout(() => setCopied(false), 2000)
//   }

//   const handleRate = (rating: 'up' | 'down') => {
//     setRated(rating)
//     toast.success(`Thank you for your feedback${rating === 'up' ? '!' : '.'}`)
//   }

//   return (
//     <div
//       className={cn('flex items-start gap-3 w-full', isUser ? 'flex-row-reverse' : '')}
//       style={{
//         justifyContent: isUser ? 'flex-end' : 'flex-start' // Force alignment
//       }}
//     >
//       {/* Avatar */}
//       <div
//         className={cn(
//           'h-8 w-8 rounded-full flex items-center justify-center',
//           isUser
//             ? 'bg-secondary text-secondary-foreground'
//             : isAssistant
//             ? 'bg-primary text-primary-foreground'
//             : 'bg-muted text-muted-foreground'
//         )}
//       >
//         {isUser ? (
//           <User size={18} />
//         ) : isAssistant ? (
//           <Bot size={18} />
//         ) : (
//           <FileText size={18} />
//         )}
//       </div>

//       {/* Message Content */}
//       <div
//         className={cn('flex-1 max-w-[85%]')}
//         style={{
//           marginLeft: isUser ? 'auto' : '0', // Push user messages right
//           marginRight: isUser ? '0' : 'auto', // Push assistant messages left
//           display: 'flex',
//           flexDirection: 'column',
//           alignItems: isUser ? 'flex-end' : 'flex-start' // Align the content container
//         }}
//       >
//         {/* Checkbox Indicators (for assistant messages) */}
//         {isAssistant && message.metadata && (
//           <div className='flex gap-2 mb-1 self-start'>
//             {message.metadata.fetchCases && (
//               <Badge variant='outline' className='flex items-center gap-1'>
//                 <CheckCircle size={12} />
//                 <span className='text-xs'>Cases</span>
//               </Badge>
//             )}
//             {message.metadata.fetchNews && (
//               <Badge variant='outline' className='flex items-center gap-1'>
//                 <CheckCircle size={12} />
//                 <span className='text-xs'>News</span>
//               </Badge>
//             )}
//             {message.metadata.summarize && (
//               <Badge variant='outline' className='flex items-center gap-1'>
//                 <CheckCircle size={12} />
//                 <span className='text-xs'>Summary</span>
//               </Badge>
//             )}
//           </div>
//         )}

//         {/* File information */}
//         {hasFiles && (
//           <div className='mb-2 self-start w-full'>
//             <div className='text-sm text-muted-foreground'>
//               Attached {message.files!.length} file
//               {message.files!.length !== 1 ? 's' : ''}:
//             </div>
//             <div className='flex flex-wrap gap-2 mt-1'>
//               {message.files!.map((file, index) => (
//                 <Badge
//                   key={index}
//                   variant='secondary'
//                   className='flex items-center gap-1'
//                 >
//                   <FileText size={12} />
//                   <span className='text-xs truncate max-w-[150px]'>
//                     {file.name}
//                     {file.analysisMode && ` (${file.analysisMode})`}
//                   </span>
//                 </Badge>
//               ))}
//             </div>
//           </div>
//         )}

//         {/* Message Text Content - This is the key part for alignment and styling */}
//         <div
//           className={cn(
//             'prose dark:prose-invert max-w-none p-3 rounded-lg',
//             isUser
//               ? 'bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-900'
//               : isSystem
//                 ? 'bg-muted/30 text-muted-foreground italic'
//                 : 'bg-gray-100 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700'
//           )}
//           style={{
//             textAlign: 'left', // Always keep text left-aligned for readability
//             alignSelf: isUser ? 'flex-end' : 'flex-start', // This positions the content block
//             minWidth: isUser ? 'auto' : '100%', // Allow user messages to shrink to fit content
//             maxWidth: '100%' // Prevent overflow
//           }}
//         >
//           <ReactMarkdown components={{
//             a: ({ href, children }) => (
//               <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'blue', textDecoration: 'underline' }}>
//                 {children}
//               </a>
//             ),
//           }}>{message.content}</ReactMarkdown>
//           {isStreaming && <span className='animate-pulse'>▋</span>}
//         </div>

//         {/* Additional Context Accordion (Legal Cases, News, Summary) */}
//         {hasAdditionalContent && !isUser && (
//           <div className='mt-4 self-start w-full'>
//             <Accordion type='single' collapsible className='w-full'>
//               {hasLegalCases && (
//                 <AccordionItem value='legal-cases'>
//                   <AccordionTrigger className='text-sm font-medium'>
//                     Legal Cases
//                   </AccordionTrigger>
//                   <AccordionContent>
//                     <div className='p-3 bg-muted/30 rounded-md text-sm overflow-auto max-h-64'>
//                       <ReactMarkdown>
//                         {message.additionalContext!.legal_cases!}
//                       </ReactMarkdown>
//                     </div>
//                     <Button
//                       variant='ghost'
//                       size='sm'
//                       onClick={() =>
//                         copyToClipboard(message.additionalContext!.legal_cases!)
//                       }
//                       className='mt-2'
//                     >
//                       {copied ? (
//                         <Check size={14} className='mr-1' />
//                       ) : (
//                         <Copy size={14} className='mr-1' />
//                       )}
//                       {copied ? 'Copied' : 'Copy'}
//                     </Button>
//                   </AccordionContent>
//                 </AccordionItem>
//               )}

//               {hasNewsArticles && (
//                 <AccordionItem value='news'>
//                   <AccordionTrigger className='text-sm font-medium'>
//                     News Articles
//                   </AccordionTrigger>
//                   <AccordionContent>
//                     <div className='p-3 bg-muted/30 rounded-md text-sm overflow-auto max-h-64'>
//                       <ReactMarkdown>
//                         {message.additionalContext!.news_articles!}
//                       </ReactMarkdown>
//                     </div>
//                     <Button
//                       variant='ghost'
//                       size='sm'
//                       onClick={() =>
//                         copyToClipboard(
//                           message.additionalContext!.news_articles!
//                         )
//                       }
//                       className='mt-2'
//                     >
//                       {copied ? (
//                         <Check size={14} className='mr-1' />
//                       ) : (
//                         <Copy size={14} className='mr-1' />
//                       )}
//                       {copied ? 'Copied' : 'Copy'}
//                     </Button>
//                   </AccordionContent>
//                 </AccordionItem>
//               )}

//               {hasSummary && (
//                 <AccordionItem value='summary'>
//                   <AccordionTrigger className='text-sm font-medium'>
//                     Summary
//                   </AccordionTrigger>
//                   <AccordionContent>
//                     <div className='p-3 bg-muted/30 rounded-md text-sm'>
//                       <ReactMarkdown>
//                         {message.additionalContext!.summary!}
//                       </ReactMarkdown>
//                     </div>
//                     <Button
//                       variant='ghost'
//                       size='sm'
//                       onClick={() =>
//                         copyToClipboard(message.additionalContext!.summary!)
//                       }
//                       className='mt-2'
//                     >
//                       {copied ? (
//                         <Check size={14} className='mr-1' />
//                       ) : (
//                         <Copy size={14} className='mr-1' />
//                       )}
//                       {copied ? 'Copied' : 'Copy'}
//                     </Button>
//                   </AccordionContent>
//                 </AccordionItem>
//               )}
//             </Accordion>
//           </div>
//         )}

//         {/* Action buttons for assistant messages */}
//         {isAssistant && !isStreaming && (
//           <div className='mt-3 flex gap-2 self-start'>
//             <Button
//               size='sm'
//               variant='ghost'
//               className='h-8 px-2 text-muted-foreground hover:text-foreground'
//               onClick={() => onTextToSpeech(message.content)}
//             >
//               <Volume2 size={16} className='mr-1' />
//               <span className='text-xs'>Listen</span>
//             </Button>

//             <Button
//               size='sm'
//               variant='ghost'
//               className='h-8 px-2 text-muted-foreground hover:text-foreground'
//               onClick={() => copyToClipboard(message.content)}
//             >
//               {copied ? (
//                 <Check size={16} className='mr-1' />
//               ) : (
//                 <Copy size={16} className='mr-1' />
//               )}
//               <span className='text-xs'>{copied ? 'Copied' : 'Copy'}</span>
//             </Button>

//             <Button
//               size='sm'
//               variant={rated === 'up' ? 'secondary' : 'ghost'}
//               className='h-8 px-2 text-muted-foreground hover:text-foreground'
//               onClick={() => handleRate('up')}
//             >
//               <ThumbsUp size={16} className='mr-1' />
//             </Button>

//             <Button
//               size='sm'
//               variant={rated === 'down' ? 'secondary' : 'ghost'}
//               className='h-8 px-2 text-muted-foreground hover:text-foreground'
//               onClick={() => handleRate('down')}
//             >
//               <ThumbsDown size={16} />
//             </Button>
//           </div>
//         )}
//       </div>
//     </div>
//   )
// }