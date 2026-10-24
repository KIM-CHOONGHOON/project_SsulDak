/**
 * @file SsulDak_Web/Admin/backend/api_ADMN_SYS_01/route.ts
 * @description 공통 코드 체계 및 실시간 정책 관리 백엔드 라우터 (ADMN-SYS-01)
 * 
 * [준수 사항]
 * - 역할별 물리적 격리: SsulDak_Web/Admin/backend 전용
 * - 1:1 독립 엔드포인트: POST /api/admin/admn_sys_01
 * - 2-Pane Master-Detail 구조 지원: 코드 그룹 마스터(Left) & 상세 코드 원장(Right)
 * - 즉시 배포 트리거: TB_SYS_POLICY.CODE_CACHE_VER 타임스탬프 갱신
 * - 전용 SQL 식별자: ADMN-SYS-01-SQL-001 ~ 006
 */

import { executeQuery, executeTransaction } from '@/lib/db';

export async function processAdmnSys01(body: any, clientIp = '192.168.0.12', userAgent = 'SsulDak-Enterprise-Admin/2.4') {
  const { mode = 'GET_CODE_HIERARCHY', adminId = 'admin01' } = body || {};

  try {
    // =========================================================================
    // 모드 1: 전체 하이라키 조회 (그룹 마스터 목록 + 기본 선택 그룹 상세)
    // =========================================================================
    if (mode === 'GET_CODE_HIERARCHY') {
      // ADMN-SYS-01-SQL-001 (전체 코드 그룹 마스터 목록 조회)
      const sql001 = `
        SELECT 
          GRP_CD AS grpCd,
          GRP_NM AS grpNm,
          COALESCE(GRP_DESC, RMK, '') AS grpDesc,
          USE_YN AS useYn,
          DATE_FORMAT(MOD_DT, '%Y.%m.%d %H:%i') AS modDtFormatted,
          (SELECT COUNT(*) FROM TB_COM_CODE c WHERE c.GRP_CD = g.GRP_CD) AS childCodeCnt
        FROM TB_COM_CODE_GRP g
        ORDER BY GRP_CD ASC;
      `;
      const groups: any = await executeQuery(sql001);

      // 타겟 그룹 결정 (파라미터 지정 또는 REGULAR_CLEAN_AREA 우선 기본 선택)
      let targetGrpCd = body.selectedGrpCd;
      if (!targetGrpCd || !groups.some((g: any) => g.grpCd === targetGrpCd)) {
        const hasRegular = groups.some((g: any) => g.grpCd === 'REGULAR_CLEAN_AREA');
        targetGrpCd = hasRegular ? 'REGULAR_CLEAN_AREA' : (groups[0]?.grpCd || 'REGULAR_CLEAN_AREA');
      }

      // ADMN-SYS-01-SQL-002 (선택된 그룹의 상세 코드 목록 조회)
      const sql002 = `
        SELECT 
          GRP_CD AS grpCd,
          COM_CD AS comCd,
          COM_NM AS comNm,
          SORT_ORD AS sortOrd,
          USE_YN AS useYn,
          COALESCE(ATTR_VAL_1, '') AS attrVal1,
          COALESCE(ATTR_VAL_2, '') AS attrVal2,
          DATE_FORMAT(MOD_DT, '%Y.%m.%d %H:%i') AS modDtFormatted
        FROM TB_COM_CODE
        WHERE GRP_CD = ?
        ORDER BY SORT_ORD ASC, COM_CD ASC;
      `;
      const codes: any = await executeQuery(sql002, [targetGrpCd]);

      // 시스템 메타 (활성 세부 코드 수 및 캐시 버전)
      const activeStats: any = await executeQuery(`
        SELECT COUNT(*) AS totalActiveCodes FROM TB_COM_CODE WHERE USE_YN = 'Y';
      `);
      const cachePolicy: any = await executeQuery(`
        SELECT POLICY_VAL, DATE_FORMAT(MOD_DT, '%Y.%m.%d %H:%i:%s') AS lastDeployedAt, MOD_ID AS lastDeployer
        FROM TB_SYS_POLICY WHERE POLICY_KEY = 'CODE_CACHE_VER';
      `);

      const cacheRow = cachePolicy?.[0] || {};

      return {
        success: true,
        groups: groups || [],
        selectedGrpCd: targetGrpCd,
        selectedGroup: groups.find((g: any) => g.grpCd === targetGrpCd) || null,
        codes: codes || [],
        totalGroupCnt: groups.length,
        totalActiveCodes: Number(activeStats[0]?.totalActiveCodes || 0),
        cacheVer: cacheRow.POLICY_VAL || '20261023112005',
        lastDeployedAt: cacheRow.lastDeployedAt || '2026.10.23 11:20:05',
        lastDeployer: cacheRow.lastDeployer || 'admin01'
      };
    }

    // =========================================================================
    // 모드 2: 특정 그룹의 상세 코드 목록만 조회
    // =========================================================================
    if (mode === 'GET_GROUP_CODES') {
      const { grpCd } = body;
      if (!grpCd) {
        return { success: false, message: '그룹 코드(grpCd)가 지정되지 않았습니다.' };
      }

      // ADMN-SYS-01-SQL-002 (선택된 그룹의 상세 코드 목록 조회)
      const sql002 = `
        SELECT 
          GRP_CD AS grpCd,
          COM_CD AS comCd,
          COM_NM AS comNm,
          SORT_ORD AS sortOrd,
          USE_YN AS useYn,
          COALESCE(ATTR_VAL_1, '') AS attrVal1,
          COALESCE(ATTR_VAL_2, '') AS attrVal2,
          DATE_FORMAT(MOD_DT, '%Y.%m.%d %H:%i') AS modDtFormatted
        FROM TB_COM_CODE
        WHERE GRP_CD = ?
        ORDER BY SORT_ORD ASC, COM_CD ASC;
      `;
      const codes: any = await executeQuery(sql002, [grpCd]);

      return {
        success: true,
        grpCd,
        codes: codes || []
      };
    }

    // =========================================================================
    // 모드 3: 신규 코드 그룹 추가
    // =========================================================================
    if (mode === 'CREATE_GROUP') {
      const { grpCd, grpNm, grpDesc = '' } = body;

      if (!grpCd || !grpNm) {
        return { success: false, message: '그룹 코드 ID와 명칭은 필수 입력값입니다.' };
      }

      // 영문 대문자, 숫자, 언더스코어 정규식 검증
      if (!/^[A-Z0-9_]+$/.test(grpCd)) {
        return { success: false, message: '그룹 코드는 영문 대문자, 숫자 및 언더스코어(_)만 사용할 수 있습니다.' };
      }

      try {
        // ADMN-SYS-01-SQL-003 (신규 코드 그룹 등록: TB_COM_CODE_GRP INSERT)
        const sql003 = `
          INSERT INTO TB_COM_CODE_GRP (
            GRP_CD, GRP_NM, GRP_DESC, USE_YN, REG_DT, REG_ID, MOD_DT, MOD_ID
          ) VALUES (
            ?, ?, ?, 'Y', NOW(), ?, NOW(), ?
          );
        `;
        await executeQuery(sql003, [grpCd, grpNm, grpDesc, adminId, adminId]);

        return {
          success: true,
          grpCd,
          message: `신규 코드 그룹 [${grpCd}]이 성공적으로 등록되었습니다.`
        };
      } catch (err: any) {
        if (err.code === 'ER_DUP_ENTRY') {
          return { success: false, message: `이미 존재하는 그룹 코드 [${grpCd}]입니다.` };
        }
        throw err;
      }
    }

    // =========================================================================
    // 모드 4: 상세 코드 일괄 저장 및 즉시 배포 (트랜잭션)
    // =========================================================================
    if (mode === 'SAVE_CODES_AND_DEPLOY') {
      const { grpCd, codeList = [] } = body;

      if (!grpCd) {
        return { success: false, message: '대상 그룹 코드가 지정되지 않았습니다.' };
      }

      const deployedTimestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);

      await executeTransaction(async (conn) => {
        // ① ADMN-SYS-01-SQL-004 (기존 상세 코드 일괄 삭제: TB_COM_CODE DELETE)
        const sql004 = `DELETE FROM TB_COM_CODE WHERE GRP_CD = ?;`;
        await conn.execute(sql004, [grpCd]);

        // ② ADMN-SYS-01-SQL-005 (상세 코드 벌크 등록: TB_COM_CODE INSERT)
        const sql005 = `
          INSERT INTO TB_COM_CODE (
            GRP_CD, COM_CD, COM_NM, SORT_ORD, USE_YN, ATTR_VAL_1, ATTR_VAL_2,
            REG_DT, REG_ID, MOD_DT, MOD_ID
          ) VALUES (
            ?, ?, ?, ?, ?, ?, ?,
            NOW(), ?, NOW(), ?
          );
        `;

        for (const code of codeList) {
          const comCd = String(code.comCd || '').trim().toUpperCase();
          const comNm = String(code.comNm || '').trim();
          const sortOrd = Number(code.sortOrd) || 1;
          const useYn = code.useYn === 'N' ? 'N' : 'Y';
          const attrVal1 = code.attrVal1 || '';
          const attrVal2 = code.attrVal2 || '';

          if (comCd && comNm) {
            await conn.execute(sql005, [
              grpCd,
              comCd,
              comNm,
              sortOrd,
              useYn,
              attrVal1,
              attrVal2,
              adminId,
              adminId
            ]);
          }
        }

        // ③ ADMN-SYS-01-SQL-006 (캐시 버전 갱신: TB_SYS_POLICY UPDATE)
        const sql006 = `
          INSERT INTO TB_SYS_POLICY (POLICY_KEY, POLICY_VAL, MOD_DT, MOD_ID)
          VALUES ('CODE_CACHE_VER', ?, NOW(), ?)
          ON DUPLICATE KEY UPDATE 
            POLICY_VAL = VALUES(POLICY_VAL),
            MOD_DT = NOW(),
            MOD_ID = VALUES(MOD_ID);
        `;
        await conn.execute(sql006, [deployedTimestamp, adminId]);
      });

      return {
        success: true,
        deployedAt: new Date().toISOString(),
        cacheVer: deployedTimestamp,
        message: '상세 코드가 저장되었으며 사용자/파트너 앱에 즉시 배포되었습니다.'
      };
    }

    // =========================================================================
    // 모드 5: CDN 캐시 강제 무효화 (Flush CDN)
    // =========================================================================
    if (mode === 'FLUSH_CACHE') {
      const flushTimestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
      // ADMN-SYS-01-SQL-006
      const sql006 = `
        INSERT INTO TB_SYS_POLICY (POLICY_KEY, POLICY_VAL, MOD_DT, MOD_ID)
        VALUES ('CODE_CACHE_VER', ?, NOW(), ?)
        ON DUPLICATE KEY UPDATE 
          POLICY_VAL = VALUES(POLICY_VAL),
          MOD_DT = NOW(),
          MOD_ID = VALUES(MOD_ID);
      `;
      await executeQuery(sql006, [flushTimestamp, adminId]);

      return {
        success: true,
        cacheVer: flushTimestamp,
        message: '전역 CDN 캐시 및 클라이언트 메모리가 강제 무효화(Flush)되었습니다.'
      };
    }

    return {
      success: false,
      message: `지원하지 않는 모드입니다: ${mode}`
    };

  } catch (error: any) {
    console.error('API_ADMN_SYS_01 Error:', error);
    return {
      success: false,
      message: error?.message || '공통 코드 관리 처리 중 오류가 발생했습니다.'
    };
  }
}

/**
 * Next.js App Router POST 핸들러
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await processAdmnSys01(body);
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
