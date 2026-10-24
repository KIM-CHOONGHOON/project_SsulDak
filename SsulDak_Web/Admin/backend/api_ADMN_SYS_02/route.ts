/**
 * @file SsulDak_Web/Admin/backend/api_ADMN_SYS_02/route.ts
 * @description 최소 하한선 및 핵심 운영 정책 관리 백엔드 라우터 (ADMN-SYS-02)
 * 
 * [준수 사항]
 * - 역할별 물리적 격리: SsulDak_Web/Admin/backend 전용
 * - 1:1 독립 엔드포인트: POST /api/admin/admn_sys_02
 * - 5대 핵심 운영 파라미터 (계약기간 락, 수수료율, 하한액, 징계일수, 환불기한)
 * - 4대 서비스 분야별 덤핑 방지 최저 하한선 (Floor Price)
 * - 정책 변경 감사 로그 (TB_SYS_POLICY_LOG) 자동 영구 기록
 * - 전용 SQL 식별자: ADMN-SYS-02-SQL-001 ~ 003
 */

import { executeQuery, executeTransaction } from '@/lib/db';

export async function processAdmnSys02(body: any, clientIp = '192.168.0.12', userAgent = 'SsulDak-Enterprise-Admin/2.4') {
  const { mode = 'GET_ALL_POLICIES', adminId = 'admin01' } = body || {};

  try {
    // =========================================================================
    // 모드 1: 전체 시스템 정책 및 하한가 조회
    // =========================================================================
    if (mode === 'GET_ALL_POLICIES') {
      // ADMN-SYS-02-SQL-001 (전체 시스템 정책 및 하한가 조회)
      const sql001 = `
        SELECT 
          POLICY_KEY AS policyKey,
          POLICY_VAL AS policyVal,
          COALESCE(POLICY_DESC, '') AS policyDesc,
          COALESCE(VAL_TYPE_CD, 'STRING') AS valTypeCd,
          COALESCE(GRP_TYPE_CD, 'CORE_PARAM') AS grpTypeCd,
          DATE_FORMAT(MOD_DT, '%Y.%m.%d %H:%i:%s') AS modDtFormatted,
          COALESCE(MOD_ID, 'SYSTEM') AS modId
        FROM TB_SYS_POLICY
        ORDER BY GRP_TYPE_CD ASC, POLICY_KEY ASC;
      `;
      const rows: any = await executeQuery(sql001);

      // 키-값 맵 구성
      const policyMap: Record<string, any> = {};
      let lastModDt = '2026.10.23 11:20:05';
      let lastModId = 'admin01';

      for (const r of rows) {
        policyMap[r.policyKey] = r.policyVal;
        if (r.modDtFormatted && r.modDtFormatted > lastModDt) {
          lastModDt = r.modDtFormatted;
          lastModId = r.modId;
        }
      }

      const parameters = {
        minContractDays: parseInt(policyMap['MIN_CONTRACT_DAYS'] || '90', 10),
        dataFeeRate: parseFloat(policyMap['DATA_FEE_RATE'] || '3.3'),
        minDataFeeAmt: parseInt(policyMap['MIN_DATA_FEE_AMT'] || '33000', 10),
        sanctionSuspendDays: parseInt(policyMap['SANCTION_SUSPEND_DAYS'] || '7', 10),
        refund50LimitHours: parseInt(policyMap['REFUND_50_LIMIT_HOURS'] || '168', 10),
        refund50LimitDays: Math.round(parseInt(policyMap['REFUND_50_LIMIT_HOURS'] || '168', 10) / 24)
      };

      const floorPrices = {
        floorPriceStair4F: parseInt(policyMap['FLOOR_PRICE_STAIR_4F'] || '60000', 10),
        floorPriceAcStand: parseInt(policyMap['FLOOR_PRICE_AC_STAND'] || '80000', 10),
        floorPriceMoveinPerPyeong: parseInt(policyMap['FLOOR_PRICE_MOVEIN_PER_PYEONG'] || '11000', 10),
        floorPriceWashDrum: parseInt(policyMap['FLOOR_PRICE_WASH_DRUM'] || '90000', 10)
      };

      return {
        success: true,
        parameters,
        floorPrices,
        allPolicies: rows,
        lastModifiedAt: lastModDt,
        lastModifiedId: lastModId
      };
    }

    // =========================================================================
    // 모드 2: 정책 및 하한가 일괄 저장 및 적용 (트랜잭션 + 감사 로그)
    // =========================================================================
    if (mode === 'UPDATE_POLICIES') {
      const { parameters = {}, floorPrices = {}, customPolicies = [] } = body;

      // 1. 입력 유효성 검증
      if (parameters.dataFeeRate !== undefined) {
        const rate = parseFloat(parameters.dataFeeRate);
        if (isNaN(rate) || rate < 0 || rate > 50) {
          return { success: false, message: '데이터 이용료 요율은 0% 이상 50% 이하여야 합니다.' };
        }
      }
      if (parameters.minDataFeeAmt !== undefined) {
        const amt = parseInt(parameters.minDataFeeAmt, 10);
        if (isNaN(amt) || amt < 10000) {
          return { success: false, message: '데이터 이용료 최저 하한액은 최소 10,000원 이상이어야 합니다.' };
        }
      }
      if (parameters.minContractDays !== undefined) {
        const days = parseInt(parameters.minContractDays, 10);
        if (isNaN(days) || days < 30) {
          return { success: false, message: '정기청소 최소 의무 계약기간은 최소 30일 이상이어야 합니다.' };
        }
      }

      // 2. 일괄 업데이트 대상 키-값 페어 생성 (camelCase 및 UPPER_SNAKE_CASE 동시 지원)
      const updatesToProcess: Array<{ key: string; newVal: string }> = [];

      const minContractDays = parameters.MIN_CONTRACT_DAYS ?? parameters.minContractDays;
      if (minContractDays !== undefined) {
        updatesToProcess.push({ key: 'MIN_CONTRACT_DAYS', newVal: String(minContractDays) });
      }
      const dataFeeRate = parameters.DATA_FEE_RATE ?? parameters.dataFeeRate;
      if (dataFeeRate !== undefined) {
        updatesToProcess.push({ key: 'DATA_FEE_RATE', newVal: String(dataFeeRate) });
      }
      const minDataFeeAmt = parameters.MIN_DATA_FEE_AMT ?? parameters.minDataFeeAmt;
      if (minDataFeeAmt !== undefined) {
        updatesToProcess.push({ key: 'MIN_DATA_FEE_AMT', newVal: String(minDataFeeAmt) });
      }
      const sanctionSuspendDays = parameters.SANCTION_SUSPEND_DAYS ?? parameters.sanctionSuspendDays;
      if (sanctionSuspendDays !== undefined) {
        updatesToProcess.push({ key: 'SANCTION_SUSPEND_DAYS', newVal: String(sanctionSuspendDays) });
      }
      const refund50LimitHours = parameters.REFUND_50_LIMIT_HOURS ?? parameters.refund50LimitHours;
      const refund50LimitDays = parameters.refund50LimitDays;
      if (refund50LimitDays !== undefined) {
        const hours = parseInt(refund50LimitDays, 10) * 24;
        updatesToProcess.push({ key: 'REFUND_50_LIMIT_HOURS', newVal: String(hours) });
      } else if (refund50LimitHours !== undefined) {
        updatesToProcess.push({ key: 'REFUND_50_LIMIT_HOURS', newVal: String(refund50LimitHours) });
      }

      // Floor prices (camelCase 및 UPPER_SNAKE_CASE 동시 지원)
      const floorStair = floorPrices.FLOOR_PRICE_STAIR_4F ?? floorPrices.floorPriceStair4F;
      if (floorStair !== undefined) {
        updatesToProcess.push({ key: 'FLOOR_PRICE_STAIR_4F', newVal: String(floorStair) });
      }
      const floorAc = floorPrices.FLOOR_PRICE_AC_STAND ?? floorPrices.floorPriceAcStand;
      if (floorAc !== undefined) {
        updatesToProcess.push({ key: 'FLOOR_PRICE_AC_STAND', newVal: String(floorAc) });
      }
      const floorMovein = floorPrices.FLOOR_PRICE_MOVEIN_PER_PYEONG ?? floorPrices.floorPriceMoveinPerPyeong;
      if (floorMovein !== undefined) {
        updatesToProcess.push({ key: 'FLOOR_PRICE_MOVEIN_PER_PYEONG', newVal: String(floorMovein) });
      }
      const floorWash = floorPrices.FLOOR_PRICE_WASH_DRUM ?? floorPrices.floorPriceWashDrum;
      if (floorWash !== undefined) {
        updatesToProcess.push({ key: 'FLOOR_PRICE_WASH_DRUM', newVal: String(floorWash) });
      }

      // 커스텀 정책 항목들
      for (const cp of customPolicies) {
        if (cp.key && cp.val !== undefined) {
          updatesToProcess.push({ key: cp.key, newVal: String(cp.val) });
        }
      }

      let updatedCount = 0;

      await executeTransaction(async (conn) => {
        // ① 현재 저장된 구(Old) 정책 전체 조회
        const [currentRows]: any = await conn.execute(`
          SELECT POLICY_KEY, POLICY_VAL FROM TB_SYS_POLICY;
        `);
        const currentMap: Record<string, string> = {};
        for (const row of currentRows) {
          currentMap[row.POLICY_KEY] = String(row.POLICY_VAL);
        }

        // ② 변경 항목 식별 및 UPDATE & 감사 로그 기록
        for (const item of updatesToProcess) {
          const oldVal = currentMap[item.key];
          if (oldVal !== item.newVal) {
            // ADMN-SYS-02-SQL-002 (정책 개별 갱신: TB_SYS_POLICY UPDATE)
            await conn.execute(
              `UPDATE TB_SYS_POLICY SET POLICY_VAL = ?, MOD_DT = NOW(), MOD_ID = ? WHERE POLICY_KEY = ?;`,
              [item.newVal, adminId, item.key]
            );

            // ADMN-SYS-02-SQL-003 (정책 변경 이력 기록: TB_SYS_POLICY_LOG INSERT)
            await conn.execute(
              `INSERT INTO TB_SYS_POLICY_LOG (POLICY_KEY, OLD_VAL, NEW_VAL, CHANGED_ADMIN_ID, REG_DT) VALUES (?, ?, ?, ?, NOW());`,
              [item.key, oldVal || '(신규)', item.newVal, adminId]
            );

            updatedCount++;
          }
        }

        // ③ 정책 변경 즉시 배포 트리거: CODE_CACHE_VER 타임스탬프 갱신
        const deployVersion = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
        await conn.execute(
          `INSERT INTO TB_SYS_POLICY (POLICY_KEY, POLICY_VAL, MOD_DT, MOD_ID)
           VALUES ('CODE_CACHE_VER', ?, NOW(), ?)
           ON DUPLICATE KEY UPDATE POLICY_VAL = VALUES(POLICY_VAL), MOD_DT = NOW(), MOD_ID = VALUES(MOD_ID);`,
          [deployVersion, adminId]
        );
      });

      return {
        success: true,
        updatedCount,
        appliedAt: new Date().toISOString(),
        message: '핵심 운영 정책 및 최소 하한선이 성공적으로 저장 및 적용되었습니다.'
      };
    }

    // =========================================================================
    // 모드 3: 정책 변경 감사 로그 목록 조회
    // =========================================================================
    if (mode === 'GET_AUDIT_LOGS') {
      const sqlLogs = `
        SELECT 
          l.LOG_SEQ AS logSeq,
          l.POLICY_KEY AS policyKey,
          COALESCE(p.POLICY_DESC, l.POLICY_KEY) AS policyDesc,
          l.OLD_VAL AS oldVal,
          l.NEW_VAL AS newVal,
          l.CHANGED_ADMIN_ID AS changedAdminId,
          DATE_FORMAT(l.REG_DT, '%Y.%m.%d %H:%i:%s') AS regDtFormatted
        FROM TB_SYS_POLICY_LOG l
        LEFT JOIN TB_SYS_POLICY p ON l.POLICY_KEY = p.POLICY_KEY
        ORDER BY l.LOG_SEQ DESC
        LIMIT 50;
      `;
      const logs: any = await executeQuery(sqlLogs);

      return {
        success: true,
        logs: logs || []
      };
    }

    // =========================================================================
    // 모드 4: 신규 서비스 카테고리 하한선 규정 추가 등록
    // =========================================================================
    if (mode === 'ADD_FLOOR_PRICE_RULE') {
      const { policyKey, policyVal, policyDesc, valType = 'INT' } = body;
      const cleanKey = String(policyKey || '').trim().toUpperCase();

      if (!cleanKey || !cleanKey.startsWith('FLOOR_PRICE_')) {
        return { success: false, message: '하한선 정책 키는 FLOOR_PRICE_ 로 시작하는 영문 대문자여야 합니다.' };
      }
      if (!policyVal) {
        return { success: false, message: '하한 금액(값)을 입력하세요.' };
      }

      await executeQuery(
        `INSERT INTO TB_SYS_POLICY (POLICY_KEY, POLICY_VAL, POLICY_DESC, VAL_TYPE_CD, GRP_TYPE_CD, MOD_DT, MOD_ID)
         VALUES (?, ?, ?, ?, 'FLOOR_PRICE', NOW(), ?)
         ON DUPLICATE KEY UPDATE POLICY_VAL = VALUES(POLICY_VAL), POLICY_DESC = VALUES(POLICY_DESC), MOD_DT = NOW(), MOD_ID = VALUES(MOD_ID);`,
        [cleanKey, String(policyVal), policyDesc || '신규 카테고리 하한선', valType, adminId]
      );

      // 감사 로그
      await executeQuery(
        `INSERT INTO TB_SYS_POLICY_LOG (POLICY_KEY, OLD_VAL, NEW_VAL, CHANGED_ADMIN_ID, REG_DT) VALUES (?, '(신규 생성)', ?, ?, NOW());`,
        [cleanKey, String(policyVal), adminId]
      );

      return {
        success: true,
        message: `신규 하한선 정책 [${cleanKey}]이 등록되었습니다.`
      };
    }

    return {
      success: false,
      message: `지원하지 않는 모드입니다: ${mode}`
    };

  } catch (error: any) {
    console.error('API_ADMN_SYS_02 Error:', error);
    return {
      success: false,
      message: error?.message || '최소 하한선 및 운영 정책 처리 중 오류가 발생했습니다.'
    };
  }
}

/**
 * Next.js App Router POST 핸들러
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await processAdmnSys02(body);
    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, message: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
