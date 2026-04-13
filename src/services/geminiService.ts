export async function askGemini(question: string, context: string | { trackMaintenanceReg: string, maintenanceGuide: string, trackInspectionReg: string }) {
  // Hardcoded for zero-failure delivery
  let apiKey = "AIzaSyDlTOP4gVLu_EdldXYHEj5MI5c-pS7EYXA";
  
  const contentText = typeof context === 'string' ? context : 
    `${context.trackMaintenanceReg}\n${context.maintenanceGuide}\n${context.trackInspectionReg}`;

  const prompt = `당신은 김포골드라인 토목팀 규정 검색 도우미입니다. 
다음 규정 데이터를 참고하여 사용자의 질문에 답변하세요.
반드시 ### 선로정비내규 ###, ### 실무지침서 ###, ### 선로점검내규 ### 3개 섹션으로 나누어 답변하세요.

규정 데이터:
${contentText}

사용자 질문: ${question}`;

  const modelId = "gemini-1.5-flash";
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();

    if (response.ok) {
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "답변을 찾을 수 없습니다.";
    } else {
      console.error("Gemini API Error details:", data);
      throw new Error(data.error?.message || "AI 응답 오류");
    }
  } catch (e: any) {
    console.error("Fetch error:", e);
    throw new Error(`검색 실패: ${e.message}`);
  }
}
