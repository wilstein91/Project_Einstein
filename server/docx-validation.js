// Inspect the ZIP directory before inflating DOCX contents.
export function validateDocx(buffer){
  const end=buffer.lastIndexOf(Buffer.from([0x50,0x4b,0x05,0x06]));
  if(end<0||end+22>buffer.length)throw Error('올바른 DOCX 파일이 아닙니다.');
  const count=buffer.readUInt16LE(end+10);let offset=buffer.readUInt32LE(end+16),total=0;
  if(count>1000)throw Error('DOCX 내부 파일 수가 너무 많습니다.');
  for(let i=0;i<count;i++){
    if(offset+46>buffer.length||buffer.readUInt32LE(offset)!==0x02014b50)throw Error('손상된 DOCX 파일입니다.');
    if(buffer.readUInt16LE(offset+8)&1)throw Error('암호화 DOCX는 지원하지 않습니다.');
    total+=buffer.readUInt32LE(offset+24);
    if(total>25*1024*1024)throw Error('DOCX 압축 해제 크기는 25MB까지 지원합니다.');
    offset+=46+buffer.readUInt16LE(offset+28)+buffer.readUInt16LE(offset+30)+buffer.readUInt16LE(offset+32);
  }
}
