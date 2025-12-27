import mongoose, { Schema, model, Model, HydratedDocument, Types } from 'mongoose';

export type SchoolType = 'public' | 'private' | 'shared';

/* ------------------------ */
/*      Document Type       */
/* ------------------------ */
export interface ISchool {
    name: string;
    schoolType: SchoolType;
    dateFounded?: Date;
    motto?: string;
    logo?: string;
    sites: Types.ObjectId[];
    isActive: boolean;
}

/* HydratedDocument for proper instance typing */
export type SchoolDocument = HydratedDocument<ISchool>;

/* ------------------------ */
/*      Schema              */
/* ------------------------ */
// @ts-ignore
const SchoolSchema = new Schema<ISchool>(
    {
        name: { type: String, required: true, trim: true, index: true },
        schoolType: { type: String, enum: ['public', 'private', 'shared'], required: true, index: true },
        dateFounded: { type: Date },
        motto: { type: String, trim: true },
        logo: { type: String, trim: true },
        sites: [{ type: Schema.Types.ObjectId, ref: 'SchoolSite' }],
        isActive: { type: Boolean, default: true }
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
SchoolSchema.index({ name: 1, schoolType: 1 });
SchoolSchema.index({ isActive: 1 });

/* ------------------------ */
/*      Virtuals            */
/* ------------------------ */
SchoolSchema.virtual('siteCount').get(function (this: SchoolDocument) {
    return this.sites?.length ?? 0;
});

/* ------------------------ */
/*      Model Export        */
/* ------------------------ */
// Prevent OverwriteModelError in Next.js / hot reload
const School: Model<SchoolDocument> = mongoose.models.School || model<SchoolDocument>('School', SchoolSchema);

export default School;
