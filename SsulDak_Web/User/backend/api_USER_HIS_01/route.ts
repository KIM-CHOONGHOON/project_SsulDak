// SsulDak_Web/User/backend/api_USER_HIS_01/route.ts
/**
 * [SsulDak (쓸고닦고)] USER-HIS-01 (청소 진행 상세 및 검수 리포트)
 * 백엔드 전용 API 라우터 (POST /api/user/user_his_01)
 *
 * 엄격 준수 규칙:
 * 1. 물리적 격리: SsulDak_Web/User 폴더 내 완결
 * 2. 1:1 매핑: USER-HIS-01 전용 백엔드 라우터
 * 3. 공통화 배제: 독립 전용 SQL ID (USER-HIS-01-SQL-001 ~ 009)
 * 4. 핵심 정책:
 *    - 5단계 시공 스테퍼 (MATCHED -> DEPARTED -> WORKING -> INSPECTING -> COMPLETED/VERIFIED)
 *    - 2장 이상 전/후 검수 사진 검증
 *    - CONFIRM_COMPLETE (검수 확정 및 리뷰 유도)
 *    - CANCEL_RESERVATION (7일 이내 50% 위약 환불 / 7일 경과 시 100% 몰수 + 7일 정지 및 제재 로그 기록)
 */

import { executeQuery, executeTransaction } from '@/lib/db';

export interface UserHis01Request {
  mode?: 'GET_WORK_DETAIL' | 'CONFIRM_COMPLETE' | 'CANCEL_RESERVATION';
  userNo?: string;
  contractNo?: string;
  workSeq?: number;
  cancelReason?: string;
}

export interface PhotoItem {
  photoSeq: number;
  photoTypeCd: 'BEFORE' | 'AFTER';
  photoUrl: string;
  title: string;
  sortOrd: number;
}

export interface WorkLogDetail {
  workSeq: number;
  roundNo: number;
  workStatCd: 'MATCHED' | 'DEPARTED' | 'WORKING' | 'INSPECTING' | 'VERIFIED' | 'COMPLETED';
  workerMemo: string | null;
  startDt: string | null;
  endDt: string | null;
  confirmDt?: string | null;
}

export interface ContractDetail {
  contractNo: string;
  reqNo: string;
  subItemNm: string;
  contractStatCd: string;
  totalPayAmt: number;
  safeTelNo: string | null;
  ptnrNo: string;
  companyNm: string;
  ceoNm: string | null;
  profileImgUrl?: string | null;
  avgRating?: number;
  addrRoad?: string;
  addrDetail?: string;
  payNo?: string | null;
  actualPaidAmt?: number;
  paidDt?: string | null;
  elapsedHoursAfterPay?: number;
}

export async function processUserHis01(data: UserHis01Request) {
  const mode = data.mode || 'GET_WORK_DETAIL';
  const userNo = data.userNo || 'U20261000001';
  let contractNo = data.contractNo;

  // 계약번호가 전달되지 않았을 경우 기본 활성 계약 자동 탐색
  if (!contractNo) {
    const defaultContractRows = await executeQuery<any[]>(
      `SELECT CONTRACT_NO FROM TB_CLEAN_CONTRACT WHERE USER_NO = ? ORDER BY REG_DT DESC LIMIT 1`,
      [userNo]
    );
    contractNo = defaultContractRows[0]?.CONTRACT_NO || 'CT2026102368719';
  }

  try {
    // =========================================================================
    // 모드 1: 상세 시공 및 검수 데이터 조회 (GET_WORK_DETAIL)
    // =========================================================================
    if (mode === 'GET_WORK_DETAIL') {
      // [USER-HIS-01-SQL-001] 계약 마스터 및 파트너 정보, 결제일시 조회
      const contractRows = await executeQuery<any[]>(
        `
        SELECT 
          c.CONTRACT_NO AS contractNo,
          c.REQ_NO AS reqNo,
          c.SUB_ITEM_NM AS subItemNm,
          c.CONTRACT_STAT_CD AS contractStatCd,
          c.TOTAL_PAY_AMT AS totalPayAmt,
          c.SAFE_TEL_NO AS safeTelNo,
          p.PTNR_NO AS ptnrNo,
          p.COMPANY_NM AS companyNm,
          p.CEO_NM AS ceoNm,
          p.PROFILE_IMG_URL AS profileImgUrl,
          p.AVG_RATING AS avgRating,
          r.ADDR_ROAD AS addrRoad,
          r.ADDR_DETAIL AS addrDetail,
          pay.PAY_NO AS payNo,
          COALESCE(pay.ACTUAL_PAID_AMT, 26000) AS actualPaidAmt,
          pay.PAID_DT AS paidDt,
          TIMESTAMPDIFF(HOUR, COALESCE(pay.PAID_DT, DATE_SUB(NOW(), INTERVAL 2 DAY)), NOW()) AS elapsedHoursAfterPay
        FROM TB_CLEAN_CONTRACT c
        INNER JOIN TB_PARTNER p ON c.PTNR_NO = p.PTNR_NO
        LEFT JOIN TB_CLEAN_REQ r ON c.REQ_NO = r.REQ_NO
        LEFT JOIN TB_DATA_FEE_PAY pay ON c.CONTRACT_NO = pay.CONTRACT_NO AND pay.PAYER_TYPE_CD = 'USER' AND pay.PAY_STAT_CD = 'COMPLETED'
        WHERE c.CONTRACT_NO = ? AND c.USER_NO = ?;
        `,
        [contractNo, userNo]
      );

      if (contractRows.length === 0) {
        return {
          success: false,
          message: `해당 계약 정보를 찾을 수 없습니다. (계약번호: ${contractNo})`,
        };
      }

      const contract = contractRows[0];
      const elapsedHours = Number(contract.elapsedHoursAfterPay) || 0;
      const isWithin7Days = elapsedHours <= 168;
      const actualPaidAmt = Number(contract.actualPaidAmt) || 26000;
      const refundRate = isWithin7Days ? 50 : 0;
      const refundAmt = isWithin7Days ? Math.round(actualPaidAmt * 0.5) : 0;

      // [USER-HIS-01-SQL-002] 최신 시공 회차 및 진행 상태 Stepper 조회
      const workLogRows = await executeQuery<any[]>(
        `
        SELECT 
          WORK_SEQ AS workSeq,
          ROUND_NO AS roundNo,
          WORK_STAT_CD AS workStatCd,
          WORKER_MEMO AS workerMemo,
          START_DT AS startDt,
          END_DT AS endDt,
          CONFIRM_DT AS confirmDt
        FROM TB_CLEAN_WORK_LOG
        WHERE CONTRACT_NO = ?
        ORDER BY ROUND_NO DESC, WORK_SEQ DESC
        LIMIT 1;
        `,
        [contractNo]
      );

      let workLog: WorkLogDetail | null = null;
      let photos: PhotoItem[] = [];

      if (workLogRows.length > 0) {
        const row = workLogRows[0];
        workLog = {
          workSeq: Number(row.workSeq),
          roundNo: Number(row.roundNo),
          workStatCd: row.workStatCd,
          workerMemo: row.workerMemo,
          startDt: row.startDt ? String(row.startDt) : null,
          endDt: row.endDt ? String(row.endDt) : null,
          confirmDt: row.confirmDt ? String(row.confirmDt) : null,
        };

        // [USER-HIS-01-SQL-003] 당해 회차 시공 증빙 사진 Before/After 목록 조회
        const photoRows = await executeQuery<any[]>(
          `
          SELECT 
            PHOTO_SEQ AS photoSeq,
            PHOTO_TYPE_CD AS photoTypeCd,
            PHOTO_URL AS photoUrl,
            TITLE AS title,
            SORT_ORD AS sortOrd
          FROM TB_CLEAN_WORK_PHOTO
          WHERE WORK_SEQ = ?
          ORDER BY SORT_ORD ASC, PHOTO_SEQ ASC;
          `,
          [workLog.workSeq]
        );

        photos = photoRows.map((p) => ({
          photoSeq: Number(p.photoSeq),
          photoTypeCd: p.photoTypeCd,
          photoUrl: p.photoUrl,
          title: p.title,
          sortOrd: Number(p.sortOrd),
        }));
      }

      return {
        success: true,
        contract: {
          contractNo: contract.contractNo,
          reqNo: contract.reqNo,
          subItemNm: contract.subItemNm,
          contractStatCd: contract.contractStatCd,
          totalPayAmt: Number(contract.totalPayAmt) || 0,
          safeTelNo: contract.safeTelNo || '0507-1234-5678',
          ptnrNo: contract.ptnrNo,
          companyNm: contract.companyNm,
          ceoNm: contract.ceoNm,
          profileImgUrl: contract.profileImgUrl,
          avgRating: Number(contract.avgRating) || 5.0,
          addrRoad: contract.addrRoad || '경기 고양시 일산동구 중앙로 빌라 단지 A동',
          addrDetail: contract.addrDetail || '1~4층 계단 및 복도',
          payNo: contract.payNo,
          actualPaidAmt,
          paidDt: contract.paidDt,
          elapsedHoursAfterPay: elapsedHours,
        },
        workLog,
        photos,
        hasMinimumPhotos: photos.length >= 2,
        refundPolicy: {
          elapsedHours,
          isWithin7Days,
          refundRate,
          refundAmt,
          willBeSuspended: !isWithin7Days,
        },
        syncedAt: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
      };
    }

    // =========================================================================
    // 모드 2: 시공 완료 확정 승인 (CONFIRM_COMPLETE)
    // =========================================================================
    if (mode === 'CONFIRM_COMPLETE') {
      const workSeq = Number(data.workSeq);
      if (!workSeq) {
        return {
          success: false,
          message: '시공 순번(workSeq)이 유효하지 않습니다.',
        };
      }

      await executeTransaction(async (conn) => {
        // [USER-HIS-01-SQL-004] 시공 완료 확정 승인 처리: TB_CLEAN_WORK_LOG UPDATE
        await conn.execute(
          `
          UPDATE TB_CLEAN_WORK_LOG
          SET 
            WORK_STAT_CD = 'VERIFIED',
            CONFIRM_DT = NOW(),
            MOD_DT = NOW(),
            MOD_ID = ?
          WHERE WORK_SEQ = ?;
          `,
          [userNo, workSeq]
        );

        // [USER-HIS-01-SQL-005] 계약 마스터 최종 완료 상태 전이: TB_CLEAN_CONTRACT UPDATE
        await conn.execute(
          `
          UPDATE TB_CLEAN_CONTRACT
          SET 
            CONTRACT_STAT_CD = 'COMPLETED',
            MOD_DT = NOW(),
            MOD_ID = ?
          WHERE CONTRACT_NO = ?;
          `,
          [userNo, contractNo]
        );
      });

      return {
        success: true,
        message: '시공 완료가 정상적으로 확정되었습니다. 리뷰 작성 화면으로 이동합니다.',
        redirectUrl: `/reviews/write?contractNo=${contractNo}`,
      };
    }

    // =========================================================================
    // 모드 3: 예약 취소 신청 (CANCEL_RESERVATION)
    // =========================================================================
    if (mode === 'CANCEL_RESERVATION') {
      const cancelReason = data.cancelReason || '고객 단순 변심 및 일정 변경 불가';

      // 결제 및 경과 시간 재조회 [USER-HIS-01-SQL-001]
      const contractRows = await executeQuery<any[]>(
        `
        SELECT 
          c.CONTRACT_NO AS contractNo,
          pay.PAY_NO AS payNo,
          COALESCE(pay.ACTUAL_PAID_AMT, 26000) AS actualPaidAmt,
          pay.PAID_DT AS paidDt,
          TIMESTAMPDIFF(HOUR, COALESCE(pay.PAID_DT, DATE_SUB(NOW(), INTERVAL 2 DAY)), NOW()) AS elapsedHoursAfterPay
        FROM TB_CLEAN_CONTRACT c
        LEFT JOIN TB_DATA_FEE_PAY pay ON c.CONTRACT_NO = pay.CONTRACT_NO AND pay.PAYER_TYPE_CD = 'USER' AND pay.PAY_STAT_CD = 'COMPLETED'
        WHERE c.CONTRACT_NO = ? AND c.USER_NO = ?;
        `,
        [contractNo, userNo]
      );

      if (contractRows.length === 0) {
        return {
          success: false,
          message: '취소할 계약 정보를 찾을 수 없습니다.',
        };
      }

      const contract = contractRows[0];
      const elapsedHours = Number(contract.elapsedHoursAfterPay) || 0;
      const isWithin7Days = elapsedHours <= 168;
      const actualPaidAmt = Number(contract.actualPaidAmt) || 26000;
      const refundAmt = isWithin7Days ? Math.round(actualPaidAmt * 0.5) : 0;
      const payNo = contract.payNo;
      const targetPayStatCd = isWithin7Days ? 'REFUND_50' : 'FORFEITED_100';

      await executeTransaction(async (conn) => {
        // [USER-HIS-01-SQL-006] 계약 취소 및 위약 상태 갱신: TB_CLEAN_CONTRACT UPDATE
        await conn.execute(
          `
          UPDATE TB_CLEAN_CONTRACT
          SET 
            CONTRACT_STAT_CD = 'CANCELLED',
            MOD_DT = NOW(),
            MOD_ID = ?
          WHERE CONTRACT_NO = ?;
          `,
          [userNo, contractNo]
        );

        // [USER-HIS-01-SQL-007] 결제 원장 환불/몰수 상태 전이: TB_DATA_FEE_PAY UPDATE
        if (payNo) {
          await conn.execute(
            `
            UPDATE TB_DATA_FEE_PAY
            SET 
              PAY_STAT_CD = ?,
              MOD_DT = NOW(),
              MOD_ID = ?
            WHERE PAY_NO = ?;
            `,
            [targetPayStatCd, userNo, payNo]
          );
        }

        // 7일 경과 취소인 경우 (100% 몰수 + 7일 이용 정지 패널티)
        if (!isWithin7Days) {
          // [USER-HIS-01-SQL-008] 7일 경과 취소 시 회원 7일 정지 부여: TB_USER UPDATE
          await conn.execute(
            `
            UPDATE TB_USER
            SET 
              USER_STAT_CD = 'SUSPENDED_7D',
              SUSPEND_EXPIRE_DT = DATE_ADD(NOW(), INTERVAL 7 DAY),
              CANCEL_ACCUM_CNT = CANCEL_ACCUM_CNT + 1,
              MOD_DT = NOW(),
              MOD_ID = 'SYSTEM'
            WHERE USER_NO = ?;
            `,
            [userNo]
          );

          // [USER-HIS-01-SQL-009] 제재 로그 등록: TB_SANCTION_LOG INSERT
          await conn.execute(
            `
            INSERT INTO TB_SANCTION_LOG (
              TARGET_ROLE_CD, TARGET_ID, CONTRACT_NO, SANCTION_TYPE_CD, SANCTION_REASON_CD, REASON_DESC, START_DT, END_DT, STATUS_CD, REG_DT, REG_ID
            ) VALUES (
              'USER', ?, ?, 'SUSPEND_7D', 'CANCEL_AFTER_7D', ?, NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY), 'ACTIVE', NOW(), 'SYSTEM'
            );
            `,
            [userNo, contractNo, `결제 7일 경과 후 계약 일방 취소 [사유: ${cancelReason}]`]
          );
        }
      });

      return {
        success: true,
        isWithin7Days,
        refundAmt,
        suspended: !isWithin7Days,
        message: isWithin7Days
          ? `결제 후 7일 이내 취소로 데이터 이용료의 50%(${refundAmt.toLocaleString()}원)가 환불 처리되었습니다.`
          : '결제 후 7일이 경과하여 데이터 이용료가 전액 몰수되었으며, 약관에 따라 7일간 서비스 이용이 정지되었습니다.',
      };
    }

    return {
      success: false,
      message: `알 수 없는 처리 모드(mode)입니다: ${mode}`,
    };
  } catch (error: any) {
    console.error('❌ [USER-HIS-01] Server processing error:', error);
    return {
      success: false,
      message: `청소 진행 상세 처리 중 오류가 발생했습니다: ${error.message || error}`,
    };
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as UserHis01Request;
    const result = await processUserHis01(body);
    const status = result.success ? 200 : 400;
    return new Response(JSON.stringify(result), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('❌ [USER-HIS-01] POST Handler Error:', err);
    return new Response(
      JSON.stringify({
        success: false,
        message: '요청 본문(JSON) 파싱 실패 또는 서버 내부 오류입니다.',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
