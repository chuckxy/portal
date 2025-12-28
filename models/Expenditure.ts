import mongoose, { Schema, Document, Model } from 'mongoose';

export type ExpenditureCategory =
    | 'salaries_wages'
    | 'utilities'
    | 'supplies'
    | 'maintenance'
    | 'transportation'
    | 'food_canteen'
    | 'equipment'
    | 'infrastructure'
    | 'insurance'
    | 'taxes_fees'
    | 'marketing'
    | 'professional_services'
    | 'staff_development'
    | 'student_activities'
    | 'library'
    | 'technology'
    | 'other';

export type ExpenditureStatus = 'pending' | 'approved' | 'paid' | 'rejected' | 'cancelled';

export type PaymentMethod = 'cash' | 'cheque' | 'bank_transfer' | 'mobile_money' | 'card';

// Interface for Expenditure document
export interface IExpenditure {
    school: mongoose.Types.ObjectId;
    site: mongoose.Types.ObjectId;
    expenditureDate: Date;
    category: ExpenditureCategory;
    subCategory?: string;
    amount: number;
    currency: string;
    description: string;
    vendor?: string;
    vendorContact?: string;
    paymentMethod?: PaymentMethod;
    referenceNumber?: string;
    receiptNumber?: string;
    invoiceNumber?: string;
    academicYear: string;
    academicTerm?: number;
    status: ExpenditureStatus;
    requestedBy: mongoose.Types.ObjectId;
    approvedBy?: mongoose.Types.ObjectId;
    approvalDate?: Date;
    paidBy?: mongoose.Types.ObjectId;
    paymentDate?: Date;
    notes?: string;
    attachments?: string[];
    createdAt: Date;
    updatedAt: Date;
}

const ExpenditureSchema = new Schema<IExpenditure>(
    {
        school: {
            type: Schema.Types.ObjectId,
            ref: 'School',
            required: true,
            index: true
        },
        site: {
            type: Schema.Types.ObjectId,
            ref: 'SchoolSite',
            required: true,
            index: true
        },
        expenditureDate: {
            type: Date,
            required: true,
            index: true
        },
        category: {
            type: String,
            enum: [
                'salaries_wages',
                'utilities',
                'supplies',
                'maintenance',
                'transportation',
                'food_canteen',
                'equipment',
                'infrastructure',
                'insurance',
                'taxes_fees',
                'marketing',
                'professional_services',
                'staff_development',
                'student_activities',
                'library',
                'technology',
                'other'
            ],
            required: true,
            index: true
        },
        subCategory: {
            type: String,
            trim: true
        },
        amount: {
            type: Number,
            required: true,
            min: 0
        },
        currency: {
            type: String,
            default: 'GHS',
            trim: true,
            uppercase: true
        },
        description: {
            type: String,
            required: true,
            trim: true
        },
        vendor: {
            type: String,
            trim: true
        },
        vendorContact: {
            type: String,
            trim: true
        },
        paymentMethod: {
            type: String,
            enum: ['cash', 'cheque', 'bank_transfer', 'mobile_money', 'card']
        },
        referenceNumber: {
            type: String,
            trim: true
        },
        receiptNumber: {
            type: String,
            trim: true,
            index: true
        },
        invoiceNumber: {
            type: String,
            trim: true
        },
        academicYear: {
            type: String,
            required: true,
            index: true,
            trim: true
        },
        academicTerm: {
            type: Number,
            enum: [1, 2, 3]
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'paid', 'rejected', 'cancelled'],
            default: 'pending',
            index: true
        },
        requestedBy: {
            type: Schema.Types.ObjectId,
            ref: 'Person',
            required: true
        },
        approvedBy: {
            type: Schema.Types.ObjectId,
            ref: 'Person'
        },
        approvalDate: {
            type: Date
        },
        paidBy: {
            type: Schema.Types.ObjectId,
            ref: 'Person'
        },
        paymentDate: {
            type: Date
        },
        notes: {
            type: String,
            trim: true
        },
        attachments: [
            {
                type: String,
                trim: true
            }
        ]
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// Indexes for efficient querying
ExpenditureSchema.index({ site: 1, expenditureDate: -1 });
ExpenditureSchema.index({ site: 1, academicYear: 1, academicTerm: 1 });
ExpenditureSchema.index({ category: 1, status: 1 });
ExpenditureSchema.index({ status: 1, expenditureDate: -1 });

// Virtual for category display name
ExpenditureSchema.virtual('categoryDisplay').get(function () {
    const categoryMap: Record<ExpenditureCategory, string> = {
        salaries_wages: 'Salaries & Wages',
        utilities: 'Utilities',
        supplies: 'Supplies',
        maintenance: 'Maintenance & Repairs',
        transportation: 'Transportation',
        food_canteen: 'Food & Canteen',
        equipment: 'Equipment',
        infrastructure: 'Infrastructure',
        insurance: 'Insurance',
        taxes_fees: 'Taxes & Fees',
        marketing: 'Marketing & Recruitment',
        professional_services: 'Professional Services',
        staff_development: 'Staff Development',
        student_activities: 'Student Activities',
        library: 'Library & Resources',
        technology: 'Technology & IT',
        other: 'Other'
    };
    return categoryMap[this.category] || this.category;
});

// Virtual for status display
ExpenditureSchema.virtual('statusDisplay').get(function () {
    const statusMap: Record<ExpenditureStatus, string> = {
        pending: 'Pending Approval',
        approved: 'Approved',
        paid: 'Paid',
        rejected: 'Rejected',
        cancelled: 'Cancelled'
    };
    return statusMap[this.status] || this.status;
});

// Virtual for payment pending (approved but not paid)
ExpenditureSchema.virtual('paymentPending').get(function () {
    return this.status === 'approved' && !this.paymentDate;
});

// Model type
type ExpenditureModel = Model<IExpenditure>;

// Export model
const Expenditure: ExpenditureModel = (mongoose.models.Expenditure as ExpenditureModel) || mongoose.model<IExpenditure, ExpenditureModel>('Expenditure', ExpenditureSchema);

export default Expenditure;
