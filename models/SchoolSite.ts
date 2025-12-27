import mongoose, { Schema, Document, Model } from 'mongoose';

export type SchoolLevel = 'early_child' | 'basic' | 'junior' | 'senior' | 'tertiary';
export type TertiaryType = 'university' | 'nursing_training' | 'teacher_training' | 'vocational' | 'n/a';
export type Priority = 'low' | 'medium' | 'high';

// Interface for Address subdocument
export interface ISchoolSiteAddress {
    street?: string;
    town?: string;
    country?: mongoose.Types.ObjectId;
    region?: mongoose.Types.ObjectId;
    constituency?: string;
    mmda?: string;
}

// Interface for Term subdocument
export interface ITerm {
    termNumber: number;
    termName?: string;
    startDate: Date;
    endDate: Date;
    isActive: boolean;
}

// Interface for AcademicYear subdocument
export interface IAcademicYear {
    year: string;
    isActive: boolean;
    terms: ITerm[];
}

// Interface for HousePrefect subdocument
export interface IHousePrefect {
    student?: mongoose.Types.ObjectId;
    academicYear: string;
    position?: string;
    dateFrom?: Date;
    dateTo?: Date;
}

// Interface for HouseMaster subdocument
export interface IHouseMaster {
    teacher: mongoose.Types.ObjectId;
    dateFrom: Date;
    dateTo?: Date;
    isActive: boolean;
}

// Interface for House subdocument
export interface IHouse {
    name: string;
    color?: string;
    prefects: IHousePrefect[];
    houseMasters: IHouseMaster[];
}

// Interface for BulletinBoard subdocument
export interface IBulletinBoard {
    news: string;
    dateStart: Date;
    dateEnd: Date;
    academicYear?: string;
    academicTerm?: number;
    createdBy: mongoose.Types.ObjectId;
    isActive: boolean;
    priority: Priority;
}

// Document interface (properties only)
export interface ISchoolSiteDoc {
    school: mongoose.Types.ObjectId;
    siteName: string;
    description: string;
    phone?: string;
    email?: string;
    address: ISchoolSiteAddress;
    schoolLevel: SchoolLevel;
    tertiaryType: TertiaryType;
    prefect?: mongoose.Types.ObjectId;
    defaultFacultySettings?: any;
    academicYears: IAcademicYear[];
    houses: IHouse[];
    bulletinBoard: IBulletinBoard[];
    isActive: boolean;
}

// Methods interface
interface ISchoolSiteMethods {
    getCurrentAcademicYear(): IAcademicYear | undefined;
    getCurrentTerm(): ITerm | null;
    getActiveBulletins(): IBulletinBoard[];
}

// Model type
type SchoolSiteModel = Model<ISchoolSiteDoc, {}, ISchoolSiteMethods>;

const SchoolSiteSchema = new Schema<ISchoolSiteDoc, SchoolSiteModel, ISchoolSiteMethods>(
    {
        school: {
            type: Schema.Types.ObjectId,
            ref: 'School',
            required: true,
            index: true
        },
        siteName: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        description: {
            type: String,
            required: true,
            trim: true
        },
        phone: {
            type: String,
            trim: true
        },
        email: {
            type: String,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
        },
        address: {
            street: {
                type: String,
                trim: true
            },
            town: {
                type: String,
                trim: true
            },
            country: {
                type: Schema.Types.ObjectId,
                ref: 'Country'
            },
            region: {
                type: Schema.Types.ObjectId,
                ref: 'Region'
            },
            constituency: {
                type: String,
                trim: true
            },
            mmda: {
                type: String,
                trim: true
            }
        },
        schoolLevel: {
            type: String,
            enum: ['early_child', 'basic', 'junior', 'senior', 'tertiary'],
            required: true,
            index: true
        },
        tertiaryType: {
            type: String,
            enum: ['university', 'nursing_training', 'teacher_training', 'vocational', 'n/a'],
            default: 'n/a'
        },
        prefect: {
            type: Schema.Types.ObjectId,
            ref: 'Person'
        },
        defaultFacultySettings: Schema.Types.Mixed,

        academicYears: [
            {
                year: {
                    type: String,
                    required: true
                },
                isActive: {
                    type: Boolean,
                    default: false
                },
                terms: [
                    {
                        termNumber: {
                            type: Number,
                            required: true,
                            min: 1,
                            max: 3
                        },
                        termName: {
                            type: String,
                            trim: true
                        },
                        startDate: {
                            type: Date,
                            required: true
                        },
                        endDate: {
                            type: Date,
                            required: true
                        },
                        isActive: {
                            type: Boolean,
                            default: false
                        }
                    }
                ]
            }
        ],

        houses: [
            {
                name: {
                    type: String,
                    required: true,
                    trim: true
                },
                color: {
                    type: String,
                    trim: true
                },
                prefects: [
                    {
                        student: {
                            type: Schema.Types.ObjectId,
                            ref: 'Person'
                        },
                        academicYear: {
                            type: String,
                            required: true
                        },
                        position: {
                            type: String,
                            trim: true
                        },
                        dateFrom: Date,
                        dateTo: Date
                    }
                ],
                houseMasters: [
                    {
                        teacher: {
                            type: Schema.Types.ObjectId,
                            ref: 'Person',
                            required: true
                        },
                        dateFrom: {
                            type: Date,
                            required: true
                        },
                        dateTo: Date,
                        isActive: {
                            type: Boolean,
                            default: true
                        }
                    }
                ]
            }
        ],

        bulletinBoard: [
            {
                news: {
                    type: String,
                    required: true
                },
                dateStart: {
                    type: Date,
                    default: Date.now
                },
                dateEnd: {
                    type: Date,
                    required: true
                },
                academicYear: String,
                academicTerm: {
                    type: Number,
                    min: 1,
                    max: 3
                },
                createdBy: {
                    type: Schema.Types.ObjectId,
                    ref: 'Person',
                    required: true
                },
                isActive: {
                    type: Boolean,
                    default: true
                },
                priority: {
                    type: String,
                    enum: ['low', 'medium', 'high'],
                    default: 'medium'
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
SchoolSiteSchema.index({ school: 1, schoolLevel: 1 });
SchoolSiteSchema.index({ 'address.country': 1, 'address.region': 1 });
SchoolSiteSchema.index({ 'academicYears.year': 1, 'academicYears.isActive': 1 });

// Methods
SchoolSiteSchema.methods.getCurrentAcademicYear = function (): IAcademicYear | undefined {
    return this.academicYears.find((year) => year.isActive);
};

SchoolSiteSchema.methods.getCurrentTerm = function (): ITerm | null {
    const currentYear = this.getCurrentAcademicYear();
    if (currentYear) {
        return currentYear.terms.find((term) => term.isActive) || null;
    }
    return null;
};

SchoolSiteSchema.methods.getActiveBulletins = function (): IBulletinBoard[] {
    const now = new Date();
    return this.bulletinBoard.filter((bulletin) => bulletin.isActive && bulletin.dateStart <= now && bulletin.dateEnd >= now);
};

// Check if model already exists to prevent overwrite error
const SchoolSite = mongoose.models.SchoolSite || mongoose.model<ISchoolSiteDoc, SchoolSiteModel>('SchoolSite', SchoolSiteSchema);

export default SchoolSite;

// Export type for use in other files
export type ISchoolSite = Document<unknown, {}, ISchoolSiteDoc> &
    ISchoolSiteDoc &
    ISchoolSiteMethods & {
        createdAt: Date;
        updatedAt: Date;
    };
