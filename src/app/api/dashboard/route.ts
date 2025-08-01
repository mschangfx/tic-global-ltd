import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server'; // Use your server-side Supabase client
import { sourceDashboardConfig } from '@/config/sourceDashboardConfig';
import { UserDashboardConfig, DashboardWidget } from '@/types/dashboard';

// Helper function to get authenticated user ID from Supabase session
async function getUserId(supabaseClient: ReturnType<typeof createClient>): Promise<string | null> {
  const { data: { user } } = await supabaseClient.auth.getUser();
  return user?.id || null;
}

// GET a user's dashboard configuration
export async function GET(request: Request) {
  const supabase = createClient();
  try {
    const userId = await getUserId(supabase);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: No active session' }, { status: 401 });
    }

    const { data: userDashboardConfig, error: fetchError } = await supabase
      .from('user_dashboards') // Your table name
      .select('*')
      .eq('user_id', userId)    // Match your user_id column name
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116: no rows found
      console.error('Supabase DB Fetch Error (user_dashboards GET):', fetchError);
      throw fetchError;
    }

    if (userDashboardConfig) {
      console.log(`Fetched dashboard for user: ${userId}`);
      return NextResponse.json(userDashboardConfig, { status: 200 });
    } else {
      // This case should ideally be handled at login/registration (cloning)
      // If somehow a user is logged in but has no dashboard, return the source as a fallback
      // Or, you could trigger cloning here as well if that's desired.
      console.warn(`No specific dashboard for user: ${userId}, returning source config as default. This might indicate an issue in the cloning process.`);
      const defaultConfig: UserDashboardConfig = {
        userId: userId,
        version: (sourceDashboardConfig as any).version || 1, // Access version if it exists on source
        layoutType: sourceDashboardConfig.layoutType,
        widgets: sourceDashboardConfig.widgets,
      };
      return NextResponse.json(defaultConfig, { status: 200 });
    }

  } catch (error: any) {
    console.error('Error fetching dashboard config:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch dashboard configuration' }, { status: 500 });
  }
}

// PUT (update) a user's dashboard configuration
export async function PUT(request: Request) {
  const supabase = createClient();
  try {
    const userId = await getUserId(supabase);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: No active session' }, { status: 401 });
    }

    const { layoutType, widgets }: { layoutType: 'grid' | 'flow', widgets: DashboardWidget[] } = await request.json();

    if (!layoutType || !widgets) {
        return NextResponse.json({ error: 'Missing layoutType or widgets in request body' }, { status: 400 });
    }
    
    // Prepare data for Supabase, ensuring column names match your table
    const dashboardUpdateData = {
        layout_type: layoutType, // Match your column name
        widgets: widgets,
        version: new Date().getTime(), // Simple versioning: timestamp of last update
        updated_at: new Date().toISOString(), // Explicitly set updated_at
        // user_id is used in the .eq() clause, not in the update payload itself unless it's a PK you're setting
    };

    const { data: updatedData, error: updateError } = await supabase
      .from('user_dashboards')
      .update(dashboardUpdateData)
      .eq('user_id', userId) // Match your user_id column name
      .select() // To get the updated record back
      .single(); // Assuming one dashboard config per user

    if (updateError) {
      console.error('Supabase DB Update Error (user_dashboards PUT):', updateError);
      throw updateError;
    }
    
    console.log(`Dashboard configuration updated for user: ${userId}`);
    return NextResponse.json({ message: 'Dashboard updated successfully', data: updatedData }, { status: 200 });

  } catch (error: any) {
    console.error('Error updating dashboard config:', error);
    return NextResponse.json({ error: error.message || 'Failed to update dashboard configuration' }, { status: 500 });
  }
}