import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { processUserCom00, validateUserNo } from '../SsulDak_Web/User/backend/api_USER_COM_00/route.ts';
import { processUserAth00 } from '../SsulDak_Web/User/backend/api_USER_ATH_00/route.ts';
import { processUserAth01 } from '../SsulDak_Web/User/backend/api_USER_ATH_01/route.ts';
import { processUserAth02 } from '../SsulDak_Web/User/backend/api_USER_ATH_02/route.ts';
import { processUserAth03 } from '../SsulDak_Web/User/backend/api_USER_ATH_03/route.ts';
import { processUserReq00 } from '../SsulDak_Web/User/backend/api_USER_REQ_00/route.ts';
import { processUserReq01 } from '../SsulDak_Web/User/backend/api_USER_REQ_01/route.ts';
import { processUserReq02 } from '../SsulDak_Web/User/backend/api_USER_REQ_02/route.ts';
import { processUserReq03 } from '../SsulDak_Web/User/backend/api_USER_REQ_03/route.ts';
import { processUserReq04 } from '../SsulDak_Web/User/backend/api_USER_REQ_04/route.ts';
import { processUserQot00 } from '../SsulDak_Web/User/backend/api_USER_QOT_00/route.ts';
import { processUserQot01 } from '../SsulDak_Web/User/backend/api_USER_QOT_01/route.ts';
import { processUserQot02 } from '../SsulDak_Web/User/backend/api_USER_QOT_02/route.ts';
import { processUserCnt00 } from '../SsulDak_Web/User/backend/api_USER_CNT_00/route.ts';
import { processUserCnt01 } from '../SsulDak_Web/User/backend/api_USER_CNT_01/route.ts';
import { processUserCnt02 } from '../SsulDak_Web/User/backend/api_USER_CNT_02/route.ts';
import { processUserHis00 } from '../SsulDak_Web/User/backend/api_USER_HIS_00/route.ts';
import { processUserHis01 } from '../SsulDak_Web/User/backend/api_USER_HIS_01/route.ts';
import { processUserHis02 } from '../SsulDak_Web/User/backend/api_USER_HIS_02/route.ts';
import { processUserMyp00 } from '../SsulDak_Web/User/backend/api_USER_MYP_00/route.ts';
import { processUserMyp01 } from '../SsulDak_Web/User/backend/api_USER_MYP_01/route.ts';
import { processUserMyp02 } from '../SsulDak_Web/User/backend/api_USER_MYP_02/route.ts';
import { processPtnrAth00 } from '../SsulDak_Web/Partner/backend/api_PTNR_ATH_00/route.ts';
import { processPtnrAth01 } from '../SsulDak_Web/Partner/backend/api_PTNR_ATH_01/route.ts';
import { processPtnrDsh00 } from '../SsulDak_Web/Partner/backend/api_PTNR_DSH_00/route.ts';
import { processPtnrDsh01 } from '../SsulDak_Web/Partner/backend/api_PTNR_DSH_01/route.ts';
import { processPtnrDsh02 } from '../SsulDak_Web/Partner/backend/api_PTNR_DSH_02/route.ts';
import { processPtnrQot00 } from '../SsulDak_Web/Partner/backend/api_PTNR_QOT_00/route.ts';
import { processPtnrQot01 } from '../SsulDak_Web/Partner/backend/api_PTNR_QOT_01/route.ts';
import { processPtnrQot02 } from '../SsulDak_Web/Partner/backend/api_PTNR_QOT_02/route.ts';
import { processPtnrJob00 } from '../SsulDak_Web/Partner/backend/api_PTNR_JOB_00/route.ts';
import { processPtnrJob01 } from '../SsulDak_Web/Partner/backend/api_PTNR_JOB_01/route.ts';
import { processPtnrJob02 } from '../SsulDak_Web/Partner/backend/api_PTNR_JOB_02/route.ts';
import { processPtnrSet00 } from '../SsulDak_Web/Partner/backend/api_PTNR_SET_00/route.ts';
import { processPtnrSet01 } from '../SsulDak_Web/Partner/backend/api_PTNR_SET_01/route.ts';
import { processAdmnAth00 } from '../SsulDak_Web/Admin/backend/api_ADMN_ATH_00/route.ts';
import { processAdmnDsh00 } from '../SsulDak_Web/Admin/backend/api_ADMN_DSH_00/route.ts';
import { processAdmnPrm00 } from '../SsulDak_Web/Admin/backend/api_ADMN_PRM_00/route.ts';
import { processAdmnPrm01 } from '../SsulDak_Web/Admin/backend/api_ADMN_PRM_01/route.ts';
import { processAdmnSys01 } from '../SsulDak_Web/Admin/backend/api_ADMN_SYS_01/route.ts';
import { processAdmnSys02 } from '../SsulDak_Web/Admin/backend/api_ADMN_SYS_02/route.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

// API 엔드포인트: POST /api/user/user_com_00 (메인 홈)
app.post('/api/user/user_com_00', async (req, res) => {
  try {
    const { userNo, reqType } = req.body || {};

    // 12자리 회원 식별자 유효성 사전 검사
    if (userNo !== null && userNo !== undefined && userNo !== '') {
      const val = validateUserNo(userNo);
      if (!val.isValid) {
        return res.status(400).json({
          success: false,
          message: val.message,
        });
      }
    }

    const result = await processUserCom00({ userNo, reqType: reqType || 'INIT' });
    return res.status(200).json(result);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ API Error (USER-COM-00):', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || '서버 내부 오류가 발생했습니다.',
    });
  }
});

// API 엔드포인트: POST /api/user/user_ath_00 (로그인 및 인증)
app.post('/api/user/user_ath_00', async (req, res) => {
  try {
    const { status, data } = await processUserAth00(req.body || {});
    return res.status(status).json(data);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ API Error (USER-ATH-00):', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || '서버 내부 오류가 발생했습니다.',
    });
  }
});

// API 엔드포인트: POST /api/user/user_ath_01 (회원가입 및 서명등록)
app.post('/api/user/user_ath_01', async (req, res) => {
  try {
    const { status, data } = await processUserAth01(req.body || {});
    return res.status(status).json(data);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ API Error (USER-ATH-01):', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || '서버 내부 오류가 발생했습니다.',
    });
  }
});

// API 엔드포인트: POST /api/user/user_ath_02 (계정 찾기 및 비밀번호 재설정)
app.post('/api/user/user_ath_02', async (req, res) => {
  try {
    const { status, data } = await processUserAth02(req.body || {});
    return res.status(status).json(data);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ API Error (USER-ATH-02):', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || '서버 내부 오류가 발생했습니다.',
    });
  }
});

// API 엔드포인트: POST /api/user/user_ath_03 (마이페이지 프로필/서명 관리)
app.post('/api/user/user_ath_03', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || null;
    const { status, body } = await processUserAth03(req.body || {}, authHeader);
    return res.status(status).json(body);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ API Error (USER-ATH-03):', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || '서버 내부 오류가 발생했습니다.',
    });
  }
});

// API 엔드포인트: POST /api/user/user_req_00 (통합 청소 서비스 신청)
app.post('/api/user/user_req_00', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || null;
    const { status, body } = await processUserReq00(req.body || {}, authHeader);
    return res.status(status).json(body);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ API Error (USER-REQ-00):', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || '서버 내부 오류가 발생했습니다.',
    });
  }
});

// API 엔드포인트: POST /api/user/user_req_01 (정기청소 중분류 추가 모달)
app.post('/api/user/user_req_01', async (req, res) => {
  try {
    const { status, body } = await processUserReq01(req.body || {});
    return res.status(status).json(body);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ API Error (USER-REQ-01):', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || '서버 내부 오류가 발생했습니다.',
    });
  }
});

// API 엔드포인트: POST /api/user/user_req_02 (계절가전 중분류 추가 모달)
app.post('/api/user/user_req_02', async (req, res) => {
  try {
    const { status, body } = await processUserReq02(req.body || {});
    return res.status(status).json(body);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ API Error (USER-REQ-02):', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || '서버 내부 오류가 발생했습니다.',
    });
  }
});

// API 엔드포인트: POST /api/user/user_req_03 (주소 검색 팝업)
app.post('/api/user/user_req_03', async (req, res) => {
  try {
    const { status, body } = await processUserReq03(req.body || {});
    return res.status(status).json(body);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ API Error (USER-REQ-03):', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || '서버 내부 오류가 발생했습니다.',
    });
  }
});

// API 엔드포인트: POST /api/user/user_req_04 (현장 사진 첨부 모달)
app.post('/api/user/user_req_04', async (req, res) => {
  try {
    const { status, body } = await processUserReq04(req.body || {});
    return res.status(status).json(body);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ API Error (USER-REQ-04):', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || '서버 내부 오류가 발생했습니다.',
    });
  }
});

// API 엔드포인트: POST /api/user/user_qot_00 (수신 청약 목록 및 진행 현황)
app.post('/api/user/user_qot_00', async (req, res) => {
  try {
    const { status, body } = await processUserQot00(req.body || {});
    return res.status(status).json(body);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ API Error (USER-QOT-00):', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || '서버 내부 오류가 발생했습니다.',
    });
  }
});

// API 엔드포인트: POST /api/user/user_qot_01 (파트너 프로필 및 청약 상세)
app.post('/api/user/user_qot_01', async (req, res) => {
  try {
    const { status, body } = await processUserQot01(req.body || {});
    return res.status(status).json(body);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ API Error (USER-QOT-01):', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || '서버 내부 오류가 발생했습니다.',
    });
  }
});

// API 엔드포인트: POST /api/user/user_qot_02 (파트너 1:1 상담 채팅)
app.post('/api/user/user_qot_02', async (req, res) => {
  try {
    const { status, body } = await processUserQot02(req.body || {});
    return res.status(status).json(body);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ API Error (USER-QOT-02):', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || '서버 내부 오류가 발생했습니다.',
    });
  }
});

// API 엔드포인트: POST /api/user/user_cnt_00 (계약 확정 및 데이터 이용료 결제)
app.post('/api/user/user_cnt_00', async (req, res) => {
  try {
    const { status, body } = await processUserCnt00(req.body || {});
    return res.status(status).json(body);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ API Error (USER-CNT-00):', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || '서버 내부 오류가 발생했습니다.',
    });
  }
});

// API 엔드포인트: POST /api/user/user_cnt_01 (결제 완료 및 파트너 대기)
app.post('/api/user/user_cnt_01', async (req, res) => {
  try {
    const { status, body } = await processUserCnt01(req.body || {});
    return res.status(status).json(body);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ API Error (USER-CNT-01):', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || '서버 내부 오류가 발생했습니다.',
    });
  }
});

// API 엔드포인트: POST /api/user/user_cnt_02 (결제 실패/취소 및 자산 복원)
app.post('/api/user/user_cnt_02', async (req, res) => {
  try {
    const { status, body } = await processUserCnt02(req.body || {});
    return res.status(status).json(body);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ API Error (USER-CNT-02):', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || '서버 내부 오류가 발생했습니다.',
    });
  }
});

// API 엔드포인트: POST /api/user/user_his_00 (청소 이용 내역)
app.post('/api/user/user_his_00', async (req, res) => {
  try {
    const result = await processUserHis00(req.body || {});
    const status = result.success ? 200 : 500;
    return res.status(status).json(result);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ API Error (USER-HIS-00):', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || '서버 내부 오류가 발생했습니다.',
    });
  }
});

// API 엔드포인트: POST /api/user/user_his_01 (청소 진행 상세 및 검수 리포트)
app.post('/api/user/user_his_01', async (req, res) => {
  try {
    const result = await processUserHis01(req.body || {});
    const status = result.success ? 200 : 400;
    return res.status(status).json(result);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ API Error (USER-HIS-01):', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || '서버 내부 오류가 발생했습니다.',
    });
  }
});

// API 엔드포인트: POST /api/user/user_his_02 (서비스 리뷰 작성 및 리워드 적립)
app.post('/api/user/user_his_02', async (req, res) => {
  try {
    const result = await processUserHis02(req.body || {});
    const status = result.success ? (req.body?.mode === 'SUBMIT_REVIEW' ? 201 : 200) : 400;
    return res.status(status).json(result);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ API Error (USER-HIS-02):', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || '서버 내부 오류가 발생했습니다.',
    });
  }
});

// API 엔드포인트: POST /api/user/user_myp_00 (이용자 마이페이지 대시보드)
app.post('/api/user/user_myp_00', async (req, res) => {
  try {
    const result = await processUserMyp00(req.body || {});
    const status = result.success ? 200 : 400;
    return res.status(status).json(result);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ API Error (USER-MYP-00):', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || '서버 내부 오류가 발생했습니다.',
    });
  }
});

// API 엔드포인트: POST /api/user/user_myp_01 (회원 정보 수정)
app.post('/api/user/user_myp_01', async (req, res) => {
  try {
    const result = await processUserMyp01(req.body || {});
    const status = result.success ? 200 : 400;
    return res.status(status).json(result);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ API Error (USER-MYP-01):', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || '서버 내부 오류가 발생했습니다.',
    });
  }
});

// API 엔드포인트: POST /api/user/user_myp_02 (내 쿠폰 및 혜택 관리)
app.post('/api/user/user_myp_02', async (req, res) => {
  try {
    const { status, data } = await processUserMyp02(req.body || {});
    return res.status(status).json(data);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ API Error (USER-MYP-02):', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || '서버 내부 오류가 발생했습니다.',
    });
  }
});

// API 엔드포인트: POST /api/partner/ptnr_ath_00 (파트너 로그인)
app.post('/api/partner/ptnr_ath_00', async (req, res) => {
  try {
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || 'Preview Express';
    const { status, data } = await processPtnrAth00(req.body || {}, clientIp, userAgent);
    return res.status(status).json(data);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ API Error (PTNR-ATH-00):', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || '서버 내부 오류가 발생했습니다.',
    });
  }
});

// API 엔드포인트: POST /api/partner/ptnr_ath_01 (파트너 입점 신청 및 웰컴쿠폰)
app.post('/api/partner/ptnr_ath_01', async (req, res) => {
  try {
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || 'Preview Express';
    const { status, data } = await processPtnrAth01(req.body || {}, clientIp, userAgent);
    return res.status(status).json(data);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ API Error (PTNR-ATH-01):', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || '서버 내부 오류가 발생했습니다.',
    });
  }
});

// API 엔드포인트: POST /api/partner/ptnr_dsh_00 (파트너 메인 대시보드)
app.post('/api/partner/ptnr_dsh_00', async (req, res) => {
  try {
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || 'Preview Express';
    const { status, data } = await processPtnrDsh00(req.body || {}, clientIp, userAgent);
    return res.status(status).json(data);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ API Error (PTNR-DSH-00):', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || '서버 내부 오류가 발생했습니다.',
    });
  }
});

// API 엔드포인트: POST /api/partner/ptnr_dsh_01 (서비스 가능 지역 및 분야 설정)
app.post('/api/partner/ptnr_dsh_01', async (req, res) => {
  try {
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || 'Preview Express';
    const { status, data } = await processPtnrDsh01(req.body || {}, clientIp, userAgent);
    return res.status(status).json(data);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ API Error (PTNR-DSH-01):', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || '서버 내부 오류가 발생했습니다.',
    });
  }
});

// API 엔드포인트: POST /api/partner/ptnr_dsh_02 (파트너 프로필 및 포트폴리오 관리)
app.post('/api/partner/ptnr_dsh_02', async (req, res) => {
  try {
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || 'Preview Express';
    const { status, data } = await processPtnrDsh02(req.body || {}, clientIp, userAgent);
    return res.status(status).json(data);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ API Error (PTNR-DSH-02):', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || '서버 내부 오류가 발생했습니다.',
    });
  }
});

// API 엔드포인트: POST /api/partner/ptnr_qot_00 (매칭 청약 공고 목록)
app.post('/api/partner/ptnr_qot_00', async (req, res) => {
  try {
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || 'Preview Express';
    const { status, data } = await processPtnrQot00(req.body || {}, clientIp, userAgent);
    return res.status(status).json(data);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ API Error (PTNR-QOT-00):', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || '서버 내부 오류가 발생했습니다.',
    });
  }
});

// API 엔드포인트: POST /api/partner/ptnr_qot_01 (고객 요청서 상세 보기)
app.post('/api/partner/ptnr_qot_01', async (req, res) => {
  try {
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || 'Preview Express';
    const { status, data } = await processPtnrQot01(req.body || {}, clientIp, userAgent);
    return res.status(status).json(data);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ API Error (PTNR-QOT-01):', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || '서버 내부 오류가 발생했습니다.',
    });
  }
});

// API 엔드포인트: POST /api/partner/ptnr_qot_02 (조건 수락 및 청약서 제출)
app.post('/api/partner/ptnr_qot_02', async (req, res) => {
  try {
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || 'Preview Express';
    const { status, data } = await processPtnrQot02(req.body || {}, clientIp, userAgent);
    return res.status(status).json(data);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ API Error (PTNR-QOT-02):', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || '서버 내부 오류가 발생했습니다.',
    });
  }
});

// API 엔드포인트: POST /api/partner/ptnr_job_00 (예약 및 작업 관리 - 개정 과금)
app.post('/api/partner/ptnr_job_00', async (req, res) => {
  try {
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || 'Preview Express';
    const { status, data } = await processPtnrJob00(req.body || {}, clientIp, userAgent);
    return res.status(status).json(data);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ API Error (PTNR-JOB-00):', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || '서버 내부 오류가 발생했습니다.',
    });
  }
});

// API 엔드포인트: POST /api/partner/ptnr_job_01 (작업 상태 업데이트 모달)
app.post('/api/partner/ptnr_job_01', async (req, res) => {
  try {
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || 'Preview Express';
    const { status, data } = await processPtnrJob01(req.body || {}, clientIp, userAgent);
    return res.status(status).json(data);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ API Error (PTNR-JOB-01):', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || '서버 내부 오류가 발생했습니다.',
    });
  }
});

// API 엔드포인트: POST /api/partner/ptnr_job_02 (고객 1:1 상담 채팅)
app.post('/api/partner/ptnr_job_02', async (req, res) => {
  try {
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || 'Preview Express';
    const { status, data } = await processPtnrJob02(req.body || {}, clientIp, userAgent);
    return res.status(status).json(data);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ API Error (PTNR-JOB-02):', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || '서버 내부 오류가 발생했습니다.',
    });
  }
});

// API 엔드포인트: POST /api/partner/ptnr_set_00 (정산 및 매출 내역)
app.post('/api/partner/ptnr_set_00', async (req, res) => {
  try {
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || 'Preview Express';
    const { status, data } = await processPtnrSet00(req.body || {}, clientIp, userAgent);
    return res.status(status).json(data);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ API Error (PTNR-SET-00):', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || '서버 내부 오류가 발생했습니다.',
    });
  }
});

// API 엔드포인트: POST /api/partner/ptnr_set_01 (데이터 이용료 영수증 / 전자세금계산서)
app.post('/api/partner/ptnr_set_01', async (req, res) => {
  try {
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || 'Preview Express';
    const { status, data } = await processPtnrSet01(req.body || {}, clientIp, userAgent);
    return res.status(status).json(data);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ API Error (PTNR-SET-01):', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || '서버 내부 오류가 발생했습니다.',
    });
  }
});

// API 엔드포인트: POST /api/admin/admn_ath_00 (관리자 콘솔 2차 복합 인증 로그인)
app.post('/api/admin/admn_ath_00', async (req, res) => {
  try {
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '121.134.89.21';
    const userAgent = (req.headers['user-agent'] as string) || 'Preview Express Admin Console';
    const { status, data } = await processAdmnAth00(req.body || {}, clientIp, userAgent);
    return res.status(status).json(data);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ API Error (ADMN-ATH-00):', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || '서버 내부 오류가 발생했습니다.',
    });
  }
});

// API 엔드포인트: POST /api/admin/admn_dsh_00 (어드민 메인 대시보드 종합 지표)
app.post('/api/admin/admn_dsh_00', async (req, res) => {
  try {
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '121.134.89.21';
    const userAgent = (req.headers['user-agent'] as string) || 'Preview Express Admin Console';
    const { status, data } = await processAdmnDsh00(req.body || {}, clientIp, userAgent);
    return res.status(status).json(data);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ API Error (ADMN-DSH-00):', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || '서버 내부 오류가 발생했습니다.',
    });
  }
});

// API 엔드포인트: POST /api/admin/admn_prm_00 (프로모션 및 쿠폰 캠페인 정책 관리)
app.post('/api/admin/admn_prm_00', async (req, res) => {
  try {
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '121.134.89.21';
    const userAgent = (req.headers['user-agent'] as string) || 'Preview Express Admin Console';
    const { status, data } = await processAdmnPrm00(req.body || {}, clientIp, userAgent);
    return res.status(status).json(data);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ API Error (ADMN-PRM-00):', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || '서버 내부 오류가 발생했습니다.',
    });
  }
});

// API 엔드포인트: POST /api/admin/admn_prm_01 (쿠폰 발행 및 대상자 에어드랍 대량 발송 모달)
app.post('/api/admin/admn_prm_01', async (req, res) => {
  try {
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '121.134.89.21';
    const userAgent = (req.headers['user-agent'] as string) || 'Preview Express Admin Console';
    const { status, data } = await processAdmnPrm01(req.body || {}, clientIp, userAgent);
    return res.status(status).json(data);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ API Error (ADMN-PRM-01):', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || '서버 내부 오류가 발생했습니다.',
    });
  }
});

// API 엔드포인트: POST /api/admin/admn_sys_01 (공통 코드 체계 및 실시간 정책 관리)
app.post('/api/admin/admn_sys_01', async (req, res) => {
  try {
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '192.168.0.12';
    const userAgent = (req.headers['user-agent'] as string) || 'Preview Express Admin Console';
    const result = await processAdmnSys01(req.body || {}, clientIp, userAgent);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ API Error (ADMN-SYS-01):', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || '서버 내부 오류가 발생했습니다.',
    });
  }
});

// API 엔드포인트: POST /api/admin/admn_sys_02 (핵심 운영 정책 및 최소 하한선 Floor Price 관리)
app.post('/api/admin/admn_sys_02', async (req, res) => {
  try {
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '192.168.0.12';
    const userAgent = (req.headers['user-agent'] as string) || 'Preview Express Admin Console';
    const result = await processAdmnSys02(req.body || {}, clientIp, userAgent);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ API Error (ADMN-SYS-02):', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || '서버 내부 오류가 발생했습니다.',
    });
  }
});


// 정적 파일 제공 (개발 캐시 비활성화)
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  next();
});

app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

app.use(express.static(__dirname));

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 [SsulDak] USER-COM-00 프리뷰 서버 실행 완료: http://localhost:${PORT}`);
});
