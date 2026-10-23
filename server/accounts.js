import {DatabaseSync} from 'node:sqlite';
import {randomBytes,randomUUID,scrypt as scryptCallback,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(scryptCallback);
const hash=t=>createHash('sha256').update(t).digest('hex');
export class Accounts {
  constructor(file){this.db=new DatabaseSync(file);this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,salt TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'student');
    CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS records(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),exam_id TEXT NOT NULL,title TEXT NOT NULL,data TEXT NOT NULL,created INTEGER NOT NULL,UNIQUE(user_id,exam_id));`);}
  async register(email,password,role='student'){
    email=String(email||'').trim().toLowerCase();
    if(!/^[^\s@]{1,100}@[^\s@]{1,100}\.[^\s@]{2,30}$/.test(email)||typeof password!=='string'||password.length<10||password.length>128)throw Error('올바른 이메일과 10~128자 비밀번호를 입력해주세요.');
    const salt=randomBytes(16).toString('hex');const key=await scrypt(password,salt,64);const id=randomUUID();
    try{this.db.prepare('INSERT INTO users VALUES(?,?,?,?,?)').run(id,email,key.toString('hex'),salt,role);}catch{throw Error('가입할 수 없는 이메일입니다. 기존 계정으로 로그인해주세요.');}
    return {id,email,role};
  }
  async login(email,password){const u=this.db.prepare('SELECT * FROM users WHERE email=?').get(String(email||'').trim().toLowerCase());const salt=u?.salt||'00000000000000000000000000000000';const key=await scrypt(String(password||'').slice(0,128),salt,64);if(!u||!timingSafeEqual(key,Buffer.from(u.password,'hex')))throw Error('이메일 또는 비밀번호를 확인해주세요.');return {id:u.id,email:u.email,role:u.role};}
  session(user){const token=randomBytes(32).toString('hex');this.db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());this.db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash(token),user.id,Date.now()+7*86400000);return token;}
  user(token){if(!token)return null;const u=this.db.prepare('SELECT users.id,email,role FROM users JOIN sessions ON users.id=sessions.user_id WHERE token=? AND expires>?').get(hash(token),Date.now());return u||null;}
  logout(token){if(token)this.db.prepare('DELETE FROM sessions WHERE token=?').run(hash(token));}
  save(user,exam,title){if(exam.answers.length!==exam.questions.length)throw Error('시험을 완료한 뒤 저장해주세요.');const id=randomUUID();const data={...exam,archived:true};delete data.token;delete data.source;delete data.sourceTouchedAt;const clean=String(title||'학습 이해도 시험').trim().slice(0,100)||'학습 이해도 시험';this.db.prepare('INSERT INTO records VALUES(?,?,?,?,?,?) ON CONFLICT(user_id,exam_id) DO UPDATE SET title=excluded.title,data=excluded.data').run(id,user.id,exam.id,clean,JSON.stringify(data),Date.now());return this.db.prepare('SELECT id FROM records WHERE user_id=? AND exam_id=?').get(user.id,exam.id);}
  list(user){return this.db.prepare('SELECT id,title,created,json_array_length(json_extract(data,\'$.questions\')) AS count FROM records WHERE user_id=? ORDER BY created DESC').all(user.id);}
  get(user,id){const row=this.db.prepare('SELECT title,data FROM records WHERE id=? AND user_id=?').get(id,user.id);if(!row)throw Error('기록이 없거나 접근 권한이 없습니다.');return {...JSON.parse(row.data),recordTitle:row.title};}
  close(){this.db.close();}
}
export function cookieToken(req){return (req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('study_session='))?.slice(14);}
export function sessionCookie(value){return `study_session=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${value?604800:0}${process.env.COOKIE_SECURE==='true'?'; Secure':''}`;}
