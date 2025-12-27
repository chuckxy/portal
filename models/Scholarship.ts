import mongoose, { Schema, Document, Model } from 'mongoose';

export type ScholarshipType = 'full' | 'partial' | 'merit' | 'need_based' | 'sports' | 'academic' | 'other';
export type ScholarshipStatus = 'active' | 'expired' | 'suspended' | 'completed';

// Interface for ScholarshipBody subdocument
export interface IScholarshipBody {
    name: string;
    contactPerson?: string;
    contactPhone?: string;
    contactEmail?: string;
    country?: mongoose.Types.ObjectId;
}

// Interface for Grant subdocument
export interface IGrant {
    amount: number;
    currency: string;
    referenceNumber?: string;
    dateReceived: Date;
    academicYear?: string;
    academicTerm?: number;
    description?: string;
}

// Interface for Usage subdocument
export interface IUsage {
    amount: number;
    reason: string;
    referenceNumber?: string;
    dateUsed: Date;
    academicYear?: string;
    academicTerm?: number;
    approvedBy?: mongoose.Types.ObjectId;
}

// Interface for ScholarshipDocument subdocument
export interface IScholarshipDocument {
    documentType?: string;
    documentPath?: string;
    uploadedAt: Date;
}

// Interface for Scholarship document
export interface IScholarship extends Document {
    student: mongoose.Types.ObjectId;
    school: mongoose.Types.ObjectId;
    site?: mongoose.Types.ObjectId;
    scholarshipType: ScholarshipType;
    scholarshipBody: IScholarshipBody;
    grants: IGrant[];
    usage: IUsage[];
    dateStart: Date;
    dateEnd?: Date;
    totalGranted: number;
    totalUsed: number;
    balance: number;
    status: ScholarshipStatus;
    conditions?: string;
    documents: IScholarshipDocument[];
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
    calculateBalance(): number;
}

const ScholarshipSchema = new Schema<IScholarship>(
    {
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
        site: {
            type: Schema.Types.ObjectId,
            ref: 'SchoolSite',
            index: true
        },

        scholarshipType: {
            type: String,
            enum: ['full', 'partial', 'merit', 'need_based', 'sports', 'academic', 'other'],
            default: 'partial',
            index: true
        },

        scholarshipBody: {
            name: {
                type: String,
                required: true,
                trim: true
            },
            contactPerson: {
                type: String,
                trim: true
            },
            contactPhone: {
                type: String,
                trim: true
            },
            contactEmail: {
                type: String,
                lowercase: true,
                trim: true
            },
            country: {
                type: Schema.Types.ObjectId,
                ref: 'Country'
            }
        },

        grants: [
            {
                amount: {
                    type: Number,
                    required: true,
                    min: 0
                },
                currency: {
                    type: String,
                    default: 'GHS',
                    uppercase: true
                },
                referenceNumber: {
                    type: String,
                    trim: true
                },
                dateReceived: {
                    type: Date,
                    required: true,
                    default: Date.now
                },
                academicYear: String,
                academicTerm: {
                    type: Number,
                    min: 1,
                    max: 3
                },
                description: String
            }
        ],

        usage: [
            {
                amount: {
                    type: Number,
                    required: true,
                    min: 0
                },
                reason: {
                    type: String,
                    required: true,
                    trim: true
                },
                referenceNumber: {
                    type: String,
                    trim: true
                },
                dateUsed: {
                    type: Date,
                    required: true,
                    default: Date.now
                },
                academicYear: String,
                academicTerm: {
                    type: Number,
                    min: 1,
                    max: 3
                },
                approvedBy: {
                    type: Schema.Types.ObjectId,
                    ref: 'Person'
                }
            }
        ],

        dateStart: {
            type: Date,
            required: true,
            index: true
        },

        dateEnd: {
            type: Date,
            index: true
        },

        totalGranted: {
            type: Number,
            default: 0
        },

        totalUsed: {
            type: Number,
            default: 0
        },

        balance: {
            type: Number,
            default: 0
        },

        status: {
            type: String,
            enum: ['active', 'expired', 'suspended', 'completed'],
            default: 'active',
            index: true
        },

        conditions: {
            type: String,
            trim: true
        },

        documents: [
            {
                documentType: String,
                documentPath: String,
                uploadedAt: {
                    type: Date,
                    default: Date.now
                }
            }
        ],

        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'Person',
            required: true
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// Indexes
ScholarshipSchema.index({ student: 1, dateStart: 1 });
ScholarshipSchema.index({ school: 1, site: 1, status: 1 });
ScholarshipSchema.index({ scholarshipType: 1, status: 1 });
ScholarshipSchema.index({ dateStart: 1, dateEnd: 1 });

// Method to calculate totals and balance
ScholarshipSchema.methods.calculateBalance = function (this: IScholarship): number {
    this.totalGranted = this.grants.reduce((sum, grant) => sum + (grant.amount || 0), 0);
    this.totalUsed = this.usage.reduce((sum, use) => sum + (use.amount || 0), 0);
    this.balance = this.totalGranted - this.totalUsed;
    return this.balance;
};

// Pre-save to calculate balance
ScholarshipSchema.pre('save', function () {
    this.calculateBalance();

    // Check if expired
    if (this.dateEnd && new Date() > this.dateEnd && this.status === 'active') {
        this.status = 'expired';
    }
});

const Scholarship: Model<IScholarship> = mongoose.models.Scholarship || mongoose.model<IScholarship>('Scholarship', ScholarshipSchema);

export default Scholarship;
