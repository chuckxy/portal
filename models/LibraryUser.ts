import mongoose, { Schema, Model } from 'mongoose';

export type UserStatus = 'active' | 'suspended' | 'inactive' | 'expired';
export type MembershipType = 'student' | 'teacher' | 'staff' | 'public';

// Interface for LibraryUser document
export interface ILibraryUser {
    user: mongoose.Types.ObjectId;
    site: mongoose.Types.ObjectId;
    libraryCardNumber?: string;
    registrationDate: Date;
    status: UserStatus;
    membershipType: MembershipType;
    borrowingLimit: number;
    borrowingPeriodDays: number;
    currentBorrowings: mongoose.Types.ObjectId[];
    borrowingHistory: mongoose.Types.ObjectId[];
    totalBorrowings: number;
    activeBorrowingsCount: number;
    overdueFines: number;
    suspensionReason?: string;
    suspensionDate?: Date;
    expiryDate?: Date;
    notes?: string;
    canBorrow: boolean;
    availableSlots: number;
    createdAt: Date;
    updatedAt: Date;
}

// @ts-ignore
const LibraryUserSchema = new Schema<ILibraryUser>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'Person',
            required: true,
            index: true
        },
        site: {
            type: Schema.Types.ObjectId,
            ref: 'SchoolSite',
            required: true,
            index: true
        },

        libraryCardNumber: {
            type: String,
            unique: true,
            sparse: true,
            trim: true,
            index: true
        },

        registrationDate: {
            type: Date,
            default: Date.now,
            index: true
        },

        status: {
            type: String,
            enum: ['active', 'suspended', 'inactive', 'expired'],
            default: 'active',
            index: true
        },

        membershipType: {
            type: String,
            enum: ['student', 'teacher', 'staff', 'public'],
            default: 'student',
            index: true
        },

        borrowingLimit: {
            type: Number,
            default: 3,
            min: 0
        },

        borrowingPeriodDays: {
            type: Number,
            default: 14,
            min: 1
        },

        currentBorrowings: [
            {
                type: Schema.Types.ObjectId,
                ref: 'LibraryLending'
            }
        ],

        borrowingHistory: [
            {
                type: Schema.Types.ObjectId,
                ref: 'LibraryLending'
            }
        ],

        totalBorrowings: {
            type: Number,
            default: 0
        },

        activeBorrowingsCount: {
            type: Number,
            default: 0
        },

        overdueFines: {
            type: Number,
            default: 0
        },

        suspensionReason: {
            type: String,
            trim: true
        },

        suspensionDate: Date,

        expiryDate: Date,

        notes: {
            type: String,
            trim: true
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// Indexes
LibraryUserSchema.index({ user: 1, site: 1 }, { unique: true });
LibraryUserSchema.index({ status: 1, membershipType: 1 });

// Virtual to check if can borrow
LibraryUserSchema.virtual('canBorrow').get(function (this: ILibraryUser) {
    return this.status === 'active' && this.activeBorrowingsCount < this.borrowingLimit && this.overdueFines === 0;
});

// Virtual for available borrowing slots
LibraryUserSchema.virtual('availableSlots').get(function (this: ILibraryUser) {
    return Math.max(0, this.borrowingLimit - this.activeBorrowingsCount);
});

// Pre-save to generate library card number if not provided
LibraryUserSchema.pre('save', function () {
    if (!this.libraryCardNumber && this.isNew) {
        const prefix = this.membershipType.substring(0, 2).toUpperCase();
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        this.libraryCardNumber = `${prefix}-${timestamp}-${random}`;
    }
});

const LibraryUser: Model<ILibraryUser> = mongoose.models.LibraryUser || mongoose.model<ILibraryUser>('LibraryUser', LibraryUserSchema);

export default LibraryUser;
