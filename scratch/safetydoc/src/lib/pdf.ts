import { PDFDocument } from 'pdf-lib';
import { createReport } from 'docx-templates';
import mammoth from 'mammoth';
import html2pdf from 'html2pdf.js';
import { DocTemplate } from '../config/templates';

export async function generateMergedPdf(templates: DocTemplate[], data: Record<string, any>) {
  const pdfsToMerge: Uint8Array[] = [];

  for (const template of templates) {
    try {
      // 1. DOCX 템플릿 로드
      const response = await fetch(template.docxUrl);
      if (!response.ok) {
        console.warn(`Template not found at ${template.docxUrl}. Using a fallback message.`);
        // 템플릿 파일이 아직 없는 경우를 대비한 폴백 로직 (데모용)
        pdfsToMerge.push(await createFallbackPdf(template.name, data));
        continue;
      }
      const templateBuffer = await response.arrayBuffer();

      // 2. docx-templates로 데이터 채우기
      const filledDocx = await createReport({
        template: new Uint8Array(templateBuffer),
        data: data,
        additionalJsContext: {
          // 서명 이미지 처리를 위한 헬퍼 (docx 템플릿 내에서 {signature(worker_0_signature)} 형태로 사용)
          signature: (url: string) => {
            if (!url) return null;
            const base64Data = url.split(',')[1];
            return { width: 3, height: 1.5, data: base64Data, extension: '.png' };
          }
        }
      });

      // 3. DOCX -> HTML 변환 (mammoth)
      const { value: html } = await mammoth.convertToHtml({ arrayBuffer: filledDocx });

      // 4. HTML -> PDF 변환 (html2pdf)
      const element = document.createElement('div');
      element.innerHTML = `
        <div style="padding: 40px; font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; line-height: 1.6;">
          <h1 style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px;">${template.name}</h1>
          ${html}
        </div>
      `;
      
      const pdfBlob = await html2pdf()
        .from(element)
        .set({
          margin: 10,
          filename: 'temp.pdf',
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        })
        .outputPdf('blob');

      const pdfArrayBuffer = await pdfBlob.arrayBuffer();
      pdfsToMerge.push(new Uint8Array(pdfArrayBuffer));
    } catch (error) {
      console.error(`Error processing template ${template.name}:`, error);
      // 에러 발생 시 폴백 PDF라도 생성하여 흐름 유지
      pdfsToMerge.push(await createFallbackPdf(template.name, data));
    }
  }

  // 5. 여러 PDF 합치기
  const mergedPdf = await PDFDocument.create();
  for (const pdfBytes of pdfsToMerge) {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  return await mergedPdf.save();
}

// 템플릿 파일이 없을 때를 위한 임시 PDF 생성 함수
async function createFallbackPdf(title: string, data: Record<string, any>) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  const { height } = page.getSize();
  
  page.drawText(`${title} (템플릿 파일 대기 중)`, { x: 50, y: height - 50, size: 20 });
  page.drawText(`입력된 데이터:`, { x: 50, y: height - 80, size: 12 });
  
  let y = height - 100;
  Object.entries(data).forEach(([key, value]) => {
    if (typeof value === 'string' && !value.startsWith('data:image')) {
      page.drawText(`${key}: ${value}`, { x: 50, y, size: 10 });
      y -= 15;
    }
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

export async function sharePdf(pdfBytes: Uint8Array, fileName: string) {
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const file = new File([blob], fileName, { type: 'application/pdf' });

  if (navigator.share && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: fileName,
        text: '안전서류 PDF를 공유합니다.',
      });
    } catch (error) {
      console.error('Sharing failed', error);
      downloadPdf(blob, fileName);
    }
  } else {
    downloadPdf(blob, fileName);
  }
}

function downloadPdf(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
