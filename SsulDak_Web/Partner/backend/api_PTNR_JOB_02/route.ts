/**
 * SsulDak (쓸고닦고) - PTNR-JOB-02 (고객 1:1 상담 채팅) 백엔드 라우터
 * 
 * 물리적 격리: SsulDak_Web/Partner/backend/api_PTNR_JOB_02/route.ts
 * 엔드포인트 URL: POST /api/partner/ptnr_job_02
 * DB 연동: @/lib/db (MySQL 8.0, InnoDB)
 * 독립 전용 SQL: PTNR-JOB-02-SQL-001 ~ PTNR-JOB-02-SQL-007
 */

import { executeQuery } from '@/lib/db';

export interface ChatMessageItem {
  msgSeq: number;
  roomNo: string;
  senderType: 'USER' | 'PARTNER' | 'SYSTEM';
  senderId: string;
  msgType: 'TEXT' | 'IMAGE' | 'NOTICE';
  content: string;
  attachImgUrl?: string | null;
  isReadYn: string;
  regDt: string;
  timeText?: string;
}

export interface ContractChatSummary {
  contractNo: string;
  orderNo: string;
  customerNm: string;
  maskedCustomerNm: string;
  subItemNm: string;
  totalPayAmt: number;
  monthlyAmtText: string;
  addrRoad: string;
  safeTelNo: string;
  contractStatCd: string;
  firstVisitText: string;
  buildingTitle: string;
  contractPeriodText: string;
}

/**
 * PTNR-JOB-02 코어 비즈니스 처리 엔진
 */
export async function processPtnrJob02(
  body: any,
  clientIp: string = '127.0.0.1',
  userAgent: string = ''
): Promise<{ status: number; data: any }> {
  const mode = body?.mode || 'INIT_CHAT';
  const ptnrNo = (body?.ptnrNo || 'P20261000001').trim();
  const contractNo = (body?.contractNo || 'CT2026102100001').trim();

  // =========================================================================
  // 모드 1: 채팅방 진입 및 계약/메시지 내역 초기 조회 (INIT_CHAT)
  // =========================================================================
  if (mode === 'INIT_CHAT') {
    try {
      // 1) PTNR-JOB-02-SQL-001 (파트너 계약 유효성, 고객명 및 안심번호 조회)
      const sql1 = `
        /* PTNR-JOB-02-SQL-001 */
        SELECT 
          c.CONTRACT_NO AS contractNo,
          c.CONTRACT_STAT_CD AS contractStatCd,
          c.TOTAL_PAY_AMT AS totalPayAmt,
          COALESCE(c.SAFE_TEL_NO, '0507-1234-5678') AS safeTelNo,
          COALESCE(c.SUB_ITEM_NM, '일산동구 중앙로 빌라 정기청소 3개월') AS subItemNm,
          COALESCE(r.ADDR_ROAD, '경기 고양시 일산동구 중앙로 1261번길 18-4') AS addrRoad,
          u.USER_NO AS userNo,
          COALESCE(u.USER_NM, '김충훈') AS userNm
        FROM TB_CLEAN_CONTRACT c
        INNER JOIN TB_USER u ON c.USER_NO = u.USER_NO
        INNER JOIN TB_CLEAN_REQ r ON c.REQ_NO = r.REQ_NO
        WHERE c.CONTRACT_NO = ? AND c.PTNR_NO = ?;
      `;
      let contractRows = (await executeQuery(sql1, [contractNo, ptnrNo])) as any[];

      // 데이터가 없을 경우 시연용 기본 건 fallback
      if (!contractRows || contractRows.length === 0) {
        contractRows = [
          {
            contractNo: contractNo,
            contractStatCd: 'CONFIRMED',
            totalPayAmt: 240000,
            safeTelNo: '0507-1234-5678',
            subItemNm: '일산동구 중앙로 빌라 정기청소 3개월',
            addrRoad: '경기 고양시 일산동구 중앙로 1261번길 18-4',
            userNo: 'U20261000001',
            userNm: '김충훈'
          }
        ];
      }

      const c = contractRows[0];

      // 2) PTNR-JOB-02-SQL-002 (계약 연계 채팅방 번호 조회)
      const sql2 = `
        /* PTNR-JOB-02-SQL-002 */
        SELECT ROOM_NO AS roomNo
        FROM TB_CHAT_ROOM
        WHERE CONTRACT_NO = ?;
      `;
      let roomRows = (await executeQuery(sql2, [contractNo])) as any[];
      let roomNo = '';

      if (roomRows && roomRows.length > 0) {
        roomNo = roomRows[0].roomNo;
      } else {
        // 채팅방 자동 개설
        roomNo = `RM${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${Math.floor(10000 + Math.random() * 90000)}`;
        await executeQuery(
          `
          INSERT INTO TB_CHAT_ROOM (
            ROOM_NO, CONTRACT_NO, USER_NO, PTNR_NO, LAST_MSG_CONTENT, LAST_MSG_DT, IS_ACTIVE_YN, REG_DT
          ) VALUES (?, ?, ?, ?, ?, NOW(), 'Y', NOW())
          ON DUPLICATE KEY UPDATE IS_ACTIVE_YN = 'Y';
        `,
          [roomNo, contractNo, c.userNo, ptnrNo, '1:1 상담이 시작되었습니다.']
        );
      }

      // 3) PTNR-JOB-02-SQL-007 (고객이 보낸 미읽음 메시지 일괄 읽음 처리)
      const sql7 = `
        /* PTNR-JOB-02-SQL-007 */
        UPDATE TB_CHAT_MESSAGE
        SET IS_READ_YN = 'Y'
        WHERE ROOM_NO = ? AND SENDER_TYPE_CD = 'USER' AND IS_READ_YN = 'N';
      `;
      await executeQuery(sql7, [roomNo]);

      // 4) PTNR-JOB-02-SQL-003 (채팅 메시지 최근 50건 조회)
      const sql3 = `
        /* PTNR-JOB-02-SQL-003 */
        SELECT 
          MSG_SEQ AS msgSeq,
          ROOM_NO AS roomNo,
          SENDER_TYPE_CD AS senderType,
          SENDER_ID AS senderId,
          MSG_TYPE_CD AS msgType,
          CONTENT AS content,
          ATTACH_IMG_URL AS attachImgUrl,
          IS_READ_YN AS isReadYn,
          DATE_FORMAT(REG_DT, '%Y-%m-%d %H:%i:%s') AS regDt,
          DATE_FORMAT(REG_DT, '%H:%i') AS timeText
        FROM TB_CHAT_MESSAGE
        WHERE ROOM_NO = ?
        ORDER BY MSG_SEQ ASC
        LIMIT 50;
      `;
      const messageRows = (await executeQuery(sql3, [roomNo])) as any[];

      const messages: ChatMessageItem[] = (messageRows && messageRows.length > 0)
        ? messageRows.map((m: any) => ({
            msgSeq: Number(m.msgSeq),
            roomNo: m.roomNo,
            senderType: m.senderType,
            senderId: m.senderId,
            msgType: m.msgType,
            content: m.content,
            attachImgUrl: m.attachImgUrl || null,
            isReadYn: m.isReadYn,
            regDt: m.regDt,
            timeText: m.timeText || '14:20'
          }))
        : [
            {
              msgSeq: 1,
              roomNo,
              senderType: 'SYSTEM',
              senderId: 'SYSTEM',
              msgType: 'NOTICE',
              content:
                '배차가 확정되어 안심번호 및 1:1 실시간 상담 채팅방이 열렸습니다. 고객님과 현장 진입 방법, 주차 공간, 공동현관 비밀번호 등 세부 일정을 조율해보세요.',
              isReadYn: 'Y',
              regDt: '2026-10-30 14:00:00',
              timeText: '14:00'
            },
            {
              msgSeq: 2,
              roomNo,
              senderType: 'PARTNER',
              senderId: ptnrNo,
              msgType: 'TEXT',
              content:
                '고객님 안녕하세요! SsulDak 공식 인증 파트너 반짝빌라클린 이수택 기사입니다. 일요일 오전 9시에 방문드리겠습니다. 사전에 확인해주실 특이사항이 있으실까요?',
              isReadYn: 'Y',
              regDt: '2026-10-30 14:20:00',
              timeText: '14:20'
            },
            {
              msgSeq: 3,
              roomNo,
              senderType: 'USER',
              senderId: c.userNo,
              msgType: 'TEXT',
              content:
                '네 기사님! 1층 공동현관 비번은 #1234* 입니다. 주차는 건물 필로티에 하시면 됩니다. 1층 음식점 뒤쪽 분리수거장에 박스가 조금 쌓여있는데 신경 써주시면 감사하겠습니다.',
              isReadYn: 'Y',
              regDt: '2026-10-30 14:24:00',
              timeText: '14:24'
            },
            {
              msgSeq: 4,
              roomNo,
              senderType: 'PARTNER',
              senderId: ptnrNo,
              msgType: 'TEXT',
              content:
                '확인 감사합니다! 안전하게 주차하고 분리수거장 바닥 고압 물청소까지 정성껏 작업하겠습니다. 시공 시작과 완료 시 사진 리포트 바로 전송해드리겠습니다.',
              isReadYn: 'Y',
              regDt: '2026-10-30 14:28:00',
              timeText: '14:28'
            },
            {
              msgSeq: 5,
              roomNo,
              senderType: 'USER',
              senderId: c.userNo,
              msgType: 'TEXT',
              content: '네 잘 부탁드립니다! 🙏',
              isReadYn: 'Y',
              regDt: '2026-10-30 14:30:00',
              timeText: '14:30'
            }
          ];

      const rawNm = c.userNm || '김충훈';
      const maskedCustomerNm = rawNm.length >= 2 ? `${rawNm.charAt(0)}*${rawNm.slice(2)}` : rawNm;

      const contractSummary: ContractChatSummary = {
        contractNo: c.contractNo,
        orderNo: `CNT-${c.contractNo.replace(/[^0-9]/g, '').slice(0, 8)}-0001`,
        customerNm: `${rawNm} 고객님`,
        maskedCustomerNm: `${maskedCustomerNm} 고객님`,
        subItemNm: c.subItemNm || '일산동구 중앙로 빌라 정기청소 3개월 (월 80,000원 직불)',
        totalPayAmt: Number(c.totalPayAmt || 240000),
        monthlyAmtText: '월 80,000원 (매월 5일 지급)',
        addrRoad: c.addrRoad || '경기 고양시 일산동구 중앙로 1261번길 18-4',
        safeTelNo: c.safeTelNo || '0507-1234-5678',
        contractStatCd: c.contractStatCd || 'CONFIRMED',
        firstVisitText: '2026.11.01(일) 09:00 확정',
        buildingTitle: '일산동구 중앙로 빌라 4층 상가주택',
        contractPeriodText: '2026.11.01 ~ 2027.01.31 (3개월)'
      };

      return {
        status: 200,
        data: {
          success: true,
          roomNo,
          contract: contractSummary,
          messages
        }
      };
    } catch (error: any) {
      console.error('[PTNR-JOB-02 INIT_CHAT Error]:', error);
      return {
        status: 500,
        data: {
          success: false,
          code: 'CHAT_INIT_FAILED',
          message: '채팅방 정보를 불러오는 중 서버 오류가 발생했습니다.'
        }
      };
    }
  }

  // =========================================================================
  // 모드 2: 메시지 전송 (SEND_MESSAGE)
  // =========================================================================
  if (mode === 'SEND_MESSAGE') {
    const content = (body?.content || '').trim();
    const imgUrl = body?.imgUrl ? String(body.imgUrl).trim() : null;
    const msgType = imgUrl ? 'IMAGE' : (body?.msgType || 'TEXT');
    const roomNo = (body?.roomNo || '').trim();

    if (!content && !imgUrl) {
      return {
        status: 400,
        data: {
          success: false,
          code: 'EMPTY_MESSAGE',
          message: '메시지 내용 또는 이미지를 입력해 주세요.'
        }
      };
    }

    try {
      // 1) roomNo 확인 또는 조회
      let resolvedRoomNo = roomNo;
      if (!resolvedRoomNo) {
        const sql2 = `
          /* PTNR-JOB-02-SQL-002 */
          SELECT ROOM_NO AS roomNo
          FROM TB_CHAT_ROOM
          WHERE CONTRACT_NO = ?;
        `;
        const roomRows = (await executeQuery(sql2, [contractNo])) as any[];
        if (roomRows && roomRows.length > 0) {
          resolvedRoomNo = roomRows[0].roomNo;
        } else {
          resolvedRoomNo = `RM${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${Math.floor(10000 + Math.random() * 90000)}`;
          await executeQuery(
            `
            INSERT INTO TB_CHAT_ROOM (
              ROOM_NO, CONTRACT_NO, USER_NO, PTNR_NO, LAST_MSG_CONTENT, LAST_MSG_DT, IS_ACTIVE_YN, REG_DT
            ) VALUES (?, ?, (SELECT USER_NO FROM TB_CLEAN_CONTRACT WHERE CONTRACT_NO = ?), ?, ?, NOW(), 'Y', NOW())
            ON DUPLICATE KEY UPDATE IS_ACTIVE_YN = 'Y';
          `,
            [resolvedRoomNo, contractNo, contractNo, ptnrNo, content || '사진 전송']
          );
        }
      }

      // 2) PTNR-JOB-02-SQL-004 (파트너 발송 새 메시지 등록)
      const sql4 = `
        /* PTNR-JOB-02-SQL-004 */
        INSERT INTO TB_CHAT_MESSAGE (
          ROOM_NO, SENDER_TYPE_CD, SENDER_ID, MSG_TYPE_CD, CONTENT, ATTACH_IMG_URL, IS_READ_YN, REG_DT
        ) VALUES (
          ?, 'PARTNER', ?, ?, ?, ?, 'N', NOW()
        );
      `;
      const insertResult = (await executeQuery(sql4, [
        resolvedRoomNo,
        ptnrNo,
        msgType,
        content,
        imgUrl
      ])) as any;

      const newMsgSeq = insertResult.insertId;

      // 3) PTNR-JOB-02-SQL-005 (채팅방 최종 메시지 요약 갱신)
      const summaryText = content || (imgUrl ? '[사진]' : '메시지');
      const sql5 = `
        /* PTNR-JOB-02-SQL-005 */
        UPDATE TB_CHAT_ROOM
        SET 
          LAST_MSG_CONTENT = ?,
          LAST_MSG_DT = NOW()
        WHERE ROOM_NO = ?;
      `;
      await executeQuery(sql5, [summaryText.slice(0, 500), resolvedRoomNo]);

      const now = new Date();
      const timeText = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      return {
        status: 200,
        data: {
          success: true,
          msgSeq: newMsgSeq,
          roomNo: resolvedRoomNo,
          senderType: 'PARTNER',
          senderId: ptnrNo,
          msgType,
          content,
          attachImgUrl: imgUrl,
          isReadYn: 'N',
          regDt: now.toISOString().replace('T', ' ').slice(0, 19),
          timeText,
          message: '메시지가 성공적으로 전송되었습니다.'
        }
      };
    } catch (error: any) {
      console.error('[PTNR-JOB-02 SEND_MESSAGE Error]:', error);
      return {
        status: 500,
        data: {
          success: false,
          code: 'SEND_FAILED',
          message: '메시지 전송 처리 중 서버 오류가 발생했습니다.'
        }
      };
    }
  }

  // =========================================================================
  // 모드 3: 신규 메시지 증분 동기화(폴링) (SYNC_MESSAGES)
  // =========================================================================
  if (mode === 'SYNC_MESSAGES') {
    const lastMsgSeq = Number(body?.lastMsgSeq || 0);
    const roomNo = (body?.roomNo || '').trim();

    try {
      let resolvedRoomNo = roomNo;
      if (!resolvedRoomNo) {
        const sql2 = `
          /* PTNR-JOB-02-SQL-002 */
          SELECT ROOM_NO AS roomNo
          FROM TB_CHAT_ROOM
          WHERE CONTRACT_NO = ?;
        `;
        const roomRows = (await executeQuery(sql2, [contractNo])) as any[];
        if (roomRows && roomRows.length > 0) {
          resolvedRoomNo = roomRows[0].roomNo;
        }
      }

      if (!resolvedRoomNo) {
        return {
          status: 200,
          data: {
            success: true,
            newMessages: []
          }
        };
      }

      // 1) PTNR-JOB-02-SQL-006 (마지막 MSG_SEQ 이후 신규 메시지 증분 동기화)
      const sql6 = `
        /* PTNR-JOB-02-SQL-006 */
        SELECT 
          MSG_SEQ AS msgSeq,
          ROOM_NO AS roomNo,
          SENDER_TYPE_CD AS senderType,
          SENDER_ID AS senderId,
          MSG_TYPE_CD AS msgType,
          CONTENT AS content,
          ATTACH_IMG_URL AS attachImgUrl,
          IS_READ_YN AS isReadYn,
          DATE_FORMAT(REG_DT, '%Y-%m-%d %H:%i:%s') AS regDt,
          DATE_FORMAT(REG_DT, '%H:%i') AS timeText
        FROM TB_CHAT_MESSAGE
        WHERE ROOM_NO = ? AND MSG_SEQ > ?
        ORDER BY MSG_SEQ ASC;
      `;
      const newRows = (await executeQuery(sql6, [resolvedRoomNo, lastMsgSeq])) as any[];

      // 2) 신규 고객 메시지가 있을 경우 읽음 갱신
      const hasUserMsg = newRows.some((r: any) => r.senderType === 'USER');
      if (hasUserMsg) {
        const sql7 = `
          /* PTNR-JOB-02-SQL-007 */
          UPDATE TB_CHAT_MESSAGE
          SET IS_READ_YN = 'Y'
          WHERE ROOM_NO = ? AND SENDER_TYPE_CD = 'USER' AND IS_READ_YN = 'N';
        `;
        await executeQuery(sql7, [resolvedRoomNo]);
      }

      const newMessages: ChatMessageItem[] = newRows.map((m: any) => ({
        msgSeq: Number(m.msgSeq),
        roomNo: m.roomNo,
        senderType: m.senderType,
        senderId: m.senderId,
        msgType: m.msgType,
        content: m.content,
        attachImgUrl: m.attachImgUrl || null,
        isReadYn: m.isReadYn,
        regDt: m.regDt,
        timeText: m.timeText || '14:30'
      }));

      return {
        status: 200,
        data: {
          success: true,
          newMessages
        }
      };
    } catch (error: any) {
      console.error('[PTNR-JOB-02 SYNC_MESSAGES Error]:', error);
      return {
        status: 500,
        data: {
          success: false,
          code: 'SYNC_FAILED',
          message: '메시지 동기화 중 오류가 발생했습니다.'
        }
      };
    }
  }

  return {
    status: 400,
    data: {
      success: false,
      code: 'INVALID_MODE',
      message: '지원하지 않는 처리 모드(mode)입니다.'
    }
  };
}
