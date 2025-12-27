import mongoose, { Schema, Document, Model } from 'mongoose';

export type LendingStatus = 'active' | 'returned' | 'overdue' | 'partially_returned';
export type ItemCondition = 'good' | 'fair' | 'damaged' | 'lost';
export type FineReason = 'overdue' | 'damage' | 'loss' | 'other';

// Interface for LendingItem subdocument
export interface ILendingItem {
    book: mongoose.Types.ObjectId;
    quantityIssued: number;
    quantityReturned: number;
    dateReturned?: Date;
    receivedBy?: mongoose.Types.ObjectId;
    condition: ItemCondition;
    returnNotes?: string;
}

// Interface for RenewalHistory subdocument
export interface IRenewalHistory {
    renewedBy?: mongoose.Types.ObjectId;
    renewedAt: Date;
    previousDueDate?: Date;
    newDueDate?: Date;
}

// Interface for Fine subdocument
export interface IFine {
    reason: FineReason;
    amount: number;
    isPaid: boolean;
    paidDate?: Date;
    notes?: string;
}

// Interface for LibraryLending document
export interface ILibraryLending extends Document {
    borrower: mongoose.Types.ObjectId;
    site: mongoose.Types.ObjectId;
    issuedBy: mongoose.Types.ObjectId;
    issuedDate: Date;
    dueDate: Date;
    status: LendingStatus;
    items: ILendingItem[];
    renewalCount: number;
    renewalHistory: IRenewalHistory[];
    fines: IFine[];
    totalFines: number;
    notes?: string;
    isOverdue: boolean;
    daysOverdue: number;
    createdAt: Date;
    updatedAt: Date;
    calculateTotalFines(): number;
    checkAllReturned(): boolean;
}

const LibraryLendingSchema = new Schema<ILibraryLending>(
    {
        borrower: {
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

        issuedBy: {
            type: Schema.Types.ObjectId,
            ref: 'Person',
            required: true
        },

        issuedDate: {
            type: Date,
            default: Date.now,
            index: true
        },

        dueDate: {
            type: Date,
            required: true,
            index: true
        },

        status: {
            type: String,
            enum: ['active', 'returned', 'overdue', 'partially_returned'],
            default: 'active',
            index: true
        },

        items: [
            {
                book: {
                    type: Schema.Types.ObjectId,
                    ref: 'LibraryItem',
                    required: true
                },
                quantityIssued: {
                    type: Number,
                    default: 1,
                    min: 1
                },
                quantityReturned: {
                    type: Number,
                    default: 0,
                    min: 0
                },
                dateReturned: Date,
                receivedBy: {
                    type: Schema.Types.ObjectId,
                    ref: 'Person'
                },
                condition: {
                    type: String,
                    enum: ['good', 'fair', 'damaged', 'lost'],
                    default: 'good'
                },
                returnNotes: String
            }
        ],

        renewalCount: {
            type: Number,
            default: 0
        },

        renewalHistory: [
            {
                renewedBy: {
                    type: Schema.Types.ObjectId,
                    ref: 'Person'
                },
                renewedAt: {
                    type: Date,
                    default: Date.now
                },
                previousDueDate: Date,
                newDueDate: Date
            }
        ],

        fines: [
            {
                reason: {
                    type: String,
                    enum: ['overdue', 'damage', 'loss', 'other'],
                    required: true
                },
                amount: {
                    type: Number,
                    required: true,
                    min: 0
                },
                isPaid: {
                    type: Boolean,
                    default: false
                },
                paidDate: Date,
                notes: String
            }
        ],

        totalFines: {
            type: Number,
            default: 0
        },

        notes: {
            type: String,
            trim: true
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// Indexes
LibraryLendingSchema.index({ borrower: 1, status: 1 });
LibraryLendingSchema.index({ site: 1, issuedDate: 1 });
LibraryLendingSchema.index({ dueDate: 1, status: 1 });
LibraryLendingSchema.index({ 'items.book': 1 });

// Virtual to check if overdue
LibraryLendingSchema.virtual('isOverdue').get(function (this: ILibraryLending) {
    return this.status === 'active' && new Date() > this.dueDate;
});

// Virtual for days overdue
LibraryLendingSchema.virtual('daysOverdue').get(function (this: ILibraryLending) {
    if (this.status !== 'active' && this.status !== 'overdue') return 0;
    const now = new Date();
    if (now <= this.dueDate) return 0;
    const diffTime = Math.abs(now.getTime() - this.dueDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Method to calculate total fines
LibraryLendingSchema.methods.calculateTotalFines = function (this: ILibraryLending): number {
    this.totalFines = this.fines.reduce((sum, fine) => sum + (fine.amount || 0), 0);
    return this.totalFines;
};

// Method to check if all items returned
LibraryLendingSchema.methods.checkAllReturned = function (this: ILibraryLending): boolean {
    const allReturned = this.items.every((item) => item.quantityReturned >= item.quantityIssued);
    if (allReturned) {
        this.status = 'returned';
    } else if (this.items.some((item) => item.quantityReturned > 0)) {
        this.status = 'partially_returned';
    }
    return allReturned;
};

// Pre-save to update status if overdue
LibraryLendingSchema.pre('save', function () {
    this.calculateTotalFines();

    if (this.status === 'active' && new Date() > this.dueDate) {
        this.status = 'overdue';
    }
});

const LibraryLending: Model<ILibraryLending> = mongoose.models.LibraryLending || mongoose.model<ILibraryLending>('LibraryLending', LibraryLendingSchema);

export default LibraryLending;
