// project_SsulDak/test-db.mjs
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// .env.local 환경변수 로드
dotenv.config({ path: './.env.local' });

async function testConnection() {
    try {
        console.log('🔄 원격 MySQL 서버(5.104.87.214)에 접속 시도 중...');

        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || '5.104.87.214',
            port: Number(process.env.DB_PORT) || 3306,
            user: process.env.DB_USER || 'ssuldak',
            password: process.env.DB_PASSWORD || 'Ch72337528',
            database: process.env.DB_NAME || 'ssuldak_db',
            ssl: false,
        });

        console.log('✅ [성공] 원격 데이터베이스 ssuldak_db 연결 완료!');

        // 생성된 테이블 목록 및 개수 확인
        const [rows] = await connection.execute(
            'SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = ?',
            [process.env.DB_NAME || 'ssuldak_db']
        );

        console.log(`📊 현재 생성된 테이블 총 개수: ${rows.length}개`);
        console.log('📋 테이블 목록:');
        rows.forEach((r, idx) => console.log(`   ${idx + 1}. ${r.TABLE_NAME}`));

        await connection.end();
    } catch (err) {
        console.error('❌ [오류] 데이터베이스 연결 실패:', err.message);
    }
}

testConnection();