export const APP_NAME = "김포골드라인 토목팀 앱";

export const DRAWING_CATEGORIES = [
  '분기기 도면',
  '선로일람약도',
  '건축도면',
  '기타 도면'
] as const;

export const ROUTES = {
  DASHBOARD: '/',
  NOTICES: '/notices',
  MEETINGS: '/meetings',
  DRAWINGS: '/drawings',
  RESOURCES: '/resources',
  REGULATIONS: '/regulations',
  ADMIN: '/admin',
  LOGIN: '/login',
  UNAUTHORIZED: '/unauthorized'
} as const;
