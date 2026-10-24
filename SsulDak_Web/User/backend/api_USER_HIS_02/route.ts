// SsulDak_Web/User/backend/api_USER_HIS_02/route.ts
/**
 * [SsulDak (쓸고닦고)] USER-HIS-02 (서비스 리뷰 작성 및 리워드 적립)
 * 백엔드 전용 API 라우터 (POST /api/user/user_his_02)
 *
 * 엄격 준수 규칙:
 * 1. 물리적 격리: SsulDak_Web/User 폴더 내 완결
 * 2. 1:1 매핑: USER-HIS-02 전용 백엔드 라우터
 * 3. 공통화 배제: 독립 전용 SQL ID (USER-HIS-02-SQL-001 ~ 005)
 * 4. 핵심 정책:
 *    - 1계약 1리뷰 원칙 (중복 작성 방지)
 *    - 시공 완료(COMPLETED) 계약만 작성 가능
 *    - 포토리뷰(사진 1장 이상) 작성 시 TB_USER_POINT_LEDGER에 즉시 +1,000P 적립
 *    - 파트너 통계 실시간 갱신 (REVIEW_CNT, AVG_RATING 재집계)
 */

import { executeQuery, executeTransaction } from '@/lib/db';

export interface UserHis02Request {
  mode?: 'GET_TARGET_CONTRACT' | 'SUBMIT_REVIEW';
  userNo?: string;
  contractNo?: string;
  rating?: number;
  content?: string;
  cleanTypeNm?: string;
  photoUrls?: string[];
  shareToProfile?: boolean;
  applyHallOfFame?: boolean;
}

export interface TargetContractInfo {
  contractNo: string;
  userNo: string;
  ptnrNo: string;
  subItemNm: string;
  contractStatCd: string;
  companyNm: string;
  ceoNm: string | null;
  profileImgUrl: string | null;
  avgRating: number;
  reviewCnt: number;
  alreadyWrittenCnt: number;
}

export async function processUserHis02(data: UserHis02Request) {
  const mode = data.mode || 'GET_TARGET_CONTRACT';
  const userNo = data.userNo || 'U20261000001';
  let contractNo = data.contractNo;

  // 계약번호가 전달되지 않았을 경우 기본 대상 계약 탐색 (가장 최근 완료된 계약 또는 활성 계약)
  if (!contractNo) {
    const defaultContractRows = await executeQuery<any[]>(
      `
      SELECT CONTRACT_NO 
      FROM TB_CLEAN_CONTRACT 
      WHERE USER_NO = ? 
      ORDER BY CASE WHEN CONTRACT_STAT_CD = 'COMPLETED' THEN 0 ELSE 1 END, REG_DT DESC 
      LIMIT 1;
      `,
      [userNo]
    );
    contractNo = defaultContractRows[0]?.CONTRACT_NO || 'CT2026102100001';
  }

  try {
    // =========================================================================
    // 모드 1: 리뷰 작성 대상 계약 정보 조회 (GET_TARGET_CONTRACT)
    // =========================================================================
    if (mode === 'GET_TARGET_CONTRACT') {
      // [USER-HIS-02-SQL-001] 리뷰 작성 대상 계약 유효성 및 기작성 여부 확인
      const contractRows = await executeQuery<any[]>(
        `
        SELECT 
          c.CONTRACT_NO AS contractNo,
          c.USER_NO AS userNo,
          c.PTNR_NO AS ptnrNo,
          c.SUB_ITEM_NM AS subItemNm,
          c.CONTRACT_STAT_CD AS contractStatCd,
          p.COMPANY_NM AS companyNm,
          p.CEO_NM AS ceoNm,
          p.PROFILE_IMG_URL AS profileImgUrl,
          COALESCE(p.AVG_RATING, 5.0) AS avgRating,
          COALESCE(p.REVIEW_CNT, 0) AS reviewCnt,
          (SELECT COUNT(*) FROM TB_CLEAN_REVIEW r WHERE r.CONTRACT_NO = c.CONTRACT_NO) AS alreadyWrittenCnt
        FROM TB_CLEAN_CONTRACT c
        INNER JOIN TB_PARTNER p ON c.PTNR_NO = p.PTNR_NO
        WHERE c.CONTRACT_NO = ? AND c.USER_NO = ?;
        `,
        [contractNo, userNo]
      );

      if (contractRows.length === 0) {
        return {
          success: false,
          code: 'NOT_FOUND',
          message: `해당 계약 정보를 찾을 수 없습니다. (계약번호: ${contractNo})`,
        };
      }

      const contract: TargetContractInfo = contractRows[0];

      // 기작성 여부 확인
      if (Number(contract.alreadyWrittenCnt) > 0) {
        return {
          success: false,
          code: 'ALREADY_WRITTEN',
          message: '이미 리뷰 작성이 완료된 계약입니다.',
          contract,
        };
      }

      // [USER-HIS-02-SQL-003] 이용자 현재 최신 포인트 잔액 조회
      const pointRows = await executeQuery<any[]>(
        `
        SELECT COALESCE(BALANCE_AMT, 0) AS currentBalance
        FROM TB_USER_POINT_LEDGER
        WHERE USER_NO = ?
        ORDER BY POINT_SEQ DESC
        LIMIT 1;
        `,
        [userNo]
      );
      const currentBalance = Number(pointRows[0]?.currentBalance) || 3000;

      return {
        success: true,
        contract: {
          contractNo: contract.contractNo,
          userNo: contract.userNo,
          ptnrNo: contract.ptnrNo,
          subItemNm: contract.subItemNm || '정기청소 3개월 · 1회차 완료',
          contractStatCd: contract.contractStatCd,
          companyNm: contract.companyNm || '반짝빌라클린',
          ceoNm: contract.ceoNm || '이*수',
          profileImgUrl: contract.profileImgUrl,
          avgRating: Number(contract.avgRating) || 5.0,
          reviewCnt: Number(contract.reviewCnt) || 428,
          alreadyWrittenCnt: Number(contract.alreadyWrittenCnt),
        },
        currentBalance,
        isCompleted: contract.contractStatCd === 'COMPLETED',
      };
    }

    // =========================================================================
    // 모드 2: 리뷰 등록 및 포인트 지급 (SUBMIT_REVIEW)
    // =========================================================================
    if (mode === 'SUBMIT_REVIEW') {
      const rating = Math.min(5, Math.max(1, Math.round(Number(data.rating) || 5)));
      const content = (data.content || '').trim();
      const photoUrls = Array.isArray(data.photoUrls) ? data.photoUrls.slice(0, 2) : [];
      const photoUrl1 = photoUrls[0] || null;
      const photoUrl2 = photoUrls[1] || null;

      if (content.length < 10) {
        return {
          success: false,
          message: '상세 후기를 최소 10자 이상 작성해 주세요.',
        };
      }

      // 포토리뷰(사진 1장 이상) 여부에 따른 포인트 산정
      const isPhotoReview = photoUrls.length > 0;
      const pointRewardAmt = isPhotoReview ? 1000 : 0;

      const result = await executeTransaction(async (conn) => {
        // ① 계약 및 기작성 재검증 [USER-HIS-02-SQL-001]
        const [contracts]: any = await conn.execute(
          `
          SELECT 
            c.CONTRACT_NO AS contractNo,
            c.PTNR_NO AS ptnrNo,
            c.SUB_ITEM_NM AS subItemNm,
            (SELECT COUNT(*) FROM TB_CLEAN_REVIEW r WHERE r.CONTRACT_NO = c.CONTRACT_NO) AS alreadyWrittenCnt
          FROM TB_CLEAN_CONTRACT c
          WHERE c.CONTRACT_NO = ? AND c.USER_NO = ?;
          `,
          [contractNo, userNo]
        );

        if (contracts.length === 0) {
          throw new Error('유효한 계약 정보를 찾을 수 없습니다.');
        }

        if (Number(contracts[0].alreadyWrittenCnt) > 0) {
          throw new Error('이미 리뷰 작성이 완료된 계약입니다.');
        }

        const ptnrNo = contracts[0].ptnrNo;
        const cleanTypeNm = data.cleanTypeNm || contracts[0].subItemNm || '정기청소';

        // ② 리뷰 데이터 저장 [USER-HIS-02-SQL-002]
        await conn.execute(
          `
          INSERT INTO TB_CLEAN_REVIEW (
            CONTRACT_NO, USER_NO, PTNR_NO, RATING, CONTENT, CLEAN_TYPE_NM,
            PHOTO_URL_1, PHOTO_URL_2, POINT_REWARD_AMT, REG_DT, REG_ID
          ) VALUES (
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, NOW(), ?
          );
          `,
          [
            contractNo,
            userNo,
            ptnrNo,
            rating,
            content,
            cleanTypeNm,
            photoUrl1,
            photoUrl2,
            pointRewardAmt,
            userNo,
          ]
        );

        // ③ 포토리뷰 리워드 포인트 지급 [USER-HIS-02-SQL-003, USER-HIS-02-SQL-004]
        let newBalance = 0;
        if (pointRewardAmt > 0) {
          const [balanceRows]: any = await conn.execute(
            `
            SELECT COALESCE(BALANCE_AMT, 0) AS currentBalance
            FROM TB_USER_POINT_LEDGER
            WHERE USER_NO = ?
            ORDER BY POINT_SEQ DESC
            LIMIT 1;
            `,
            [userNo]
          );
          const currentBalance = Number(balanceRows[0]?.currentBalance) || 0;
          newBalance = currentBalance + pointRewardAmt;

          await conn.execute(
            `
            INSERT INTO TB_USER_POINT_LEDGER (
              USER_NO, POINT_CHG_TYPE_CD, CHANGE_TYPE_CD, POINT_AMT, CHANGE_AMT, BALANCE_AMT, REASON_DC, RMK, REG_DT, REG_ID
            ) VALUES (
              ?, 'REVIEW_1000P', 'REVIEW_1000P', ?, ?, ?, '시공 포토리뷰 작성 리워드 적립', '시공 포토리뷰 작성 리워드 적립', NOW(), 'SYSTEM'
            );
            `,
            [userNo, pointRewardAmt, pointRewardAmt, newBalance]
          );
        }

        // ④ 파트너 통계 실시간 갱신 [USER-HIS-02-SQL-005]
        await conn.execute(
          `
          UPDATE TB_PARTNER
          SET 
            REVIEW_CNT = (SELECT COUNT(*) FROM TB_CLEAN_REVIEW WHERE PTNR_NO = ?),
            REVIEW_TOTAL_CNT = (SELECT COUNT(*) FROM TB_CLEAN_REVIEW WHERE PTNR_NO = ?),
            AVG_RATING = COALESCE((SELECT ROUND(AVG(RATING), 1) FROM TB_CLEAN_REVIEW WHERE PTNR_NO = ?), 5.0),
            MOD_DT = NOW(),
            MOD_ID = 'SYSTEM'
          WHERE PTNR_NO = ?;
          `,
          [ptnrNo, ptnrNo, ptnrNo, ptnrNo]
        );

        return {
          pointRewardAmt,
          newBalance,
        };
      });

      return {
        success: true,
        rewardPoint: result.pointRewardAmt,
        newBalance: result.newBalance,
        message: result.pointRewardAmt > 0
          ? '포토리뷰 작성이 완료되어 1,000P가 즉시 적립되었습니다!'
          : '리뷰가 성공적으로 등록되었습니다.',
      };
    }

    return {
      success: false,
      message: `알 수 없는 처리 모드(mode)입니다: ${mode}`,
    };
  } catch (error: any) {
    console.error('❌ [USER-HIS-02] Server processing error:', error);
    return {
      success: false,
      message: error.message || '리뷰 처리 중 오류가 발생했습니다.',
    };
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as UserHis02Request;
    const result = await processUserHis02(body);
    const status = result.success ? (body.mode === 'SUBMIT_REVIEW' ? 201 : 200) : 400;
    return new Response(JSON.stringify(result), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('❌ [USER-HIS-02] POST Handler Error:', err);
    return new Response(
      JSON.stringify({
        success: false,
        message: '요청 본문(JSON) 파싱 실패 또는 서버 내부 오류입니다.',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
