/**
 * Shared UI Types
 */

export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type Variant = 'solid' | 'outline' | 'ghost' | 'link';

export type Intent = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

export type Alignment = 'start' | 'center' | 'end';

export type Orientation = 'horizontal' | 'vertical';

export interface BaseComponentProps {
    className?: string;
    children?: React.ReactNode;
    id?: string;
}

// Role-based theming
export type UserRole = 'student' | 'teacher' | 'admin' | 'finance' | 'parent' | 'librarian' | 'proprietor';

export interface RoleColors {
    student: string;
    teacher: string;
    admin: string;
    finance: string;
    parent: string;
    librarian: string;
    proprietor: string;
}

// Animation variants for Framer Motion
export const fadeIn = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
};

export const slideUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 }
};

export const slideIn = {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
};

export const scaleIn = {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 }
};

// Status types for various entities
export type EnrollmentStatus = 'active' | 'completed' | 'paused' | 'dropped';

export type AssignmentStatus = 'pending' | 'in_progress' | 'submitted' | 'graded' | 'late';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export type PaymentStatus = 'paid' | 'partial' | 'pending' | 'overdue';

// Grade types
export type GradeType = 'letter' | 'percentage' | 'points' | 'pass_fail';

export interface GradeConfig {
    type: GradeType;
    passingThreshold?: number;
    maxPoints?: number;
}
