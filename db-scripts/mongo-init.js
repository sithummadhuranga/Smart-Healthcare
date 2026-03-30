// ============================================================
// mongo-init.js
// Runs inside the MongoDB container on first start.
// Creates databases, collections, and indexes.
// Member 1 — Infrastructure Lead
// ============================================================

// ---- Auth DB ------------------------------------------------
db = db.getSiblingDB('authdb');

db.createCollection('users');

// Unique index on email — enforced at DB level
db.users.createIndex({ email: 1 }, { unique: true });

print('[mongo-init] authdb initialized');

// ---- Patient DB --------------------------------------------
db = db.getSiblingDB('patientdb');

db.createCollection('patients');

db.patients.createIndex({ userId: 1 }, { unique: true });
db.patients.createIndex({ email: 1 });

print('[mongo-init] patientdb initialized');

// ---- Doctor DB ---------------------------------------------
db = db.getSiblingDB('doctordb');

db.createCollection('doctors');
db.createCollection('prescriptions');

db.doctors.createIndex({ userId: 1 }, { unique: true });
db.doctors.createIndex({ email: 1 });
db.doctors.createIndex({ specialty: 1 });
db.doctors.createIndex({ isVerified: 1 });

db.prescriptions.createIndex({ patientId: 1 });
db.prescriptions.createIndex({ doctorId: 1 });
db.prescriptions.createIndex({ appointmentId: 1 });

print('[mongo-init] doctordb initialized');

print('[mongo-init] All databases ready.');

// NOTE: Admin user must be seeded separately.
//   1. Start the stack: docker-compose up -d mongodb
//   2. Open a shell: docker exec -it mongodb mongosh
//   3. Use authdb; then insert a user with role "admin"
//      and a bcrypt-hashed password (12 rounds).
//   OR run:  node db-scripts/seed-admin.js  (see that file)
