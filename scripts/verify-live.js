// Explicit opt-in live integration check. Uses the logged-in CLI/API quota.
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {Accounts} from '../server/accounts.js';
import {scannedPDF} from '../test/pdf-fixtures.js';
const directory=await mkdtemp(path.join(os.tmpdir(),'study-live-'));
const accounts=new Accounts(path.join(directory,'accounts.sqlite'));
await accounts.register('operator@example.test','temporary-live-test-password','admin');accounts.close();
const child=spawn(process.execPath,['server/index.js'],{env:{...process.env,PORT:'0',RUNTIME_DIR:directory},windowsHide:true,stdio:['ignore','pipe','pipe']});
try{
  const base=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('서버 시작 실패')),20000);let output='';child.on('error',reject);child.stdout.on('data',b=>{output+=b;const m=output.match(/Local: (http:\/\/127.0.0.1:\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});});
  async function request(p,body,token,cookie){const r=await fetch(base+p,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{'X-Exam-Token':token}:{}),...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();if(!r.ok)throw Error(data.error);return {data,cookie:r.headers.get('set-cookie')?.split(';')[0]};}
  const user=await request('/api/auth/login',{email:'operator@example.test',password:'temporary-live-test-password'});
  const created=await request('/api/exams',{ocr:true,file:{name:'scan.pdf',base64:scannedPDF().toString('base64')},level:'basic',count:1},undefined,user.cookie);
  const e=created.data;assert.equal(e.questions[0].answerIndex,undefined);
  for(const q of e.questions)await request('/api/exams/'+e.id+'/answers',{questionId:q.id,choice:0},e.token);
  const result=await request('/api/exams/'+e.id+'/finish',{},e.token);assert.ok(result.data.questions[0].evidence);
  const saved=await request('/api/records',{examId:e.id,title:'OCR 실제 연결 검증'},e.token,user.cookie);
  assert.equal((await request('/api/records/'+saved.data.id,undefined,undefined,user.cookie)).data.archived,true);
  console.log('PASS: 운영자 로그인 → 스캔 PDF OCR → 실제 AI 출제 → 채점/해설/근거 → 개인 기록 저장/조회');
}finally{child.kill();await new Promise(resolve=>child.exitCode!==null?resolve():child.once('close',resolve));await rm(directory,{recursive:true,force:true});}
