import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server'; // Use your server-side Supabase client
import { sourceDashboardConfig } from '@/config/sourceDashboardConfig';
import { UserDashboardConfig } from '@/types/dashboard'; // Ensure this type matches your DB structure

export async function POST(request: Request) {
  const supabase = createClient();
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Sign in the user with Supabase Auth
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      console.error('Supabase Sign In Error:', signInError);
      return NextResponse.json({ error: signInError.message || 'Invalid login credentials' }, { status: 401 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Login succeeded but no user data returned' }, { status: 500 });
    }
    const userId = authData.user.id;
    console.log(`User logged in: ${userId}`);

    // Check if the user has an existing dashboard configuration
    let userDashboardConfig: UserDashboardConfig | null = null;
    const { data: existingDashboard, error: fetchError } = await supabase
      .from('user_dashboards') // Your table name
      .select('*')
      .eq('user_id', userId)    // Match your user_id column name
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found, which is okay here
      console.error('Supabase DB Fetch Error (user_dashboards):', fetchError);
      throw fetchError; // Or handle more gracefully
    }

    if (existingDashboard) {
      userDashboardConfig = existingDashboard as UserDashboardConfig; // Cast if necessary, ensure types match
      console.log(`Dashboard configuration found for user: ${userId}`);
    } else {
      // No dashboard found, so clone the source/template dashboard
      console.log(`No dashboard found for user: ${userId}. Cloning source dashboard...`);
      const newDashboardData = {
        user_id: userId,
        version: 1,
        layout_type: sourceDashboardConfig.layoutType,
        widgets: sourceDashboardConfig.widgets,
      };

      const { data: createdDashboard, error: insertError } = await supabase
        .from('user_dashboards')
        .insert(newDashboardData)
        .select()
        .single(); // Select the newly created row

      if (insertError) {
        console.error('Supabase DB Insert Error (cloning dashboard):', insertError);
        throw insertError; // Or handle more gracefully
      }
      userDashboardConfig = createdDashboard as UserDashboardConfig;
      console.log(`Dashboard configuration cloned and created for user: ${userId}`);
    }
    
    // Supabase signInWithPassword (when using server client with cookie helpers)
    // typically handles setting the auth cookies for session management.
    // The user object and session are available on subsequent requests if middleware is set up.

    return NextResponse.json({
      message: 'Login successful',
      userId: authData.user.id,
      user: authData.user,
      dashboardConfig: userDashboardConfig // Send the user's dashboard config
    }, { status: 200 });

  } catch (error: any) {
    console.error('Overall Login error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during login';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}