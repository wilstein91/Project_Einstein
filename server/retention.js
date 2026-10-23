export const SOURCE_IDLE_MS = 30 * 60 * 1000;
export function expireSource(exam, now = Date.now()) {
  if (exam.source && now - (exam.sourceTouchedAt || exam.createdAt) >= SOURCE_IDLE_MS) {
    delete exam.source;
    delete exam.sourceTouchedAt;
  }
}
export function diskRecord(exam) {
  const {source, sourceTouchedAt, ...record} = exam;
  return record;
}
