function luminance(hex: string): number {
  const n = parseInt(hex.replace('#', ''), 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** Escolhe texto claro ou escuro garantindo o maior contraste (WCAG 1.4.3). */
export function readableOn(background: string): string {
  const dark = '#0b0d1a'
  const light = '#ffffff'
  return contrastRatio(background, dark) >= contrastRatio(background, light) ? dark : light
}
