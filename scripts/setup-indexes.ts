// scripts/setup-indexes.ts
import clientPromise from '@/lib/mongodb'

async function setupIndexes() {
  try {
    const client = await clientPromise
    const db = client.db(process.env.DATABASE_NAME || process.env.MONGODB_DB || 'gold')

    // Attendance: one record per user per day (also prevents duplicate clock-ins)
    const attendanceCollection = db.collection('attendance')
    try {
      await attendanceCollection.createIndex({ userId: 1, date: 1 }, { unique: true })
      await attendanceCollection.createIndex({ date: 1 })
      await attendanceCollection.createIndex({ userId: 1 })
      console.log('✅ Attendance indexes created')
    } catch (indexError) {
      console.warn('⚠️ Attendance unique index not created (existing duplicates?):', (indexError as Error).message)
    }
    
    // Podcast Guests indexes
    const guestsCollection = db.collection('podcastGuests')
    await guestsCollection.createIndex({ serialNumber: 1 }, { unique: true })
    await guestsCollection.createIndex({ phoneNumber: 1 })
    await guestsCollection.createIndex({ fullName: 1 })
    await guestsCollection.createIndex({ scheduledDate: 1 })
    console.log('✅ Podcast Guests indexes created')
    
    // Entenfes Cases indexes
    const casesCollection = db.collection('entenfesCases')
    await casesCollection.createIndex({ serialNumber: 1 }, { unique: true })
    await casesCollection.createIndex({ phoneNumber: 1 })
    await casesCollection.createIndex({ userName: 1 })
    await casesCollection.createIndex({ category: 1 })
    await casesCollection.createIndex({ priority: 1 })
    await casesCollection.createIndex({ status: 1 })
    console.log('✅ Entenfes Cases indexes created')
    
    console.log('🎉 All indexes created successfully!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error creating indexes:', error)
    process.exit(1)
  }
}

setupIndexes()