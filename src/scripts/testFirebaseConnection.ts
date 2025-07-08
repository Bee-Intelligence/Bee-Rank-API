import { firebaseDatabaseConfig } from '../config/firebaseDatabase';
import { firebaseService } from '../services/content/firebase/firebaseService';
import * as dotenv from 'dotenv';

dotenv.config();

async function testFirebaseConnection() {
  console.log('🔥 Testing Firebase connection and seeding database...\n');

  try {
    // Test Firebase configuration
    console.log('1. Testing Firebase configuration...');
    const connectionInfo = await firebaseDatabaseConfig.getConnectionInfo();
    console.log('✅ Firebase configuration:', connectionInfo);

    // Initialize Firebase database
    console.log('\n2. Initializing Firebase database...');
    await firebaseDatabaseConfig.initialize();

    // Test Firebase service
    console.log('\n3. Testing Firebase service...');
    // firebaseService is already imported as an instance
    // await firebaseService.initialize(); // This method doesn't exist in the current implementation

    // Test basic operations
    console.log('\n4. Testing basic operations...');
    
    // Test user creation
    const testUserId = await firebaseService.create('test_users', {
      email: 'test@firebase.com',
      name: 'Firebase Test User',
      test: true
    });
    console.log('✅ Created test user with ID:', testUserId);

    // Test user retrieval
    const testUser = await firebaseService.getById('test_users', testUserId);
    console.log('✅ Retrieved test user:', testUser);

    // Test user update
    await firebaseService.update('test_users', testUserId, {
      name: 'Updated Firebase Test User',
      updated: true
    });
    console.log('✅ Updated test user');

    // Test user retrieval after update
    const updatedUser = await firebaseService.getById('test_users', testUserId);
    console.log('✅ Retrieved updated user:', updatedUser);

    // Test query operations
    console.log('\n5. Testing query operations...');
    
    // Get all users (should include seeded data)
    const allUsers = await firebaseService.getUsers();
    console.log(`✅ Found ${allUsers.length} users in database`);

    // Get taxi ranks
    const taxiRanks = await firebaseService.getTaxiRanks();
    console.log(`✅ Found ${taxiRanks.length} taxi ranks in database`);

    // Test specific queries
    if (allUsers.length > 0) {
      const adminUsers = await firebaseService.getAll('users', {
        filters: [{ field: 'role', operator: '==', value: 'ADMIN' }]
      });
      console.log(`✅ Found ${adminUsers.length} admin users`);
    }

    // Clean up test data
    console.log('\n6. Cleaning up test data...');
    await firebaseService.delete('test_users', testUserId);
    console.log('✅ Deleted test user');

    console.log('\n🎉 Firebase connection test completed successfully!');
    console.log('\n📊 Database Summary:');
    console.log(`   - Users: ${allUsers.length}`);
    console.log(`   - Taxi Ranks: ${taxiRanks.length}`);

  } catch (error) {
    console.error('\n❌ Firebase connection test failed:', error);
    
    // Provide helpful error messages
    if (error instanceof Error) {
      if (error.message.includes('offline') || error.message.includes('unavailable')) {
        console.log('\n💡 Troubleshooting tips:');
        if (process.env.USE_FIREBASE_EMULATOR === 'true') {
          console.log('   - Make sure Firebase emulator is running: npm run firebase:emulator');
          console.log('   - Check that emulator is on localhost:8080');
        } else {
          console.log('   - Check your internet connection');
          console.log('   - Verify Firebase project exists and Firestore is enabled');
          console.log('   - Check Firebase credentials in .env file');
        }
      }
    }
    
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testFirebaseConnection()
    .then(() => {
      console.log('\n✅ Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}

export { testFirebaseConnection };