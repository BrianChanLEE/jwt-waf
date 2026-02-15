/**
 * 사용자 서비스
 * 
 * 사용자 관련 비즈니스 로직을 처리합니다.
 */

interface User {
    id: string;
    username: string;
    email: string;
    role: string;
}

// 메모리 데이터 (예제용)
const users: User[] = [
    { id: '1', username: 'user1', email: 'user1@example.com', role: 'user' },
    { id: '2', username: 'user2', email: 'user2@example.com', role: 'user' },
    { id: '3', username: 'admin', email: 'admin@example.com', role: 'admin' }
];

/**
 * 모든 사용자 조회
 */
export async function getAllUsers(): Promise<User[]> {
    return users;
}

/**
 * 사용자 ID로 조회
 * 
 * @param id - 사용자 ID
 * @returns 사용자 정보
 */
export async function getUserById(id: string): Promise<User | null> {
    const user = users.find(u => u.id === id);
    return user || null;
}

/**
 * 사용자 삭제 (관리자 전용)
 * 
 * @param id - 사용자 ID
 * @returns 성공 여부
 */
export async function deleteUser(id: string): Promise<boolean> {
    const index = users.findIndex(u => u.id === id);
    if (index === -1) {
        return false;
    }

    users.splice(index, 1);
    return true;
}
