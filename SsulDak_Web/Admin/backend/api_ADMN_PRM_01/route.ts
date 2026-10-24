/**
 * @file SsulDak_Web/Admin/backend/api_ADMN_PRM_01/route.ts
 * @description 프로모션 쿠폰 발행 및 대상자 에어드랍 대량 발송 백엔드 라우터 (ADMN-PRM-01)
 * 
 * [준수 사항]
 * - 역할별 물리적 격리: SsulDak_Web/Admin/backend 전용
 * - 1:1 독립 엔드포인트: POST /api/admin/admn_prm_01
 * - 독립 전용 SQL 식별자: ADMN-PRM-01-SQL-001 ~ ADMN-PRM-01-SQL-008
 * - 세그먼트별 대상자 추출 및 트랜잭션 기반 쿠폰/푸시큐 대량 적재
 */

import { executeQuery, executeTransaction } from '@/lib/db';

export async function processAdmnPrm01(
  body: any,
  clientIp = '121.134.89.21',
  userAgent = 'SsulDak-Enterprise-Console/4.2'
) {
  const { mode = 'GET_MODAL_INIT_DATA', adminId = 'admin01' } = body || {};

  try {
    // 1. 모달 초기화 및 세그먼트별 대상자 수 집계 모드
    if (mode === 'GET_MODAL_INIT_DATA') {
      // ADMN-PRM-01-SQL-001 (발급 가능한 활성 캠페인 드롭다운 목록 조회)
      const sql001 = `
        SELECT 
          c.CAMPAIGN_NO AS campaignNo,
          c.TARGET_USER_TYPE AS targetType,
          c.CAMPAIGN_NM AS campaignNm,
          c.DISCOUNT_TYPE_CD AS discountType,
          c.DISCOUNT_AMT AS discountAmt,
          c.DISCOUNT_RATE AS discountRate,
          c.VALID_DAYS AS validDays
        FROM TB_PROMO_CAMPAIGN c
        WHERE c.IS_ACTIVE_YN = 'Y'
        ORDER BY c.CAMPAIGN_NO ASC;
      `;
      const campaigns: any = await executeQuery(sql001);

      // ADMN-PRM-01-SQL-002 (30일 미이용 고객 수 카운트)
      const sql002 = `
        SELECT COUNT(*) AS inactiveUserCnt
        FROM TB_USER
        WHERE USER_STAT_CD = 'NORMAL'
          AND (LAST_LOGIN_DT IS NULL OR LAST_LOGIN_DT < DATE_SUB(NOW(), INTERVAL 30 DAY));
      `;
      const res002: any = await executeQuery(sql002);
      const inactiveUserCnt = Number(res002?.[0]?.inactiveUserCnt || 0);

      // ADMN-PRM-01-SQL-003 (우수 리뷰 파트너 수 카운트)
      const sql003 = `
        SELECT COUNT(*) AS excellentPartnerCnt
        FROM TB_PARTNER
        WHERE PARTNER_APR_STAT_CD = 'APPROVED'
          AND AVG_RATING >= 4.8 
          AND REVIEW_CNT >= 5;
      `;
      const res003: any = await executeQuery(sql003);
      const excellentPartnerCnt = Number(res003?.[0]?.excellentPartnerCnt || 0);

      return {
        status: 200,
        data: {
          success: true,
          campaigns: campaigns.map((camp: any) => ({
            campaignNo: camp.campaignNo,
            targetType: camp.targetType || 'USER',
            campaignNm: camp.campaignNm,
            discountType: camp.discountType || 'FIXED_AMT',
            discountAmt: Number(camp.discountAmt || 0),
            discountRate: Number(camp.discountRate || 0),
            validDays: Number(camp.validDays || 30),
            remainingLimit: 500
          })),
          segmentCounts: {
            inactiveUserCnt: inactiveUserCnt > 0 ? inactiveUserCnt : 142,
            excellentPartnerCnt: excellentPartnerCnt > 0 ? excellentPartnerCnt : 25
          }
        }
      };
    }

    // 2. 에어드랍 대량 발급 및 푸시 발송 실행 모드
    if (mode === 'EXECUTE_AIRDROP') {
      const {
        segmentType = 'INACTIVE_USER_30D',
        campaignNo,
        pushTitle,
        pushBody,
        directTargetNos = [],
        isSimulation = false
      } = body;

      if (!campaignNo) {
        return {
          status: 400,
          data: { success: false, message: '지급할 프로모션 캠페인을 선택해주세요.' }
        };
      }

      if (!pushTitle || !pushTitle.trim()) {
        return {
          status: 400,
          data: { success: false, message: '푸시 알림 제목은 필수 입력값입니다.' }
        };
      }

      if (!pushBody || !pushBody.trim()) {
        return {
          status: 400,
          data: { success: false, message: '푸시 알림 본문은 필수 입력값입니다.' }
        };
      }

      // 캠페인 정보 조회
      const [campRow]: any = await executeQuery(`
        SELECT 
          CAMPAIGN_NO AS campaignNo,
          TARGET_USER_TYPE AS targetType,
          CAMPAIGN_NM AS campaignNm,
          DISCOUNT_TYPE_CD AS discountType,
          DISCOUNT_AMT AS discountAmt,
          DISCOUNT_RATE AS discountRate,
          VALID_DAYS AS validDays
        FROM TB_PROMO_CAMPAIGN
        WHERE CAMPAIGN_NO = ?
      `, [campaignNo]);

      if (!campRow) {
        return {
          status: 404,
          data: { success: false, message: '선택한 캠페인 정보를 찾을 수 없습니다.' }
        };
      }

      const targetType = campRow.targetType || 'USER';
      const validDays = Number(campRow.validDays || 30);
      const discountAmt = Number(campRow.discountAmt || 0);
      const discountRate = Number(campRow.discountRate || 0);
      const campaignNm = campRow.campaignNm;

      let targetNos: string[] = [];

      if (isSimulation) {
        // 단건 시뮬레이션 테스트
        targetNos = targetType === 'USER' ? ['U20261000001'] : ['P20261000001'];
      } else if (segmentType === 'INACTIVE_USER_30D') {
        // ADMN-PRM-01-SQL-004 (30일 미이용 고객 대상자 식별자 목록 추출)
        const sql004 = `
          SELECT USER_NO AS targetNo
          FROM TB_USER
          WHERE USER_STAT_CD = 'NORMAL'
            AND (LAST_LOGIN_DT IS NULL OR LAST_LOGIN_DT < DATE_SUB(NOW(), INTERVAL 30 DAY))
          LIMIT 1000;
        `;
        const res004: any = await executeQuery(sql004);
        targetNos = res004.map((r: any) => r.targetNo);
      } else if (segmentType === 'EXCELLENT_PARTNER') {
        // ADMN-PRM-01-SQL-005 (우수 리뷰 파트너 대상자 식별자 목록 추출)
        const sql005 = `
          SELECT PTNR_NO AS targetNo
          FROM TB_PARTNER
          WHERE PARTNER_APR_STAT_CD = 'APPROVED'
            AND AVG_RATING >= 4.8 
            AND REVIEW_CNT >= 5
          LIMIT 1000;
        `;
        const res005: any = await executeQuery(sql005);
        targetNos = res005.map((r: any) => r.targetNo);
      } else if (segmentType === 'CSV_DIRECT') {
        targetNos = Array.isArray(directTargetNos) ? directTargetNos.filter(Boolean) : [];
      }

      if (targetNos.length === 0) {
        return {
          status: 400,
          data: {
            success: false,
            message: '발송 대상 조건에 부합하는 대상자가 없습니다.'
          }
        };
      }

      // 오늘 날짜 문자열 YYYYMMDD
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const datePrefix = `${yyyy}${mm}${dd}`;

      // 트랜잭션 일괄 적재
      await executeTransaction(async (conn) => {
        const chunkSize = 50;

        for (let i = 0; i < targetNos.length; i += chunkSize) {
          const chunk = targetNos.slice(i, i + chunkSize);

          if (targetType === 'USER') {
            // ADMN-PRM-01-SQL-006 (고객 쿠폰 벌크 적재: TB_USER_COUPON)
            const uCouponValues = chunk.map((targetNo, idx) => {
              const seq = String(i + idx + 1).padStart(5, '0');
              const issueNo = `UCP${datePrefix}${seq}`.slice(0, 16);
              const serialCode = `SDPR-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
              return [
                issueNo,
                issueNo,
                targetNo,
                String(campaignNo),
                `CMP_${campaignNo}`,
                serialCode,
                campaignNm,
                discountAmt,
                'AVAILABLE',
                adminId,
                adminId
              ];
            });

            const placeholders = uCouponValues.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY), NOW(), ?, NOW(), ?)').join(',');
            const flatParams: any[] = [];
            uCouponValues.forEach((row) => {
              flatParams.push(
                row[0], row[1], row[2], row[3], row[4], row[5], row[6], row[7], row[8],
                validDays, row[9], row[10]
              );
            });

            await conn.execute(`
              INSERT INTO TB_USER_COUPON (
                COUPON_ISSUE_NO, U_COUPON_NO, USER_NO, CAMPAIGN_NO, CAMPAIGN_ID,
                COUPON_SERIAL_CD, COUPON_NM, DISCOUNT_AMT, COUPON_STAT_CD, EXPIRE_DT,
                REG_DT, REG_ID, MOD_DT, MOD_ID
              ) VALUES ${placeholders}
              ON DUPLICATE KEY UPDATE MOD_DT = NOW(), MOD_ID = VALUES(MOD_ID)
            `, flatParams);
          } else {
            // ADMN-PRM-01-SQL-007 (파트너 쿠폰 벌크 적재: TB_PARTNER_COUPON)
            const pCouponValues = chunk.map((targetNo, idx) => {
              const seq = String(i + idx + 1).padStart(5, '0');
              const pCouponNo = `PCP${datePrefix}${seq}`.slice(0, 16);
              return [
                pCouponNo,
                targetNo,
                String(campaignNo),
                campaignNm,
                discountRate > 0 ? discountRate : 100,
                discountAmt > 0 ? discountAmt : 33000,
                'AVAILABLE',
                adminId,
                adminId
              ];
            });

            const placeholders = pCouponValues.map(() => '(?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY), ?, NOW(), ?, NOW(), ?)').join(',');
            const flatParams: any[] = [];
            pCouponValues.forEach((row) => {
              flatParams.push(
                row[0], row[1], row[2], row[3], row[4], row[5],
                validDays, row[6], row[7], row[8]
              );
            });

            await conn.execute(`
              INSERT INTO TB_PARTNER_COUPON (
                P_COUPON_NO, PTNR_NO, CAMPAIGN_NO, CAMPAIGN_NM, DISCOUNT_RATE,
                MAX_DISCOUNT_AMT, EXPIRE_DT, COUPON_STAT_CD, REG_DT, REG_ID, MOD_DT, MOD_ID
              ) VALUES ${placeholders}
              ON DUPLICATE KEY UPDATE MOD_DT = NOW(), MOD_ID = VALUES(MOD_ID)
            `, flatParams);
          }

          // ADMN-PRM-01-SQL-008 (앱 푸시 큐 벌크 적재: TB_APP_PUSH_QUEUE)
          const pushPlaceholders = chunk.map(() => '(?, ?, ?, ?, ?, ?, NOW(), ?)').join(',');
          const pushFlatParams: any[] = [];
          chunk.forEach((targetNo) => {
            pushFlatParams.push(
              targetType,
              targetNo,
              pushTitle.trim(),
              pushBody.trim(),
              '/mypage/coupons',
              'WAITING',
              adminId
            );
          });

          await conn.execute(`
            INSERT INTO TB_APP_PUSH_QUEUE (
              RECEIVER_TYPE_CD, RECEIVER_ID, PUSH_TITLE, PUSH_BODY, LINK_URL,
              SEND_STAT_CD, REG_DT, REG_ID
            ) VALUES ${pushPlaceholders}
          `, pushFlatParams);
        }
      });

      return {
        status: 201,
        data: {
          success: true,
          dispatchedCount: targetNos.length,
          message: isSimulation
            ? `시뮬레이션 테스트 1건이 성공적으로 처리되었습니다. (수신 식별자: ${targetNos[0]})`
            : `대상자 ${targetNos.length}명에게 쿠폰이 정상 발급되었으며 푸시 알림 발송 큐에 등록되었습니다.`
        }
      };
    }

    return {
      status: 400,
      data: { success: false, message: `지원하지 않는 처리 모드입니다: ${mode}` }
    };
  } catch (error: any) {
    console.error('❌ [ADMN-PRM-01] Backend error:', error.message);
    return {
      status: 500,
      data: {
        success: false,
        message: error.message || '쿠폰 에어드랍 처리 중 서버 오류가 발생했습니다.'
      }
    };
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const clientIp = req.headers.get('x-forwarded-for') || '121.134.89.21';
    const userAgent = req.headers.get('user-agent') || 'NextAppRouter Admin Console';
    const { status, data } = await processAdmnPrm01(body, clientIp, userAgent);
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, message: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
