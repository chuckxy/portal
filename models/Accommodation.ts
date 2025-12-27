import mongoose, { Schema, Model } from 'mongoose';

export type AccommodationType = 'boys_dormitory' | 'girls_dormitory' | 'mixed_dormitory' | 'staff_quarters';
export type FacilityType = 'bathroom' | 'toilet' | 'kitchen' | 'common_room' | 'laundry' | 'other';
export type RoomType = 'single' | 'double' | 'triple' | 'quad' | 'dormitory';
export type RoomCondition = 'excellent' | 'good' | 'fair' | 'needs_repair';
export type RuleCategory = 'curfew' | 'visitors' | 'noise' | 'cleanliness' | 'safety' | 'other';
export type MaintenanceType = 'plumbing' | 'electrical' | 'structural' | 'furniture' | 'cleaning' | 'other';
export type MaintenanceStatus = 'reported' | 'in_progress' | 'completed' | 'cancelled';

// Interface for Location subdocument
export interface ILocation {
    building?: string;
    floor?: string;
    description?: string;
}

// Interface for Facility subdocument
export interface IFacility {
    facilityType?: FacilityType;
    quantity: number;
    description?: string;
}

// Interface for Room subdocument
export interface IRoom {
    roomNumber: string;
    roomType: RoomType;
    floor?: string;
    capacity: number;
    currentOccupants: mongoose.Types.ObjectId[];
    bedNumbers: string[];
    amenities: string[];
    condition: RoomCondition;
    isActive: boolean;
}

// Interface for Rule subdocument
export interface IRule {
    rule: string;
    category: RuleCategory;
}

// Interface for MaintenanceLog subdocument
export interface IMaintenanceLog {
    date: Date;
    issueType: MaintenanceType;
    description: string;
    roomNumber?: string;
    status: MaintenanceStatus;
    reportedBy?: mongoose.Types.ObjectId;
    assignedTo?: mongoose.Types.ObjectId;
    completedDate?: Date;
    cost: number;
    notes?: string;
}

// Interface for Accommodation document
export interface IAccommodation {
    name: string;
    school: mongoose.Types.ObjectId;
    site: mongoose.Types.ObjectId;
    accommodationType: AccommodationType;
    dormitoryOverseer?: mongoose.Types.ObjectId;
    house?: string;
    capacity: number;
    currentOccupancy: number;
    location: ILocation;
    facilities: IFacility[];
    rooms: IRoom[];
    rules: IRule[];
    maintenanceLog: IMaintenanceLog[];
    isActive: boolean;
    availableCapacity: number;
    occupancyRate: string;
    totalRooms: number;
    availableRooms: number;
    createdAt: Date;
    updatedAt: Date;
    getRoomByNumber(roomNumber: string): IRoom | undefined;
    getAllOccupants(): string[];
    isRoomAvailable(roomNumber: string): boolean;
}

// @ts-ignore
const AccommodationSchema = new Schema<IAccommodation>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
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

        accommodationType: {
            type: String,
            enum: ['boys_dormitory', 'girls_dormitory', 'mixed_dormitory', 'staff_quarters'],
            required: true,
            index: true
        },

        dormitoryOverseer: {
            type: Schema.Types.ObjectId,
            ref: 'Person',
            index: true
        },

        house: {
            type: String,
            trim: true
        },

        capacity: {
            type: Number,
            default: 0,
            min: 0
        },

        currentOccupancy: {
            type: Number,
            default: 0,
            min: 0
        },

        location: {
            building: {
                type: String,
                trim: true
            },
            floor: {
                type: String,
                trim: true
            },
            description: {
                type: String,
                trim: true
            }
        },

        facilities: [
            {
                facilityType: {
                    type: String,
                    enum: ['bathroom', 'toilet', 'kitchen', 'common_room', 'laundry', 'other']
                },
                quantity: {
                    type: Number,
                    default: 1
                },
                description: String
            }
        ],

        rooms: [
            {
                roomNumber: {
                    type: String,
                    required: true,
                    trim: true
                },
                roomType: {
                    type: String,
                    enum: ['single', 'double', 'triple', 'quad', 'dormitory'],
                    default: 'dormitory'
                },
                floor: {
                    type: String,
                    trim: true
                },
                capacity: {
                    type: Number,
                    required: true,
                    min: 1
                },
                currentOccupants: [
                    {
                        type: Schema.Types.ObjectId,
                        ref: 'Person'
                    }
                ],
                bedNumbers: [
                    {
                        type: String,
                        trim: true
                    }
                ],
                amenities: [
                    {
                        type: String,
                        trim: true
                    }
                ],
                condition: {
                    type: String,
                    enum: ['excellent', 'good', 'fair', 'needs_repair'],
                    default: 'good'
                },
                isActive: {
                    type: Boolean,
                    default: true
                }
            }
        ],

        rules: [
            {
                rule: {
                    type: String,
                    required: true,
                    trim: true
                },
                category: {
                    type: String,
                    enum: ['curfew', 'visitors', 'noise', 'cleanliness', 'safety', 'other'],
                    default: 'other'
                }
            }
        ],

        maintenanceLog: [
            {
                date: {
                    type: Date,
                    default: Date.now
                },
                issueType: {
                    type: String,
                    enum: ['plumbing', 'electrical', 'structural', 'furniture', 'cleaning', 'other'],
                    required: true
                },
                description: {
                    type: String,
                    required: true,
                    trim: true
                },
                roomNumber: String,
                status: {
                    type: String,
                    enum: ['reported', 'in_progress', 'completed', 'cancelled'],
                    default: 'reported'
                },
                reportedBy: {
                    type: Schema.Types.ObjectId,
                    ref: 'Person'
                },
                assignedTo: {
                    type: Schema.Types.ObjectId,
                    ref: 'Person'
                },
                completedDate: Date,
                cost: {
                    type: Number,
                    default: 0
                },
                notes: String
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
AccommodationSchema.index({ school: 1, site: 1, name: 1 });
AccommodationSchema.index({ 'rooms.currentOccupants': 1 });

// Virtual for available capacity
AccommodationSchema.virtual('availableCapacity').get(function (this: IAccommodation) {
    return Math.max(0, this.capacity - this.currentOccupancy);
});

// Virtual for occupancy rate
AccommodationSchema.virtual('occupancyRate').get(function (this: IAccommodation) {
    if (this.capacity === 0) return '0';
    return ((this.currentOccupancy / this.capacity) * 100).toFixed(2);
});

// Virtual for total rooms
AccommodationSchema.virtual('totalRooms').get(function (this: IAccommodation) {
    return this.rooms ? this.rooms.length : 0;
});

// Virtual for available rooms
AccommodationSchema.virtual('availableRooms').get(function (this: IAccommodation) {
    return this.rooms ? this.rooms.filter((room) => room.isActive && room.currentOccupants.length < room.capacity).length : 0;
});

// Method to get room by number
AccommodationSchema.methods.getRoomByNumber = function (this: IAccommodation, roomNumber: string): IRoom | undefined {
    return this.rooms.find((room) => room.roomNumber === roomNumber);
};

// Method to get all occupants
AccommodationSchema.methods.getAllOccupants = function (this: IAccommodation): string[] {
    const occupants: mongoose.Types.ObjectId[] = [];
    this.rooms.forEach((room) => {
        occupants.push(...room.currentOccupants);
    });
    return [...new Set(occupants.map((id) => id.toString()))];
};

// Method to check room availability
AccommodationSchema.methods.isRoomAvailable = function (this: IAccommodation, roomNumber: string): boolean {
    const room = this.getRoomByNumber(roomNumber);
    if (!room || !room.isActive) return false;
    return room.currentOccupants.length < room.capacity;
};

// Pre-save to update current occupancy
AccommodationSchema.pre('save', function (next) {
    this.currentOccupancy = this.rooms.reduce((sum, room) => sum + (room.currentOccupants ? room.currentOccupants.length : 0), 0);

    this.capacity = this.rooms.reduce((sum, room) => sum + (room.isActive ? room.capacity : 0), 0);
});

const Accommodation: Model<IAccommodation> = mongoose.models.Accommodation || mongoose.model<IAccommodation>('Accommodation', AccommodationSchema);

export default Accommodation;
