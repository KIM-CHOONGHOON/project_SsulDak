import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import UserCom00Screen from '../SsulDak_Web/User/frontend/USER-COM-00/index.tsx';
import UserAth00Screen from '../SsulDak_Web/User/frontend/USER-ATH-00/index.tsx';
import UserAth01Screen from '../SsulDak_Web/User/frontend/USER-ATH-01/index.tsx';
import UserAth02Screen from '../SsulDak_Web/User/frontend/USER-ATH-02/index.tsx';
import UserAth03Screen from '../SsulDak_Web/User/frontend/USER-ATH-03/index.tsx';
import UserReq00Screen from '../SsulDak_Web/User/frontend/USER-REQ-00/index.tsx';
import UserReq01Modal, { RegularItemToAdd } from '../SsulDak_Web/User/frontend/USER-REQ-01/index.tsx';
import UserReq02Modal, { ApplianceItemToAdd } from '../SsulDak_Web/User/frontend/USER-REQ-02/index.tsx';
import UserReq03Modal, { SelectedAddress } from '../SsulDak_Web/User/frontend/USER-REQ-03/index.tsx';
import UserReq04Modal, { SitePhotoItem } from '../SsulDak_Web/User/frontend/USER-REQ-04/index.tsx';
import UserQot00Screen from '../SsulDak_Web/User/frontend/USER-QOT-00/index.tsx';
import UserQot01Screen from '../SsulDak_Web/User/frontend/USER-QOT-01/index.tsx';
import UserQot02Screen from '../SsulDak_Web/User/frontend/USER-QOT-02/index.tsx';
import UserCnt00Screen from '../SsulDak_Web/User/frontend/USER-CNT-00/index.tsx';
import UserCnt01Screen from '../SsulDak_Web/User/frontend/USER-CNT-01/index.tsx';
import UserCnt02Screen from '../SsulDak_Web/User/frontend/USER-CNT-02/index.tsx';
import UserHis00Screen from '../SsulDak_Web/User/frontend/USER-HIS-00/index.tsx';
import UserHis01Screen from '../SsulDak_Web/User/frontend/USER-HIS-01/index.tsx';
import UserHis02Screen from '../SsulDak_Web/User/frontend/USER-HIS-02/index.tsx';
import UserMyp00Screen from '../SsulDak_Web/User/frontend/USER-MYP-00/index.tsx';
import UserMyp01Screen from '../SsulDak_Web/User/frontend/USER-MYP-01/index.tsx';
import PtnrAth00Screen from '../SsulDak_Web/Partner/frontend/PTNR-ATH-00/index.tsx';
import PtnrAth01Screen from '../SsulDak_Web/Partner/frontend/PTNR-ATH-01/index.tsx';
import PtnrDsh00Screen from '../SsulDak_Web/Partner/frontend/PTNR-DSH-00/index.tsx';
import PtnrDsh01Screen from '../SsulDak_Web/Partner/frontend/PTNR-DSH-01/index.tsx';
import PtnrDsh02Screen from '../SsulDak_Web/Partner/frontend/PTNR-DSH-02/index.tsx';
import PtnrQot00Screen from '../SsulDak_Web/Partner/frontend/PTNR-QOT-00/index.tsx';
import PtnrQot01Screen from '../SsulDak_Web/Partner/frontend/PTNR-QOT-01/index.tsx';
import PtnrQot02Screen from '../SsulDak_Web/Partner/frontend/PTNR-QOT-02/index.tsx';
import PtnrJob00Screen from '../SsulDak_Web/Partner/frontend/PTNR-JOB-00/index.tsx';
import PtnrJob01Screen from '../SsulDak_Web/Partner/frontend/PTNR-JOB-01/index.tsx';
import PtnrJob02Screen from '../SsulDak_Web/Partner/frontend/PTNR-JOB-02/index.tsx';
import PtnrSet00Screen from '../SsulDak_Web/Partner/frontend/PTNR-SET-00/index.tsx';
import PtnrSet01Screen from '../SsulDak_Web/Partner/frontend/PTNR-SET-01/index.tsx';
import AdmnAth00Screen from '../SsulDak_Web/Admin/frontend/ADMN-ATH-00/index.tsx';
import AdmnDsh00Screen from '../SsulDak_Web/Admin/frontend/ADMN-DSH-00/index.tsx';
import AdmnPrm00Screen from '../SsulDak_Web/Admin/frontend/ADMN-PRM-00/index.tsx';
import AdmnPrm01Modal from '../SsulDak_Web/Admin/frontend/ADMN-PRM-01/index.tsx';
import AdmnSys01Screen from '../SsulDak_Web/Admin/frontend/ADMN-SYS-01/index.tsx';
import AdmnSys02Screen from '../SsulDak_Web/Admin/frontend/ADMN-SYS-02/index.tsx';

type ScreenId = 'USER-COM-00' | 'USER-ATH-00' | 'USER-ATH-01' | 'USER-ATH-02' | 'USER-ATH-03' | 'USER-REQ-00' | 'USER-REQ-01' | 'USER-REQ-02' | 'USER-REQ-03' | 'USER-REQ-04' | 'USER-QOT-00' | 'USER-QOT-01' | 'USER-QOT-02' | 'USER-CNT-00' | 'USER-CNT-01' | 'USER-CNT-02' | 'USER-HIS-00' | 'USER-HIS-01' | 'USER-HIS-02' | 'USER-MYP-00' | 'USER-MYP-01' | 'USER-MYP-02' | 'PTNR-ATH-00' | 'PTNR-ATH-01' | 'PTNR-DSH-00' | 'PTNR-DSH-01' | 'PTNR-DSH-02' | 'PTNR-QOT-00' | 'PTNR-QOT-01' | 'PTNR-QOT-02' | 'PTNR-JOB-00' | 'PTNR-JOB-01' | 'PTNR-JOB-02' | 'PTNR-SET-00' | 'PTNR-SET-01' | 'ADMN-ATH-00' | 'ADMN-DSH-00' | 'ADMN-PRM-00' | 'ADMN-PRM-01' | 'ADMN-SYS-01' | 'ADMN-SYS-02';

function AppPreview() {
  // 초기 화면 판별 (URL 해시 또는 쿼리스트링)
  const getInitialScreen = (): ScreenId => {
    if (typeof window === 'undefined') return 'USER-COM-00';
    const hash = window.location.hash.toLowerCase();
    const search = window.location.search.toLowerCase();
    if (hash.includes('admn-sys-02') || hash.includes('floor-price') || search.includes('screen=admn-sys-02')) {
      return 'ADMN-SYS-02';
    }
    if (hash.includes('admn-sys-01') || hash.includes('codes') || hash.includes('policy') || search.includes('screen=admn-sys-01')) {
      return 'ADMN-SYS-01';
    }
    if (hash.includes('admn-prm-01') || hash.includes('airdrop') || search.includes('screen=admn-prm-01')) {
      return 'ADMN-PRM-01';
    }
    if (hash.includes('admn-prm-00') || hash.includes('promotions') || hash.includes('coupons') || hash.includes('admn-prm') || search.includes('screen=admn-prm-00')) {
      return 'ADMN-PRM-00';
    }
    if (hash.includes('admn-dsh-00') || hash.includes('admin-dashboard') || hash.includes('admn-dsh') || search.includes('screen=admn-dsh-00')) {
      return 'ADMN-DSH-00';
    }
    if (hash.includes('admn-ath-00') || hash.includes('admin-login') || hash.includes('admin') || search.includes('screen=admn-ath-00')) {
      return 'ADMN-ATH-00';
    }
    if (hash.includes('his-02') || hash.includes('user-his-02') || hash.includes('review') || search.includes('screen=user-his-02')) {
      return 'USER-HIS-02';
    }
    if (hash.includes('his-01') || hash.includes('user-his-01') || hash.includes('inspection') || search.includes('screen=user-his-01')) {
      return 'USER-HIS-01';
    }
    if (hash.includes('his-00') || hash.includes('user-his-00') || hash.includes('history') || search.includes('screen=user-his-00')) {
      return 'USER-HIS-00';
    }
    if (hash.includes('cnt-02') || hash.includes('user-cnt-02') || hash.includes('payment-fail') || hash.includes('fail') || search.includes('screen=user-cnt-02')) {
      return 'USER-CNT-02';
    }
    if (hash.includes('cnt-01') || hash.includes('user-cnt-01') || hash.includes('payment-complete') || hash.includes('paid') || search.includes('screen=user-cnt-01')) {
      return 'USER-CNT-01';
    }
    if (hash.includes('cnt-00') || hash.includes('user-cnt-00') || hash.includes('contract') || hash.includes('payment') || search.includes('screen=user-cnt-00')) {
      return 'USER-CNT-00';
    }
    if (hash.includes('ptnr-set-01') || hash.includes('tax-invoice') || hash.includes('settlement-tax') || search.includes('screen=ptnr-set-01')) {
      return 'PTNR-SET-01';
    }
    if (hash.includes('ptnr-set-00') || hash.includes('settlement') || search.includes('screen=ptnr-set-00')) {
      return 'PTNR-SET-00';
    }
    if (hash.includes('ptnr-job-02') || hash.includes('partner-chat') || search.includes('screen=ptnr-job-02')) {
      return 'PTNR-JOB-02';
    }
    if (hash.includes('ptnr-job-01') || hash.includes('work-status') || hash.includes('inspection-report') || search.includes('screen=ptnr-job-01')) {
      return 'PTNR-JOB-01';
    }
    if (hash.includes('ptnr-job-00') || hash.includes('job-management') || hash.includes('partner-jobs') || search.includes('screen=ptnr-job-00')) {
      return 'PTNR-JOB-00';
    }
    if (hash.includes('ptnr-qot-02') || hash.includes('submit-bid') || search.includes('screen=ptnr-qot-02')) {
      return 'PTNR-QOT-02';
    }
    if (hash.includes('ptnr-qot-01') || hash.includes('order-detail') || hash.includes('req-detail') || search.includes('screen=ptnr-qot-01')) {
      return 'PTNR-QOT-01';
    }
    if (hash.includes('ptnr-qot-00') || hash.includes('partner-orders') || hash.includes('partner-tender') || search.includes('screen=ptnr-qot-00')) {
      return 'PTNR-QOT-00';
    }
    if (hash.includes('qot-02') || hash.includes('user-qot-02') || hash.includes('chat') || search.includes('screen=user-qot-02')) {
      return 'USER-QOT-02';
    }
    if (hash.includes('qot-01') || hash.includes('user-qot-01') || hash.includes('partner-profile') || search.includes('screen=user-qot-01')) {
      return 'USER-QOT-01';
    }
    if (hash.includes('qot-00') || hash.includes('user-qot-00') || hash.includes('quote-status') || search.includes('screen=user-qot-00')) {
      return 'USER-QOT-00';
    }
    if (hash.includes('req-04') || hash.includes('user-req-04') || search.includes('screen=user-req-04')) {
      return 'USER-REQ-04';
    }
    if (hash.includes('req-03') || hash.includes('user-req-03') || search.includes('screen=user-req-03')) {
      return 'USER-REQ-03';
    }
    if (hash.includes('req-02') || hash.includes('user-req-02') || search.includes('screen=user-req-02')) {
      return 'USER-REQ-02';
    }
    if (hash.includes('req-01') || hash.includes('user-req-01') || search.includes('screen=user-req-01')) {
      return 'USER-REQ-01';
    }
    if (hash.includes('req-00') || hash.includes('clean-req') || hash.includes('user-req-00') || search.includes('screen=user-req-00')) {
      return 'USER-REQ-00';
    }
    if (hash.includes('myp-02') || hash.includes('user-myp-02') || hash.includes('coupon') || search.includes('screen=user-myp-02')) {
      return 'USER-MYP-02';
    }
    if (hash.includes('myp-01') || hash.includes('user-myp-01') || hash.includes('profile-edit') || search.includes('screen=user-myp-01')) {
      return 'USER-MYP-01';
    }
    if (hash.includes('myp-00') || hash.includes('user-myp-00') || hash.includes('mypage') || hash.includes('my-page') || search.includes('screen=user-myp-00')) {
      return 'USER-MYP-00';
    }
    if (hash.includes('profile') || hash.includes('user-ath-03') || search.includes('screen=user-ath-03')) {
      return 'USER-ATH-03';
    }
    if (hash.includes('find') || hash.includes('reset') || hash.includes('user-ath-02') || search.includes('screen=user-ath-02')) {
      return 'USER-ATH-02';
    }
    if (hash.includes('signup') || hash.includes('register') || hash.includes('user-ath-01') || search.includes('screen=user-ath-01')) {
      return 'USER-ATH-01';
    }
    if (hash.includes('ptnr-qot-00') || hash.includes('partner-orders') || hash.includes('partner-tender') || search.includes('screen=ptnr-qot-00')) {
      return 'PTNR-QOT-00';
    }
    if (hash.includes('partner-profile') || hash.includes('ptnr-dsh-02') || hash.includes('partner-portfolio') || search.includes('screen=ptnr-dsh-02')) {
      return 'PTNR-DSH-02';
    }

    if (hash.includes('partner-profile-settings') || hash.includes('ptnr-dsh-01') || hash.includes('partner-region') || hash.includes('partner-settings') || search.includes('screen=ptnr-dsh-01')) {
      return 'PTNR-DSH-01';
    }
    if (hash.includes('partner-dashboard') || hash.includes('ptnr-dsh-00') || hash.includes('ptnr-com-00') || search.includes('screen=ptnr-dsh-00')) {
      return 'PTNR-DSH-00';
    }
    if (hash.includes('ptnr-ath-01') || hash.includes('partner-join') || hash.includes('partner-apply') || search.includes('screen=ptnr-ath-01')) {
      return 'PTNR-ATH-01';
    }
    if (hash.includes('ptnr-ath-00') || hash.includes('partner-login') || hash.includes('partner') || search.includes('screen=ptnr-ath-00')) {
      return 'PTNR-ATH-00';
    }
    if (hash.includes('login') || hash.includes('user-ath-00') || search.includes('screen=user-ath-00')) {
      return 'USER-ATH-00';
    }
    return 'USER-COM-00';
  };

  const [currentScreen, setCurrentScreen] = useState<ScreenId>(getInitialScreen);
  const [currentUserNo, setCurrentUserNo] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('ssuldak_user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (parsed && parsed.userNo) return parsed.userNo;
        } catch {
          // ignore
        }
      }
    }
    return 'U20261000001';
  });

  const [partnerParams, setPartnerParams] = useState<{
    ptnrNo?: string;
    bidNo?: string;
    slotNo?: string;
    reqNo?: string;
  }>({
    ptnrNo: 'P20260900012',
    bidNo: 'BID2026102200001',
    slotNo: 'REQ202610210001-01',
    reqNo: 'REQ202610210001',
  });

  const [contractParams, setContractParams] = useState<{
    contractNo?: string;
    payNo?: string;
  }>({
    contractNo: 'CT2026102100001',
    payNo: 'PAY2026102100001',
  });

  const [failParams, setFailParams] = useState<{
    errorCode?: string;
    errorMsg?: string;
    couponNo?: string | null;
    usePointAmt?: number;
    attemptedPaidAmt?: number;
  }>({
    errorCode: 'PG_CARD_LIMIT',
    errorMsg: '카드 한도 초과 또는 잔액 부족',
    couponNo: 'CPN202610000001',
    usePointAmt: 2000,
    attemptedPaidAmt: 26000,
  });

  const [showPreviewBar, setShowPreviewBar] = useState(false);

  // URL 해시 및 뒤로가기/앞으로가기 동기화
  useEffect(() => {
    const handleLocationChange = () => {
      const hash = window.location.hash.toLowerCase();
      const search = window.location.search.toLowerCase();
      if (hash.includes('admn-sys-02') || hash.includes('floor-price') || search.includes('screen=admn-sys-02')) {
        setCurrentScreen('ADMN-SYS-02');
      } else if (hash.includes('admn-sys-01') || hash.includes('codes') || hash.includes('policy-codes') || search.includes('screen=admn-sys-01')) {
        setCurrentScreen('ADMN-SYS-01');
      } else if (hash.includes('admn-prm-01') || hash.includes('airdrop') || search.includes('screen=admn-prm-01')) {
        setCurrentScreen('ADMN-PRM-01');
      } else if (hash.includes('admn-prm-00') || hash.includes('promotions') || search.includes('screen=admn-prm-00')) {
        setCurrentScreen('ADMN-PRM-00');
      } else if (hash.includes('admn-dsh-00') || hash.includes('admin-dashboard') || search.includes('screen=admn-dsh-00')) {
        setCurrentScreen('ADMN-DSH-00');
      } else if (hash.includes('admn-ath-00') || hash.includes('admin-login') || search.includes('screen=admn-ath-00')) {
        setCurrentScreen('ADMN-ATH-00');
      } else if (hash.includes('his-02') || hash.includes('user-his-02') || hash.includes('review') || search.includes('screen=user-his-02')) {
        setCurrentScreen('USER-HIS-02');
      } else if (hash.includes('his-01') || hash.includes('user-his-01') || hash.includes('inspection') || search.includes('screen=user-his-01')) {
        setCurrentScreen('USER-HIS-01');
      } else if (hash.includes('his-00') || hash.includes('user-his-00') || hash.includes('history') || search.includes('screen=user-his-00')) {
        setCurrentScreen('USER-HIS-00');
      } else if (hash.includes('cnt-02') || hash.includes('user-cnt-02') || hash.includes('payment-fail') || hash.includes('fail') || search.includes('screen=user-cnt-02')) {
        setCurrentScreen('USER-CNT-02');
      } else if (hash.includes('cnt-01') || hash.includes('user-cnt-01') || hash.includes('payment-complete') || hash.includes('paid') || search.includes('screen=user-cnt-01')) {
        setCurrentScreen('USER-CNT-01');
      } else if (hash.includes('cnt-00') || hash.includes('user-cnt-00') || hash.includes('contract') || hash.includes('payment') || search.includes('screen=user-cnt-00')) {
        setCurrentScreen('USER-CNT-00');
      } else if (hash.includes('ptnr-set-01') || hash.includes('tax-invoice') || hash.includes('settlement-tax') || search.includes('screen=ptnr-set-01')) {
        setCurrentScreen('PTNR-SET-01');
      } else if (hash.includes('ptnr-set-00') || hash.includes('settlement') || search.includes('screen=ptnr-set-00')) {
        setCurrentScreen('PTNR-SET-00');
      } else if (hash.includes('ptnr-job-02') || hash.includes('partner-chat') || search.includes('screen=ptnr-job-02')) {
        setCurrentScreen('PTNR-JOB-02');
      } else if (hash.includes('ptnr-job-01') || hash.includes('work-status') || hash.includes('inspection-report') || search.includes('screen=ptnr-job-01')) {
        setCurrentScreen('PTNR-JOB-01');
      } else if (hash.includes('ptnr-job-00') || hash.includes('job-management') || hash.includes('partner-jobs') || search.includes('screen=ptnr-job-00')) {
        setCurrentScreen('PTNR-JOB-00');
      } else if (hash.includes('ptnr-qot-02') || hash.includes('submit-bid') || search.includes('screen=ptnr-qot-02')) {
        setCurrentScreen('PTNR-QOT-02');
      } else if (hash.includes('ptnr-qot-01') || hash.includes('order-detail') || hash.includes('req-detail') || search.includes('screen=ptnr-qot-01')) {
        setCurrentScreen('PTNR-QOT-01');
      } else if (hash.includes('ptnr-qot-00') || hash.includes('partner-orders') || hash.includes('partner-tender') || search.includes('screen=ptnr-qot-00')) {
        setCurrentScreen('PTNR-QOT-00');
      } else if (hash.includes('qot-02') || hash.includes('user-qot-02') || hash.includes('chat') || search.includes('screen=user-qot-02')) {
        setCurrentScreen('USER-QOT-02');
      } else if (hash.includes('qot-01') || hash.includes('user-qot-01') || hash.includes('partner-profile') || search.includes('screen=user-qot-01')) {
        setCurrentScreen('USER-QOT-01');
      } else if (hash.includes('qot-00') || hash.includes('user-qot-00') || hash.includes('quote-status') || search.includes('screen=user-qot-00')) {
        setCurrentScreen('USER-QOT-00');
      } else if (hash.includes('req-04') || hash.includes('user-req-04') || search.includes('screen=user-req-04')) {
        setCurrentScreen('USER-REQ-04');
      } else if (hash.includes('req-03') || hash.includes('user-req-03') || search.includes('screen=user-req-03')) {
        setCurrentScreen('USER-REQ-03');
      } else if (hash.includes('req-02') || hash.includes('user-req-02') || search.includes('screen=user-req-02')) {
        setCurrentScreen('USER-REQ-02');
      } else if (hash.includes('req-01') || hash.includes('user-req-01') || search.includes('screen=user-req-01')) {
        setCurrentScreen('USER-REQ-01');
      } else if (hash.includes('req-00') || hash.includes('clean-req') || hash.includes('user-req-00') || search.includes('screen=user-req-00')) {
        setCurrentScreen('USER-REQ-00');
      } else if (hash.includes('myp-02') || hash.includes('user-myp-02') || hash.includes('coupon') || search.includes('screen=user-myp-02')) {
        setCurrentScreen('USER-MYP-02');
      } else if (hash.includes('myp-01') || hash.includes('user-myp-01') || hash.includes('profile-edit') || search.includes('screen=user-myp-01')) {
        setCurrentScreen('USER-MYP-01');
      } else if (hash.includes('myp-00') || hash.includes('user-myp-00') || hash.includes('mypage') || hash.includes('my-page') || search.includes('screen=user-myp-00')) {
        setCurrentScreen('USER-MYP-00');
      } else if (hash.includes('profile') || hash.includes('user-ath-03') || search.includes('screen=user-ath-03')) {
        setCurrentScreen('USER-ATH-03');
      } else if (hash.includes('find') || hash.includes('reset') || hash.includes('user-ath-02') || search.includes('screen=user-ath-02')) {
        setCurrentScreen('USER-ATH-02');
      } else if (hash.includes('signup') || hash.includes('register') || hash.includes('user-ath-01') || search.includes('screen=user-ath-01')) {
        setCurrentScreen('USER-ATH-01');
      } else if (hash.includes('ptnr-qot-00') || hash.includes('partner-orders') || hash.includes('partner-tender') || search.includes('screen=ptnr-qot-00')) {
        setCurrentScreen('PTNR-QOT-00');
      } else if (hash.includes('partner-profile') || hash.includes('ptnr-dsh-02') || hash.includes('partner-portfolio') || search.includes('screen=ptnr-dsh-02')) {
        setCurrentScreen('PTNR-DSH-02');
      } else if (hash.includes('partner-profile-settings') || hash.includes('ptnr-dsh-01') || hash.includes('partner-region') || hash.includes('partner-settings') || search.includes('screen=ptnr-dsh-01')) {
        setCurrentScreen('PTNR-DSH-01');
      } else if (hash.includes('partner-dashboard') || hash.includes('ptnr-dsh-00') || hash.includes('ptnr-com-00') || search.includes('screen=ptnr-dsh-00')) {
        setCurrentScreen('PTNR-DSH-00');
      } else if (hash.includes('ptnr-ath-01') || hash.includes('partner-join') || hash.includes('partner-apply') || search.includes('screen=ptnr-ath-01')) {
        setCurrentScreen('PTNR-ATH-01');
      } else if (hash.includes('ptnr-ath-00') || hash.includes('partner-login') || hash.includes('partner') || search.includes('screen=ptnr-ath-00')) {
        setCurrentScreen('PTNR-ATH-00');
      } else if (hash.includes('login') || hash.includes('user-ath-00') || search.includes('screen=user-ath-00')) {
        setCurrentScreen('USER-ATH-00');
      } else {
        setCurrentScreen('USER-COM-00');
      }
    };

    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  // 네비게이션 라우팅 핸들러
  const handleNavigate = useCallback((path: string, params?: any) => {
    console.log('[AppPreview] Navigation requested:', path, params);
    if (params) {
      if (params.errorCode || params.errorMsg || params.attemptedPaidAmt !== undefined) {
        setFailParams((prev) => ({
          ...prev,
          errorCode: params.errorCode || prev.errorCode,
          errorMsg: params.errorMsg || prev.errorMsg,
          couponNo: params.couponNo !== undefined ? params.couponNo : prev.couponNo,
          usePointAmt: params.usePointAmt !== undefined ? params.usePointAmt : prev.usePointAmt,
          attemptedPaidAmt: params.attemptedPaidAmt !== undefined ? params.attemptedPaidAmt : prev.attemptedPaidAmt,
        }));
      }
      if (params.contractNo || params.payNo) {
        setContractParams((prev) => ({
          ...prev,
          contractNo: params.contractNo || prev.contractNo,
          payNo: params.payNo || prev.payNo,
        }));
      }
      if (params.ptnrNo || params.bidNo || params.slotNo || params.reqNo) {
        setPartnerParams((prev) => ({
          ...prev,
          ptnrNo: params.ptnrNo || prev.ptnrNo,
          bidNo: params.bidNo || prev.bidNo,
          slotNo: params.slotNo || prev.slotNo,
          reqNo: params.reqNo || prev.reqNo,
        }));
      }
    }

    if (
      path === 'USER-HIS-02' ||
      path === 'user-his-02' ||
      path === '#user-his-02' ||
      path === 'review' ||
      path === '#review' ||
      path === 'review-write'
    ) {
      if (params?.contractNo) {
        setContractParams((prev) => ({ ...prev, contractNo: params.contractNo }));
      }
      window.location.hash = '#review';
      setCurrentScreen('USER-HIS-02');
    } else if (
      path === 'USER-HIS-01' ||
      path === 'user-his-01' ||
      path === '#user-his-01' ||
      path === 'inspection' ||
      path === '#inspection' ||
      path === 'inspection-detail'
    ) {
      if (params?.contractNo) {
        setContractParams((prev) => ({ ...prev, contractNo: params.contractNo }));
      }
      window.location.hash = '#inspection';
      setCurrentScreen('USER-HIS-01');
    } else if (
      path === 'USER-HIS-00' ||
      path === 'user-his-00' ||
      path === '#user-his-00' ||
      path === 'history' ||
      path === '#history' ||
      path === 'service-history'
    ) {
      window.location.hash = '#history';
      setCurrentScreen('USER-HIS-00');
    } else if (
      path === 'USER-CNT-02' ||
      path === 'user-cnt-02' ||
      path === '#user-cnt-02' ||
      path === 'payment-fail' ||
      path === '#payment-fail' ||
      path === 'fail'
    ) {
      window.location.hash = '#payment-fail';
      setCurrentScreen('USER-CNT-02');
    } else if (
      path === 'USER-CNT-01' ||
      path === 'user-cnt-01' ||
      path === '#user-cnt-01' ||
      path === 'payment-complete' ||
      path === '#payment-complete' ||
      path === 'paid'
    ) {
      window.location.hash = '#payment-complete';
      setCurrentScreen('USER-CNT-01');
    } else if (
      path === 'USER-CNT-00' ||
      path === 'user-cnt-00' ||
      path === '#user-cnt-00' ||
      path === 'contract-payment' ||
      path === '#contract-payment' ||
      path === 'payment'
    ) {
      window.location.hash = '#contract-payment';
      setCurrentScreen('USER-CNT-00');
    } else if (path === 'USER-QOT-02' || path === 'user-qot-02' || path === '#user-qot-02' || path === 'chat' || path === '#chat') {
      window.location.hash = '#chat';
      setCurrentScreen('USER-QOT-02');
    } else if (path === 'USER-QOT-01' || path === 'user-qot-01' || path === '#user-qot-01' || path === 'partner-profile' || path === '#partner-profile') {
      window.location.hash = '#partner-profile';
      setCurrentScreen('USER-QOT-01');
    } else if (path === 'USER-QOT-00' || path === 'user-qot-00' || path === '#user-qot-00' || path === 'quote-status' || path === '#quote-status') {
      window.location.hash = '#quote-status';
      setCurrentScreen('USER-QOT-00');
    } else if (path === 'USER-REQ-04' || path === 'user-req-04' || path === '#user-req-04' || path === 'modal-photo') {
      window.location.hash = '#user-req-04';
      setCurrentScreen('USER-REQ-04');
    } else if (path === 'USER-REQ-03' || path === 'user-req-03' || path === '#user-req-03' || path === 'modal-address') {
      window.location.hash = '#user-req-03';
      setCurrentScreen('USER-REQ-03');
    } else if (path === 'USER-REQ-02' || path === 'user-req-02' || path === '#user-req-02' || path === 'modal-appliance') {
      window.location.hash = '#user-req-02';
      setCurrentScreen('USER-REQ-02');
    } else if (path === 'USER-REQ-01' || path === 'user-req-01' || path === '#user-req-01' || path === 'modal-regular') {
      window.location.hash = '#user-req-01';
      setCurrentScreen('USER-REQ-01');
    } else if (path === 'USER-REQ-00' || path === 'clean-req' || path === 'request' || path === '#clean-req') {
      window.location.hash = '#clean-req';
      setCurrentScreen('USER-REQ-00');
    } else if (
      path === 'USER-MYP-02' ||
      path === 'user-myp-02' ||
      path === '#user-myp-02' ||
      path === 'coupon-book' ||
      path === '#coupon-book' ||
      path === 'coupon' ||
      path === '#coupon' ||
      path === 'myp-02' ||
      path === '#myp-02'
    ) {
      window.location.hash = '#coupon-book';
      setCurrentScreen('USER-MYP-02');
    } else if (
      path === 'USER-MYP-01' ||
      path === 'user-myp-01' ||
      path === '#user-myp-01' ||
      path === 'profile-edit' ||
      path === '#profile-edit' ||
      path === 'myp-01' ||
      path === '#myp-01'
    ) {
      window.location.hash = '#profile-edit';
      setCurrentScreen('USER-MYP-01');
    } else if (
      path === 'USER-MYP-00' ||
      path === 'user-myp-00' ||
      path === '#user-myp-00' ||
      path === 'mypage' ||
      path === '#mypage' ||
      path === 'my-page' ||
      path === '#my-page'
    ) {
      window.location.hash = '#mypage';
      setCurrentScreen('USER-MYP-00');
    } else if (path === 'USER-ATH-03' || path === 'user-ath-03' || path === 'profile-edit' || path === '#profile-edit') {
      window.location.hash = '#profile-edit';
      setCurrentScreen('USER-ATH-03');
    } else if (path === 'USER-ATH-02' || path === 'find-account' || path === 'reset-password' || path === '#find-account') {
      window.location.hash = '#find-account';
      setCurrentScreen('USER-ATH-02');
    } else if (path === 'USER-ATH-01' || path === 'signup' || path === 'register' || path === '#signup') {
      window.location.hash = '#signup';
      setCurrentScreen('USER-ATH-01');
    } else if (
      path === 'PTNR-SET-01' ||
      path === 'ptnr-set-01' ||
      path === '#ptnr-set-01' ||
      path === 'settlement-tax' ||
      path === '#settlement-tax' ||
      path.startsWith('ptnr-set-01?')
    ) {
      window.location.hash = path.startsWith('#') ? path : `#${path.toLowerCase()}`;
      setCurrentScreen('PTNR-SET-01');
    } else if (
      path === 'PTNR-SET-00' ||
      path === 'ptnr-set-00' ||
      path === '#ptnr-set-00' ||
      path === 'settlement' ||
      path === '#settlement'
    ) {
      window.location.hash = '#ptnr-set-00';
      setCurrentScreen('PTNR-SET-00');
    } else if (
      path === 'PTNR-JOB-02' ||
      path === 'ptnr-job-02' ||
      path === '#ptnr-job-02' ||
      path.startsWith('PTNR-JOB-02?') ||
      path.startsWith('ptnr-job-02?') ||
      path.startsWith('#ptnr-job-02?') ||
      path === 'partner-chat'
    ) {
      window.location.hash = path.startsWith('#') ? path : `#${path.toLowerCase()}`;
      setCurrentScreen('PTNR-JOB-02');
    } else if (
      path === 'PTNR-JOB-01' ||
      path === 'ptnr-job-01' ||
      path === '#ptnr-job-01' ||
      path.startsWith('PTNR-JOB-01?') ||
      path.startsWith('ptnr-job-01?') ||
      path.startsWith('#ptnr-job-01?') ||
      path === 'work-status' ||
      path === 'inspection-report'
    ) {
      window.location.hash = path.startsWith('#') ? path : `#${path.toLowerCase()}`;
      setCurrentScreen('PTNR-JOB-01');
    } else if (
      path === 'PTNR-JOB-00' ||
      path === 'ptnr-job-00' ||
      path === '#ptnr-job-00' ||
      path === 'job-management' ||
      path === '#job-management' ||
      path === 'partner-jobs' ||
      path === '#partner-jobs'
    ) {
      window.location.hash = '#ptnr-job-00';
      setCurrentScreen('PTNR-JOB-00');
    } else if (
      path === 'PTNR-QOT-02' ||
      path === 'ptnr-qot-02' ||
      path === '#ptnr-qot-02' ||
      path.startsWith('PTNR-QOT-02?') ||
      path.startsWith('ptnr-qot-02?') ||
      path.startsWith('#ptnr-qot-02?') ||
      path === 'submit-bid'
    ) {
      window.location.hash = path.startsWith('#') ? path : `#${path.toLowerCase()}`;
      setCurrentScreen('PTNR-QOT-02');
    } else if (
      path === 'PTNR-QOT-01' ||
      path === 'ptnr-qot-01' ||
      path === '#ptnr-qot-01' ||
      path.startsWith('PTNR-QOT-01?') ||
      path.startsWith('ptnr-qot-01?') ||
      path.startsWith('#ptnr-qot-01?') ||
      path === 'order-detail' ||
      path === 'req-detail'
    ) {
      window.location.hash = path.startsWith('#') ? path : `#${path.toLowerCase()}`;
      setCurrentScreen('PTNR-QOT-01');
    } else if (
      path === 'PTNR-QOT-00' ||
      path === 'ptnr-qot-00' ||
      path === '#ptnr-qot-00' ||
      path === 'partner-orders' ||
      path === '#partner-orders' ||
      path === 'partner-tender' ||
      path === '#partner-tender'
    ) {
      window.location.hash = '#partner-orders';
      setCurrentScreen('PTNR-QOT-00');
    } else if (
      path === 'PTNR-DSH-02' ||
      path === 'ptnr-dsh-02' ||
      path === '#ptnr-dsh-02' ||
      path === 'partner-profile' ||
      path === '#partner-profile' ||
      path === 'partner-portfolio' ||
      path === '#partner-portfolio'
    ) {
      window.location.hash = '#partner-profile';
      setCurrentScreen('PTNR-DSH-02');
    } else if (
      path === 'PTNR-DSH-01' ||
      path === 'ptnr-dsh-01' ||
      path === '#ptnr-dsh-01' ||
      path === 'partner-profile-settings' ||
      path === '#partner-profile-settings' ||
      path === 'partner-region' ||
      path === '#partner-region' ||
      path === 'partner-settings' ||
      path === '#partner-settings'
    ) {
      window.location.hash = '#partner-profile-settings';
      setCurrentScreen('PTNR-DSH-01');
    } else if (
      path === 'PTNR-DSH-00' ||
      path === 'ptnr-dsh-00' ||
      path === '#ptnr-dsh-00' ||
      path === 'partner-dashboard' ||
      path === '#partner-dashboard' ||
      path === 'PTNR-COM-00' ||
      path === 'ptnr-com-00' ||
      path === '#ptnr-com-00'
    ) {
      window.location.hash = '#partner-dashboard';
      setCurrentScreen('PTNR-DSH-00');
    } else if (
      path === 'PTNR-ATH-01' ||
      path === 'ptnr-ath-01' ||
      path === '#ptnr-ath-01' ||
      path === 'partner-join' ||
      path === '#partner-join' ||
      path === 'partner-apply' ||
      path === '#partner-apply'
    ) {
      window.location.hash = '#partner-join';
      setCurrentScreen('PTNR-ATH-01');
    } else if (
      path === 'PTNR-ATH-00' ||
      path === 'ptnr-ath-00' ||
      path === '#ptnr-ath-00' ||
      path === 'partner-login' ||
      path === '#partner-login' ||
      path === 'partner' ||
      path === '#partner'
    ) {
      window.location.hash = '#partner-login';
      setCurrentScreen('PTNR-ATH-00');
    } else if (path === 'USER-ATH-00' || path === 'login' || path === '#login') {
      window.location.hash = '#login';
      setCurrentScreen('USER-ATH-00');
    } else if (
      path === 'USER-COM-00' ||
      path === 'service-overview' ||
      path === '/' ||
      path === 'home' ||
      path === '#home'
    ) {
      window.location.hash = '#home';
      setCurrentScreen('USER-COM-00');
    } else if (
      path === 'ADMN-SYS-02' ||
      path === 'admn-sys-02' ||
      path === '#admn-sys-02' ||
      path === 'floor-price' ||
      path === '#floor-price'
    ) {
      window.location.hash = '#admn-sys-02';
      setCurrentScreen('ADMN-SYS-02');
    } else if (
      path === 'ADMN-SYS-01' ||
      path === 'admn-sys-01' ||
      path === '#admn-sys-01' ||
      path === 'codes' ||
      path === '#codes' ||
      path === 'policy-codes'
    ) {
      window.location.hash = '#admn-sys-01';
      setCurrentScreen('ADMN-SYS-01');
    } else if (
      path === 'ADMN-PRM-01' ||
      path === 'admn-prm-01' ||
      path === '#admn-prm-01' ||
      path === 'airdrop'
    ) {
      window.location.hash = '#admn-prm-01';
      setCurrentScreen('ADMN-PRM-01');
    } else if (
      path === 'ADMN-PRM-00' ||
      path === 'admn-prm-00' ||
      path === '#admn-prm-00' ||
      path === 'promotions' ||
      path === 'promotions-coupons'
    ) {
      window.location.hash = '#admn-prm-00';
      setCurrentScreen('ADMN-PRM-00');
    } else if (
      path === 'ADMN-DSH-00' ||
      path === 'admn-dsh-00' ||
      path === '#admn-dsh-00' ||
      path === 'admin-dashboard' ||
      path === 'dashboard'
    ) {
      window.location.hash = '#admn-dsh-00';
      setCurrentScreen('ADMN-DSH-00');
    } else if (
      path === 'ADMN-ATH-00' ||
      path === 'admn-ath-00' ||
      path === '#admn-ath-00' ||
      path === 'admin-login' ||
      path === 'logout'
    ) {
      window.location.hash = '#admn-ath-00';
      setCurrentScreen('ADMN-ATH-00');
    } else {
      console.log('[AppPreview] Other screen:', path);
    }
  }, []);

  // 로그인 성공 콜백
  const handleLoginSuccess = useCallback((authData: { token: string; user: { userNo: string; userNm: string } }) => {
    console.log('[AppPreview] Login success for:', authData.user.userNo);
    setCurrentUserNo(authData.user.userNo);
    window.location.hash = '#home';
    setCurrentScreen('USER-COM-00');
  }, []);

  // 회원가입 성공 콜백
  const handleRegisterSuccess = useCallback((result: { userNo: string; userNm: string; welcomeCouponIssued: boolean }) => {
    console.log('[AppPreview] Register success for:', result.userNo);
    setCurrentUserNo(result.userNo);
  }, []);

  // 로그아웃 콜백
  const handleLogout = useCallback(() => {
    console.log('[AppPreview] User logged out');
    setCurrentUserNo(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ssuldak_token');
      localStorage.removeItem('ssuldak_user');
    }
  }, []);

  return (
    <div className="relative min-h-screen bg-[#f8f9ff]">
      {/* 개발/프리뷰 전용 퀵 화면 전환 컨트롤러 */}
      <div className="fixed bottom-3 right-3 z-50 flex flex-col items-end gap-1.5">
        <button
          type="button"
          onClick={() => setShowPreviewBar((prev) => !prev)}
          className="px-3 py-1.5 rounded-full bg-neutral-900/90 hover:bg-neutral-800 text-white shadow-xl border border-white/20 text-xs font-bold flex items-center gap-1.5 cursor-pointer backdrop-blur-md transition-all active:scale-95"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>{showPreviewBar ? '프리뷰 메뉴 닫기 ✕' : `프리뷰: ${currentScreen}`}</span>
        </button>

        {showPreviewBar && (
          <aside
            aria-label="화면 프리뷰 전환 컨트롤러"
            className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-neutral-900/95 backdrop-blur-md shadow-2xl border border-white/20 text-xs text-white max-w-[95vw] overflow-x-auto"
          >
            <span className="font-bold px-2 text-emerald-400 shrink-0">화면 선택:</span>
        <button
          type="button"
          onClick={() => handleNavigate('ADMN-SYS-02')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
            currentScreen === 'ADMN-SYS-02'
              ? 'bg-amber-400 text-neutral-950 shadow-md font-bold'
              : 'hover:bg-white/10 text-neutral-300'
          }`}
        >
          ADMN-SYS-02 (최소 하한선/정책 설정)
        </button>
        <button
          type="button"
          onClick={() => handleNavigate('ADMN-SYS-01')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
            currentScreen === 'ADMN-SYS-01'
              ? 'bg-amber-400 text-neutral-950 shadow-md font-bold'
              : 'hover:bg-white/10 text-neutral-300'
          }`}
        >
          ADMN-SYS-01 (공통 코드 관리)
        </button>
        <button
          type="button"
          onClick={() => handleNavigate('ADMN-PRM-01')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
            currentScreen === 'ADMN-PRM-01'
              ? 'bg-amber-400 text-neutral-950 shadow-md font-bold'
              : 'hover:bg-white/10 text-neutral-300'
          }`}
        >
          ADMN-PRM-01 (에어드랍 발송)
        </button>
        <button
          type="button"
          onClick={() => handleNavigate('ADMN-PRM-00')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
            currentScreen === 'ADMN-PRM-00'
              ? 'bg-amber-400 text-neutral-950 shadow-md font-bold'
              : 'hover:bg-white/10 text-neutral-300'
          }`}
        >
          ADMN-PRM-00 (프로모션/쿠폰)
        </button>
        <button
          type="button"
          onClick={() => handleNavigate('ADMN-DSH-00')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
            currentScreen === 'ADMN-DSH-00'
              ? 'bg-amber-400 text-neutral-950 shadow-md font-bold'
              : 'hover:bg-white/10 text-neutral-300'
          }`}
        >
          ADMN-DSH-00 (어드민 대시보드)
        </button>
        <button
          type="button"
          onClick={() => handleNavigate('ADMN-ATH-00')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
            currentScreen === 'ADMN-ATH-00'
              ? 'bg-amber-400 text-neutral-950 shadow-md font-bold'
              : 'hover:bg-white/10 text-neutral-300'
          }`}
        >
          ADMN-ATH-00 (관리자 로그인)
        </button>
        <button
          type="button"
          onClick={() => handleNavigate('PTNR-SET-01')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
            currentScreen === 'PTNR-SET-01'
              ? 'bg-amber-400 text-neutral-950 shadow-md font-bold'
              : 'hover:bg-white/10 text-neutral-300'
          }`}
        >
          PTNR-SET-01 (데이터이용료영수증)
        </button>
        <button
          type="button"
          onClick={() => handleNavigate('PTNR-SET-00')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
            currentScreen === 'PTNR-SET-00'
              ? 'bg-amber-400 text-neutral-950 shadow-md font-bold'
              : 'hover:bg-white/10 text-neutral-300'
          }`}
        >
          PTNR-SET-00 (정산/매출내역)
        </button>
        <button
          type="button"
          onClick={() => handleNavigate('PTNR-JOB-02')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
            currentScreen === 'PTNR-JOB-02'
              ? 'bg-amber-400 text-neutral-950 shadow-md font-bold'
              : 'hover:bg-white/10 text-neutral-300'
          }`}
        >
          PTNR-JOB-02 (고객채팅)
        </button>
        <button
          type="button"
          onClick={() => handleNavigate('PTNR-JOB-01')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
            currentScreen === 'PTNR-JOB-01'
              ? 'bg-amber-400 text-neutral-950 shadow-md font-bold'
              : 'hover:bg-white/10 text-neutral-300'
          }`}
        >
          PTNR-JOB-01 (상태갱신/시공보고)
        </button>
        <button
          type="button"
          onClick={() => handleNavigate('PTNR-JOB-00')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
            currentScreen === 'PTNR-JOB-00'
              ? 'bg-amber-400 text-neutral-950 shadow-md font-bold'
              : 'hover:bg-white/10 text-neutral-300'
          }`}
        >
          PTNR-JOB-00 (작업관리)
        </button>
        <button
          type="button"
          onClick={() => handleNavigate('PTNR-QOT-02')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
            currentScreen === 'PTNR-QOT-02'
              ? 'bg-amber-400 text-neutral-950 shadow-md font-bold'
              : 'hover:bg-white/10 text-neutral-300'
          }`}
        >
          PTNR-QOT-02 (청약제출)
        </button>
        <button
          type="button"
          onClick={() => handleNavigate('PTNR-QOT-01')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
            currentScreen === 'PTNR-QOT-01'
              ? 'bg-amber-400 text-neutral-950 shadow-md font-bold'
              : 'hover:bg-white/10 text-neutral-300'
          }`}
        >
          PTNR-QOT-01 (공고상세)
        </button>
        <button
          type="button"
          onClick={() => handleNavigate('PTNR-QOT-00')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
            currentScreen === 'PTNR-QOT-00'
              ? 'bg-amber-400 text-neutral-950 shadow-md font-bold'
              : 'hover:bg-white/10 text-neutral-300'
          }`}
        >
          PTNR-QOT-00 (공고목록)
        </button>
        <button
          type="button"
          onClick={() => handleNavigate('PTNR-DSH-02')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
            currentScreen === 'PTNR-DSH-02'
              ? 'bg-amber-400 text-neutral-950 shadow-md font-bold'
              : 'hover:bg-white/10 text-neutral-300'
          }`}
        >
          PTNR-DSH-02 (프로필관리)
        </button>
        <button
          type="button"
          onClick={() => handleNavigate('PTNR-DSH-01')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
            currentScreen === 'PTNR-DSH-01'
              ? 'bg-amber-400 text-neutral-950 shadow-md font-bold'
              : 'hover:bg-white/10 text-neutral-300'
          }`}
        >
          PTNR-DSH-01 (지역/분야)
        </button>
        <button
          type="button"
          onClick={() => handleNavigate('PTNR-DSH-00')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
            currentScreen === 'PTNR-DSH-00'
              ? 'bg-amber-400 text-neutral-950 shadow-md font-bold'
              : 'hover:bg-white/10 text-neutral-300'
          }`}
        >
          PTNR-DSH-00 (파트너홈)
        </button>
        <button
          type="button"
          onClick={() => handleNavigate('PTNR-ATH-01')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
            currentScreen === 'PTNR-ATH-01'
              ? 'bg-amber-400 text-neutral-950 shadow-md font-bold'
              : 'hover:bg-white/10 text-neutral-300'
          }`}
        >
          PTNR-ATH-01 (파트너입점)
        </button>
        <button
          type="button"
          onClick={() => handleNavigate('PTNR-ATH-00')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
            currentScreen === 'PTNR-ATH-00'
              ? 'bg-amber-400 text-neutral-950 shadow-md font-bold'
              : 'hover:bg-white/10 text-neutral-300'
          }`}
        >
          PTNR-ATH-00 (파트너로그인)
        </button>
        <button
          type="button"
          onClick={() => handleNavigate('USER-MYP-02')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
            currentScreen === 'USER-MYP-02'
              ? 'bg-emerald-500 text-neutral-950 shadow-md font-bold'
              : 'hover:bg-white/10 text-neutral-300'
          }`}
        >
          USER-MYP-02 (쿠폰/혜택)
        </button>
        <button
          type="button"
          onClick={() => handleNavigate('USER-MYP-01')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
            currentScreen === 'USER-MYP-01'
              ? 'bg-emerald-500 text-neutral-950 shadow-md font-bold'
              : 'hover:bg-white/10 text-neutral-300'
          }`}
        >
          USER-MYP-01 (회원정보수정)
        </button>
        <button
          type="button"
          onClick={() => handleNavigate('USER-MYP-00')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
            currentScreen === 'USER-MYP-00'
              ? 'bg-emerald-500 text-neutral-950 shadow-md font-bold'
              : 'hover:bg-white/10 text-neutral-300'
          }`}
        >
          USER-MYP-00 (마이페이지)
        </button>
        <button
          type="button"
          onClick={() => handleNavigate('USER-HIS-02')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
            currentScreen === 'USER-HIS-02'
              ? 'bg-rose-500 text-white shadow-md font-bold'
              : 'hover:bg-white/10 text-neutral-300'
          }`}
        >
          USER-HIS-02 (리뷰작성)
        </button>
        <button
          type="button"
          onClick={() => handleNavigate('USER-HIS-01')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
            currentScreen === 'USER-HIS-01'
              ? 'bg-rose-500 text-white shadow-md font-bold'
              : 'hover:bg-white/10 text-neutral-300'
          }`}
        >
          USER-HIS-01 (시공검수)
        </button>
        <button
          type="button"
          onClick={() => handleNavigate('USER-HIS-00')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
            currentScreen === 'USER-HIS-00'
              ? 'bg-rose-500 text-white shadow-md font-bold'
              : 'hover:bg-white/10 text-neutral-300'
          }`}
        >
          USER-HIS-00 (이용내역)
        </button>
        <button
          type="button"
          onClick={() => handleNavigate('USER-CNT-02')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
            currentScreen === 'USER-CNT-02'
              ? 'bg-rose-500 text-white shadow-md font-bold'
              : 'hover:bg-white/10 text-neutral-300'
          }`}
        >
          USER-CNT-02 (결제실패)
        </button>
        <button
          type="button"
          onClick={() => handleNavigate('USER-CNT-01')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
            currentScreen === 'USER-CNT-01'
              ? 'bg-emerald-500 text-neutral-950 shadow-md font-bold'
              : 'hover:bg-white/10 text-neutral-300'
          }`}
        >
          USER-CNT-01 (결제완료)
        </button>
        <button
          type="button"
          onClick={() => handleNavigate('USER-CNT-00')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
            currentScreen === 'USER-CNT-00'
              ? 'bg-emerald-500 text-neutral-950 shadow-md font-bold'
              : 'hover:bg-white/10 text-neutral-300'
          }`}
        >
          USER-CNT-00 (계약/결제)
        </button>
        <button
          type="button"
          onClick={() => handleNavigate('USER-QOT-02')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
            currentScreen === 'USER-QOT-02'
              ? 'bg-emerald-500 text-neutral-950 shadow-md font-bold'
              : 'hover:bg-white/10 text-neutral-300'
          }`}
        >
          USER-QOT-02 (상담채팅)
        </button>
        <button
          type="button"
          onClick={() => handleNavigate('USER-QOT-01')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
            currentScreen === 'USER-QOT-01'
              ? 'bg-emerald-500 text-neutral-950 shadow-md font-bold'
              : 'hover:bg-white/10 text-neutral-300'
          }`}
        >
          USER-QOT-01 (파트너프로필)
        </button>
        <button
          type="button"
          onClick={() => handleNavigate('USER-QOT-00')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
            currentScreen === 'USER-QOT-00'
              ? 'bg-emerald-500 text-neutral-950 shadow-md font-bold'
              : 'hover:bg-white/10 text-neutral-300'
          }`}
        >
          USER-QOT-00 (수신청약)
        </button>
        <button
          type="button"
          onClick={() => handleNavigate('USER-REQ-04')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
            currentScreen === 'USER-REQ-04'
              ? 'bg-emerald-500 text-neutral-950 shadow-md font-bold'
              : 'hover:bg-white/10 text-neutral-300'
          }`}
        >
          USER-REQ-04 (현장사진)
        </button>
        <button
          type="button"
          onClick={() => handleNavigate('USER-REQ-03')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
            currentScreen === 'USER-REQ-03'
              ? 'bg-emerald-500 text-neutral-950 shadow-md font-bold'
              : 'hover:bg-white/10 text-neutral-300'
          }`}
        >
          USER-REQ-03 (주소검색)
        </button>
        <button
          type="button"
          onClick={() => handleNavigate('USER-REQ-02')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
            currentScreen === 'USER-REQ-02'
              ? 'bg-emerald-500 text-neutral-950 shadow-md font-bold'
              : 'hover:bg-white/10 text-neutral-300'
          }`}
        >
          USER-REQ-02 (가전모달)
        </button>
        <button
          type="button"
          onClick={() => handleNavigate('USER-REQ-01')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
            currentScreen === 'USER-REQ-01'
              ? 'bg-emerald-500 text-neutral-950 shadow-md font-bold'
              : 'hover:bg-white/10 text-neutral-300'
          }`}
        >
          USER-REQ-01 (구역모달)
        </button>
        <button
          type="button"
          onClick={() => handleNavigate('USER-REQ-00')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
            currentScreen === 'USER-REQ-00'
              ? 'bg-emerald-500 text-neutral-950 shadow-md font-bold'
              : 'hover:bg-white/10 text-neutral-300'
          }`}
        >
          USER-REQ-00 (견적신청)
        </button>
        <button
          type="button"
          onClick={() => handleNavigate('USER-ATH-03')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
            currentScreen === 'USER-ATH-03'
              ? 'bg-emerald-500 text-neutral-950 shadow-md font-bold'
              : 'hover:bg-white/10 text-neutral-300'
          }`}
        >
          USER-ATH-03 (마이페이지/서명)
        </button>
        <button
          type="button"
          onClick={() => handleNavigate('USER-ATH-02')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
            currentScreen === 'USER-ATH-02'
              ? 'bg-emerald-500 text-neutral-950 shadow-md font-bold'
              : 'hover:bg-white/10 text-neutral-300'
          }`}
        >
          USER-ATH-02 (계정/비번재설정)
        </button>
        <button
          type="button"
          onClick={() => handleNavigate('USER-ATH-01')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
            currentScreen === 'USER-ATH-01'
              ? 'bg-emerald-500 text-neutral-950 shadow-md font-bold'
              : 'hover:bg-white/10 text-neutral-300'
          }`}
        >
          USER-ATH-01 (회원가입)
        </button>
        <button
          type="button"
          onClick={() => handleNavigate('USER-ATH-00')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
            currentScreen === 'USER-ATH-00'
              ? 'bg-emerald-500 text-neutral-950 shadow-md font-bold'
              : 'hover:bg-white/10 text-neutral-300'
          }`}
        >
          USER-ATH-00 (로그인)
        </button>
        <button
          type="button"
          onClick={() => handleNavigate('USER-COM-00')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
            currentScreen === 'USER-COM-00'
              ? 'bg-emerald-500 text-neutral-950 shadow-md font-bold'
              : 'hover:bg-white/10 text-neutral-300'
          }`}
        >
          USER-COM-00 (메인 홈)
        </button>
          </aside>
        )}
      </div>

      {/* 화면 렌더링 분기 (key를 주어 확실한 언마운트/마운트 보장) */}
      {currentScreen === 'ADMN-SYS-02' ? (
        <AdmnSys02Screen
          key="screen_admn_sys_02"
          onNavigate={handleNavigate}
        />
      ) : currentScreen === 'ADMN-SYS-01' ? (
        <AdmnSys01Screen
          key="screen_admn_sys_01"
          onNavigate={handleNavigate}
        />
      ) : currentScreen === 'ADMN-PRM-01' ? (
        <AdmnPrm01Modal
          key="screen_admn_prm_01"
          isOpen={true}
          onNavigate={handleNavigate}
          isStandalone={true}
        />
      ) : currentScreen === 'ADMN-PRM-00' ? (
        <AdmnPrm00Screen
          key="screen_admn_prm_00"
          onNavigate={handleNavigate}
        />
      ) : currentScreen === 'ADMN-DSH-00' ? (
        <AdmnDsh00Screen
          key="screen_admn_dsh_00"
          onNavigate={handleNavigate}
        />
      ) : currentScreen === 'ADMN-ATH-00' ? (
        <AdmnAth00Screen
          key="screen_admn_ath_00"
          onNavigate={handleNavigate}
        />
      ) : currentScreen === 'PTNR-SET-01' ? (
        <PtnrSet01Screen
          key="screen_ptnr_set_01"
          onNavigate={handleNavigate}
        />
      ) : currentScreen === 'PTNR-SET-00' ? (
        <PtnrSet00Screen
          key="screen_ptnr_set_00"
          onNavigate={handleNavigate}
        />
      ) : currentScreen === 'PTNR-JOB-02' ? (
        <PtnrJob02Screen
          key="screen_ptnr_job_02"
          onNavigate={handleNavigate}
        />
      ) : currentScreen === 'PTNR-JOB-01' ? (
        <PtnrJob01Screen
          key="screen_ptnr_job_01"
          onClose={() => handleNavigate('PTNR-JOB-00')}
          onSuccess={() => handleNavigate('PTNR-JOB-00')}
        />
      ) : currentScreen === 'PTNR-JOB-00' ? (
        <PtnrJob00Screen
          key="screen_ptnr_job_00"
          onNavigate={handleNavigate}
        />
      ) : currentScreen === 'PTNR-QOT-02' ? (
        <PtnrQot02Screen
          key="screen_ptnr_qot_02"
          onNavigate={handleNavigate}
        />
      ) : currentScreen === 'PTNR-QOT-01' ? (
        <PtnrQot01Screen
          key="screen_ptnr_qot_01"
          onNavigate={handleNavigate}
        />
      ) : currentScreen === 'PTNR-QOT-00' ? (
        <PtnrQot00Screen
          key="screen_ptnr_qot_00"
        />
      ) : currentScreen === 'PTNR-DSH-02' ? (
        <PtnrDsh02Screen
          key="screen_ptnr_dsh_02"
          initialPtnrNo="P20261000001"
          onNavigate={handleNavigate}
        />
      ) : currentScreen === 'PTNR-DSH-01' ? (
        <PtnrDsh01Screen
          key="screen_ptnr_dsh_01"
          initialPtnrNo="P20261000001"
          onNavigate={handleNavigate}
        />
      ) : currentScreen === 'PTNR-DSH-00' ? (
        <PtnrDsh00Screen
          key="screen_ptnr_dsh_00"
          ptnrNo="P20261000001"
          onNavigate={handleNavigate}
          onLogout={() => handleNavigate('PTNR-ATH-00')}
        />
      ) : currentScreen === 'PTNR-ATH-01' ? (
        <PtnrAth01Screen
          key="screen_ptnr_ath_01"
          onNavigate={handleNavigate}
        />
      ) : currentScreen === 'PTNR-ATH-00' ? (
        <PtnrAth00Screen
          key="screen_ptnr_ath_00"
          onNavigate={handleNavigate}
        />
      ) : currentScreen === 'USER-MYP-02' ? (
        <UserMyp02Screen
          key={`screen_user_myp_02_${currentUserNo || 'default'}`}
          userNo={currentUserNo || 'U20261000001'}
          onNavigate={handleNavigate}
        />
      ) : currentScreen === 'USER-MYP-01' ? (
        <UserMyp01Screen
          key={`screen_user_myp_01_${currentUserNo || 'default'}`}
          userNo={currentUserNo || 'U20261000001'}
          onNavigate={handleNavigate}
        />
      ) : currentScreen === 'USER-MYP-00' ? (
        <UserMyp00Screen
          key={`screen_user_myp_00_${currentUserNo || 'default'}`}
          userNo={currentUserNo || 'U20261000001'}
          onNavigate={handleNavigate}
        />
      ) : currentScreen === 'USER-HIS-02' ? (
        <UserHis02Screen
          key={`screen_user_his_02_${currentUserNo || 'default'}_${contractParams.contractNo || 'default'}`}
          userNo={currentUserNo || 'U20261000001'}
          contractNo={contractParams.contractNo || 'CT2026102100001'}
          onNavigate={handleNavigate}
        />
      ) : currentScreen === 'USER-HIS-01' ? (
        <UserHis01Screen
          key={`screen_user_his_01_${currentUserNo || 'default'}_${contractParams.contractNo || 'default'}`}
          userNo={currentUserNo || 'U20261000001'}
          contractNo={contractParams.contractNo || 'CT2026102368719'}
          onNavigate={handleNavigate}
        />
      ) : currentScreen === 'USER-HIS-00' ? (
        <UserHis00Screen
          key={`screen_user_his_00_${currentUserNo || 'default'}`}
          userNo={currentUserNo || 'U20261000001'}
          onNavigate={handleNavigate}
        />
      ) : currentScreen === 'USER-CNT-02' ? (
        <UserCnt02Screen
          key={`screen_user_cnt_02_${currentUserNo || 'default'}_${contractParams.contractNo || 'default'}`}
          userNo={currentUserNo || 'U20261000001'}
          reqNo={partnerParams.reqNo || 'REQ202610210001'}
          contractNo={contractParams.contractNo || 'CT2026102100001'}
          couponNo={failParams.couponNo}
          usePointAmt={failParams.usePointAmt}
          errorCode={failParams.errorCode}
          errorMsg={failParams.errorMsg}
          attemptedPaidAmt={failParams.attemptedPaidAmt}
          onNavigate={handleNavigate}
          onBack={() => handleNavigate('USER-CNT-00')}
        />
      ) : currentScreen === 'USER-CNT-01' ? (
        <UserCnt01Screen
          key={`screen_user_cnt_01_${currentUserNo || 'default'}_${contractParams.contractNo || 'default'}`}
          userNo={currentUserNo || 'U20261000001'}
          contractNo={contractParams.contractNo || 'CT2026102100001'}
          payNo={contractParams.payNo || 'PAY2026102100001'}
          reqNo={partnerParams.reqNo || 'REQ202610210001'}
          onNavigate={handleNavigate}
        />
      ) : currentScreen === 'USER-CNT-00' ? (
        <UserCnt00Screen
          key={`screen_user_cnt_00_${currentUserNo || 'default'}`}
          userNo={currentUserNo || 'U20261000001'}
          reqNo={partnerParams.reqNo || 'REQ202610210001'}
          onNavigate={handleNavigate}
          onBack={() => handleNavigate('USER-QOT-00')}
        />
      ) : currentScreen === 'USER-QOT-02' ? (
        <UserQot02Screen
          key={`screen_user_qot_02_${partnerParams.ptnrNo || 'default'}`}
          initialContractNo="CT2026102200001"
          initialUserNo={currentUserNo || 'U20261000001'}
          onNavigate={handleNavigate}
          apiEndpoint="/api/user/user_qot_02"
        />
      ) : currentScreen === 'USER-QOT-01' ? (
        <UserQot01Screen
          key={`screen_user_qot_01_${partnerParams.ptnrNo || 'default'}`}
          initialPtnrNo={partnerParams.ptnrNo}
          initialBidNo={partnerParams.bidNo}
          initialSlotNo={partnerParams.slotNo}
          initialReqNo={partnerParams.reqNo}
          onNavigate={handleNavigate}
          apiEndpoint="/api/user/user_qot_01"
        />
      ) : currentScreen === 'USER-QOT-00' ? (
        <UserQot00Screen
          key={`screen_user_qot_00_${currentUserNo || 'default'}`}
          initialReqNo="REQ202610210001"
          initialUserNo={currentUserNo || 'U20261000001'}
          onNavigate={handleNavigate}
          logoSrc="/logo.png"
          apiEndpoint="/api/user/user_qot_00"
        />
      ) : currentScreen === 'USER-REQ-04' ? (
        <div key="screen_user_req_04" className="relative min-h-screen bg-[#f8f9ff]">
          {/* 1. Header (User HTML identical header) */}
          <header className="fixed top-0 w-full z-40 bg-white/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(22,59,102,0.04)] border-b border-[#e5eeff]">
            <div className="h-16 max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <a
                  className="flex items-center gap-2 group cursor-pointer"
                  onClick={() => handleNavigate('USER-COM-00')}
                >
                  <div className="w-9 h-9 rounded-lg bg-[#163b66] flex items-center justify-center text-white transition-transform group-hover:scale-95">
                    <span className="material-symbols-outlined text-[20px]">verified_user</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[17px] font-bold tracking-tight text-[#00254a] leading-none">SsulDak</span>
                    <span className="text-[11px] text-[#006c4a] font-bold tracking-wider leading-tight">쓸고닦고 케어</span>
                  </div>
                </a>
                <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#eff4ff]">
                  <span className="material-symbols-outlined text-[16px] text-[#737780]">navigation</span>
                  <span className="text-[13px] text-[#43474f]">홈</span>
                  <span className="material-symbols-outlined text-[14px] text-[#c3c6d0]">chevron_right</span>
                  <span className="text-[13px] text-[#43474f]">견적 신청</span>
                  <span className="material-symbols-outlined text-[14px] text-[#c3c6d0]">chevron_right</span>
                  <span className="text-[11px] font-semibold text-[#163b66]">청소 서비스 통합 신청</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#d3e4fe] text-[#00254a] font-mono">
                    USER-REQ-00
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <nav className="hidden md:flex items-center gap-1">
                  <a className="px-3 py-2 rounded-lg text-[13px] text-[#43474f] hover:bg-[#eff4ff] hover:text-[#0b1c30] transition-colors cursor-pointer">
                    서비스 안내
                  </a>
                  <a className="px-3 py-2 rounded-lg text-[13px] text-[#43474f] hover:bg-[#eff4ff] hover:text-[#0b1c30] transition-colors cursor-pointer">
                    견적 가이드
                  </a>
                  <a className="px-3 py-2 rounded-lg text-[13px] text-[#43474f] hover:bg-[#eff4ff] hover:text-[#0b1c30] transition-colors cursor-pointer">
                    고객지원
                  </a>
                </nav>
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#82f5c1]/40 text-[#00714e]">
                  <span className="w-2 h-2 rounded-full bg-[#006c4a] animate-pulse" />
                  <span className="text-[11px] font-bold tracking-tight">안심 보증 시스템 가동중</span>
                </div>
                <div className="flex items-center gap-2 pl-2">
                  <button
                    aria-label="알림"
                    className="w-9 h-9 rounded-full bg-[#eff4ff] flex items-center justify-center text-[#43474f] hover:bg-[#e5eeff] transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">notifications</span>
                  </button>
                  <a
                    className="w-8 h-8 rounded-full bg-[#00254a] flex items-center justify-center cursor-pointer"
                    onClick={() => handleNavigate('USER-ATH-03')}
                  >
                    <span className="material-symbols-outlined text-white text-[18px]">person</span>
                  </a>
                </div>
              </div>
            </div>
          </header>

          {/* 2. Main Backdrop Content (USER-REQ-00 Mockup) */}
          <main className="w-full pt-16 bg-[#f8f9ff] min-h-[calc(100vh-64px)]">
            <div className="flex flex-col w-full relative">
              <div className="w-full max-w-7xl mx-auto px-6 lg:px-12 py-6 select-none opacity-40 pointer-events-none filter blur-[1px]">
                {/* Top Progress Breadcrumbs */}
                <div className="flex items-center justify-between pb-4">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-[#163b66] text-white text-[11px] font-bold">STEP 02</span>
                    <h1 className="text-[28px] font-bold text-[#00254a] tracking-tight">통합 케어 견적 신청서 작성</h1>
                  </div>
                  <div className="flex items-center gap-1 text-[13px] text-[#006c4a] font-bold">
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                    <span>직영 인증 마스터 100% 매칭 보증</span>
                  </div>
                </div>

                {/* Layout Grid */}
                <div className="grid grid-cols-12 gap-6 mt-4">
                  {/* Left Column Form Area */}
                  <div className="col-span-8 space-y-6">
                    {/* Address Card */}
                    <div className="p-6 rounded-2xl bg-white shadow-sm space-y-4 border border-[#e5eeff]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[#00254a] text-[17px] font-bold">
                          <span className="material-symbols-outlined text-[#163b66] text-[20px]">apartment</span>
                          <span>1. 케어 대상지 기본 정보</span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-[#eff4ff] text-[#00254a] text-[11px] font-bold">건물/오피스형</span>
                      </div>
                      <div className="p-4 rounded-xl bg-[#eff4ff] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[#737780] text-[20px]">pin_drop</span>
                          <span className="text-[14px] text-[#0b1c30] font-medium">서울특별시 강남구 테헤란로 152 강남파이낸스센터 8층</span>
                        </div>
                        <span className="text-[11px] text-[#00254a] underline">주소 변경</span>
                      </div>
                    </div>

                    {/* Service Combination Selection Card */}
                    <div className="p-6 rounded-2xl bg-white shadow-sm space-y-4 border border-[#e5eeff]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[#00254a] text-[17px] font-bold">
                          <span className="material-symbols-outlined text-[#006c4a] text-[20px]">checklist</span>
                          <span>2. 결합 서비스 패키지 선택</span>
                        </div>
                        <span className="text-[11px] text-[#006c4a] font-bold">동시 신청 15% 감면 적용중</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-[#eff4ff] flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-[#00254a] text-white flex items-center justify-center">
                            <span className="material-symbols-outlined text-[20px]">stairs</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[15px] text-[#00254a] font-bold">상가·빌딩 계단 정기관리</span>
                            <span className="text-[13px] text-[#43474f]">주 2회 · 4층 전체 복도 및 난간</span>
                          </div>
                        </div>
                        <div className="p-4 rounded-xl bg-[#eff4ff] flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-[#006c4a] text-white flex items-center justify-center">
                            <span className="material-symbols-outlined text-[20px]">ac_unit</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[15px] text-[#00254a] font-bold">천장형 4WAY 에어컨 분해세척</span>
                            <span className="text-[13px] text-[#43474f]">시스템 에어컨 6기 · 살균 소독</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Site Condition Form Card */}
                    <div className="p-6 rounded-2xl bg-white shadow-sm space-y-4 border border-[#e5eeff]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[#00254a] text-[17px] font-bold">
                          <span className="material-symbols-outlined text-[#163b66] text-[20px]">photo_library</span>
                          <span>3. 현장 상세 컨디션 진단</span>
                        </div>
                        <span className="text-[11px] text-[#737780]">정밀 견적 단계</span>
                      </div>
                      <div className="p-4 rounded-xl bg-[#e5eeff] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[#00254a] text-[22px]">add_a_photo</span>
                          <span className="text-[14px] text-[#00254a] font-semibold">현장 실사 사진 2장이 첨부되어 있습니다.</span>
                        </div>
                        <button className="px-4 py-1.5 rounded-lg bg-white text-[#00254a] text-[13px] font-bold shadow-2xs">
                          수정하기
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Summary Sidebar */}
                  <div className="col-span-4 space-y-4">
                    <div className="p-6 rounded-2xl bg-white shadow-sm space-y-4 border border-[#e5eeff]">
                      <h3 className="text-[17px] text-[#00254a] font-bold">실시간 산정 예상 견적</h3>
                      <div className="space-y-1 text-[13px] text-[#43474f]">
                        <div className="flex justify-between">
                          <span>계단 정기관리 월정액</span>
                          <span className="font-semibold text-[#00254a]">180,000원</span>
                        </div>
                        <div className="flex justify-between">
                          <span>4WAY 에어컨 세척 (6대)</span>
                          <span className="font-semibold text-[#00254a]">720,000원</span>
                        </div>
                        <div className="flex justify-between text-[#006c4a] font-semibold">
                          <span>패키지 복합 할인</span>
                          <span>-135,000원</span>
                        </div>
                      </div>
                      <div className="p-4 rounded-xl bg-[#eff4ff] flex justify-between items-center">
                        <span className="text-[15px] text-[#00254a] font-bold">합계 예상금액</span>
                        <span className="text-[20px] text-[#00254a] font-extrabold font-mono">765,000원</span>
                      </div>
                      <button className="w-full h-12 rounded-xl bg-[#00254a] text-white text-[15px] font-bold shadow-md">
                        견적 요청 제출
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Real Interactive UserReq04Modal Overlaid */}
              <UserReq04Modal
                isOpen={true}
                onClose={() => handleNavigate('USER-REQ-00')}
                onSavePhotos={(photos: SitePhotoItem[]) => {
                  alert(
                    `[USER-REQ-04] 총 ${photos.length}장의 현장 사진이 견적서에 성공적으로 반영되었습니다!\n\n` +
                      photos
                        .map(
                          (p, idx) =>
                            `${idx + 1}. [${p.isPrimary ? '대표' : '일반'}] ${p.fileName} (${(
                              p.fileSize /
                              (1024 * 1024)
                            ).toFixed(1)}MB)`
                        )
                        .join('\n')
                  );
                  handleNavigate('USER-REQ-00');
                }}
                userNo={currentUserNo || 'U20261000001'}
                apiEndpoint="/api/user/user_req_04"
              />
            </div>
          </main>

          {/* 4. Footer */}
          <footer className="w-full bg-[#eff4ff] border-t border-[#dce9ff]/60 mt-12">
            <div className="max-w-7xl mx-auto px-6 lg:px-12 py-10">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pb-6 mb-6 border-b border-[#dce9ff]/60">
                <div className="md:col-span-6 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#163b66] flex items-center justify-center text-white">
                      <span className="material-symbols-outlined text-[18px]">sanitizer</span>
                    </div>
                    <span className="text-[17px] font-bold text-[#00254a]">(주)쓸고닦고 플랫폼 케어</span>
                  </div>
                  <div className="space-y-1 text-[13px] text-[#43474f]">
                    <p>대표이사: 정케어 | 사업자등록번호: 214-88-02482 | 통신판매업신고: 제 2024-서울강남-1104호</p>
                    <p>본사: 서울특별시 강남구 테헤란로 427 위워크타워 14층 쓸고닦고 관제센터</p>
                    <p>개인정보보호책임자: 김신뢰 (privacy@ssuldak.co.kr) | 호스팅제공자: AWS Korea</p>
                  </div>
                </div>
                <div className="md:col-span-3 space-y-2">
                  <h4 className="text-[15px] font-bold text-[#00254a]">약관 및 정책</h4>
                  <ul className="space-y-1 text-[13px] text-[#43474f]">
                    <li><a className="hover:text-[#00254a] cursor-pointer">서비스 이용약관</a></li>
                    <li><a className="hover:text-[#00254a] font-bold text-[#00254a] cursor-pointer">개인정보처리방침</a></li>
                    <li><a className="hover:text-[#00254a] cursor-pointer">작업 결과 100% 안심보증 규정</a></li>
                  </ul>
                </div>
                <div className="md:col-span-3 space-y-2">
                  <h4 className="text-[15px] font-bold text-[#00254a]">고객 신뢰 센터</h4>
                  <div className="p-3 bg-white rounded-xl shadow-2xs border border-[#e5eeff]">
                    <span className="text-[28px] font-extrabold text-[#00254a] block font-mono">1588-3024</span>
                    <p className="text-[11px] text-[#737780]">평일 08:30 ~ 18:30 (토·공휴일 전문 당직 엔지니어 대기)</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col md:flex-row items-center justify-between gap-2 text-[11px] text-[#737780]">
                <p>© 2026 SsulDak Platform Care Inc. All rights reserved. 대한민국 1등 기관·기업 전용 클리닝 솔루션.</p>
                <p>보안 연결: 256-bit SSL 암호화 | 클린 마스터 파트너스 연합</p>
              </div>
            </div>
          </footer>
        </div>
      ) : currentScreen === 'USER-REQ-03' ? (
        <div key="screen_user_req_03" className="relative min-h-screen bg-[#f8f9ff]">
          {/* 1. Header (User HTML identical header) */}
          <header className="fixed top-0 w-full z-40 bg-white/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(22,59,102,0.04)] border-b border-[#e5eeff]">
            <div className="h-16 max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <a
                  className="flex items-center gap-2 group cursor-pointer"
                  onClick={() => handleNavigate('USER-COM-00')}
                >
                  <div className="w-9 h-9 rounded-lg bg-[#163b66] flex items-center justify-center text-white transition-transform group-hover:scale-95">
                    <span className="material-symbols-outlined text-[20px]">verified_user</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[17px] font-bold tracking-tight text-[#00254a] leading-none">SsulDak</span>
                    <span className="text-[11px] text-[#006c4a] font-bold tracking-wider leading-tight">쓸고닦고 케어</span>
                  </div>
                </a>
                <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#eff4ff]">
                  <span className="material-symbols-outlined text-[16px] text-[#737780]">navigation</span>
                  <span className="text-[13px] text-[#43474f]">홈</span>
                  <span className="material-symbols-outlined text-[14px] text-[#c3c6d0]">chevron_right</span>
                  <span className="text-[13px] text-[#43474f]">견적 신청</span>
                  <span className="material-symbols-outlined text-[14px] text-[#c3c6d0]">chevron_right</span>
                  <span className="text-[11px] font-semibold text-[#163b66]">청소 서비스 통합 신청</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#d3e4fe] text-[#00254a] font-mono">
                    USER-REQ-00
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <nav className="hidden md:flex items-center gap-2">
                  <a
                    className="px-3 py-2 rounded-lg text-[13px] font-semibold text-[#43474f] hover:bg-[#eff4ff] hover:text-[#0b1c30] transition-colors cursor-pointer"
                    onClick={() => handleNavigate('USER-COM-00')}
                  >
                    서비스 안내
                  </a>
                  <a
                    className="px-3 py-2 rounded-lg text-[13px] font-semibold text-[#43474f] hover:bg-[#eff4ff] hover:text-[#0b1c30] transition-colors cursor-pointer"
                    onClick={() => handleNavigate('USER-REQ-00')}
                  >
                    견적 가이드
                  </a>
                  <a
                    className="px-3 py-2 rounded-lg text-[13px] font-semibold text-[#43474f] hover:bg-[#eff4ff] hover:text-[#0b1c30] transition-colors cursor-pointer"
                    onClick={() => handleNavigate('USER-ATH-03')}
                  >
                    고객지원
                  </a>
                </nav>
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#82f5c1]/40 text-[#00714e]">
                  <span className="w-2 h-2 rounded-full bg-[#006c4a] animate-pulse"></span>
                  <span className="text-[11px] font-bold tracking-tight">안심 보증 시스템 가동중</span>
                </div>
                <div className="flex items-center gap-2 pl-2">
                  <button
                    aria-label="알림"
                    type="button"
                    className="w-9 h-9 rounded-full bg-[#eff4ff] flex items-center justify-center text-[#43474f] hover:bg-[#e5eeff] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">notifications</span>
                  </button>
                  <a
                    className="w-8 h-8 rounded-full bg-[#00254a] flex items-center justify-center text-white cursor-pointer"
                    onClick={() => handleNavigate('USER-ATH-03')}
                  >
                    <span className="material-symbols-outlined text-[18px]">person</span>
                  </a>
                </div>
              </div>
            </div>
          </header>

          {/* 2. Main: Parent Background Content (USER-REQ-00 청소 서비스 신청 통합 견적서 컨텍스트) */}
          <main className="w-full pt-16 bg-[#f8f9ff] min-h-[calc(100vh-64px)] relative">
            <div className="max-w-7xl mx-auto w-full px-6 lg:px-12 py-8 select-none pointer-events-none filter blur-[2px] opacity-40 transition-all duration-300">
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#e5eeff]">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#e5eeff] text-[#00254a] text-[11px] font-bold">
                    <span className="material-symbols-outlined text-[15px]">cleaning_services</span>
                    <span>원스톱 방문 견적 신청서</span>
                  </div>
                  <h1 className="text-[26px] font-extrabold text-[#00254a] tracking-tight">전문 클리닝 맞춤 견적 의뢰</h1>
                  <p className="text-[14px] text-[#43474f]">요청 정보를 바탕으로 검증된 마스터 엔지니어가 1:1 방문 실측을 진행합니다.</p>
                </div>
                <div className="flex items-center gap-2 bg-[#eff4ff] px-4 py-2 rounded-xl border border-[#dce9ff]">
                  <div className="w-8 h-8 rounded-full bg-[#006c4a] text-white flex items-center justify-center text-[13px] font-bold">
                    01
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] text-[#737780]">신청 단계</span>
                    <span className="text-[13px] font-bold text-[#00254a]">기본 현장 정보 등록</span>
                  </div>
                </div>
              </div>

              {/* Mocked Background Booking Grid */}
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-8 space-y-6">
                  <div className="bg-white p-6 rounded-2xl shadow-sm space-y-4 border border-[#e5eeff]">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[17px] font-bold text-[#00254a] flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[#006c4a]">pin_drop</span>
                        1. 청소 대상지 위치 입력
                      </h3>
                      <span className="text-[11px] text-[#ba1a1a] font-bold">* 필수 항목</span>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[13px] font-bold text-[#0b1c30]">기본 주소</label>
                      <div className="flex gap-2">
                        <input
                          className="flex-1 px-4 py-3 bg-[#eff4ff] rounded-xl text-[14px] text-[#0b1c30]"
                          readOnly
                          type="text"
                          value="경기 고양시 일산동구 중앙로 1234"
                        />
                        <button
                          type="button"
                          className="px-4 py-3 bg-[#163b66] text-white text-[13px] font-bold rounded-xl"
                        >
                          주소 재검색
                        </button>
                      </div>
                      <input
                        className="w-full px-4 py-3 bg-[#eff4ff] rounded-xl text-[14px]"
                        placeholder="상세주소를 입력해 주세요 (예: 101동 1204호 / 관리사무소 앞)"
                        type="text"
                      />
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-sm space-y-4 border border-[#e5eeff]">
                    <h3 className="text-[17px] font-bold text-[#00254a] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[#006c4a]">apartment</span>
                      2. 공간 유형 및 평수
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl bg-[#dce9ff] text-[#00254a] flex flex-col items-center gap-2">
                        <span className="material-symbols-outlined text-[28px]">home_work</span>
                        <span className="text-[13px] font-bold">오피스/사무공간</span>
                      </div>
                      <div className="p-4 rounded-xl bg-[#eff4ff] text-[#0b1c30] flex flex-col items-center gap-2">
                        <span className="material-symbols-outlined text-[28px]">storefront</span>
                        <span className="text-[13px] font-bold">상가/쇼룸</span>
                      </div>
                      <div className="p-4 rounded-xl bg-[#eff4ff] text-[#0b1c30] flex flex-col items-center gap-2">
                        <span className="material-symbols-outlined text-[28px]">domain</span>
                        <span className="text-[13px] font-bold">빌딩 전체/시설</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-span-4 space-y-4">
                  <div className="bg-white p-6 rounded-2xl shadow-sm space-y-4 border border-[#e5eeff]">
                    <h4 className="text-[15px] font-bold text-[#00254a]">실시간 신청 예상 견적</h4>
                    <div className="p-4 rounded-xl bg-[#eff4ff] flex justify-between items-center">
                      <span className="text-[14px] text-[#43474f]">기본 평수 정산</span>
                      <span className="text-[17px] font-bold text-[#00254a]">280,000원</span>
                    </div>
                    <div className="w-full h-12 bg-[#00254a] rounded-xl flex items-center justify-center text-white text-[15px] font-bold">
                      견적 신청서 제출하기
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Real Interactive UserReq03Modal Overlaid */}
            <UserReq03Modal
              isOpen={true}
              onClose={() => handleNavigate('USER-REQ-00')}
              onSelectAddr={(addr: SelectedAddress) => {
                alert(
                  `[USER-REQ-03] 주소가 성공적으로 선택되었습니다!\n\n` +
                    `- 우편번호: [${addr.zonecode}]\n` +
                    `- 도로명 주소: ${addr.roadAddr}\n` +
                    (addr.jibunAddr ? `- 지번 주소: ${addr.jibunAddr}\n` : '') +
                    `\n견적 신청서의 기본 주소에 자동 반영되었습니다.`
                );
                handleNavigate('USER-REQ-00');
              }}
              initialKeyword="중앙로 1234"
              userNo={currentUserNo || 'U20261000001'}
              apiEndpoint="/api/user/user_req_03"
            />
          </main>

          {/* 4. Footer */}
          <footer className="w-full bg-[#eff4ff] border-t border-[#dce9ff]/60 mt-12">
            <div className="max-w-7xl mx-auto px-6 lg:px-12 py-10">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pb-6 mb-6 border-b border-[#dce9ff]/60">
                <div className="md:col-span-6 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#163b66] flex items-center justify-center text-white">
                      <span className="material-symbols-outlined text-[18px]">sanitizer</span>
                    </div>
                    <span className="text-[17px] font-bold text-[#00254a]">(주)쓸고닦고 플랫폼 케어</span>
                  </div>
                  <div className="space-y-1 text-[13px] text-[#43474f]">
                    <p>대표이사: 정케어 | 사업자등록번호: 214-88-02482 | 통신판매업신고: 제 2024-서울강남-1104호</p>
                    <p>본사: 서울특별시 강남구 테헤란로 427 위워크타워 14층 쓸고닦고 관제센터</p>
                    <p>개인정보보호책임자: 김신뢰 (privacy@ssuldak.co.kr) | 호스팅제공자: AWS Korea</p>
                  </div>
                </div>
                <div className="md:col-span-3 space-y-2">
                  <h4 className="text-[15px] font-bold text-[#00254a]">약관 및 정책</h4>
                  <ul className="space-y-1 text-[13px] text-[#43474f]">
                    <li><a className="hover:text-[#00254a] cursor-pointer">서비스 이용약관</a></li>
                    <li><a className="hover:text-[#00254a] font-bold text-[#00254a] cursor-pointer">개인정보처리방침</a></li>
                    <li><a className="hover:text-[#00254a] cursor-pointer">작업 결과 100% 안심보증 규정</a></li>
                  </ul>
                </div>
                <div className="md:col-span-3 space-y-2">
                  <h4 className="text-[15px] font-bold text-[#00254a]">고객 신뢰 센터</h4>
                  <div className="p-3 bg-white rounded-xl shadow-2xs border border-[#e5eeff]">
                    <span className="text-[28px] font-extrabold text-[#00254a] block font-mono">1588-3024</span>
                    <p className="text-[11px] text-[#737780]">평일 08:30 ~ 18:30 (토·공휴일 전문 당직 엔지니어 대기)</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col md:flex-row items-center justify-between gap-2 text-[11px] text-[#737780]">
                <p>© 2026 SsulDak Platform Care Inc. All rights reserved. 대한민국 1등 기관·기업 전용 클리닝 솔루션.</p>
                <p>보안 연결: 256-bit SSL 암호화 | 클린 마스터 파트너스 연합</p>
              </div>
            </div>
          </footer>
        </div>
      ) : currentScreen === 'USER-REQ-02' ? (
        <div key="screen_user_req_02" className="relative min-h-screen bg-[#f8f9ff]">
          {/* 1. Header (User HTML identical header) */}
          <header className="fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(22,59,102,0.06)] border-b border-[#e5eeff]">
            <div className="h-16 max-w-[1280px] mx-auto px-6 lg:px-12 flex items-center justify-between gap-6">
              <div className="flex items-center gap-8">
                <a
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() => handleNavigate('USER-COM-00')}
                >
                  <div className="w-9 h-9 rounded-xl bg-[#00254a] flex items-center justify-center text-white shadow-sm">
                    <span className="material-symbols-outlined text-[22px]">cleaning_services</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[17px] font-bold text-[#00254a] tracking-tight">쓸고닦고</span>
                    <span className="text-[11px] text-[#43474f] uppercase tracking-wider">SsulDak Enterprise</span>
                  </div>
                </a>
                <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#85f8c4]/50 text-[#002114] text-[11px] font-bold">
                  <span className="w-2 h-2 rounded-full bg-[#006c4a] animate-pulse"></span>
                  <span>실시간 마스터 파트너 입찰 대기중</span>
                </div>
              </div>
              <nav className="hidden md:flex items-center gap-8">
                <a
                  className="text-[15px] font-semibold text-[#43474f] hover:text-[#0b1c30] transition-colors cursor-pointer"
                  onClick={() => handleNavigate('USER-COM-00')}
                >
                  서비스 안내
                </a>
                <a
                  className="text-[15px] font-semibold text-[#43474f] hover:text-[#0b1c30] transition-colors cursor-pointer"
                  onClick={() => handleNavigate('USER-REQ-00')}
                >
                  견적 가이드
                </a>
                <a
                  className="text-[15px] font-semibold text-[#43474f] hover:text-[#0b1c30] transition-colors cursor-pointer"
                  onClick={() => handleNavigate('USER-ATH-03')}
                >
                  고객지원
                </a>
              </nav>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => handleNavigate('USER-REQ-00')}
                  className="hidden sm:inline-flex items-center justify-center px-4 py-2 rounded-xl bg-[#00254a] text-white text-[13px] font-bold hover:bg-[#163b66] transition-all shadow-sm cursor-pointer"
                >
                  견적 신청하기
                </button>
                <div
                  onClick={() => handleNavigate('USER-ATH-03')}
                  className="w-8 h-8 rounded-full bg-[#00254a] flex items-center justify-center cursor-pointer shadow-sm text-white"
                >
                  <span className="material-symbols-outlined text-[18px]">person</span>
                </div>
              </div>
            </div>
          </header>

          {/* 2. Main (Simulating Parent Screen USER-REQ-00 underneath) */}
          <main className="w-full pt-16 bg-[#f8f9ff] relative min-h-screen">
            <div className="w-full max-w-[1280px] mx-auto px-6 lg:px-12 py-6 select-none opacity-40 blur-[2px] pointer-events-none">
              {/* Breadcrumb & Status Tracker */}
              <div className="flex items-center justify-between pb-4">
                <div className="flex items-center gap-1.5 text-[#43474f] text-[13px]">
                  <span>홈</span>
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  <span>스마트 견적 신청</span>
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  <span className="text-[#00254a] font-bold">공간 및 가전 케어 견적서</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-[#dce9ff] rounded-full">
                  <span className="w-2 h-2 rounded-full bg-[#006c4a]"></span>
                  <span className="text-[11px] font-bold text-[#254873]">작성 단계: 02/04 옵션 선택</span>
                </div>
              </div>

              {/* Underlying Mocked Form Content */}
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-8 flex flex-col gap-6">
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e5eeff]">
                    <div className="flex items-center justify-between pb-3 border-b border-[#eff4ff]">
                      <h2 className="text-[20px] font-bold text-[#00254a]">1. 기본 공간 위생 정보</h2>
                      <span className="text-[11px] font-bold text-[#006c4a]">작성 완료</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 pt-3">
                      <div className="bg-[#eff4ff] p-3 rounded-xl">
                        <span className="text-[11px] text-[#43474f] block font-bold">건물 유형</span>
                        <p className="text-[17px] font-bold text-[#00254a]">사무실 / 복합공간</p>
                      </div>
                      <div className="bg-[#eff4ff] p-3 rounded-xl">
                        <span className="text-[11px] text-[#43474f] block font-bold">전용 면적</span>
                        <p className="text-[17px] font-bold text-[#00254a]">132.2㎡ (40평)</p>
                      </div>
                      <div className="bg-[#eff4ff] p-3 rounded-xl">
                        <span className="text-[11px] text-[#43474f] block font-bold">희망 작업일</span>
                        <p className="text-[17px] font-bold text-[#00254a]">2026.11.20 (수)</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e5eeff]">
                    <div className="flex items-center justify-between pb-3 border-b border-[#eff4ff]">
                      <h2 className="text-[20px] font-bold text-[#00254a]">2. 전문 가전 분해 살균 세척</h2>
                      <span className="text-[11px] font-bold text-[#00254a]">입찰 최적화 항목</span>
                    </div>
                    <div className="p-6 bg-[#eff4ff] rounded-xl flex items-center justify-center text-[#43474f] text-[13px]">
                      <span>+ 가전 품목을 추가하면 마스터의 정밀 장비가 배차됩니다.</span>
                    </div>
                  </div>
                </div>

                <div className="col-span-4 flex flex-col gap-4">
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e5eeff]">
                    <h3 className="text-[17px] font-bold text-[#00254a] pb-2">실시간 추정 견적</h3>
                    <div className="text-[32px] font-extrabold text-[#00254a] tracking-tight font-mono">
                      380,000<span className="text-[14px] ml-1 font-normal">원</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Real Interactive UserReq02Modal Overlaid */}
            <UserReq02Modal
              isOpen={true}
              onClose={() => handleNavigate('USER-REQ-00')}
              onAddItem={(item: ApplianceItemToAdd) => {
                alert(
                  `[USER-REQ-02] 가전 품목이 정상 추가되었습니다!\n\n` +
                    `- 품목명: ${item.applianceNm}\n` +
                    `- 제조사: ${item.brand}\n` +
                    `- 수량: ${item.quantity}대\n` +
                    `- 대당 희망단가: ${item.unitPrice.toLocaleString()}원\n` +
                    `- 총액: ${item.propAmt.toLocaleString()}원`
                );
                handleNavigate('USER-REQ-00');
              }}
              apiEndpoint="/api/user/user_req_02"
            />
          </main>

          {/* 4. Footer */}
          <footer className="w-full bg-[#eff4ff] border-t border-[#dce9ff]/60">
            <div className="max-w-[1280px] mx-auto px-6 lg:px-12 py-10 flex flex-col gap-6">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[17px] font-bold text-[#00254a]">SsulDak Care Platform</span>
                    <span className="px-2 py-0.5 rounded bg-[#dce9ff] text-[#254873] text-[11px] font-bold">
                      B2B & Premium Care
                    </span>
                  </div>
                  <p className="text-[13px] text-[#43474f] max-w-xl">
                    쓸고닦고는 공공기관, 상업 시설, 프리미엄 주거 환경을 위한 전문 방역·소독 및 종합 공간 위생 케어 통합 관제 솔루션입니다.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  <div className="flex flex-col">
                    <span className="text-[11px] text-[#43474f]">고객 케어 종합 관제 센터</span>
                    <span className="text-[20px] font-bold text-[#00254a] tracking-tight">1588-3024</span>
                    <span className="text-[11px] text-[#737780]">365일 24시간 연중무휴 긴급배차</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white shadow-sm border border-[#e5eeff]">
                    <span className="material-symbols-outlined text-[#006c4a] text-[24px]">verified_user</span>
                    <div className="flex flex-col">
                      <span className="text-[11px] text-[#0b1c30] font-bold">KB손해보험 5억원</span>
                      <span className="text-[11px] text-[#43474f]">영업배상책임보험 가입</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </footer>
        </div>
      ) : currentScreen === 'USER-REQ-01' ? (
        <div key="screen_user_req_01" className="relative min-h-screen bg-[#f8f9ff]">
          {/* 1. Header (User HTML identical header) */}
          <header className="fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(22,59,102,0.06)] border-b border-[#e5eeff]">
            <div className="h-16 max-w-[1280px] mx-auto px-6 lg:px-12 flex items-center justify-between gap-6">
              <div className="flex items-center gap-8">
                <a
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() => handleNavigate('USER-COM-00')}
                >
                  <div className="w-9 h-9 rounded-xl bg-[#00254a] flex items-center justify-center text-white shadow-sm">
                    <span className="material-symbols-outlined text-[22px]">cleaning_services</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[17px] font-bold text-[#00254a] tracking-tight">쓸고닦고</span>
                    <span className="text-[11px] text-[#43474f] uppercase tracking-wider">SsulDak Enterprise</span>
                  </div>
                </a>
                <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#85f8c4]/50 text-[#002114] text-[11px] font-bold">
                  <span className="w-2 h-2 rounded-full bg-[#006c4a] animate-pulse"></span>
                  <span>실시간 마스터 파트너 입찰 대기중</span>
                </div>
              </div>
              <nav className="hidden md:flex items-center gap-8">
                <a
                  className="text-[15px] font-semibold text-[#43474f] hover:text-[#0b1c30] transition-colors cursor-pointer"
                  onClick={() => handleNavigate('USER-COM-00')}
                >
                  서비스 안내
                </a>
                <a
                  className="text-[15px] font-semibold text-[#43474f] hover:text-[#0b1c30] transition-colors cursor-pointer"
                  onClick={() => handleNavigate('USER-REQ-00')}
                >
                  견적 가이드
                </a>
                <a
                  className="text-[15px] font-semibold text-[#43474f] hover:text-[#0b1c30] transition-colors cursor-pointer"
                  onClick={() => handleNavigate('USER-ATH-03')}
                >
                  고객지원
                </a>
              </nav>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => handleNavigate('USER-REQ-00')}
                  className="hidden sm:inline-flex items-center justify-center px-4 py-2 rounded-xl bg-[#00254a] text-white text-[13px] font-bold hover:bg-[#163b66] transition-all shadow-sm cursor-pointer"
                >
                  견적 신청하기
                </button>
                <div
                  onClick={() => handleNavigate('USER-ATH-03')}
                  className="w-8 h-8 rounded-full bg-[#00254a] flex items-center justify-center cursor-pointer shadow-sm text-white"
                >
                  <span className="material-symbols-outlined text-[18px]">person</span>
                </div>
              </div>
            </div>
          </header>

          {/* 2. Main (Underlying 청소 서비스 신청 USER-REQ-00 Page - Frosted & Dimmed Background Layer) */}
          <main className="w-full pt-16 bg-[#f8f9ff] relative min-h-screen">
            <div className="w-full max-w-[1280px] mx-auto px-6 lg:px-12 py-8 opacity-40 select-none pointer-events-none filter blur-[1.5px]">
              {/* Top Step Bar */}
              <div className="flex items-center justify-between pb-6 mb-6 border-b border-[#e5eeff]">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-[#00254a] text-white flex items-center justify-center text-[12px] font-bold">
                    01
                  </span>
                  <span className="text-[17px] text-[#00254a] font-bold">건물 및 구역 지정</span>
                  <span className="material-symbols-outlined text-[#737780]">chevron_right</span>
                  <span className="w-7 h-7 rounded-full bg-[#dce9ff] text-[#43474f] flex items-center justify-center text-[12px] font-bold">
                    02
                  </span>
                  <span className="text-[17px] text-[#43474f]">정기 과업 상세</span>
                  <span className="material-symbols-outlined text-[#737780]">chevron_right</span>
                  <span className="w-7 h-7 rounded-full bg-[#dce9ff] text-[#43474f] flex items-center justify-center text-[12px] font-bold">
                    03
                  </span>
                  <span className="text-[17px] text-[#43474f]">입찰 공고 게시</span>
                </div>
                <div className="flex items-center gap-2 text-[#43474f] text-[13px]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#006c4a]"></span>
                  임시저장 완료 (14:32:05)
                </div>
              </div>

              {/* Background Content Mockup: Building Detail */}
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-8 flex flex-col gap-6">
                  <div className="bg-white p-6 rounded-2xl shadow-sm flex flex-col gap-4 border border-[#e5eeff]">
                    <div className="flex justify-between items-center">
                      <h2 className="text-[20px] font-bold text-[#00254a]">기본 사업장 정보</h2>
                      <span className="px-2.5 py-1 rounded-full bg-[#e5eeff] text-[#163b66] text-[11px] font-bold">
                        근린생활시설 · 지상 5층
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-[14px] text-[#43474f]">
                      <div className="p-3 bg-[#eff4ff] rounded-xl">
                        <span className="text-[11px] block text-[#737780] font-bold">대상지 주소</span>
                        <span className="text-[#0b1c30] font-semibold">
                          서울특별시 마포구 월드컵북로 120 (성산빌딩)
                        </span>
                      </div>
                      <div className="p-3 bg-[#eff4ff] rounded-xl">
                        <span className="text-[11px] block text-[#737780] font-bold">계약 희망 형태</span>
                        <span className="text-[#0b1c30] font-semibold">
                          3개월 고정 정기관리 용역 계약
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-sm flex flex-col gap-4 border border-[#e5eeff]">
                    <div className="flex justify-between items-center">
                      <div>
                        <h2 className="text-[20px] font-bold text-[#00254a]">정기청소 과업 구역 목록</h2>
                        <p className="text-[13px] text-[#43474f] mt-1">
                          입찰에 부칠 청소 중분류별 층수 및 희망 단가를 관리합니다.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="px-4 py-2 bg-[#00254a] text-white rounded-xl text-[13px] font-bold flex items-center gap-1 shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                        구역 추가
                      </button>
                    </div>
                    <div className="p-8 text-center bg-[#eff4ff] rounded-xl text-[#43474f] text-[14px]">
                      추가된 청소 구역이 아직 없습니다. 상단의 '구역 추가' 버튼을 눌러주세요.
                    </div>
                  </div>
                </div>

                <div className="col-span-4 flex flex-col gap-6">
                  <div className="bg-white p-6 rounded-2xl shadow-sm flex flex-col gap-4 border border-[#e5eeff]">
                    <h3 className="text-[17px] font-bold text-[#00254a]">견적 산출 종합 요약</h3>
                    <div className="flex justify-between py-2 border-b border-[#eff4ff]">
                      <span className="text-[#43474f] text-[13px]">총 관리 구역 수</span>
                      <span className="font-bold text-[#0b1c30]">0 개 구역</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-[#43474f] text-[13px]">3개월 총 예정 용역비</span>
                      <span className="text-[20px] text-[#00254a] font-bold">0 원</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Real Interactive UserReq01Modal Overlaid */}
            <UserReq01Modal
              isOpen={true}
              onClose={() => handleNavigate('USER-REQ-00')}
              onAddItem={(item: RegularItemToAdd) => {
                alert(
                  `[USER-REQ-01] 선택하신 정기청소 구역이 정상 추가되었습니다!\n\n` +
                    `- 구역명: ${item.areaNm}\n` +
                    `- 방문주기: ${item.cycleNm}\n` +
                    `- 3개월 희망단가: ${item.propAmt.toLocaleString()}원 (월 ${Math.round(
                      item.propAmt / 3
                    ).toLocaleString()}원)`
                );
                handleNavigate('USER-REQ-00');
              }}
              apiEndpoint="/api/user/user_req_01"
            />
          </main>

          {/* 4. Footer */}
          <footer className="w-full bg-[#eff4ff] border-t border-[#dce9ff]/60">
            <div className="max-w-[1280px] mx-auto px-6 lg:px-12 py-10 flex flex-col gap-6">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[17px] font-bold text-[#00254a]">SsulDak Care Platform</span>
                    <span className="px-2 py-0.5 rounded bg-[#dce9ff] text-[#254873] text-[11px] font-bold">
                      B2B & Premium Care
                    </span>
                  </div>
                  <p className="text-[13px] text-[#43474f] max-w-xl">
                    쓸고닦고는 공공기관, 상업 시설, 프리미엄 주거 환경을 위한 전문 방역·소독 및 종합 공간 위생 케어 통합 관제 솔루션입니다.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  <div className="flex flex-col">
                    <span className="text-[11px] text-[#43474f]">고객 케어 종합 관제 센터</span>
                    <span className="text-[20px] font-bold text-[#00254a] tracking-tight">1588-3024</span>
                    <span className="text-[11px] text-[#737780]">365일 24시간 연중무휴 긴급배차</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white shadow-sm border border-[#e5eeff]">
                    <span className="material-symbols-outlined text-[#006c4a] text-[24px]">verified_user</span>
                    <div className="flex flex-col">
                      <span className="text-[11px] text-[#0b1c30] font-bold">KB손해보험 5억원</span>
                      <span className="text-[11px] text-[#43474f]">영업배상책임보험 가입</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-4 border-t border-[#dce9ff]/60 text-[13px]">
                <div className="flex flex-wrap items-center gap-4 text-[#43474f]">
                  <a className="hover:text-[#0b1c30] transition-colors cursor-pointer">이용약관</a>
                  <a className="font-bold text-[#0b1c30] hover:text-[#00254a] transition-colors cursor-pointer">
                    개인정보처리방침
                  </a>
                  <a className="hover:text-[#0b1c30] transition-colors cursor-pointer">마스터 파트너 계약기준</a>
                  <a className="hover:text-[#0b1c30] transition-colors cursor-pointer">전문 위생사 검증 체계</a>
                </div>
                <div className="text-[#737780] text-[12px]">
                  © 2026 SsulDak Inc. All rights reserved. Pristine Precision System.
                </div>
              </div>
            </div>
          </footer>
        </div>
      ) : currentScreen === 'USER-REQ-00' ? (
        <UserReq00Screen
          key="screen_user_req_00"
          initialUserNo={currentUserNo || 'U20261000001'}
          onNavigate={handleNavigate}
          logoSrc="/logo.png"
          apiEndpoint="/api/user/user_req_00"
        />
      ) : currentScreen === 'USER-ATH-03' ? (
        <UserAth03Screen
          key={`screen_user_ath_03_${currentUserNo || 'default'}`}
          initialUserNo={currentUserNo || 'U20261000001'}
          onNavigate={handleNavigate}
          logoSrc="/logo.png"
          apiEndpoint="/api/user/user_ath_03"
        />
      ) : currentScreen === 'USER-ATH-02' ? (
        <UserAth02Screen
          key="screen_user_ath_02"
          onNavigate={handleNavigate}
          logoSrc="/logo.png"
          apiEndpoint="/api/user/user_ath_02"
        />
      ) : currentScreen === 'USER-ATH-01' ? (
        <UserAth01Screen
          key="screen_user_ath_01"
          onNavigate={handleNavigate}
          onRegisterSuccess={handleRegisterSuccess}
          logoSrc="/logo.png"
          apiEndpoint="/api/user/user_ath_01"
        />
      ) : currentScreen === 'USER-ATH-00' ? (
        <UserAth00Screen
          key="screen_user_ath_00"
          onNavigate={handleNavigate}
          onLoginSuccess={handleLoginSuccess}
          logoSrc="/logo.png"
          apiEndpoint="/api/user/user_ath_00"
        />
      ) : (
        <UserCom00Screen
          key={`screen_user_com_00_${currentUserNo || 'guest'}`}
          initialUserNo={currentUserNo}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
          apiEndpoint="/api/user/user_com_00"
        />
      )}
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<AppPreview />);
}
