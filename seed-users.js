
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
  { fullName: 'Wilbur Smith', email: 'owner4@test.com', password: 'pass123', mspName: 'Nile Trading Pty' }
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