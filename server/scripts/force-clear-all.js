/**
 * Force clear ALL data from MongoDB database
 * This removes everything including availability settings
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

async function forceClearAll() {
  try {
    // Connect to MongoDB
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sunday-tan';
    console.log('Connecting to MongoDB...');
    
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected successfully!');
    console.log('');
    
    // Get database instance
    const db = mongoose.connection.db;
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log(`Found ${collections.length} collections in database`);
    console.log('');
    
    // Count documents before clearing
    console.log('Current document counts:');
    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments();
      console.log(`  ${collection.name}: ${count} documents`);
    }
    console.log('');
    
    // Clear each collection
    console.log('Clearing all collections...');
    for (const collection of collections) {
      try {
        const result = await db.collection(collection.name).deleteMany({});
        console.log(`✓ Cleared ${collection.name}: ${result.deletedCount} documents deleted`);
      } catch (error) {
        console.log(`✗ Error clearing ${collection.name}:`, error.message);
      }
    }
    
    console.log('');
    console.log('Verifying cleanup...');
    
    // Verify all collections are empty
    let totalRemaining = 0;
    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments();
      if (count > 0) {
        console.log(`⚠ ${collection.name} still has ${count} documents`);
        totalRemaining += count;
      }
    }
    
    if (totalRemaining === 0) {
      console.log('✅ SUCCESS: Database is completely empty!');
    } else {
      console.log(`⚠ WARNING: ${totalRemaining} documents still remain`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('');
    console.log('Database connection closed');
  }
}

// Run the cleanup
forceClearAll();