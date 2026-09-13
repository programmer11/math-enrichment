/**
 * Kindergarten is stored/transmitted as grade 0 (an integer, so no
 * schema change was needed to add it below Grade 1). This is the single
 * place on the frontend that maps it to "K" for display -- mirrors
 * backend/scoring.py's grade_label() exactly. Use this anywhere a raw
 * grade number from the API is shown to a person.
 */
export function formatGrade(grade: number): string {
  return grade === 0 ? "K" : String(grade);
}
