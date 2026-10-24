import mysql, { Pool, PoolOptions, RowDataPacket, ResultSetHeader } from 'mysql2/promise';

declare global {
    // eslint-disable-next-line no-var
    var __ssuldak_db_pool__: Pool | undefined;
}

const poolOptions: PoolOptions = {
    host: process.env.DB_HOST || '5.104.87.214',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'ssuldak',
    password: process.env.DB_PASSWORD || 'Ch72337528',
    database: process.env.DB_NAME || 'ssuldak_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
    timezone: '+09:00', // 한국 표준시(KST)
    // DBeaver의 Driver Properties (allowPublicKeyRetrieval, useSSL=false) 반영
    ssl: process.env.DB_USE_SSL === 'true' ? {} : undefined,
};

let pool: Pool;

if (process.env.NODE_ENV === 'production') {
    pool = mysql.createPool(poolOptions);
} else {
    if (!global.__ssuldak_db_pool__) {
        global.__ssuldak_db_pool__ = mysql.createPool(poolOptions);
    }
    pool = global.__ssuldak_db_pool__;
}

export function getDbPool(): Pool {
    return pool;
}

/**
 * 단일 SQL 쿼리 실행 함수
 * @param query 실행할 SQL 구문
 * @param params 바인딩 파라미터 배열
 */
export async function executeQuery<T = RowDataPacket[] | ResultSetHeader>(
    query: string,
    params: unknown[] = []
): Promise<T> {
    const db = getDbPool();
    const [results] = await db.execute(query, params as any);
    return results as T;
}

/**
 * 트랜잭션 전용 실행 헬퍼 함수
 * @param callback 트랜잭션 내에서 실행할 비즈니스 로직
 */
export async function executeTransaction<T>(
    callback: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> {
    const db = getDbPool();
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const result = await callback(connection);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export default pool;