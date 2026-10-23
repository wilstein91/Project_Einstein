import {spawn} from 'node:child_process';
import http from 'node:http';
import {randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import {mkdir,readFile,writeFile,rename,readdir,unlink} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {extract} from './extract.js';
import {generate,sampleSource} from './ai.js';
import {publicExam,submitAnswer} from './quiz.js';
import {initializeProvider,providerStatus} from './ai-provider.js';
import {expireSource,diskRecord} from './retention.js';
import {Accounts,cookieToken,sessionCookie} from './accounts.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const runtime=process.env.RUNTIME_DIR?path.resolve(process.env.RUNTIME_DIR):path.join(root,'.runtime');
const store=path.join(runtime,'exams');await mkdir(store,{recursive:true});
const accounts=new Accounts(path.join(runtime,'accounts.sqlite'));
await initializeProvider();
const exams=new Map(),locks=new Set(),limits=new Map();const TTL=86400000;let generating=0;
async function save(e){const p=path.join(store,e.id+'.json');await writeFile(p+'.tmp',JSON.stringify(diskRecord(e)));await rename(p+'.tmp',p);}
for(const name of await readdir(store)){
  if(!/^[\w-]+\.json$/.test(name))continue;
  try{const e=diskRecord(JSON.parse(await readFile(path.join(store,name),'utf8')));if(Date.now()-e.createdAt<TTL){exams.set(e.id,e);await save(e);}else await unlink(path.join(store,name));}catch{await unlink(path.join(store,name)).catch(()=>{});}
}
setInterval(async()=>{for(const [id,e]of exams){expireSource(e);if(Date.now()-e.createdAt>TTL){exams.delete(id);await unlink(path.join(store,id+'.json')).catch(()=>{});}}for(const [key,value]of limits)if(Date.now()-value.at>900000)limits.delete(key);},60000).unref();
function rate(key,max,window=60000){const now=Date.now();let v=limits.get(key);if(!v||now-v.at>window)v={at:now,n:0};v.n++;limits.set(key,v);if(v.n>max){const e=Error('요청이 많습니다. 잠시 후 다시 시도해주세요.');e.status=429;throw e;}}
function requireUser(u){if(!u){const e=Error('로그인이 필요합니다.');e.status=401;throw e;}return u;}
const server=http.createServer(async(req,res)=>{
  res.setHeader('Content-Security-Policy',"default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');
  const send=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));};
  try{
    const port=server.address().port;
    if(![`127.0.0.1:${port}`,`localhost:${port}`].includes(req.headers.host))return send(403,{error:'허용되지 않은 호스트입니다.'});
    const url=new URL(req.url,'http://localhost');
    if(url.pathname.startsWith('/api/')){
      if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)return send(403,{error:'허용되지 않은 요청입니다.'});
      const user=accounts.user(cookieToken(req));
      if(req.method==='GET'&&url.pathname==='/api/config')return send(200,{...providerStatus(),ocr:true,user});
      let body={};
      if(req.method==='POST'){
        let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>15*1024*1024)return send(413,{error:'요청 용량을 초과했습니다.'});chunks.push(chunk);}
        try{body=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');}catch{return send(400,{error:'요청 형식이 올바르지 않습니다.'});}
        if(!body||Array.isArray(body)||typeof body!=='object')throw Error('요청 형식이 올바르지 않습니다.');
      }
      const authorize=id=>{
        const e=exams.get(id),t=req.headers['x-exam-token'];
        if(!e||Date.now()-e.createdAt>TTL||typeof t!=='string'||Buffer.byteLength(t)!==Buffer.byteLength(e.token)||!timingSafeEqual(Buffer.from(t),Buffer.from(e.token))){const err=Error('시험이 만료되었거나 접근 권한이 없습니다. 새 시험을 시작해주세요.');err.status=403;throw err;}
        expireSource(e);if(e.source)e.sourceTouchedAt=Date.now();return e;
      };
      if(req.method==='GET'&&url.pathname==='/api/auth/me')return send(200,{user});
      if(req.method==='POST'&&['/api/auth/register','/api/auth/login'].includes(url.pathname)){
        rate(req.socket.remoteAddress+':auth',10,900000);
        const u=url.pathname.endsWith('register')?await accounts.register(body.email,body.password):await accounts.login(body.email,body.password);
        res.setHeader('Set-Cookie',sessionCookie(accounts.session(u)));return send(200,{user:u});
      }
      if(req.method==='POST'&&url.pathname==='/api/auth/logout'){accounts.logout(cookieToken(req));res.setHeader('Set-Cookie',sessionCookie(''));return send(200,{ok:true});}
      if(url.pathname==='/api/records'){
        requireUser(user);
        if(req.method==='GET')return send(200,{records:accounts.list(user)});
        if(req.method==='POST'){const e=authorize(body.examId);return send(201,accounts.save(user,e,body.title));}
      }
      const recordMatch=url.pathname.match(/^\/api\/records\/([\w-]+)$/);
      if(recordMatch&&req.method==='GET'){requireUser(user);const e=accounts.get(user,recordMatch[1]);return send(200,{...publicExam(e,true),archived:true,recordTitle:e.recordTitle});}
      if(req.method==='POST'&&url.pathname==='/api/exams'){
        rate(req.socket.remoteAddress+':exam',6);
        if(generating>=2)return send(429,{error:'문제를 생성 중입니다. 잠시 후 다시 시도해주세요.'});
        if(!['basic','advanced'].includes(body.level)||!(body.count==='auto'||Number.isInteger(body.count)&&body.count>=1&&body.count<=20))throw Error('학습 수준과 문항 수를 확인해주세요.');
        if(body.ocr&&user?.role!=='admin')return send(403,{error:'OCR은 로그인한 운영자만 사용할 수 있습니다.'});
        generating++;
        try{
          let previous=[],source,sample=body.sample===true,title=body.file?.name||'붙여넣은 학습자료';
          if(body.previousId){const old=authorize(body.previousId);if(!old.source)throw Error('자료 세션이 종료되었습니다. 학습자료를 다시 첨부하거나 붙여넣어주세요.');if(old.answers.length!==old.questions.length)throw Error('시험을 완료한 후 다시 시도해주세요.');source=old.source;previous=old.questions.map(q=>q.stem);sample=old.sample;title=old.title;}
          else source=sample?sampleSource:await extract(body,{admin:user?.role==='admin'});
          const result=await generate(source,body.level,body.count,previous,sample);
          const e={id:randomUUID(),token:randomBytes(32).toString('hex'),source,sourceTouchedAt:Date.now(),title:sample?'에이전틱 AI 샘플':String(title).slice(0,100),level:body.level,requestedCount:body.count,...result,answers:[],sample,createdAt:Date.now()};
          await save(e);exams.set(e.id,e);return send(201,{...publicExam(e),token:e.token});
        }finally{generating--;}
      }
      const match=url.pathname.match(/^\/api\/exams\/([\w-]+)(?:\/(answers|finish))?$/);
      if(match){
        const e=authorize(match[1]);
        if(req.method==='GET'&&!match[2])return send(200,publicExam(e));
        if(req.method==='POST'&&match[2]==='answers'){
          if(locks.has(e.id))return send(409,{error:'채점 중입니다. 잠시 후 확인해주세요.'});
          locks.add(e.id);
          try{const copy=structuredClone(e);submitAnswer(copy,body.questionId,body.choice);await save(copy);exams.set(e.id,copy);return send(200,publicExam(copy));}finally{locks.delete(e.id);}
        }
        if(req.method==='POST'&&match[2]==='finish'){if(e.answers.length!==e.questions.length)throw Error('모든 문항을 먼저 풀어주세요.');return send(200,publicExam(e,true));}
      }
      return send(404,{error:'요청한 기능을 찾을 수 없습니다.'});
    }
    if(req.method!=='GET')return send(405,{error:'허용되지 않은 방식입니다.'});
    if(url.pathname==='/assets/logo-rotated-10.svg'){res.writeHead(200,{'Content-Type':'image/svg+xml'});return res.end(await readFile(path.join(root,'public/assets/logo-rotated-10.svg')));}
    if(['/assets/study-sprout.png','/assets/logo-rugged.png','/assets/logo-checked.png','/assets/logo-vowel-check.png'].includes(url.pathname)){res.writeHead(200,{'Content-Type':'image/png'});return res.end(await readFile(path.join(root,'public',url.pathname.slice(1))));}
    const files={'/':'index.html','/app.js':'app.js','/style.css':'style.css'};const file=files[url.pathname];if(!file)return send(404,{error:'페이지를 찾을 수 없습니다.'});
    res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8'});res.end(await readFile(path.join(root,'public',file)));
  }catch(e){const sensitive=/api.?key|authentication|credit|billing|SQLITE|ENOENT|zip|PDF structure/i.test(e.message||'');send(e.status||400,{error:sensitive?'자료 처리 또는 AI 연결에 실패했습니다. 파일과 서버 설정을 확인해주세요.':e.message||'요청을 처리하지 못했습니다.'});}
});
// PORT를 지정하지 않았으면 3000부터 비어 있는 포트를 찾아 연다
const fixedPort=process.env.PORT!==undefined;let port=fixedPort?Number(process.env.PORT):3000;
server.on('error',e=>{if(e.code==='EADDRINUSE'&&!fixedPort&&port<3010){port++;return server.listen(port,'127.0.0.1');}throw e;});
server.listen(port,'127.0.0.1',()=>{const url=`http://127.0.0.1:${server.address().port}`;console.log(`Local: ${url}`);
  if(process.env.OPEN_BROWSER==='1')spawn(process.platform==='win32'?'cmd':process.platform==='darwin'?'open':'xdg-open',process.platform==='win32'?['/c','start','',url]:[url],{stdio:'ignore',detached:true,windowsHide:true}).unref();});
