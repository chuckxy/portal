/**
 * Student Billing System Types
 *
 * Type definitions for the authoritative student billing management system.
 * These types ensure type safety across the billing UI components and API interactions.
 */

// ==================== ENUMS & CONSTANTS ====================

export type BillingStatus = 'clear' | 'owing' | 'overpaid' | 'pending';
export type BillingPeriodType = 'term' | 'semester';
export type ChargeCategory = 'tuition' | 'books' | 'uniform' | 'transport' | 'feeding' | 'extra_class' | 'sports' | 'laboratory' | 'examination' | 'miscellaneous' | 'penalty' | 'damage' | 'other';

export const CHARGE_CATEGORIES: { label: string; value: ChargeCategory; icon: string }[] = [
    { label: 'Tuition', value: 'tuition', icon: 'pi pi-book' },
    { label: 'Books & Materials', value: 'books', icon: 'pi pi-bookmark' },
    { label: 'Uniform', value: 'uniform', icon: 'pi pi-user' },
    { label: 'Transport', value: 'transport', icon: 'pi pi-car' },
    { label: 'Feeding', value: 'feeding', icon: 'pi pi-apple' },
    { label: 'Extra Classes', value: 'extra_class', icon: 'pi pi-clock' },
    { label: 'Sports', value: 'sports', icon: 'pi pi-star' },
    { label: 'Laboratory', value: 'laboratory', icon: 'pi pi-cog' },
    { label: 'Examination', value: 'examination', icon: 'pi pi-pencil' },
    { label: 'Miscellaneous', value: 'miscellaneous', icon: 'pi pi-ellipsis-h' },
    { label: 'Penalty/Fine', value: 'penalty', icon: 'pi pi-exclamation-triangle' },
    { label: 'Damage', value: 'damage', icon: 'pi pi-times-circle' },
    { label: 'Other', value: 'other', icon: 'pi pi-question-circle' }
];

export const BILLING_STATUS_CONFIG: Record<BillingStatus, { label: string; severity: 'success' | 'warning' | 'danger' | 'info'; icon: string }> = {
    clear: { label: 'Cleared', severity: 'success', icon: 'pi pi-check-circle' },
    owing: { label: 'Owing', severity: 'danger', icon: 'pi pi-exclamation-circle' },
    overpaid: { label: 'Overpaid', severity: 'info', icon: 'pi pi-plus-circle' },
    pending: { label: 'Pending', severity: 'warning', icon: 'pi pi-clock' }
};

// ==================== CORE INTERFACES ====================

export interface IFeeBreakdownItem {
    determinant: string;
    description: string;
    amount: number;
}

export interface IAdditionalCharge {
    _id?: string;
    chargedDate: Date | string;
    category: ChargeCategory;
    particulars: string;
    amount: number;
    addedBy:
        | {
              _id: string;
              firstName: string;
              lastName: string;
          }
        | string;
    reference?: string;
    notes?: string;
    createdAt: Date | string;
}

export interface IPaymentReference {
    paymentId: string;
    amount: number;
    datePaid: Date | string;
    receiptNumber?: string;
    paymentMethod?: string;
}

export interface IBillingAuditEntry {
    _id?: string;
    action: 'created' | 'charge_added' | 'payment_linked' | 'status_updated' | 'arrears_carried_forward';
    performedBy:
        | {
              _id: string;
              firstName: string;
              lastName: string;
          }
        | string;
    performedAt: Date | string;
    details: string;
    previousValue?: any;
    newValue?: any;
}

// ==================== MAIN BILLING INTERFACE ====================

export interface IStudentBilling {
    _id: string;

    // Identity & Context
    student: {
        _id: string;
        firstName: string;
        lastName: string;
        studentInfo?: {
            studentId?: string;
        };
        profileImage?: string;
    };
    school: {
        _id: string;
        name: string;
    };
    schoolSite: {
        _id: string;
        siteName: string;
        description?: string;
    };
    academicYear: string;
    academicPeriodType: BillingPeriodType;
    academicTerm?: number;
    academicSemester?: number;
    class: {
        _id: string;
        className: string;
        division?: string;
        sequence?: number;
    };

    // Core Financial Fields
    balanceBroughtForward: number;
    termOrSemesterBill: number;
    feeBreakdown: IFeeBreakdownItem[];
    addedChargesTotal: number;
    totalBilled: number;
    totalPaid: number;
    currentBalance: number;

    // Additional Data
    additionalCharges: IAdditionalCharge[];
    linkedPayments: IPaymentReference[];

    // Status & Metadata
    billingStatus: BillingStatus;
    feeConfigurationId?: string;
    billGeneratedDate: Date | string;
    paymentDueDate?: Date | string;
    currency: string;

    // Audit & Tracking
    createdBy: {
        _id: string;
        firstName: string;
        lastName: string;
    };
    lastModifiedBy?: {
        _id: string;
        firstName: string;
        lastName: string;
    };
    auditTrail: IBillingAuditEntry[];
    isLocked: boolean;
    isCurrent: boolean;

    // Carry Forward
    carriedForwardTo?: {
        _id: string;
        academicYear: string;
        academicTerm?: number;
    };
    carriedForwardFrom?: {
        _id: string;
        academicYear: string;
        academicTerm?: number;
        currentBalance?: number;
    };

    // Timestamps
    createdAt: Date | string;
    updatedAt: Date | string;
}

// ==================== API REQUEST/RESPONSE TYPES ====================

export interface CreateBillingRequest {
    studentId: string;
    schoolSiteId: string;
    academicYear: string;
    academicTerm?: number;
    academicSemester?: number;
    classId: string;
    academicPeriodType?: BillingPeriodType;
    balanceBroughtForward?: number;
    termOrSemesterBill?: number;
    feeBreakdown?: IFeeBreakdownItem[];
    feeConfigurationId?: string;
    paymentDueDate?: Date | string;
    currency?: string;
    carryForwardFromId?: string;
}

export interface AddChargeRequest {
    chargedDate?: Date | string;
    category: ChargeCategory;
    particulars: string;
    amount: number;
    reference?: string;
    notes?: string;
}

export interface LinkPaymentRequest {
    paymentId: string;
}

export interface BillingListResponse {
    billings: IStudentBilling[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    summary: BillingSummary;
}

export interface BillingSummary {
    totalBilled: number;
    totalPaid: number;
    totalOutstanding: number;
    totalOverpaid: number;
    owingCount: number;
    clearCount: number;
    overpaidCount: number;
    netBalance?: number;
    collectionRate?: number | string;
    totalStudents?: number;
    totalTermFees?: number;
    totalArrears?: number;
    totalAdditionalCharges?: number;
    pendingCount?: number;
    avgBalance?: number;
    maxBalance?: number;
    minBalance?: number;
}

export interface BillingSummaryResponse {
    summary: BillingSummary;
    statusBreakdown: {
        _id: BillingStatus;
        count: number;
        totalBalance: number;
        totalBilled: number;
        totalPaid: number;
    }[];
    classBreakdown: {
        _id: string;
        className: string;
        studentCount: number;
        totalBilled: number;
        totalPaid: number;
        totalOutstanding: number;
        owingCount: number;
        clearCount: number;
    }[];
    topDebtors: IStudentBilling[];
    collectionTrend: {
        period: string;
        academicYear: string;
        academicTerm: number;
        totalBilled: number;
        totalPaid: number;
        studentCount: number;
        collectionRate: number;
    }[];
    chargeCategories: {
        _id: ChargeCategory;
        totalAmount: number;
        count: number;
    }[];
    filters: {
        schoolSiteId: string;
        academicYear?: string;
        academicTerm?: string;
        classId?: string;
    };
}

export interface GenerateBillingRequest {
    schoolSiteId: string;
    academicYear: string;
    academicTerm: number;
    classIds?: string[];
    departmentId?: string;
}

export interface GenerateBillingResponse {
    success: boolean;
    message: string;
    results: {
        generated: number;
        skipped: number;
        errors: { studentId: string; error: string }[];
        details: {
            studentId: string;
            studentName: string;
            billingId: string;
            totalBilled: number;
        }[];
    };
}

// ==================== FILTER & SEARCH TYPES ====================

export interface BillingFilters {
    studentId?: string;
    search?: string;
    siteId?: string;
    classId?: string;
    academicYear?: string;
    academicTerm?: number;
    billingStatus?: BillingStatus;
    currentOnly?: boolean;
    owingOnly?: boolean;
    minBalance?: number;
    maxBalance?: number;
}

export interface BillingListParams extends BillingFilters {
    page?: number;
    limit?: number;
    sortField?: string;
    sortOrder?: 1 | -1;
}

// ==================== UI COMPONENT TYPES ====================

export interface BillingTableColumn {
    field: string;
    header: string;
    sortable?: boolean;
    style?: React.CSSProperties;
    body?: (rowData: IStudentBilling) => React.ReactNode;
}

export interface ChargeDialogData {
    visible: boolean;
    billingId: string | null;
    studentName: string;
    currency: string;
}

export interface BillingViewDialogData {
    visible: boolean;
    billing: IStudentBilling | null;
}

// ==================== HELPER TYPES ====================

export interface StudentForBilling {
    _id: string;
    firstName: string;
    lastName: string;
    studentInfo?: {
        studentId?: string;
        currentClass?: {
            _id: string;
            className: string;
        };
        balanceBroughtForward?: number;
    };
    schoolSite?: {
        _id: string;
        siteName: string;
    };
}

export interface ClassForBilling {
    _id: string;
    className: string;
    division?: string;
    sequence?: number;
    department?: {
        _id: string;
        name: string;
    };
    studentCount?: number;
}

export interface FeeConfigForBilling {
    _id: string;
    configName?: string;
    totalAmount: number;
    feeItems: IFeeBreakdownItem[];
    paymentDeadline?: Date | string;
    currency: string;
}
