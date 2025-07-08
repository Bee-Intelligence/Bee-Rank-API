import { seedAllFirebaseData } from '../database/seeds/firebaseSeedData';

async function main() {
  try {
    console.log('🔥 Starting Firebase database seeding...');
    await seedAllFirebaseData();
    console.log('✅ Firebase database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Firebase database seeding failed:', error);
    process.exit(1);
  }
}

main();