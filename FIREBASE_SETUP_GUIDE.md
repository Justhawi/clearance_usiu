# Firebase Setup Guide for Student Clearance System

This guide will walk you through setting up Firebase for the Student Clearance System in the correct order.

---

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or **"Create a project"**
3. Enter a project name (e.g., "USIU Clearance System")
4. Click **"Continue"**
5. **Disable** Google Analytics (optional, you can enable later if needed)
6. Click **"Create project"**
7. Wait for the project to be created, then click **"Continue"**

---

## Step 2: Get Your Firebase Configuration Keys

1. In the Firebase Console, click the **gear icon** ⚙️ next to "Project Overview"
2. Select **"Project settings"**
3. Scroll down to the **"Your apps"** section
4. Click the **Web icon** `</>` to add a web app
5. Register your app:
   - Enter an app nickname (e.g., "Clearance System Web")
   - **Do NOT** check "Also set up Firebase Hosting" (unless you want to use it)
   - Click **"Register app"**
6. Copy the `firebaseConfig` object that appears
7. Open `project/app.js` in your code editor
8. Find the `firebaseConfig` object (around line 29-36)
9. Replace the placeholder values with your actual config:

```javascript
const firebaseConfig = {
  apiKey: 'YOUR_ACTUAL_API_KEY',
  authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT_ID.appspot.com',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID'
};
```

**⚠️ Important:** Keep your `apiKey` secure. For production, consider using environment variables or Firebase Hosting environment config.

---

## Step 3: Enable Email/Password Authentication

1. In the Firebase Console, click **"Authentication"** in the left sidebar
2. Click **"Get started"** (if you see it)
3. Click the **"Sign-in method"** tab
4. Click on **"Email/Password"**
5. Toggle **"Enable"** to ON
6. Leave **"Email link (passwordless sign-in)"** as OFF (unless you want it)
7. Click **"Save"**

---

## Step 4: Create Firestore Database

1. In the Firebase Console, click **"Firestore Database"** in the left sidebar
2. Click **"Create database"**
3. Choose **"Start in test mode"** (we'll add security rules in Step 6)
4. Select a **Cloud Firestore location** (choose the closest to your users)
   - Recommended: `us-central1` or `europe-west1`
5. Click **"Enable"**
6. Wait for the database to be created

---

## Step 5: Set Up Firestore Security Rules

1. In Firestore Database, click the **"Rules"** tab
2. Replace the default rules with the following:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper function to check if user is admin
    function isAdmin() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/profiles/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Helper function to check if user owns the resource
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Profiles collection
    match /profiles/{userId} {
      // Users can read their own profile
      allow read: if isOwner(userId);
      // Users can create their own profile during registration
      allow create: if isOwner(userId) && request.resource.data.role in ['student', 'admin'];
      // Only admins can update profiles (or users updating their own basic info)
      allow update: if isAdmin() || (isOwner(userId) && 
                                     request.resource.data.diff(resource.data).affectedKeys().hasOnly(['fullName', 'email']));
      // Only admins can delete profiles
      allow delete: if isAdmin();
    }
    
    // Departments collection (read-only for all authenticated users)
    match /departments/{departmentId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    
    // Clearance requests collection
    match /clearance_requests/{requestId} {
      // Students can read their own requests
      allow read: if isAuthenticated() && 
                     (resource.data.studentUid == request.auth.uid || isAdmin());
      // Students can create their own requests
      allow create: if isAuthenticated() && 
                       request.resource.data.studentUid == request.auth.uid;
      // Only admins can update requests
      allow update: if isAdmin();
      // Only admins can delete requests
      allow delete: if isAdmin();
    }
  }
}
```

3. Click **"Publish"** to save the rules
4. You should see a green success message

**⚠️ Note:** These rules assume profiles are created during user registration. If a profile doesn't exist, admin checks will fail. Make sure users create profiles when they sign up.

---

## Step 6: Seed Initial Department Data

1. In Firestore Database, click the **"Data"** tab
2. Click **"Start collection"**
3. Collection ID: `departments`
4. Click **"Next"**
5. Add the first document:
   - **Document ID:** Click "Auto-ID" or use a custom ID like `finance`
   - **Fields:**
     - `name` (string): `Finance Department`
     - `description` (string): `Handles tuition fees, payment plans, and financial clearances.`
     - `contact_email` (string): `finance@usiu.ac.ke`
   - Click **"Save"**
6. Repeat for other departments. Click **"Add document"** in the `departments` collection:

   **Document 2:**
   - Document ID: `library` (or Auto-ID)
   - `name`: `Library Department`
   - `description`: `Manages library book returns, fines, and resource clearances.`
   - `contact_email`: `library@usiu.ac.ke`

   **Document 3:**
   - Document ID: `registrar` (or Auto-ID)
   - `name`: `Registrar's Office`
   - `description`: `Handles academic records, transcripts, and graduation clearances.`
   - `contact_email`: `registrar@usiu.ac.ke`

   **Document 4:**
   - Document ID: `student_affairs` (or Auto-ID)
   - `name`: `Student Affairs`
   - `description`: `Manages student conduct, disciplinary matters, and student life clearances.`
   - `contact_email`: `studentaffairs@usiu.ac.ke`

   **Document 5:**
   - Document ID: `housing` (or Auto-ID)
   - `name`: `Housing Department`
   - `description`: `Handles dormitory clearances, room assignments, and housing fees.`
   - `contact_email`: `housing@usiu.ac.ke`

   **Document 6:**
   - Document ID: `sports` (or Auto-ID)
   - `name`: `Sports & Recreation`
   - `description`: `Manages sports equipment returns and athletic facility clearances.`
   - `contact_email`: `sports@usiu.ac.ke`

   **Document 7:**
   - Document ID: `it_services` (or Auto-ID)
   - `name`: `IT Services`
   - `description`: `Handles technology equipment returns and IT-related clearances.`
   - `contact_email`: `it@usiu.ac.ke`

---

## Step 7: Test the Application - Create Test Accounts

### 7.1: Open the Application

1. Open `project/index.html` in your web browser
   - You can drag and drop the file into your browser
   - Or use a local server (recommended):
     - **VS Code:** Install "Live Server" extension, right-click `index.html` → "Open with Live Server"
     - **Python:** Run `python -m http.server 8000` in the project folder, then visit `http://localhost:8000`
     - **Node.js:** Install `http-server` globally: `npm install -g http-server`, then run `http-server` in the project folder

### 7.2: Create an Admin Account

1. On the home page, click **"Log In"** or **"Get Started"**
2. Click **"Don't have an account? Sign up"**
3. Fill in the form:
   - **Full Name:** `Admin User`
   - **Account Type:** Select **"Admin"**
   - **Email:** `admin@usiu.ac.ke` (use a real email you can access)
   - **Password:** `admin123456` (minimum 6 characters)
4. Click **"Create Account"**
5. You should be redirected to `admin.html`
6. **Verify in Firebase Console:**
   - Go to **Authentication** → **Users** tab
   - You should see the admin email listed
   - Go to **Firestore Database** → **Data** tab
   - Open the `profiles` collection
   - You should see a document with the admin's UID containing:
     - `fullName`: `Admin User`
     - `role`: `admin`
     - `email`: `admin@usiu.ac.ke`

### 7.3: Create a Student Account

1. Sign out from the admin account (click **"Sign Out"** in the admin dashboard)
2. You should be back on the home page
3. Click **"Log In"**
4. Click **"Don't have an account? Sign up"**
5. Fill in the form:
   - **Full Name:** `John Doe`
   - **Account Type:** Select **"Student"**
   - **Student ID:** `STU-123456`
   - **Email:** `student@usiu.ac.ke` (use a real email you can access)
   - **Password:** `student123`
6. Click **"Create Account"**
7. You should be redirected to `student.html`
8. **Verify in Firebase Console:**
   - Check **Authentication** → **Users** tab (should see both admin and student)
   - Check **Firestore Database** → **profiles** collection
   - The student profile should have:
     - `fullName`: `John Doe`
     - `role`: `student`
     - `studentId`: `STU-123456`
     - `email`: `student@usiu.ac.ke`

---

## Step 8: Test Student Functionality

### 8.1: Submit a Clearance Request

1. While logged in as the student, click **"New Clearance Request"**
2. Click **"Submit Request"**
3. You should see a new request appear in the list
4. **Verify in Firebase Console:**
   - Go to **Firestore Database** → **Data** tab
   - Open the `clearance_requests` collection
   - You should see a new document with:
     - `studentUid`: (the student's Firebase UID)
     - `studentName`: `John Doe`
     - `studentNumber`: `STU-123456`
     - `email`: `student@usiu.ac.ke`
     - `feeStatus`: `pending`
     - `libraryStatus`: `pending`
     - `registrarStatus`: `pending`
     - `overallStatus`: `pending`
     - `requestDate`: (timestamp)
     - `holds`: (empty array)

### 8.2: View Request Status

1. On the student dashboard, you should see:
   - The request card with status badges
   - All three departments showing "Pending"
   - Overall status as "Pending"

---

## Step 9: Test Admin Functionality

### 9.1: Sign In as Admin

1. Sign out from the student account
2. Sign in with the admin credentials:
   - Email: `admin@usiu.ac.ke`
   - Password: `admin123456`
3. You should be redirected to `admin.html`

### 9.2: View All Requests

1. On the admin dashboard, you should see:
   - **Stats cards** showing total, pending, approved, rejected requests
   - **Charts** (Status Distribution, Monthly Trends, Department Breakdown)
   - **Request list** showing all student requests

### 9.3: Update Request Status

1. Click on a student's request card
2. The modal should open showing:
   - Student information
   - Department status dropdowns (Finance, Library, Registrar)
   - Comments field
   - **Active Holds** section (empty initially)
   - **Add Hold** form

3. **Update Department Statuses:**
   - Change **Finance Status** to "Cleared"
   - Change **Library Status** to "Cleared"
   - Change **Registrar Status** to "Cleared"
   - The **Overall Status** should automatically change to "Approved"

4. **Add a Hold:**
   - Select a department from the **"Add Hold"** dropdown (e.g., "Finance")
   - Enter a reason: `Account Debt`
   - Enter a description: `Outstanding balance of $500 from Spring 2025 semester`
   - Click **"Add Hold"**
   - The hold should appear in the **Active Holds** table

5. **Edit a Hold:**
   - In the holds table, you can:
     - Change the department dropdown
     - Edit the reason field
     - Edit the description textarea
     - Click **"Mark Resolved"** to resolve a hold
     - Click **"Remove"** to delete a hold

6. Add a comment: `All departments cleared. Please collect your certificate.`

7. Click **"Save Changes"**
8. You should see a success toast message
9. **Verify in Firebase Console:**
   - Go to **Firestore Database** → `clearance_requests` collection
   - Open the request document
   - Verify:
     - `feeStatus`: `cleared`
     - `libraryStatus`: `cleared`
     - `registrarStatus`: `cleared`
     - `overallStatus`: `approved`
     - `comments`: Your comment text
     - `holds`: An array with one hold object containing:
       - `department`: `finance`
       - `reason`: `Account Debt`
       - `description`: Your description
       - `resolved`: `false`

### 9.4: Verify Charts Update

1. On the admin dashboard, check the charts:
   - **Status Distribution** doughnut chart should reflect the updated statuses
   - **Department Breakdown** bar chart should show cleared/pending counts
   - **Monthly Trends** line chart should show request trends

---

## Step 10: Test Student View After Admin Update

1. Sign out from admin
2. Sign in as the student (`student@usiu.ac.ke` / `student123`)
3. On the student dashboard, you should see:
   - The request now shows:
     - All departments as "Cleared"
     - Overall status as "Approved"
   - **Holds section** showing the active hold:
     - Department: "Finance"
     - Reason: "Account Debt"
   - **Comments** section showing the admin's comment

---

## Step 11: Test Edge Cases

### 11.1: Test Hold Resolution

1. Sign in as admin
2. Open a request with a hold
3. Click **"Mark Resolved"** on a hold
4. The hold status should change to "Resolved"
5. Save changes
6. Sign in as student
7. The resolved hold should not appear in the active holds section (only active holds are shown to students)

### 11.2: Test Multiple Holds

1. As admin, add multiple holds for different departments
2. Save changes
3. Verify all holds appear in the table
4. As student, verify all active holds are displayed

### 11.3: Test Search and Filter

1. As admin, use the search bar to search by student name, ID, or email
2. Use the status filter dropdown to filter by "Pending", "Approved", or "Rejected"
3. Verify the request list updates correctly

---

## Troubleshooting

### Issue: "Profile not found" error when signing in

**Solution:** Make sure the profile was created during sign-up. Check Firestore `profiles` collection. If missing, you may need to manually create it or fix the sign-up flow.

### Issue: Charts not displaying

**Solution:** 
- Check browser console for errors
- Ensure Chart.js is loaded (check Network tab)
- Verify you have requests in the database
- Check that `renderCharts()` is being called with data

### Issue: Cannot update requests as admin

**Solution:**
- Verify your profile has `role: 'admin'` in Firestore
- Check Firestore security rules are published
- Check browser console for permission errors

### Issue: Student cannot see their requests

**Solution:**
- Verify `studentUid` field matches the student's Firebase UID
- Check Firestore security rules allow students to read their own requests
- Verify the query in `subscribeToStudentRequests()` is correct

### Issue: Holds not saving

**Solution:**
- Check browser console for errors
- Verify the `holds` field is an array in Firestore
- Ensure `serializeHold()` function is working correctly

---

## Security Best Practices

1. **Never commit Firebase config with real keys to public repositories**
   - Use environment variables or Firebase Hosting config
   - Add `app.js` to `.gitignore` if it contains real keys

2. **Review Firestore Security Rules regularly**
   - Test rules using the Rules Playground in Firebase Console
   - Ensure rules match your application's requirements

3. **Enable Firebase App Check** (optional but recommended for production)
   - Helps protect your backend resources from abuse

4. **Monitor Authentication Usage**
   - Check Authentication → Users tab regularly
   - Set up alerts for suspicious activity

5. **Backup Firestore Data**
   - Use Firebase Export/Import or scheduled backups

---

## Next Steps

- Set up Firebase Hosting to deploy your application
- Configure custom domain (optional)
- Set up email templates for notifications (using Firebase Extensions or Cloud Functions)
- Add audit logging for admin actions
- Implement data export functionality

---

## Support

If you encounter issues:
1. Check the browser console (F12) for JavaScript errors
2. Check Firebase Console → Firestore → Data for data structure issues
3. Verify all Firebase services are enabled
4. Review Firestore security rules syntax

---

**Congratulations!** Your Student Clearance System is now fully set up with Firebase! 🎉

