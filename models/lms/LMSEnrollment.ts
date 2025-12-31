import mongoose, { Schema, Document, Model } from 'mongoose';
import { EnrollmentStatus } from './types';

/**
 * LMS Enrollment Schema
 * Tracks student enrollment in courses (Subjects with LMS enabled)
 *
 * Integration Note: Maps to LMS Enrollment
 * This is kept separate from SMS class enrollment to support:
 * - Self-paced learning (not tied to academic terms)
 * - Course-level enrollment (vs class-level in SMS)
 * - LMS-specific progress tracking
 *
 * References:
 *   - Subject (unified from Course)
 *   - Person (unified from User) - both student and enrollment by
 *   - SchoolSite (unified from Institution)
 *   - SiteClass (optional SMS class context)
 */

export interface ILMSEnrollment extends Document {
    subjectId: mongoose.Types.ObjectId;
    personId: mongoose.Types.ObjectId;
    schoolSiteId: mongoose.Types.ObjectId;
    // Optional SMS academic context
    siteClassId?: mongoose.Types.ObjectId;
    academicYear?: string;
    academicTerm?: number;
    // Enrollment details
    enrollmentDate: Date;
    completionDate?: Date;
    expiryDate?: Date;
    status: EnrollmentStatus;
    enrolledBy: mongoose.Types.ObjectId;
    // Progress tracking
    progressPercentage: number;
    lastAccessedAt?: Date;
    totalTimeSpent: number; // seconds
    // Completion details
    certificateId?: string;
    certificateIssuedAt?: Date;
    finalGrade?: number;
    // Metadata
    enrollmentSource: 'manual' | 'self' | 'bulk' | 'api';
    notes?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const LMSEnrollmentSchema = new Schema<ILMSEnrollment>(
    {
        // UNIFIED: References Subject (replaces courseId)
        subjectId: {
            type: Schema.Types.ObjectId,
            ref: 'Subject',
            required: true,
            index: true
        },
        // UNIFIED: References Person (replaces userId/studentId)
        personId: {
            type: Schema.Types.ObjectId,
            ref: 'Person',
            required: true,
            index: true
        },
        // UNIFIED: References SchoolSite (replaces institutionId)
        schoolSiteId: {
            type: Schema.Types.ObjectId,
            ref: 'SchoolSite',
            required: true,
            index: true
        },
        // Optional SMS class context for academic tracking
        siteClassId: {
            type: Schema.Types.ObjectId,
            ref: 'SiteClass',
            index: true
        },
        academicYear: {
            type: String,
            trim: true,
            index: true
        },
        academicTerm: {
            type: Number,
            min: 1,
            max: 3
        },
        enrollmentDate: {
            type: Date,
            default: Date.now,
            index: true
        },
        completionDate: {
            type: Date
        },
        expiryDate: {
            type: Date,
            index: true
        },
        status: {
            type: String,
            enum: ['enrolled', 'completed', 'dropped', 'suspended'],
            default: 'enrolled',
            index: true
        },
        enrolledBy: {
            type: Schema.Types.ObjectId,
            ref: 'Person',
            required: true
        },
        progressPercentage: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        lastAccessedAt: {
            type: Date
        },
        totalTimeSpent: {
            type: Number,
            default: 0,
            min: 0
        },
        certificateId: {
            type: String,
            trim: true,
            sparse: true,
            unique: true
        },
        certificateIssuedAt: {
            type: Date
        },
        finalGrade: {
            type: Number,
            min: 0,
            max: 100
        },
        enrollmentSource: {
            type: String,
            enum: ['manual', 'self', 'bulk', 'api'],
            default: 'manual'
        },
        notes: {
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
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// Indexes
LMSEnrollmentSchema.index({ personId: 1, subjectId: 1 }, { unique: true });
LMSEnrollmentSchema.index({ subjectId: 1, status: 1 });
LMSEnrollmentSchema.index({ schoolSiteId: 1, academicYear: 1, academicTerm: 1 });
LMSEnrollmentSchema.index({ personId: 1, status: 1, lastAccessedAt: -1 });

// Virtual for days since enrollment
LMSEnrollmentSchema.virtual('daysSinceEnrollment').get(function () {
    const now = new Date();
    const enrolled = new Date(this.enrollmentDate);
    return Math.floor((now.getTime() - enrolled.getTime()) / (1000 * 60 * 60 * 24));
});

// Virtual for days until expiry
LMSEnrollmentSchema.virtual('daysUntilExpiry').get(function () {
    if (!this.expiryDate) return null;
    const now = new Date();
    const expiry = new Date(this.expiryDate);
    return Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
});

// Backward compatibility virtuals (LMS aliases)
LMSEnrollmentSchema.virtual('courseId').get(function () {
    return this.subjectId;
});

LMSEnrollmentSchema.virtual('userId').get(function () {
    return this.personId;
});

LMSEnrollmentSchema.virtual('studentId').get(function () {
    return this.personId;
});

LMSEnrollmentSchema.virtual('institutionId').get(function () {
    return this.schoolSiteId;
});

const LMSEnrollment: Model<ILMSEnrollment> = mongoose.models.LMSEnrollment || mongoose.model<ILMSEnrollment>('LMSEnrollment', LMSEnrollmentSchema);

export default LMSEnrollment;
