import mongoose, { Schema, Document, Model } from 'mongoose';

export type AddressType = 'residential' | 'postal' | 'work' | 'temporary';

// Interface for Address document
export interface IAddress {
    _id: mongoose.Types.ObjectId;
    addressType: AddressType;
    country: mongoose.Types.ObjectId;
    region: mongoose.Types.ObjectId;
    constituency?: string;
    mmda?: string;
    town?: string;
    streetName?: string;
    ghPostDigitalAddress?: string;
    landmark?: string;
    poBoxAddress?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    getFullAddress(): string;
}

// @ts-ignore
const AddressSchema = new Schema<IAddress>(
    {
        addressType: {
            type: String,
            enum: ['residential', 'postal', 'work', 'temporary'],
            required: true,
            index: true
        },
        country: {
            type: Schema.Types.ObjectId,
            ref: 'Country',
            required: true,
            index: true
        },
        region: {
            type: Schema.Types.ObjectId,
            ref: 'Region',
            required: true,
            index: true
        },
        constituency: {
            type: String,
            trim: true
        },
        mmda: {
            type: String,
            trim: true
        },
        town: {
            type: String,
            trim: true
        },
        streetName: {
            type: String,
            trim: true
        },
        ghPostDigitalAddress: {
            type: String,
            trim: true,
            uppercase: true
        },
        landmark: {
            type: String,
            trim: true
        },
        poBoxAddress: {
            type: String,
            trim: true
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
AddressSchema.index({ country: 1, region: 1 });
AddressSchema.index({ ghPostDigitalAddress: 1 });
AddressSchema.index({ addressType: 1, isActive: 1 });

// Methods
AddressSchema.methods.getFullAddress = function (this: IAddress): string {
    const parts = [this.streetName, this.town, this.constituency, this.mmda].filter(Boolean);
    return parts.join(', ');
};

const Address: Model<IAddress> = mongoose.models.Address || mongoose.model<IAddress>('Address', AddressSchema);

export default Address;
