import mongoose, { Schema, Document, Model } from 'mongoose';

export type ConductRating = 'excellent' | 'very_good' | 'good' | 'satisfactory' | 'needs_improvement';

// Interface for SubjectScore subdocument
export interface ISubjectScore {
    subject: mongoose.Types.ObjectId;
    classScore: number;
    examScore: number;
    totalScore: number;
    grade?: string;
    position?: number;
    classSize?: number;
    remarks?: string;
    teacherComment?: string;
}

// Interface for Attendance subdocument
export interface IExamScoreAttendance {
    present: number;
    absent: number;
    late: number;
}

// Interface for ModificationHistory subdocument
export interface IModificationHistory {
    modifiedBy?: mongoose.Types.ObjectId;
    modifiedAt: Date;
    changes?: any;
}

// Interface for ExamScore document
export interface IExamScore {
    student: mongoose.Types.ObjectId;
    school: mongoose.Types.ObjectId;
    site: mongoose.Types.ObjectId;
    class: mongoose.Types.ObjectId;
    academicYear: string;
    academicTerm: number;
    scores: ISubjectScore[];
    overallPosition?: number;
    overallAverage: number;
    totalMarks: number;
    attendance: IExamScoreAttendance;
    conduct: ConductRating;
    interest: ConductRating;
    formMasterComment?: string;
    headmasterComment?: string;
    nextTermBegins?: Date;
    promoted: boolean;
    promotedTo?: mongoose.Types.ObjectId;
    recordedBy: mongoose.Types.ObjectId;
    modificationHistory: IModificationHistory[];
    isPublished: boolean;
    publishedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    calculateOverallAverage(): number;
}

// Static method interface
export interface IExamScoreModel extends Model<IExamScore> {
    getGrade(score: number): string;
}

// @ts-ignore
const ExamScoreSchema = new Schema<IExamScore>(
    {
        student: {
            type: Schema.Types.ObjectId,
            ref: 'Person',
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
        class: {
            type: Schema.Types.ObjectId,
            ref: 'SiteClass',
            required: true,
            index: true
        },
        academicYear: {
            type: String,
            required: true,
            index: true
        },
        academicTerm: {
            type: Number,
            required: true,
            min: 1,
            max: 3,
            index: true
        },

        scores: [
            {
                subject: {
                    type: Schema.Types.ObjectId,
                    ref: 'Subject',
                    required: true
                },
                classScore: {
                    type: Number,
                    default: 0,
                    min: 0,
                    max: 100
                },
                examScore: {
                    type: Number,
                    default: 0,
                    min: 0,
                    max: 100
                },
                totalScore: {
                    type: Number,
                    default: 0,
                    min: 0,
                    max: 100
                },
                grade: {
                    type: String,
                    uppercase: true,
                    trim: true
                },
                position: {
                    type: Number,
                    min: 1
                },
                classSize: {
                    type: Number,
                    min: 0
                },
                remarks: {
                    type: String,
                    trim: true
                },
                teacherComment: {
                    type: String,
                    trim: true
                }
            }
        ],

        overallPosition: {
            type: Number,
            min: 1
        },

        overallAverage: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },

        totalMarks: {
            type: Number,
            default: 0
        },

        attendance: {
            present: {
                type: Number,
                default: 0
            },
            absent: {
                type: Number,
                default: 0
            },
            late: {
                type: Number,
                default: 0
            }
        },

        conduct: {
            type: String,
            enum: ['excellent', 'very_good', 'good', 'satisfactory', 'needs_improvement'],
            default: 'satisfactory'
        },

        interest: {
            type: String,
            enum: ['excellent', 'very_good', 'good', 'satisfactory', 'needs_improvement'],
            default: 'satisfactory'
        },

        formMasterComment: {
            type: String,
            trim: true
        },

        headmasterComment: {
            type: String,
            trim: true
        },

        nextTermBegins: {
            type: Date
        },

        promoted: {
            type: Boolean,
            default: false
        },

        promotedTo: {
            type: Schema.Types.ObjectId,
            ref: 'SiteClass'
        },

        recordedBy: {
            type: Schema.Types.ObjectId,
            ref: 'Person',
            required: true
        },

        modificationHistory: [
            {
                modifiedBy: {
                    type: Schema.Types.ObjectId,
                    ref: 'Person'
                },
                modifiedAt: {
                    type: Date,
                    default: Date.now
                },
                changes: Schema.Types.Mixed
            }
        ],

        isPublished: {
            type: Boolean,
            default: false
        },

        publishedAt: {
            type: Date
        }
    },
    {
        timestamps: true
    }
);

// Indexes
ExamScoreSchema.index({ student: 1, academicYear: 1, academicTerm: 1 }, { unique: true });
ExamScoreSchema.index({ class: 1, academicYear: 1, academicTerm: 1 });
ExamScoreSchema.index({ school: 1, site: 1, academicYear: 1, academicTerm: 1 });
ExamScoreSchema.index({ overallPosition: 1 });

// Method to calculate overall average
ExamScoreSchema.methods.calculateOverallAverage = function (this: IExamScore): number {
    if (!this.scores || this.scores.length === 0) {
        this.overallAverage = 0;
        return 0;
    }

    const total = this.scores.reduce((sum, score) => sum + (score.totalScore || 0), 0);
    this.overallAverage = total / this.scores.length;
    return this.overallAverage;
};

// Method to determine grade from score
ExamScoreSchema.statics.getGrade = function (score: number): string {
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    if (score >= 40) return 'E';
    return 'F';
};

const ExamScore: IExamScoreModel = (mongoose.models.ExamScore as IExamScoreModel) || mongoose.model<IExamScore, IExamScoreModel>('ExamScore', ExamScoreSchema);

export default ExamScore;
