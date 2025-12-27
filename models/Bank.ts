import mongoose, { Schema, Document, Model } from 'mongoose';

// Interface for Branch subdocument
export interface IBranch {
    name?: string;
    code?: string;
    region?: mongoose.Types.ObjectId;
    address?: string;
}

// Interface for Bank document
export interface IBank {
    _id: mongoose.Types.ObjectId;
    name: string;
    code?: string;
    country: mongoose.Types.ObjectId;
    branches: IBranch[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// @ts-ignore
const BankSchema = new Schema<IBank>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            unique: true,
            index: true
        },
        code: {
            type: String,
            uppercase: true,
            trim: true,
            unique: true,
            sparse: true
        },
        country: {
            type: Schema.Types.ObjectId,
            ref: 'Country',
            required: true,
            index: true
        },
        branches: [
            {
                name: {
                    type: String,
                    trim: true
                },
                code: {
                    type: String,
                    trim: true
                },
                region: {
                    type: Schema.Types.ObjectId,
                    ref: 'Region'
                },
                address: String
            }
        ],
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
BankSchema.index({ name: 1, country: 1 });

const Bank: Model<IBank> = mongoose.models.Bank || mongoose.model<IBank>('Bank', BankSchema);

export default Bank;
