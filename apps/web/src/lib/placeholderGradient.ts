function hash(seed: string) {
  let value = 0
  for (const char of seed) {
    value = (value * 31 + char.charCodeAt(0)) >>> 0
  }
  return value
}

export function placeholderGradient(seed: string) {
  const value = hash(seed)
  const from = value % 360
  const to = (from + 40 + ((value >> 8) % 80)) % 360
  return `linear-gradient(135deg, hsl(${from} 70% 60%), hsl(${to} 70% 40%))`
}

export function avatarColor(seed: string) {
  return `hsl(${hash(seed) % 360} 55% 38%)`
}
