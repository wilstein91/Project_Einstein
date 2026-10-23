import base64, re, sys
root, shim_path, out = sys.argv[1:4]
read = lambda p: open(root + '/' + p, encoding='utf-8').read()
def data_uri(p, mime):
    return 'data:%s;base64,%s' % (mime, base64.b64encode(open(root + '/' + p, 'rb').read()).decode())

def sub(s, old, new):
    assert s.count(old) == 1, old[:70]
    return s.replace(old, new)

app = read('public/app.js')
app = re.sub(r"async function api\(path,body\)\{.*?\n", "", app, count=1)
app = sub(app, "[['#account-button','로그인 · 구현 중'],['#history-button','내 학습 기록 · 구현 중']]", "[['#account-button','로그인 · 구현 중']]")
app = sub(app, "b.title='회원가입·로그인과 기록 저장은 구현 중입니다.';}return;}", "b.title='회원가입·로그인은 구현 중입니다.';}document.querySelector('#history-button').onclick=()=>history();return;}")
app = sub(app, "'첨부한 원본 파일은 서버에 저장하지 않습니다. 분석용 텍스트는 학습 세션 종료(30분 미사용) 후 1분 이내 파기됩니다. 재접속하거나 서버가 재시작되면 자료를 다시 첨부해야 할 수 있습니다.'",
          "'첨부한 파일은 이 브라우저 안에서만 읽고 어디에도 저장하지 않습니다. 스캔 PDF(글자를 선택할 수 없는 PDF)는 읽지 못합니다. 새로고침하면 자료를 다시 첨부해야 합니다.'")
app = sub(app, "'생성된 문항·해설·자료 근거와 풀이 결과는 최대 24시간 임시 보관 후 지워집니다. 회원가입과 기록 저장은 구현 중입니다.'",
          "'끝까지 푼 시험지는 이 브라우저의 내 학습 기록에만 남습니다. 다른 기기나 다른 사람에게는 보이지 않습니다.'")
app = sub(app, "text.maxLength=80000;text.placeholder='공부한 내용을 여기에 붙여넣어 주세요. (30~80,000자)';", "text.maxLength=60000;text.placeholder='공부한 내용을 여기에 붙여넣어 주세요. (30~60,000자)';")
app = sub(app, "config.accounts?'결과 저장':'결과 저장 · 구현 중'", "config.accounts?'결과 저장':'내 학습 기록에 저장됨'")
app = sub(app, "'저장한 시험지와 정답·해설을 다시 확인해보세요.'", "'이 브라우저에 저장된 최근 30개 시험지입니다. 브라우저 데이터를 지우면 함께 사라집니다.'")
app = sub(app, "'저장한 기록이 아직 없습니다. 시험을 마친 뒤 결과 저장을 눌러주세요.'", "'아직 기록이 없습니다. 시험을 끝까지 풀면 여기에 자동으로 남습니다.'")
app = sub(app, "img.src='/assets/study-sprout.png'", "img.src='" + data_uri('public/assets/study-sprout.png', 'image/png') + "'")

html = read('public/index.html')
body = html.split('<body>', 1)[1].split('</body>', 1)[0]
body = sub(body, '/assets/logo-rotated-10.svg?v=transparent-final', data_uri('public/assets/logo-rotated-10.svg', 'image/svg+xml'))
body = sub(body, 'href="/"', 'href="#"')
body = sub(body, '내 PC의 Claude로 문제를 만듭니다.', '내 Claude 계정으로 문제를 만들고, 기록은 이 브라우저에만 남깁니다.')

page = '\n'.join([
 '<title>이해했나?</title>',
 '<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>',
 '<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"></script>',
 '<script src="https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.8.0/mammoth.browser.min.js"></script>',
 '<style>' + read('public/style.css') + '\n:root{color-scheme:light}body{background:#f6f5ef}</style>',
 body,
 '<script>\n' + open(shim_path, encoding='utf-8').read() + '\n' + app.replace("const app=document.querySelector('#app');", "const app=document.querySelector('#app');document.querySelector('.brand').addEventListener('click',e=>{e.preventDefault();if(!busy){try{localStorage.removeItem(KEY);}catch{}home();}});", 1) + '\n</script>',
])
open(out, 'w', encoding='utf-8').write(page)
print(len(page))
