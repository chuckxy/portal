import mongoose, { Schema, Model } from 'mongoose';

// @ts-ignore
export type PaymentMethod = 'cash' | 'cheque' | 'bank_transfer' | 'mobile_money' | 'card' | 'online' | 'scholarship';
export type PaymentStatus = 'pending' | 'confirmed' | 'failed' | 'reversed';

// Interface for ModifyHistory subdocument
export interface IModifyHistory {
    modifiedBy: mongoose.Types.ObjectId;
    modifiedAt: Date;
    changes?: any;
    reason?: string;
}

// Interface for FeesPayment document
// @ts-ignore
export interface IFeesPayment {
    student: mongoose.Types.ObjectId;
    site: mongoose.Types.ObjectId;
    class: mongoose.Types.ObjectId;
    academicYear: string;
    academicTerm?: number;
    amountPaid: number;
    currency: string;
    paymentMethod: PaymentMethod;
    paymentReference?: string;
    transactionId?: string;
    datePaid: Date;
    description?: string;
    receiptNumber?: string;
    receivedBy: mongoose.Types.ObjectId;
    status: PaymentStatus;
    modifyHistory: IModifyHistory[];
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

// @ts-ignore
const FeesPaymentSchema = new Schema(
    {
        student: {
            type: Schema.Types.ObjectId,
            ref: 'Person',
            required: true,
            index: true
        },
        site: {
            type: Schema.Types.ObjectId,
            ref: 'SchoolSite',
            required: true,
            index: true
        },
        class: {
            type: Schema.Types.ObjectId,
            ref: 'SiteClass',
            required: true,
            index: true
        },
        academicYear: {
            type: String,
            required: true,
            index: true
        },
        academicTerm: {
            type: Number,
            min: 1,
            max: 3,
            index: true
        },

        amountPaid: {
            type: Number,
            required: true,
            min: 0
        },

        currency: {
            type: String,
            default: 'GHS',
            uppercase: true
        },

        paymentMethod: {
            type: String,
            enum: ['cash', 'cheque', 'bank_transfer', 'mobile_money', 'card', 'online', 'scholarship'],
            required: true,
            index: true
        },

        paymentReference: {
            type: String,
            trim: true,
            unique: true,
            sparse: true,
            index: true
        },

        transactionId: {
            type: String,
            trim: true
        },

        datePaid: {
            type: Date,
            required: true,
            default: Date.now,
            index: true
        },

        description: {
            type: String,
            trim: true
        },

        receiptNumber: {
            type: String,
            unique: true,
            sparse: true,
            trim: true
        },

        receivedBy: {
            type: Schema.Types.ObjectId,
            ref: 'Person',
            required: true
        },

        status: {
            type: String,
            enum: ['pending', 'confirmed', 'failed', 'reversed'],
            default: 'confirmed',
            index: true
        },

        modifyHistory: [
            {
                modifiedBy: {
                    type: Schema.Types.ObjectId,
                    ref: 'Person',
                    required: true
                },
                modifiedAt: {
                    type: Date,
                    default: Date.now
                },
                changes: Schema.Types.Mixed,
                reason: String
            }
        ],

        notes: {
            type: String,
            trim: true
        }
    },
    {
        timestamps: true
    }
);

// Indexes
FeesPaymentSchema.index({ student: 1, academicYear: 1, academicTerm: 1 });
FeesPaymentSchema.index({ site: 1, datePaid: 1 });
FeesPaymentSchema.index({ paymentMethod: 1, status: 1 });

// Pre-save to generate receipt number if not provided
FeesPaymentSchema.pre('save', function (next) {
    if (!this.receiptNumber && this.isNew) {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        this.receiptNumber = `RCP-${timestamp}-${random}`;
    }
});

const FeesPayment: Model<IFeesPayment> = mongoose.models.FeesPayment || mongoose.model<IFeesPayment>('FeesPayment', FeesPaymentSchema);

export default FeesPayment;
