import { executeQuery } from '../lib/db';

async function setup() {
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS TB_PROMO_CAMPAIGN (
      CAMPAIGN_NO     VARCHAR(30)   NOT NULL COMMENT '캠페인 번호',
      CAMPAIGN_NM     VARCHAR(100)  NOT NULL COMMENT '캠페인 명칭',
      TARGET_ROLE_CD  VARCHAR(20)   NOT NULL DEFAULT 'USER' COMMENT '대상 역할 (USER, ALL)',
      DISCOUNT_AMT    DECIMAL(10,2) NOT NULL DEFAULT 5000.00 COMMENT '할인 금액',
      VALID_DAYS      INT           NOT NULL DEFAULT 30 COMMENT '유효 일수',
      IS_ACTIVE_YN    CHAR(1)       NOT NULL DEFAULT 'Y' COMMENT '활성화 여부 (Y/N)',
      START_DT        DATETIME      NOT NULL COMMENT '시작 일시',
      END_DT          DATETIME      NOT NULL COMMENT '종료 일시',
      REG_DT          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (CAMPAIGN_NO)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='프로모션 캠페인 원장';
  `);

  await executeQuery(`
    INSERT INTO TB_PROMO_CAMPAIGN (
      CAMPAIGN_NO, CAMPAIGN_NM, TARGET_ROLE_CD, DISCOUNT_AMT, VALID_DAYS, IS_ACTIVE_YN, START_DT, END_DT
    )
    VALUES (
      'CMP_WELCOME_5000', '신규가입 웰컴 5,000원 즉시할인 쿠폰', 'USER', 5000.00, 30, 'Y',
      '2026-01-01 00:00:00', '2026-12-31 23:59:59'
    )
    ON DUPLICATE KEY UPDATE IS_ACTIVE_YN = 'Y';
  `);

  console.log('TB_PROMO_CAMPAIGN setup completed.');
  process.exit(0);
}

setup().catch(err => {
  console.error('Setup failed:', err);
  process.exit(1);
});
