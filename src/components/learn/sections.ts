/** Metadata for the seven sections of the Learn page, shared by the page and the ToC. */

export interface LearnSectionMeta {
  id: string
  number: number
  title: string
}

export const LEARN_SECTIONS: readonly LearnSectionMeta[] = [
  { id: 'description', number: 1, title: 'Description' },
  { id: 'principle', number: 2, title: 'Principle' },
  { id: 'optimality', number: 3, title: 'Optimality' },
  { id: 'completeness', number: 4, title: 'Completeness' },
  { id: 'time-complexity', number: 5, title: 'Time complexity' },
  { id: 'space-complexity', number: 6, title: 'Space complexity' },
  { id: 'advantages', number: 7, title: 'Advantages and limitations' },
]
