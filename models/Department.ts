import mongoose, { Schema, Document, Model } from 'mongoose';

// Interface for Head subdocument
export interface IDepartmentHead {
    person?: mongoose.Types.ObjectId;
    dateFrom?: Date;
    dateTo?: Date;
}

// Interface for Department document
export interface IDepartment {
    name: string;
    description?: string;
    faculty: mongoose.Types.ObjectId;
    school: mongoose.Types.ObjectId;
    site: mongoose.Types.ObjectId;
    head: IDepartmentHead;
    subjects: mongoose.Types.ObjectId[];
    isActive: boolean;
    subjectCount: number;
    createdAt: Date;
    updatedAt: Date;
}

// @ts-ignore
const DepartmentSchema = new Schema<IDepartment>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        description: {
            type: String,
            trim: true
        },
        faculty: {
            type: Schema.Types.ObjectId,
            ref: 'Faculty',
            required: true,
            index: true
        },
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
        head: {
            person: {
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

// Indexes
DepartmentSchema.index({ faculty: 1, name: 1 }, { unique: true });
DepartmentSchema.index({ school: 1, site: 1 });
DepartmentSchema.index({ 'head.person': 1 });

// Virtual for subject count
DepartmentSchema.virtual('subjectCount').get(function (this: IDepartment) {
    return this.subjects ? this.subjects.length : 0;
});

// Check if model already exists to prevent overwrite error
const Department: Model<IDepartment> = mongoose.models.Department || mongoose.model<IDepartment>('Department', DepartmentSchema);

export default Department;
