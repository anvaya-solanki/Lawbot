'use client'

import type React from 'react'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Upload,
  X,
  FileText,
  ImageIcon,
  FileArchive,
  ScanLine,
  FileSearch,
  FileImage,
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface FileUploadProps {
  onFileSelect: (
    files: File[],
    analysisModes: Record<string, 'text_only' | 'visual' | 'full'>
  ) => void
  onClose: () => void
}

export default function FileUpload({ onFileSelect, onClose }: FileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [analysisModes, setAnalysisModes] = useState<
    Record<string, 'text_only' | 'visual' | 'full'>
  >({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files)
      setSelectedFiles((prev) => [...prev, ...filesArray])

      // Set default analysis mode based on file type
      const newAnalysisModes: Record<string, 'text_only' | 'visual' | 'full'> =
        {}
      filesArray.forEach((file) => {
        // Images default to visual analysis, documents to text_only
        if (file.type.startsWith('image/')) {
          newAnalysisModes[file.name] = 'visual'
        } else {
          newAnalysisModes[file.name] = 'text_only'
        }
      })

      setAnalysisModes((prev) => ({ ...prev, ...newAnalysisModes }))
    }
  }

  const removeFile = (index: number) => {
    const fileToRemove = selectedFiles[index]
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index))

    // Remove the analysis mode for this file
    if (fileToRemove) {
      const updatedModes = { ...analysisModes }
      delete updatedModes[fileToRemove.name]
      setAnalysisModes(updatedModes)
    }
  }

  const setAnalysisMode = (
    fileName: string,
    mode: 'text_only' | 'visual' | 'full'
  ) => {
    setAnalysisModes((prev) => ({
      ...prev,
      [fileName]: mode,
    }))
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files)
      setSelectedFiles((prev) => [...prev, ...filesArray])

      // Set default analysis mode based on file type
      const newAnalysisModes: Record<string, 'text_only' | 'visual' | 'full'> =
        {}
      filesArray.forEach((file) => {
        // Images default to visual analysis, documents to text_only
        if (file.type.startsWith('image/')) {
          newAnalysisModes[file.name] = 'visual'
        } else {
          newAnalysisModes[file.name] = 'text_only'
        }
      })

      setAnalysisModes((prev) => ({ ...prev, ...newAnalysisModes }))
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const getFileIcon = (file: File) => {
    const type = file.type
    if (type.startsWith('image/')) return <ImageIcon size={20} />
    if (type.includes('pdf')) return <FileText size={20} />
    return <FileArchive size={20} />
  }

  const getAnalysisModeIcon = (mode: string) => {
    switch (mode) {
      case 'text_only':
        return <FileText size={16} />
      case 'visual':
        return <FileImage size={16} />
      case 'full':
        return <FileSearch size={16} />
      default:
        return <FileText size={16} />
    }
  }

  const handleSubmit = () => {
    if (selectedFiles.length > 0) {
      onFileSelect(selectedFiles, analysisModes)
    } else {
      onClose()
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className='sm:max-w-md max-h-[90vh] flex flex-col overflow-hidden'>
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
        </DialogHeader>

        <div className='flex-shrink-0 overflow-hidden'>
          <div
            className='border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors'
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <input
              type='file'
              ref={fileInputRef}
              onChange={handleFileChange}
              className='hidden'
              multiple
            />
            <Upload className='h-10 w-10 text-muted-foreground mx-auto mb-2 animate-bounce' />
            <p className='text-sm font-medium mb-1'>
              Drag and drop files here or click to browse
            </p>
            <p className='text-xs text-muted-foreground'>
              Support for documents, images, and other files
            </p>
          </div>
        </div>

        {selectedFiles.length > 0 && (
          <div className='mt-4 flex-1 min-h-0'>
            <h4 className='text-sm font-medium mb-2'>Selected Files</h4>
            <div className='space-y-2 overflow-y-auto max-h-[30vh] pr-1'>
              {selectedFiles.map((file, index) => (
                <div
                  key={index}
                  className='flex items-center justify-between bg-muted p-2 rounded-md'
                >
                  <div className='flex items-center gap-2 overflow-hidden flex-1'>
                    {getFileIcon(file)}
                    <span className='text-sm truncate'>{file.name}</span>
                  </div>

                  <div className='flex items-center gap-2 flex-shrink-0'>
                    <Select
                      value={analysisModes[file.name] || 'text_only'}
                      onValueChange={(value) =>
                        setAnalysisMode(
                          file.name,
                          value as 'text_only' | 'visual' | 'full'
                        )
                      }
                    >
                      <SelectTrigger className='w-[120px] h-7 text-xs'>
                        <div className='flex items-center gap-1.5'>
                          {getAnalysisModeIcon(
                            analysisModes[file.name] || 'text_only'
                          )}
                          <SelectValue placeholder='Analysis Mode' />
                        </div>
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
                      className='h-6 w-6'
                      onClick={() => removeFile(index)}
                    >
                      <X size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className='flex justify-end gap-2 mt-4 flex-shrink-0'>
          <Button
            variant='outline'
            onClick={onClose}
            className='transition-all duration-200'
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className='transition-all duration-200'
          >
            {selectedFiles.length > 0 ? 'Upload' : 'Close'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
