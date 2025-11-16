# Email Notification Setup Guide

This guide will help you set up automated email notifications for the Student Clearance System.

## Overview

The system sends automated email notifications in two scenarios:

1. **Student Notifications**: Students receive emails when their clearance status changes (pending → approved/rejected)
2. **Admin Notifications**: Administrators receive emails when a new clearance request is submitted

## Prerequisites

- An EmailJS account (free tier available at https://www.emailjs.com/)
- Access to your email service (Gmail, Outlook, etc.)

## Step-by-Step Setup

### Step 1: Create an EmailJS Account

1. Go to https://www.emailjs.com/
2. Sign up for a free account (or log in if you already have one)
3. Verify your email address

### Step 2: Add an Email Service

1. In your EmailJS dashboard, go to **Email Services**
2. Click **Add New Service**
3. Choose your email provider (Gmail, Outlook, etc.)
4. Follow the instructions to connect your email account
5. Note the **Service ID** (e.g., `service_xxxxx`)

### Step 3: Create Email Templates

You need to create two email templates:

#### Template 1: Student Status Notification

1. Go to **Email Templates** in your EmailJS dashboard
2. Click **Create New Template**
3. Name it: `Student Clearance Status`
4. Use the following template:

**Subject:**
```
Clearance Status Update - {{status}}
```

**Body (HTML):**
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1A237E; color: white; padding: 20px; text-align: center; }
    .content { background: #f9f9f9; padding: 20px; }
    .status-box { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #1A237E; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
    .button { display: inline-block; padding: 12px 24px; background: #1A237E; color: white; text-decoration: none; border-radius: 4px; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>USIU-Africa Clearance System</h2>
    </div>
    <div class="content">
      <p>Dear {{to_name}},</p>
      
      <p>{{status_message}}</p>
      
      <div class="status-box">
        <h3>Request Details</h3>
        <p><strong>Request ID:</strong> {{request_id}}</p>
        <p><strong>Student ID:</strong> {{student_id}}</p>
        <p><strong>Current Status:</strong> {{status}}</p>
        <p><strong>Previous Status:</strong> {{previous_status}}</p>
        <p><strong>Request Date:</strong> {{request_date}}</p>
        <p><strong>Last Updated:</strong> {{updated_date}}</p>
      </div>
      
      <div class="status-box">
        <h3>Department Status</h3>
        <p><strong>Finance:</strong> {{fee_status}}</p>
        <p><strong>Library:</strong> {{library_status}}</p>
        <p><strong>Registrar:</strong> {{registrar_status}}</p>
      </div>
      
      {% if comments %}
      <div class="status-box">
        <h3>Comments</h3>
        <p>{{comments}}</p>
      </div>
      {% endif %}
      
      <p style="text-align: center;">
        <a href="{{dashboard_url}}" class="button">View Dashboard</a>
      </p>
    </div>
    <div class="footer">
      <p>This is an automated email from USIU-Africa Clearance System.</p>
      <p>Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
```

5. Note the **Template ID** (e.g., `template_xxxxx`)

#### Template 2: Admin New Request Notification

1. Create another template
2. Name it: `Admin New Clearance Request`
3. Use the following template:

**Subject:**
```
New Clearance Request - {{student_name}} ({{student_id}})
```

**Body (HTML):**
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1A237E; color: white; padding: 20px; text-align: center; }
    .content { background: #f9f9f9; padding: 20px; }
    .info-box { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #FDB913; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
    .button { display: inline-block; padding: 12px 24px; background: #1A237E; color: white; text-decoration: none; border-radius: 4px; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>New Clearance Request</h2>
    </div>
    <div class="content">
      <p>Dear {{to_name}},</p>
      
      <p>A new clearance request has been submitted and requires your review.</p>
      
      <div class="info-box">
        <h3>Student Information</h3>
        <p><strong>Name:</strong> {{student_name}}</p>
        <p><strong>Student ID:</strong> {{student_id}}</p>
        <p><strong>Email:</strong> {{student_email}}</p>
        <p><strong>Request ID:</strong> {{request_id}}</p>
        <p><strong>Request Date:</strong> {{request_date}}</p>
      </div>
      
      <p style="text-align: center;">
        <a href="{{dashboard_url}}" class="button">Review Request</a>
      </p>
      
      <p>Please log in to the admin dashboard to review and process this clearance request.</p>
    </div>
    <div class="footer">
      <p>This is an automated email from USIU-Africa Clearance System.</p>
    </div>
  </div>
</body>
</html>
```

4. Note the **Template ID** (e.g., `template_yyyyy`)

### Step 4: Get Your Public Key

1. In your EmailJS dashboard, go to **Account** → **General**
2. Find your **Public Key** (also called API Key)
3. Copy the key (e.g., `xxxxxxxxxxxxx`)

### Step 5: Configure the Application

1. Open `project/app.js` in your code editor
2. Find the `EMAILJS_CONFIG` object (around line 91)
3. Replace the placeholder values with your actual credentials:

```javascript
const EMAILJS_CONFIG = {
  serviceId: 'service_gm92ove', // Your Service ID from Step 2
  templateIdStudent: 'template_0r4z9gf', // Student template ID from Step 3
  templateIdAdmin: 'template_r05ciuj', // Admin template ID from Step 3
  publicKey: 'scvGfuHbYIRdv6G-g', // Your Public Key from Step 4
  adminEmail: 'admin@usiu.ac.ke' // Default admin email (optional)
};
```

### Step 6: Test the Configuration

1. Start your application
2. Open the browser console (F12)
3. Look for the message: `EmailJS initialized successfully`
4. If you see warnings, check that all values are correctly set

## Testing Email Notifications

### Test Student Notification

1. Log in as a student
2. Submit a new clearance request
3. Log in as an admin
4. Update the clearance status (e.g., from pending to approved)
5. Check the student's email inbox

### Test Admin Notification

1. Log in as a student
2. Submit a new clearance request
3. Check the admin email inbox (configured in `adminEmail` or from Firestore admin profiles)

## Troubleshooting

### Emails Not Sending

1. **Check Console Logs**: Open browser console (F12) and look for error messages
2. **Verify Configuration**: Ensure all values in `EMAILJS_CONFIG` are correct
3. **Check EmailJS Dashboard**: Go to EmailJS dashboard → Logs to see if emails are being sent
4. **Verify Email Service**: Make sure your email service is properly connected in EmailJS
5. **Check Template Variables**: Ensure all template variables match what's being sent from the code

### Common Errors

- **"EmailJS not configured"**: Check that all placeholder values are replaced
- **"EmailJS library not found"**: Ensure the EmailJS script is loaded in your HTML files
- **"Service ID not found"**: Verify your Service ID in EmailJS dashboard
- **"Template ID not found"**: Verify your Template IDs in EmailJS dashboard

## Email Template Variables

### Student Template Variables

- `to_email` - Student's email address
- `to_name` - Student's name
- `student_name` - Student's full name
- `student_id` - Student ID number
- `request_id` - Clearance request ID
- `status` - Current clearance status (Pending, Approved, Rejected)
- `status_message` - Human-readable status message
- `fee_status` - Finance department status
- `library_status` - Library department status
- `registrar_status` - Registrar department status
- `request_date` - Date request was submitted
- `updated_date` - Date request was last updated
- `comments` - Admin comments
- `previous_status` - Previous clearance status
- `dashboard_url` - Link to student dashboard

### Admin Template Variables

- `to_email` - Admin's email address
- `to_name` - Admin's name (usually "Administrator")
- `student_name` - Student's full name
- `student_id` - Student ID number
- `student_email` - Student's email address
- `request_id` - Clearance request ID
- `request_date` - Date request was submitted
- `dashboard_url` - Link to admin dashboard

## Security Notes

- Never commit your EmailJS credentials to public repositories
- Consider using environment variables for production
- The Public Key is safe to use in client-side code (it's designed for this)
- Service IDs and Template IDs are also safe for client-side use

## Support

If you encounter issues:

1. Check the EmailJS documentation: https://www.emailjs.com/docs/
2. Review the browser console for error messages
3. Check EmailJS dashboard logs for email sending status
4. Verify all configuration values are correct

## Additional Configuration

### Sending to Multiple Admins

The system automatically fetches all admin emails from Firestore profiles with `role: 'admin'`. If you want to use a specific email list instead, modify the `sendAdminNewRequestEmail` function in `app.js`.

### Customizing Email Templates

You can customize the email templates in your EmailJS dashboard. The templates support HTML and CSS for styling. Make sure to keep all the template variables (e.g., `{{student_name}}`) intact.



