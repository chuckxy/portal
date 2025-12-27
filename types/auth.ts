import { PersonCategory } from '@/models/Person';

export interface User {
    _id: string;
    id: string;
    username: string;
    firstName: string;
    middleName?: string;
    lastName?: string;
    fullName: string;
    email?: string;
    phone?: string;
    personCategory: PersonCategory;
    school: string;
    schoolSite: string;
    photoLink?: string;
    lastLogin?: Date;
    createdAt: Date;
}

export interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}

export interface LoginCredentials {
    username: string;
    password: string;
    rememberMe?: boolean;
}

export interface AuthResponse {
    success: boolean;
    message: string;
    user?: User;
    token?: string;
    requiresVerification?: boolean;
}

export interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (credentials: LoginCredentials) => Promise<AuthResponse>;
    logout: () => Promise<void>;
    updateProfile: (data: Partial<User>) => Promise<void>;
    refreshUser: () => Promise<void>;
}
