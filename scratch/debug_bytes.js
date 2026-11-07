const fs = require('fs');

// We have the doc buffer from scratch/test_pdf.js
// Let's inspect the buffer bytes directly
const { Buffer } = require('buffer');

const content = `BT /F1 12 Tf 50 700 Td (Hello World) Tj ET`;
const streamLen = Buffer.byteLength(content, 'latin1');

const header = '%PDF-1.3\n';
const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
const obj2 = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
const obj3 = '3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>\nendobj\n';
const obj4 = '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';
const obj5 = `5 0 obj\n<< /Length ${streamLen} >>\nstream\n${content}\nendstream\nendobj\n`;

const bHeader = Buffer.from(header, 'latin1');
const b1 = Buffer.from(obj1, 'latin1');
const b2 = Buffer.from(obj2, 'latin1');
const b3 = Buffer.from(obj3, 'latin1');
const b4 = Buffer.from(obj4, 'latin1');
const b5 = Buffer.from(obj5, 'latin1');

const p1 = bHeader.length;
const p2 = p1 + b1.length;
const p3 = p2 + b2.length;
const p4 = p3 + b3.length;
const p5 = p4 + b4.length;
const startxref = p5 + b5.length;

const xref = Buffer.from(
  'xref\n' +
  '0 6\n' +
  '0000000000 65535 f \n' +
  String(p1).padStart(10, '0') + ' 00000 n \n' +
  String(p2).padStart(10, '0') + ' 00000 n \n' +
  String(p3).padStart(10, '0') + ' 00000 n \n' +
  String(p4).padStart(10, '0') + ' 00000 n \n' +
  String(p5).padStart(10, '0') + ' 00000 n \n' +
  'trailer\n' +
  '<< /Size 6 /Root 1 0 R >>\n' +
  'startxref\n' +
  startxref + '\n' +
  '%%EOF\n',
  'latin1'
);

const doc = Buffer.concat([bHeader, b1, b2, b3, b4, b5, xref]);

console.log('Doc length:', doc.length);
console.log('startxref:', startxref);
console.log('At startxref:', JSON.stringify(doc.slice(startxref, startxref + 20).toString()));
console.log('p1:', p1, JSON.stringify(doc.slice(p1, p1 + 10).toString()));
console.log('p2:', p2, JSON.stringify(doc.slice(p2, p2 + 10).toString()));
console.log('p3:', p3, JSON.stringify(doc.slice(p3, p3 + 10).toString()));
console.log('p4:', p4, JSON.stringify(doc.slice(p4, p4 + 10).toString()));
console.log('p5:', p5, JSON.stringify(doc.slice(p5, p5 + 10).toString()));
