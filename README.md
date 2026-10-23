# 이해했나?

학습자료를 읽고 이해도를 확인하는 4지선다 시험 서비스입니다. 현재 로컬 서버에서 실제 AI 출제·채점·계정 저장·운영자 OCR까지 동작합니다.

## 바로 쓰기 (설치 없음 · Claude 아티팩트)
**https://claude.ai/artifact/AH2upZpLWUNtxnTgrZKyPY** — claude.ai에 로그인한 상태로 열면 됩니다.

- 원본 화면(`public/`)을 그대로 쓰고, 서버가 하던 일만 브라우저가 대신합니다 ([artifact/browser-api.js](artifact/browser-api.js)).
- 문제는 **페이지를 연 사람 본인의 Claude 계정**으로 만들어집니다. 처음 한 번 사용 허용을 묻습니다.
- 파일은 브라우저 안에서만 읽고, 끝까지 푼 시험지는 그 브라우저에만 저장됩니다. 회원가입과 OCR은 꺼져 있습니다.
- 다시 만들기: `python artifact/build.py . artifact/browser-api.js artifact/einstein-app.html` 후 생성된 HTML을 Claude 아티팩트로 게시(`sample` 기능 선언).

## 내 PC에 설치해서 쓰기 (선택 · Agent 02 학우용)
이 서비스는 **각자 PC에서 실행**하고 **각자 Claude 계정**으로 문제를 만듭니다. 다른 사람의 계정이나 사용량을 쓰지 않습니다.

1. [Node.js](https://nodejs.org) LTS(24 이상)를 설치합니다.
2. [Claude CLI 설치 안내](https://code.claude.com/docs/en/setup)대로 설치한 뒤, 터미널에서 본인 계정으로 로그인합니다.
   ```
   claude auth login
   ```
3. 이 폴더를 받은 뒤 **`start.bat`을 더블클릭**합니다. 패키지 설치 → 준비 상태 점검 → 서버 실행 → 브라우저 열기가 자동으로 진행됩니다.
   - 점검에서 `[!!]`가 나오면 그 아래 `→` 안내대로 해결한 뒤 다시 실행합니다.
   - Mac/Linux: `npm install` → `npm run doctor` → `npm run dev` 후 표시된 주소를 엽니다.

3000번 포트가 사용 중이면 3001, 3002… 순서로 빈 포트를 자동으로 씁니다.

## 실행 (PowerShell, Node.js 24)
```powershell
cd C:\Aiffel_Work\Project_Einstein
npm.cmd install
npm.cmd run dev
```
[서비스 열기](http://127.0.0.1:3000). `.env` 없이도 `AI_PROVIDER=auto`로 실행합니다. 현재 PC의 로그인된 Claude CLI를 자동 확인하며, 도구와 대화 기록 저장 없이 비대화형 출제를 실행합니다. 다른 PC에서는 먼저 Claude CLI를 설치하고 `claude auth login`을 완료한 뒤 서버를 실행합니다. API 키가 설정되어 있으면 Claude API를 우선 사용합니다.

명시적 제공자 설정이 필요하면 `.env.example`을 `.env`로 복사하고 `AI_PROVIDER=claude-cli` 또는 `anthropic`을 설정합니다. API 방식에는 `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`이 필요합니다. 키를 화면이나 채팅에 입력하지 않습니다. CLI 방식은 로컬 개발용이며 이 PC의 구독/사용량을 사용합니다. 외부 공개 서비스 운영에는 서버 API 키 방식으로 전환해야 합니다.

## 기능
- DOCX/PDF/MD/TXT 파일 하나(10MB) 또는 붙여넣기(30~80,000자).
- 기본/심화, 자동 또는 1~20문항. 자료 부족 시 문항 감소 이유 표시.
- 한 문제씩 풀이, 최초 답 확정, 정오/한 문단 해설/자료 근거, 전체 결과.
- 같은 자료에서 새 문항 생성, 브라우저 새로고침 복원.
- **(구현 중 · 기본 꺼짐)** 이메일/비밀번호 회원가입·로그인·로그아웃, 결과 저장과 본인 시험지 조회. 코드는 남아 있고 `.env`에 `ACCOUNTS_ENABLED=1`을 넣으면 켜집니다.
- 운영자만 스캔 PDF OCR(한국어/영어, 최대 10페이지). 암호화 PDF는 역할과 무관하게 거부.

## 운영자 계정 (구현 중 · ACCOUNTS_ENABLED=1 필요)
`.env`에 `ADMIN_EMAIL`, `ADMIN_PASSWORD`(10자 이상)를 설정한 후:
```powershell
npm.cmd run admin
```
설정한 계정으로 로그인하면 파일 영역에 OCR 옵션이 표시됩니다. 학생 가입으로 운영자 권한을 얻을 수 없습니다. 생성 후 `.env`에서 ADMIN_PASSWORD를 지워도 계정은 유지됩니다. 일반 사용자는 화면과 API 모두 OCR이 차단됩니다.

## 보관
원본 파일과 분석 원문은 디스크에 저장하지 않습니다. 분석 원문은 서버 메모리에서 API 활동 기준 30분 미사용 후 1분 이내 파기하며, 서버 재시작 시에도 사라집니다. 새 시험 생성에는 재업로드가 필요할 수 있습니다. 생성된 문항·해설·근거·답안은 `.runtime/exams`에서 24시간 임시 보관합니다. 로그인 후 명시적으로 저장한 시험지는 `.runtime/accounts.sqlite`에 계속 보관하며 원문/시험 토큰은 포함하지 않습니다. 사용자 DB와 세션은 웹에 공개하지 않습니다.

## 검증과 범위
```powershell
npm.cmd test
```
실제 OCR→AI→저장 연결을 다시 검증하려면 `npm.cmd run test:live`를 실행합니다(로그인한 AI 사용량 소비). PRD·Tech Spec·Work Unit과 검증 결과는 docs에 있습니다. 실제 Claude 출제, PDF 입력, 채점, 새 문항, 회원가입 후 저장/조회, 스캔 PDF OCR을 검증했습니다. 출제의 의미적 정확성은 자료와 함께 검토할 필요가 있습니다.

현재는 로컬 기능 검증용입니다. Google OAuth, 이메일 인증/비밀번호 재설정, 공개 배포, 독립 OCR 프로세스 격리, 운영용 과금·모니터링·백업은 포함하지 않습니다. 서버는 127.0.0.1에서만 수신합니다. 외부 운영에는 HTTPS와 COOKIE_SECURE=true 및 운영용 인증 구성을 적용해야 합니다.

## 연결 참고
- [Claude CLI 프로그래밍 사용](https://code.claude.com/docs/en/headless)
- [Claude CLI 옵션](https://code.claude.com/docs/en/cli-reference)
