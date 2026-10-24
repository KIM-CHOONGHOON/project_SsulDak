/**
 * =============================================================================
 * SsulDak (쓸고닦고) 풀스택 개발 명세
 * 화면 ID: USER-QOT-02 (파트너 1:1 상담 채팅)
 * 백엔드 라우터 경로: SsulDak_Web/User/backend/api_USER_QOT_02/route.ts
 * 엔드포인트 URL: POST /api/user/user_qot_02
 *
 * [독립 전용 SQL 쿼리 ID]
 *   - USER-QOT-02-SQL-001 (계약 유효성, 안심번호 및 파트너 정보 조회)
 *   - USER-QOT-02-SQL-002 (계약 연계 채팅방 조회 또는 신규 채번 생성)
 *   - USER-QOT-02-SQL-003 (채팅방 기본 정보 조회)
 *   - USER-QOT-02-SQL-004 (채팅 메시지 이력 최근 50건 조회)
 *   - USER-QOT-02-SQL-005 (새 메시지 전송 및 저장: TB_CHAT_MESSAGE INSERT)
 *   - USER-QOT-02-SQL-006 (채팅방 최종 메시지 요약 갱신)
 *   - USER-QOT-02-SQL-007 (마지막 MSG_SEQ 이후 신규 메시지 동기화 조회)
 *
 * [계약 상태 기반 보안 정책]
 *   - 채팅방 접근 가능 조건: 양측 결제가 완료된 계약 (CONTRACT_STAT_CD IN ('CONFIRMED', 'IN_PROGRESS', 'COMPLETED'))
 *   - 양측 결제 전 상태에서는 진입 차단 (403 Forbidden: PAYMENT_REQUIRED)
 *   - 0507 가상 안심번호(SAFE_TEL_NO) 제공 및 암호화 보관
 * =============================================================================
 */

import { executeQuery } from '@/lib/db';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

// =============================================================================
// 1. 인터페이스 정의
// =============================================================================

export type Qot02Mode = 'INIT_CHAT' | 'SEND_MESSAGE' | 'SYNC_MESSAGES';

export interface UserQot02ReqBody {
  mode: Qot02Mode;
  userNo?: string;
  contractNo: string;
  roomNo?: string;
  msgType?: 'TEXT' | 'IMAGE' | 'NOTICE';
  content?: string;
  imgUrl?: string;
  lastMsgSeq?: number;
}

export interface ChatPartnerInfo {
  ptnrNo: string;
  companyNm: string;
  ceoNm: string;
  profileImgUrl: string;
}

export interface ChatContractInfo {
  contractNo: string;
  contractStatCd: string;
  totalPayAmt: number;
  serviceStartDt: string;
  safeTelNo: string;
  subItemNm: string;
  partner: ChatPartnerInfo;
}

export interface ChatMessageItem {
  msgSeq: number;
  senderType: 'USER' | 'PARTNER' | 'SYSTEM';
  senderId: string;
  msgType: 'TEXT' | 'IMAGE' | 'NOTICE';
  content: string;
  attachImgUrl?: string | null;
  isReadYn: string;
  regDt: string;
}

export interface UserQot02Response {
  success: boolean;
  code?: string;
  message?: string;
  roomNo?: string;
  contract?: ChatContractInfo;
  messages?: ChatMessageItem[];
  msgSeq?: number;
  regDt?: string;
}

// =============================================================================
// 2. 비즈니스 로직 처리 함수 (Next.js & Express 공용)
// =============================================================================

export async function processUserQot02(
  body: UserQot02ReqBody
): Promise<{ status: number; body: UserQot02Response }> {
  const { mode, userNo = 'U20261000001', contractNo, roomNo: inputRoomNo, msgType = 'TEXT', content, imgUrl, lastMsgSeq = 0 } = body;

  if (!contractNo) {
    return {
      status: 400,
      body: { success: false, message: '계약 번호(contractNo)가 필요합니다.' },
    };
  }

  try {
    // =========================================================================
    // 모드 1: 채팅방 진입 및 초기화 (INIT_CHAT)
    // =========================================================================
    if (mode === 'INIT_CHAT') {
      // -----------------------------------------------------------------------
      // USER-QOT-02-SQL-001 (계약 유효성, 안심번호 및 파트너 정보 조회)
      // -----------------------------------------------------------------------
      const contractSql = `
        SELECT 
          c.CONTRACT_NO AS contractNo,
          c.CONTRACT_STAT_CD AS contractStatCd,
          c.TOTAL_PAY_AMT AS totalPayAmt,
          DATE_FORMAT(c.SERVICE_START_DT, '%Y-%m-%d %H:%i:%s') AS serviceStartDt,
          COALESCE(c.SAFE_TEL_NO, '0507-1234-5678') AS safeTelNo,
          COALESCE(c.SUB_ITEM_NM, '정기청소 3개월 (월 4회)') AS subItemNm,
          p.PTNR_NO AS ptnrNo,
          p.COMPANY_NM AS companyNm,
          COALESCE(p.CEO_NM, p.REP_NM, '홍길동') AS ceoNm,
          COALESCE(p.PROFILE_IMG_URL, 'https://lh3.googleusercontent.com/aida-public/AB6AXuB5bKf0Lz0uCFjdpGFGZBfNm1yYpX7CutM1gcBnqEz4F0itndi5cCbW7mEuYSpwzrhZ3Lt3dHzip-Nik3_NwV2JMOiGrx0vjW4reDxmTRtT35MiqiqH-gWzSRhYft-ydBDTyHwk0U1zwI37UjY79RzFWsAWNVmeIHpxjEWmdbcxQUQ2ICv3kd58WpZT1z8vTBD5_ln8aJdqWcw6LTDMWKXTlMoFGh0S5fMaSRnBedlqE2DSm5RfXKij') AS profileImgUrl
        FROM TB_CLEAN_CONTRACT c
        INNER JOIN TB_PARTNER p ON c.PTNR_NO = p.PTNR_NO
        WHERE c.CONTRACT_NO = ? AND c.USER_NO = ?;
      `;
      const contractRows = await executeQuery<RowDataPacket[]>(contractSql, [contractNo, userNo]);

      if (!contractRows || contractRows.length === 0) {
        return {
          status: 404,
          body: { success: false, message: '유효한 계약 정보를 찾을 수 없습니다.' },
        };
      }

      const raw = contractRows[0];
      const validStatuses = ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'];
      if (!validStatuses.includes(raw.contractStatCd)) {
        return {
          status: 403,
          body: {
            success: false,
            code: 'PAYMENT_REQUIRED',
            message: '상호 결제가 완료되어야 1:1 상담 채팅방이 열립니다.',
          },
        };
      }

      const contract: ChatContractInfo = {
        contractNo: raw.contractNo,
        contractStatCd: raw.contractStatCd,
        totalPayAmt: Number(raw.totalPayAmt) || 240000,
        serviceStartDt: raw.serviceStartDt || '2026-11-01 09:00:00',
        safeTelNo: raw.safeTelNo,
        subItemNm: raw.subItemNm,
        partner: {
          ptnrNo: raw.ptnrNo,
          companyNm: raw.companyNm,
          ceoNm: raw.ceoNm,
          profileImgUrl: raw.profileImgUrl,
        },
      };

      // -----------------------------------------------------------------------
      // USER-QOT-02-SQL-003 (채팅방 기본 정보 조회)
      // -----------------------------------------------------------------------
      const roomSql = `
        SELECT ROOM_NO AS roomNo
        FROM TB_CHAT_ROOM
        WHERE CONTRACT_NO = ?;
      `;
      const roomRows = await executeQuery<RowDataPacket[]>(roomSql, [contractNo]);

      let roomNo: string;
      if (roomRows && roomRows.length > 0) {
        roomNo = roomRows[0].roomNo;
      } else {
        // 채팅방 신규 채번 및 생성: RM + YYYYMMDD + 5자리
        const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        roomNo = `RM${todayStr}00001`;

        // USER-QOT-02-SQL-002
        const insertRoomSql = `
          INSERT INTO TB_CHAT_ROOM (
            ROOM_NO, CONTRACT_NO, USER_NO, PTNR_NO, LAST_MSG_CONTENT, LAST_MSG_DT, IS_ACTIVE_YN, REG_DT
          ) VALUES (?, ?, ?, ?, '양측 결제가 완료되어 상담 채팅방이 열렸습니다.', NOW(), 'Y', NOW())
          ON DUPLICATE KEY UPDATE IS_ACTIVE_YN = 'Y';
        `;
        await executeQuery<ResultSetHeader>(insertRoomSql, [roomNo, contractNo, userNo, raw.ptnrNo]);

        // 시스템 웰컴 메시지 삽입
        const welcomeMsgSql = `
          INSERT INTO TB_CHAT_MESSAGE (
            ROOM_NO, SENDER_TYPE_CD, SENDER_ID, MSG_TYPE_CD, CONTENT, IS_READ_YN, REG_DT
          ) VALUES (?, 'SYSTEM', 'SYSTEM', 'NOTICE', '양측 데이터 이용료 및 청약 확약이 완료되어 1:1 상담 채팅방이 열렸습니다. 공동현관 비밀번호, 주차 위치, 특이 오염 구역을 조율해 보세요.', 'Y', NOW());
        `;
        await executeQuery<ResultSetHeader>(welcomeMsgSql, [roomNo]);
      }

      // -----------------------------------------------------------------------
      // USER-QOT-02-SQL-004 (채팅 메시지 이력 최근 50건 조회)
      // -----------------------------------------------------------------------
      const msgSql = `
        SELECT 
          MSG_SEQ AS msgSeq,
          SENDER_TYPE_CD AS senderType,
          SENDER_ID AS senderId,
          MSG_TYPE_CD AS msgType,
          CONTENT AS content,
          ATTACH_IMG_URL AS attachImgUrl,
          IS_READ_YN AS isReadYn,
          DATE_FORMAT(REG_DT, '%Y-%m-%d %H:%i:%s') AS regDt
        FROM TB_CHAT_MESSAGE
        WHERE ROOM_NO = ?
        ORDER BY MSG_SEQ ASC
        LIMIT 50;
      `;
      const msgRows = await executeQuery<RowDataPacket[]>(msgSql, [roomNo]);
      const messages: ChatMessageItem[] = (msgRows || []).map((row) => ({
        msgSeq: Number(row.msgSeq),
        senderType: row.senderType,
        senderId: row.senderId,
        msgType: row.msgType,
        content: row.content,
        attachImgUrl: row.attachImgUrl,
        isReadYn: row.isReadYn,
        regDt: row.regDt,
      }));

      return {
        status: 200,
        body: {
          success: true,
          roomNo,
          contract,
          messages,
        },
      };
    }

    // =========================================================================
    // 모드 2: 메시지 전송 (SEND_MESSAGE)
    // =========================================================================
    if (mode === 'SEND_MESSAGE') {
      if ((!content || !content.trim()) && !imgUrl) {
        return {
          status: 400,
          body: { success: false, message: '메시지 내용 또는 이미지가 필요합니다.' },
        };
      }

      // 채팅방 번호 획득
      let targetRoomNo = inputRoomNo;
      if (!targetRoomNo) {
        const roomSql = `SELECT ROOM_NO AS roomNo FROM TB_CHAT_ROOM WHERE CONTRACT_NO = ?;`;
        const rRows = await executeQuery<RowDataPacket[]>(roomSql, [contractNo]);
        if (rRows && rRows.length > 0) {
          targetRoomNo = rRows[0].roomNo;
        } else {
          return {
            status: 404,
            body: { success: false, message: '채팅방을 찾을 수 없습니다.' },
          };
        }
      }

      const textContent = content ? content.trim() : (imgUrl ? '사진을 전송했습니다.' : '');

      // -----------------------------------------------------------------------
      // USER-QOT-02-SQL-005 (새 메시지 전송 및 저장: TB_CHAT_MESSAGE INSERT)
      // -----------------------------------------------------------------------
      const insertMsgSql = `
        INSERT INTO TB_CHAT_MESSAGE (
          ROOM_NO, SENDER_TYPE_CD, SENDER_ID, MSG_TYPE_CD, CONTENT, ATTACH_IMG_URL, IS_READ_YN, REG_DT
        ) VALUES (
          ?, 'USER', ?, ?, ?, ?, 'N', NOW()
        );
      `;
      const insertRes = await executeQuery<ResultSetHeader>(insertMsgSql, [
        targetRoomNo,
        userNo,
        msgType,
        textContent,
        imgUrl || null,
      ]);

      const insertedSeq = insertRes.insertId;

      // -----------------------------------------------------------------------
      // USER-QOT-02-SQL-006 (채팅방 최종 메시지 요약 갱신)
      // -----------------------------------------------------------------------
      const updateRoomSql = `
        UPDATE TB_CHAT_ROOM
        SET 
          LAST_MSG_CONTENT = ?,
          LAST_MSG_DT = NOW()
        WHERE ROOM_NO = ?;
      `;
      await executeQuery<ResultSetHeader>(updateRoomSql, [textContent.slice(0, 100), targetRoomNo]);

      const nowFormatted = new Date().toISOString().replace('T', ' ').slice(0, 19);

      return {
        status: 200,
        body: {
          success: true,
          msgSeq: insertedSeq,
          regDt: nowFormatted,
        },
      };
    }

    // =========================================================================
    // 모드 3: 신규 메시지 동기화 (SYNC_MESSAGES)
    // =========================================================================
    if (mode === 'SYNC_MESSAGES') {
      let targetRoomNo = inputRoomNo;
      if (!targetRoomNo) {
        const roomSql = `SELECT ROOM_NO AS roomNo FROM TB_CHAT_ROOM WHERE CONTRACT_NO = ?;`;
        const rRows = await executeQuery<RowDataPacket[]>(roomSql, [contractNo]);
        if (rRows && rRows.length > 0) {
          targetRoomNo = rRows[0].roomNo;
        } else {
          return {
            status: 404,
            body: { success: false, message: '채팅방을 찾을 수 없습니다.' },
          };
        }
      }

      // -----------------------------------------------------------------------
      // USER-QOT-02-SQL-007 (마지막 MSG_SEQ 이후 신규 메시지 동기화 조회)
      // -----------------------------------------------------------------------
      const syncSql = `
        SELECT 
          MSG_SEQ AS msgSeq,
          SENDER_TYPE_CD AS senderType,
          SENDER_ID AS senderId,
          MSG_TYPE_CD AS msgType,
          CONTENT AS content,
          ATTACH_IMG_URL AS attachImgUrl,
          IS_READ_YN AS isReadYn,
          DATE_FORMAT(REG_DT, '%Y-%m-%d %H:%i:%s') AS regDt
        FROM TB_CHAT_MESSAGE
        WHERE ROOM_NO = ? AND MSG_SEQ > ?
        ORDER BY MSG_SEQ ASC;
      `;
      const syncRows = await executeQuery<RowDataPacket[]>(syncSql, [targetRoomNo, lastMsgSeq]);
      const newMessages: ChatMessageItem[] = (syncRows || []).map((row) => ({
        msgSeq: Number(row.msgSeq),
        senderType: row.senderType,
        senderId: row.senderId,
        msgType: row.msgType,
        content: row.content,
        attachImgUrl: row.attachImgUrl,
        isReadYn: row.isReadYn,
        regDt: row.regDt,
      }));

      return {
        status: 200,
        body: {
          success: true,
          messages: newMessages,
        },
      };
    }

    return {
      status: 400,
      body: { success: false, message: '지원하지 않는 mode입니다.' },
    };
  } catch (error: any) {
    console.error('❌ [USER-QOT-02] Error processing request:', error);
    return {
      status: 500,
      body: {
        success: false,
        message: '서버 내부 채팅 처리 중 오류가 발생했습니다: ' + (error.message || ''),
      },
    };
  }
}

// Next.js App Router POST 핸들러
export async function POST(request: Request) {
  try {
    const body: UserQot02ReqBody = await request.json();
    const result = await processUserQot02(body);
    return Response.json(result.body, { status: result.status });
  } catch (error: any) {
    return Response.json(
      { success: false, message: '잘못된 요청 형식입니다: ' + (error.message || '') },
      { status: 400 }
    );
  }
}
