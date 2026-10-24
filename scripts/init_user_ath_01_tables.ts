import { executeQuery } from '../lib/db';

async function initTables() {
  console.log('--- Initializing TB_USER, TB_SALES_MEMBER, TB_PROMO_CAMPAIGN, TB_USER_COUPON ---');

  // 1. TB_USER 컬럼 확인 및 추가
  try {
    await executeQuery(`
      ALTER TABLE TB_USER 
      ADD COLUMN IF NOT EXISTS RECOMMENDER_CODE VARCHAR(20) NULL COMMENT '가입 시 추천인 코드',
      ADD COLUMN IF NOT EXISTS JOIN_PATH_CD VARCHAR(20) NOT NULL DEFAULT 'DIRECT' COMMENT '가입 경로 (DIRECT, KAKAO, NAVER, GOOGLE)',
      ADD COLUMN IF NOT EXISTS CANCEL_ACCUM_CNT INT NOT NULL DEFAULT 0 COMMENT '선 취소 누적 횟수',
      ADD COLUMN IF NOT EXISTS MKT_AGREE_YN CHAR(1) NOT NULL DEFAULT 'N' COMMENT '마케팅 정보 수신 동의 여부';
    `);
    console.log('✓ TB_USER columns updated');
  } catch (e: any) {
    console.log('TB_USER alter notice:', e.message);
  }

  // 2. TB_SALES_MEMBER
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS TB_SALES_MEMBER (
      REFERRAL_CODE      VARCHAR(20)   NOT NULL COMMENT '영업회원 고유 추천인 코드',
      MEMBER_NM          VARCHAR(50)   NOT NULL COMMENT '영업회원 실명',
      SALES_STAT_CD      VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE' COMMENT '활동 상태 (ACTIVE, INACTIVE)',
      TOTAL_RECRUIT_CNT  INT           NOT NULL DEFAULT 0 COMMENT '유치 회원 누적 수',
      REG_DT             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      MOD_DT             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      MOD_ID             VARCHAR(50)   NOT NULL DEFAULT 'SYSTEM',
      PRIMARY KEY (REFERRAL_CODE)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='영업회원 마스터';
  `);
  console.log('✓ TB_SALES_MEMBER table ensured');

  // 테스트 추천인 코드 삽입
  await executeQuery(`
    INSERT INTO TB_SALES_MEMBER (REFERRAL_CODE, MEMBER_NM, SALES_STAT_CD, TOTAL_RECRUIT_CNT)
    VALUES ('SSULDAK8', '쓸딱본사마케팅', 'ACTIVE', 12)
    ON DUPLICATE KEY UPDATE SALES_STAT_CD = 'ACTIVE';
  `);
  console.log('✓ Sample referral code SSULDAK8 inserted');

  // 3. TB_PROMO_CAMPAIGN
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS TB_PROMO_CAMPAIGN (
      CAMPAIGN_NO     VARCHAR(30)   NOT NULL COMMENT '캠페인 번호',
      CAMPAIGN_NM     VARCHAR(100)  NOT NULL COMMENT '캠페인 명칭',
      TARGET_ROLE_CD  VARCHAR(20)   NOT NULL DEFAULT 'USER' COMMENT '대상 역할 (USER, PARTNER, ALL)',
      DISCOUNT_AMT    DECIMAL(10,2) NOT NULL DEFAULT 5000.00 COMMENT '할인 혜택 금액',
      VALID_DAYS      INT           NOT NULL DEFAULT 30 COMMENT '쿠폰 유효 일수',
      IS_ACTIVE_YN    CHAR(1)       NOT NULL DEFAULT 'Y' COMMENT '활성화 여부',
      START_DT        DATETIME      NOT NULL COMMENT '시작 일시',
      END_DT          DATETIME      NOT NULL COMMENT '종료 일시',
      REG_DT          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (CAMPAIGN_NO)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='프로모션 캠페인 마스터';
  `);
  console.log('✓ TB_PROMO_CAMPAIGN table ensured');

  // 테스트 웰컴 캠페인 삽입
  await executeQuery(`
    INSERT INTO TB_PROMO_CAMPAIGN (
      CAMPAIGN_NO, CAMPAIGN_NM, TARGET_ROLE_CD, DISCOUNT_AMT, VALID_DAYS, IS_ACTIVE_YN, START_DT, END_DT
    )
    VALUES (
      'CMP202610WELCOME', '신규가입 웰컴 5,000원 즉시할인 쿠폰', 'USER', 5000, 30, 'Y', 
      '2026-01-01 00:00:00', '2026-12-31 23:59:59'
    )
    ON DUPLICATE KEY UPDATE IS_ACTIVE_YN = 'Y';
  `);
  console.log('✓ Sample welcome campaign CMP202610WELCOME inserted');

  // 4. TB_USER_COUPON
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS TB_USER_COUPON (
      U_COUPON_NO       VARCHAR(30)   NOT NULL COMMENT '쿠폰 발급 번호',
      USER_NO           CHAR(12)      NOT NULL COMMENT '이용자 식별자 (CHAR(12))',
      CAMPAIGN_NO       VARCHAR(30)   NOT NULL COMMENT '캠페인 번호',
      COUPON_SERIAL_CD  VARCHAR(30)   NOT NULL COMMENT '고유 시리얼 코드',
      COUPON_STAT_CD    VARCHAR(20)   NOT NULL DEFAULT 'AVAILABLE' COMMENT '쿠폰 상태 (AVAILABLE, USED, EXPIRED)',
      EXPIRE_DT         DATETIME      NOT NULL COMMENT '만료 일시',
      REG_DT            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      REG_ID            VARCHAR(50)   NOT NULL DEFAULT 'SYSTEM',
      MOD_DT            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      MOD_ID            VARCHAR(50)   NOT NULL DEFAULT 'SYSTEM',
      PRIMARY KEY (U_COUPON_NO),
      UNIQUE KEY UK_COUPON_SERIAL (COUPON_SERIAL_CD),
      KEY IX_USER_COUPON (USER_NO, COUPON_STAT_CD)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='이용자 쿠폰 보유 원장';
  `);
  console.log('✓ TB_USER_COUPON table ensured');

  process.exit(0);
}

initTables().catch((e) => {
  console.error('Init error:', e);
  process.exit(1);
});
