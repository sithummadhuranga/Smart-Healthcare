// ============================================================
// seed-users.js
// Run with: node db-scripts/seed-users.js
// Seeds test users for all three roles into authdb
// Requires: npm install bcryptjs mongodb  (or run via npx)
// ============================================================

const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27018';
const DB_NAME = 'authdb';
const SALT_ROUNDS = 12;

const users = [
  {
    name: 'Admin User',
    email: 'admin@smartcare.com',
    password: 'Admin@1234',
    role: 'admin',
    isVerified: true,
    isActive: true,
  },
  {
    name: 'Alice Patient',
    email: 'patient@smartcare.com',
    password: 'Patient@1234',
    role: 'patient',
    isVerified: true,
    isActive: true,
  },
  {
    name: 'Dr. Bob Smith',
    email: 'doctor@smartcare.com',
    password: 'Doctor@1234',
    role: 'doctor',
    isVerified: true,   // pre-verified so you can login immediately
    isActive: true,
  },
];

async function seed() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    console.log('Connected to MongoDB at', MONGO_URI);

    const db = client.db(DB_NAME);
    const col = db.collection('users');

    for (const u of users) {
      const passwordHash = await bcrypt.hash(u.password, SALT_ROUNDS);
      const doc = {
        name: u.name,
        email: u.email,
        passwordHash,
        role: u.role,
        isVerified: u.isVerified,
        isActive: u.isActive,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await col.updateOne(
        { email: u.email },
        { $setOnInsert: doc },
        { upsert: true },
      );

      if (result.upsertedCount > 0) {
        console.log(`✓ Created  [${u.role.padEnd(7)}] ${u.email}  /  password: ${u.password}`);
      } else {
        console.log(`– Skipped  [${u.role.padEnd(7)}] ${u.email}  (already exists)`);
      }
    }

    console.log('\nDone. Login credentials:');
    console.log('  Admin:   admin@smartcare.com   /  Admin@1234');
    console.log('  Patient: patient@smartcare.com /  Patient@1234');
    console.log('  Doctor:  doctor@smartcare.com  /  Doctor@1234');
  } finally {
    await client.close();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
