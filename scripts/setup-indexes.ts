// scripts/setup-indexes.ts
import clientPromise from '@/lib/mongodb'

async function setupIndexes() {
  try {
    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB || 'retreat_management')
    
    // Retreat Participants indexes
    const participantsCollection = db.collection('retreatParticipants')
    await participantsCollection.createIndex({ serialNumber: 1 }, { unique: true })
    await participantsCollection.createIndex({ phoneNumber: 1 })
    await participantsCollection.createIndex({ fullName: 1 })
    await participantsCollection.createIndex({ paymentStatus: 1 })
    await participantsCollection.createIndex({ attendanceStatus: 1 })
    console.log('✅ Retreat Participants indexes created')
    
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