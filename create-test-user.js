#!/usr/bin/env node

/**
 * Script to create a test user for forgot password testing
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const createTestUser = async () => {
  const testUser = {
    email: 'mschangfx@gmail.com',
    name: 'Test User',
    provider: 'email',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    console.log('🔍 Checking if user already exists...');
    
    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('email', testUser.email)
      .single();

    if (existingUser) {
      console.log('✅ User already exists:', existingUser);
      console.log('📧 Email:', existingUser.email);
      console.log('🆔 ID:', existingUser.id);
      console.log('📅 Created:', existingUser.created_at);
      return;
    }

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking for existing user:', checkError);
      return;
    }

    console.log('👤 Creating test user...');
    
    // Create the user
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert([testUser])
      .select()
      .single();

    if (createError) {
      console.error('❌ Error creating user:', createError);
      return;
    }

    console.log('✅ Test user created successfully!');
    console.log('📧 Email:', newUser.email);
    console.log('🆔 ID:', newUser.id);
    console.log('📅 Created:', newUser.created_at);
    
    console.log('\n🧪 You can now test the forgot password functionality with:');
    console.log('Email:', testUser.email);

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
};

// Run the script
createTestUser();
