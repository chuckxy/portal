import mongoose, { Schema, Document, Model } from 'mongoose';

export type ConfigType = 'tuition' | 'boarding' | 'transport' | 'pta' | 'exam' | 'sports' | 'library' | 'other';

// Interface for FeeItem subdocument
export interface IFeeItem {
    determinant?: string;
    description: string;
    amount: number;
    isOptional: boolean;
}

// Interface for InstallmentPlan subdocument
export interface IInstallmentPlan {
    installmentNumber?: number;
    amount?: number;
    dueDate?: Date;
    description?: string;
}

// Interface for FeesConfiguration document
export interface IFeesConfiguration {
    site: mongoose.Types.ObjectId;
    class: mongoose.Types.ObjectId;
    academicYear: string;
    academicTerm?: number;
    configType: ConfigType;
    configName?: string;
    feeItems: IFeeItem[];
    totalAmount: number;
    currency: string;
    paymentDeadline?: Date;
    installmentAllowed: boolean;
    installmentPlan: IInstallmentPlan[];
    createdBy: mongoose.Types.ObjectId;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const FeesConfigurationSchema = new Schema<IFeesConfiguration>(
    {
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

        configType: {
            type: String,
            enum: ['tuition', 'boarding', 'transport', 'pta', 'exam', 'sports', 'library', 'other'],
            required: true,
            index: true
        },

        configName: {
            type: String,
            trim: true
        },

        feeItems: [
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
                },
                isOptional: {
                    type: Boolean,
                    default: false
                }
            }
        ],

        totalAmount: {
            type: Number,
            required: true,
            min: 0
        },

        currency: {
            type: String,
            default: 'GHS',
            uppercase: true
        },

        paymentDeadline: {
            type: Date
        },

        installmentAllowed: {
            type: Boolean,
            default: true
        },

        installmentPlan: [
            {
                installmentNumber: Number,
                amount: Number,
                dueDate: Date,
                description: String
            }
        ],

        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'Person',
            required: true
        },

        isActive: {
            type: Boolean,
            default: true,
            index: true
        }
    },
    {
        timestamps: true
    }
);

// Indexes
FeesConfigurationSchema.index({ site: 1, class: 1, academicYear: 1, academicTerm: 1, configType: 1 });
FeesConfigurationSchema.index({ academicYear: 1, academicTerm: 1, isActive: 1 });

// Pre-save to calculate total if not provided
FeesConfigurationSchema.pre('save', function () {
    if (!this.totalAmount && this.feeItems && this.feeItems.length > 0) {
        this.totalAmount = this.feeItems.reduce((sum, item) => sum + item.amount, 0);
    }
});

const FeesConfiguration: Model<IFeesConfiguration> = mongoose.models.FeesConfiguration || mongoose.model<IFeesConfiguration>('FeesConfiguration', FeesConfigurationSchema);

export default FeesConfiguration;
