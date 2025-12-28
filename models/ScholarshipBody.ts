import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IScholarshipBody extends Document {
    name: string;
    contactPerson?: string;
    contactPhone?: string;
    contactEmail?: string;
    school?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const ScholarshipBodySchema = new Schema<IScholarshipBody>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            index: true
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
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
        },
        school: {
            type: Schema.Types.ObjectId,
            ref: 'School',
            index: true
        }
    },
    {
        timestamps: true
    }
);

// Indexes for efficient queries
ScholarshipBodySchema.index({ name: 1, school: 1 });

const ScholarshipBody: Model<IScholarshipBody> = mongoose.models.ScholarshipBody || mongoose.model<IScholarshipBody>('ScholarshipBody', ScholarshipBodySchema);

export default ScholarshipBody;
