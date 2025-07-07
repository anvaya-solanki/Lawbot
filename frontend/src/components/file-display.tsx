'use client'

import { FileIcon, X, FileText, FileImage, FileSearch } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface FileDisplayProps {
  files: File[]
  onRemove: (index: number) => void
  analysisModes: Record<string, 'text_only' | 'visual' | 'full'>
  onChangeAnalysisMode: (
    fileName: string,
    mode: 'text_only' | 'visual' | 'full'
  ) => void
}

export default function FileDisplay({
  files,
  onRemove,
  analysisModes,
  onChangeAnalysisMode,
}: FileDisplayProps) {
  if (files.length === 0) return null

  const getFileColor = (file: File) => {
    const type = file.type
    if (type.includes('pdf')) return 'bg-red-500'
    if (type.startsWith('image/')) return 'bg-blue-500'
    if (type.includes('word') || type.includes('document')) return 'bg-blue-700'
    if (type.includes('excel') || type.includes('sheet')) return 'bg-green-600'
    if (type.includes('powerpoint') || type.includes('presentation'))
      return 'bg-orange-500'
    return 'bg-gray-500'
  }

  const getFileType = (file: File) => {
    const type = file.type
    if (type.includes('pdf')) return 'PDF'
    if (type.startsWith('image/')) return type.split('/')[1].toUpperCase()
    if (type.includes('word') || type.includes('document')) return 'DOC'
    if (type.includes('excel') || type.includes('sheet')) return 'XLS'
    if (type.includes('powerpoint') || type.includes('presentation'))
      return 'PPT'
    return 'FILE'
  }

  const getAnalysisModeIcon = (mode: string) => {
    switch (mode) {
      case 'text_only':
        return <FileText size={14} />
      case 'visual':
        return <FileImage size={14} />
      case 'full':
        return <FileSearch size={14} />
      default:
        return <FileText size={14} />
    }
  }

  const getAnalysisModeName = (mode: string) => {
    switch (mode) {
      case 'text_only':
        return 'Text'
      case 'visual':
        return 'Visual'
      case 'full':
        return 'Full'
      default:
        return 'Text'
    }
  }

  return (
    <div className='border-b border-border bg-background/80 backdrop-blur-sm p-2 transition-all duration-300 animate-in fade-in slide-in-from-top-2'>
      <div className='flex flex-col max-h-[200px] overflow-y-auto'>
        <div className='flex flex-wrap gap-2 p-2'>
          {files.map((file, index) => (
            <div
              key={index}
              className='flex items-center gap-2 bg-muted/50 rounded-lg p-1 pr-2 group hover:bg-muted transition-colors duration-200'
            >
              <div
                className={cn(
                  'w-10 h-10 rounded-md flex items-center justify-center text-white',
                  getFileColor(file)
                )}
              >
                <FileIcon size={20} />
              </div>
              <div className='flex flex-col'>
                <span className='text-sm font-medium truncate max-w-[150px]'>
                  {file.name}
                </span>
                <div className='flex items-center gap-1'>
                  <span className='text-xs text-muted-foreground'>
                    {getFileType(file)}
                  </span>
                  <div className='flex items-center ml-2 text-xs bg-muted/70 px-1.5 py-0.5 rounded-full'>
                    {getAnalysisModeIcon(
                      analysisModes[file.name] || 'text_only'
                    )}
                    <span className='ml-1 text-xs'>
                      {getAnalysisModeName(
                        analysisModes[file.name] || 'text_only'
                      )}
                    </span>
                  </div>
                </div>
              </div>
              <div className='flex items-center gap-1'>
                <Select
                  value={analysisModes[file.name] || 'text_only'}
                  onValueChange={(value) =>
                    onChangeAnalysisMode(
                      file.name,
                      value as 'text_only' | 'visual' | 'full'
                    )
                  }
                >
                  <SelectTrigger className='w-[100px] h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200'>
                    <SelectValue placeholder='Mode' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='text_only' className='text-xs'>
                      <div className='flex items-center gap-1.5'>
                        <FileText size={14} />
                        <span>Text Only</span>
                      </div>
                    </SelectItem>
                    <SelectItem value='visual' className='text-xs'>
                      <div className='flex items-center gap-1.5'>
                        <FileImage size={14} />
                        <span>Visual</span>
                      </div>
                    </SelectItem>
                    <SelectItem value='full' className='text-xs'>
                      <div className='flex items-center gap-1.5'>
                        <FileSearch size={14} />
                        <span>Full Analysis</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity duration-200'
                  onClick={() => onRemove(index)}
                >
                  <X size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
