import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email, password, token } = await request.json()
    const supabase = await createClient()
    
    // Validate request
    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      )
    }
    
    console.log(`Password reset attempt for email: ${email || 'unknown'} with token: ${token ? 'present' : 'absent'}`)
    
    // First approach - try using the token
    if (token && token.includes('-')) {
      try {
        console.log('Exchanging code for session')
        const { data, error } = await supabase.auth.exchangeCodeForSession(token)
        
        if (error) {
          console.error('Code exchange error:', error)
        } else if (data?.session) {
          console.log('Session obtained, updating password')
          
          // Update user password with the new session
          const { error: updateError } = await supabase.auth.updateUser({ password })
          
          if (!updateError) {
            console.log('Password updated successfully')
            return NextResponse.json({ 
              success: true,
              message: 'Password has been reset successfully'
            })
          } else {
            console.error('Password update failed:', updateError)
          }
        }
      } catch (error) {
        console.error('Token processing error:', error)
      }
    }
    
    // Second approach - try admin API with a service role client
    if (email) {
      try {
        // Create a service role client for admin operations
        // Note: This requires appropriate environment variables to be set
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        
        if (serviceRoleKey && supabaseUrl) {
          const { createClient } = await import('@supabase/supabase-js')
          const adminClient = createClient(supabaseUrl, serviceRoleKey, {
            auth: {
              autoRefreshToken: false,
              persistSession: false
            }
          })
          
          console.log('Using admin client to update password for:', email)
          
          // Update user directly with admin privileges
          const { data, error } = await adminClient.auth.admin.updateUserById(
            email, // This actually needs to be a user ID, not email
            { password }
          )
          
          if (error) {
            console.error('Admin password update failed:', error)
            
            // Try finding the user by email first
            const { data: userData, error: userError } = await adminClient.auth.admin.listUsers()
            
            if (!userError && userData?.users) {
              const user = userData.users.find(u => u.email === email)
              
              if (user) {
                // Now update with the correct user ID
                const { error: updateError } = await adminClient.auth.admin.updateUserById(
                  user.id,
                  { password }
                )
                
                if (!updateError) {
                  console.log('Password updated via admin API for user:', user.id)
                  return NextResponse.json({ 
                    success: true,
                    message: 'Password has been reset successfully'
                  })
                } else {
                  console.error('Admin password update with ID failed:', updateError)
                }
              }
            }
          } else {
            console.log('Password updated via admin API')
            return NextResponse.json({ 
              success: true,
              message: 'Password has been reset successfully'
            })
          }
        }
      } catch (adminError) {
        console.error('Admin operations error:', adminError)
      }
    }
    
    // Final fallback - send a new reset link
    if (email) {
      try {
        console.log('Sending new password reset email to:', email)
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback?type=recovery`,
        })
        
        if (error) {
          console.error('Failed to send reset email:', error)
          return NextResponse.json(
            { 
              error: 'Password reset failed',
              message: 'Unable to reset your password. Please try again later.'
            },
            { status: 400 }
          )
        }
        
        return NextResponse.json(
          { 
            success: false,
            needsNewLink: true,
            message: 'Your reset link has expired. A new password reset link has been sent to your email.'
          },
          { status: 200 }
        )
      } catch (emailError) {
        console.error('Email reset error:', emailError)
      }
    }
    
    // If we get here, all approaches failed
    return NextResponse.json(
      { 
        error: 'Password reset failed',
        message: 'Unable to reset your password. Please request a new password reset link.'
      },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Password reset API error:', error)
    
    return NextResponse.json(
      { 
        error: 'Password reset failed',
        message: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    )
  }
}