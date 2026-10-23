import test from 'node:test';
import assert from 'node:assert/strict';
import {validateQuestions,submitAnswer,publicExam} from '../server/quiz.js';
const q={stem:'질문',options:['가','나','다','라'],answerIndex:1,explanation:'한 문단 해설입니다.',evidence:'자료 근거'};
test('원문 근거 및 단일 정답 형식 검증',()=>{assert.equal(validateQuestions([q],'이것은 자료 근거',1).length,1);assert.throws(()=>validateQuestions([{...q,evidence:'외부 내용'}],'자료 근거',1));assert.throws(()=>validateQuestions([{...q,answerIndex:4}],'자료 근거',1));assert.throws(()=>validateQuestions([{...q,options:['가','가','다','라']}],'자료 근거',1));assert.throws(()=>validateQuestions([q],'자료 근거',1,['질문']));});
test('채점 전 비공개, 최초 답변 확정, 순서 강제',()=>{const e={questions:[{...q,id:'1'},{...q,id:'2'}],answers:[]};assert.equal(publicExam(e).questions[0].answerIndex,undefined);assert.throws(()=>submitAnswer(e,'2',1));submitAnswer(e,'1',1);assert.equal(e.answers[0].correct,true);assert.equal(publicExam(e).questions[0].answerIndex,1);assert.equal(publicExam(e).questions[1].answerIndex,undefined);assert.throws(()=>submitAnswer(e,'1',0));});
