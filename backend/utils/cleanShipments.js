require('dotenv').config();
const mongoose = require('mongoose');

const clean = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const col = mongoose.connection.collection('shipments');

  // 1. Delete all shipments (fresh start)
  const r1 = await col.deleteMany({});
  console.log(`Deleted ${r1.deletedCount} shipment(s)`);

  // 2. Drop ALL indexes except _id
  const indexes = await col.indexes();
  for (const idx of indexes) {
    if (idx.name !== '_id_') {
      try {
        await col.dropIndex(idx.name);
        console.log(`Dropped index: ${idx.name}`);
      } catch (e) {
        console.log(`Could not drop ${idx.name}: ${e.message}`);
      }
    }
  }

  // 3. Recreate correct indexes
  await col.createIndex({ trackingId: 1 }, { unique: true, sparse: true });
  await col.createIndex({ status: 1, createdAt: -1 });
  console.log('Recreated indexes cleanly');

  // 4. Reset counters
  await mongoose.connection.collection('counters').deleteMany({});
  console.log('Reset counters');

  console.log('\n✅ Done! Now restart backend with: npm run dev');
  process.exit(0);
};

clean().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});