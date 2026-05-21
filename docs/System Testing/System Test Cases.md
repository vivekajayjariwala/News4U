# System Test Cases

This document contains system-level test cases for validating the behaviour of the application.

---

## Test Case Template

- **Test Case ID:** TC-XX
- **Title:** Short description of what is being tested.
- **Pre-conditions:** System state and data required.
- **Steps:**
  1. Step 1
  2. Step 2
  3. Step 3
- **Expected Result:** What should happen if the system behaves correctly.

---

## App Flow Test Cases

### TC-01 User can create an account
- **Test Case ID:** TC-01
- **Title:** User can register a new account successfully.
- **Pre-conditions:** The application is running and the registration page is accessible; the email used is not already registered.
- **Steps:**
  1. Navigate to the registration page.
  2. Fill in the required fields (name, email, password, etc.).
  3. Submit the registration form.
- **Expected Result:** The system creates a new user account, shows a success message, and redirects to the login page.

### TC-02: User can log in with valid credentials
- **Title:** User can authenticate and access the dashboard.
- **Pre-conditions:** A valid user account exists.
- **Steps:**
  1. Navigate to the login page.
  2. Enter a valid email and password.
  3. Submit the login form.
- **Expected Result:** The system logs the user in, displays the dashboard/homepage, and shows a welcome message.

### TC-03: User can search for news articles
- **Title:** Search functionality returns relevant news results.
- **Pre-conditions:** User is logged in and the search page or search bar is accessible.
- **Steps:**
  1. Enter a query term into the search field.
  2. Submit the search.
  3. Review the displayed results.
- **Expected Result:** The system shows a list of relevant news articles that match the query.

### TC-04: User can clip (save) an article
- **Title:** Saved articles appear in the user’s clipping list.
- **Pre-conditions:** User is logged in and viewing an article or list of articles.
- **Steps:**
  1. Select an article from search results or article list.
  2. Click the "Save" or "Clip" button.
  3. Navigate to the saved/clipped articles section.
- **Expected Result:** The selected article appears in the saved articles list.

### TC-05: User can view and delete saved articles
- **Title:** Saved articles can be removed from the clipping list.
- **Pre-conditions:** User has at least one saved article.
- **Steps:**
  1. Open the saved/clipped articles section.
  2. Choose an article and click the delete/remove icon.
  3. Confirm removal if prompted.
- **Expected Result:** The article is removed from the saved list and no longer appears.

### TC-06: User can update their topics preferences
- **Title:** Topics updates persist after saving.
- **Pre-conditions:** User is logged in and on the profile page.
- **Steps:**
  1. Navigate to the profile settings page.
  2. Deselect a topic or go to the + button to add.
  3. Save the changes.
- **Expected Result:** The updated value is shown on the profile page and persists on page refresh.

### TC-07: User can update their alerts information
- **Title:** Alerts updates persist after saving.
- **Pre-conditions:** User is logged in and on the profile page.
- **Steps:**
  1. Navigate to the profile settings page.
  2. Delete or add an alert topic.
  3. Save the changes.
- **Expected Result:** The updated value is shown on the profile page and persists on page refresh.

### TC-08: User can see their admin status
- **Title:** User admin status persists after login.
- **Pre-conditions:** User is logged in and on the profile page.
- **Steps:**
  1. Scroll to the bottom of the profile page.
  
  If user has admin status:
  2. Under "Account", it should say user is an admin.
  3. The subsection for "Admin Features" should be available if you have admin status. 
  4. [host]/admin/profiles - should give you access

  If user doesn't have admin status
  2. There should be no subsection of the page that has any admin options available. 
  3. Under "Account", it should say user is not an admin.
  4. [host]/admin/profiles - shouldn't allow user to proceed (should give unauthorized access error) 
- **Expected Result:** The updated admin value is shown on the profile page and persists on page refresh/log ins.

### TC-09: Admin can update other admin settings
- **Title:** Admins can change other users' admin status.
- **Pre-conditions:** User is logged in and user is an admin.
- **Steps:**
  1. Navigate to the profile settings page.
  2. Scroll to the bottom and click the "View All Profiles" button.
  3. Change a user's admin status (from user to admin or admin to user)
  4. Save the changes.
- **Expected Result:** The value should be updated on page refresh and the user should see the changes affect their account.

### TC-10: Admin can delete other users
- **Title:** Admins can delete users.
- **Pre-conditions:** User is logged in and user is an admin.
- **Steps:**
  1. Navigate to the profile settings page.
  2. Scroll to the bottom and click the "View All Profiles" button.
  3. Delete selected user.
  4. Save changes. 
- **Expected Result:** User should no longer appear on the UI and affected user shouldn't be able to log in (should say email/account doesn't exist anymore)

### TC-11: Verification email is sent and working
- **Title:** Verification email works.
- **Pre-conditions:** User has created an account, but not yet logged in for the first time.
- **Steps:**
  1. Screen should prompt user saying verification email has been sent.
  2. User should be able to check registered email (and spam/junk) and see an email from news4u.register@gmail.com within 10 minutes.
  3. User should click on the link and be redirected to the home page, with "Welcome back, [user name]
- **Expected Result:** User should be able to verify their account with email and be able to log in with ease.

### TC-12: User can build roadmaps
- **Title:** User can build related roadmaps after reading an article.
- **Pre-conditions:** User is logged in and has an article open.
- **Steps:**
  1. User should be able to click "Build Learning Roadmap" at top of article.
  2. Site should redirect the user and after ~20 seconds it should pop up with more articles.
  3. There should be five articles plus the original article read, ordered by complexity. 
  - **Expected Result:** The five articles should be all co-related, related to the original article and ordered by complexity (ie easy-intermediate-complex)


