"use server"

import { Resend } from 'resend';

// Initialize Resend with API key
// In production, this should be stored in an environment variable
const resendApiKey = process.env.RESEND_API_KEY;
const resend = new Resend(resendApiKey);

// Email for sending from address
const fromEmail = process.env.FROM_EMAIL || 'feedback@studybetter.ai';

/**
 * Send an email using Resend API
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  from = fromEmail,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
}): Promise<{ success: boolean; error: string | null }> {
  try {
    if (!resendApiKey) {
      console.error('Missing Resend API key. Set the RESEND_API_KEY environment variable.');
      return { success: false, error: 'Email service configuration missing' };
    }
    
    console.log(`Attempting to send email to ${to} with subject: ${subject}`);
    
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
      text,
    });

    if (error) {
      console.error('Error sending email:', error);
      return { success: false, error: error.message };
    }

    console.log('Email sent successfully:', data);
    return { success: true, error: null };
  } catch (error: any) {
    console.error('Exception when sending email:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    };
  }
}

// Internal helper function used by server actions
function generateEmailContent({
  userName,
  subject,
  originalMessage,
  adminResponse,
}: {
  userName: string;
  subject: string;
  originalMessage: string;
  adminResponse: string;
}): { html: string; text: string } {
  // Simple color scheme with light background
  const colors = {
    primary: '#8B5CF6',     // Purple primary color
    border: '#E5E7EB',      // Light border
    text: '#374151',        // Dark text for readability
    lightBg: '#F9FAFB',     // Light background
    quote: '#F3F4F6'        // Quote background
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Response to Your Feedback</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: ${colors.text};
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: white;
        }
        .container {
          border: 1px solid ${colors.border};
          border-radius: 4px;
          padding: 25px;
          background-color: white;
        }
        .header {
          margin-bottom: 20px;
          border-bottom: 2px solid ${colors.primary};
          padding-bottom: 10px;
        }
        .footer {
          margin-top: 20px;
          font-size: 12px;
          color: #6B7280;
          border-top: 1px solid ${colors.border};
          padding-top: 15px;
        }
        .original-message {
          background-color: ${colors.quote};
          padding: 15px;
          border-left: 3px solid ${colors.primary};
          margin: 15px 0;
          border-radius: 2px;
        }
        h2 {
          color: ${colors.primary};
          margin-top: 0;
        }
        p {
          margin: 12px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Study Better: Response to Your Feedback</h2>
        </div>
        
        <p>Hello ${userName || 'there'},</p>
        
        <p>Thank you for your feedback about "${subject}". We've reviewed your message and have a response for you.</p>
        
        <div class="original-message">
          <strong>Your message:</strong>
          <p>${originalMessage}</p>
        </div>
        
        <p><strong>Our response:</strong></p>
        <p>${adminResponse.replace(/\n/g, '<br>')}</p>
        
        <p>If you have any other questions, please feel free to contact us. </p>
        
        <p>Best regards,<br>
        The Study Better Team</p>
        
        <div class="footer">
          <p>This is a no-reply email sent in response to your feedback on Study Better.</p>
          <p>&copy; ${new Date().getFullYear()} Study Better</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Plain text version
  const text = `
Response to Your Feedback

Hello ${userName || 'there'},

Thank you for your feedback about "${subject}". We've reviewed your message and have a response for you.

YOUR MESSAGE:
${originalMessage}

OUR RESPONSE:
${adminResponse}

If you have any other questions, please feel free to contact us.

Best regards,
The Study Better Team

© ${new Date().getFullYear()} Study Better
  `;

  return { html, text };
}

/**
 * Generate email content for feedback responses and send it
 */
export async function generateFeedbackResponseEmail({
  userName,
  subject,
  originalMessage,
  adminResponse,
  to,
}: {
  userName: string;
  subject: string;
  originalMessage: string;
  adminResponse: string;
  to: string;
}): Promise<{ success: boolean; error: string | null }> {
  try {
    console.log(`Generating feedback response email to: ${to}`);
    
    // Generate the email content
    const { html, text } = generateEmailContent({
      userName,
      subject,
      originalMessage,
      adminResponse
    });
    
    // Send the email
    return await sendEmail({
      to,
      subject: `Response to your feedback: ${subject}`,
      html,
      text
    });
  } catch (error: any) {
    console.error('Error generating or sending feedback email:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate or send email'
    };
  }
}