import mongoose from 'mongoose';

// Import all models to ensure they are registered
import '@/models/Person';
import '@/models/School';
import '@/models/SchoolSite';
import '@/models/Faculty';
import '@/models/Department';
import '@/models/SiteClass';
import '@/models/Subject';
import '@/models/Address';
import '@/models/Bank';
import '@/models/ExamScore';
import '@/models/Country';
import '@/models/Region';
import '@/models/Accommodation';
import '@/models/Assignment';
import '@/models/ExamAnswer';
import '@/models/ExamQuestion';
import '@/models/ExamSchedule';
import '@/models/FeesConfiguration';
import '@/models/FeesPayment';
import '@/models/LibraryItem';
import '@/models/LibraryLending';
import '@/models/LibraryUser';
import '@/models/Scholarship';
import '@/models/TimeTable';
import '@/models/ActivityLog';

// -------------------- TYPES --------------------
interface MongooseCache {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
}

// -------------------- GLOBAL CACHE --------------------
// This is necessary because in development we don't want to restart
// the connection on every hot reload
declare global {
    // eslint-disable-next-line no-var
    var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseCache || {
    conn: null,
    promise: null
};

if (!global.mongooseCache) {
    global.mongooseCache = cached;
}

// -------------------- CONNECTION FUNCTION --------------------
export async function connectToDatabase(): Promise<typeof mongoose> {
    // Check if connection string exists
    if (!process.env.MONGODB_URI) {
        throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
    }

    // Return existing connection if available
    if (cached.conn) {
        console.log('✅ Using cached MongoDB connection');
        return cached.conn;
    }

    // Create new connection if promise doesn't exist
    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
            maxPoolSize: 10,
            minPoolSize: 5,
            socketTimeoutMS: 45000,
            serverSelectionTimeoutMS: 5000,
            family: 4 // Use IPv4, skip trying IPv6
        };

        console.log('🔄 Creating new MongoDB connection...');

        cached.promise = mongoose
            .connect(process.env.MONGODB_URI, opts)
            .then((mongoose) => {
                console.log('✅ MongoDB connected successfully');
                return mongoose;
            })
            .catch((error) => {
                console.error('❌ MongoDB connection error:', error);
                cached.promise = null;
                throw error;
            });
    }

    try {
        cached.conn = await cached.promise;
    } catch (error) {
        cached.promise = null;
        throw error;
    }

    return cached.conn;
}

// -------------------- DISCONNECT FUNCTION --------------------
export async function disconnectFromDatabase(): Promise<void> {
    if (!cached.conn) {
        return;
    }

    try {
        await mongoose.disconnect();
        cached.conn = null;
        cached.promise = null;
        console.log('✅ MongoDB disconnected successfully');
    } catch (error) {
        console.error('❌ MongoDB disconnection error:', error);
        throw error;
    }
}

// -------------------- CONNECTION STATUS --------------------
export function getConnectionStatus(): string {
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    return states[mongoose.connection.readyState] || 'unknown';
}

// -------------------- EVENT LISTENERS --------------------
mongoose.connection.on('connected', () => {
    console.log('📡 Mongoose connected to MongoDB Atlas');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('📡 Mongoose disconnected from MongoDB Atlas');
});

// Graceful shutdown
if (process.env.NODE_ENV !== 'production') {
    process.on('SIGINT', async () => {
        await mongoose.connection.close();
        console.log('⚠️  Mongoose connection closed through app termination');
        process.exit(0);
    });
}

export default connectToDatabase;
