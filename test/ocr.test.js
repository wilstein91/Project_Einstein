import test from 'node:test';
import assert from 'node:assert/strict';
import {extract} from '../server/extract.js';
import {textPDF,scannedPDF} from './pdf-fixtures.js';
test('텍스트 PDF 추출과 학생 OCR 차단',async()=>{const text=await extract({file:{name:'study.pdf',base64:textPDF().toString('base64')}});assert.match(text,/Agents use tools/);await assert.rejects(()=>extract({ocr:true,file:{name:'scan.pdf',base64:scannedPDF().toString('base64')}}),/운영자/);});
test('운영자 스캔 PDF OCR 실제 인식',{timeout:90000},async()=>{const text=await extract({ocr:true,file:{name:'scan.pdf',base64:scannedPDF().toString('base64')}},{admin:true});assert.match(text,/Agents/i);assert.match(text,/tools/i);assert.match(text,/Human/i);});
