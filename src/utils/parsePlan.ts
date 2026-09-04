export function parsePlanFromText(responseText: string): any | null {
  if (!responseText) return null;

  // 1. Direct JSON attempt
  try {
    return JSON.parse(responseText);
  } catch {
    // 2. Extract JSON block enclosed in markdown or raw braces
    const jsonMatch =
      responseText.match(/```json\s*([\s\S]*?)\s*```/) ||
      responseText.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } catch (err) {
        console.error("Failed to parse extracted JSON block:", err);
      }
    }
  }
  return null;
}