export interface RiskTask {
  id: string;
  task: string;
  details: string;
}

export interface RiskFactor {
  id: string;
  jobType: string;
  factor: string;
  measure?: string;
}

export interface RiskAssessment {
  id: string;
  jobName: string;
  tasks: RiskTask[];
  riskFactors: RiskFactor[];
  updatedAt: string;
}

export const INITIAL_RISK_DATA: RiskAssessment[] = [
  {
    id: '1',
    jobName: '분기기 인력점검',
    tasks: [
      { id: '1-1', task: '현장 도착 및 안전교육', details: '열차감시원 배치 및 작업 전 TBM 실시' },
      { id: '1-2', task: '분기기 상태 점검', details: '텅레일 밀착 상태 및 체결구 이완 확인' },
      { id: '1-3', task: '윤활유 도포', details: '활동부 이물질 제거 후 윤활유 도포' },
    ],
    riskFactors: [
      { id: '1-f1', jobType: '궤도', factor: '열차 진입에 의한 충돌 사고 위험', measure: '열차감시원 배치 및 무전기 확인' },
      { id: '1-f2', jobType: '궤도', factor: '분기부 가동부 손가락 협착 위험', measure: '안전장갑 착용 및 신호 체계 확립' },
    ],
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    jobName: '레일 교체',
    tasks: [
      { id: '2-1', task: '작업 구간 차단', details: '전차선 단전 확인 및 접지 걸이 설치' },
      { id: '2-2', task: '기존 레일 절단 및 인출', details: '레일 절단기 사용 및 윈치 활용 인출' },
      { id: '2-3', task: '신규모 레일 부설', details: '타이템퍼링 및 체결구 조임 작업' },
    ],
    riskFactors: [
      { id: '2-f1', jobType: '궤도', factor: '무거운 레일 취급 중 근골격계 질환 및 끼임', measure: '장비 활용 및 2인 1조 작업 원칙 준수' },
      { id: '2-f2', jobType: '전기', factor: '전차선 근접 작업 시 감전 위험', measure: '단전 확인 및 접지걸이 설치 철저' },
    ],
    updatedAt: new Date().toISOString(),
  }
];
