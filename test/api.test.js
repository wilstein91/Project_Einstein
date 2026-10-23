import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
test('HTTP 시험·계정·저장·소유권·OCR 권한 통합',{timeout:30000},async()=>{
  const directory=await mkdtemp(path.join(os.tmpdir(),'study-api-'));
  const child=spawn(process.execPath,['server/index.js'],{env:{...process.env,AI_PROVIDER:'demo',PORT:'0',RUNTIME_DIR:directory},windowsHide:true,stdio:['ignore','pipe','pipe']});
  try{
    const base=await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(Error('서버 시작 시간 초과')),10000);child.on('error',reject);child.stdout.on('data',b=>{output+=b;const match=output.match(/Local: (http:\/\/127.0.0.1:\d+)/);if(match){clearTimeout(timer);resolve(match[1]);}});});
    async function request(p,body,token,cookie){const r=await fetch(base+p,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{'X-Exam-Token':token}:{}),...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
    assert.equal((await request('/api/records')).status,401);
    const created=await request('/api/exams',{sample:true,level:'basic',count:3});assert.equal(created.status,201);const {id,token}=created.data;
    assert.equal(created.data.questions[0].answerIndex,undefined);assert.equal((await request('/api/exams/'+id)).status,403);
    assert.equal((await request('/api/exams/'+id+'/finish',{},token)).status,400);
    for(let i=0;i<3;i++)assert.equal((await request('/api/exams/'+id+'/answers',{questionId:String(i+1),choice:i},token)).status,200);
    assert.equal((await request('/api/exams/'+id+'/answers',{questionId:'1',choice:3},token)).status,400);
    assert.equal((await request('/api/exams/'+id+'/finish',{},token)).data.answers.filter(a=>a.correct).length,3);
    const one=await request('/api/auth/register',{email:'one@example.test',password:'validation-password-one'});assert.equal(one.status,200);
    const saved=await request('/api/records',{examId:id,title:'샘플 시험'},token,one.cookie);assert.equal(saved.status,201);
    const records=await request('/api/records',undefined,undefined,one.cookie);assert.equal(records.data.records.length,1);
    const record=await request('/api/records/'+saved.data.id,undefined,undefined,one.cookie);assert.equal(record.data.archived,true);assert.equal(record.data.token,undefined);
    const two=await request('/api/auth/register',{email:'two@example.test',password:'validation-password-two'});
    assert.notEqual((await request('/api/records/'+saved.data.id,undefined,undefined,two.cookie)).status,200);
    assert.equal((await request('/api/exams',{ocr:true,level:'basic',count:1,file:{name:'scan.pdf',base64:'YQ=='}},undefined,one.cookie)).status,403);
    await request('/api/auth/logout',{},undefined,one.cookie);assert.equal((await request('/api/records',undefined,undefined,one.cookie)).status,401);
  }finally{child.kill();await new Promise(resolve=>child.exitCode!==null?resolve():child.once('close',resolve));await rm(directory,{recursive:true,force:true});}
});
