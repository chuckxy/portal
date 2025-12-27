import { User } from './auth';

export type TLocalStore = {
    storageId: number;
    registrationData: IRegistrationData | null;
    user: User | null;
    authToken: string | null;
    rememberMe: boolean | null;
};
export type TLocalStoreRecordType = IRegistrationData | User | string | boolean | null;

export interface IRegistrationData {
    // School Information
    schoolName: string;
    schoolType: 'public' | 'private' | 'shared';
    dateFounded?: Date | null;
    motto?: string;

    // School Site Information
    siteName: string;
    siteDescription: string;
    schoolLevel: 'early_child' | 'basic' | 'junior' | 'senior' | 'tertiary';
    tertiaryType?: 'university' | 'nursing_training' | 'teacher_training' | 'vocational' | 'n/a';
    sitePhone?: string;
    siteEmail?: string;
    street?: string;
    town?: string;
    constituency?: string;

    // Proprietor Information
    firstName: string;
    middleName?: string;
    lastName?: string;
    dateOfBirth?: Date | null;
    gender?: 'male' | 'female' | 'other';
    mobilePhone?: string;
    email?: string;

    // Account Information
    username: string;
    password: string;
    confirmPassword: string;
}
