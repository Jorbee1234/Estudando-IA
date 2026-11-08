// The CodeConnect logotype is made of three SVG pieces positioned inside a
// 127.26 x 40 box, exactly as laid out in the design.
const pieces = [
  { src: '/logo-1.svg', inset: 'inset-[35.48%_88.04%_6.09%_0]' },
  { src: '/logo-2.svg', inset: 'inset-[15.11%_78.6%_26.47%_9.43%]' },
  { src: '/logo-3.svg', inset: 'inset-[0_0_0_26.88%]' },
]

export function Logo() {
  return (
    <div
      role="img"
      aria-label="CodeConnect"
      className="relative h-10 w-[127.258px] shrink-0 overflow-clip"
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
