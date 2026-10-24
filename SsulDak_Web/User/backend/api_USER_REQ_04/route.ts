/**
 * =============================================================================
 * SsulDak (쓸고닦고) 풀스택 개발 명세
 * 화면 ID: USER-REQ-04 (현장 사진 첨부 모달)
 * 백엔드 라우터 경로: SsulDak_Web/User/backend/api_USER_REQ_04/route.ts
 * 엔드포인트 URL: POST /api/user/user_req_04
 *
 * [독립 전용 SQL 쿼리 ID]
 *   - USER-REQ-04-SQL-001 (업로드 정책 확인: 최대 장수 및 허용 확장자 조회)
 *   - USER-REQ-04-SQL-002 (단일 사진 업로드 메타데이터 임시 등록 또는 검증 로그)
 *   - USER-REQ-04-SQL-003 (임시 사진 삭제: DELETE FROM TB_CLEAN_REQ_PHOTO WHERE PHOTO_URL = ?)
 *
 * [사진 업로드 및 관리 규칙]
 *   - 최대 5장까지 등록 가능 (1장당 용량 제한: 10MB 이하, JPG/PNG/WEBP/HEIC 포맷).
 *   - Base64 미리보기 또는 로컬 업로드 URL을 생성하여 부모 화면으로 안전하게 전달.
 *   - 삭제 버튼(X) 클릭 시 즉시 슬롯 재정렬(Sort Order 보정).
 * =============================================================================
 */

import { executeQuery } from '@/lib/db';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

// =============================================================================
// 1. 인터페이스 정의
// =============================================================================

export type Req04Mode = 'GET_UPLOAD_POLICY' | 'UPLOAD_PHOTO' | 'DELETE_PHOTO';

export interface UserReq04ReqBody {
  mode: Req04Mode;
  userNo?: string;
  fileName?: string;
  fileBase64?: string; // Data URL or pure base64
  fileSize?: number;   // In bytes
  sortOrd?: number;
  photoUrl?: string;
}

export interface PhotoPolicyResponse {
  maxCount: number;
  allowedExt: string[];
  maxFileSizeMb: number;
}

export interface UploadedPhotoResult {
  photoSeq?: number;
  photoUrl: string;
  fileName: string;
  fileSize: number;
  sortOrd: number;
}

export interface UserReq04Response {
  success: boolean;
  message?: string;
  policy?: PhotoPolicyResponse;
  photo?: UploadedPhotoResult;
}

// =============================================================================
// 2. 비즈니스 로직 처리 함수 (Next.js & Express 공용)
// =============================================================================

export async function processUserReq04(
  body: UserReq04ReqBody
): Promise<{ status: number; body: UserReq04Response }> {
  const { mode, userNo = 'U20261000001', fileName, fileBase64, fileSize = 0, sortOrd = 1, photoUrl } = body;

  try {
    // -------------------------------------------------------------------------
    // 모드 1: 업로드 정책 조회 (GET_UPLOAD_POLICY)
    // -------------------------------------------------------------------------
    if (mode === 'GET_UPLOAD_POLICY') {
      // USER-REQ-04-SQL-001 (업로드 정책 확인: 최대 장수 및 허용 확장자 조회)
      const query = `
        SELECT COM_CD, ATTR_VAL_1 AS maxCount, ATTR_VAL_2 AS allowedExt
        FROM TB_COM_CODE
        WHERE GRP_CD = 'FILE_UPLOAD_POLICY' AND COM_CD = 'MAX_REQ_PHOTO_CNT' AND USE_YN = 'Y';
      `;

      let maxCount = 5;
      let allowedExt = ['jpg', 'jpeg', 'png', 'webp', 'heic'];

      try {
        const rows = await executeQuery<RowDataPacket[]>(query, []);
        if (rows && rows.length > 0) {
          maxCount = parseInt(rows[0].maxCount, 10) || 5;
          if (rows[0].allowedExt) {
            allowedExt = rows[0].allowedExt.split(',').map((s: string) => s.trim().toLowerCase());
          }
        }
      } catch (dbErr) {
        console.warn('⚠️ [USER-REQ-04] Policy query fallback:', (dbErr as Error).message);
      }

      return {
        status: 200,
        body: {
          success: true,
          policy: {
            maxCount,
            allowedExt,
            maxFileSizeMb: 10,
          },
        },
      };
    }

    // -------------------------------------------------------------------------
    // 모드 2: 사진 업로드 (UPLOAD_PHOTO)
    // -------------------------------------------------------------------------
    if (mode === 'UPLOAD_PHOTO') {
      if (!fileName || !fileBase64) {
        return {
          status: 400,
          body: {
            success: false,
            message: '업로드할 파일명과 이미지 데이터(fileBase64)가 필요합니다.',
          },
        };
      }

      // 1) 확장자 검사
      const ext = path.extname(fileName).replace('.', '').toLowerCase();
      const validExts = ['jpg', 'jpeg', 'png', 'webp', 'heic'];
      if (!validExts.includes(ext)) {
        return {
          status: 400,
          body: {
            success: false,
            message: `지원하지 않는 파일 형식입니다. (지원 형식: ${validExts.join(', ')})`,
          },
        };
      }

      // 2) 용량 검사 (10MB 제한: 10 * 1024 * 1024 bytes)
      const MAX_SIZE = 10 * 1024 * 1024;
      if (fileSize > MAX_SIZE) {
        return {
          status: 400,
          body: {
            success: false,
            message: '파일 용량은 1장당 최대 10MB를 초과할 수 없습니다.',
          },
        };
      }

      // 3) 파일 저장 처리 (public/uploads/req_photos/ 디렉토리)
      let savedUrl = fileBase64;
      const cleanBase64 = fileBase64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');

      try {
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'req_photos');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const timestamp = Date.now();
        const safeName = `${timestamp}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
        const targetPath = path.join(uploadDir, safeName);
        fs.writeFileSync(targetPath, buffer);

        savedUrl = `/uploads/req_photos/${safeName}`;
      } catch (fsErr) {
        console.warn('⚠️ [USER-REQ-04] File save warning (fallback to data URL):', (fsErr as Error).message);
        // Base64 자체를 URL로 유지
        savedUrl = fileBase64;
      }

      // 4) DB 메타데이터 등록
      // USER-REQ-04-SQL-002 (단일 사진 업로드 메타데이터 임시 등록)
      let photoSeq: number | undefined;
      try {
        const insertQuery = `
          INSERT INTO TB_CLEAN_REQ_PHOTO (
            REQ_NO, PHOTO_URL, FILE_NAME, FILE_SIZE, SORT_ORD, REG_DT, REG_ID
          ) VALUES (
            'TEMP', ?, ?, ?, ?, NOW(), ?
          );
        `;
        const result = await executeQuery<ResultSetHeader>(insertQuery, [
          savedUrl.length > 500 ? savedUrl.substring(0, 497) + '...' : savedUrl,
          fileName,
          fileSize || buffer.length,
          sortOrd,
          userNo,
        ]);
        photoSeq = result.insertId;
      } catch (sqlErr) {
        console.warn('⚠️ [USER-REQ-04] DB insert warning:', (sqlErr as Error).message);
      }

      return {
        status: 200,
        body: {
          success: true,
          message: '사진이 성공적으로 업로드되었습니다.',
          photo: {
            photoSeq,
            photoUrl: savedUrl,
            fileName,
            fileSize: fileSize || buffer.length,
            sortOrd,
          },
        },
      };
    }

    // -------------------------------------------------------------------------
    // 모드 3: 임시 사진 삭제 (DELETE_PHOTO)
    // -------------------------------------------------------------------------
    if (mode === 'DELETE_PHOTO') {
      if (!photoUrl) {
        return {
          status: 400,
          body: {
            success: false,
            message: '삭제할 대상 사진의 photoUrl이 필요합니다.',
          },
        };
      }

      // 1) 로컬 파일 삭제 (있는 경우)
      if (photoUrl.startsWith('/uploads/req_photos/')) {
        try {
          const filePath = path.join(process.cwd(), 'public', photoUrl);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (delErr) {
          console.warn('⚠️ [USER-REQ-04] Local file unlink warning:', (delErr as Error).message);
        }
      }

      // 2) DB 임시 레코드 삭제
      // USER-REQ-04-SQL-003
      try {
        const deleteQuery = `
          DELETE FROM TB_CLEAN_REQ_PHOTO
          WHERE (PHOTO_URL = ? OR PHOTO_URL LIKE ?) AND REQ_NO = 'TEMP';
        `;
        await executeQuery<ResultSetHeader>(deleteQuery, [photoUrl, `${photoUrl.substring(0, 50)}%`]);
      } catch (dbDelErr) {
        console.warn('⚠️ [USER-REQ-04] DB delete warning:', (dbDelErr as Error).message);
      }

      return {
        status: 200,
        body: {
          success: true,
          message: '사진이 정상적으로 삭제되었습니다.',
        },
      };
    }

    // 지원되지 않는 모드
    return {
      status: 400,
      body: {
        success: false,
        message: `알 수 없는 mode 요청입니다: ${mode}`,
      },
    };
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ [USER-REQ-04] Internal Route Error:', error.message);
    return {
      status: 500,
      body: {
        success: false,
        message: error.message || '서버 내부 처리 중 오류가 발생했습니다.',
      },
    };
  }
}

// =============================================================================
// 3. Next.js App Router POST 핸들러
// =============================================================================

export async function POST(req: Request) {
  try {
    const body: UserReq04ReqBody = await req.json();
    const result = await processUserReq04(body);
    return Response.json(result.body, { status: result.status });
  } catch (err: unknown) {
    const error = err as Error;
    return Response.json(
      { success: false, message: error.message || '요청 본문 처리 오류' },
      { status: 500 }
    );
  }
}
