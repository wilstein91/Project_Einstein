import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const schema={type:'object',additionalProperties:false,properties:{questions:{type:'array',minItems:1,maxItems:20,items:{type:'object',additionalProperties:false,properties:{stem:{type:'string'},options:{type:'array',items:{type:'string'},minItems:4,maxItems:4},answerIndex:{type:'integer',minimum:0,maximum:3},explanation:{type:'string'},evidence:{type:'string'}},required:['stem','options','answerIndex','explanation','evidence']}},notice:{type:'string'}},required:['questions','notice']};
import {existsSync} from 'node:fs';
// 각자 PC의 Claude CLI를 찾는다: 환경변수 → 기본 설치 위치 → PATH
export function findClaude(){
  if(process.env.CLAUDE_CLI_PATH)return process.env.CLAUDE_CLI_PATH;
  const home=os.homedir(),win=process.platform==='win32';
  const candidates=win?[path.join(home,'.local/bin/claude.exe'),path.join(process.env.LOCALAPPDATA||'','Programs/claude/claude.exe')]:[path.join(home,'.local/bin/claude'),path.join(home,'.claude/local/claude'),'/opt/homebrew/bin/claude','/usr/local/bin/claude'];
  return candidates.find(c=>existsSync(c))||(win?'claude.exe':'claude');
}
const claudePath=findClaude();
export function runProcess(command,args,input='',timeout=150000,cwd=root){return new Promise((resolve,reject)=>{
  const child=spawn(command,args,{cwd,windowsHide:true,shell:false,stdio:['pipe','pipe','pipe'],env:{...process.env,CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC:'1'}});let output='',stderr='',settled=false;
  const stop=()=>{if(process.platform==='win32')spawn('taskkill',['/pid',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});else child.kill('SIGKILL');};
  const finish=(err,result)=>{if(settled)return;settled=true;clearTimeout(timer);err?reject(err):resolve(result);};
  const timer=setTimeout(()=>{stop();finish(Error('AI 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.'));},timeout);
  child.stdout.on('data',b=>{output+=b;if(output.length>2_000_000){stop();finish(Error('AI 응답 크기를 초과했습니다.'));}});child.stderr.on('data',b=>{stderr=(stderr+b).slice(-4000);});
  child.on('error',()=>finish(Error('AI 실행 파일을 찾거나 실행할 수 없습니다. 서버의 CLI 설정을 확인해주세요.')));
  child.on('close',code=>finish(null,{code,output,stderr}));child.stdin.on('error',()=>{});child.stdin.end(input);
});}
let status={ready:false,provider:'none',label:'연결 확인 중'};
export function providerStatus(){return status;}
export async function initializeProvider(){
  const selected=process.env.AI_PROVIDER||'auto';
  if((selected==='auto'||selected==='anthropic')&&process.env.ANTHROPIC_API_KEY&&process.env.ANTHROPIC_MODEL)return status={ready:true,provider:'anthropic',label:'Claude API'};
  if(['auto','claude-cli'].includes(selected))try{const r=await runProcess(claudePath,['auth','status'],'',15000);if(r.code===0&&JSON.parse(r.output).loggedIn)return status={ready:true,provider:'claude-cli',label:'Claude · 로컬 로그인'};}catch{}
  return status={ready:false,provider:selected,label:'AI 로그인 또는 API 설정 필요'};
}
export async function completeJSON(system,payload){
  if(!status.ready)throw Error('AI가 연결되지 않았습니다. Claude CLI 로그인 또는 API 환경변수를 확인해주세요.');
  if(status.provider==='anthropic'){
    const {default:Anthropic}=await import('@anthropic-ai/sdk');const c=new Anthropic({apiKey:process.env.ANTHROPIC_API_KEY,timeout:150000,maxRetries:0});
    const r=await c.messages.create({model:process.env.ANTHROPIC_MODEL,max_tokens:14000,system:system+'\n출력 JSON 스키마: '+JSON.stringify(schema),messages:[{role:'user',content:JSON.stringify(payload)}]});
    return parseJSON(r.content.filter(x=>x.type==='text').map(x=>x.text).join(''));
  }
  const cwd=path.join(root,'.runtime/ai-worker');await mkdir(cwd,{recursive:true});
  const args=['--print','--safe-mode','--no-session-persistence','--tools','','--strict-mcp-config','--mcp-config','{"mcpServers":{}}','--output-format','json','--json-schema',JSON.stringify(schema),'--system-prompt',system];
  if(process.env.CLAUDE_MODEL)args.push('--model',process.env.CLAUDE_MODEL);
  const r=await runProcess(claudePath,args,JSON.stringify(payload),150000,cwd);
  let envelope;try{envelope=JSON.parse(r.output);}catch{throw Error('AI 연결에 실패했습니다. CLI 로그인 상태와 네트워크를 확인해주세요.');}
  if(r.code!==0||envelope.is_error)throw Error('AI 요청에 실패했습니다. 로그인·사용량·네트워크 상태를 확인해주세요.');
  return envelope.structured_output||parseJSON(envelope.result||'');
}
function parseJSON(raw){try{return JSON.parse(raw.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,''));}catch{throw Error('AI 응답 형식이 올바르지 않습니다. 다시 생성해주세요.');}}
