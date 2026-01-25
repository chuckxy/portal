import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * STUDENT BILLING SYSTEM
 *
 * This model represents the authoritative source of truth for all student financial
 * calculations. Each billing record is tied to a specific academic period (year/term)
 * and class, ensuring accurate financial tracking across promotions.
 *
 * BILLING COMPUTATION RULES:
 * 1. totalPayable = balanceBroughtForward + termOrSemesterBill + addedChargesTotal - totalPaid
 * 2. Billing records are immutable per academic period (new records created on promotion)
 * 3. Arrears flow forward as balanceBroughtForward in the next period's billing record
 * 4. Additional charges can be added but never removed (audit trail maintained)
 */

// Types
export type BillingStatus = 'clear' | 'owing' | 'overpaid' | 'pending';
export type BillingPeriodType = 'term' | 'semester';
export type ChargeCategory = 'tuition' | 'books' | 'uniform' | 'transport' | 'feeding' | 'extra_class' | 'sports' | 'laboratory' | 'examination' | 'miscellaneous' | 'penalty' | 'damage' | 'other';

// Interface for Additional Charge entry (immutable once created)
export interface IAdditionalCharge {
    _id?: mongoose.Types.ObjectId;
    chargedDate: Date;
    category: ChargeCategory;
    particulars: string;
    amount: number;
    addedBy: mongoose.Types.ObjectId;
    reference?: string;
    notes?: string;
    createdAt: Date;
}

// Interface for Fee Breakdown Item
export interface IFeeBreakdownItem {
    determinant: string;
    description: string;
    amount: number;
}

// Interface for Payment Reference (linking to FeesPayment records)
export interface IPaymentReference {
    paymentId: mongoose.Types.ObjectId;
    amount: number;
    datePaid: Date;
    receiptNumber?: string;
    paymentMethod?: string;
}

// Interface for Audit Trail Entry
export interface IBillingAuditEntry {
    action: 'created' | 'charge_added' | 'payment_linked' | 'status_updated' | 'arrears_carried_forward';
    performedBy: mongoose.Types.ObjectId;
    performedAt: Date;
    details: string;
    previousValue?: any;
    newValue?: any;
}

// Main StudentBilling interface
export interface IStudentBilling extends Document {
    // Identity & Context
    student: mongoose.Types.ObjectId;
    school: mongoose.Types.ObjectId;
    schoolSite: mongoose.Types.ObjectId;
    academicYear: string;
    academicPeriodType: BillingPeriodType;
    academicTerm?: number; // 1, 2, 3 for terms
    academicSemester?: number; // 1, 2 for semesters
    class: mongoose.Types.ObjectId;

    // Core Financial Fields
    balanceBroughtForward: number; // Arrears from previous period
    termOrSemesterBill: number; // Base bill from fee configuration
    feeBreakdown: IFeeBreakdownItem[]; // Detailed breakdown of fees
    addedChargesTotal: number; // Sum of all additional charges
    totalBilled: number; // balanceBroughtForward + termOrSemesterBill + addedChargesTotal
    totalPaid: number; // Sum of all linked payments
    currentBalance: number; // totalBilled - totalPaid (positive = owing, negative = overpaid)

    // Additional Charges Array (immutable entries)
    additionalCharges: IAdditionalCharge[];

    // Payment References
    linkedPayments: IPaymentReference[];

    // Status & Metadata
    billingStatus: BillingStatus;
    feeConfigurationId?: mongoose.Types.ObjectId; // Reference to source fee config
    billGeneratedDate: Date;
    paymentDueDate?: Date;
    currency: string;

    // Audit & Tracking
    createdBy: mongoose.Types.ObjectId;
    lastModifiedBy?: mongoose.Types.ObjectId;
    auditTrail: IBillingAuditEntry[];
    isLocked: boolean; // Prevents modifications when period is closed
    isCurrent: boolean; // True if this is the active billing period for the student

    // Carry Forward Tracking
    carriedForwardTo?: mongoose.Types.ObjectId; // Reference to next period's billing record
    carriedForwardFrom?: mongoose.Types.ObjectId; // Reference to previous period's billing record

    // Timestamps
    createdAt: Date;
    updatedAt: Date;
}

// Additional Charge Schema
// @ts-ignore
const AdditionalChargeSchema = new Schema(
    {
        chargedDate: {
            type: Date,
            required: true,
            default: Date.now
        },
        category: {
            type: String,
            enum: ['tuition', 'books', 'uniform', 'transport', 'feeding', 'extra_class', 'sports', 'laboratory', 'examination', 'miscellaneous', 'penalty', 'damage', 'other'],
            required: true,
            default: 'other'
        },
        particulars: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500
        },
        amount: {
            type: Number,
            required: true,
            min: 0
        },
        addedBy: {
            type: Schema.Types.ObjectId,
            ref: 'Person',
            required: true
        },
        reference: {
            type: String,
            trim: true
        },
        notes: {
            type: String,
            trim: true,
            maxlength: 1000
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    },
    { _id: true }
);

// Fee Breakdown Item Schema
// @ts-ignore
const FeeBreakdownItemSchema = new Schema(
    {
        determinant: {
            type: String,
            trim: true
        },
        description: {
            type: String,
            required: true,
            trim: true
        },
        amount: {
            type: Number,
            required: true,
            min: 0
        }
    },
    { _id: false }
);

// Payment Reference Schema
// @ts-ignore
const PaymentReferenceSchema = new Schema(
    {
        paymentId: {
            type: Schema.Types.ObjectId,
            ref: 'FeesPayment',
            required: true
        },
        amount: {
            type: Number,
            required: true,
            min: 0
        },
        datePaid: {
            type: Date,
            required: true
        },
        receiptNumber: {
            type: String,
            trim: true
        },
        paymentMethod: {
            type: String,
            trim: true
        }
    },
    { _id: false }
);

// Audit Trail Entry Schema
// @ts-ignore
const BillingAuditEntrySchema = new Schema(
    {
        action: {
            type: String,
            enum: ['created', 'charge_added', 'payment_linked', 'status_updated', 'arrears_carried_forward'],
            required: true
        },
        performedBy: {
            type: Schema.Types.ObjectId,
            ref: 'Person',
            required: true
        },
        performedAt: {
            type: Date,
            default: Date.now
        },
        details: {
            type: String,
            required: true,
            trim: true
        },
        previousValue: {
            type: Schema.Types.Mixed
        },
        newValue: {
            type: Schema.Types.Mixed
        }
    },
    { _id: true }
);

// Main StudentBilling Schema
const StudentBillingSchema = new Schema<IStudentBilling>(
    {
        // Identity & Context
        student: {
            type: Schema.Types.ObjectId,
            ref: 'Person',
            required: true,
            index: true
        },
        school: {
            type: Schema.Types.ObjectId,
            ref: 'School',
            required: true,
            index: true
        },
        schoolSite: {
            type: Schema.Types.ObjectId,
            ref: 'SchoolSite',
            required: true,
            index: true
        },
        academicYear: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        academicPeriodType: {
            type: String,
            enum: ['term', 'semester'],
            required: true,
            default: 'term'
        },
        academicTerm: {
            type: Number,
            min: 1,
            max: 3,
            index: true
        },
        academicSemester: {
            type: Number,
            min: 1,
            max: 2,
            index: true
        },
        class: {
            type: Schema.Types.ObjectId,
            ref: 'SiteClass',
            required: true,
            index: true
        },

        // Core Financial Fields
        balanceBroughtForward: {
            type: Number,
            required: true,
            default: 0,
            min: 0
        },
        termOrSemesterBill: {
            type: Number,
            required: true,
            default: 0,
            min: 0
        },
        feeBreakdown: [FeeBreakdownItemSchema],
        addedChargesTotal: {
            type: Number,
            required: true,
            default: 0,
            min: 0
        },
        totalBilled: {
            type: Number,
            required: true,
            default: 0,
            min: 0
        },
        totalPaid: {
            type: Number,
            required: true,
            default: 0,
            min: 0
        },
        currentBalance: {
            type: Number,
            required: true,
            default: 0
        },

        // Additional Charges Array
        additionalCharges: [AdditionalChargeSchema],

        // Payment References
        linkedPayments: [PaymentReferenceSchema],

        // Status & Metadata
        billingStatus: {
            type: String,
            enum: ['clear', 'owing', 'overpaid', 'pending'],
            required: true,
            default: 'pending',
            index: true
        },
        feeConfigurationId: {
            type: Schema.Types.ObjectId,
            ref: 'FeesConfiguration'
        },
        billGeneratedDate: {
            type: Date,
            required: true,
            default: Date.now
        },
        paymentDueDate: {
            type: Date
        },
        currency: {
            type: String,
            required: true,
            default: 'GHS',
            uppercase: true
        },

        // Audit & Tracking
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'Person',
            required: true
        },
        lastModifiedBy: {
            type: Schema.Types.ObjectId,
            ref: 'Person'
        },
        auditTrail: [BillingAuditEntrySchema],
        isLocked: {
            type: Boolean,
            default: false,
            index: true
        },
        isCurrent: {
            type: Boolean,
            default: true,
            index: true
        },

        // Carry Forward Tracking
        carriedForwardTo: {
            type: Schema.Types.ObjectId,
            ref: 'StudentBilling'
        },
        carriedForwardFrom: {
            type: Schema.Types.ObjectId,
            ref: 'StudentBilling'
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// Compound Indexes for uniqueness and query optimization
StudentBillingSchema.index({ student: 1, academicYear: 1, academicTerm: 1, schoolSite: 1 }, { unique: true, partialFilterExpression: { academicPeriodType: 'term' } });
StudentBillingSchema.index({ student: 1, academicYear: 1, academicSemester: 1, schoolSite: 1 }, { unique: true, partialFilterExpression: { academicPeriodType: 'semester' } });
StudentBillingSchema.index({ schoolSite: 1, academicYear: 1, academicTerm: 1, billingStatus: 1 });
StudentBillingSchema.index({ schoolSite: 1, class: 1, academicYear: 1 });
StudentBillingSchema.index({ student: 1, isCurrent: 1 });
StudentBillingSchema.index({ billingStatus: 1, currentBalance: 1 });

// Pre-save middleware to calculate totals and status
StudentBillingSchema.pre('save', function () {
    // Calculate addedChargesTotal from additionalCharges array
    this.addedChargesTotal = this.additionalCharges.reduce((sum, charge) => sum + charge.amount, 0);

    // Calculate totalBilled
    this.totalBilled = this.balanceBroughtForward + this.termOrSemesterBill + this.addedChargesTotal;

    // Calculate totalPaid from linkedPayments
    this.totalPaid = this.linkedPayments.reduce((sum, payment) => sum + payment.amount, 0);

    // Calculate currentBalance (positive = owing, negative = overpaid)
    this.currentBalance = this.totalBilled - this.totalPaid;

    // Determine billing status
    if (this.currentBalance > 0) {
        this.billingStatus = 'owing';
    } else if (this.currentBalance < 0) {
        this.billingStatus = 'overpaid';
    } else {
        this.billingStatus = 'clear';
    }
});

// Static method to get billing summary for a student
StudentBillingSchema.statics.getStudentBillingSummary = async function (studentId: mongoose.Types.ObjectId, schoolSiteId?: mongoose.Types.ObjectId) {
    const query: any = { student: studentId };
    if (schoolSiteId) {
        query.schoolSite = schoolSiteId;
    }

    const billings = await this.find(query).sort({ academicYear: -1, academicTerm: -1 }).populate('class', 'className').lean();

    const totalOutstanding = billings.reduce((sum: number, b: any) => sum + Math.max(0, b.currentBalance), 0);
    const totalOverpaid = billings.reduce((sum: number, b: any) => sum + Math.abs(Math.min(0, b.currentBalance)), 0);

    return {
        billings,
        totalOutstanding,
        totalOverpaid,
        netBalance: totalOutstanding - totalOverpaid,
        currentBilling: billings.find((b: any) => b.isCurrent)
    };
};

// Static method to create billing from fee configuration
StudentBillingSchema.statics.createFromFeeConfiguration = async function (studentId: mongoose.Types.ObjectId, feeConfigId: mongoose.Types.ObjectId, createdBy: mongoose.Types.ObjectId, balanceBroughtForward: number = 0) {
    const FeesConfiguration = mongoose.model('FeesConfiguration');
    const feeConfig = await FeesConfiguration.findById(feeConfigId).lean();

    if (!feeConfig) {
        throw new Error('Fee configuration not found');
    }

    const feeBreakdown = (feeConfig as any).feeItems.map((item: any) => ({
        determinant: item.determinant,
        description: item.description,
        amount: item.amount
    }));

    const billing = new this({
        student: studentId,
        school: (feeConfig as any).site, // Assuming site is linked to school
        schoolSite: (feeConfig as any).site,
        academicYear: (feeConfig as any).academicYear,
        academicPeriodType: 'term',
        academicTerm: (feeConfig as any).academicTerm,
        class: (feeConfig as any).class,
        balanceBroughtForward,
        termOrSemesterBill: (feeConfig as any).totalAmount,
        feeBreakdown,
        feeConfigurationId: feeConfigId,
        paymentDueDate: (feeConfig as any).paymentDeadline,
        currency: (feeConfig as any).currency,
        createdBy,
        auditTrail: [
            {
                action: 'created',
                performedBy: createdBy,
                performedAt: new Date(),
                details: `Billing record created from fee configuration: ${(feeConfig as any).configName || 'Unnamed'}`
            }
        ]
    });

    return billing.save();
};

// Instance method to add additional charge
StudentBillingSchema.methods.addCharge = async function (charge: Omit<IAdditionalCharge, '_id' | 'createdAt'>, addedBy: mongoose.Types.ObjectId) {
    if (this.isLocked) {
        throw new Error('Cannot add charges to a locked billing record');
    }

    const newCharge: IAdditionalCharge = {
        ...charge,
        addedBy,
        createdAt: new Date()
    };

    this.additionalCharges.push(newCharge);

    this.auditTrail.push({
        action: 'charge_added',
        performedBy: addedBy,
        performedAt: new Date(),
        details: `Added charge: ${charge.particulars} - ${this.currency} ${charge.amount}`,
        newValue: newCharge
    });

    this.lastModifiedBy = addedBy;

    return this.save();
};

// Instance method to link payment
StudentBillingSchema.methods.linkPayment = async function (paymentRef: IPaymentReference, linkedBy: mongoose.Types.ObjectId) {
    // Check if payment is already linked
    const existingPayment = this.linkedPayments.find((p: IPaymentReference) => p.paymentId.toString() === paymentRef.paymentId.toString());

    if (existingPayment) {
        throw new Error('Payment is already linked to this billing record');
    }

    this.linkedPayments.push(paymentRef);

    this.auditTrail.push({
        action: 'payment_linked',
        performedBy: linkedBy,
        performedAt: new Date(),
        details: `Linked payment: ${paymentRef.receiptNumber || paymentRef.paymentId} - ${this.currency} ${paymentRef.amount}`,
        newValue: paymentRef
    });

    this.lastModifiedBy = linkedBy;

    return this.save();
};

// Instance method to carry forward balance to next period
StudentBillingSchema.methods.carryForwardBalance = async function (nextPeriodBillingId: mongoose.Types.ObjectId, performedBy: mongoose.Types.ObjectId) {
    this.carriedForwardTo = nextPeriodBillingId;
    this.isCurrent = false;

    this.auditTrail.push({
        action: 'arrears_carried_forward',
        performedBy,
        performedAt: new Date(),
        details: `Balance of ${this.currency} ${this.currentBalance} carried forward to next period`,
        previousValue: { currentBalance: this.currentBalance },
        newValue: { carriedForwardTo: nextPeriodBillingId }
    });

    this.lastModifiedBy = performedBy;

    return this.save();
};

// Create and export model
const StudentBilling: Model<IStudentBilling> = mongoose.models.StudentBilling || mongoose.model<IStudentBilling>('StudentBilling', StudentBillingSchema);

export default StudentBilling;
