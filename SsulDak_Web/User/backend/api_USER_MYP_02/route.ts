/**
 * SsulDak (쓸고닦고) - USER-MYP-02 (내 쿠폰 및 혜택 관리) 백엔드 라우터
 * 
 * 물리적 격리: SsulDak_Web/User/backend/api_USER_MYP_02/route.ts
 * 엔드포인트 URL: POST /api/user/user_myp_02
 * DB 연동: @/lib/db (MySQL 8.0, InnoDB)
 * 독립 전용 SQL: USER-MYP-02-SQL-001 ~ USER-MYP-02-SQL-006
 */

import { executeQuery, executeTransaction } from '@/lib/db';

export interface CouponItem {
  couponNo: string;
  campaignNm: string;
  discountAmt: number;
  targetCleanType: string;
  couponStatCd: 'AVAILABLE' | 'USED' | 'EXPIRED';
  expireDt: string;
  usedDt: string | null;
  dDayRemaining: number;
  formattedExpireDt: string;
}

export interface CouponCounts {
  available: number;
  used: number;
  expired: number;
}

export interface ProcessResult {
  status: number;
  data: any;
}

/**
 * USER-MYP-02 비즈니스 로직 처리기
 */
export async function processUserMyp02(body: any): Promise<ProcessResult> {
  const { mode, userNo = 'U20261000001' } = body || {};

  try {
    // -------------------------------------------------------------
    // 모드 1: 쿠폰함 목록 및 상태별 카운트 조회
    // -------------------------------------------------------------
    if (mode === 'GET_COUPON_LIST') {
      const tabType = body.tabType || 'AVAILABLE'; // 'AVAILABLE' | 'USED' | 'EXPIRED'

      // USER-MYP-02-SQL-001: 탭별 쿠폰 보유 건수 집계
      const countRows: any = await executeQuery(`
        /* USER-MYP-02-SQL-001 */
        SELECT 
          COUNT(CASE WHEN COUPON_STAT_CD = 'AVAILABLE' AND EXPIRE_DT >= NOW() THEN 1 END) AS availableCnt,
          COUNT(CASE WHEN COUPON_STAT_CD = 'USED' THEN 1 END) AS usedCnt,
          COUNT(CASE WHEN (COUPON_STAT_CD = 'EXPIRED' OR (COUPON_STAT_CD = 'AVAILABLE' AND EXPIRE_DT < NOW())) THEN 1 END) AS expiredCnt
        FROM TB_USER_COUPON
        WHERE USER_NO = ?;
      `, [userNo]);

      const counts: CouponCounts = {
        available: Number(countRows[0]?.availableCnt || 0),
        used: Number(countRows[0]?.usedCnt || 0),
        expired: Number(countRows[0]?.expiredCnt || 0)
      };

      // USER-MYP-02-SQL-002: 쿠폰함 목록 조회 (탭 필터링 및 D-Day 연산)
      const couponRows: any = await executeQuery(`
        /* USER-MYP-02-SQL-002 */
        SELECT 
          COALESCE(c.U_COUPON_NO, c.COUPON_ISSUE_NO) AS couponNo,
          COALESCE(p.CAMPAIGN_NM, c.COUPON_NM) AS campaignNm,
          COALESCE(p.DISCOUNT_AMT, c.DISCOUNT_AMT, 5000) AS discountAmt,
          COALESCE(p.TARGET_CLEAN_TYPE, '전 청소 유형 적용 가능') AS targetCleanType,
          c.COUPON_STAT_CD AS couponStatCd,
          c.EXPIRE_DT AS expireDt,
          c.USED_DT AS usedDt,
          DATEDIFF(c.EXPIRE_DT, NOW()) AS dDayRemaining,
          DATE_FORMAT(c.EXPIRE_DT, '%Y.%m.%d') AS formattedExpireDt
        FROM TB_USER_COUPON c
        LEFT JOIN TB_PROMO_CAMPAIGN p ON COALESCE(c.CAMPAIGN_NO, c.CAMPAIGN_ID) = p.CAMPAIGN_NO
        WHERE c.USER_NO = ?
          AND (
            (? = 'AVAILABLE' AND c.COUPON_STAT_CD = 'AVAILABLE' AND c.EXPIRE_DT >= NOW()) OR
            (? = 'USED' AND c.COUPON_STAT_CD = 'USED') OR
            (? = 'EXPIRED' AND (c.COUPON_STAT_CD = 'EXPIRED' OR (c.COUPON_STAT_CD = 'AVAILABLE' AND c.EXPIRE_DT < NOW())))
          )
        ORDER BY 
          CASE WHEN ? = 'AVAILABLE' THEN c.EXPIRE_DT END ASC,
          c.REG_DT DESC;
      `, [userNo, tabType, tabType, tabType, tabType]);

      const coupons: CouponItem[] = couponRows.map((row: any) => ({
        couponNo: String(row.couponNo),
        campaignNm: String(row.campaignNm),
        discountAmt: Number(row.discountAmt),
        targetCleanType: String(row.targetCleanType),
        couponStatCd: row.couponStatCd,
        expireDt: row.expireDt ? new Date(row.expireDt).toISOString() : '',
        usedDt: row.usedDt ? new Date(row.usedDt).toISOString() : null,
        dDayRemaining: Math.max(0, Number(row.dDayRemaining || 0)),
        formattedExpireDt: String(row.formattedExpireDt)
      }));

      return {
        status: 200,
        data: {
          success: true,
          counts,
          coupons
        }
      };
    }

    // -------------------------------------------------------------
    // 모드 2: 16자리 프로모션 시리얼 코드 등록
    // -------------------------------------------------------------
    if (mode === 'REGISTER_SERIAL_COUPON') {
      const rawCode = String(body.serialCode || '').trim();
      if (!rawCode) {
        return {
          status: 400,
          data: { success: false, message: '쿠폰 코드를 입력해 주세요.' }
        };
      }

      // 대소문자 무시 대문자 변환
      const formattedCode = rawCode.toUpperCase();

      // USER-MYP-02-SQL-003: 시리얼 코드 유효성 검증
      const poolRows: any = await executeQuery(`
        /* USER-MYP-02-SQL-003 */
        SELECT 
          cp.SERIAL_CD AS serialCd,
          cp.CAMPAIGN_NO AS campaignNo,
          cp.IS_ISSUED_YN AS isIssuedYn,
          cp.EXPIRE_DT AS poolExpireDt,
          p.CAMPAIGN_NM AS campaignNm,
          p.VALID_DAYS AS validDays,
          p.DISCOUNT_AMT AS discountAmt
        FROM TB_COUPON_POOL cp
        INNER JOIN TB_PROMO_CAMPAIGN p ON cp.CAMPAIGN_NO = p.CAMPAIGN_NO
        WHERE cp.SERIAL_CD = ?;
      `, [formattedCode]);

      if (!poolRows || poolRows.length === 0) {
        return {
          status: 404,
          data: { success: false, message: '유효하지 않은 쿠폰 번호입니다.' }
        };
      }

      const poolItem = poolRows[0];

      // 이미 등록/사용된 코드 검증
      if (poolItem.isIssuedYn === 'Y') {
        return {
          status: 409,
          data: { success: false, message: '이미 사용/등록된 쿠폰 코드입니다.' }
        };
      }

      // 코드 등록 만료일 경과 검증
      const expireDate = new Date(poolItem.poolExpireDt);
      if (expireDate.getTime() < Date.now()) {
        return {
          status: 400,
          data: { success: false, message: '등록 기한이 만료된 쿠폰입니다.' }
        };
      }

      const validDays = Number(poolItem.validDays || 30);
      let newCouponNo = '';

      // 트랜잭션 실행
      await executeTransaction(async (conn) => {
        // ① USER-MYP-02-SQL-004: 당일 기준 채번 락 조회
        const [maxRow]: any = await conn.execute(`
          /* USER-MYP-02-SQL-004 */
          SELECT MAX(U_COUPON_NO) AS maxCouponNo
          FROM TB_USER_COUPON
          WHERE U_COUPON_NO LIKE CONCAT('UCP', DATE_FORMAT(NOW(), '%Y%m%d'), '%')
          FOR UPDATE;
        `);

        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const datePrefix = `UCP${y}${m}${d}`;

        let nextSeq = 1;
        const currentMax = maxRow?.[0]?.maxCouponNo;
        if (currentMax && String(currentMax).startsWith(datePrefix)) {
          const tail = String(currentMax).substring(datePrefix.length);
          const parsed = parseInt(tail, 10);
          if (!isNaN(parsed)) {
            nextSeq = parsed + 1;
          }
        }
        newCouponNo = `${datePrefix}${String(nextSeq).padStart(5, '0')}`;

        // ② USER-MYP-02-SQL-005: TB_USER_COUPON 신규 쿠폰 발급 등록
        await conn.execute(`
          /* USER-MYP-02-SQL-005 */
          INSERT INTO TB_USER_COUPON (
            U_COUPON_NO, COUPON_ISSUE_NO, USER_NO, CAMPAIGN_NO, CAMPAIGN_ID, COUPON_SERIAL_CD,
            COUPON_NM, DISCOUNT_AMT, COUPON_STAT_CD,
            EXPIRE_DT, REG_DT, REG_ID, MOD_DT, MOD_ID
          ) VALUES (
            ?, ?, ?, ?, ?, ?,
            ?, ?, 'AVAILABLE',
            DATE_ADD(NOW(), INTERVAL ? DAY), NOW(), ?, NOW(), ?
          );
        `, [
          newCouponNo,
          newCouponNo,
          userNo,
          poolItem.campaignNo,
          poolItem.campaignNo,
          formattedCode,
          poolItem.campaignNm,
          poolItem.discountAmt || 5000,
          validDays,
          userNo,
          userNo
        ]);

        // ③ USER-MYP-02-SQL-006: TB_COUPON_POOL 발급 완료 마킹
        await conn.execute(`
          /* USER-MYP-02-SQL-006 */
          UPDATE TB_COUPON_POOL
          SET 
            IS_ISSUED_YN = 'Y',
            ISSUED_USER_NO = ?,
            MOD_DT = NOW()
          WHERE SERIAL_CD = ?;
        `, [userNo, formattedCode]);
      });

      return {
        status: 201,
        data: {
          success: true,
          couponNo: newCouponNo,
          couponNm: poolItem.campaignNm,
          message: '쿠폰이 성공적으로 등록되었습니다.'
        }
      };
    }

    return {
      status: 400,
      data: { success: false, message: `지원하지 않는 모드입니다: ${mode}` }
    };
  } catch (error: any) {
    console.error('USER-MYP-02 Route Error:', error);
    return {
      status: 500,
      data: { success: false, message: error.message || '서버 오류가 발생했습니다.' }
    };
  }
}

/**
 * Next.js App Router POST 핸들러
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await processUserMyp02(body);
    return new Response(JSON.stringify(result.data), {
      status: result.status,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, message: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
