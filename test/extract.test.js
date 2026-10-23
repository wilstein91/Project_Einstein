import test from 'node:test';
import assert from 'node:assert/strict';
import {extract} from '../server/extract.js';
import {readFile} from 'node:fs/promises';
const text='학습자료는 주어진 내용을 기반으로 이해도를 확인하기 위해 사용하는 자료입니다.';
test('텍스트와 파일 입력 검증',async()=>{assert.equal(await extract({text}),text);assert.equal(await extract({file:{name:'study.md',base64:Buffer.from(text).toString('base64')}}),text);await assert.rejects(()=>extract({text,file:{name:'a.txt',base64:'YQ=='}}));await assert.rejects(()=>extract({text:'짧음'}));await assert.rejects(()=>extract({file:{name:'a.exe',base64:'YQ=='}}));await assert.rejects(()=>extract({text:'가'.repeat(80001)}));});
test('잘못된 PDF/DOCX는 거부',async()=>{for(const name of ['a.pdf','a.docx'])await assert.rejects(()=>extract({file:{name,base64:Buffer.from(text).toString('base64')}}));});
test('실제 DOCX 문서의 한국어 텍스트 추출',async()=>{const b=await readFile(new URL('./fixtures/study.docx',import.meta.url));const result=await extract({file:{name:'study.docx',base64:b.toString('base64')}});assert.match(result,/에이전트는 목표를/);assert.match(result,/사람의 검토/);});
