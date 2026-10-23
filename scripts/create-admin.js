import {mkdir} from 'node:fs/promises';
import {Accounts} from '../server/accounts.js';
await mkdir('.runtime',{recursive:true});
if(!process.env.ADMIN_EMAIL||!process.env.ADMIN_PASSWORD)throw Error('.env에 ADMIN_EMAIL과 ADMIN_PASSWORD(10자 이상)를 설정해주세요.');
const accounts=new Accounts('.runtime/accounts.sqlite');
try{await accounts.register(process.env.ADMIN_EMAIL,process.env.ADMIN_PASSWORD,'admin');console.log('운영자 계정을 생성했습니다. 설정한 이메일로 로그인해주세요.');}finally{accounts.close();}
