import {createRequire} from 'node:module';
import {createWorker} from 'tesseract.js';
import {mkdir,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
let languageSetup;
async function languagePath(){
  const destination=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../.runtime/ocr-languages');
  languageSetup ||= (async()=>{await mkdir(destination,{recursive:true});for(const code of ['kor','eng'])await copyFile(path.join(require('@tesseract.js-data/'+code).langPath,code+'.traineddata.gz'),path.join(destination,code+'.traineddata.gz'));})();
  await languageSetup;return destination;
}
export async function ocrPDF(buffer){
  const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');const {createCanvas}=await import('@napi-rs/canvas');
  const task=pdfjs.getDocument({data:new Uint8Array(buffer),isEvalSupported:false,standardFontDataUrl:path.join(path.dirname(require.resolve('pdfjs-dist/package.json')),'standard_fonts').split(path.sep).join('/')+'/'});let worker;
  try{
    const doc=await task.promise;if(await doc.getPermissions()!==null)throw Error('암호화 PDF는 지원하지 않습니다.');
    if(doc.numPages>10)throw Error('운영자 OCR은 한 번에 10페이지까지 지원합니다.');
    worker=await createWorker('eng+kor',1,{cacheMethod:'none',gzip:true,langPath:await languagePath(),errorHandler:()=>{}});
    const chunks=[];
    for(let n=1;n<=doc.numPages;n++){
      const page=await doc.getPage(n);const initial=page.getViewport({scale:1});const scale=Math.min(2,2000/Math.max(initial.width,initial.height));const viewport=page.getViewport({scale});
      const canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));const context=canvas.getContext('2d');
      await page.render({canvasContext:context,viewport,canvas}).promise;
      const {data}=await worker.recognize(canvas.toBuffer('image/png'));chunks.push(data.text.trim());if(chunks.join('\n').length>80000)throw Error('자료는 80,000자까지 지원합니다.');
    }
    const text=chunks.join('\n').trim();if(text.length<30)throw Error('OCR로 충분한 텍스트를 인식하지 못했습니다.');return text;
  }catch(e){if(e.name==='PasswordException')throw Error('암호화 PDF는 지원하지 않습니다.');throw e;}finally{await worker?.terminate();await task.destroy();}
}
