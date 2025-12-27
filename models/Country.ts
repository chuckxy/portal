import mongoose, { Schema, Document, Model } from 'mongoose';

// Interface for Region subdocument
export interface IRegion {
    regionId?: mongoose.Types.ObjectId;
    name?: string;
    capital?: string;
}

// Interface for Country document
export interface ICountry extends Document {
    name: string;
    code?: string;
    regions: IRegion[];
    isActive: boolean;
    regionCount: number;
    createdAt: Date;
    updatedAt: Date;
}

// @ts-ignore
const CountrySchema = new Schema<ICountry>(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true
        },
        code: {
            type: String,
            uppercase: true,
            trim: true,
            unique: true,
            sparse: true
        },
        regions: [
            {
                regionId: {
                    type: Schema.Types.ObjectId,
                    ref: 'Region'
                },
                name: {
                    type: String,
                    trim: true
                },
                capital: {
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
// Single-field indexes are defined with index: true in schema

// Virtual for region count
CountrySchema.virtual('regionCount').get(function (this: ICountry) {
    return this.regions ? this.regions.length : 0;
});

const Country: Model<ICountry> = mongoose.models.Country || mongoose.model<ICountry>('Country', CountrySchema);

export default Country;
