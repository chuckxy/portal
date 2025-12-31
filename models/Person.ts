import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export type Gender = 'male' | 'female' | 'other';
export type PersonCategory = 'proprietor' | 'headmaster' | 'teacher' | 'finance' | 'student' | 'parent' | 'librarian' | 'admin';
export type AddressStatus = 'Active' | 'Inactive';
export type AddressType = 'residential' | 'postal' | 'work' | 'temporary';
export type GuardianRelationship = 'parent' | 'uncle' | 'aunt' | 'grandparent' | 'sibling' | 'other';
export type WorkDepartment = 'academic' | 'administrative' | 'support';
export type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed';
export type QualificationType = 'certificate' | 'diploma' | 'degree' | 'masters' | 'phd' | 'other';
export type InstrumentType = 'earning' | 'deduction';
export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
export type DocumentType = 'passport' | 'national_id' | 'voters_id' | 'birth_certificate' | 'driver_license' | 'other';
export type EventType = 'meeting' | 'class' | 'exam' | 'appointment' | 'other';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

// Interface for LMS Certification (Integration with LMS)
export interface ILMSCertification {
    courseId: mongoose.Types.ObjectId;
    certificateId: string;
    issuedDate: Date;
    expiryDate?: Date;
    certificatePath?: string;
}

// Interface for LMS Preferences (Integration with LMS)
export interface ILMSPreferences {
    emailNotifications: boolean;
    browserNotifications: boolean;
    preferredLanguage: string;
    autoPlayVideos: boolean;
    showProgressBar: boolean;
}

// Interface for LMS Profile subdocument (Integration with LMS)
export interface ILMSProfile {
    isLmsUser: boolean;
    instructorBio?: string;
    instructorRating?: number;
    totalCoursesCreated: number;
    totalCoursesEnrolled: number;
    totalCoursesCompleted: number;
    certifications: ILMSCertification[];
    preferences: ILMSPreferences;
}

// Interface for Contact subdocument
export interface IContact {
    mobilePhone?: string;
    homePhone?: string;
    email?: string;
    primaryLanguage?: string;
    secondaryLanguage?: string;
}

// Interface for PersonAddress subdocument
export interface IPersonAddress {
    addressId?: mongoose.Types.ObjectId;
    addressType?: AddressType;
    dateFrom: Date;
    dateTo?: Date;
    status: AddressStatus;
}

// Interface for Attendance subdocument
export interface IAttendance {
    date: Date;
    status: AttendanceStatus;
    remarks?: string;
}

// Interface for ClassHistory subdocument
export interface IClassHistory {
    class: mongoose.Types.ObjectId;
    academicYear: string;
    academicTerm: number;
    dateFrom: Date;
    dateTo?: Date;
    periodActivities?: any;
    attendance: IAttendance[];
}

// Interface for StudentInfo subdocument
export interface IStudentInfo {
    studentId?: string;
    dateJoined?: Date;
    dateLeft?: Date;
    faculty?: mongoose.Types.ObjectId;
    department?: mongoose.Types.ObjectId;
    guardian?: mongoose.Types.ObjectId;
    guardianRelationship?: GuardianRelationship;
    house?: string;
    dormitory?: string;
    room?: string;
    previousSchool?: string;
    accountBalance: number;
    defaultClass?: mongoose.Types.ObjectId;
    currentClass?: mongoose.Types.ObjectId;
    defaultAcademicTerm?: number;
    defaultAcademicYear?: string;
    classHistory: IClassHistory[];
    subjects: mongoose.Types.ObjectId[];
}

// Interface for BankInfo subdocument
export interface IBankInfo {
    bank?: mongoose.Types.ObjectId;
    accountName?: string;
    accountNumber?: string;
    branch?: string;
}

// Interface for Qualification subdocument
export interface IQualification {
    type: QualificationType;
    title?: string;
    institution?: string;
    dateObtained?: Date;
    documentPath?: string;
}

// Interface for PayrollInstrument subdocument
export interface IPayrollInstrument {
    instrumentType: InstrumentType;
    description: string;
    amount: number;
    isActive: boolean;
}

// Interface for Relief subdocument
export interface IRelief {
    description: string;
    amount: number;
    quantity: number;
}

// Interface for StatutoryDeduction subdocument
export interface IStatutoryDeduction {
    description: string;
    percentage: number;
}

// Interface for Payroll subdocument
export interface IPayroll {
    basicSalary: number;
    instruments: IPayrollInstrument[];
    reliefs: IRelief[];
    statutoryDeductions: IStatutoryDeduction[];
}

// Interface for EmployeeInfo subdocument
export interface IEmployeeInfo {
    customId?: string;
    teachingDepartment?: mongoose.Types.ObjectId;
    workDepartment?: WorkDepartment;
    jobTitle?: string;
    maritalStatus?: MaritalStatus;
    dateJoined?: Date;
    dateLeft?: Date;
    faculty?: mongoose.Types.ObjectId;
    tinNumber?: string;
    ssnitNumber?: string;
    bankInfo: IBankInfo;
    qualifications: IQualification[];
    subjects: mongoose.Types.ObjectId[];
    payroll: IPayroll;
}

// Interface for Medication subdocument
export interface IMedication {
    name?: string;
    dosage?: string;
    frequency?: string;
}

// Interface for EmergencyContact subdocument
export interface IEmergencyContact {
    name?: string;
    relationship?: string;
    phone?: string;
    alternatePhone?: string;
}

// Interface for MedicalInfo subdocument
export interface IMedicalInfo {
    bloodGroup?: BloodGroup;
    allergies: string[];
    chronicConditions: string[];
    medications: IMedication[];
    emergencyContact: IEmergencyContact;
}

// Interface for OfficialDocument subdocument
export interface IOfficialDocument {
    documentType: DocumentType;
    documentId: string;
    nameOnDocument?: string;
    issuingCountry?: mongoose.Types.ObjectId;
    issuedDate?: Date;
    expiryDate?: Date;
    scannedCopyLink?: string;
}

// Interface for CalendarEvent subdocument
export interface ICalendarEvent {
    title: string;
    description?: string;
    startDate: Date;
    endDate: Date;
    eventType: EventType;
    location?: string;
    isRecurring: boolean;
}

// Document interface (properties only)
export interface IPersonDoc {
    firstName: string;
    middleName?: string;
    lastName?: string;
    dateOfBirth?: Date;
    gender?: Gender;
    contact: IContact;
    addresses: IPersonAddress[];
    currentAddress?: mongoose.Types.ObjectId;
    personCategory: PersonCategory;
    school: mongoose.Types.ObjectId;
    schoolSite: mongoose.Types.ObjectId;
    photoLink?: string;
    username: string;
    password: string;
    lastLogin?: Date;
    isActive: boolean;
    studentInfo?: IStudentInfo;
    employeeInfo?: IEmployeeInfo;
    medicalInfo: IMedicalInfo;
    officialDocuments: IOfficialDocument[];
    calendar: ICalendarEvent[];
    lmsProfile?: ILMSProfile; // LMS Integration
}

// Methods interface
interface IPersonMethods {
    comparePassword(candidatePassword: string): Promise<boolean>;
    hasRole(role: PersonCategory): boolean;
    getCurrentClass(): mongoose.Types.ObjectId | null | undefined;
}

// Model type
type PersonModel = Model<IPersonDoc, {}, IPersonMethods>;

// @ts-ignore
const PersonSchema = new Schema<IPersonDoc, PersonModel, IPersonMethods>(
    {
        firstName: {
            type: String,
            required: true,
            trim: true
        },
        middleName: {
            type: String,
            trim: true
        },
        lastName: {
            type: String,
            trim: true
        },
        dateOfBirth: {
            type: Date,
            index: true
        },
        gender: {
            type: String,
            enum: ['male', 'female', 'other'],
            index: true
        },

        contact: {
            mobilePhone: {
                type: String,
                trim: true
            },
            homePhone: {
                type: String,
                trim: true
            },
            email: {
                type: String,
                lowercase: true,
                trim: true,
                sparse: true,
                match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
            },
            primaryLanguage: {
                type: String,
                trim: true
            },
            secondaryLanguage: {
                type: String,
                trim: true
            }
        },

        addresses: [
            {
                addressId: {
                    type: Schema.Types.ObjectId,
                    ref: 'Address'
                },
                addressType: {
                    type: String,
                    enum: ['residential', 'postal', 'work', 'temporary']
                },
                dateFrom: {
                    type: Date,
                    default: Date.now
                },
                dateTo: Date,
                status: {
                    type: String,
                    enum: ['Active', 'Inactive'],
                    default: 'Active'
                }
            }
        ],

        currentAddress: {
            type: Schema.Types.ObjectId,
            ref: 'Address'
        },

        personCategory: {
            type: String,
            enum: ['proprietor', 'headmaster', 'teacher', 'finance', 'student', 'parent', 'librarian', 'admin'],
            required: true,
            index: true
        },

        school: {
            type: Schema.Types.ObjectId,
            ref: 'School',
            required: true,
            index: true
        },
        schoolSite: {
            type: Schema.Types.ObjectId,
            ref: 'SchoolSite',
            required: true,
            index: true
        },

        photoLink: {
            type: String,
            trim: true
        },

        // Authentication
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        password: {
            type: String,
            required: true,
            minlength: 6
        },
        lastLogin: {
            type: Date
        },
        isActive: {
            type: Boolean,
            default: true
        },

        // Student-specific fields
        studentInfo: {
            studentId: {
                type: String,
                trim: true,
                sparse: true,
                unique: true
            },
            dateJoined: {
                type: Date,
                index: true
            },
            dateLeft: Date,
            faculty: {
                type: Schema.Types.ObjectId,
                ref: 'Faculty'
            },
            department: {
                type: Schema.Types.ObjectId,
                ref: 'Department'
            },
            guardian: {
                type: Schema.Types.ObjectId,
                ref: 'Person'
            },
            guardianRelationship: {
                type: String,
                enum: ['parent', 'uncle', 'aunt', 'grandparent', 'sibling', 'other']
            },
            house: {
                type: String,
                trim: true
            },
            dormitory: {
                type: String,
                trim: true
            },
            room: {
                type: String,
                trim: true
            },
            previousSchool: {
                type: String,
                trim: true
            },
            accountBalance: {
                type: Number,
                default: 0,
                index: true
            },
            defaultClass: {
                type: Schema.Types.ObjectId,
                ref: 'SiteClass'
            },
            currentClass: {
                type: Schema.Types.ObjectId,
                ref: 'SiteClass',
                index: true
            },
            defaultAcademicTerm: {
                type: Number,
                min: 1,
                max: 3
            },
            defaultAcademicYear: {
                type: String,
                trim: true
            },

            classHistory: [
                {
                    class: {
                        type: Schema.Types.ObjectId,
                        ref: 'SiteClass',
                        required: true
                    },
                    academicYear: {
                        type: String,
                        required: true
                    },
                    academicTerm: {
                        type: Number,
                        required: true,
                        min: 1,
                        max: 3
                    },
                    dateFrom: {
                        type: Date,
                        required: true
                    },
                    dateTo: Date,
                    periodActivities: Schema.Types.Mixed,
                    attendance: [
                        {
                            date: {
                                type: Date,
                                required: true
                            },
                            status: {
                                type: String,
                                enum: ['present', 'absent', 'late', 'excused'],
                                required: true
                            },
                            remarks: String
                        }
                    ]
                }
            ],

            subjects: [
                {
                    type: Schema.Types.ObjectId,
                    ref: 'Subject'
                }
            ]
        },

        // Employee-specific fields
        employeeInfo: {
            customId: {
                type: String,
                trim: true,
                sparse: true,
                unique: true
            },
            teachingDepartment: {
                type: Schema.Types.ObjectId,
                ref: 'Department'
            },
            workDepartment: {
                type: String,
                enum: ['academic', 'administrative', 'support']
            },
            jobTitle: {
                type: String,
                trim: true
            },
            maritalStatus: {
                type: String,
                enum: ['single', 'married', 'divorced', 'widowed']
            },
            dateJoined: {
                type: Date,
                index: true
            },
            dateLeft: Date,
            faculty: {
                type: Schema.Types.ObjectId,
                ref: 'Faculty'
            },
            tinNumber: {
                type: String,
                trim: true,
                uppercase: true
            },
            ssnitNumber: {
                type: String,
                trim: true,
                uppercase: true
            },

            bankInfo: {
                bank: {
                    type: Schema.Types.ObjectId,
                    ref: 'Bank'
                },
                accountName: {
                    type: String,
                    trim: true
                },
                accountNumber: {
                    type: String,
                    trim: true
                },
                branch: {
                    type: String,
                    trim: true
                }
            },

            qualifications: [
                {
                    type: {
                        type: String,
                        enum: ['certificate', 'diploma', 'degree', 'masters', 'phd', 'other'],
                        required: true
                    },
                    title: {
                        type: String,
                        trim: true
                    },
                    institution: {
                        type: String,
                        trim: true
                    },
                    dateObtained: Date,
                    documentPath: String
                }
            ],

            subjects: [
                {
                    type: Schema.Types.ObjectId,
                    ref: 'Subject'
                }
            ],

            payroll: {
                basicSalary: {
                    type: Number,
                    default: 0
                },
                instruments: [
                    {
                        instrumentType: {
                            type: String,
                            enum: ['earning', 'deduction'],
                            required: true
                        },
                        description: {
                            type: String,
                            required: true,
                            trim: true
                        },
                        amount: {
                            type: Number,
                            required: true
                        },
                        isActive: {
                            type: Boolean,
                            default: true
                        }
                    }
                ],
                reliefs: [
                    {
                        description: {
                            type: String,
                            required: true,
                            trim: true
                        },
                        amount: {
                            type: Number,
                            required: true
                        },
                        quantity: {
                            type: Number,
                            default: 1
                        }
                    }
                ],
                statutoryDeductions: [
                    {
                        description: {
                            type: String,
                            required: true,
                            trim: true
                        },
                        percentage: {
                            type: Number,
                            required: true,
                            min: 0,
                            max: 100
                        }
                    }
                ]
            }
        },

        // Medical information
        medicalInfo: {
            bloodGroup: {
                type: String,
                enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
            },
            allergies: [
                {
                    type: String,
                    trim: true
                }
            ],
            chronicConditions: [
                {
                    type: String,
                    trim: true
                }
            ],
            medications: [
                {
                    name: String,
                    dosage: String,
                    frequency: String
                }
            ],
            emergencyContact: {
                name: {
                    type: String,
                    trim: true
                },
                relationship: {
                    type: String,
                    trim: true
                },
                phone: {
                    type: String,
                    trim: true
                },
                alternatePhone: {
                    type: String,
                    trim: true
                }
            }
        },

        // Official documents
        officialDocuments: [
            {
                documentType: {
                    type: String,
                    enum: ['passport', 'national_id', 'voters_id', 'birth_certificate', 'driver_license', 'other'],
                    required: true
                },
                documentId: {
                    type: String,
                    trim: true,
                    required: true
                },
                nameOnDocument: {
                    type: String,
                    trim: true
                },
                issuingCountry: {
                    type: Schema.Types.ObjectId,
                    ref: 'Country'
                },
                issuedDate: Date,
                expiryDate: Date,
                scannedCopyLink: String
            }
        ],

        // Calendar events
        calendar: [
            {
                title: {
                    type: String,
                    required: true,
                    trim: true
                },
                description: {
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
                eventType: {
                    type: String,
                    enum: ['meeting', 'class', 'exam', 'appointment', 'other'],
                    default: 'other'
                },
                location: String,
                isRecurring: {
                    type: Boolean,
                    default: false
                }
            }
        ],

        // LMS Integration: Learning Management System profile
        lmsProfile: {
            isLmsUser: {
                type: Boolean,
                default: false
            },
            instructorBio: {
                type: String,
                trim: true
            },
            instructorRating: {
                type: Number,
                min: 0,
                max: 5
            },
            totalCoursesCreated: {
                type: Number,
                default: 0,
                min: 0
            },
            totalCoursesEnrolled: {
                type: Number,
                default: 0,
                min: 0
            },
            totalCoursesCompleted: {
                type: Number,
                default: 0,
                min: 0
            },
            certifications: [
                {
                    courseId: {
                        type: Schema.Types.ObjectId,
                        ref: 'Subject'
                    },
                    certificateId: {
                        type: String,
                        trim: true
                    },
                    issuedDate: {
                        type: Date
                    },
                    expiryDate: {
                        type: Date
                    },
                    certificatePath: {
                        type: String,
                        trim: true
                    }
                }
            ],
            preferences: {
                emailNotifications: {
                    type: Boolean,
                    default: true
                },
                browserNotifications: {
                    type: Boolean,
                    default: true
                },
                preferredLanguage: {
                    type: String,
                    default: 'en',
                    trim: true
                },
                autoPlayVideos: {
                    type: Boolean,
                    default: true
                },
                showProgressBar: {
                    type: Boolean,
                    default: true
                }
            }
        }
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform: function (doc, ret) {
                delete ret.password;
                return ret;
            }
        },
        toObject: {
            virtuals: true,
            transform: function (doc, ret) {
                delete ret.password;
                return ret;
            }
        }
    }
);

// Indexes
// Compound indexes only (single-field indexes defined with index: true in schema)
PersonSchema.index({ firstName: 1, lastName: 1 });
PersonSchema.index({ school: 1, schoolSite: 1, personCategory: 1 });
PersonSchema.index({ 'contact.mobilePhone': 1 });
PersonSchema.index({ school: 1, personCategory: 1, isActive: 1 });
PersonSchema.index({ schoolSite: 1, 'studentInfo.currentClass': 1 });
PersonSchema.index({ 'lmsProfile.isLmsUser': 1 }); // LMS Integration

// Virtual for full name
PersonSchema.virtual('fullName').get(function () {
    const parts = [this.firstName, this.middleName, this.lastName].filter(Boolean);
    return parts.join(' ');
});

// Virtual for age
PersonSchema.virtual('age').get(function () {
    if (!this.dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
});

// Pre-save hook for password hashing
PersonSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return;

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare passwords
PersonSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Method to check if user has a specific role
PersonSchema.methods.hasRole = function (role: PersonCategory): boolean {
    return this.personCategory === role;
};

// Method to get current class for students
PersonSchema.methods.getCurrentClass = function (): mongoose.Types.ObjectId | null | undefined {
    if (this.personCategory === 'student') {
        return this.studentInfo?.currentClass;
    }
    return null;
};

// Check if model already exists to prevent overwrite error
const Person = mongoose.models.Person || mongoose.model<IPersonDoc, PersonModel>('Person', PersonSchema);

export default Person;

// Export type for use in other files
export type IPerson = Document<unknown, {}, IPersonDoc> &
    IPersonDoc &
    IPersonMethods & {
        fullName: string;
        age: number | null;
    };
