export interface Subject {
  id: string
  label: string
  emoji: string
  useLatex: boolean
  useCode: boolean
}

export const SUBJECTS: Subject[] = [
  { id: 'Mathematics', label: 'Mathematics', emoji: '∑', useLatex: true, useCode: false },
  { id: 'Physics', label: 'Physics', emoji: '⚡', useLatex: true, useCode: false },
  { id: 'Chemistry', label: 'Chemistry', emoji: '⚗️', useLatex: true, useCode: false },
  { id: 'Biology', label: 'Biology', emoji: '🧬', useLatex: false, useCode: false },
  { id: 'Computer Science', label: 'CS', emoji: '💻', useLatex: false, useCode: true },
  { id: 'History', label: 'History', emoji: '📜', useLatex: false, useCode: false },
  { id: 'Geography', label: 'Geography', emoji: '🌍', useLatex: false, useCode: false },
  { id: 'Literature', label: 'Literature', emoji: '📚', useLatex: false, useCode: false },
  { id: 'Philosophy', label: 'Philosophy', emoji: '🤔', useLatex: false, useCode: false },
  { id: 'Economics', label: 'Economics', emoji: '📈', useLatex: false, useCode: false },
  { id: 'Psychology', label: 'Psychology', emoji: '🧠', useLatex: false, useCode: false },
]

export function getSubject(id: string): Subject {
  return SUBJECTS.find(s => s.id === id) ?? SUBJECTS[0]
}

export const SUBJECT_TOPICS: Record<string, string[]> = {
  Mathematics: ['Algebra', 'Calculus', 'Statistics', 'Geometry', 'Trigonometry', 'Linear Algebra', 'Differential Equations', 'Number Theory'],
  Physics: ['Mechanics', 'Thermodynamics', 'Electromagnetism', 'Optics', 'Quantum Mechanics', 'Relativity', 'Nuclear Physics', 'Waves'],
  Chemistry: ['Organic Chemistry', 'Inorganic Chemistry', 'Physical Chemistry', 'Stoichiometry', 'Thermochemistry', 'Electrochemistry', 'Acid-Base', 'Kinetics'],
  Biology: ['Cell Biology', 'Genetics', 'Evolution', 'Ecology', 'Anatomy', 'Physiology', 'Microbiology', 'Molecular Biology'],
  'Computer Science': ['Algorithms', 'Data Structures', 'Operating Systems', 'Databases', 'Networking', 'Machine Learning', 'Software Engineering', 'Theory of Computation'],
  History: ['Ancient History', 'Medieval History', 'Modern History', 'World War I', 'World War II', 'Cold War', 'Colonialism', 'Industrial Revolution'],
  Geography: ['Physical Geography', 'Human Geography', 'Geopolitics', 'Climate & Weather', 'Population', 'Economic Geography', 'Urban Studies', 'Environmental Geography'],
  Literature: ['Literary Analysis', 'Poetry', 'Prose', 'Drama', 'Narrative Techniques', 'Themes & Motifs', 'Author Context', 'Comparative Literature'],
  Philosophy: ['Ethics', 'Epistemology', 'Metaphysics', 'Logic', 'Political Philosophy', 'Philosophy of Mind', 'Existentialism', 'Ancient Philosophy'],
  Economics: ['Microeconomics', 'Macroeconomics', 'International Trade', 'Monetary Policy', 'Market Structures', 'Game Theory', 'Behavioral Economics', 'Development Economics'],
  Psychology: ['Cognitive Psychology', 'Developmental Psychology', 'Social Psychology', 'Abnormal Psychology', 'Neuroscience', 'Research Methods', 'Clinical Psychology', 'Personality Theory'],
}
