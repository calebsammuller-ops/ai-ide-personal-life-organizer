'use client'

import { motion } from 'framer-motion'
import { FileSpreadsheet, FileText, Download, File } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { downloadBase64File } from '@/lib/utils/fileDownload'

interface FileDownloadCardProps {
  base64: string
  filename: string
  mimeType: string
}

const fileIcons: Record<string, React.ElementType> = {
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': FileSpreadsheet,
  'text/csv': FileText,
  'application/pdf': FileText,
}

const fileColors: Record<string, string> = {
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'from-green-500 to-emerald-600',
  'text/csv': 'from-blue-500 to-cyan-600',
  'application/pdf': 'from-red-500 to-rose-600',
}

export function FileDownloadCard({ base64, filename, mimeType }: FileDownloadCardProps) {
  const Icon = fileIcons[mimeType] || File
  const colorClass = fileColors[mimeType] || 'from-purple-500 to-indigo-600'

  const sizeBytes = Math.ceil(base64.length * 0.75)
  const sizeLabel = sizeBytes > 1024 * 1024
    ? `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
    : `${(sizeBytes / 1024).toFixed(1)} KB`

  const handleDownload = () => {
    downloadBase64File(base64, filename, mimeType)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="mt-3 bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 max-w-sm"
    >
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${colorClass} flex items-center justify-center flex-shrink-0`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-200 truncate">{filename}</p>
          <p className="text-xs text-zinc-500">{sizeLabel}</p>
        </div>
        <Button
          size="sm"
          onClick={handleDownload}
          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
        >
          <Download className="h-4 w-4 mr-1" />
          Download
        </Button>
      </div>
    </motion.div>
  )
}
