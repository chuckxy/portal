import mongoose, { Schema, Document, Model } from 'mongoose';

export type ItemType = 'book' | 'journal' | 'magazine' | 'dvd' | 'ebook' | 'reference' | 'periodical' | 'other';
export type Provider = 'Google Books' | 'Open Library' | 'DBooks' | 'Local User Add' | 'IArchive' | 'Other';
export type AdjustmentType = 'addition' | 'removal' | 'damage' | 'loss' | 'donation';

// Interface for Author subdocument
export interface IAuthor {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    alias?: string;
}

// Interface for Classification subdocument
export interface IClassification {
    classCode?: string;
    divisionCode?: string;
    sectionCode?: string;
    description?: string;
}

// Interface for StockAdjustment subdocument
export interface IStockAdjustment {
    adjustmentType: AdjustmentType;
    quantity: number;
    remarks?: string;
    adjustedBy: mongoose.Types.ObjectId;
    date: Date;
}

// Interface for SiteInventory subdocument
export interface ISiteInventory {
    school: mongoose.Types.ObjectId;
    site: mongoose.Types.ObjectId;
    quantity: number;
    availableQuantity: number;
    location?: string;
    shelfNumber?: string;
    dateAdded: Date;
    stockAdjustments: IStockAdjustment[];
}

// Interface for Review subdocument
export interface IReview {
    user: mongoose.Types.ObjectId;
    rating: number;
    review?: string;
    date: Date;
}

// Interface for LibraryItem document
export interface ILibraryItem extends Document {
    isbn?: string;
    title: string;
    subtitle?: string;
    category?: string;
    itemType: ItemType;
    authors: IAuthor[];
    publicationDate?: Date;
    publisher?: string;
    edition?: string;
    language: string;
    pages?: number;
    classification: IClassification;
    description?: string;
    subjects: string[];
    coverImagePath?: string;
    eBookLink?: string;
    lccn?: string;
    provider: Provider;
    siteInventory: ISiteInventory[];
    reviews: IReview[];
    averageRating: number;
    totalReviews: number;
    isActive: boolean;
    totalQuantity: number;
    totalAvailable: number;
    createdAt: Date;
    updatedAt: Date;
    getSiteInventory(siteId: mongoose.Types.ObjectId): ISiteInventory | undefined;
    updateAverageRating(): void;
}

// @ts-ignore
const LibraryItemSchema = new Schema<ILibraryItem>(
    {
        isbn: {
            type: String,
            trim: true,
            sparse: true,
            unique: true,
            index: true
        },
        title: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        subtitle: {
            type: String,
            trim: true
        },
        category: {
            type: String,
            trim: true,
            index: true
        },
        itemType: {
            type: String,
            enum: ['book', 'journal', 'magazine', 'dvd', 'ebook', 'reference', 'periodical', 'other'],
            required: true,
            index: true
        },

        authors: [
            {
                firstName: {
                    type: String,
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
                alias: {
                    type: String,
                    trim: true
                }
            }
        ],

        publicationDate: {
            type: Date,
            index: true
        },

        publisher: {
            type: String,
            trim: true
        },

        edition: {
            type: String,
            trim: true
        },

        language: {
            type: String,
            default: 'English',
            trim: true
        },

        pages: {
            type: Number,
            min: 0
        },

        classification: {
            classCode: {
                type: String,
                trim: true
            },
            divisionCode: {
                type: String,
                trim: true
            },
            sectionCode: {
                type: String,
                trim: true
            },
            description: {
                type: String,
                trim: true
            }
        },

        description: {
            type: String,
            trim: true
        },

        subjects: [
            {
                type: String,
                trim: true
            }
        ],

        coverImagePath: {
            type: String,
            trim: true
        },

        eBookLink: {
            type: String,
            trim: true
        },

        lccn: {
            type: String,
            trim: true
        },

        provider: {
            type: String,
            enum: ['Google Books', 'Open Library', 'DBooks', 'Local User Add', 'IArchive', 'Other'],
            default: 'Local User Add'
        },

        // Multi-site inventory
        siteInventory: [
            {
                school: {
                    type: Schema.Types.ObjectId,
                    ref: 'School',
                    required: true
                },
                site: {
                    type: Schema.Types.ObjectId,
                    ref: 'SchoolSite',
                    required: true
                },
                quantity: {
                    type: Number,
                    default: 0,
                    min: 0
                },
                availableQuantity: {
                    type: Number,
                    default: 0,
                    min: 0
                },
                location: {
                    type: String,
                    trim: true
                },
                shelfNumber: {
                    type: String,
                    trim: true
                },
                dateAdded: {
                    type: Date,
                    default: Date.now
                },

                stockAdjustments: [
                    {
                        adjustmentType: {
                            type: String,
                            enum: ['addition', 'removal', 'damage', 'loss', 'donation'],
                            required: true
                        },
                        quantity: {
                            type: Number,
                            required: true
                        },
                        remarks: {
                            type: String,
                            trim: true
                        },
                        adjustedBy: {
                            type: Schema.Types.ObjectId,
                            ref: 'Person',
                            required: true
                        },
                        date: {
                            type: Date,
                            default: Date.now
                        }
                    }
                ]
            }
        ],

        reviews: [
            {
                user: {
                    type: Schema.Types.ObjectId,
                    ref: 'Person',
                    required: true
                },
                rating: {
                    type: Number,
                    min: 1,
                    max: 5,
                    required: true
                },
                review: {
                    type: String,
                    trim: true
                },
                date: {
                    type: Date,
                    default: Date.now
                }
            }
        ],

        averageRating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },

        totalReviews: {
            type: Number,
            default: 0
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

// Indexes - single-field indexes defined with index: true in schema
LibraryItemSchema.index({ title: 'text', description: 'text', 'authors.firstName': 'text', 'authors.lastName': 'text' });
LibraryItemSchema.index({ 'siteInventory.site': 1 });
LibraryItemSchema.index({ averageRating: -1 });

// Virtual for total quantity across all sites
LibraryItemSchema.virtual('totalQuantity').get(function (this: ILibraryItem) {
    return this.siteInventory.reduce((sum, inv) => sum + (inv.quantity || 0), 0);
});

// Virtual for total available quantity
LibraryItemSchema.virtual('totalAvailable').get(function (this: ILibraryItem) {
    return this.siteInventory.reduce((sum, inv) => sum + (inv.availableQuantity || 0), 0);
});

// Method to get inventory for a specific site
LibraryItemSchema.methods.getSiteInventory = function (this: ILibraryItem, siteId: mongoose.Types.ObjectId): ISiteInventory | undefined {
    return this.siteInventory.find((inv) => inv.site.toString() === siteId.toString());
};

// Method to update average rating
LibraryItemSchema.methods.updateAverageRating = function (this: ILibraryItem): void {
    if (!this.reviews || this.reviews.length === 0) {
        this.averageRating = 0;
        this.totalReviews = 0;
        return;
    }

    const total = this.reviews.reduce((sum, review) => sum + review.rating, 0);
    this.averageRating = total / this.reviews.length;
    this.totalReviews = this.reviews.length;
};

// Pre-save to update average rating
LibraryItemSchema.pre('save', function () {
    this.updateAverageRating();
});

const LibraryItem: Model<ILibraryItem> = mongoose.models.LibraryItem || mongoose.model<ILibraryItem>('LibraryItem', LibraryItemSchema);

export default LibraryItem;
