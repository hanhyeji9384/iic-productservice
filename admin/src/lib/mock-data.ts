import type { Member, Role, Permission, MemberHistory, Branch, Store, Department } from './types'

export const ROLES: Role[] = [
  { id: 'SUPER_ADMIN', name: '슈퍼 관리자', description: '전체 권한', memberCount: 2 },
  { id: 'HQ_OPS', name: '본사 운영팀', description: '티켓·고객·서비스 관리', memberCount: 8 },
  { id: 'HQ_RECEIVE', name: '본사 접수 담당', description: '티켓 접수 및 처리', memberCount: 12 },
  { id: 'STORE_RECEIVE',   name: '매장 접수 담당', description: '매장 접수 전용',             memberCount: 24 },
  { id: 'FRANCHISE_OWNER', name: '가맹점주',      description: '가맹 매장 접수 전용 (한국)', memberCount: 0  },
  { id: 'READONLY',        name: '조회 전용',      description: '전체 조회만 가능',           memberCount: 3  },
]

// 1차 오픈 대상: KR + US
export const BRANCHES: Branch[] = [
  { code: '1110', name: 'GM 본사', country: 'KR', currency: 'KRW' },
  { code: '1210', name: 'TB 본사', country: 'KR', currency: 'KRW' },
  { code: '1310', name: 'ND 본사', country: 'KR', currency: 'KRW' },
  { code: '1410', name: 'NF 본사', country: 'KR', currency: 'KRW' },
  { code: '1610', name: 'AT 본사', country: 'KR', currency: 'KRW' },
  { code: 'C1002', name: 'GM_미국법인', country: 'US', currency: 'USD' },
]

// 1차 오픈 대상 스토어: KR + US
export const STORES: Store[] = [
  // KR — GM 본사 (1110) — 직영
  { code: '2100', name: 'GM_MALL_롯데월드타워(잠실)',    country: 'KR', currency: 'KRW', branchCode: '1110', storeGroup: 120 },
  { code: '2110', name: 'GM_MALL_신세계 스타필드(하남)', country: 'KR', currency: 'KRW', branchCode: '1110', storeGroup: 120 },
  { code: '2300', name: 'GM_DS_갤러리아(압구정)',        country: 'KR', currency: 'KRW', branchCode: '1110', storeGroup: 110 },
  { code: '2310', name: 'GM_DS_갤러리아(광교)',          country: 'KR', currency: 'KRW', branchCode: '1110', storeGroup: 110 },
  { code: '2330', name: 'GM_DS_롯데(명동)',              country: 'KR', currency: 'KRW', branchCode: '1110', storeGroup: 110 },
  { code: '2340', name: 'GM_DS_롯데(잠실)',              country: 'KR', currency: 'KRW', branchCode: '1110', storeGroup: 110 },
  { code: '2370', name: 'GM_DS_신세계(명동)',            country: 'KR', currency: 'KRW', branchCode: '1110', storeGroup: 110 },
  { code: '2371', name: 'GM_DS_신세계(강남)',            country: 'KR', currency: 'KRW', branchCode: '1110', storeGroup: 110 },
  // KR — GM 본사 (1110) — 안경원 (가맹점, storeGroup: 140)
  { code: '3171', name: 'GM_OS_리엑스120',              country: 'KR', currency: 'KRW', branchCode: '1110', storeGroup: 140 },
  { code: '3170', name: 'GM_OS_블루선',                 country: 'KR', currency: 'KRW', branchCode: '1110', storeGroup: 140 },
  { code: '3167', name: 'GM_OS_눈사랑안경(남산점)',     country: 'KR', currency: 'KRW', branchCode: '1110', storeGroup: 140 },
  { code: '3164', name: 'GM_OS_망원블링크안경',         country: 'KR', currency: 'KRW', branchCode: '1110', storeGroup: 140 },
  { code: '3162', name: 'GM_OS_오르안경(김포점)',       country: 'KR', currency: 'KRW', branchCode: '1110', storeGroup: 140 },
  { code: '3161', name: 'GM_OS_루센트(수지성복점)',     country: 'KR', currency: 'KRW', branchCode: '1110', storeGroup: 140 },
  { code: '3157', name: 'GM_OS_스펙토안경원(상도점)',   country: 'KR', currency: 'KRW', branchCode: '1110', storeGroup: 140 },
  { code: '3155', name: 'GM_OS_옵시크안경원(문정점)',   country: 'KR', currency: 'KRW', branchCode: '1110', storeGroup: 140 },
  // US — GM_미국법인 (C1002) — 직영
  { code: 'US1001', name: 'GM_LosAngeles_FS_Downtown',  country: 'US', currency: 'USD', branchCode: 'C1002', storeGroup: 100 },
  { code: 'US1002', name: 'GM_NewYork_FS_Soho',         country: 'US', currency: 'USD', branchCode: 'C1002', storeGroup: 100 },
  { code: 'US1007', name: 'GM_CostaMesa_MALL_SCP',      country: 'US', currency: 'USD', branchCode: 'C1002', storeGroup: 120 },
  { code: 'US1009', name: 'GM_Houston_MALL_Galleria',   country: 'US', currency: 'USD', branchCode: 'C1002', storeGroup: 120 },
  { code: 'US1010', name: 'GM_NewYork_SS_DSM',          country: 'US', currency: 'USD', branchCode: 'C1002', storeGroup: 150 },
  { code: 'US1011', name: 'GM_LosAngeles_SS_DSM',       country: 'US', currency: 'USD', branchCode: 'C1002', storeGroup: 150 },
  { code: 'US1013', name: 'GM_LasVegas_MALL_TFS',       country: 'US', currency: 'USD', branchCode: 'C1002', storeGroup: 120 },
]

export const MEMBERS: Member[] = [
  { id: '1',  loginId: 'monster001', name: '김민준',     email: 'minjun.kim@gentlemonster.com',      tel: '010-1234-5678', country: 'KR', roleId: 'SUPER_ADMIN',   department: 'D003', status: 'active',   expiresAt: null,         createdAt: '2024-03-01', lastLoginAt: '2026-05-18T09:23:00', managedBranches: ['*'],             assignedStores: [] },
  { id: '2',  loginId: 'monster042', name: '이서연',     email: 'seoyeon.lee@gentlemonster.com',      tel: '010-2345-6789', country: 'KR', roleId: 'HQ_OPS',        department: 'D001', status: 'active',   expiresAt: null,         createdAt: '2024-04-15', lastLoginAt: '2026-05-17T14:11:00', managedBranches: ['*'],             assignedStores: [] },
  { id: '3',  loginId: 'monster078', name: '박지호',     email: 'jiho.park@gentlemonster.com',        tel: '010-3456-7890', country: 'KR', roleId: 'HQ_RECEIVE',    department: 'D001', status: 'active',   expiresAt: null,         createdAt: '2024-06-01', lastLoginAt: '2026-05-18T08:45:00', managedBranches: ['1110', 'C1002'], assignedStores: [] },
  { id: '4',  loginId: 'monster103', name: '최유나',     email: 'yuna.choi@gentlemonster.com',        tel: '010-4567-8901', country: 'KR', roleId: 'HQ_OPS',        department: 'D005', status: 'active',   expiresAt: null,         createdAt: '2024-08-20', lastLoginAt: '2026-05-16T16:30:00', managedBranches: ['1110', 'C1002'], assignedStores: [] },
  { id: '5',  loginId: 'store_kr01', name: '장다솔',     email: 'dasol.jang@gentlemonster.com',       tel: '010-1111-2345', country: 'KR', roleId: 'STORE_RECEIVE', department: 'D001', status: 'active',   expiresAt: '2026-12-31', createdAt: '2025-01-10', lastLoginAt: '2026-05-18T09:05:00', managedBranches: ['1110'],          assignedStores: ['2300', '2340'] },
  { id: '6',  loginId: 'store_us01', name: 'Sarah Kim',  email: 'sarah.kim@gentlemonster.com',        tel: '',              country: 'US', roleId: 'STORE_RECEIVE', department: 'D001', status: 'active',   expiresAt: '2026-12-31', createdAt: '2025-02-15', lastLoginAt: '2026-05-17T22:10:00', managedBranches: ['C1002'],         assignedStores: ['US1001', 'US1002'] },
  { id: '7',  loginId: 'monster155', name: '정태양',     email: 'taeyang.jung@gentlemonster.com',     tel: '010-5678-9012', country: 'KR', roleId: 'READONLY',      department: 'D002', status: 'inactive', expiresAt: null,         createdAt: '2024-09-01', lastLoginAt: '2026-02-10T10:00:00', managedBranches: ['1110'],          assignedStores: [] },
  { id: '8',  loginId: 'monster201', name: '한소희',     email: 'sohee.han@gentlemonster.com',        tel: '010-6789-0123', country: 'KR', roleId: 'HQ_RECEIVE',    department: 'D001', status: 'active',   expiresAt: null,         createdAt: '2025-03-01', lastLoginAt: '2026-05-18T08:55:00', managedBranches: ['1110', 'C1002'], assignedStores: [] },
  { id: '9',  loginId: 'store_kr02', name: '이민재',     email: 'minjae.lee@gentlemonster.com',       tel: '010-2222-3456', country: 'KR', roleId: 'STORE_RECEIVE', department: 'D001', status: 'active',   expiresAt: '2026-12-31', createdAt: '2025-01-20', lastLoginAt: '2026-05-18T08:40:00', managedBranches: ['1110'],          assignedStores: ['2100', '2110'] },
  { id: '10', loginId: 'store_us02', name: 'Kevin Oh',   email: 'kevin.oh@gentlemonster.com',         tel: '',              country: 'US', roleId: 'STORE_RECEIVE', department: 'D001', status: 'active',   expiresAt: '2026-12-31', createdAt: '2025-03-05', lastLoginAt: '2026-05-17T23:40:00', managedBranches: ['C1002'],         assignedStores: ['US1010', 'US1011'] },
  { id: '11', loginId: 'monster230', name: '오다연',     email: 'dayeon.oh@gentlemonster.com',        tel: '010-7890-1234', country: 'KR', roleId: 'HQ_RECEIVE',    department: 'D004', status: 'active',   expiresAt: null,         createdAt: '2025-04-01', lastLoginAt: '2026-05-18T09:01:00', managedBranches: ['1110'],          assignedStores: [] },
  { id: '12', loginId: 'monster245', name: '윤재현',     email: 'jaehyun.yoon@gentlemonster.com',     tel: '010-8901-2345', country: 'KR', roleId: 'HQ_OPS',        department: 'D001', status: 'active',   expiresAt: null,         createdAt: '2025-04-10', lastLoginAt: '2026-05-17T18:22:00', managedBranches: ['1110', 'C1002'], assignedStores: [] },
  { id: '13', loginId: 'store_kr03', name: '박수빈',     email: 'subin.park@gentlemonster.com',       tel: '010-3333-4567', country: 'KR', roleId: 'STORE_RECEIVE', department: 'D001', status: 'active',   expiresAt: '2027-06-30', createdAt: '2025-05-01', lastLoginAt: '2026-05-18T09:10:00', managedBranches: ['1110'],          assignedStores: ['2370', '2371'] },
  { id: '14', loginId: 'store_us03', name: 'Julie Park', email: 'julie.park@gentlemonster.com',       tel: '',              country: 'US', roleId: 'STORE_RECEIVE', department: 'D001', status: 'active',   expiresAt: '2027-06-30', createdAt: '2025-05-15', lastLoginAt: '2026-05-17T20:15:00', managedBranches: ['C1002'],         assignedStores: ['US1007', 'US1009'] },
  { id: '15', loginId: 'monster280', name: '강민서',     email: 'minseo.kang@gentlemonster.com',      tel: '010-9012-3456', country: 'KR', roleId: 'READONLY',      department: 'D006', status: 'active',   expiresAt: null,         createdAt: '2025-06-01', lastLoginAt: '2026-05-16T11:40:00', managedBranches: ['1110'],          assignedStores: [] },
  { id: '16', loginId: 'monster290', name: '임현우',     email: 'hyunwoo.lim@gentlemonster.com',      tel: '010-0123-4567', country: 'KR', roleId: 'HQ_RECEIVE',    department: 'D001', status: 'inactive', expiresAt: null,         createdAt: '2024-11-01', lastLoginAt: '2026-03-20T13:00:00', managedBranches: ['1110'],          assignedStores: [] },
  { id: '17', loginId: 'store_kr04', name: '최지원',     email: 'jiwon.choi@gentlemonster.com',       tel: '010-4444-5678', country: 'KR', roleId: 'STORE_RECEIVE', department: 'D001', status: 'active',   expiresAt: '2027-03-31', createdAt: '2025-07-01', lastLoginAt: '2026-05-17T08:50:00', managedBranches: ['1110'],          assignedStores: ['2330'] },
  { id: '18', loginId: 'store_us04', name: 'James Yoon', email: 'james.yoon@gentlemonster.com',       tel: '',              country: 'US', roleId: 'STORE_RECEIVE', department: 'D001', status: 'active',   expiresAt: '2027-03-31', createdAt: '2025-07-15', lastLoginAt: '2026-05-18T00:05:00', managedBranches: ['C1002'],         assignedStores: ['US1013'] },
  { id: '19', loginId: 'monster310', name: '배수진',     email: 'sujin.bae@gentlemonster.com',        tel: '010-1111-2222', country: 'KR', roleId: 'HQ_OPS',        department: 'D001', status: 'active',   expiresAt: null,         createdAt: '2025-08-01', lastLoginAt: '2026-05-17T10:30:00', managedBranches: ['*'],             assignedStores: [] },
  { id: '20', loginId: 'monster325', name: '신도윤',     email: 'doyoon.shin@gentlemonster.com',      tel: '010-2222-3333', country: 'KR', roleId: 'HQ_RECEIVE',    department: 'D001', status: 'active',   expiresAt: null,         createdAt: '2025-08-20', lastLoginAt: '2026-05-18T08:10:00', managedBranches: ['1110', 'C1002'], assignedStores: [] },
  { id: '21', loginId: 'store_kr05', name: '김다현',     email: 'dahyun.kim@gentlemonster.com',       tel: '010-5555-6789', country: 'KR', roleId: 'STORE_RECEIVE', department: 'D001', status: 'active',   expiresAt: '2027-01-31', createdAt: '2025-09-01', lastLoginAt: '2026-05-17T08:30:00', managedBranches: ['1110'],          assignedStores: ['2310'] },
  { id: '22', loginId: 'monster340', name: '홍예린',     email: 'yerin.hong@gentlemonster.com',       tel: '010-3333-4444', country: 'KR', roleId: 'READONLY',      department: 'D002', status: 'active',   expiresAt: null,         createdAt: '2025-09-15', lastLoginAt: '2026-05-15T15:00:00', managedBranches: ['1110'],          assignedStores: [] },
  { id: '23', loginId: 'monster355', name: '조성준',     email: 'sungjoon.cho@gentlemonster.com',     tel: '010-4444-5555', country: 'KR', roleId: 'HQ_RECEIVE',    department: 'D001', status: 'active',   expiresAt: null,         createdAt: '2025-10-01', lastLoginAt: '2026-05-18T07:55:00', managedBranches: ['1110', 'C1002'], assignedStores: [] },
  { id: '24', loginId: 'store_kr06', name: '윤서아',     email: 'seoa.yoon@gentlemonster.com',        tel: '010-6666-7890', country: 'KR', roleId: 'STORE_RECEIVE', department: 'D001', status: 'active',   expiresAt: '2026-12-31', createdAt: '2025-10-10', lastLoginAt: '2026-05-18T08:20:00', managedBranches: ['1110'],          assignedStores: ['2100'] },
  { id: '25', loginId: 'monster370', name: '문지수',     email: 'jisoo.moon@gentlemonster.com',       tel: '010-5555-6666', country: 'KR', roleId: 'HQ_OPS',        department: 'D005', status: 'inactive', expiresAt: null,         createdAt: '2024-12-01', lastLoginAt: '2026-01-15T09:00:00', managedBranches: ['1110'],          assignedStores: [] },
  { id: '26', loginId: 'store_us05', name: 'Emma Park',  email: 'emma.park@gentlemonster.com',        tel: '',              country: 'US', roleId: 'STORE_RECEIVE', department: 'D001', status: 'active',   expiresAt: '2027-06-30', createdAt: '2025-11-01', lastLoginAt: '2026-05-17T21:30:00', managedBranches: ['C1002'],         assignedStores: ['US1002'] },
  { id: '27', loginId: 'monster385', name: '서예진',     email: 'yejin.seo@gentlemonster.com',        tel: '010-6666-7777', country: 'KR', roleId: 'HQ_RECEIVE',    department: 'D001', status: 'active',   expiresAt: null,         createdAt: '2025-11-15', lastLoginAt: '2026-05-18T08:30:00', managedBranches: ['1110', 'C1002'], assignedStores: [] },
  { id: '28', loginId: 'monster400', name: '권태민',     email: 'taemin.kwon@gentlemonster.com',      tel: '010-7777-8888', country: 'KR', roleId: 'READONLY',      department: 'D003', status: 'inactive', expiresAt: null,         createdAt: '2025-01-01', lastLoginAt: '2025-12-01T10:00:00', managedBranches: ['1110'],          assignedStores: [] },
  { id: '29', loginId: 'store_kr07', name: '이채원',     email: 'chaewon.lee@gentlemonster.com',      tel: '010-8888-9012', country: 'KR', roleId: 'STORE_RECEIVE', department: 'D001', status: 'active',   expiresAt: '2027-03-31', createdAt: '2025-12-01', lastLoginAt: '2026-05-18T09:00:00', managedBranches: ['1110'],          assignedStores: ['2110'] },
  { id: '30', loginId: 'monster420', name: '남지우',     email: 'jiwoo.nam@gentlemonster.com',        tel: '010-8888-9999', country: 'KR', roleId: 'SUPER_ADMIN',   department: 'D003', status: 'active',   expiresAt: null,         createdAt: '2026-01-01', lastLoginAt: '2026-05-18T09:15:00', managedBranches: ['*'],             assignedStores: [] },
  { id: '31', loginId: 'monster563', name: '한혜지',     email: 'monster563@gentlemonster.com',       tel: '',              country: 'KR', roleId: 'SUPER_ADMIN',   department: 'D006', status: 'active',   expiresAt: null,         createdAt: '2024-01-01', lastLoginAt: '2026-05-20T10:00:00', managedBranches: ['*'],             assignedStores: [] },
  { id: '32', loginId: 'franchise01', name: '김가맹',    email: 'franchise01@partner.com',            tel: '010-1234-9999', country: 'KR', roleId: 'FRANCHISE_OWNER', department: 'D007', status: 'active',   expiresAt: '2027-12-31', createdAt: '2026-03-01', lastLoginAt: '2026-05-18T08:00:00', managedBranches: ['1110'], assignedStores: ['3171'] },
  { id: '33', loginId: 'monster1416', name: '백성현',    email: 'monster1416@gentlemonster.com',      tel: '',              country: 'KR', roleId: 'SUPER_ADMIN',   department: 'D006', status: 'active',   expiresAt: null,         createdAt: '2024-01-01', lastLoginAt: null,                  managedBranches: ['*'],             assignedStores: [] },
]

export const DEFAULT_PERMISSIONS: Permission[] = [
  { menuId: 'ticket',  menuName: '티켓',   create: true,  read: true,  update: true,  delete: false },
  { menuId: 'customer',menuName: '고객',   create: false, read: true,  update: true,  delete: false },
  { menuId: 'product', menuName: '제품',   create: false, read: true,  update: false, delete: false },
  { menuId: 'stock',   menuName: '재고',   create: true,  read: true,  update: true,  delete: false },
  { menuId: 'store',   menuName: '매장',   create: false, read: true,  update: false, delete: false },
  { menuId: 'member',  menuName: '회원',   create: false, read: false, update: false, delete: false },
  { menuId: 'role',    menuName: '권한',   create: false, read: false, update: false, delete: false },
  { menuId: 'service', menuName: '서비스', create: false, read: true,  update: false, delete: false },
  { menuId: 'log',     menuName: '로그',   create: false, read: false, update: false, delete: false },
  { menuId: 'settings',menuName: '설정',   create: false, read: false, update: false, delete: false },
]

export const MEMBER_HISTORY: MemberHistory[] = [
  {
    id: 'h1', memberId: '2', eventType: 'UPDATE', changedBy: 'monster001',
    changedAt: '2026-04-10T11:20:00',
    before: { roleId: 'HQ_RECEIVE' }, after: { roleId: 'HQ_OPS' },
  },
  {
    id: 'h2', memberId: '7', eventType: 'DEACTIVATE', changedBy: 'monster001',
    changedAt: '2026-05-01T09:00:00',
    before: { status: 'active' }, after: { status: 'inactive' },
  },
  {
    id: 'h3', memberId: '5', eventType: 'UPDATE', changedBy: 'monster042',
    changedAt: '2026-01-15T14:30:00',
    before: { expiresAt: '2025-12-31' }, after: { expiresAt: '2026-12-31' },
  },
]

export const DEPARTMENTS: Department[] = [
  { id: 'D001', name: 'PS팀',    description: '수리서비스 운영' },
  { id: 'D002', name: 'CS팀',    description: '고객서비스' },
  { id: 'D003', name: 'IT팀',    description: '시스템 개발 및 운영' },
  { id: 'D004', name: '물류팀',  description: '배송 및 물류 관리' },
  { id: 'D005', name: '마케팅팀', description: '마케팅 및 브랜드' },
  { id: 'D006', name: '기획팀',  description: '서비스 기획' },
  { id: 'D007', name: '가맹점', description: '가맹 파트너 매장' },
]

export const COUNTRIES: { code: string; name: string }[] = [
  { code: 'KR', name: '한국' },
  { code: 'US', name: '미국' },
  { code: 'CN', name: '중국' },
  { code: 'JP', name: '일본' },
  { code: 'GB', name: '영국' },
  { code: 'SG', name: '싱가포르' },
  { code: 'HK', name: '홍콩' },
  { code: 'TW', name: '대만' },
  { code: 'AU', name: '호주' },
  { code: 'FR', name: '프랑스' },
  { code: 'IT', name: '이탈리아' },
  { code: 'CA', name: '캐나다' },
  { code: 'AE', name: '아랍에미리트' },
  { code: 'MY', name: '말레이시아' },
  { code: 'TH', name: '태국' },
]
