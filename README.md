# 이해했나?

학습자료를 읽고 이해도를 확인하는 4지선다 시험 서비스입니다. 자료를 올리면 Claude가 **그 자료 안에서만** 문제를 만들고, 한 문제씩 풀며 정답 해설과 자료 속 근거를 확인합니다.

이 `main` 브랜치는 **전체 기능 버전**입니다. 각자 PC에서 서버를 실행하며 PDF 읽기, 스캔 PDF OCR, 이메일 회원가입·로그인, 시험지 저장까지 모두 동작합니다.

## 시작하기 (Windows)
각자 PC에서 실행하고 **각자 Claude 계정**으로 문제를 만듭니다. 다른 사람의 계정이나 사용량을 쓰지 않습니다.

1. [Node.js](https://nodejs.org) LTS(24 이상)를 설치합니다.
2. [Claude CLI 설치 안내](https://code.claude.com/docs/en/setup)대로 설치한 뒤, 터미널에서 본인 계정으로 로그인합니다.
   ```
   claude auth login
   ```
3. 레포를 받습니다.
   ```
   git clone https://github.com/wilstein91/Project_Einstein.git
   ```
4. 받은 폴더의 **`start.bat`을 더블클릭**합니다. 패키지 설치 → 준비 상태 점검 → 서버 실행 → 브라우저 열기가 자동으로 진행됩니다.
   - 점검에서 `[!!]`가 나오면 그 아래 `→` 안내대로 해결한 뒤 다시 실행합니다.
   - 쓰는 동안 검은 창을 닫지 마세요. 닫으면 서비스도 꺼집니다.

### 직접 실행 (PowerShell / Mac·Linux)
```powershell
npm.cmd install
npm.cmd run doctor
npm.cmd run dev
```
Mac·Linux에서는 `npm.cmd` 대신 `npm`을 씁니다. 화면에 나온 `Local: http://127.0.0.1:3000` 주소를 브라우저로 엽니다. 3000번 포트가 사용 중이면 3001, 3002… 순서로 빈 포트를 자동으로 씁니다.

> **설치 없이 써보기:** [`Claude_Share` 브랜치](https://github.com/wilstein91/Project_Einstein/tree/Claude_Share)의 Claude 실행 버전도 있습니다 → https://claude.ai/artifact/AH2upZpLWUNtxnTgrZKyPY
> AGENT 02 그룹 안에서만 사용할 수 있고, OCR·회원가입은 빠져 있습니다. 전체 기능은 위 방법대로 Git으로 받아 실행하세요.

## 예제 자료
처음 써볼 때는 [examples/업로드용_예제_멀티에이전트_노드요약.md](examples/업로드용_예제_멀티에이전트_노드요약.md)를 파일 첨부로 올려 보세요. 교안 멀티에이전트는 어떻게 적용할까?의 요약본입니다(약 22,000자). Claude 실행 버전에도 그대로 올릴 수 있습니다.

## AI 연결
`.env` 없이도 `AI_PROVIDER=auto`로 실행합니다. 이 PC에 로그인된 Claude CLI를 자동으로 찾아 쓰며, 도구 사용과 대화 기록 저장 없이 비대화형으로 출제합니다. `npm run doctor`로 연결 상태를 확인할 수 있습니다.

API 키로 쓰려면 `.env.example`을 `.env`로 복사하고 `AI_PROVIDER=anthropic`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`을 설정합니다. 키가 설정되어 있으면 API를 우선 사용합니다. 키는 화면이나 채팅에 입력하지 않습니다. CLI 방식은 로컬용이며 그 PC 계정의 사용량을 씁니다. 외부에 공개해 운영하려면 서버 API 키 방식으로 바꿔야 합니다.

## 기능
- DOCX/PDF/MD/TXT 파일 하나(10MB) 또는 붙여넣기(30~80,000자).
- 기본/심화, 자동 또는 1~20문항. 자료가 부족하면 문항이 줄어든 이유를 표시.
- 한 문제씩 풀이, 처음 고른 답으로 확정, 정오·한 문단 해설·자료 근거, 전체 결과.
- 같은 자료에서 새 문항 생성, 새로고침해도 풀던 시험 복원.
- 이메일/비밀번호 회원가입·로그인·로그아웃, 결과 저장과 본인 시험지 조회.
- 운영자만 스캔 PDF OCR(한국어/영어, 최대 10페이지). 암호화 PDF는 역할과 관계없이 거부.

## 운영자 계정
`.env`에 `ADMIN_EMAIL`, `ADMIN_PASSWORD`(10자 이상)를 설정한 뒤:
```powershell
npm.cmd run admin
```
그 계정으로 로그인하면 파일 영역에 OCR 옵션이 보입니다. 학생 가입으로는 운영자 권한을 얻을 수 없고, 일반 사용자는 화면과 API 모두 OCR이 막혀 있습니다. 생성 후 `.env`에서 `ADMIN_PASSWORD`를 지워도 계정은 유지됩니다.

## 보관
- 원본 파일과 분석 원문은 디스크에 저장하지 않습니다. 분석 원문은 서버 메모리에만 있고, 30분 동안 쓰지 않으면 1분 안에 지워지며 서버를 껐다 켜도 사라집니다. 그래서 새 시험을 만들 때 다시 올려야 할 수 있습니다.
- 생성된 문항·해설·근거·답안은 `.runtime/exams`에 24시간 임시 보관합니다.
- 로그인 후 저장한 시험지는 `.runtime/accounts.sqlite`에 계속 보관하며, 원문과 시험 토큰은 포함하지 않습니다. 사용자 DB와 세션은 웹에 공개하지 않습니다.

## 검증과 범위
```powershell
npm.cmd test
```
실제 OCR→AI→저장 연결을 다시 확인하려면 `npm.cmd run test:live`를 실행합니다(로그인한 AI 사용량을 씁니다). PRD·Tech Spec·Work Unit과 검증 결과는 [docs](docs)에 있습니다. 실제 Claude 출제, PDF 입력, 채점, 새 문항, 회원가입 후 저장/조회, 스캔 PDF OCR을 검증했습니다. 출제 내용이 정확한지는 자료와 함께 검토해야 합니다.

현재는 로컬 기능 검증용입니다. Google 로그인, 이메일 인증·비밀번호 재설정, 공개 배포, OCR 프로세스 격리, 운영용 과금·모니터링·백업은 포함하지 않습니다. 서버는 이 PC(127.0.0.1)에서만 접속을 받습니다. 외부 운영에는 HTTPS, `COOKIE_SECURE=true`, 운영용 인증 구성이 필요합니다.

## 참고
- [Claude CLI 프로그래밍 사용](https://code.claude.com/docs/en/headless)
- [Claude CLI 옵션](https://code.claude.com/docs/en/cli-reference)

---
만든 사람: Sung, Hyun-Joon
