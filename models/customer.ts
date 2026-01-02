import { ObjectId } from 'mongodb'

export interface IUser {
  _id?: ObjectId
  firstName: string
  lastName: string
  email?: string | null
  phone?: string | null
  password: string
  birthDate: Date
  gender: 'male' | 'female'
  address: string
  role: string
  location: {
    coordinates: [number, number] | null
    address: string
    city: string
    country: string
  }
  registrationSource: string
  locationConsent: boolean
  createdAt: Date
  updatedAt: Date
  __v?: number
}

// Optional: Create indexes function
export async function createUserIndexes(db: any) {
  const usersCollection = db.collection('users')
  
  await usersCollection.createIndex({ email: 1 }, { 
    unique: true, 
    sparse: true,
    name: 'email_unique_index' 
  })
  
  await usersCollection.createIndex({ phone: 1 }, { 
    unique: true, 
    sparse: true,
    name: 'phone_unique_index' 
  })
  
  await usersCollection.createIndex({ 'location.coordinates': '2dsphere' })
  
  console.log('User indexes created successfully')
}