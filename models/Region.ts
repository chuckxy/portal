import mongoose, { Schema, Document, Model } from 'mongoose';

// Interface for Constituency subdocument
export interface IConstituency {
    constituencyId?: mongoose.Types.ObjectId;
    name?: string;
}

// Interface for Region document
export interface IRegion extends Document {
    name: string;
    countryId: mongoose.Types.ObjectId;
    capital?: string;
    constituencies: IConstituency[];
    isActive: boolean;
    constituencyCount: number;
    createdAt: Date;
    updatedAt: Date;
}

// @ts-ignore
const RegionSchema = new Schema<IRegion>(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        countryId: {
            type: Schema.Types.ObjectId,
            ref: 'Country',
            required: true,
            index: true
        },
        capital: {
            type: String,
            trim: true
        },
        constituencies: [
            {
                constituencyId: Schema.Types.ObjectId,
                name: {
                    type: String,
                    trim: true
                }
            }
        ],
        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// Indexes
RegionSchema.index({ name: 1, countryId: 1 }, { unique: true });

// Virtual for constituency count
RegionSchema.virtual('constituencyCount').get(function (this: IRegion) {
    return this.constituencies ? this.constituencies.length : 0;
});

const Region: Model<IRegion> = mongoose.models.Region || mongoose.model<IRegion>('Region', RegionSchema);

export default Region;
