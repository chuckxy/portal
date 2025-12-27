import mongoose, { Schema, model, Model, HydratedDocument, Types } from 'mongoose';

/* ------------------------ */
/*      Subdocument Types   */
/* ------------------------ */
export interface IHead {
    person?: Types.ObjectId;
    dateFrom?: Date;
    dateTo?: Date;
}

/* ------------------------ */
/*      Main Interface      */
/* ------------------------ */
export interface IFaculty {
    name: string;
    description?: string;
    institutionLevel?: string;
    school: Types.ObjectId;
    site: Types.ObjectId;
    head?: IHead;
    departments: Types.ObjectId[];
    isActive: boolean;
}

/* Hydrated document type */
export type FacultyDocument = HydratedDocument<IFaculty>;

/* ------------------------ */
/*      Schema              */
/* ------------------------ */
// @ts-ignore
const FacultySchema = new Schema<IFaculty>(
    {
        name: { type: String, required: true, trim: true, index: true },
        description: { type: String, trim: true },
        institutionLevel: { type: String, trim: true },

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
            person: { type: Schema.Types.ObjectId, ref: 'Person' },
            dateFrom: Date,
            dateTo: Date
        },

        departments: [{ type: Schema.Types.ObjectId, ref: 'Department' }],

        isActive: { type: Boolean, default: true, index: true }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

/* ------------------------ */
/*      Indexes             */
/* ------------------------ */
FacultySchema.index({ school: 1, site: 1, name: 1 }, { unique: true });

FacultySchema.index({ 'head.person': 1 });

/* ------------------------ */
/*      Virtuals            */
/* ------------------------ */
FacultySchema.virtual('departmentCount').get(function (this: FacultyDocument) {
    return this.departments?.length ?? 0;
});

/* ------------------------ */
/*      Model Export        */
/* ------------------------ */
// 🔑 Prevent OverwriteModelError
const Faculty: Model<FacultyDocument> = mongoose.models.Faculty || model<FacultyDocument>('Faculty', FacultySchema);

export default Faculty;
