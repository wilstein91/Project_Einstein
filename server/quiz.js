export function validateQuestions(items, source, max, previous = []) {
  if (!Array.isArray(items) || !items.length || items.length > max) throw Error('문항 수가 올바르지 않습니다.');
  const seen = new Set(previous.map(s => s.trim()));
  return items.map((q, i) => {
    if (typeof q.stem !== 'string' || !q.stem.trim() || q.stem.length > 1000 || seen.has(q.stem.trim())) throw Error('중복되거나 잘못된 질문입니다.');
    seen.add(q.stem.trim());
    if (!Array.isArray(q.options) || q.options.length !== 4 || q.options.some(s => typeof s !== 'string' || !s.trim() || s.length > 1000) || new Set(q.options.map(s=>s.trim())).size !== 4) throw Error('서로 다른 보기 4개가 필요합니다.');
    if (!Number.isInteger(q.answerIndex) || q.answerIndex < 0 || q.answerIndex > 3) throw Error('정답 형식이 올바르지 않습니다.');
    if (typeof q.explanation !== 'string' || !q.explanation.trim() || q.explanation.length > 1000 || /[\r\n]/.test(q.explanation)) throw Error('해설은 한 문단이어야 합니다.');
    if (typeof q.evidence !== 'string' || !q.evidence.trim() || !source.includes(q.evidence)) throw Error('자료에서 출제 근거를 찾을 수 없습니다.');
    return {id:String(i+1),stem:q.stem,options:q.options,answerIndex:q.answerIndex,explanation:q.explanation,evidence:q.evidence};
  });
}
export function submitAnswer(exam, questionId, choice) {
  const q = exam.questions[exam.answers.length];
  if (!q || q.id !== questionId || !Number.isInteger(choice) || choice < 0 || choice > 3) throw Error('현재 문항의 답 하나를 선택해주세요. 이미 채점한 답은 수정할 수 없습니다.');
  exam.answers.push({questionId,choice,correct:choice === q.answerIndex});
}
export function publicExam(exam, complete = false) {
  return {id:exam.id,title:exam.title,sourceAvailable:!!exam.source,level:exam.level,requestedCount:exam.requestedCount,count:exam.questions.length,notice:exam.notice,sample:exam.sample,answers:exam.answers,createdAt:exam.createdAt,questions:exam.questions.map((q,i)=> complete || i<exam.answers.length ? q : {id:q.id,stem:q.stem,options:q.options})};
}
