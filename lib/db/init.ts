import mongoose from 'mongoose';
import connectToDatabase from './mongodb';


// -------------------- SYNC INDEXES (SAFE) --------------------
async function syncIndexes(model: mongoose.Model<any>): Promise<void> {
  try {
    const collection = model.collection;
    const existingIndexes = await collection.indexes();
    const schemaIndexes = model.schema.indexes();

    console.log(`  📋 ${model.modelName}: ${existingIndexes.length} existing, ${schemaIndexes.length} in schema`);

    // Sync indexes (this will handle conflicts gracefully)
    await model.syncIndexes();

    console.log(`  ✅ ${model.modelName}: Indexes synced successfully`);
  } catch (error) {
    if (error instanceof Error) {
      // Log warning but don't fail - indexes might already exist correctly
      console.warn(`  ⚠️  ${model.modelName}: ${error.message}`);
    }
  }
}

// -------------------- INITIALIZE DATABASE --------------------
export async function initializeDatabase(): Promise<void> {
  try {
    console.log('🚀 Initializing database...');

    // Connect to MongoDB
    await connectToDatabase();

    // Verify all models are registered
    // const models = [
    //   User,
    //   Post,
    //   Comment,
    //   Category,
    //   Tag,
    //   Media,
    //   Like,
    //   Bookmark,
    //   Follow,
    //   Notification,
    //   Analytics,
    //   Session,
    //   Newsletter
    // ];

    // console.log('📋 Registered models:');
    // models.forEach((model) => {
    //   const isRegistered = mongoose.modelNames().includes(model.modelName);
    //   console.log(`  ${isRegistered ? '✅' : '❌'} ${model.modelName}`);
    // });
    //
    // // Sync indexes for all models (safer than createIndexes)
    // console.log('🔧 Syncing indexes...');
    // for (const model of models) {
    //   await syncIndexes(model);
    // }

    console.log('✅ Database initialized successfully');
    console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);
    console.log(`🌐 Host: ${mongoose.connection.host}`);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// -------------------- DROP ALL INDEXES (USE WITH CAUTION) --------------------
export async function dropAllIndexes(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Cannot drop indexes in production!');
  }

  try {
    console.log('⚠️  Dropping all indexes...');

    const models = [];

    for (const model of models) {
      try {
        await model.collection.dropIndexes();
        console.log(`  ✅ ${model.modelName}: Indexes dropped`);
      } catch (error) {
        console.log(`  ⚠️  ${model.modelName}: No indexes to drop or error`);
      }
    }

    console.log('✅ All indexes dropped successfully');
  } catch (error) {
    console.error('❌ Failed to drop indexes:', error);
    throw error;
  }
}

// -------------------- HEALTH CHECK --------------------
export async function checkDatabaseHealth(): Promise<{
  status: string;
  database: string;
  collections: number;
  message?: string;
}> {
  try {
    const state = mongoose.connection.readyState;

    if (state !== 1) {
      return {
        status: 'disconnected',
        database: '',
        collections: 0,
        message: 'Database is not connected'
      };
    }

    const collections = await mongoose.connection.db.collections();

    return {
      status: 'connected',
      database: mongoose.connection.db.databaseName,
      collections: collections.length
    };
  } catch (error) {
    return {
      status: 'error',
      database: '',
      collections: 0,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// -------------------- DROP DATABASE (USE WITH CAUTION) --------------------
export async function dropDatabase(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Cannot drop database in production!');
  }

  try {
    console.log('⚠️  Dropping database...');
    await mongoose.connection.dropDatabase();
    console.log('✅ Database dropped successfully');
  } catch (error) {
    console.error('❌ Failed to drop database:', error);
    throw error;
  }
}

export default initializeDatabase;
