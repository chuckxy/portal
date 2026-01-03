import { PaymentMethod, PaymentStatus } from '@/models/FeesPayment';

export interface PaymentFormData {
    // Step 1: Context
    studentId: string;
    siteId: string;
    classId: string;
    academicYear: string;
    academicTerm?: number;

    // Step 2: Payment Details
    amountPaid: number;
    currency: string;
    paymentMethod: PaymentMethod;
    paymentReference?: string;
    transactionId?: string;
    datePaid: Date;
    description?: string;
    notes?: string;
    status: PaymentStatus;

    // Auto-populated
    receivedBy?: string;
}

export interface Student {
    _id: string;
    firstName: string;
    lastName: string;
    studentInfo: {
        studentId: string;
        currentClass: {
            _id: string;
            className: string;
        };
    };

    schoolSite?: {
        _id: string;
        siteName: string;
    };
}

export interface StudentBalance {
    studentId: string;
    outstandingBalance: number;
    totalFeesForPeriod: number;
    totalPaid: number;
    previousArrears: number;
    /** Balance Brought Forward - Opening balance from before computerization */
    balanceBroughtForward: number;
    totalOutstanding: number;
    previousPayments: PreviousPayment[];
    currency: string;
}

export interface PreviousPayment {
    _id: string;
    amountPaid: number;
    datePaid: Date;
    term?: number;
    receiptNumber: string;
}

export interface PaymentListItem {
    _id: string;
    receiptNumber: string;
    student: {
        _id: string;
        firstName: string;
        lastName: string;
        studentId: string;
    };
    amountPaid: number;
    currency: string;
    paymentMethod: PaymentMethod;
    datePaid: Date;
    status: PaymentStatus;
    receivedBy: {
        _id: string;
        firstName: string;
        lastName: string;
    };
    academicYear: string;
    academicTerm?: number;
    site: {
        _id: string;
        name: string;
    };
}

export interface PaymentModification {
    _id: string;
    payment: {
        receiptNumber: string;
        student: {
            firstName: string;
            lastName: string;
        };
        amountPaid: number;
    };
    modifiedBy: {
        firstName: string;
        lastName: string;
    };
    modifiedAt: Date;
    changes: any;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    approvedBy?: {
        firstName: string;
        lastName: string;
    };
    approvedAt?: Date;
}

export interface PaymentFilters {
    search?: string;
    siteId?: string;
    classId?: string;
    academicYear?: string;
    academicTerm?: number;
    paymentMethod?: PaymentMethod;
    status?: PaymentStatus;
    dateFrom?: Date;
    dateTo?: Date;
    minAmount?: number;
    maxAmount?: number;
}
