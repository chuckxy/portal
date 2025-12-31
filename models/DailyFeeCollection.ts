import mongoose, { Schema, Document, Model } from 'mongoose';

// Interface for DailyFeeCollection document
export interface IDailyFeeCollection {
    school: mongoose.Types.ObjectId;
    site: mongoose.Types.ObjectId;
    academicYear: string;
    academicTerm: number;
    collectionDate: Date;
    canteenFeeAmount: number;
    busFeeAmount: number;
    totalStudents: number;
    totalStudentsPresent: number;
    totalAbsent: number;
    currency: string;
    notes?: string;
    recordedBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const DailyFeeCollectionSchema = new Schema<IDailyFeeCollection>(
    {
        school: {
            type: Schema.Types.ObjectId,
            ref: 'School',
            required: true,
            index: true
        },
        site: {
            type: Schema.Types.ObjectId,
            ref: 'SchoolSite',
            required: true,
            index: true
        },
        academicYear: {
            type: String,
            required: true,
            index: true,
            trim: true
        },
        academicTerm: {
            type: Number,
            required: true,
            enum: [1, 2, 3],
            index: true
        },
        collectionDate: {
            type: Date,
            required: true,
            index: true
        },
        canteenFeeAmount: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },
        busFeeAmount: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },
        totalStudents: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },
        totalStudentsPresent: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },
        totalAbsent: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },
        currency: {
            type: String,
            default: 'GHS',
            trim: true,
            uppercase: true
        },
        notes: {
            type: String,
            trim: true
        },
        recordedBy: {
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

// Indexes for efficient querying
DailyFeeCollectionSchema.index({ site: 1, collectionDate: 1 }, { unique: true });
DailyFeeCollectionSchema.index({ site: 1, academicYear: 1, academicTerm: 1 });
// Note: collectionDate index is defined inline with index: true

// Virtual for total daily collection
DailyFeeCollectionSchema.virtual('totalDailyCollection').get(function () {
    return this.canteenFeeAmount + this.busFeeAmount;
});

// Virtual for attendance percentage
DailyFeeCollectionSchema.virtual('attendancePercentage').get(function () {
    if (this.totalStudents === 0) return 0;
    return (this.totalStudentsPresent / this.totalStudents) * 100;
});

// Pre-save middleware to calculate totalAbsent
DailyFeeCollectionSchema.pre('save', function () {
    if (this.isModified('totalStudents') || this.isModified('totalStudentsPresent')) {
        this.totalAbsent = this.totalStudents - this.totalStudentsPresent;
    }
});

// Model type
type DailyFeeCollectionModel = Model<IDailyFeeCollection>;

// Export model
const DailyFeeCollection: DailyFeeCollectionModel = (mongoose.models.DailyFeeCollection as DailyFeeCollectionModel) || mongoose.model<IDailyFeeCollection, DailyFeeCollectionModel>('DailyFeeCollection', DailyFeeCollectionSchema);

export default DailyFeeCollection;
