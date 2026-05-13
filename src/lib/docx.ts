import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
// @ts-ignore
import ImageModule from 'docxtemplater-image-module-free';
// @ts-ignore
import DocxMerger from 'docx-merger';
import { saveAs } from 'file-saver';
import { DocTemplate } from '../constants/templates';

const TRANSPARENT_PIXEL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

function base64DataURLToArrayBuffer(dataURL: string) {
  if (!dataURL || dataURL === 'undefined') dataURL = TRANSPARENT_PIXEL;
  const base64Regex = /^data:image\/(png|jpg|jpeg|webp);base64,/;
  if (!base64Regex.test(dataURL)) {
    return false;
  }
  const stringBase64 = dataURL.replace(base64Regex, "");
  let binaryString;
  if (typeof window !== "undefined") {
    binaryString = window.atob(stringBase64);
  } else {
    binaryString = Buffer.from(stringBase64, "base64").toString("binary");
  }
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function generateMergedDocx(templates: DocTemplate[], data: Record<string, any>) {
  const generatedFiles: any[] = [];

  for (const template of templates) {
    try {
      // 템플릿 수정 시 브라우저 캐시를 무시하고 항상 최신 파일을 가져오도록 캐시 버스터 추가
      const response = await fetch(`${template.docxUrl}?t=${Date.now()}`);
      if (!response.ok) {
        console.warn(`Template not found at ${template.docxUrl}. Skipping.`);
        continue;
      }
      const blob = await response.blob();
      const binaryString = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsBinaryString(blob);
      });
      const pizZip = new PizZip(binaryString);
      
      const imageOptions = {
        getImage(tagValue: string, tagName: string) {
          if (!tagValue || tagValue === "undefined") return false;
          return base64DataURLToArrayBuffer(tagValue);
        },
        getSize(img: any, tagValue: string, tagName: string) {
          // 성명(수기)의 경우 가로로 조금 더 길게, 일반 서명은 기존 축소된 크기로 적용
          if (tagName && tagName.includes('name_handwritten')) {
            return [60, 25]; 
          }
          return [50, 25]; // 일반 서명 크기 축소 (기존 80x40 -> 50x25)
        }
      };

      const imageModule = new ImageModule(imageOptions);

      const doc = new Docxtemplater(pizZip, {
        paragraphLoop: true,
        linebreaks: true,
        modules: [imageModule],
        nullGetter(part: any) {
          if (!part.module) return "";
          if (part.module === "image") return TRANSPARENT_PIXEL;
          return "";
        }
      });

      // docxtemplater는 기본적으로 에러를 throw하므로 try-catch가 유용
      doc.render(data);

      const out = doc.getZip().generate({
        type: "arraybuffer",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      });

      generatedFiles.push({ id: template.id, name: template.name, data: out });
    } catch (error: any) {
      console.error(`Error processing template ${template.name}:`, error);
      if (error.properties && error.properties.errors) {
        const msgs = error.properties.errors.map((e: any) => e.message).join(', ');
        throw new Error(`[${template.name}] 양식 오류: ${msgs} (괄호 형식을 확인하세요)`);
      }
      throw new Error(`[${template.name}] 처리 오류: ${error.message || '알 수 없는 오류'}`);
    }
  }

  if (generatedFiles.length === 0) {
    throw new Error('생성된 문서가 없습니다. 템플릿 파일(.docx)이 public/templates/ 경로에 존재하는지 확인해주세요.');
  }

  // 가로 양식(음주측정)과 세로 양식(나머지) 분리
  const landscapeFiles = generatedFiles.filter(f => f.id === 'alcohol');
  const portraitFiles = generatedFiles.filter(f => f.id !== 'alcohol');

  // 1. 세로 양식 처리 (병합)
  if (portraitFiles.length > 0) {
    if (portraitFiles.length === 1) {
      const blob = new Blob([portraitFiles[0].data], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      saveAs(blob, `${portraitFiles[0].name}_${new Date().toISOString().split('T')[0]}.docx`);
    } else {
      const docxMerger = new DocxMerger({}, portraitFiles.map(f => f.data));
      docxMerger.save('blob', function(generatedBlob: Blob) {
        const blob = new Blob([generatedBlob], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
        saveAs(blob, `안전서류_병합본_${new Date().toISOString().split('T')[0]}.docx`);
      });
    }
  }

  // 2. 가로 양식 처리 (개별 다운로드)
  if (landscapeFiles.length > 0) {
    // 딜레이를 주어 브라우저의 다중 다운로드 차단을 우회할 수 있도록 함
    setTimeout(() => {
      landscapeFiles.forEach(f => {
        const blob = new Blob([f.data], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
        saveAs(blob, `${f.name}_가로형_${new Date().toISOString().split('T')[0]}.docx`);
      });
    }, 500);
  }

  return true;
}
