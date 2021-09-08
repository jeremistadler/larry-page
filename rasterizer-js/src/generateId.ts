export function generateId() {
  return (
    (Date.now() - 1631135234300) * 100000 + Math.floor(Math.random() * 100000)
  )
}
