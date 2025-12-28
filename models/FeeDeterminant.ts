import mongoose, { Schema, Document, Model } from 'mongoose';

// Interface for FeeDeterminant document
export interface IFeeDeterminant extends Document {
    _id: mongoose.Types.ObjectId;
    determinant: string;
    description: string;
    amount: number;
    school: mongoose.Types.ObjectId;
    schoolSite?: mongoose.Types.ObjectId;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const FeeDeterminantSchema = new Schema<IFeeDeterminant>(
    {
        determinant: {
            type: String,
            required: true,
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
        school: {
            type: Schema.Types.ObjectId,
            ref: 'School',
            required: true,
            index: true
        },
        schoolSite: {
            type: Schema.Types.ObjectId,
            ref: 'SchoolSite',
            index: true
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

// Indexes for efficient querying
FeeDeterminantSchema.index({ school: 1, determinant: 1 });

const FeeDeterminant: Model<IFeeDeterminant> = mongoose.models.FeeDeterminant || mongoose.model<IFeeDeterminant>('FeeDeterminant', FeeDeterminantSchema);

export default FeeDeterminant;
