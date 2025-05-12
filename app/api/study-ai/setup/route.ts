import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// This route is for initializing the Study AI chat tables
// Call this route once to set up the database schema
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get user session to verify authentication
    const {
      data: { session },
    } = await supabase.auth.getSession();
    
    if (!session?.user.email?.endsWith('@admin.com')) {
      return NextResponse.json({ error: 'Unauthorized. Only admin users can run this setup.' }, { status: 401 });
    }
    
    // Read the SQL file
    const sqlPath = path.join(process.cwd(), 'schema', 'study-ai-chat-setup.sql');
    const sqlScript = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL script
    const { error } = await supabase.rpc('exec_sql', {
      sql_query: sqlScript
    });
    
    if (error) {
      console.error('Error executing SQL:', error);
      return NextResponse.json({ error: 'Failed to set up database schema', details: error }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, message: 'Study AI chat tables created successfully!' });
    
  } catch (error) {
    console.error('Error in setup API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during setup' },
      { status: 500 }
    );
  }
}