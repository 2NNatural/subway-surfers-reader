type Props = {
  fontSize: number
  onFontSizeChange: (size: number) => void
  onBack: () => void
}

export function ReaderControls({ fontSize, onFontSizeChange, onBack }: Props) {
  return (
    <div
      style={{ zIndex: 20 }}
      className="fixed bottom-6 right-6 flex items-center gap-4 bg-white/10 backdrop-blur-md rounded-xl px-5 py-3 border border-white/10"
    >
      <button
        onClick={onBack}
        className="text-white/50 hover:text-white/80 transition-colors text-sm"
      >
        Back
      </button>
      <div className="w-px h-5 bg-white/20" />
      <label className="text-white/50 text-sm flex items-center gap-3">
        <span className="text-xs">A</span>
        <input
          type="range"
          min={14}
          max={28}
          value={fontSize}
          onChange={(e) => onFontSizeChange(Number(e.target.value))}
          className="w-24 accent-white/60"
        />
        <span className="text-base font-medium">A</span>
      </label>
      <span className="text-white/30 text-xs tabular-nums">{fontSize}px</span>
    </div>
  )
}
