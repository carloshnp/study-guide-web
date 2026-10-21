const STOP_WORDS = new Set(["a", "as", "de", "do", "das", "dos", "e", "o", "os", "para"])

/**
 * Up to three initials from the significant words of a title, used by the
 * typographic cover placeholder: `Estruturas de Dados e Algoritmos` → `EDA`.
 */
export function coverInitials(title: string): string {
  const letters = title
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 0 && !STOP_WORDS.has(word.toLowerCase()))
    .slice(0, 3)
    .map((word) => Array.from(word)[0] ?? "")
    .join("")
  return letters.toUpperCase() || "?"
}
