export function delay(minMs = 150, maxMs = 400): Promise<void> {
  const ms = minMs + Math.random() * (maxMs - minMs)
  return new Promise((resolve) => setTimeout(resolve, ms))
}
