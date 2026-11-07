// Decorative CodeConnect link symbol: two SVG pieces inside a 407 x 486 box at
// 30% opacity, laid out as in the design. It is purely visual, so it stays
// hidden from assistive technology.
import { cn } from '../../lib/cn'

const pieces = [
  { src: '/symbol-1.svg', inset: 'inset-[25.85%_44.09%_0_0]' },
  { src: '/symbol-2.svg', inset: 'inset-[0_0.02%_25.85%_44.09%]' },
]

type SymbolProps = {
  className?: string
}

export function Symbol({ className }: SymbolProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute h-[486px] w-[407px] overflow-clip opacity-30',
        className,
      )}
    >
      {pieces.map((piece) => (
        <div key={piece.src} className={`absolute ${piece.inset}`}>
          <img
            src={piece.src}
            alt=""
            className="absolute inset-0 block size-full max-w-none"
          />
        </div>
      ))}
    </div>
  )
}
