# Tech Spec v0.2 — 이해했나?

## 기능명세와 범위
PRD는 목적/요구, 기능명세는 입력·상태·동작·오류, 본 문서는 구현 구조와 계약을 정의합니다. Work Unit 진행은 WORK_UNITS.md를 참조합니다.

## 구조
Node.js 24 ESM 서버 + HTML/CSS/JavaScript 클라이언트. 초기 의존성과 배포 복잡성을 줄이고 프레임워크 없이 동작을 검증합니다. AI 제공자는 서버 adapter로 격리합니다. AI_PROVIDER=auto는 API 키/모델이 있으면 Claude API SDK, 아니면 로그인된 Claude CLI를 선택합니다. CLI는 --safe-mode --tools "" --strict-mcp-config --mcp-config 빈 설정 --no-session-persistence --json-schema를 사용하며 자료는 stdin으로 전달합니다. 프로그램 실행은 shell:false, 숨겨진 창, 150초 제한, 출력 2MB 제한을 적용합니다. CLI 방식은 로컬 개발용입니다. GPT CLI 연결은 설치/인증/비대화형 JSON 인터페이스 확인 후 별도 adapter로 추가합니다. CLI 이름이나 실행 옵션을 추정해 실행하지 않습니다.

## 상태와 데이터
Exam: id, session token, source, level, requestedCount, questions, answers, createdAt. Question: id, stem, options[4], answerIndex, explanation, evidence. Answer: questionId, choice, correct. 정답/해설은 채점 전 클라이언트에 전송하지 않습니다. 시험은 .runtime/exams에 원자적으로 기록하며 24시간 후 만료/삭제합니다. 세션 토큰은 256bit 난수, 브라우저 localStorage에 임시 보관하며 서버 API는 해당 토큰의 소유권을 확인합니다. 토큰은 URL에 포함하지 않습니다. 원본 파일과 추출 텍스트는 디스크에 저장하지 않습니다. 추출 텍스트는 서버 메모리에서만 유지하며 세션은 API 활동 기준 30분 미사용 시 종료됩니다. 만료 후 1분 이내 원문을 삭제합니다. 서버 재시작 시에도 원문은 소실됩니다. 기존 디스크 원문은 시작 시 제거합니다. 문항·해설·근거·답안은 24시간 보관하므로 이어 풀기는 가능하지만 새 시험 생성에는 재업로드가 필요할 수 있습니다. V2 계정 저장과 별개입니다.

## API
- GET /api/config: 제공자 준비 여부, 지원 형식/제한.
- POST /api/exams: JSON {text, file?:{name,base64}, level, count:'auto'|1..20, sample?:boolean, previousId?:string}. 파일과 텍스트 동시 입력 금지. 재시험은 X-Exam-Token과 previousId를 통해 서버 원문을 재사용합니다.
- GET /api/exams/:id: X-Exam-Token 필수. 문제 목록과 이미 채점된 결과만 반환.
- POST /api/exams/:id/answers: {questionId,choice}, 동일 토큰. 순서 강제, 이미 채점한 문항 수정 불가.
- POST /api/exams/:id/finish: 전 문항 채점 후 전체 정답/해설 반환.

## 검증/오류
요청 본문 15MiB, 파일 디코딩 10MiB, 추출 텍스트 80,000자 제한. UTF-8 텍스트, mammoth DOCX 추출, pdfjs PDF 페이지 텍스트 추출. 암호화 PDF/빈 추출/형식 오류 거부. ocr:true는 운영자 세션이 있는 경우에만 허용합니다. PDF를 메모리에서 최대 긴 변 2000px로 렌더링하고 Tesseract 한국어/영어로 인식합니다. 언어 데이터는 npm 패키지에 포함되며 사용자 파일은 디스크에 쓰지 않습니다. 최대 10페이지입니다. DOCX는 ZIP 디렉터리의 압축 해제 크기 25MB/파일 수 1000개를 먼저 확인합니다.

AI 출력은 엄격한 JSON shape, 보기 수/중복, 정답 인덱스, 길이/한 문단 해설, 근거의 원문 포함, 직전 문항 중복을 검증합니다. 자료는 명령이 아닌 비신뢰 데이터로 프롬프트에 격리합니다. 구문 검증만으로 의미 정확성을 보장할 수 없으므로 실제 자료로 출제 품질 검토가 필요합니다. 자동은 핵심 개념 기반 3~20 권고, 직접 선택은 상한이며 감소 시 사유 필수. timeout 150초, 동시 생성 제한, IP별 요청 제한. 외부 모델 실패 시 샘플 문제로 대체하지 않습니다.

## 화면/접근성
자료 입력은 ‘파일 첨부 / 텍스트 붙여넣기’ 단일 선택 토글로 전환합니다. 기본값은 파일이며 선택된 입력 방식의 자료만 전송합니다. 모드를 바꿔도 첨부와 작성한 텍스트를 유지합니다. 첨부 후 선택 버튼 위에 확장자 아이콘·파일명·용량·첨부 완료 상태를 표시하고 파일 교체/삭제를 지원합니다. 파일명은 textContent로 표시하고 긴 이름은 줄바꿈합니다.
입력→생성중→풀이→채점됨→결과 상태. native radio/select/button, aria-live 결과/오류, 키보드 선택, 모바일 단일열. 진행 중 정답률은 answered 분모, 미채점은 ‘—’. 임시 복원 시 현재 문항과 채점 결과를 복원합니다. 헤더의 로그인과 내 학습 기록, 결과 화면의 결과 저장을 연결했습니다. 가입 후 저장 요청을 이어서 수행합니다. 저장 기록은 원문이 없어 재시험 버튼을 비활성화하고 재업로드를 안내합니다.

## 보안/운영과 검증
API key는 서버 환경변수만 사용. 파일명 경로 사용 금지. 화면 텍스트는 textContent로 렌더링, CSP/self 적용. 세션 만료 후 새 시험 안내. 공개 운영 전 계정 권한·분산 저장·사용량 과금 제한·파일 압축폭탄 방어·PDF/OCR 격리 작업자·개인정보 보관정책 추가가 필요합니다. 현재 로컬 개발 서버는 127.0.0.1 바인딩입니다.

핵심 테스트: 출력 근거/정답/중복 검증, 시험 순서/수정 방지/권한, 입력 제한, 결과/복원 API 통합. 실제 SDK 호출 및 운영자 OCR은 환경 준비 후 검증합니다.


## 계정과 저장 API
Accounts는 Node 내장 SQLite를 사용합니다. 비밀번호는 무작위 salt + scrypt(64바이트)로 해시합니다. 세션 토큰은 SHA-256 해시만 DB에 보관하며 HttpOnly/SameSite=Strict 쿠키(7일)로 전달합니다. 가입/로그인 요청은 IP 기준 15분당 10회로 제한합니다. 사용자 ID와 역할은 서버 조회값만 신뢰합니다. 운영자는 npm run admin으로만 발급합니다. 이메일 소유권 인증은 구현하지 않은 로컬 계정입니다.
- POST /api/auth/register, /api/auth/login: {email,password} → 세션 쿠키 + user.
- GET /api/auth/me: 현재 user 또는 null.
- POST /api/auth/logout: 서버 세션 삭제/쿠키 만료.
- POST /api/records: 로그인 + X-Exam-Token으로 완료 시험을 본인 계정에 저장. {examId,title}. 원문·토큰 제외, 동일 시험 중복 저장은 갱신.
- GET /api/records, /api/records/:id: 본인 목록/전체 시험지. 타인 기록은 반환하지 않음.
Origin과 Host를 검사하고 로컬 호스트만 허용합니다. 중복 채점은 시험별 잠금으로 차단합니다. 기록 DB는 서버 재시작 후 유지됩니다.

## 로고
SVG에서 배경의 밝은 픽셀만 alpha로 제거했습니다. 체크의 회전 16도·110% 확대·오른쪽 획 단축·30px 간격 이동은 변환식으로 유지했습니다. 바탕색 이미지나 multiply 합성에 의존하지 않습니다.
