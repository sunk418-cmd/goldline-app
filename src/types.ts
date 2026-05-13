export type UserRole = 'owner' | 'admin' | 'user';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  createdAt: any;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  author: string;
  authorEmail: string;
  createdAt: any;
}

export interface MeetingFile {
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  content: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  files?: MeetingFile[];
  createdAt: any;
}

export interface Drawing {
  id: string;
  title: string;
  imageUrl: string;
  fileType?: 'image' | 'pdf';
  fileSize?: number;
  category: '분기기 도면' | '선로일람약도' | '건축도면' | '기타 도면';
  createdAt: any;
}

export interface Resource {
  id: string;
  title: string;
  fileUrl: string;
  fileName?: string;
  fileType: string;
  fileSize?: number;
  createdAt: any;
}

export interface AllowedUser {
  email: string;
  role: UserRole;
}
