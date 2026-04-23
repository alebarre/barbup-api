export const WEEKDAY_LABELS_PT_BR: Record<string, string> = {
  SUNDAY: "DOMINGO",
  MONDAY: "SEGUNDA-FEIRA",
  TUESDAY: "TERÇA-FEIRA",
  WEDNESDAY: "QUARTA-FEIRA",
  THURSDAY: "QUINTA-FEIRA",
  FRIDAY: "SEXTA-FEIRA",
  SATURDAY: "SÁBADO",
};

export function getWeekdayLabelPtBr(weekday: string) {
  return WEEKDAY_LABELS_PT_BR[weekday] ?? weekday;
}
