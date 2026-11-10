
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import process from 'node:process'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY

if (!supabaseUrl || !supabaseSecretKey) {
  console.error('Missing Supabase URL or Secret Key in environment variables.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
})

const testUsers = [
  { fullName: 'Charles Dickens', email: 'owner1@test.com', password: 'pass123', mspName: 'Sothebys Notary' },
  { fullName: 'Roland Wimbledon', email: 'owner2@test.com', password: 'pass123', mspName: 'Nothern Slope Mining' },
  { fullName: 'George Orwell', email: 'owner3@test.com', password: 'pass123', mspName: 'Napoleon Pork Suppliers' },
  { fullName: 'Wilbur Smith', email: 'owner4@test.com', password: 'pass123', mspName: 'Nile Trading Pty' },

  { fullName: 'Tester 1324', email: 'tester1324@test.com', password: 'pass1324', mspName: '1324 Pty Ltd'},
  { fullName: 'Tester 1325', email: 'tester1325@test.com', password: 'pass1325', mspName: '1325 Pty Ltd'},
  { fullName: 'Tester 1326', email: 'tester1326@test.com', password: 'pass1326', mspName: '1326 Pty Ltd'},
  { fullName: 'Tester 1327', email: 'tester1327@test.com', password: 'pass1327', mspName: '1327 Pty Ltd'},
  { fullName: 'Tester 1328', email: 'tester1328@test.com', password: 'pass1328', mspName: '1328 Pty Ltd'},
  { fullName: 'Tester 1329', email: 'tester1329@test.com', password: 'pass1329', mspName: '1329 Pty Ltd'},
  { fullName: 'Tester 1330', email: 'tester1330@test.com', password: 'pass1330', mspName: '1330 Pty Ltd'},
  { fullName: 'Tester 1331', email: 'tester1331@test.com', password: 'pass1331', mspName: '1331 Pty Ltd'},
  { fullName: 'Tester 1332', email: 'tester1332@test.com', password: 'pass1332', mspName: '1332 Pty Ltd'},
  { fullName: 'Tester 1333', email: 'tester1333@test.com', password: 'pass1333', mspName: '1333 Pty Ltd'}
]

async function seedUsers() {
  console.log('Starting test user creation...')

  for (const user of testUsers) {
    const { error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true, // Automatically confirms email
      user_metadata: {
        full_name: user.fullName,
        msp_name: user.mspName
      }
    })

    if (error) {
      if (error.message.includes('duplicate key value')) {
        console.log(`User ${user.email} already exists. Skipping creation.`)
      } else {
        console.error(`Failed to create ${user.email}:`, error.message)
      }
    } else {
      console.log(`Successfully created test user: ${user.email} with MSP: ${user.mspName}`)
    }
  }

  console.log('Seeding process finished.')
}

seedUsers()