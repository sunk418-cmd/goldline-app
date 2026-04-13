import { GoogleGenAI, Type } from "@google/genai";

const MODEL_NAME = "gemini-3-flash-preview";

export async function askGemini(question: string, context: { trackMaintenanceReg: string, maintenanceGuide: string, trackInspectionReg: string }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const systemInstruction = `
    당신은 김포골드라인 토목팀 규정 검색 도우미입니다.
    제공된 3개 문서를 매우 철저하게 분석하여 사용자의 질문에 가장 적합한 정보를 찾아 답변하세요.
    단순한 키워드 매칭을 넘어, 질문의 의도를 파악하고 관련 수치(주기, 오차 범위, 조치 방법 등)를 정확히 추출해야 합니다.

    === 선로정비내규 ===
    ${context.trackMaintenanceReg}

    === 유지관리지침 ===
    ${context.maintenanceGuide}

    === 선로검사내규 ===
    ${context.trackInspectionReg}

    답변 시 다음 지침을 반드시 준수하세요:
    1. **철저한 검색**: 질문과 관련된 내용이 문서의 어느 부분에라도 있다면 반드시 찾아내어 답변하세요. 조금이라도 관련이 있다면 생략하지 마세요.
    2. **정확한 수치**: 규정에 명시된 정확한 수치(mm, 개월, 회 등)를 포함하여 답변하세요.
    3. **구조화 (Markdown)**: 관련 조항(예: **제N조**), 제목, 내용을 명확히 구분하고, 글머리 기호('-', '•')와 **굵게** 표시를 사용하여 가독성을 높이세요.
    4. **형식 엄수**: 반드시 아래의 3개 섹션 형식을 유지하세요. 각 섹션 헤더는 정확히 '###문서이름###' 형태여야 합니다.

    ###선로정비내규###
    (찾은 내용 또는 '관련사항 없음')

    ###유지관리지침###
    (찾은 내용 또는 '관련사항 없음')

    ###선로검사내규###
    (찾은 내용 또는 '관련사항 없음')

    * 주의: 각 섹션에 내용이 없을 때만 '관련사항 없음'이라고 작성하세요. 최대한 관련 내용을 찾으려고 노력하세요.
    * 한국어로 답변하세요.
  `;

  const prompt = `사용자 질문: ${question}`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.2,
      },
    });

    return response.text || "답변을 생성할 수 없습니다.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    // Handle "Failed to fetch" specifically
    if (error.message?.includes("Failed to fetch") || error.name === "TypeError") {
      throw new Error("네트워크 연결 오류: Gemini API 서버에 접속할 수 없습니다. 인터넷 연결이나 지역 제한을 확인해 주세요.");
    }
    
    throw error;
  }
}
