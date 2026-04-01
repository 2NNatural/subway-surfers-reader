type Props = {
  value: string
  onChange: (value: string) => void
}

export function TextPaster({ value, onChange }: Props) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Or paste your text here..."
      className="w-full h-48 bg-white/5 border border-white/10 rounded-xl p-4 text-white/80 placeholder-white/30 resize-none focus:outline-none focus:border-white/30 transition-colors"
    />
  )
}
