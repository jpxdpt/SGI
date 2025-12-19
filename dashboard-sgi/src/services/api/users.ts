import { apiRequest, API_BASE } from './base';

export interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt?: string;
}

export async function fetchUsers(): Promise<User[]> {
    if (!API_BASE) return [];
    try {
        return await apiRequest('/users');
    } catch {
        return [];
    }
}

export async function createUser(data: any): Promise<User> {
    return await apiRequest('/users', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function deleteUser(id: string): Promise<any> {
    return await apiRequest(`/users/${id}`, {
        method: 'DELETE',
    });
}
