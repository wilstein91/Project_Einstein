import path from 'node:path';
import {createRequire} from 'node:module';
import {validateDocx} from './docx-validation.js';
const require=createRequire(import.meta.url);
export async function extract(input, {admin=false}={}) {
  if(input.ocr && !admin) throw Error('OCR은 로그인한 운영자만 사용할 수 있습니다.');
  if(input.ocr && (!input.file || !/\.pdf$/i.test(input.file.name||''))) throw Error('OCR은 PDF 파일에서만 사용할 수 있습니다.');
  if(input.file && input.text?.trim()) throw Error('파일 또는 텍스트 중 하나만 입력해주세요.');
  let text = input.text;
  if(input.file){
    const {name,base64}=input.file;
    if(typeof name!=='string'||typeof base64!=='string'||!base64.length||!/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) throw Error('파일 데이터가 올바르지 않습니다.');
    const buffer=Buffer.from(base64,'base64');
    if(buffer.length>10*1024*1024) throw Error('파일은 10MB까지 첨부할 수 있습니다.');
    switch(path.extname(name).toLowerCase()){
      case '.txt': case '.md': text=new TextDecoder('utf-8',{fatal:true}).decode(buffer);break;
      case '.docx': {validateDocx(buffer);const mammoth=await import('mammoth'); text=(await mammoth.extractRawText({buffer})).value;break;}
      case '.pdf': {
        if(input.ocr){const {ocrPDF}=await import('./ocr.js');text=await ocrPDF(buffer);break;}
        const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');
        let task,doc;
        try {task=pdfjs.getDocument({data:new Uint8Array(buffer),isEvalSupported:false,standardFontDataUrl:path.join(path.dirname(require.resolve('pdfjs-dist/package.json')),'standard_fonts').split(path.sep).join('/')+'/'});doc=await task.promise;
          if(await doc.getPermissions() !== null) throw Error('암호화 PDF는 지원하지 않습니다.');
          const parts=[];for(let n=1;n<=doc.numPages;n++){const page=await doc.getPage(n);parts.push((await page.getTextContent()).items.map(x=>x.str||'').join(' '));if(parts.join('\n').length>80000) throw Error('자료는 80,000자까지 지원합니다.');}text=parts.join('\n');
        }catch(e){if(e.name==='PasswordException') throw Error('암호화 PDF는 지원하지 않습니다.');throw e;}finally{await task?.destroy();}break;
      }
      default:throw Error('DOCX, PDF, MD, TXT 파일만 지원합니다.');
    }
  }
  if(typeof text!=='string'||text.trim().length<30) throw Error('추출 가능한 학습자료를 30자 이상 입력해주세요. 스캔 PDF의 OCR은 운영자 로그인 후 사용할 수 있습니다.');
  if(text.length>80000) throw Error('자료는 80,000자까지 지원합니다.');
  return text.trim();
}
