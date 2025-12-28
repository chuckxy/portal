import mongoose, { Schema, Document, Model } from 'mongoose';
import { IFeeDeterminant } from './FeeDeterminant';
// Interface for FeesConfiguration document
export interface IFeesConfiguration {
    site: mongoose.Types.ObjectId;
    class: mongoose.Types.ObjectId;
    academicYear: string;
    academicTerm?: number;
    configName?: string;
    feeItems: IFeeDeterminant[];
    totalAmount: number;
    currency: string;
    paymentDeadline?: Date;
    installmentAllowed: boolean;
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
                isActive: {
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
FeesConfigurationSchema.index({ site: 1, class: 1, academicYear: 1, academicTerm: 1 });
FeesConfigurationSchema.index({ academicYear: 1, academicTerm: 1, isActive: 1 });

const FeesConfiguration: Model<IFeesConfiguration> = mongoose.models.FeesConfiguration || mongoose.model<IFeesConfiguration>('FeesConfiguration', FeesConfigurationSchema);

export default FeesConfiguration;
