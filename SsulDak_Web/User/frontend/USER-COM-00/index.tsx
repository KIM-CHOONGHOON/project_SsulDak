/**
 * =============================================================================
 * SsulDak (쓸고닦고) 풀스택 프론트엔드 컴포넌트
 * 화면 ID: USER-COM-00 (이용자 메인 홈/허브)
 * 화면 프론트엔드 경로: SsulDak_Web/User/frontend/USER-COM-00/index.tsx
 * 백엔드 모듈 경로    : SsulDak_Web/User/backend/api_USER_COM_00/route.ts
 * API 엔드포인트 URL  : POST /api/user/user_com_00
 * 전용 쿼리 식별자    : USER-COM-00-SQL-001, USER-COM-00-SQL-002, USER-COM-00-SQL-003
 *
 * [회원 식별자 12자리 고정 규격: CHAR(12)]
 *   - 1바이트: 역할 코드 ('U': 사용자, 'P': 파트너, 'A': 관리자)
 *   - 6바이트: 가입 년월 (YYYYMM)
 *   - 5바이트: 일련번호 (00001~, 1부터 시작하되 앞자리를 '0'으로 채운 5바이트)
 *   - 총 12바이트 필수 충족 (예: U20261000001)
 * =============================================================================
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';

// =============================================================================
// 회원 식별자 12자리 정규식 및 유효성 검증 함수
// =============================================================================

export const MEMBER_NO_TOTAL_LENGTH = 12;
export const USER_NO_REGEX = /^U(20\d{2})(0[1-9]|1[0-2])(\d{5})$/;

/**
 * 이용자 식별자(userNo) 12바이트 규격 검증
 */
export function validateUserNo(userNo: string | null | undefined): { isValid: boolean; message?: string } {
  if (userNo === null || userNo === undefined || userNo === '') {
    return { isValid: true };
  }

  const trimmed = userNo.trim();
  if (trimmed.length !== MEMBER_NO_TOTAL_LENGTH) {
    return {
      isValid: false,
      message: `회원 식별자는 반드시 12자리여야 합니다. (입력: '${trimmed}', 현재: ${trimmed.length}자리)`,
    };
  }

  if (!trimmed.startsWith('U')) {
    return {
      isValid: false,
      message: `이용자 식별자는 'U'로 시작해야 합니다. ('U': 사용자, 'P': 파트너, 'A': 관리자)`,
    };
  }

  if (!USER_NO_REGEX.test(trimmed)) {
    return {
      isValid: false,
      message: `회원 식별자 규격 오류입니다. ('U' + YYYYMM 6자리 + 순번 5자리(00001~), 예: U20261000001)`,
    };
  }

  return { isValid: true };
}

// =============================================================================
// 타입 정의
// =============================================================================

export interface MainCategoryItem {
  GRP_CD: string;
  COM_CD: string;
  COM_NM: string;
  ATTR_VAL_1: string | null;
  ATTR_VAL_2: string | null;
  SORT_ORD: number;
}

export interface UserInfoState {
  userNo: string; // 12자리 고정 규격 (CHAR(12))
  userNm: string;
  userStatCd: 'NORMAL' | 'SUSPENDED_7D' | string;
  suspendExpireDt: string | null;
  pointBalance: number;
  couponCount: number;
}

export interface SummaryCounts {
  openReqCnt: number;
  activeContractCnt: number;
}

export interface UserCom00Props {
  initialUserNo?: string | null;
  apiEndpoint?: string;
  logoUrl?: string; // 플랫폼 공식 브랜드 로고 이미지 경로 (기본값: '/logo.png')
  onNavigate?: (screenId: string, params?: Record<string, unknown>) => void;
  onLogout?: () => void;
  defaultData?: {
    categories?: MainCategoryItem[];
    banners?: MainCategoryItem[];
    userInfo?: UserInfoState | null;
    summary?: SummaryCounts | null;
  };
}

// =============================================================================
// 마스터 파트너 목데이터 (12자리 파트너 식별자 P20261000001 등 규격 준수)
// =============================================================================

interface VerifiedMaster {
  id: string; // P + YYYYMM(6) + 00001(5) = 12자리 파트너 식별자
  name: string;
  badge: string;
  badgeColor: string;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  tags: string[];
  description: string;
  recentWork: string;
}

const VERIFIED_MASTERS: VerifiedMaster[] = [
  {
    id: 'P20261000001', // 12자리 고정 규격
    name: '클린마스터 김진수 팀장',
    badge: '최우수 마스터',
    badgeColor: 'bg-[#FFDDB8] text-[#2A1700]',
    rating: 5.0,
    reviewCount: 328,
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBm37bN_TrRrJA1d3ms8ed3uZkJig_QPtkFrZoIX5F8vQmXiEYsAcJf9qFdw3JYCyBQvXl3wmlCDi58Bq1Dm9NNl23YKuJIXt1aPCNVaWdgw7Nc-7aq0uPm6E11KTEirVpu-qEqiQcGfC4ReWPa8R3PdFOmGtTiIx6XNssa6w2mU2zRIXSS2C_VKks8DET9mkrZfbM3CJTqWLuXvjfdcNNQcQd9Ub2yNXqmOq5iKQlJaB_AT2U1Yfcl',
    tags: ['전문장비 보유', '본사안심인증', '방역자격증'],
    description:
      '10년 경력의 청소 전문 지도사로서 오염원 맞춤형 전용 케미컬과 고압 스팀으로 새집처럼 가꿔드립니다.',
    recentWork: '백석동 오피스텔',
  },
  {
    id: 'P20261000002', // 12자리 고정 규격
    name: '에코케어 박미영 파트너',
    badge: '친환경 에코인증',
    badgeColor: 'bg-[#82F5C1]/40 text-[#00714E]',
    rating: 5.0,
    reviewCount: 215,
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuC-VqtD1864RR74LHW_qxjP7p-hT38s-Oas4MqQpvips2vHTb0gfIuwP1GfCe0dJW20IhrE9EmkGbG9HWUGyfmxe7ZIMSx_VfeyZUUBNChSBO9u01it3xEerLpqSJVOTKFI11ZGr3yphHhU57F1l1AWA_6JmGf_3Zg_vj-LpPKdbIP_IfsvoPOIJMU2TauacRMLRg03nLerEkLhqiI74P-Wly2G2YiUZ0_qWJzsTafgpaxKYYRa0Nx7',
    tags: ['피톤치드 분사기', '독일제 스팀기', '친환경 세제'],
    description:
      '영유아나 반려동물이 있는 가정에도 무해한 유럽 인증 친환경 세제만을 고집하여 시공합니다.',
    recentWork: '마두동 강촌마을',
  },
  {
    id: 'P20261000003', // 12자리 고정 규격
    name: '프로클린 이성호 파트너',
    badge: '가전분해 명장',
    badgeColor: 'bg-[#DCE9FF] text-[#00254A]',
    rating: 4.9,
    reviewCount: 184,
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBQ3PAFG1WPi6v1bEuzPDKaiUffuBFUpODRDDmYYV0IRmkoxyQqHbIW1TBBUvLWZmPLVc48fF9RDUWmHEizEwEyLOCIEVeIAt824zPSmNQdUDTkUiCxf2NHggHBQSReBAe-mi5IuheNbJTyJAB1y0gresRMwzBkMEtlWaI-DMSDmg71qoLhoVocWWbl51Jg5l9oMHCWmvRUSWPKiv9IRpC7vGmYlvLZFsY2XT0PM_qja5e2N6ME29zV',
    tags: ['고압세척기', '100% 분해인증', '냉각핀 전용세척'],
    description:
      '시스템/스탠드/벽걸이 전 기종 완벽 분해 세척. 모터와 송풍팬 틈새 오염까지 싹 씻어냅니다.',
    recentWork: '주엽동 문촌마을',
  },
];

// =============================================================================
// 실시간 매칭 티커 아이템
// =============================================================================

const TICKER_ITEMS = [
  { tag: '입주청소', text: '방금 일산동구 마두동 84㎡ 입주청소 매칭 완료!' },
  { tag: '정기청소', text: '파주 운정 빌라 계단 정기청소 견적 3건 도착' },
  { tag: '계절가전', text: '일산서구 주엽동 시스템에어컨 4대 완전분해 세척 매칭!' },
  { tag: '정기청소', text: '고양시 덕양구 화정동 5층 상가건물 3개월 정기계약 체결' },
];

export const UserCom00Screen: React.FC<UserCom00Props> = ({
  initialUserNo = 'U20261000001', // 12자리 고정 규격: U + 202610 + 00001
  apiEndpoint = '/api/user/user_com_00',
  logoUrl = '/logo.png', // 플랫폼 공식 브랜드 로고 (쓸고딱고 로고.png)
  onNavigate,
  onLogout,
  defaultData,
}) => {
  // 상태 관리
  const [currentUserNo, setCurrentUserNo] = useState<string | null>(initialUserNo);
  const [categories, setCategories] = useState<MainCategoryItem[]>(defaultData?.categories || []);
  const [userInfo, setUserInfo] = useState<UserInfoState | null>(defaultData?.userInfo || null);
  const [summary, setSummary] = useState<SummaryCounts | null>(defaultData?.summary || null);
  const [loading, setLoading] = useState<boolean>(!defaultData);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string>('경기 고양시 일산동구');
  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);
  const [tickerIndex, setTickerIndex] = useState<number>(0);

  // 티커 롤링 인터벌
  useEffect(() => {
    const timer = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % TICKER_ITEMS.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  // 토스트 메시지 헬퍼
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }, []);

  // API 데이터 로딩 (POST /api/user/user_com_00)
  const fetchData = useCallback(
    async (userNo: string | null) => {
      // 12바이트 회원 식별자 유효성 사전 검사
      if (userNo) {
        const val = validateUserNo(userNo);
        if (!val.isValid) {
          showToast(`⚠️ [회원 식별자 오류] ${val.message}`);
          return;
        }
      }

      try {
        setLoading(true);
        const res = await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userNo: userNo,
            reqType: 'INIT',
          }),
        });

        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.message || `HTTP 오류 ${res.status}`);
        }

        if (json.data) {
          setCategories(json.data.categories || []);
          setUserInfo(json.data.userInfo || null);
          setSummary(json.data.summary || null);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : '네트워크 오류';
        console.warn('USER-COM-00 API 통신 알림:', message);

        // 오프라인/테스트 환경 Fallback 데이터 세팅 (12자리 고정 규격 준수)
        if (userNo === 'U20261000001' && !userInfo) {
          setUserInfo({
            userNo: 'U20261000001',
            userNm: '홍길동',
            userStatCd: 'NORMAL',
            suspendExpireDt: null,
            pointBalance: 1000,
            couponCount: 2,
          });
          setSummary({ openReqCnt: 0, activeContractCnt: 0 });
        }
      } finally {
        setLoading(false);
      }
    },
    [apiEndpoint, userInfo, showToast]
  );

  useEffect(() => {
    fetchData(currentUserNo);
  }, [currentUserNo, fetchData]);

  // 라우팅 핸들러
  const handleNav = (screenId: string, params?: Record<string, unknown>) => {
    if (onNavigate) {
      onNavigate(screenId, params);
      return;
    }
    
    // onNavigate가 없을 경우 브라우저 해시 네비게이션 폴백
    if (typeof window !== 'undefined') {
      if (screenId === 'USER-ATH-00' || screenId === 'login') {
        window.location.hash = '#login';
        return;
      }
      if (screenId === 'USER-COM-00' || screenId === 'service-overview') {
        window.location.hash = '#home';
        return;
      }
    }

    console.log(`[라우팅 요청] -> 화면 ID: ${screenId}`, params);
    showToast(`${screenId} 화면으로 이동합니다.`);
  };

  // 쿠폰 받기 클릭
  const handleClaimCoupon = () => {
    if (!currentUserNo) {
      showToast('로그인이 필요한 서비스입니다. 먼저 로그인해 주세요.');
      handleNav('USER-ATH-00');
      return;
    }
    showToast('웰컴 5,000원 할인 쿠폰팩이 마이페이지 쿠폰함에 발급되었습니다!');
    if (userInfo) {
      setUserInfo((prev) => (prev ? { ...prev, couponCount: prev.couponCount + 1 } : prev));
    }
  };

  // 로그인/로그아웃 토글 (개발 및 확인용: 12자리 U20261000001 규격 사용)
  const toggleAuthMode = () => {
    if (currentUserNo) {
      setCurrentUserNo(null);
      setUserInfo(null);
      setSummary(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('ssuldak_token');
        localStorage.removeItem('ssuldak_user');
      }
      if (onLogout) {
        onLogout();
      }
      showToast('로그아웃 되었습니다. (게스트 모드 전환)');
    } else {
      setCurrentUserNo('U20261000001'); // 정확히 12바이트: U + 202610 + 00001
      showToast('홍길동 회원님(U20261000001)으로 로그인되었습니다.');
    }
  };

  // 잘못된 회원 식별자(12자리 미충족) 테스트 토글
  const testInvalidUserNo = () => {
    const invalidId = 'U202610_ERR'; // 11자리 오류
    setCurrentUserNo(invalidId);
    showToast(`비정상 식별자('${invalidId}') 검증을 시작합니다.`);
  };

  // 제재 회원 상태 시뮬레이션 토글
  const toggleSuspendedMode = () => {
    if (userInfo) {
      const nextStat = userInfo.userStatCd === 'SUSPENDED_7D' ? 'NORMAL' : 'SUSPENDED_7D';
      const expireDt = nextStat === 'SUSPENDED_7D' ? '2026-10-29 23:59:59' : null;
      setUserInfo({
        ...userInfo,
        userStatCd: nextStat,
        suspendExpireDt: expireDt,
      });
      showToast(
        nextStat === 'SUSPENDED_7D'
          ? '※ 선 취소 7일 제재 상태로 변경되었습니다.'
          : '정상 회원 상태로 복구되었습니다.'
      );
    }
  };

  return (
    <div className="bg-[#f8f9ff] font-['Plus_Jakarta_Sans','Noto_Sans_KR',sans-serif] text-[#0b1c30] antialiased min-h-screen flex flex-col selection:bg-[#82f5c1] selection:text-[#00254a]">
      {/* =========================================================================
          1. 상단 GNB / 헤더 영역 (Fixed Glassmorphism Header)
          ========================================================================= */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#f8f9ff]/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(22,59,102,0.06)] border-b border-[#e2e8f0]/60">
        <div className="h-16 max-w-7xl mx-auto px-4 md:px-8 lg:px-12 flex items-center justify-between gap-4">
          {/* 좌측 로고 및 지역 선택 칩 */}
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => handleNav('USER-COM-00')}
              className="flex items-center gap-2.5 group text-left cursor-pointer"
              type="button"
              title="쓸고딱고 홈으로 이동"
            >
              {/* 공식 원형 심볼 로고 (쓸고딱고 로고.png) */}
              <div className="w-10 h-10 rounded-full overflow-hidden shadow-sm border border-[#0d9488]/30 group-hover:scale-105 transition-transform bg-[#105663] shrink-0 flex items-center justify-center">
                <img
                  src={logoUrl}
                  alt="쓸고딱고 공식 로고"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-[19px] tracking-tight text-[#00254a] leading-tight">
                  쓸고딱고
                </span>
                <span className="text-[10px] font-bold tracking-widest text-[#006c4a] uppercase">
                  BUILDING CLEANING STANDARD
                </span>
              </div>
            </button>

            {/* 지역 선택 칩 */}
            <button
              type="button"
              onClick={() => setIsLocationModalOpen(!isLocationModalOpen)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#eff4ff] text-[#00254a] hover:bg-[#e5eeff] transition-all cursor-pointer text-xs font-semibold shadow-sm border border-[#d3e4fe]/50"
            >
              <span className="material-symbols-outlined text-[17px] text-[#006c4a]">location_on</span>
              <span className="font-bold">{locationName}</span>
              <span className="material-symbols-outlined text-[15px] text-[#737780]">keyboard_arrow_down</span>
            </button>
          </div>

          {/* 데스크톱 메인 네비게이션 */}
          <nav className="hidden md:flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleNav('USER-COM-00')}
              className="bg-[#163b66] text-white font-bold rounded-lg px-3.5 py-1.5 text-sm transition-all shadow-sm cursor-pointer"
            >
              홈
            </button>
            <button
              type="button"
              onClick={() => handleNav('USER-QOT-00')}
              className="text-[#43474f] hover:text-[#00254a] font-semibold rounded-lg px-3 py-1.5 text-sm hover:bg-[#eff4ff] transition-colors cursor-pointer"
            >
              견적현황
            </button>
            <button
              type="button"
              onClick={() => handleNav('USER-HIS-00')}
              className="text-[#43474f] hover:text-[#00254a] font-semibold rounded-lg px-3 py-1.5 text-sm hover:bg-[#eff4ff] transition-colors cursor-pointer"
            >
              이용내역
            </button>
            <button
              type="button"
              onClick={() => handleNav('USER-MYP-02')}
              className="text-[#43474f] hover:text-[#00254a] font-semibold rounded-lg px-3 py-1.5 text-sm hover:bg-[#eff4ff] transition-colors cursor-pointer"
            >
              쿠폰북
            </button>
            <button
              type="button"
              onClick={() => handleNav('USER-MYP-00')}
              className="text-[#43474f] hover:text-[#00254a] font-semibold rounded-lg px-3 py-1.5 text-sm hover:bg-[#eff4ff] transition-colors cursor-pointer"
            >
              마이
            </button>
          </nav>

          {/* 우측 유저 액션 & 인증 영역 */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* 쿠폰함 아이콘 버튼 */}
            <button
              onClick={() => handleNav('USER-MYP-02')}
              className="relative p-2 rounded-full text-[#43474f] hover:bg-[#eff4ff] hover:text-[#00254a] transition-all cursor-pointer"
              title="쿠폰함"
              type="button"
            >
              <span className="material-symbols-outlined text-[22px]">confirmation_number</span>
              {userInfo && userInfo.couponCount > 0 && (
                <span className="absolute top-1 right-1 flex h-2 w-2 rounded-full bg-[#006c4a] ring-2 ring-white"></span>
              )}
            </button>

            {/* 알림 아이콘 버튼 */}
            <button
              onClick={() => showToast('새로운 알림이 2건 도착했습니다.')}
              className="relative p-2 rounded-full text-[#43474f] hover:bg-[#eff4ff] hover:text-[#00254a] transition-all cursor-pointer"
              title="알림"
              type="button"
            >
              <span className="material-symbols-outlined text-[22px]">notifications</span>
              <span className="absolute top-1 right-0.5 min-w-[15px] h-[15px] px-[2px] rounded-full bg-[#ba1a1a] text-white text-[10px] leading-tight flex items-center justify-center font-bold">
                N
              </span>
            </button>

            {/* 회원/비회원 분기 */}
            {userInfo ? (
              <div className="flex items-center gap-2 pl-1 border-l border-[#d3e4fe]">
                <div
                  onClick={() => handleNav('USER-MYP-00')}
                  className="hidden lg:flex flex-col text-right cursor-pointer"
                >
                  <span className="text-xs font-bold text-[#00254a]">
                    {userInfo.userNm}님 환영합니다!
                  </span>
                  <span className="text-[11px] text-[#006c4a] font-mono font-bold">
                    {userInfo.userNo}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleNav('USER-MYP-00')}
                  className="w-9 h-9 rounded-full bg-[#00254a] text-white flex items-center justify-center hover:bg-[#163b66] transition-all shadow-sm cursor-pointer"
                  title="내 정보"
                >
                  <span className="material-symbols-outlined text-[19px]">person</span>
                </button>
                <button
                  type="button"
                  onClick={toggleAuthMode}
                  className="hidden sm:inline-flex text-xs text-[#737780] hover:text-[#ba1a1a] px-2 py-1 rounded hover:bg-[#ffdad6]/40 transition-colors cursor-pointer"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 pl-1">
                <button
                  type="button"
                  id="gnbLoginBtn"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      window.location.hash = '#login';
                    }
                    handleNav('USER-ATH-00');
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-[#00254a] hover:bg-[#eff4ff] rounded-lg transition-colors cursor-pointer"
                >
                  로그인
                </button>
                <button
                  type="button"
                  id="gnbSignupBtn"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      window.location.hash = '#login';
                    }
                    handleNav('USER-ATH-01');
                  }}
                  className="px-3 py-1.5 text-xs font-bold bg-[#00254a] text-white hover:bg-[#163b66] rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  회원가입
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 지역 선택 퀵 드롭다운 모달 */}
        {isLocationModalOpen && (
          <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 pb-3">
            <div className="bg-white rounded-xl shadow-lg border border-[#e2e8f0] p-4 flex flex-wrap gap-2 items-center">
              <span className="text-xs font-bold text-[#737780] mr-2">서비스 가능 지역:</span>
              {[
                '경기 고양시 일산동구',
                '경기 고양시 일산서구',
                '경기 고양시 덕양구',
                '경기 파주시 운정·야당',
                '경기 김포시 한강신도시',
                '서울 마포·은평구',
              ].map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => {
                    setLocationName(loc);
                    setIsLocationModalOpen(false);
                    showToast(`지역이 '${loc}'(으)로 변경되었습니다.`);
                  }}
                  className={`text-xs px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                    locationName === loc
                      ? 'bg-[#00254a] text-white font-bold shadow-sm'
                      : 'bg-[#eff4ff] text-[#00254a] hover:bg-[#dce9ff]'
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* =========================================================================
          메인 컨텐츠 영역
          ========================================================================= */}
      <main className="w-full pt-16 flex-1 pb-24 md:pb-16">
        <div className="flex flex-col w-full">
          {/* ---------------------------------------------------------------------
              회원 상태 경고 배너 (USER_STAT_CD === 'SUSPENDED_7D' 일 경우 상단 노출)
              --------------------------------------------------------------------- */}
          {userInfo?.userStatCd === 'SUSPENDED_7D' && (
            <div className="w-full bg-[#ffdad6] border-b border-[#ba1a1a]/30 py-3 px-4 transition-all">
              <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-[#93000a]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-[#ba1a1a]">
                    warning
                  </span>
                  <span className="text-xs sm:text-sm font-bold">
                    ※ 일방 취소로 인해 {userInfo.suspendExpireDt || '7일간'}까지 신규 견적 등록이 제한된 계정입니다. (개정 약관 제8조 선 취소자 패널티)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleNav('USER-COM-01')}
                  className="text-xs underline font-bold shrink-0 hover:text-black cursor-pointer"
                >
                  약관 규정 확인
                </button>
              </div>
            </div>
          )}

          {/* ---------------------------------------------------------------------
              회원 식별자 12자리 규격 상태 시뮬레이터 바 (테스트 및 개발용)
              --------------------------------------------------------------------- */}
          <div className="w-full bg-[#e5eeff] py-1.5 px-4 border-b border-[#d3e4fe]">
            <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#00254a]">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#006c4a]">🆔 회원 식별자(12바이트 규격):</span>
                <span className="font-mono bg-white px-2 py-0.5 rounded border border-[#c3c6d0]">
                  {currentUserNo ? `${currentUserNo} (${currentUserNo.length}자)` : 'GUEST (비로그인)'}
                </span>
                <span className="text-[#737780] hidden lg:inline">
                  [1B 역할: U/P/A] + [6B 가입년월 YYYYMM] + [5B 일련번호 00001~]
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={toggleAuthMode}
                  className="px-2 py-0.5 rounded bg-white font-bold hover:bg-[#00254a] hover:text-white transition-colors shadow-2xs cursor-pointer"
                >
                  {currentUserNo ? '게스트 모드로 전환' : '정상 12자리(U20261000001)'}
                </button>
                <button
                  type="button"
                  onClick={testInvalidUserNo}
                  className="px-2 py-0.5 rounded bg-white font-bold text-[#ba1a1a] hover:bg-[#ba1a1a] hover:text-white transition-colors shadow-2xs cursor-pointer"
                  title="11자리 입력하여 400 오류 검증"
                >
                  오류 식별자 테스트
                </button>
                {userInfo && (
                  <button
                    type="button"
                    onClick={toggleSuspendedMode}
                    className="px-2 py-0.5 rounded bg-white font-bold hover:bg-[#ba1a1a] hover:text-white transition-colors shadow-2xs cursor-pointer"
                  >
                    {userInfo.userStatCd === 'SUSPENDED_7D' ? '정상 복구' : '7일 제재 토글'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------------------------
              Top Hero Section (프로모션 배너 및 지역 퀵 정보)
              --------------------------------------------------------------------- */}
          <section className="relative overflow-hidden bg-[#eff4ff] py-8 md:py-10">
            <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-[#82f5c1]/25 blur-3xl pointer-events-none"></div>
            <div className="absolute left-10 bottom-0 h-64 w-64 rounded-full bg-[#d4e3ff]/60 blur-2xl pointer-events-none"></div>

            <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 relative z-10">
              {/* 지역 & 배차 상태 퀵 바 */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsLocationModalOpen(!isLocationModalOpen)}
                    className="group flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white shadow-sm hover:bg-[#e5eeff] transition-all border border-[#e2e8f0] cursor-pointer"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[19px] text-[#006c4a]">
                      location_on
                    </span>
                    <span className="text-sm font-bold text-[#00254a]">{locationName}</span>
                    <span className="material-symbols-outlined text-[17px] text-[#737780] group-hover:translate-y-0.5 transition-transform">
                      keyboard_arrow_down
                    </span>
                  </button>
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#82f5c1]/40 text-[#00714e] text-xs font-semibold">
                    <span className="h-2 w-2 rounded-full bg-[#006c4a] animate-ping"></span>
                    일산·수도권 전역 100% 안심 마스터 배차 중
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* 쿠폰북 퀵 뱃지 */}
                  <button
                    type="button"
                    onClick={() => handleNav('USER-MYP-02')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-[#00254a] shadow-sm hover:shadow transition-all border border-[#e2e8f0] cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[17px] text-[#006c4a]">
                      confirmation_number
                    </span>
                    <span className="text-xs font-bold">쿠폰북</span>
                    <span className="px-1.5 py-0.5 rounded-full bg-[#006c4a] text-white text-[11px] font-bold">
                      {userInfo ? `${userInfo.couponCount}장 보유` : '2장 발급가능'}
                    </span>
                  </button>
                </div>
              </div>

              {/* 히어로 프로모션 배너 (Vibrant Mint/Teal to Navy Gradient) */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#006c4a] via-[#0d9488] to-[#163b66] p-6 md:p-8 text-white shadow-xl">
                <div className="absolute -right-8 -bottom-8 w-60 h-60 opacity-15 pointer-events-none">
                  <svg className="w-full h-full" fill="currentColor" viewBox="0 0 200 200">
                    <path d="M100 0 L125 75 L200 100 L125 125 L100 200 L75 125 L0 100 L75 75 Z"></path>
                  </svg>
                </div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="max-w-xl">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold mb-3">
                      <span className="material-symbols-outlined text-[15px] text-[#ffddb8]">
                        auto_awesome
                      </span>
                      신규회원 전용 프로모션
                    </div>
                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-snug">
                      가입 즉시 <span className="text-[#82f5c1]">5,000원 웰컴 할인</span> 쿠폰팩 지급!
                    </h1>
                    <p className="mt-2 text-sm md:text-base text-white/90">
                      정기청소부터 여름맞이 에어컨 분해세척까지 바로 사용 가능한 실시간 할인 혜택
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={handleClaimCoupon}
                      className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white text-[#00254a] font-bold text-sm md:text-base shadow-lg hover:bg-white/95 transition-all active:scale-95 cursor-pointer"
                    >
                      <span>지금 쿠폰받기</span>
                      <span className="material-symbols-outlined text-[19px] text-[#006c4a]">
                        arrow_forward
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ---------------------------------------------------------------------
              2. 마이 퀵 서머리 카드 (로그인 회원 전용)
              --------------------------------------------------------------------- */}
          {userInfo && (
            <section className="py-4 -mt-3 relative z-20">
              <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
                <div className="rounded-2xl bg-white p-4 md:p-6 shadow-md border border-[#d3e4fe] grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* 포인트 */}
                  <div
                    onClick={() => handleNav('USER-MYP-00')}
                    className="p-3.5 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between text-xs text-[#737780]">
                      <span className="font-bold">보유 포인트</span>
                      <span className="material-symbols-outlined text-[17px] text-[#00254a]">
                        monetization_on
                      </span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-xl md:text-2xl font-extrabold text-[#00254a]">
                        {userInfo.pointBalance.toLocaleString()}
                      </span>
                      <span className="text-xs font-bold text-[#006c4a]">P</span>
                    </div>
                  </div>

                  {/* 사용 가능 쿠폰 */}
                  <div
                    onClick={() => handleNav('USER-MYP-02')}
                    className="p-3.5 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between text-xs text-[#737780]">
                      <span className="font-bold">사용 가능 쿠폰</span>
                      <span className="material-symbols-outlined text-[17px] text-[#006c4a]">
                        confirmation_number
                      </span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-xl md:text-2xl font-extrabold text-[#006c4a]">
                        {userInfo.couponCount}
                      </span>
                      <span className="text-xs font-bold text-[#737780]">장</span>
                    </div>
                  </div>

                  {/* 진행 중 견적 */}
                  <div
                    onClick={() => handleNav('USER-QOT-00')}
                    className="p-3.5 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between text-xs text-[#737780]">
                      <span className="font-bold">진행 중 견적</span>
                      <span className="material-symbols-outlined text-[17px] text-[#00254a]">
                        request_quote
                      </span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-xl md:text-2xl font-extrabold text-[#00254a]">
                        {summary?.openReqCnt || 0}
                      </span>
                      <span className="text-xs font-bold text-[#737780]">건</span>
                    </div>
                  </div>

                  {/* 진행 중 계약 */}
                  <div
                    onClick={() => handleNav('USER-HIS-00')}
                    className="p-3.5 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between text-xs text-[#737780]">
                      <span className="font-bold">진행 중 계약</span>
                      <span className="material-symbols-outlined text-[17px] text-[#006c4a]">
                        handshake
                      </span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-xl md:text-2xl font-extrabold text-[#006c4a]">
                        {summary?.activeContractCnt || 0}
                      </span>
                      <span className="text-xs font-bold text-[#737780]">건</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ---------------------------------------------------------------------
              Live Matching Ticker Banner
              --------------------------------------------------------------------- */}
          <section className="bg-white py-3 border-y border-[#e2e8f0]/80 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[#00254a] font-bold text-sm shrink-0">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#006c4a] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#006c4a]"></span>
                  </span>
                  <span>실시간 견적 &amp; 매칭 현황</span>
                </div>

                <div className="flex items-center gap-2 text-xs text-[#43474f] overflow-hidden">
                  <span className="px-2 py-0.5 rounded bg-[#eff4ff] text-[#00254a] font-bold shrink-0">
                    {TICKER_ITEMS[tickerIndex].tag}
                  </span>
                  <span className="font-medium truncate text-[#0b1c30] transition-opacity duration-300">
                    {TICKER_ITEMS[tickerIndex].text}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* ---------------------------------------------------------------------
              3대 핵심 청소 서비스 바로가기 카드 (3 Core Cleaning Categories)
              --------------------------------------------------------------------- */}
          <section className="py-10 md:py-14">
            <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-2">
                <div>
                  <span className="text-[#006c4a] text-xs uppercase tracking-wider font-extrabold">
                    Category Highlights
                  </span>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-[#00254a] tracking-tight mt-1">
                    3대 프리미엄 전문 케어 솔루션
                  </h2>
                </div>
                <p className="text-sm text-[#43474f]">
                  정직한 시장 실사 단가와 검증된 전문 장비 마스터를 바로 연결해 드립니다.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* [카드 1: 계단/정기청소] */}
                <article className="group relative flex flex-col justify-between rounded-2xl bg-white p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 border border-[#e2e8f0]">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-4">
                      <div className="w-14 h-14 rounded-2xl bg-[#eff4ff] flex items-center justify-center text-[#00254a] group-hover:bg-[#00254a] group-hover:text-white transition-colors shadow-sm">
                        <span className="material-symbols-outlined text-[32px]">apartment</span>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-[#eff4ff] text-[#00254a] text-xs font-bold">
                        정기방문 주기 선택
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-[#00254a]">계단 / 정기청소</h3>
                    <p className="mt-1.5 text-sm text-[#43474f] leading-relaxed">
                      원룸/상가/빌라 정기청소 (최소 3개월 보장)로 항상 쾌적한 건물 컨디션 유지
                    </p>

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      <span className="px-2.5 py-1 rounded-md bg-[#f1f5f9] text-[#334155] text-xs font-medium">
                        주 1~3회 방문
                      </span>
                      <span className="px-2.5 py-1 rounded-md bg-[#f1f5f9] text-[#334155] text-xs font-medium">
                        분리수거 대행
                      </span>
                      <span className="px-2.5 py-1 rounded-md bg-[#82f5c1]/35 text-[#00714e] text-xs font-bold">
                        3개월 의무보증
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[#f1f5f9] flex items-center justify-between">
                    <div>
                      <span className="text-xs text-[#737780] block">월 관리비용 최저</span>
                      <span className="text-lg font-extrabold text-[#00254a]">월 79,000원~</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleNav('USER-REQ-00', { tab: 'regular' })}
                      className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-[#eff4ff] text-[#00254a] group-hover:bg-[#00254a] group-hover:text-white transition-all text-xs font-bold shadow-2xs cursor-pointer"
                    >
                      <span>정기 견적 요청하기</span>
                      <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    </button>
                  </div>
                </article>

                {/* [카드 2: 계절가전 분해세척] */}
                <article className="group relative flex flex-col justify-between rounded-2xl bg-white p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 border border-[#e2e8f0]">
                  <div className="absolute -top-2.5 right-4">
                    <span className="px-2.5 py-1 rounded-full bg-[#ba1a1a] text-white text-[11px] font-bold shadow-md">
                      인기 급상승 🔥
                    </span>
                  </div>

                  <div>
                    <div className="flex items-start justify-between gap-2 mb-4">
                      <div className="w-14 h-14 rounded-2xl bg-[#82f5c1]/30 flex items-center justify-center text-[#006c4a] group-hover:bg-[#006c4a] group-hover:text-white transition-colors shadow-sm">
                        <span className="material-symbols-outlined text-[32px]">mode_fan</span>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-[#82f5c1]/40 text-[#00714e] text-xs font-bold">
                        여름맞이 15% OFF
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-[#00254a]">계절가전 케어</h3>
                    <p className="mt-1.5 text-sm text-[#43474f] leading-relaxed">
                      에어컨 / 세탁기 분해 살균 청소로 곰팡이 및 유해세균 99.9% 완벽 박멸
                    </p>

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      <span className="px-2.5 py-1 rounded-md bg-[#f1f5f9] text-[#334155] text-xs font-medium">
                        고압 살균세척
                      </span>
                      <span className="px-2.5 py-1 rounded-md bg-[#f1f5f9] text-[#334155] text-xs font-medium">
                        완전 분해인증
                      </span>
                      <span className="px-2.5 py-1 rounded-md bg-[#82f5c1]/35 text-[#00714e] text-xs font-bold">
                        친환경 약품
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[#f1f5f9] flex items-center justify-between">
                    <div>
                      <span className="text-xs text-[#737780] block">얼리버드 특가</span>
                      <span className="text-lg font-extrabold text-[#006c4a]">대당 65,000원~</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleNav('USER-REQ-00', { tab: 'appliance' })}
                      className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-[#82f5c1]/30 text-[#006c4a] group-hover:bg-[#006c4a] group-hover:text-white transition-all text-xs font-bold shadow-2xs cursor-pointer"
                    >
                      <span>가전케어 신청하기</span>
                      <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    </button>
                  </div>
                </article>

                {/* [카드 3: 입주/이사 청소] */}
                <article className="group relative flex flex-col justify-between rounded-2xl bg-white p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 border border-[#e2e8f0]">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-4">
                      <div className="w-14 h-14 rounded-2xl bg-[#eff4ff] flex items-center justify-center text-[#00254a] group-hover:bg-[#00254a] group-hover:text-white transition-colors shadow-sm">
                        <span className="material-symbols-outlined text-[32px]">vpn_key</span>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-[#ffddb8] text-[#2a1700] text-xs font-bold">
                        피톤치드 무료시공
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-[#00254a]">입주 / 이사 청소</h3>
                    <p className="mt-1.5 text-sm text-[#43474f] leading-relaxed">
                      신축 아파트/오피스텔 전문 입주청소 미세먼지 및 새집증후군 완벽 제거
                    </p>

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      <span className="px-2.5 py-1 rounded-md bg-[#f1f5f9] text-[#334155] text-xs font-medium">
                        창틀/욕실 정밀케어
                      </span>
                      <span className="px-2.5 py-1 rounded-md bg-[#f1f5f9] text-[#334155] text-xs font-medium">
                        외창 제외 전구역
                      </span>
                      <span className="px-2.5 py-1 rounded-md bg-[#eff4ff] text-[#00254a] text-xs font-bold">
                        당일 검수 원칙
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[#f1f5f9] flex items-center justify-between">
                    <div>
                      <span className="text-xs text-[#737780] block">표준 공급 단가</span>
                      <span className="text-lg font-extrabold text-[#00254a]">평당 11,000원~</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleNav('USER-REQ-00', { tab: 'movein' })}
                      className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-[#eff4ff] text-[#00254a] group-hover:bg-[#00254a] group-hover:text-white transition-all text-xs font-bold shadow-2xs cursor-pointer"
                    >
                      <span>입주청소 신청하기</span>
                      <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    </button>
                  </div>
                </article>
              </div>
            </div>
          </section>

          {/* ---------------------------------------------------------------------
              4. 쓸딱 특화 정책 안심 안내 배너 (Navy Accent Box / 3-Month Guarantee)
              --------------------------------------------------------------------- */}
          <section className="py-10 bg-[#eff4ff]">
            <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* 좌측 안심 지표 & 만족도 원형 게이지 */}
                <div className="lg:col-span-5 flex flex-col gap-4">
                  <div className="rounded-2xl bg-white p-6 shadow-sm border border-[#d3e4fe]">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-extrabold text-[#006c4a] flex items-center gap-1">
                        <span className="material-symbols-outlined text-[17px]">verified</span>
                        쓸고닦고 안심 지표
                      </span>
                      <span className="text-xs text-[#737780]">2026년 수도권 기준</span>
                    </div>

                    <div className="flex items-center gap-6 my-2">
                      {/* 원형 SVG 차트 (98.8%) */}
                      <div className="relative w-24 h-24 shrink-0">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          <path
                            className="text-[#e2e8f0]"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3.5"
                          ></path>
                          <path
                            className="text-[#006c4a]"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="currentColor"
                            strokeDasharray="98.8, 100"
                            strokeLinecap="round"
                            strokeWidth="3.5"
                          ></path>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                          <span className="text-lg font-extrabold text-[#00254a]">98.8%</span>
                          <span className="text-[9px] text-[#737780] font-semibold">만족도</span>
                        </div>
                      </div>

                      <div>
                        <p className="text-base font-bold text-[#00254a] leading-snug">
                          고객 10명 중 9.8명이
                          <br />
                          재방문 케어를 신청합니다
                        </p>
                        <p className="text-xs text-[#43474f] mt-1">
                          철저한 마스터 자격 검증 및 본사 안심 케어 보증제 적용
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-3 mt-2 border-t border-[#f1f5f9]">
                      <div className="p-2.5 rounded-xl bg-[#eff4ff] text-center">
                        <span className="text-[11px] text-[#737780] block">평균 매칭 소요</span>
                        <span className="text-base font-extrabold text-[#00254a]">15분 이내</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#eff4ff] text-center">
                        <span className="text-[11px] text-[#737780] block">A/S 보증 기간</span>
                        <span className="text-base font-extrabold text-[#006c4a]">3개월 무상</span>
                      </div>
                    </div>
                  </div>

                  {/* 검수 사진 인상 카드 */}
                  <div className="relative overflow-hidden rounded-2xl bg-[#00254a] h-40 shadow-sm">
                    <img
                      className="w-full h-full object-cover opacity-80"
                      alt="현장 검수 완료"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDtpbBlFvvfeW7QP2_fcTYwlm9aXkZoH0E_bNO9TwUAs4_WDiy06CE_VP754DRahKawVoZRE5du8KJsps9e5k4ahZAHh89piE81r--llbTGeK9W9easPpRDuA00OzhNuTIXkxjVyPCy1QUdYyKUSKGUvhLrDiCgtUR3RvBObfQ2WGoIMQWT-_2TuX6OvlnKd5_TmwRjy4LnMKwqMeKFiiJpXqkFu_w1mc9_v9TMIU5iK_SPKW0CN8dN"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#00254a] via-transparent to-transparent flex items-end p-4">
                      <p className="text-white text-xs font-bold flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[17px] text-[#82f5c1]">
                          camera_alt
                        </span>
                        시공 전후 비교 검수 사진 100% 모바일 앱 실시간 전송
                      </p>
                    </div>
                  </div>
                </div>

                {/* 우측 쓸딱 특화 정책 안심 안내 배너 (Deep Royal Navy Accent Card) */}
                <div className="lg:col-span-7">
                  <div className="rounded-2xl bg-white p-6 md:p-8 shadow-md border border-[#d3e4fe] relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-[#00254a] text-[#82f5c1] flex items-center justify-center shrink-0 shadow-md">
                        <span className="material-symbols-outlined text-[26px]">verified_user</span>
                      </div>
                      <div>
                        <span className="text-xs font-extrabold text-[#006c4a] uppercase tracking-wider">
                          3-Month Guarantee
                        </span>
                        <h3 className="text-xl md:text-2xl font-extrabold text-[#00254a]">
                          3개월 책임 안심보증 배너
                        </h3>
                      </div>
                    </div>

                    <p className="text-sm md:text-base font-bold text-[#00254a] leading-relaxed mb-5 bg-[#eff4ff] p-3.5 rounded-xl border border-[#dce9ff]">
                      &quot;쓸고닦고 안심 케어 보증제: 서비스 불만족 시 무상 A/S 재방문 + 3개월 사후관리&quot;
                    </p>

                    <div className="space-y-3">
                      {/* 정책 1: 3개월 의무 계약 보장 */}
                      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#f8f9ff] border border-[#e2e8f0]/80">
                        <span className="material-symbols-outlined text-[22px] text-[#006c4a] shrink-0 mt-0.5">
                          check_circle
                        </span>
                        <div>
                          <h4 className="text-sm font-bold text-[#00254a]">
                            3개월 의무 계약 보장으로 꼼꼼한 관리
                          </h4>
                          <p className="text-xs text-[#43474f] mt-0.5">
                            정기청소는 90일 이상 락 시스템을 통해 단발성 부실 관리를 방지하며, 노쇼 시 본사 슈퍼바이저 대체배차 100% 보증합니다.
                          </p>
                        </div>
                      </div>

                      {/* 정책 2: 투명한 데이터 이용료 정책 */}
                      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#f8f9ff] border border-[#e2e8f0]/80">
                        <span className="material-symbols-outlined text-[22px] text-[#006c4a] shrink-0 mt-0.5">
                          calculate
                        </span>
                        <div>
                          <h4 className="text-sm font-bold text-[#00254a]">
                            투명한 데이터 이용료 정책
                          </h4>
                          <p className="text-xs text-[#43474f] mt-0.5 font-mono">
                            플랫폼 이용료 = max(청소 용역 대금의 3.3%, 33,000원) 적용으로 거품 없는 합리적 수수료 보장.
                          </p>
                        </div>
                      </div>

                      {/* 정책 3: 0507 안심번호 및 1억원 영업배상책임보험 */}
                      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#f8f9ff] border border-[#e2e8f0]/80">
                        <span className="material-symbols-outlined text-[22px] text-[#006c4a] shrink-0 mt-0.5">
                          security
                        </span>
                        <div>
                          <h4 className="text-sm font-bold text-[#00254a]">
                            상호 결제 완료 시 0507 안심번호 제공 및 삼성화재 1억원 공식 보험
                          </h4>
                          <p className="text-xs text-[#43474f] mt-0.5">
                            개인정보 유출 없는 안심 직거래와 작업 중 기물 파손에 대해 최대 1억원 보상 한도를 전건 적용합니다.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ---------------------------------------------------------------------
              이달의 일산·고양 우수 마스터 파트너 (Verified Masters)
              --------------------------------------------------------------------- */}
          <section className="py-10 md:py-14">
            <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-2">
                <div>
                  <span className="text-[#006c4a] text-xs uppercase tracking-wider font-extrabold">
                    Verified Masters
                  </span>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-[#00254a] tracking-tight mt-1">
                    이달의 일산·고양 우수 마스터 파트너
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => showToast('전체 마스터 목록을 조회합니다.')}
                  className="text-xs font-bold text-[#00254a] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  전체 마스터 프로필 보기
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {VERIFIED_MASTERS.map((master) => (
                  <div
                    key={master.id}
                    className="rounded-2xl bg-white p-6 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between border border-[#e2e8f0]"
                  >
                    <div>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="relative w-16 h-16 rounded-full overflow-hidden bg-[#eff4ff] shrink-0 border-2 border-[#d3e4fe]">
                          <img
                            className="w-full h-full object-cover"
                            src={master.imageUrl}
                            alt={master.name}
                          />
                          <span className="absolute bottom-0 right-0 p-0.5 rounded-full bg-[#006c4a] text-white flex items-center justify-center">
                            <span className="material-symbols-outlined text-[12px]">verified</span>
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold mb-1 ${master.badgeColor}`}
                          >
                            <span className="material-symbols-outlined text-[12px]">
                              military_tech
                            </span>
                            {master.badge}
                          </div>
                          <h3 className="text-base font-bold text-[#00254a] truncate">
                            {master.name}
                          </h3>
                          <div className="flex items-center gap-1 mt-0.5 text-xs">
                            <span
                              className="material-symbols-outlined text-[16px] text-[#f59e0b]"
                              style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                              star
                            </span>
                            <span className="font-extrabold text-[#00254a]">
                              {master.rating.toFixed(1)}
                            </span>
                            <span className="text-[#737780]">(리뷰 {master.reviewCount}건)</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 my-3">
                        {master.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded bg-[#eff4ff] text-[#00254a] text-[11px] font-semibold"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      <p className="text-xs text-[#43474f] line-clamp-2 leading-relaxed">
                        &quot;{master.description}&quot;
                      </p>
                    </div>

                    <div className="mt-5 pt-3 border-t border-[#f1f5f9] flex items-center justify-between">
                      <span className="text-xs text-[#006c4a] font-bold">
                        최근 작업: {master.recentWork}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleNav('USER-REQ-00', { designatedPartner: master.id })
                        }
                        className="px-3 py-1.5 rounded-lg bg-[#eff4ff] text-[#00254a] hover:bg-[#00254a] hover:text-white transition-colors text-xs font-bold cursor-pointer"
                      >
                        지정 견적요청
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ---------------------------------------------------------------------
              Sticky Bottom CTA Bar (반응형 1분 무료 견적 신청 바)
              --------------------------------------------------------------------- */}
          <div className="sticky bottom-0 z-30 w-full bg-white/95 backdrop-blur-xl border-t border-[#e2e8f0] shadow-[0_-8px_24px_-4px_rgba(22,59,102,0.08)] py-3 px-4 md:px-8 lg:px-12">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="hidden sm:flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#163b66] flex items-center justify-center text-[#82f5c1] shadow-sm">
                  <span className="material-symbols-outlined text-[20px]">flash_on</span>
                </div>
                <div>
                  <span className="text-sm font-bold text-[#00254a]">
                    1분 초간편 무료 견적 신청
                  </span>
                  <p className="text-xs text-[#43474f]">
                    원하는 날짜와 평수만 입력하면 일산·고양 인근 마스터 3인의 실시간 비교 견적 발송
                  </p>
                </div>
              </div>

              {/* 메인 견적 신청 CTA 버튼 */}
              <button
                type="button"
                onClick={() => handleNav('USER-REQ-00')}
                className="w-full sm:w-auto min-w-[280px] h-[50px] rounded-xl bg-[#00254a] text-white flex items-center justify-between px-5 shadow-lg hover:bg-[#163b66] transition-all active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-[#82f5c1]">
                    assignment_turned_in
                  </span>
                  <span className="text-sm font-bold">우리 집 청소 견적 신청하기</span>
                </div>
                <div className="flex items-center gap-1 text-[#82f5c1] text-xs font-semibold">
                  <span>1분 소요</span>
                  <span className="material-symbols-outlined text-[17px]">arrow_forward</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* =========================================================================
          모바일 전용 바텀 네비게이션 (md:hidden)
          ========================================================================= */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-[#e2e8f0] md:hidden shadow-[0_-4px_16px_rgba(22,59,102,0.06)]">
        <div className="max-w-md mx-auto grid grid-cols-4 h-15">
          <button
            type="button"
            onClick={() => handleNav('USER-COM-00')}
            className="flex flex-col items-center justify-center gap-0.5 text-[#00254a] font-bold cursor-pointer"
          >
            <span className="material-symbols-outlined text-[22px]">home</span>
            <span className="text-[11px]">홈</span>
          </button>
          <button
            type="button"
            onClick={() => handleNav('USER-QOT-00')}
            className="flex flex-col items-center justify-center gap-0.5 text-[#43474f] hover:text-[#00254a] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[22px]">request_quote</span>
            <span className="text-[11px]">견적현황</span>
          </button>
          <button
            type="button"
            onClick={() => handleNav('USER-HIS-00')}
            className="flex flex-col items-center justify-center gap-0.5 text-[#43474f] hover:text-[#00254a] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[22px]">receipt_long</span>
            <span className="text-[11px]">이용내역</span>
          </button>
          <button
            type="button"
            onClick={() => handleNav('USER-MYP-00')}
            className="flex flex-col items-center justify-center gap-0.5 text-[#43474f] hover:text-[#00254a] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[22px]">person</span>
            <span className="text-[11px]">마이</span>
          </button>
        </div>
      </nav>

      {/* =========================================================================
          데스크톱 푸터 (hidden md:block)
          ========================================================================= */}
      <footer className="hidden md:block w-full bg-[#eff4ff] border-t border-[#d3e4fe] py-8">
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-[#737780]">
          <div className="flex items-center gap-3">
            <img
              src={logoUrl}
              alt="쓸고딱고 공식 로고"
              className="w-6 h-6 rounded-full object-cover inline-block shadow-2xs border border-[#0d9488]/30"
            />
            <span className="font-extrabold text-sm text-[#00254a]">쓸고딱고 (SsulDak)</span>
            <span>|</span>
            <span>전문 홈 &amp; 빌딩 클리닝 케어 플랫폼</span>
            <span>|</span>
            <span>사업자등록번호: 123-45-67890</span>
          </div>
          <p>© 2026 SsulDak Inc. All rights reserved. 일산·수도권 공식 케어 센터</p>
        </div>
      </footer>

      {/* =========================================================================
          토스트 알림 팝업
          ========================================================================= */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-[#00254a] text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2 text-xs sm:text-sm font-semibold animate-fade-in border border-[#82f5c1]/30">
          <span className="material-symbols-outlined text-[18px] text-[#82f5c1]">info</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default UserCom00Screen;
