import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { checkChatDBCompatibility } from "@/app/actions/chat-new"
import AdminLayout from "@/components/admin-layout"

// Admin page to manage chat system migration
export default async function ChatMigrationPage() {
  const supabase = await createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", session.user.id)
    .single()

  if (!profile?.is_admin) {
    redirect("/dashboard")
  }

  // Check if new chat tables exist
  const { compatible, error } = await checkChatDBCompatibility();

  return (
    <AdminLayout session={session}>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Chat System Migration</h1>
          <p className="text-gray-400">
            Migrate chat data from the old database schema to the new optimized schema.
          </p>
        </div>

        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Migration Status</CardTitle>
              <CardDescription>
                Check the current status of the chat database schema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-gray-800 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Database Schema</h3>
                  
                  {error ? (
                    <div className="text-red-400">
                      <p>Error checking database compatibility: {error}</p>
                    </div>
                  ) : compatible ? (
                    <div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                        <span className="text-green-400">New schema detected</span>
                      </div>
                      <p className="text-sm mt-2 text-gray-400">
                        The new optimized chat schema is installed and ready to use. You can migrate data
                        from the old schema if needed.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                        <span className="text-yellow-400">Using old schema</span>
                      </div>
                      <p className="text-sm mt-2 text-gray-400">
                        The system is currently using the old chat database schema. To use the new optimized
                        schema, you need to run the database migrations.
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-gray-800 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Migration Options</h3>

                  <div className="space-y-4">
                    <div>
                      <p className="text-sm mb-2">
                        {compatible 
                          ? "Run data migration to transfer data from old schema to new schema"
                          : "First install the new schema, then migrate data"}
                      </p>
                      
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          className="w-full sm:w-auto"
                          variant={!compatible ? "destructive" : "secondary"}
                          disabled={!compatible}
                        >
                          Migrate Chat Data
                        </Button>
                        
                        <Button className="w-full sm:w-auto" variant="secondary">
                          Install Database Schema
                        </Button>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="text-sm text-gray-400">
                      <h4 className="font-medium text-gray-300 mb-1">Process</h4>
                      <ol className="list-decimal ml-4 space-y-1">
                        <li>Install the new database schema</li>
                        <li>Migrate data from the old schema to the new schema</li>
                        <li>Verify that all data has been migrated correctly</li>
                        <li>Update application to use the new schema</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>
                Additional migration options and database configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="font-medium mb-2">Chat Schema Improvements</h3>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li>✓ Improved message structure with role-based messages</li>
                  <li>✓ Added pinning and tagging for better organization</li>
                  <li>✓ Better metadata storage for analytics</li>
                  <li>✓ Token usage tracking</li>
                  <li>✓ Optimized database indexes</li>
                  <li>✓ System message context for better AI responses</li>
                </ul>
              </div>

              <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="font-medium mb-2">Database Script</h3>
                <p className="text-sm text-gray-400 mb-2">
                  You can manually run the database migration script from the command line:
                </p>
                <div className="bg-black p-3 rounded overflow-auto text-sm font-mono text-gray-300 whitespace-pre">
                  {`psql -h hostname -d database -U username -f schema/rebuild/chat-schema.sql`}
                </div>
              </div>
              
              <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="font-medium mb-2">API Endpoints</h3>
                <p className="text-sm text-gray-400 mb-2">
                  You can also use the API to trigger migration:
                </p>
                <div className="bg-black p-3 rounded overflow-auto text-sm font-mono text-gray-300 whitespace-pre">
                  {`POST /api/chat/migrate
Authorization: Bearer {admin_token}

// Response on success
{
  "success": true,
  "message": "Chat data migration completed successfully"
}`}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <script id="chat-migration-script" dangerouslySetInnerHTML={{
          __html: `
            document.addEventListener("DOMContentLoaded", () => {
              const migrateButton = document.querySelector('button:not([disabled])');
              if (migrateButton) {
                migrateButton.addEventListener("click", async () => {
                  migrateButton.disabled = true;
                  migrateButton.textContent = "Migrating...";
                  
                  try {
                    const response = await fetch('/api/chat/migrate', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' }
                    });
                    
                    const result = await response.json();
                    
                    if (response.ok) {
                      alert('Migration completed successfully!');
                      window.location.reload();
                    } else {
                      alert('Migration failed: ' + (result.error || 'Unknown error'));
                      migrateButton.disabled = false;
                      migrateButton.textContent = "Migrate Chat Data";
                    }
                  } catch (err) {
                    alert('Error during migration: ' + err.message);
                    migrateButton.disabled = false;
                    migrateButton.textContent = "Migrate Chat Data";
                  }
                });
              }
              
              const schemaButton = document.querySelector('button:nth-of-type(2)');
              if (schemaButton) {
                schemaButton.addEventListener("click", () => {
                  alert('To install the database schema, please run the SQL file located at "schema/rebuild/chat-schema.sql" on your database server.');
                });
              }
            });
          `
        }} />
      </div>
    </AdminLayout>
  )
}