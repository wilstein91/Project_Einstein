// 실행 전 점검: Node 버전, 패키지 설치, 내 PC의 Claude CLI 설치·로그인 상태
import {existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {findClaude,runProcess} from '../server/ai-provider.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
let ok=true;const pass=m=>console.log('  [OK] '+m),fail=(m,fix)=>{ok=false;console.log('  [!!] '+m+'\n       → '+fix);};
console.log('\n이해했나? 실행 점검\n');
const major=Number(process.versions.node.split('.')[0]);
major>=24?pass('Node.js '+process.version):fail('Node.js '+process.version+' (24 이상 필요)','https://nodejs.org 에서 LTS(24 이상)를 설치하세요.');
existsSync(path.join(root,'node_modules'))?pass('패키지 설치됨'):fail('패키지가 설치되지 않음','이 폴더에서 npm install 을 실행하세요.');
if(process.env.ANTHROPIC_API_KEY&&process.env.ANTHROPIC_MODEL)pass('Claude API 키 설정됨 (.env)');
else{
  const claude=findClaude();
  try{
    const r=await runProcess(claude,['auth','status'],'',15000);
    let loggedIn=false;try{loggedIn=JSON.parse(r.output).loggedIn;}catch{}
    loggedIn?pass('Claude CLI 로그인됨 — 내 계정 사용량으로 출제합니다'):fail('Claude CLI가 로그인되지 않음','터미널에서 claude auth login 을 실행해 본인 계정으로 로그인하세요.');
  }catch{fail('Claude CLI를 찾을 수 없음','https://code.claude.com/docs/en/setup 안내대로 설치한 뒤 claude auth login 을 실행하세요.');}
}
console.log(ok?'\n준비 완료! npm run dev 로 실행하세요.\n':'\n위 [!!] 항목을 해결한 뒤 다시 실행하세요.\n');
process.exit(ok?0:1);
