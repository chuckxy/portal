import mongoose, { Schema, Document, Model } from 'mongoose';

// Interface for FormMaster subdocument
export interface IFormMaster {
    teacher?: mongoose.Types.ObjectId;
    dateFrom?: Date;
    dateTo?: Date;
}

// Interface for SiteClass document
export interface ISiteClass extends Document {
    site: mongoose.Types.ObjectId;
    department: mongoose.Types.ObjectId;
    division: string;
    sequence: number;
    className?: string;
    prefect?: mongoose.Types.ObjectId;
    classLimit: number;
    formMaster: IFormMaster;
    subjects: mongoose.Types.ObjectId[];
    students: mongoose.Types.ObjectId[];
    isActive: boolean;
    studentCount: number;
    availableSeats: number;
    isFull: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// @ts-ignore
const SiteClassSchema = new Schema<ISiteClass>(
    {
        site: {
            type: Schema.Types.ObjectId,
            ref: 'SchoolSite',
            required: true,
            index: true
        },
        department: {
            type: Schema.Types.ObjectId,
            ref: 'Department',
            required: true,
            index: true
        },
        division: {
            type: String,
            required: true,
            uppercase: true,
            trim: true
        },
        sequence: {
            type: Number,
            required: true,
            min: 1
        },
        className: {
            type: String,
            trim: true,
            index: true
        },
        prefect: {
            type: Schema.Types.ObjectId,
            ref: 'Person'
        },
        classLimit: {
            type: Number,
            default: 0,
            min: 0
        },

        formMaster: {
            teacher: {
                type: Schema.Types.ObjectId,
                ref: 'Person'
            },
            dateFrom: {
                type: Date
            },
            dateTo: {
                type: Date
            }
        },

        subjects: [
            {
                type: Schema.Types.ObjectId,
                ref: 'Subject'
            }
        ],

        students: [
            {
                type: Schema.Types.ObjectId,
                ref: 'Person'
            }
        ],

        isActive: {
            type: Boolean,
            default: true,
            index: true
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// Indexes - unique constraint: one class per site/sequence/division combination
SiteClassSchema.index({ department: 1, site: 1, sequence: 1, division: 1 }, { unique: true });
SiteClassSchema.index({ site: 1, className: 1 });
SiteClassSchema.index({ 'formMaster.teacher': 1 });

// Virtual for student count
SiteClassSchema.virtual('studentCount').get(function (this: ISiteClass) {
    return this.students ? this.students.length : 0;
});

// Virtual for available seats
SiteClassSchema.virtual('availableSeats').get(function (this: ISiteClass) {
    if (this.classLimit === 0) return Infinity;
    const currentCount = this.students ? this.students.length : 0;
    return Math.max(0, this.classLimit - currentCount);
});

// Virtual to check if class is full
SiteClassSchema.virtual('isFull').get(function (this: ISiteClass) {
    if (this.classLimit === 0) return false;
    const currentCount = this.students ? this.students.length : 0;
    return currentCount >= this.classLimit;
});

// Pre-save middleware to generate className if not provided
SiteClassSchema.pre('save', function () {
    if (!this.className) {
        this.className = `Form ${this.sequence}${this.division}`;
    }
});

// Check if model already exists to prevent overwrite error
const SiteClass: Model<ISiteClass> = mongoose.models.SiteClass || mongoose.model<ISiteClass>('SiteClass', SiteClassSchema);

export default SiteClass;
