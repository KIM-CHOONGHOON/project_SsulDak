import React, { useState, useRef, useEffect } from 'react';

/**
 * PTNR-ATH-01: 파트너 입점 신청 및 웰컴쿠폰 화면 (React + TypeScript)
 * 
 * 아키텍처 규칙:
 * - 물리적 격리: SsulDak_Web/Partner/frontend/PTNR-ATH-01/
 * - 1:1 매핑 백엔드: POST /api/partner/ptnr_ath_01
 * - 전용 SQL: PTNR-ATH-01-SQL-001 ~ PTNR-ATH-01-SQL-005
 */

interface PtnrAth01Props {
  onNavigate?: (screen: string, params?: any) => void;
}

export const PtnrAth01Screen: React.FC<PtnrAth01Props> = ({ onNavigate }) => {
  // 1. 사업자 기본 정보 State
  const [companyNm, setCompanyNm] = useState('반짝빌라클린');
  const [ceoNm, setCeoNm] = useState('이순신');
  const [bizRegNo, setBizRegNo] = useState('123-45-67890');
  const [ptnrTel, setPtnrTel] = useState('010-1234-5678');
  const [ptnrEmail, setPtnrEmail] = useState('newpartner@clean.com');
  const [ptnrPassword, setPtnrPassword] = useState('Password1234!');
  const [bankInfo, setBankInfo] = useState('기업은행 020-098***-01-019 (예금주: 이순신)');
  const [address, setAddress] = useState('경기 고양시 일산동구 백석로 45, 3층 302호');

  // 국세청 진위확인 상태
  const [isBizVerified, setIsBizVerified] = useState(true);
  const [bizTaxType, setBizTaxType] = useState('부가가치세 일반과세자');
  const [isVerifyingBiz, setIsVerifyingBiz] = useState(false);

  // 주 시공 가능 지역 다중 선택
  const [preferredAreas, setPreferredAreas] = useState<string[]>([
    '고양시 일산동구',
    '고양시 일산서구',
    '파주시 전역',
    '고양시 덕양구'
  ]);
  const [newAreaInput, setNewAreaInput] = useState('');
  const [showAddAreaModal, setShowAddAreaModal] = useState(false);

  // 2. 증빙 서류 업로드 상태
  const [bizCertFile, setBizCertFile] = useState<{ name: string; size: string; url: string }>({
    name: 'business_license_scan.pdf',
    size: '1.8 MB',
    url: 'https://ssuldak.s3.ap-northeast-2.amazonaws.com/partner_docs/biz_01.pdf'
  });
  const [licenseFile, setLicenseFile] = useState<{ name: string; size: string; url: string } | null>({
    name: '클린마스터1급_자격증.jpg',
    size: '2.4 MB',
    url: 'https://ssuldak.s3.ap-northeast-2.amazonaws.com/partner_docs/license_01.jpg'
  });
  const [insuranceFile, setInsuranceFile] = useState<{ name: string; size: string; url: string }>({
    name: 'KB영업배상책임보험_1억원.pdf',
    size: '2.1 MB',
    url: 'https://ssuldak.s3.ap-northeast-2.amazonaws.com/partner_docs/ins_01.pdf'
  });
  const [equipPhotoList, setEquipPhotoList] = useState<string[]>([
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDaHHyAfdLog4O4LlojeA9zTCt9QCRiHuejqmJvM0tiXTYl8Iub22Bww6TpeR_Qxkc4DBbzKx29AzkU2Qn8D9XjU3Ku73K41oJKKs9HWAGZixVfhiYW4XEYu1-T4x96yCVXKLCNoYeTK7V2ufDRhV0lkGVxk8HejUF2c_avcsv_c35Xx9pJhfWUcwQVLLagWGZ_WHHOVCwkpZ8g0bjrQrzVow2R1QkfnL3S9vQvte83Qu3_n9Iy1ZQi',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBb7bchPhSBQOJ9GFQwoQjZ7FBf2I3jQlyWbdZ3W97BZO9lrt6R531Bv8JtxuCgH16BAa3yeKQx4f7aSY4ugZXc6ZkmW08DpitWNXu4ITEVU_0YftsndN5UkM-R1tSEk1F_yQ-Fcs5qhkzPzsPFdkIGq3Y6DeRux01sYntOUSDWVn6lz3iuFOdsXqCxj0o6GoPt7GU8PaeQw9mARjcnpaKsR0ks8W9xtCaG6_z9INTwFUgMg40ld9kc',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBASkoHvzdDO_RxEuyq9t27sNTxLa_zkHqQlQk2xSMuWdm8LNS4313FwBE93MF4YLD2xJnGRAZQzt_HzS_4-hK_JlUDhrh0CCg3YgUVNJChDEtmR9h00DZv724GTzDFi-xGlDyxY7ArehIMlEMxFa_2sVS5kxNIIXhtEX8r_s0S9pnt0utOQZC7VpTq_Pt9YpIJWiZEfi_gpka_JoEwHMBh49bqpsbk5IYNttWt-1o6VfpmRWp0dHwP'
  ]);

  // 3. 자필 전자서명 State & Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(true);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMTIwIj48cGF0aCBkPSJNIDMwIDcwIFEgNTUgMjUgNzUgNDUgVCA5MCA5MCBRIDk1IDMwIDExNSA1MCBUMTM1IDc1IFEgMTYwIDMwIDE4NSA2MCBUMjEwIDc1IFEgMjM1IDI1IDI1NSA0NSBUMjgwIDgwIiBzdHJva2U9IiMwMDI1NGEiIHN0cm9rZS13aWR0aD0iMy41IiBmaWxsPSJub25lIi8+PC9zdmc+');

  // 4. 약관 동의 Checkboxes
  const [terms, setTerms] = useState({
    terms1: true, // [필수] 쓸고닦고 파트너 이용약관 및 공정거래 준수 서약
    terms2: true, // [필수] 에스크로 안전 결제 및 익일 자동 정산 규정 동의
    terms3: true, // [필수] 고객 시공 하자에 대한 100% 무상 AS 및 배상책임보험 적용 동의
    terms4: true  // [선택] 신규 기업/빌라 단체 오더 우선 배차 알림톡 수신 동의
  });

  // 5. 처리 상태 & 모달 State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // 제출 성공 모달
  const [successModal, setSuccessModal] = useState<{
    isOpen: boolean;
    ptnrNo: string;
    message: string;
  }>({
    isOpen: false,
    ptnrNo: '',
    message: ''
  });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg(null);
    }, 3000);
  };

  const nav = (path: string, params?: any) => {
    if (onNavigate) {
      onNavigate(path, params);
    } else {
      window.location.hash = path;
    }
  };

  // Canvas 드로잉 이벤트 리스너 초기화
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 기본 선 스타일 설정
    ctx.strokeStyle = '#00254a';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setSignatureDataUrl(canvas.toDataURL('image/png'));
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setSignatureDataUrl('');
  };

  // 국세청 사업자등록번호 진위확인 API 호출
  const handleVerifyBizNo = async () => {
    const cleanNo = bizRegNo.replace(/[^0-9]/g, '');
    if (cleanNo.length !== 10) {
      showToast('사업자등록번호 10자리를 올바르게 입력해 주세요.');
      return;
    }

    setIsVerifyingBiz(true);
    try {
      const res = await fetch('/api/partner/ptnr_ath_01', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'VERIFY_BIZ_NO',
          bizRegNo: cleanNo,
          pNm: ceoNm
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsBizVerified(true);
        setBizTaxType(data.taxType || '부가가치세 일반과세자');
        showToast('✓ 국세청 정상 계속사업자 인증이 완료되었습니다.');
      } else {
        setIsBizVerified(false);
        showToast(data.message || '국세청 사업자등록 진위확인에 실패했습니다.');
      }
    } catch (err: any) {
      showToast('국세청 진위확인 서버 연결 중 오류가 발생했습니다.');
    } finally {
      setIsVerifyingBiz(false);
    }
  };

  // 지역 태그 삭제
  const handleRemoveArea = (area: string) => {
    setPreferredAreas(prev => prev.filter(a => a !== area));
  };

  // 지역 태그 추가
  const handleAddArea = () => {
    const trimmed = newAreaInput.trim();
    if (!trimmed) return;
    if (preferredAreas.includes(trimmed)) {
      showToast('이미 추가된 지역입니다.');
      return;
    }
    if (preferredAreas.length >= 5) {
      showToast('주 시공 지역은 최대 5개까지 지정할 수 있습니다.');
      return;
    }
    setPreferredAreas(prev => [...prev, trimmed]);
    setNewAreaInput('');
    setShowAddAreaModal(false);
  };

  // 입점 신청서 최종 제출 핸들러
  const handleSubmitApplication = async () => {
    // 1. 필수값 체크
    if (!companyNm.trim()) {
      showToast('상호명을 입력해 주세요.');
      return;
    }
    if (!ceoNm.trim()) {
      showToast('대표자명을 입력해 주세요.');
      return;
    }
    if (!bizRegNo.trim()) {
      showToast('사업자등록번호를 입력해 주세요.');
      return;
    }
    if (!ptnrTel.trim()) {
      showToast('대표 연락처를 입력해 주세요.');
      return;
    }
    if (!ptnrEmail.trim() || !ptnrPassword.trim()) {
      showToast('로그인용 이메일과 비밀번호를 입력해 주세요.');
      return;
    }
    if (!bizCertFile) {
      showToast('사업자등록증 사본을 등록해 주세요.');
      return;
    }
    if (!insuranceFile) {
      showToast('영업배상책임보험 증권을 등록해 주세요.');
      return;
    }
    if (equipPhotoList.length === 0) {
      showToast('대표 보유 전문 청소 장비 실물 사진을 1장 이상 등록해 주세요.');
      return;
    }
    if (!hasSignature && !signatureDataUrl) {
      showToast('대표자 자필 전자서명을 완료해 주세요.');
      return;
    }
    if (!terms.terms1 || !terms.terms2 || !terms.terms3) {
      showToast('필수 약관에 모두 동의해 주셔야 입점 신청이 가능합니다.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        mode: 'SUBMIT_APPLICATION',
        ptnrEmail: ptnrEmail.trim(),
        ptnrPassword: ptnrPassword.trim(),
        companyNm: companyNm.trim(),
        ceoNm: ceoNm.trim(),
        bizRegNo: bizRegNo.trim(),
        ptnrTel: ptnrTel.trim(),
        bizCertDocUrl: bizCertFile.url,
        licenseDocUrl: licenseFile ? licenseFile.url : null,
        insuranceDocUrl: insuranceFile.url,
        equipPhotoUrl: equipPhotoList[0],
        signImgBase64: signatureDataUrl || 'data:image/svg+xml;base64,sample',
        preferredAreas
      };

      const res = await fetch('/api/partner/ptnr_ath_01', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resData = await res.json();

      if (res.ok && resData.success) {
        setSuccessModal({
          isOpen: true,
          ptnrNo: resData.ptnrNo,
          message: resData.message
        });
      } else {
        showToast(resData.message || '입점 신청서 제출 중 오류가 발생했습니다.');
      }
    } catch (err: any) {
      showToast('서버 통신 중 장애가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 빠른 테스트 데이터 자동 채우기
  const handleQuickAutofill = () => {
    const rand = Math.floor(1000 + Math.random() * 9000);
    setCompanyNm(`클린마스터${rand}`);
    setCeoNm('홍길동');
    setBizRegNo(`999-12-${rand}5`);
    setPtnrTel('010-5555-8888');
    setPtnrEmail(`partner_${rand}@clean.com`);
    setPtnrPassword('Password1234!');
    setIsBizVerified(true);
    showToast('테스트용 신규 파트너 정보가 자동 입력되었습니다.');
  };

  return (
    <div className="bg-surface font-body-md text-on-surface antialiased min-h-screen flex flex-col">
      {/* ================= HEADER ================= */}
      <header className="fixed top-0 w-full z-50 bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(22,59,102,0.04)] border-b border-surface-container">
        <div className="h-16 max-w-7xl mx-auto px-4 md:px-8 lg:px-12 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div 
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => nav('#partner-login')}
            >
              <div className="w-9 h-9 rounded-lg bg-primary-container flex items-center justify-center text-on-primary">
                <span className="material-symbols-outlined text-[20px]">domain_verification</span>
              </div>
              <div className="flex flex-col">
                <span className="font-headline-sm text-primary tracking-tight font-extrabold">SsulDak</span>
                <span className="font-label-sm text-on-surface-variant uppercase tracking-wider text-[11px]">Partner Console</span>
              </div>
            </div>
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
              <span>SSL Encrypted • 99.98% Operational</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col text-right">
              <span className="font-label-sm text-on-surface-variant text-[11px]">Emergency Desk (24/7)</span>
              <span className="font-headline-sm text-secondary font-bold tracking-tight">1588-0000</span>
            </div>
            <button
              onClick={() => nav('#partner-login')}
              className="hidden sm:inline-flex items-center font-label-md text-on-surface-variant hover:text-on-surface px-3 py-1.5 rounded-lg hover:bg-surface-container transition-colors"
            >
              로그인 포털로 이동
            </button>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary">
              <span className="material-symbols-outlined text-[18px]">person</span>
            </div>
          </div>
        </div>
      </header>

      {/* ================= MAIN CONTENT ================= */}
      <main className="w-full pt-16 bg-surface flex-1">
        {/* Decorative Top Glow Bar */}
        <div className="w-full h-1 bg-gradient-to-r from-primary via-secondary to-primary-container"></div>

        <div className="w-full max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-6 md:py-10">
          {/* Breadcrumb & Title Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex flex-col gap-1">
              <nav className="flex items-center gap-1.5 font-label-sm text-on-surface-variant text-xs">
                <a 
                  className="hover:text-primary transition-colors flex items-center gap-1 cursor-pointer" 
                  onClick={() => nav('#')}
                >
                  <span className="material-symbols-outlined text-[15px]">home</span> 홈
                </a>
                <span className="text-outline-variant">/</span>
                <a 
                  className="hover:text-primary transition-colors cursor-pointer" 
                  onClick={() => nav('#partner-login')}
                >
                  파트너 로그인 (PTNR-ATH-00)
                </a>
                <span className="text-outline-variant">/</span>
                <span className="text-primary font-bold">파트너 입점 신청 (PTNR-ATH-01)</span>
              </nav>

              <div className="flex items-center gap-2.5 mt-1">
                <h1 className="font-headline-lg text-primary tracking-tight font-extrabold text-2xl md:text-3xl">
                  전문 파트너 입점 신청
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm font-bold text-xs">
                  웰컴 프로모션 진행 중
                </span>
              </div>
              <p className="font-body-md text-on-surface-variant text-sm">
                대한민국 1등 공간 위생 인프라 쓸고닦고(SsulDak)와 함께할 공식 인증 마스터 파트너를 모십니다.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleQuickAutofill}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-secondary-fixed/40 hover:bg-secondary-fixed text-primary font-label-md text-xs transition-all shadow-xs"
                title="QA 검증용 새 데이터 자동 채우기"
              >
                <span className="material-symbols-outlined text-[16px]">magic_button</span>
                <span>테스트용 자동입력</span>
              </button>
              <button
                onClick={() => nav('#partner-login')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-sm transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                <span>로그인 포털로 돌아가기</span>
              </button>
            </div>
          </div>

          {/* 3-Step Process Indicator */}
          <div className="w-full bg-surface-container-lowest rounded-xl p-4 md:p-6 shadow-sm mb-6 border border-surface-container">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
              {/* Step 1 */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-headline-sm font-bold shadow-sm flex-shrink-0">
                  <span className="material-symbols-outlined text-[20px]">badge</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-label-sm text-secondary font-bold uppercase tracking-wider text-[11px]">STEP 01</span>
                  <span className="font-headline-sm text-on-surface font-bold truncate text-sm md:text-base">사업자 및 대표 정보</span>
                  <span className="font-body-sm text-on-surface-variant text-xs">국세청 API 실시간 확인 연동</span>
                </div>
              </div>
              {/* Step 2 */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-headline-sm font-bold shadow-sm flex-shrink-0">
                  <span className="material-symbols-outlined text-[20px]">verified_user</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-label-sm text-secondary font-bold uppercase tracking-wider text-[11px]">STEP 02</span>
                  <span className="font-headline-sm text-on-surface font-bold truncate text-sm md:text-base">증빙 서류 및 장비 인증</span>
                  <span className="font-body-sm text-on-surface-variant text-xs">책임보험 &amp; 전문장비 등록</span>
                </div>
              </div>
              {/* Step 3 */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary text-on-secondary flex items-center justify-center font-headline-sm font-bold shadow-sm flex-shrink-0 ring-4 ring-secondary-container">
                  <span className="material-symbols-outlined text-[20px]">draw</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-label-sm text-secondary font-bold uppercase tracking-wider text-[11px]">STEP 03 • 최종 작성</span>
                  <span className="font-headline-sm text-on-surface font-bold truncate text-sm md:text-base">전자서명 및 혜택 신청</span>
                  <span className="font-body-sm text-on-surface-variant text-xs">무료 배차 쿠폰 즉시 발급</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2-Column Responsive Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* ================= LEFT COLUMN: MAIN FORM (lg:col-span-8) ================= */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              {/* 1. Welcome Benefit Callout */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary-container to-secondary text-on-primary p-6 md:p-8 shadow-md">
                <div className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-secondary-fixed/15 blur-2xl pointer-events-none"></div>
                <div className="absolute top-0 right-1/4 w-32 h-32 rounded-full bg-primary-fixed/10 blur-xl pointer-events-none"></div>

                <div className="relative z-10 flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-sm font-bold tracking-wide text-xs">
                      <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
                      D-Day 프로모션 한정 혜택
                    </span>
                    <span className="font-label-sm text-primary-fixed font-semibold tracking-wider uppercase text-xs">
                      SSULDAK WELCOME PASS
                    </span>
                  </div>

                  <h2 className="font-headline-lg text-xl md:text-2xl font-extrabold text-on-primary mt-1 tracking-tight leading-snug">
                    🎉 입점 승인 완료 즉시 &apos;첫 배차 데이터 이용료 100% 무료 쿠폰(Free Pass)&apos; 자동 지급!
                  </h2>
                  <p className="font-body-md text-surface-container-high leading-relaxed text-sm">
                    쓸고닦고 파트너스 신규 입점 시 <strong className="text-secondary-fixed font-bold">33,000원 상당의 첫 견적 매칭 수수료가 전액 면제</strong>됩니다. 
                    검증된 정식 사업자 인증 파트너에게만 제공되는 본사 100% 지원 특전입니다. (승인 심사 평균 24시간 이내 완료)
                  </p>

                  <div className="mt-2 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="px-2.5 py-1 bg-surface-container-lowest/15 backdrop-blur-md rounded font-mono font-bold text-secondary-fixed tracking-wider">
                        COUPON : WELCOME-FREEPASS-2025
                      </div>
                      <span className="text-surface-container-high text-xs">배차 수수료 0원 / 위약 보상 포함</span>
                    </div>
                    <div className="flex items-center gap-1 font-label-sm text-secondary-fixed font-bold">
                      <span className="material-symbols-outlined text-[16px]">verified</span> 심사 승인 즉시 자동 인계
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Section 1: 사업자 기본 정보 */}
              <div className="bg-surface-container-lowest rounded-2xl p-6 md:p-8 shadow-sm border border-surface-container">
                <div className="flex items-center justify-between pb-4 mb-5 border-b border-surface-container">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-[20px]">storefront</span>
                    </div>
                    <h3 className="font-headline-md text-on-surface font-extrabold text-lg">사업자 기본 정보</h3>
                  </div>
                  <span className="font-label-sm text-on-surface-variant text-xs flex items-center gap-1">
                    <span className="text-error font-bold">*</span> 표시는 승인 필수 항목입니다
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 상호명 */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-md text-on-surface flex items-center gap-1 text-sm font-bold">
                      상호명 (법인/개인 상호) <span className="text-error">*</span>
                    </label>
                    <div className="relative">
                      <input 
                        className="w-full h-11 px-4 rounded-xl bg-surface-container-low text-on-surface font-body-md text-sm focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
                        placeholder="등록된 정식 상호명 입력"
                        type="text"
                        value={companyNm}
                        onChange={(e) => setCompanyNm(e.target.value)}
                      />
                      <span className="absolute right-3.5 top-3 text-secondary material-symbols-outlined text-[18px]">check_circle</span>
                    </div>
                    <span className="font-label-sm text-on-surface-variant text-[11px]">사업자등록증에 기재된 상호와 일치해야 합니다.</span>
                  </div>

                  {/* 대표자명 */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-label-md text-on-surface flex items-center gap-1 text-sm font-bold">
                        대표자명 <span className="text-error">*</span>
                      </label>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container font-label-sm text-[11px] font-semibold">
                        <span className="material-symbols-outlined text-[13px]">verified</span> 본인확인 완료
                      </span>
                    </div>
                    <div className="relative">
                      <input 
                        className="w-full h-11 px-4 rounded-xl bg-surface-container-low text-on-surface font-body-md text-sm focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
                        type="text"
                        value={ceoNm}
                        onChange={(e) => setCeoNm(e.target.value)}
                      />
                      <span className="absolute right-3.5 top-3 text-on-surface-variant material-symbols-outlined text-[18px]">lock</span>
                    </div>
                    <span className="font-label-sm text-on-surface-variant text-[11px]">PASS/NICE 대표 본인 전자서명 인증 연동</span>
                  </div>

                  {/* 사업자등록번호 & 국세청 진위확인 */}
                  <div className="md:col-span-2 flex flex-col gap-1.5">
                    <label className="font-label-md text-on-surface flex items-center gap-1 text-sm font-bold">
                      사업자등록번호 <span className="text-error">*</span>
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <input 
                          className="w-full h-11 px-4 rounded-xl bg-surface-container-low text-on-surface font-body-md text-sm tracking-wider font-semibold focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
                          type="text"
                          value={bizRegNo}
                          onChange={(e) => setBizRegNo(e.target.value)}
                          placeholder="10자리 숫자 (- 포함/제외 무관)"
                        />
                        {isBizVerified && (
                          <span className="absolute right-3.5 top-3 text-secondary material-symbols-outlined text-[18px]">verified</span>
                        )}
                      </div>
                      <button 
                        type="button"
                        onClick={handleVerifyBizNo}
                        disabled={isVerifyingBiz}
                        className="h-11 px-4 rounded-xl bg-primary text-on-primary font-label-md text-sm flex items-center justify-center gap-1.5 hover:bg-primary-container transition-colors shadow-sm disabled:opacity-60"
                      >
                        <span className="material-symbols-outlined text-[18px]">{isVerifyingBiz ? 'progress_activity' : 'sync'}</span>
                        <span>{isVerifyingBiz ? '대조 확인 중...' : '국세청 진위확인 API'}</span>
                      </button>
                    </div>

                    {isBizVerified && (
                      <div className="mt-1 flex items-center gap-2 p-2.5 rounded-xl bg-secondary-container/40 text-on-secondary-container text-xs">
                        <span className="material-symbols-outlined text-[18px] text-secondary">task_alt</span>
                        <span className="font-semibold">
                          ✓ 국세청 정상 사업자 인증 완료 ({bizTaxType} • 부가가치세 정상 가동 상태)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 대표 연락처 */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-label-md text-on-surface flex items-center gap-1 text-sm font-bold">
                        대표 휴대폰 연락처 <span className="text-error">*</span>
                      </label>
                      <span className="font-label-sm text-secondary font-semibold text-[11px]">휴대폰 본인인증 완료</span>
                    </div>
                    <div className="relative">
                      <input 
                        className="w-full h-11 px-4 rounded-xl bg-surface-container-low text-on-surface font-body-md text-sm shadow-inner"
                        type="text"
                        value={ptnrTel}
                        onChange={(e) => setPtnrTel(e.target.value)}
                      />
                      <span className="absolute right-3.5 top-3 text-secondary material-symbols-outlined text-[18px]">check_circle</span>
                    </div>
                    <span className="font-label-sm text-on-surface-variant text-[11px]">긴급 배차 오더 및 정산 알림톡 수신 채널</span>
                  </div>

                  {/* 정산 입금 계좌 */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-md text-on-surface flex items-center gap-1 text-sm font-bold">
                      정산 은행 및 예금주 (대표자 일치) <span className="text-error">*</span>
                    </label>
                    <div className="relative">
                      <input 
                        className="w-full h-11 px-4 rounded-xl bg-surface-container text-on-surface font-body-md text-sm cursor-not-allowed"
                        readOnly
                        type="text"
                        value={bankInfo}
                      />
                      <span className="absolute right-3.5 top-3 text-secondary material-symbols-outlined text-[18px]">account_balance</span>
                    </div>
                    <span className="font-label-sm text-on-surface-variant text-[11px]">D+1 익일 에스크로 자동 입금 계좌</span>
                  </div>

                  {/* 로그인 계정 정보: 이메일 & 비밀번호 */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-md text-on-surface flex items-center gap-1 text-sm font-bold">
                      파트너 로그인 이메일 (ID) <span className="text-error">*</span>
                    </label>
                    <div className="relative">
                      <input 
                        className="w-full h-11 px-4 rounded-xl bg-surface-container-low text-on-surface font-body-md text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
                        type="email"
                        placeholder="partner@clean.com"
                        value={ptnrEmail}
                        onChange={(e) => setPtnrEmail(e.target.value)}
                      />
                      <span className="absolute right-3.5 top-3 text-on-surface-variant material-symbols-outlined text-[18px]">mail</span>
                    </div>
                    <span className="font-label-sm text-on-surface-variant text-[11px]">콘솔 로그인 시 사용할 대표 계정 이메일</span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-md text-on-surface flex items-center gap-1 text-sm font-bold">
                      로그인 비밀번호 <span className="text-error">*</span>
                    </label>
                    <div className="relative">
                      <input 
                        className="w-full h-11 px-4 rounded-xl bg-surface-container-low text-on-surface font-body-md text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
                        type="password"
                        placeholder="비밀번호 8자리 이상"
                        value={ptnrPassword}
                        onChange={(e) => setPtnrPassword(e.target.value)}
                      />
                      <span className="absolute right-3.5 top-3 text-on-surface-variant material-symbols-outlined text-[18px]">lock</span>
                    </div>
                    <span className="font-label-sm text-on-surface-variant text-[11px]">영문/숫자/특수문자 조합 8자리 이상</span>
                  </div>

                  {/* 사업장 소재지 */}
                  <div className="md:col-span-2 flex flex-col gap-1.5">
                    <label className="font-label-md text-on-surface flex items-center gap-1 text-sm font-bold">
                      사업장 등록 소재지 <span className="text-error">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input 
                        className="flex-1 h-11 px-4 rounded-xl bg-surface-container-low text-on-surface font-body-md text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                      />
                      <button 
                        type="button"
                        onClick={() => showToast('주소 검색 팝업 (준비됨)')}
                        className="h-11 px-4 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-sm transition-colors shadow-sm"
                      >
                        주소 재검색
                      </button>
                    </div>
                  </div>

                  {/* 주 시공 가능 지역 다중 선택 태그 */}
                  <div className="md:col-span-2 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="font-label-md text-on-surface flex items-center gap-1 text-sm font-bold">
                        주 시공 가능 지역 (우선 배차 구역) <span className="text-error">*</span>
                      </label>
                      <span className="font-label-sm text-on-surface-variant text-xs">최대 5개 구역 지정 가능</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-surface-container-low min-h-[48px] border border-surface-container">
                      {preferredAreas.map(area => (
                        <span 
                          key={area}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-on-primary font-label-md text-xs shadow-sm"
                        >
                          {area}
                          <button 
                            type="button"
                            onClick={() => handleRemoveArea(area)}
                            className="hover:text-primary-fixed material-symbols-outlined text-[15px]"
                          >
                            close
                          </button>
                        </span>
                      ))}

                      {preferredAreas.length < 5 && (
                        <button 
                          type="button"
                          onClick={() => setShowAddAreaModal(true)}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface-container-lowest hover:bg-surface-container text-on-surface font-label-md text-xs border-dashed border-2 border-outline-variant transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">add</span> 지역 추가
                        </button>
                      )}
                    </div>
                    <span className="font-label-sm text-on-surface-variant text-[11px]">지정한 구역의 긴급/정기 클리닝 콜이 우선적으로 푸시 배차됩니다.</span>
                  </div>
                </div>
              </div>

              {/* 3. Section 2: 필수 증빙 서류 및 보유 장비 업로드 */}
              <div className="bg-surface-container-lowest rounded-2xl p-6 md:p-8 shadow-sm border border-surface-container">
                <div className="flex items-center justify-between pb-4 mb-5 border-b border-surface-container">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-[20px]">upload_file</span>
                    </div>
                    <div className="flex flex-col">
                      <h3 className="font-headline-md text-on-surface font-extrabold text-lg">필수 증빙 서류 및 보유 전문 장비 인증</h3>
                      <span className="font-body-sm text-on-surface-variant text-xs">신뢰도 높은 정식 파트너 검증을 위해 사진 및 사본을 안전하게 암호화 보관합니다.</span>
                    </div>
                  </div>
                  <span className="hidden sm:inline-flex px-3 py-1 rounded bg-surface-container text-on-surface-variant font-label-sm text-xs">
                    보안 규격 ISO 27001 적용
                  </span>
                </div>

                {/* 4 Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Document 1: 사업자등록증 사본 (필수) */}
                  <div className="p-4 rounded-2xl bg-surface-container-low hover:bg-surface-container/60 transition-all shadow-sm flex flex-col justify-between border border-surface-container">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary text-[22px]">description</span>
                          <span className="font-headline-sm text-on-surface font-bold text-sm">사업자등록증 사본</span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-error/10 text-error font-label-sm text-xs font-bold">필수</span>
                      </div>
                      <p className="font-body-sm text-on-surface-variant text-xs mb-3">
                        최근 3개월 이내 발급본 또는 원본 스캔본 (PDF, JPG)
                      </p>

                      <div className="p-2.5 rounded-xl bg-surface-container-lowest flex items-center justify-between shadow-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="material-symbols-outlined text-secondary text-[20px] flex-shrink-0">check_circle</span>
                          <div className="flex flex-col min-w-0">
                            <span className="font-label-md text-on-surface truncate font-mono text-xs">{bizCertFile.name}</span>
                            <span className="font-label-sm text-on-surface-variant text-[11px]">{bizCertFile.size} • 국세청 정보 대조 완료</span>
                          </div>
                        </div>
                        <span className="font-label-sm text-secondary font-bold text-xs whitespace-nowrap">업로드 완료 ✓</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-4 pt-2 border-t border-surface-container text-xs">
                      <button 
                        type="button"
                        onClick={() => showToast(`미리보기: ${bizCertFile.name}`)}
                        className="font-label-sm text-on-surface-variant hover:text-primary transition-colors"
                      >
                        미리보기
                      </button>
                      <span className="text-outline-variant">•</span>
                      <button 
                        type="button"
                        onClick={() => showToast('파일 재선택 (준비됨)')}
                        className="font-label-sm text-primary font-bold hover:underline"
                      >
                        파일 재등록
                      </button>
                    </div>
                  </div>

                  {/* Document 2: 위생 자격증/수료증 사본 (선택) */}
                  <div className="p-4 rounded-2xl bg-surface-container-low hover:bg-surface-container/60 transition-all shadow-sm flex flex-col justify-between border border-surface-container">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary text-[22px]">workspace_premium</span>
                          <span className="font-headline-sm text-on-surface font-bold text-sm">위생 자격증 • 수료증</span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-label-sm text-xs font-semibold">선택 (우대)</span>
                      </div>
                      <p className="font-body-sm text-on-surface-variant text-xs mb-3">
                        건물위생관리업 신고필증, 방역소독 수료증, 클린마스터 1/2급 등
                      </p>

                      {licenseFile ? (
                        <div className="p-2.5 rounded-xl bg-surface-container-lowest flex items-center justify-between shadow-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="material-symbols-outlined text-secondary text-[20px] flex-shrink-0">check_circle</span>
                            <div className="flex flex-col min-w-0">
                              <span className="font-label-md text-on-surface truncate font-mono text-xs">{licenseFile.name}</span>
                              <span className="font-label-sm text-on-surface-variant text-[11px]">{licenseFile.size} • &apos;인증 마스터&apos; 뱃지 부여</span>
                            </div>
                          </div>
                          <span className="font-label-sm text-secondary font-bold text-xs whitespace-nowrap">업로드 완료 ✓</span>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-surface-container-lowest flex items-center justify-between text-xs text-on-surface-variant">
                          <span>등록된 자격증 서류가 없습니다.</span>
                          <button 
                            type="button" 
                            onClick={() => setLicenseFile({ name: '클린마스터1급_자격증.jpg', size: '2.4 MB', url: 'https://ssuldak.s3.ap-northeast-2.amazonaws.com/partner_docs/license_01.jpg' })}
                            className="text-primary font-bold hover:underline"
                          >
                            + 등록하기
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-4 pt-2 border-t border-surface-container text-xs">
                      <button 
                        type="button"
                        onClick={() => showToast(`미리보기: ${licenseFile?.name || '없음'}`)}
                        className="font-label-sm text-on-surface-variant hover:text-primary transition-colors"
                      >
                        미리보기
                      </button>
                      <span className="text-outline-variant">•</span>
                      <button 
                        type="button"
                        onClick={() => showToast('파일 재선택 (준비됨)')}
                        className="font-label-sm text-primary font-bold hover:underline"
                      >
                        파일 재등록
                      </button>
                    </div>
                  </div>

                  {/* Document 3: 영업배상책임보험 증권 사본 (필수) */}
                  <div className="p-4 rounded-2xl bg-surface-container-low hover:bg-surface-container/60 transition-all shadow-sm flex flex-col justify-between border border-surface-container">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-secondary text-[22px]">health_and_safety</span>
                          <span className="font-headline-sm text-on-surface font-bold text-sm">영업배상책임보험 증권</span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-error/10 text-error font-label-sm text-xs font-bold">필수</span>
                      </div>
                      <p className="font-body-sm text-on-surface-variant text-xs mb-3">
                        고객 기물 파손 방지용 보장한도 1억원 이상 필수 규정
                      </p>

                      <div className="p-2.5 rounded-xl bg-surface-container-lowest flex items-center justify-between shadow-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="material-symbols-outlined text-secondary text-[20px] flex-shrink-0">verified</span>
                          <div className="flex flex-col min-w-0">
                            <span className="font-label-md text-on-surface truncate font-mono text-xs">{insuranceFile.name}</span>
                            <span className="font-label-sm text-secondary font-bold text-[11px]">유효기간 2027.05.20 정상 확인</span>
                          </div>
                        </div>
                        <span className="font-label-sm text-secondary font-bold text-xs whitespace-nowrap">검증 완료 ✓</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-4 pt-2 border-t border-surface-container text-xs">
                      <button 
                        type="button"
                        onClick={() => showToast('보험 증권 상세 열람: KB영업배상 1억원')}
                        className="font-label-sm text-on-surface-variant hover:text-primary transition-colors"
                      >
                        보험증권 열람
                      </button>
                      <span className="text-outline-variant">•</span>
                      <button 
                        type="button"
                        onClick={() => showToast('갱신 등록 (준비됨)')}
                        className="font-label-sm text-primary font-bold hover:underline"
                      >
                        갱신 등록
                      </button>
                    </div>
                  </div>

                  {/* Document 4: 대표 보유 청소 장비 실물 사진 (필수) */}
                  <div className="p-4 rounded-2xl bg-surface-container-low hover:bg-surface-container/60 transition-all shadow-sm flex flex-col justify-between border border-surface-container">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary text-[22px]">cleaning_services</span>
                          <span className="font-headline-sm text-on-surface font-bold text-sm">보유 전문 장비 실물 사진</span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-error/10 text-error font-label-sm text-xs font-bold">필수 2장+</span>
                      </div>
                      <p className="font-body-sm text-on-surface-variant text-xs mb-3">
                        고압스팀기, 보네트 바닥광택기, 헤파필터 산업용 청소기 등
                      </p>

                      <div className="grid grid-cols-3 gap-2 mb-1">
                        {equipPhotoList.map((url, idx) => {
                          const labels = ['스팀기', '광택기', '집진기'];
                          return (
                            <div key={idx} className="relative h-14 rounded-lg overflow-hidden shadow-inner group">
                              <img className="w-full h-full object-cover" src={url} alt={`장비 ${idx + 1}`} />
                              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                <span className="text-white text-[10px] font-bold px-1.5 py-0.5 bg-primary/70 rounded">
                                  {labels[idx] || `장비 ${idx + 1}`}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-4 pt-2 border-t border-surface-container text-xs">
                      <span className="font-label-sm text-secondary font-bold text-xs">
                        장비 사진 {equipPhotoList.length}장 등록됨 ✓
                      </span>
                      <button 
                        type="button"
                        onClick={() => showToast('장비 사진 추가 업로드 (준비됨)')}
                        className="font-label-sm text-primary font-bold hover:underline"
                      >
                        + 사진 추가
                      </button>
                    </div>
                  </div>
                </div>

                {/* Drag and Drop Guidance Zone */}
                <div className="mt-4 p-4 rounded-xl bg-surface-container-lowest border-2 border-dashed border-outline-variant flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary-container">
                      <span className="material-symbols-outlined text-[24px]">cloud_upload</span>
                    </div>
                    <div>
                      <p className="font-headline-sm text-on-surface font-bold text-sm">추가 현장 포트폴리오 및 차량 래핑 사진 드래그 앤 드롭</p>
                      <p className="font-body-sm text-on-surface-variant text-xs">파일 형식: JPG, PNG, PDF (최대 50MB) • 스마트폰 현장 직접 촬영 업로드 가능</p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => showToast('파일 탐색기 열기 (준비됨)')}
                    className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-xs transition-colors shadow-sm"
                  >
                    내 PC 파일 찾기
                  </button>
                </div>
              </div>

              {/* 4. Section 3: 대표자 자필 전자서명 (Representative Signature) */}
              <div className="bg-surface-container-lowest rounded-2xl p-6 md:p-8 shadow-sm border border-surface-container">
                <div className="flex items-center justify-between pb-4 mb-5 border-b border-surface-container">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-[20px]">gesture</span>
                    </div>
                    <h3 className="font-headline-md text-on-surface font-extrabold text-lg">대표자 자필 전자서명 (파트너 표준 공정 계약용)</h3>
                  </div>
                  <span className="font-label-sm text-secondary font-bold text-xs flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">verified</span> 전자서명법 제3조 준용
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-label-md text-on-surface font-bold">
                      아래 서명 패드에 본인 정자로 서명해 주십시오 (마우스 또는 터치펜)
                    </span>
                    <span className="font-label-sm text-on-surface-variant">
                      서명자: <strong>{ceoNm} ({companyNm})</strong>
                    </span>
                  </div>

                  {/* 서명 패드 Canvas 영역 */}
                  <div className="relative w-full h-44 rounded-2xl bg-surface-container-low border-2 border-surface-container-highest overflow-hidden flex items-center justify-center select-none shadow-inner">
                    {/* Background Guide Lines */}
                    <div className="absolute inset-0 flex flex-col justify-evenly opacity-30 pointer-events-none">
                      <div className="w-full border-b border-dashed border-outline-variant"></div>
                      <div className="w-full border-b border-outline-variant"></div>
                      <div className="w-full border-b border-dashed border-outline-variant"></div>
                    </div>

                    <canvas
                      ref={canvasRef}
                      width={600}
                      height={176}
                      className="relative z-10 w-full h-full cursor-crosshair touch-none"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />

                    {/* Preloaded Realistic SVG Signature Overlay (서명 초기화 시 감춤) */}
                    {hasSignature && !isDrawing && (
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                        <svg className="w-72 h-32 text-primary fill-none stroke-current opacity-85" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" viewBox="0 0 300 120">
                          <path d="M 30 70 Q 55 25 75 45 T 90 90 Q 95 30 115 50 T 135 75 Q 160 30 185 60 T 210 75 Q 235 25 255 45 T 280 80"></path>
                          <path d="M 60 85 Q 130 95 240 70" strokeWidth="2.5"></path>
                          <path d="M 210 40 L 260 90" strokeWidth="3"></path>
                          <circle cx="270" cy="40" fill="currentColor" r="3"></circle>
                        </svg>
                      </div>
                    )}

                    <div className="absolute bottom-2 right-3 font-mono text-[11px] text-outline font-semibold tracking-wide pointer-events-none z-20">
                      DIGITAL SIGNED • {new Date().toISOString().slice(0, 10)} (NICE-HASH-88A9F)
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={clearSignature}
                        className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm text-xs flex items-center gap-1 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">refresh</span> 서명 초기화 (Clear)
                      </button>
                      <span className="font-label-sm text-on-surface-variant text-[11px]">자필 서명이 명확할수록 심사 승인이 신속합니다.</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setHasSignature(true);
                        showToast('✓ 전자서명이 정상 바인딩되었습니다.');
                      }}
                      className="px-4 py-1.5 rounded-lg bg-secondary text-on-secondary font-label-md text-xs flex items-center gap-1 shadow-sm font-bold"
                    >
                      <span className="material-symbols-outlined text-[16px]">check</span> 서명 등록 완료
                    </button>
                  </div>
                </div>

                {/* Terms Acknowledgment Checkboxes */}
                <div className="mt-6 pt-5 border-t border-surface-container flex flex-col gap-2.5">
                  <h4 className="font-headline-sm text-on-surface font-bold text-sm mb-1">입점 및 공정 거래 필수 약관 동의</h4>

                  {/* Checkbox 1 */}
                  <label className="flex items-start gap-3 p-3 rounded-xl bg-surface-container-low hover:bg-surface-container/60 cursor-pointer transition-colors border border-surface-container">
                    <input 
                      type="checkbox"
                      checked={terms.terms1}
                      onChange={(e) => setTerms(prev => ({ ...prev, terms1: e.target.checked }))}
                      className="mt-1 w-4 h-4 rounded text-primary accent-primary cursor-pointer"
                    />
                    <div className="flex flex-col min-w-0 flex-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-label-md text-on-surface font-bold">[필수] 쓸고닦고 파트너 이용약관 및 공정거래 준수 서약</span>
                        <a className="text-primary hover:underline text-[11px]" href="#partner-terms">전문보기</a>
                      </div>
                      <span className="font-body-sm text-on-surface-variant text-[11px] mt-0.5">
                        플랫폼 표준 파트너십 규약, 현장 안전 수칙 및 표준 청소 시공 지침을 엄수합니다.
                      </span>
                    </div>
                  </label>

                  {/* Checkbox 2 */}
                  <label className="flex items-start gap-3 p-3 rounded-xl bg-surface-container-low hover:bg-surface-container/60 cursor-pointer transition-colors border border-surface-container">
                    <input 
                      type="checkbox"
                      checked={terms.terms2}
                      onChange={(e) => setTerms(prev => ({ ...prev, terms2: e.target.checked }))}
                      className="mt-1 w-4 h-4 rounded text-primary accent-primary cursor-pointer"
                    />
                    <div className="flex flex-col min-w-0 flex-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-label-md text-on-surface font-bold">[필수] 에스크로 안전 결제 및 익일 자동 정산 규정 동의</span>
                        <a className="text-primary hover:underline text-[11px]" href="#escrow-policy">전문보기</a>
                      </div>
                      <span className="font-body-sm text-on-surface-variant text-[11px] mt-0.5">
                        고객 시공 검수 완료 후 D+1 영업일 14:00 등록 계좌로 미수금 없이 직입금 정산됩니다.
                      </span>
                    </div>
                  </label>

                  {/* Checkbox 3 */}
                  <label className="flex items-start gap-3 p-3 rounded-xl bg-surface-container-low hover:bg-surface-container/60 cursor-pointer transition-colors border border-surface-container">
                    <input 
                      type="checkbox"
                      checked={terms.terms3}
                      onChange={(e) => setTerms(prev => ({ ...prev, terms3: e.target.checked }))}
                      className="mt-1 w-4 h-4 rounded text-primary accent-primary cursor-pointer"
                    />
                    <div className="flex flex-col min-w-0 flex-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-label-md text-on-surface font-bold">[필수] 고객 시공 하자에 대한 100% 무상 AS 및 배상책임보험 적용 동의</span>
                        <a className="text-primary hover:underline text-[11px]" href="#insurance-policy">전문보기</a>
                      </div>
                      <span className="font-body-sm text-on-surface-variant text-[11px] mt-0.5">
                        시공 후 72시간 내 고객 불만 접수 시 1차 무상 재방문 AS 및 사고 발생 시 보험 전산 처리에 동의합니다.
                      </span>
                    </div>
                  </label>

                  {/* Checkbox 4 (선택) */}
                  <label className="flex items-start gap-3 p-3 rounded-xl bg-surface-container-low hover:bg-surface-container/60 cursor-pointer transition-colors border border-surface-container">
                    <input 
                      type="checkbox"
                      checked={terms.terms4}
                      onChange={(e) => setTerms(prev => ({ ...prev, terms4: e.target.checked }))}
                      className="mt-1 w-4 h-4 rounded text-primary accent-primary cursor-pointer"
                    />
                    <div className="flex flex-col min-w-0 flex-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-label-md text-on-surface font-bold">[선택] 신규 기업/빌라 단체 오더 우선 배차 알림톡 수신 동의</span>
                        <span className="px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container font-label-sm text-[11px]">수주율 45% 상승</span>
                      </div>
                      <span className="font-body-sm text-on-surface-variant text-[11px] mt-0.5">
                        오피스 정기 관리 및 건물 단위 프리미엄 오더 발생 시 즉시 카카오 알림톡 우선 수신
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* ================= RIGHT COLUMN: STICKY SIDEBAR (lg:col-span-4) ================= */}
            <div className="lg:col-span-4 flex flex-col gap-4 lg:sticky lg:top-20">
              {/* 1. 입점 신청 요약 카드 */}
              <div className="bg-surface-container-lowest rounded-2xl p-5 md:p-6 shadow-sm border border-surface-container">
                <div className="flex items-center justify-between pb-3 border-b border-surface-container mb-3">
                  <span className="font-label-md text-primary font-extrabold uppercase tracking-wider text-xs">신청 현황 요약</span>
                  <span className="inline-flex items-center gap-1 font-label-sm text-secondary font-bold text-xs">
                    <span className="w-2 h-2 rounded-full bg-secondary"></span> 심사 대기 준비
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="flex flex-col gap-1.5 mb-4">
                  <div className="flex items-center justify-between font-label-sm text-xs">
                    <span className="text-on-surface font-bold">신청서 작성 진행도</span>
                    <span className="text-secondary font-extrabold font-mono">100% 완료</span>
                  </div>
                  <div className="w-full h-2.5 bg-surface-container rounded-full overflow-hidden">
                    <div className="h-full bg-secondary rounded-full transition-all duration-500 w-full"></div>
                  </div>
                </div>

                {/* Promotion Value Box */}
                <div className="p-3 rounded-xl bg-surface-container-low mb-4 flex items-center justify-between border border-surface-container">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary text-[24px]">redeem</span>
                    <div className="flex flex-col">
                      <span className="font-label-sm text-on-surface-variant text-[11px]">신청 즉시 지급 혜택</span>
                      <span className="font-headline-sm text-primary font-bold text-sm">첫 배차 무료 쿠폰</span>
                    </div>
                  </div>
                  <span className="font-headline-sm text-secondary font-extrabold text-sm md:text-base">33,000원 상당</span>
                </div>

                {/* 심사 절차 안내 (4 Steps) */}
                <div className="flex flex-col gap-2.5 pt-1 mb-5 text-xs">
                  <span className="font-label-sm text-on-surface-variant uppercase font-bold tracking-wider text-[11px]">
                    심사 및 배차 개시 절차
                  </span>

                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-primary-container text-on-primary font-label-sm flex items-center justify-center font-bold flex-shrink-0 mt-0.5 text-xs">
                      1
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-md text-on-surface font-bold">신청서 및 증빙 서류 접수</span>
                      <span className="font-body-sm text-on-surface-variant text-[11px]">온라인 원스톱 즉시 접수 (오늘 완료)</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-surface-container text-primary font-label-sm flex items-center justify-center font-bold flex-shrink-0 mt-0.5 text-xs">
                      2
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-md text-on-surface font-bold">서류 검토 및 자격 검증</span>
                      <span className="font-body-sm text-secondary font-semibold text-[11px]">평균 4시간 소요 (최대 24시간 이내)</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-surface-container text-primary font-label-sm flex items-center justify-center font-bold flex-shrink-0 mt-0.5 text-xs">
                      3
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-md text-on-surface font-bold">웰컴 키트 발송 &amp; 콘솔 승인</span>
                      <span className="font-body-sm text-on-surface-variant text-[11px]">인증 명찰 • 전용 유니폼 • 모바일 앱 오픈</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-surface-container text-primary font-label-sm flex items-center justify-center font-bold flex-shrink-0 mt-0.5 text-xs">
                      4
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-md text-on-surface font-bold">첫 배차 오더 수신 및 시공 개시</span>
                      <span className="font-body-sm text-on-surface-variant text-[11px]">무료 쿠폰 자동 적용으로 첫 수익 100% 수령</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action CTA Button */}
                <div className="pt-2 border-t border-surface-container">
                  <button 
                    type="button"
                    onClick={handleSubmitApplication}
                    disabled={isSubmitting}
                    className="w-full py-3.5 px-4 rounded-xl bg-primary hover:bg-primary-container active:scale-[0.99] text-on-primary font-headline-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-60 text-sm md:text-base"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                        <span>입점 서류 처리 중...</span>
                      </>
                    ) : (
                      <span>🎁 입점 신청서 제출하고 무료 쿠폰 받기</span>
                    )}
                  </button>
                  <p className="font-body-sm text-center text-on-surface-variant mt-2 text-[11px] leading-tight">
                    제출 즉시 기재하신 휴대폰 번호로 <strong className="text-on-surface">카카오 알림톡 접수증</strong>이 발송됩니다.
                  </p>
                </div>
              </div>

              {/* 2. 파트너 안심 보증 패널 */}
              <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-surface-container">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-secondary text-[22px]">verified_user</span>
                  <h4 className="font-headline-sm text-on-surface font-bold text-sm">쓸고닦고 파트너 3대 안심 보증</h4>
                </div>

                <div className="flex flex-col gap-2.5 text-xs">
                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-surface-container-low border border-surface-container">
                    <span className="w-6 h-6 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-label-sm font-bold flex-shrink-0 text-xs">
                      1
                    </span>
                    <div className="flex flex-col">
                      <span className="font-label-md text-on-surface font-bold">D+1 무사고 익일 정산 보장</span>
                      <span className="font-body-sm text-on-surface-variant text-[11px]">시공 다음 날 오후 2시 계좌로 100% 입금</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-surface-container-low border border-surface-container">
                    <span className="w-6 h-6 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-label-sm font-bold flex-shrink-0 text-xs">
                      2
                    </span>
                    <div className="flex flex-col">
                      <span className="font-label-md text-on-surface font-bold">고객 노쇼 100% 위약금 전액 지급</span>
                      <span className="font-body-sm text-on-surface-variant text-[11px]">현장 도착 후 고객 취소 시 기본 보상금 즉시 정산</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-surface-container-low border border-surface-container">
                    <span className="w-6 h-6 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-label-sm font-bold flex-shrink-0 text-xs">
                      3
                    </span>
                    <div className="flex flex-col">
                      <span className="font-label-md text-on-surface font-bold">미수금 제로 에스크로 플랫폼</span>
                      <span className="font-body-sm text-on-surface-variant text-[11px]">청소비 사전 예치 시스템으로 결제 펑크 원천 차단</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. 파트너 전담 지원팀 위젯 */}
              <div className="bg-surface-container-low rounded-2xl p-5 shadow-sm border border-surface-container">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-label-sm text-on-surface-variant uppercase font-bold tracking-wider text-[11px]">신속 입점 상담 지원</span>
                  <span className="px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container font-label-sm font-bold text-[11px]">24H 현장대응</span>
                </div>
                <div className="flex items-baseline gap-1.5 mb-1">
                  <span className="font-headline-lg text-primary font-extrabold tracking-tight text-xl">1588-0000</span>
                  <span className="font-label-sm text-on-surface-variant text-xs">(내선 2번: 파트너 등록팀)</span>
                </div>
                <p className="font-body-sm text-on-surface-variant text-xs mb-3">
                  평일 07:00 ~ 19:00 • 주말 및 공휴일 긴급 현장 오더 실시간 지원
                </p>
                <button 
                  type="button"
                  onClick={() => showToast('카카오톡 @쓸고닦고파트너 실시간 채널 연결')}
                  className="w-full py-2.5 px-3 rounded-xl bg-surface-container-lowest hover:bg-surface-container text-on-surface font-label-md text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs font-bold"
                >
                  <span className="material-symbols-outlined text-[18px] text-tertiary">chat</span>
                  <span>카카오톡 파트너 실시간 1:1 채팅 문의</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Security Assurance Banner */}
          <div className="mt-10 p-6 rounded-2xl bg-surface-container flex flex-col md:flex-row items-center justify-between gap-4 border border-surface-container-high">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-on-primary flex-shrink-0">
                <span className="material-symbols-outlined text-[24px]">security</span>
              </div>
              <div className="flex flex-col">
                <h4 className="font-headline-sm text-primary font-bold text-sm md:text-base">파트너 등록 정보 암호화 보호 및 허위 입점 방지</h4>
                <p className="font-body-sm text-on-surface-variant text-xs">
                  제출하신 사업자등록증 및 자격 서류는 본인 인증 및 입점 심사 목적 외에는 일체 사용되지 않으며, 개인정보보호법에 의거 256bit 암호화 격리 저장됩니다.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 text-xs text-outline font-semibold">
              <span>KISA ISMS 인증 완료</span>
              <span>•</span>
              <span>국세청 실시간 대조 연동</span>
            </div>
          </div>
        </div>
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="w-full bg-surface-container-low shadow-[0_-4px_16px_rgba(22,59,102,0.02)] border-t border-surface-container mt-12">
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs text-on-surface-variant">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="font-headline-sm text-primary font-bold text-sm">SsulDak Enterprise Partners</span>
              <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-label-sm text-[11px]">Verified Fleet</span>
            </div>
            <p className="font-body-sm text-on-surface-variant text-xs">
              공간 위생 인프라, 환경 위생 인증 솔루션, 체계적인 시공 매칭 프로세스.
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[11px]">
              <span>Emergency Hotline: 1588-0000</span>
              <span>Operating Hours: 24/7 On-Call Support</span>
              <span>Compliance: ISO 9001/14001 Registered</span>
            </div>
          </div>

          <div className="flex flex-col items-start md:items-end gap-1">
            <div className="flex items-center gap-3 font-label-sm text-xs">
              <a className="hover:text-on-surface transition-colors" href="#terms">파트너 이용약관</a>
              <a className="hover:text-on-surface transition-colors" href="#privacy">보안 및 개인정보처리방침</a>
              <a className="text-primary hover:underline font-bold cursor-pointer" onClick={() => nav('#partner-login')}>
                파트너 로그인 포털
              </a>
            </div>
            <p className="font-label-sm text-outline text-[11px]">© 2026 SsulDak Co., Ltd. Operations Network. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* ================= MODAL: 입점 신청 완료 모달 ================= */}
      {successModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-container-lowest rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-surface-container-high space-y-5 animate-scale-up">
            <div className="w-16 h-16 rounded-2xl bg-secondary-container text-on-secondary-container flex items-center justify-center mx-auto shadow-sm">
              <span className="material-symbols-outlined text-[36px] text-secondary">celebration</span>
            </div>

            <div className="text-center space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-secondary"></span>
                입점 신청 접수 완료 (PENDING)
              </span>
              <h3 className="font-headline-lg text-primary font-extrabold text-xl">
                전문 파트너 입점 신청이 완료되었습니다!
              </h3>
              <p className="font-body-md text-on-surface-variant text-xs leading-relaxed">
                {successModal.message}
              </p>
            </div>

            {/* Issued Info Card */}
            <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant font-medium">파트너 식별 번호</span>
                <span className="font-bold text-primary font-mono text-sm">{successModal.ptnrNo}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant font-medium">심사 상태</span>
                <span className="font-bold text-secondary">서류 심사 진행 중 (24H 이내)</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-surface-container">
                <span className="text-on-surface-variant font-medium">웰컴 무료 쿠폰</span>
                <span className="font-bold text-primary">첫 배차 100% 무료 (33,000원 상당) 예약</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSuccessModal(prev => ({ ...prev, isOpen: false }));
                  nav('#partner-login');
                }}
                className="w-full py-3.5 px-4 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-headline-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all text-sm"
              >
                <span>파트너 로그인 포털로 이동 (PTNR-ATH-00)</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: 지역 추가 팝업 ================= */}
      {showAddAreaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-surface-container-lowest rounded-2xl p-5 max-w-sm w-full shadow-xl border border-surface-container space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-headline-sm text-primary font-bold text-sm">주 시공 가능 지역 추가</h4>
              <button 
                type="button" 
                onClick={() => setShowAddAreaModal(false)}
                className="text-on-surface-variant hover:text-on-surface material-symbols-outlined text-[20px]"
              >
                close
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="font-label-sm text-on-surface-variant text-xs">시/군/구 구역명</label>
              <input 
                type="text"
                value={newAreaInput}
                onChange={(e) => setNewAreaInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddArea()}
                placeholder="예: 서울 강남구, 경기 김포시"
                className="w-full h-10 px-3 rounded-lg bg-surface-container-low text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddAreaModal(false)}
                className="px-3 py-1.5 rounded-lg bg-surface-container text-on-surface text-xs font-medium"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleAddArea}
                className="px-4 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-bold"
              >
                추가하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= TOAST NOTIFICATION ================= */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-slate-900 text-white font-label-md text-xs shadow-xl flex items-center gap-2 animate-bounce-short">
          <span className="material-symbols-outlined text-[18px] text-secondary-fixed">info</span>
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
};

export default PtnrAth01Screen;
