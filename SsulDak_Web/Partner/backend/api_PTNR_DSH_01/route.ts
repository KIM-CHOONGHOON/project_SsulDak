/**
 * SsulDak (쓸고닦고) - PTNR-DSH-01 (서비스 가능 지역 및 분야 설정) 백엔드 라우터
 * 
 * 물리적 격리: SsulDak_Web/Partner/backend/api_PTNR_DSH_01/route.ts
 * 엔드포인트 URL: POST /api/partner/ptnr_dsh_01
 * DB 연동: @/lib/db (MySQL 8.0, InnoDB)
 * 독립 전용 SQL: PTNR-DSH-01-SQL-001 ~ PTNR-DSH-01-SQL-003
 */

import { executeQuery } from '@/lib/db';

export interface RegionItem {
  sido: string;
  sigungu: string;
  fullRegionNm: string;
  isMainBase?: boolean;
  memo?: string;
}

export interface PartnerSettingResult {
  status: number;
  data: {
    success: boolean;
    code?: string;
    message?: string;
    settings?: {
      ptnrNo: string;
      serviceTypes: string[];
      activeRegions: RegionItem[];
      dispatchRadiusKm: number;
      urgentDispatchYn: 'Y' | 'N';
      minQuoteAmt: number;
      workDays: string[];
      workStartTime: string;
      workEndTime: string;
      nightCleanYn: 'Y' | 'N';
      modDt?: string;
    };
    regionCodes?: {
      sidoList: Array<{ cd: string; nm: string }>;
      sigunguList: Array<{ cd: string; nm: string; parentCd: string }>;
    };
    simulation?: {
      estimatedWeeklyMin: number;
      estimatedWeeklyMax: number;
      matchingSuitabilityPct: number;
      breakdown: {
        regularPct: number;
        regularWeeklyText: string;
        appliancePct: number;
        applianceWeeklyText: string;
        otherPct: number;
        otherWeeklyText: string;
      };
      projectedMonthlyMin: number;
      projectedMonthlyMax: number;
      projectedMonthlyText: string;
    };
  };
}

/**
 * 시뮬레이션 계산 헬퍼 함수
 */
function calculateDispatchSimulation(serviceTypes: string[], activeRegions: RegionItem[], radiusKm: number) {
  const regionCount = Math.max(1, activeRegions.length);
  const hasRegular = serviceTypes.includes('REGULAR');
  const hasAppliance = serviceTypes.includes('APPLIANCE');
  const hasMovein = serviceTypes.includes('MOVEIN');

  let baseMin = 4 * regionCount;
  let baseMax = 6 * regionCount;

  if (hasRegular) {
    baseMin += 4;
    baseMax += 6;
  }
  if (hasAppliance) {
    baseMin += 3;
    baseMax += 5;
  }
  if (hasMovein) {
    baseMin += 2;
    baseMax += 4;
  }

  // 출동 반경 가중치 (15km 기준)
  const radiusWeight = radiusKm >= 20 ? 1.2 : radiusKm <= 10 ? 0.8 : 1.0;
  const weeklyMin = Math.round(baseMin * radiusWeight);
  const weeklyMax = Math.round(baseMax * radiusWeight);

  // 비중 산출
  let regularWeight = hasRegular ? 60 : 0;
  let applianceWeight = hasAppliance ? 35 : 0;
  let moveinWeight = hasMovein ? 30 : 0;
  let totalW = regularWeight + applianceWeight + moveinWeight || 100;

  const regPct = hasRegular ? Math.round((regularWeight / totalW) * 95) : 0;
  const appPct = hasAppliance ? Math.round((applianceWeight / totalW) * 95) : 0;
  const othPct = 100 - regPct - appPct;

  // 예상 매출액 (단가 기준)
  // 정기청소 건당 ~7만, 가전 건당 ~15만, 입주 건당 ~35만
  const avgOrderPrice = (hasRegular ? 80000 : 0) + (hasAppliance ? 150000 : 0) + (hasMovein ? 300000 : 0) || 120000;
  const monthlyMin = Math.round((weeklyMin * 4 * avgOrderPrice * 0.7) / 10000) * 10000;
  const monthlyMax = Math.round((weeklyMax * 4 * avgOrderPrice * 0.9) / 10000) * 10000;

  return {
    estimatedWeeklyMin: Math.max(8, weeklyMin),
    estimatedWeeklyMax: Math.max(12, weeklyMax),
    matchingSuitabilityPct: Math.min(99, 85 + regionCount * 3 + (hasRegular ? 5 : 0)),
    breakdown: {
      regularPct: regPct,
      regularWeeklyText: `주 ${Math.round(weeklyMin * (regPct / 100))}~${Math.round(weeklyMax * (regPct / 100))}건 (${regPct}%)`,
      appliancePct: appPct,
      applianceWeeklyText: `주 ${Math.round(weeklyMin * (appPct / 100))}~${Math.round(weeklyMax * (appPct / 100))}건 (${appPct}%)`,
      otherPct: Math.max(0, othPct),
      otherWeeklyText: `주 1~2건 (${Math.max(0, othPct)}%)`
    },
    projectedMonthlyMin: Math.max(2500000, monthlyMin),
    projectedMonthlyMax: Math.max(4000000, monthlyMax),
    projectedMonthlyText: `${Math.max(2500000, monthlyMin).toLocaleString()} ~ ${Math.max(4000000, monthlyMax).toLocaleString()}원`
  };
}

/**
 * 지역 데이터 정규화 헬퍼
 */
function normalizeRegions(rawRegions: any): RegionItem[] {
  if (!rawRegions) return [];
  if (typeof rawRegions === 'string') {
    try {
      rawRegions = JSON.parse(rawRegions);
    } catch {
      rawRegions = rawRegions.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
  }

  if (Array.isArray(rawRegions)) {
    return rawRegions.map((item: any, idx: number) => {
      if (typeof item === 'string') {
        const parts = item.split(' ');
        const sido = parts[0] || '경기';
        const sigungu = parts.slice(1).join(' ') || item;
        return {
          sido,
          sigungu,
          fullRegionNm: item,
          isMainBase: idx === 0,
          memo: idx === 0 ? '메인 활동 거점 (대표 사업장)' : idx === 1 ? '차량 이동 10분 권역' : '인접 집중 권역'
        };
      }
      return {
        sido: item.sido || '경기',
        sigungu: item.sigungu || item.fullRegionNm || '',
        fullRegionNm: item.fullRegionNm || `${item.sido || ''} ${item.sigungu || ''}`.trim(),
        isMainBase: item.isMainBase ?? (idx === 0),
        memo: item.memo || (idx === 0 ? '메인 활동 거점 (대표 사업장)' : '출동 권역')
      };
    });
  }

  return [];
}

/**
 * 서비스 분야 정규화 헬퍼
 */
function normalizeServiceTypes(rawTypes: any): string[] {
  if (!rawTypes) return ['REGULAR'];
  if (typeof rawTypes === 'string') {
    try {
      const parsed = JSON.parse(rawTypes);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return rawTypes.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
  }
  if (Array.isArray(rawTypes)) return rawTypes;
  return ['REGULAR'];
}

/**
 * PTNR-DSH-01 비즈니스 로직 처리기
 */
export async function processPtnrDsh01(
  body: any,
  clientIp: string = '127.0.0.1',
  userAgent: string = 'Web/Console'
): Promise<PartnerSettingResult> {
  const { mode = 'GET_SETTINGS', ptnrNo = 'P20261000001' } = body || {};

  try {
    // =========================================================================
    // 모드 1: 기존 설정 및 행정구역 코드 조회 (GET_SETTINGS)
    // =========================================================================
    if (mode === 'GET_SETTINGS') {
      // 1) PTNR-DSH-01-SQL-001 (기존 설정 조회)
      const settingSql = `
        SELECT 
          PTNR_NO AS ptnrNo,
          SERVICE_TYPES AS serviceTypes,
          ACTIVE_REGIONS AS activeRegions,
          DISPATCH_RADIUS_KM AS dispatchRadiusKm,
          URGENT_DISPATCH_YN AS urgentDispatchYn,
          MIN_QUOTE_AMT AS minQuoteAmt,
          WORK_DAYS AS workDays,
          WORK_START_TIME AS workStartTime,
          WORK_END_TIME AS workEndTime,
          NIGHT_CLEAN_YN AS nightCleanYn,
          MOD_DT AS modDt
        FROM TB_PARTNER_SETTING
        WHERE PTNR_NO = ?
      `;
      const settingRows = (await executeQuery(settingSql, [ptnrNo])) as any[];

      // 2) PTNR-DSH-01-SQL-002 (행정구역 코드 목록 조회)
      const codeSql = `
        SELECT 
          GRP_CD AS grpCd,
          COM_CD AS comCd,
          COM_NM AS comNm,
          ATTR_VAL_1 AS parentCd,
          SORT_ORD AS sortOrd
        FROM TB_COM_CODE
        WHERE GRP_CD IN ('ADMIN_SIDO', 'ADMIN_SIGUNGU') AND USE_YN = 'Y'
        ORDER BY SORT_ORD ASC
      `;
      let codeRows = (await executeQuery(codeSql, [])) as any[];

      // 행정구역 코드가 비어있을 경우 fallback 안전 보장
      if (!codeRows || codeRows.length === 0) {
        codeRows = [
          { grpCd: 'ADMIN_SIDO', comCd: '41', comNm: '경기도', parentCd: null, sortOrd: 1 },
          { grpCd: 'ADMIN_SIDO', comCd: '11', comNm: '서울특별시', parentCd: null, sortOrd: 2 },
          { grpCd: 'ADMIN_SIDO', comCd: '28', comNm: '인천광역시', parentCd: null, sortOrd: 3 },
          { grpCd: 'ADMIN_SIGUNGU', comCd: '41281', comNm: '고양시 일산동구', parentCd: '41', sortOrd: 1 },
          { grpCd: 'ADMIN_SIGUNGU', comCd: '41285', comNm: '고양시 일산서구', parentCd: '41', sortOrd: 2 },
          { grpCd: 'ADMIN_SIGUNGU', comCd: '41287', comNm: '고양시 덕양구', parentCd: '41', sortOrd: 3 },
          { grpCd: 'ADMIN_SIGUNGU', comCd: '41480', comNm: '파주시 전역', parentCd: '41', sortOrd: 4 },
          { grpCd: 'ADMIN_SIGUNGU', comCd: '41570', comNm: '김포시 전체', parentCd: '41', sortOrd: 5 }
        ];
      }

      const sidoList = codeRows
        .filter((r) => r.grpCd === 'ADMIN_SIDO')
        .map((r) => ({ cd: r.comCd, nm: r.comNm }));

      const sigunguList = codeRows
        .filter((r) => r.grpCd === 'ADMIN_SIGUNGU')
        .map((r) => ({ cd: r.comCd, nm: r.comNm, parentCd: r.parentCd || '' }));

      let serviceTypes: string[] = ['REGULAR', 'APPLIANCE'];
      let activeRegions: RegionItem[] = [
        { sido: '경기', sigungu: '고양시 일산동구', fullRegionNm: '경기 고양시 일산동구', isMainBase: true, memo: '메인 활동 거점 (대표 사업장)' },
        { sido: '경기', sigungu: '고양시 일산서구', fullRegionNm: '경기 고양시 일산서구', isMainBase: false, memo: '차량 이동 10분 권역' },
        { sido: '경기', sigungu: '파주시', fullRegionNm: '경기 파주시 전역', isMainBase: false, memo: '운정/교하지구 집중 커버' }
      ];
      let dispatchRadiusKm = 15;
      let urgentDispatchYn: 'Y' | 'N' = 'Y';
      let minQuoteAmt = 50000;
      let workDays = ['월', '화', '수', '목', '금', '토'];
      let workStartTime = '08:00';
      let workEndTime = '18:00';
      let nightCleanYn: 'Y' | 'N' = 'N';
      let modDt: string | undefined = undefined;

      if (settingRows && settingRows.length > 0) {
        const row = settingRows[0];
        serviceTypes = normalizeServiceTypes(row.serviceTypes);
        activeRegions = normalizeRegions(row.activeRegions);
        if (activeRegions.length === 0) {
          activeRegions = [
            { sido: '경기', sigungu: '고양시 일산동구', fullRegionNm: '경기 고양시 일산동구', isMainBase: true, memo: '메인 활동 거점 (대표 사업장)' },
            { sido: '경기', sigungu: '고양시 일산서구', fullRegionNm: '경기 고양시 일산서구', isMainBase: false, memo: '차량 이동 10분 권역' },
            { sido: '경기', sigungu: '파주시', fullRegionNm: '경기 파주시 전역', isMainBase: false, memo: '운정/교하지구 집중 커버' }
          ];
        }
        dispatchRadiusKm = Number(row.dispatchRadiusKm) || 15;
        urgentDispatchYn = row.urgentDispatchYn === 'N' ? 'N' : 'Y';
        minQuoteAmt = Number(row.minQuoteAmt) || 50000;
        if (row.workDays) {
          try {
            workDays = typeof row.workDays === 'string' ? JSON.parse(row.workDays) : row.workDays;
          } catch {
            workDays = ['월', '화', '수', '목', '금', '토'];
          }
        }
        workStartTime = row.workStartTime || '08:00';
        workEndTime = row.workEndTime || '18:00';
        nightCleanYn = row.nightCleanYn === 'Y' ? 'Y' : 'N';
        modDt = row.modDt ? new Date(row.modDt).toISOString() : undefined;
      }

      const simulation = calculateDispatchSimulation(serviceTypes, activeRegions, dispatchRadiusKm);

      return {
        status: 200,
        data: {
          success: true,
          settings: {
            ptnrNo,
            serviceTypes,
            activeRegions,
            dispatchRadiusKm,
            urgentDispatchYn,
            minQuoteAmt,
            workDays,
            workStartTime,
            workEndTime,
            nightCleanYn,
            modDt
          },
          regionCodes: {
            sidoList,
            sigunguList
          },
          simulation
        }
      };
    }

    // =========================================================================
    // 모드 2: 맞춤 설정 저장 (SAVE_SETTINGS)
    // =========================================================================
    if (mode === 'SAVE_SETTINGS') {
      const {
        serviceTypes = [],
        activeRegions = [],
        dispatchRadiusKm = 15,
        urgentDispatchYn = 'Y',
        minQuoteAmt = 50000,
        workDays = ['월', '화', '수', '목', '금', '토'],
        workStartTime = '08:00',
        workEndTime = '18:00',
        nightCleanYn = 'N'
      } = body || {};

      // 1) 비즈니스 룰 유효성 검증
      if (!Array.isArray(serviceTypes) || serviceTypes.length === 0) {
        return {
          status: 400,
          data: {
            success: false,
            code: 'REQ_CATEGORY_MIN_1',
            message: '최소 1개 이상의 전문 시공 서비스 분야를 선택해 주세요.'
          }
        };
      }

      if (!Array.isArray(activeRegions) || activeRegions.length === 0) {
        return {
          status: 400,
          data: {
            success: false,
            code: 'REQ_REGION_MIN_1',
            message: '최소 1곳 이상의 활동 가능 지역을 등록해 주세요.'
          }
        };
      }

      if (activeRegions.length > 5) {
        return {
          status: 400,
          data: {
            success: false,
            code: 'REGION_MAX_5',
            message: '활동 지역은 최대 5개까지만 등록 가능합니다.'
          }
        };
      }

      // 중복 지역 필터링
      const uniqueRegions: RegionItem[] = [];
      const seen = new Set<string>();
      for (const reg of activeRegions) {
        const fullNm = typeof reg === 'string' ? reg : reg.fullRegionNm || `${reg.sido} ${reg.sigungu}`;
        if (!seen.has(fullNm)) {
          seen.add(fullNm);
          uniqueRegions.push(
            typeof reg === 'string'
              ? { sido: fullNm.split(' ')[0] || '경기', sigungu: fullNm.split(' ').slice(1).join(' ') || fullNm, fullRegionNm: fullNm }
              : reg
          );
        }
      }

      const serviceTypesJson = JSON.stringify(serviceTypes);
      const activeRegionsJson = JSON.stringify(uniqueRegions);
      const workDaysJson = JSON.stringify(workDays);

      // 2) PTNR-DSH-01-SQL-003 (파트너 맞춤 설정 UPSERT)
      const upsertSql = `
        INSERT INTO TB_PARTNER_SETTING (
          PTNR_NO, 
          SERVICE_TYPES, 
          ACTIVE_REGIONS, 
          DISPATCH_RADIUS_KM, 
          URGENT_DISPATCH_YN, 
          MIN_QUOTE_AMT, 
          WORK_DAYS, 
          WORK_START_TIME, 
          WORK_END_TIME, 
          NIGHT_CLEAN_YN, 
          REG_DT, 
          REG_ID, 
          MOD_DT, 
          MOD_ID
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, NOW(), ?
        )
        ON DUPLICATE KEY UPDATE
          SERVICE_TYPES = VALUES(SERVICE_TYPES),
          ACTIVE_REGIONS = VALUES(ACTIVE_REGIONS),
          DISPATCH_RADIUS_KM = VALUES(DISPATCH_RADIUS_KM),
          URGENT_DISPATCH_YN = VALUES(URGENT_DISPATCH_YN),
          MIN_QUOTE_AMT = VALUES(MIN_QUOTE_AMT),
          WORK_DAYS = VALUES(WORK_DAYS),
          WORK_START_TIME = VALUES(WORK_START_TIME),
          WORK_END_TIME = VALUES(WORK_END_TIME),
          NIGHT_CLEAN_YN = VALUES(NIGHT_CLEAN_YN),
          MOD_DT = NOW(),
          MOD_ID = VALUES(MOD_ID)
      `;

      await executeQuery(upsertSql, [
        ptnrNo,
        serviceTypesJson,
        activeRegionsJson,
        Number(dispatchRadiusKm) || 15,
        urgentDispatchYn === 'N' ? 'N' : 'Y',
        Number(minQuoteAmt) || 50000,
        workDaysJson,
        workStartTime || '08:00',
        workEndTime || '18:00',
        nightCleanYn === 'Y' ? 'Y' : 'N',
        ptnrNo,
        ptnrNo
      ]);

      const simulation = calculateDispatchSimulation(serviceTypes, uniqueRegions, Number(dispatchRadiusKm) || 15);

      return {
        status: 200,
        data: {
          success: true,
          message: '맞춤 공고 설정이 성공적으로 저장되었습니다. (5분 내 전국 관제 반영)',
          settings: {
            ptnrNo,
            serviceTypes,
            activeRegions: uniqueRegions,
            dispatchRadiusKm: Number(dispatchRadiusKm) || 15,
            urgentDispatchYn: urgentDispatchYn === 'N' ? 'N' : 'Y',
            minQuoteAmt: Number(minQuoteAmt) || 50000,
            workDays,
            workStartTime,
            workEndTime,
            nightCleanYn: nightCleanYn === 'Y' ? 'Y' : 'N'
          },
          simulation
        }
      };
    }

    return {
      status: 400,
      data: {
        success: false,
        code: 'INVALID_MODE',
        message: `지원하지 않는 처리 모드입니다: ${mode}`
      }
    };
  } catch (error: any) {
    console.error('[PTNR-DSH-01 Backend Error]:', error);
    return {
      status: 500,
      data: {
        success: false,
        code: 'INTERNAL_SERVER_ERROR',
        message: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
      }
    };
  }
}

/**
 * Next.js App Router POST 핸들러
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Next.js Partner App';

    const result = await processPtnrDsh01(body, clientIp, userAgent);
    return new Response(JSON.stringify(result.data), {
      status: result.status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        code: 'BAD_REQUEST',
        message: error?.message || '잘못된 요청 형식입니다.'
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
