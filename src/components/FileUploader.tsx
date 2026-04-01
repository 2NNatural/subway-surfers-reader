import { useState, useRef, useCallback } from 'react'

type Props = {
  onFile: (file: File) => void
  loading: boolean
}

export function FileUploader({ onFile, loading }: Props) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) onFile(file)
    },
    [onFile],
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) onFile(file)
    },
    [onFile],
  )

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`
        border-2 border-dashed rounded-xl p-10 cursor-pointer transition-all
        ${dragging ? 'border-white/60 bg-white/5' : 'border-white/20 hover:border-white/40'}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.txt"
        onChange={handleChange}
        className="hidden"
      />
      <div className="text-white/50 text-sm">
        {loading ? (
          <span className="text-white/70">Extracting text...</span>
        ) : (
          <>
            <p className="text-lg mb-1">Drop a PDF or TXT file here</p>
            <p>or click to browse</p>
          </>
        )}
      </div>
    </div>
  )
}
