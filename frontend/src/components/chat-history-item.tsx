"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { MessageSquare, Trash2, MoreHorizontal, Pencil, Share2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface Chat {
  id: string
  title: string
  lastMessage: string
  timestamp: Date
}

interface ChatHistoryItemProps {
  chat: Chat
  isActive: boolean
  onClick: () => void
  onDelete: () => void
  onRename: (newTitle: string) => void
  onShare: () => void
}

export default function ChatHistoryItem({
  chat,
  isActive,
  onClick,
  onDelete,
  onRename,
  onShare,
}: ChatHistoryItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [newTitle, setNewTitle] = useState(chat.title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isEditing])

  const handleRename = () => {
    if (newTitle.trim()) {
      onRename(newTitle.trim())
      setIsEditing(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleRename()
    } else if (e.key === "Escape") {
      setNewTitle(chat.title)
      setIsEditing(false)
    }
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-accent/50 group",
        isActive && "bg-accent",
      )}
      onClick={isEditing ? undefined : onClick}
    >
      <div className="flex items-center gap-2 overflow-hidden flex-1">
        <MessageSquare size={16} className="shrink-0 text-muted-foreground" />

        {isEditing ? (
          <Input
            ref={inputRef}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onBlur={handleRename}
            onKeyDown={handleKeyDown}
            className="h-7 py-1"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div className="truncate">
            <div className="font-medium truncate">{chat.title}</div>
            <div className="text-xs text-muted-foreground truncate">{chat.lastMessage}</div>
          </div>
        )}
      </div>

      {!isEditing && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal size={14} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                setIsEditing(true)
              }}
            >
              <Pencil size={14} className="mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                onShare()
              }}
            >
              <Share2 size={14} className="mr-2" />
              Share
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
            >
              <Trash2 size={14} className="mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
