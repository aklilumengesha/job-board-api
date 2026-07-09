# Postman Testing Guide - Job Board API

## Prerequisites

### 1. Install Required Tools
- ✅ Postman Desktop App (download from https://www.postman.com/downloads/)
- ✅ PostgreSQL installed and running
- ✅ Redis installed and running
- ✅ Node.js and npm installed

### 2. Environment Setup

#### Step 1: Configure Database
```bash
# Create PostgreSQL database
psql -U postgres
CREATE DATABASE job_board;
\q
```

#### Step 2: Configure Environment Variables
Create `.env` file in project root (if not exists):
```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/job_board?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-in-production"
JWT_REFRESH_EXPIRES_IN="7d"

# Redis
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_PASSWORD=""
REDIS_DB=0

# Email (Optional - for testing notifications)
EMAIL_PROVIDER="nodemailer"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
EMAIL_FROM="noreply@jobboard.com"

# Storage
STORAGE_PROVIDER="local"
UPLOAD_PATH="./uploads"

# App
APP_URL="http://localhost:3001"
PORT=3001

# Rate Limiting
RATE_LIMIT_TTL=900
RATE_LIMIT_MAX=100
```

#### Step 3: Run Database Migrations
```bash
cd c:\portfolio\job-board-api
npx prisma generate
npx prisma db push
```

#### Step 4: Start the Server
```bash
npm run start:dev
```

Server should start at: `http://localhost:3001`

---

## Postman Setup

### 1. Create New Collection

1. Open Postman
2. Click **"New"** → **"Collection"**
3. Name it: **"Job Board API"**
4. Click **"Create"**

### 2. Set Up Environment Variables

1. Click **"Environments"** (left sidebar)
2. Click **"+"** to create new environment
3. Name it: **"Job Board - Local"**
4. Add variables:

| Variable | Initial Value | Current Value |
|----------|--------------|---------------|
| baseUrl | http://localhost:3001/api/v1 | http://localhost:3001/api/v1 |
| accessToken | (leave empty) | (leave empty) |
| jobSeekerId | (leave empty) | (leave empty) |
| employerId | (leave empty) | (leave empty) |
| adminId | (leave empty) | (leave empty) |
| jobId | (leave empty) | (leave empty) |
| companyId | (leave empty) | (leave empty) |
| applicationId | (leave empty) | (leave empty) |
| categoryId | (leave empty) | (leave empty) |

5. Click **"Save"**
6. Select **"Job Board - Local"** from environment dropdown (top right)

---

## Complete Testing Flow

### Phase 1: Authentication & User Setup

#### 1.1 Register Job Seeker

**Request:**
```
POST {{baseUrl}}/auth/register
```

**Body (JSON):**
```json
{
  "email": "jobseeker@example.com",
  "password": "Password123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "JOB_SEEKER"
}
```

**Tests Tab (Add this script):**
```javascript
if (pm.response.code === 201) {
    const response = pm.response.json();
    pm.environment.set("jobSeekerId", response.user.id);
    console.log("Job Seeker ID:", response.user.id);
}
```

**Expected Response:** 201 Created
```json
{
  "user": {
    "id": "uuid",
    "email": "jobseeker@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "JOB_SEEKER"
  },
  "accessToken": "...",
  "refreshToken": "..."
}
```

---

#### 1.2 Register Employer

**Request:**
```
POST {{baseUrl}}/auth/register
```

**Body (JSON):**
```json
{
  "email": "employer@example.com",
  "password": "Password123!",
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "EMPLOYER"
}
```

**Tests Tab:**
```javascript
if (pm.response.code === 201) {
    const response = pm.response.json();
    pm.environment.set("employerId", response.user.id);
    pm.environment.set("accessToken", response.accessToken);
    console.log("Employer ID:", response.user.id);
    console.log("Access Token saved");
}
```

---

#### 1.3 Register Admin

**Request:**
```
POST {{baseUrl}}/auth/register
```

**Body (JSON):**
```json
{
  "email": "admin@example.com",
  "password": "Password123!",
  "firstName": "Admin",
  "lastName": "User",
  "role": "ADMIN"
}
```

**Tests Tab:**
```javascript
if (pm.response.code === 201) {
    const response = pm.response.json();
    pm.environment.set("adminId", response.user.id);
    console.log("Admin ID:", response.user.id);
}
```

---

#### 1.4 Login (Use this for subsequent tests)

**Request:**
```
POST {{baseUrl}}/auth/login
```

**Body (JSON):**
```json
{
  "email": "employer@example.com",
  "password": "Password123!"
}
```

**Tests Tab:**
```javascript
if (pm.response.code === 200) {
    const response = pm.response.json();
    pm.environment.set("accessToken", response.accessToken);
    console.log("Logged in successfully");
}
```

---

### Phase 2: Company Profile (Employer)

**⚠️ Important:** Make sure you're logged in as EMPLOYER and accessToken is set!

#### 2.1 Create Company Profile

**Request:**
```
POST {{baseUrl}}/companies
```

**Headers:**
```
Authorization: Bearer {{accessToken}}
```

**Body (JSON):**
```json
{
  "companyName": "Tech Innovators Inc",
  "description": "We are a leading technology company specializing in innovative solutions",
  "website": "https://techinnovators.com",
  "location": "San Francisco, CA",
  "industry": "Technology",
  "icon": "💻"
}
```

**Tests Tab:**
```javascript
if (pm.response.code === 201) {
    const response = pm.response.json();
    pm.environment.set("companyId", response.id);
    console.log("Company ID:", response.id);
}
```

---

#### 2.2 View My Company

**Request:**
```
GET {{baseUrl}}/companies/my-company
```

**Headers:**
```
Authorization: Bearer {{accessToken}}
```

---

### Phase 3: Categories (Admin)

**⚠️ Important:** Login as ADMIN first!

#### 3.1 Create Categories

**Request:**
```
POST {{baseUrl}}/categories
```

**Headers:**
```
Authorization: Bearer {{accessToken}}
```

**Body (JSON) - Create multiple categories:**

**Software Development:**
```json
{
  "name": "Software Development",
  "description": "Jobs related to software development and engineering",
  "icon": "💻"
}
```

**Marketing:**
```json
{
  "name": "Marketing",
  "description": "Marketing and digital marketing positions",
  "icon": "📣"
}
```

**Design:**
```json
{
  "name": "Design",
  "description": "UI/UX, graphic design, and creative roles",
  "icon": "🎨"
}
```

**Tests Tab:**
```javascript
if (pm.response.code === 201) {
    const response = pm.response.json();
    pm.environment.set("categoryId", response.id);
    console.log("Category ID:", response.id);
}
```

---

#### 3.2 View All Categories (Public - No Auth)

**Request:**
```
GET {{baseUrl}}/categories
```

**No Headers Needed** (public endpoint)

---

### Phase 4: Job Postings (Employer)

**⚠️ Important:** Login as EMPLOYER!

#### 4.1 Create Job Posting

**Request:**
```
POST {{baseUrl}}/jobs
```

**Headers:**
```
Authorization: Bearer {{accessToken}}
```

**Body (JSON):**
```json
{
  "title": "Senior Full Stack Developer",
  "description": "We are looking for an experienced full stack developer to join our team. You will work on cutting-edge projects using modern technologies including Node.js, React, and PostgreSQL. This is a great opportunity to work with a talented team on exciting projects.",
  "requirements": [
    "5+ years of experience in full stack development",
    "Strong knowledge of Node.js and React",
    "Experience with PostgreSQL and database design",
    "Excellent problem-solving skills",
    "Strong communication skills"
  ],
  "location": "San Francisco, CA (Remote Available)",
  "jobType": "FULL_TIME",
  "experienceLevel": "SENIOR",
  "salaryMin": 100000,
  "salaryMax": 150000,
  "categoryId": "{{categoryId}}",
  "status": "ACTIVE"
}
```

**Tests Tab:**
```javascript
if (pm.response.code === 201) {
    const response = pm.response.json();
    pm.environment.set("jobId", response.id);
    console.log("Job ID:", response.id);
}
```

---

#### 4.2 Create More Jobs (Optional)

Create 2-3 more jobs with different data to have more content.

---

#### 4.3 View My Jobs

**Request:**
```
GET {{baseUrl}}/jobs/my-jobs?page=1&limit=10
```

**Headers:**
```
Authorization: Bearer {{accessToken}}
```

---

#### 4.4 Get Job Statistics

**Request:**
```
GET {{baseUrl}}/jobs/stats
```

**Headers:**
```
Authorization: Bearer {{accessToken}}
```

---

### Phase 5: Job Search (Public)

**No authentication needed for these!**

#### 5.1 Browse All Jobs

**Request:**
```
GET {{baseUrl}}/jobs?page=1&limit=10
```

---

#### 5.2 Search Jobs

**Request:**
```
GET {{baseUrl}}/jobs?search=developer&location=San Francisco&jobType=FULL_TIME&page=1&limit=10
```

---

#### 5.3 Filter by Category

**Request:**
```
GET {{baseUrl}}/categories/{{categoryId}}/jobs?page=1&limit=10
```

---

#### 5.4 View Job Details

**Request:**
```
GET {{baseUrl}}/jobs/{{jobId}}
```

---

### Phase 6: Job Applications (Job Seeker)

**⚠️ Important:** Login as JOB SEEKER!

#### 6.1 Upload Resume

**Request:**
```
POST {{baseUrl}}/applications/upload-resume
```

**Headers:**
```
Authorization: Bearer {{accessToken}}
```

**Body (form-data):**
- Key: `resume`
- Type: File
- Value: Select a PDF file from your computer

---

#### 6.2 Apply for Job

**Request:**
```
POST {{baseUrl}}/applications
```

**Headers:**
```
Authorization: Bearer {{accessToken}}
```

**Body (JSON):**
```json
{
  "jobId": "{{jobId}}",
  "coverLetter": "I am excited to apply for the Senior Full Stack Developer position. With over 5 years of experience in full stack development, I have worked extensively with Node.js, React, and PostgreSQL. I am confident that my skills and experience make me a great fit for this role."
}
```

**Tests Tab:**
```javascript
if (pm.response.code === 201) {
    const response = pm.response.json();
    pm.environment.set("applicationId", response.id);
    console.log("Application ID:", response.id);
}
```

---

#### 6.3 View My Applications

**Request:**
```
GET {{baseUrl}}/applications?page=1&limit=10
```

**Headers:**
```
Authorization: Bearer {{accessToken}}
```

---

#### 6.4 Get My Application Stats

**Request:**
```
GET {{baseUrl}}/applications/my-stats
```

**Headers:**
```
Authorization: Bearer {{accessToken}}
```

---

### Phase 7: Application Management (Employer)

**⚠️ Important:** Login as EMPLOYER!

#### 7.1 View Applications for My Jobs

**Request:**
```
GET {{baseUrl}}/applications?page=1&limit=10
```

**Headers:**
```
Authorization: Bearer {{accessToken}}
```

---

#### 7.2 View Application Details

**Request:**
```
GET {{baseUrl}}/applications/{{applicationId}}
```

**Headers:**
```
Authorization: Bearer {{accessToken}}
```

---

#### 7.3 Update Application Status

**Request:**
```
PATCH {{baseUrl}}/applications/{{applicationId}}/status
```

**Headers:**
```
Authorization: Bearer {{accessToken}}
```

**Body (JSON):**
```json
{
  "status": "REVIEWING"
}
```

Try different statuses: `REVIEWING`, `SHORTLISTED`, `ACCEPTED`, `REJECTED`

---

#### 7.4 Get Job Application Stats

**Request:**
```
GET {{baseUrl}}/applications/job/{{jobId}}/stats
```

**Headers:**
```
Authorization: Bearer {{accessToken}}
```

---

### Phase 8: Notifications (Admin)

**⚠️ Important:** Login as ADMIN!

#### 8.1 Send Test Email

**Request:**
```
POST {{baseUrl}}/notifications/test-email
```

**Headers:**
```
Authorization: Bearer {{accessToken}}
```

**Body (JSON):**
```json
{
  "email": "your-email@example.com"
}
```

---

#### 8.2 Get Queue Statistics

**Request:**
```
GET {{baseUrl}}/notifications/queue-stats
```

**Headers:**
```
Authorization: Bearer {{accessToken}}
```

---

#### 8.3 Send Custom Notification

**Request:**
```
POST {{baseUrl}}/notifications/custom
```

**Headers:**
```
Authorization: Bearer {{accessToken}}
```

**Body (JSON):**
```json
{
  "to": "user@example.com",
  "subject": "Important Update",
  "message": "This is a custom notification message."
}
```

---

## Quick Reference: Common Operations

### Setting Authorization Header

For ALL protected endpoints, add this header:
```
Key: Authorization
Value: Bearer {{accessToken}}
```

### Switching Users

1. Login as different user
2. The Tests script will automatically update `{{accessToken}}`
3. Continue testing with that user's permissions

### Checking Swagger Documentation

Visit: `http://localhost:3001/api`

This shows all endpoints with schemas and examples!

---

## Troubleshooting

### Error: "Unauthorized"
- Make sure you're logged in
- Check that `{{accessToken}}` is set in environment
- Token expires after 15 minutes - login again

### Error: "Forbidden"
- You're trying to access an endpoint your role doesn't allow
- Admin endpoints require ADMIN role
- Employer endpoints require EMPLOYER role
- Job Seeker endpoints require JOB_SEEKER role

### Error: "Not Found"
- Check that IDs in environment variables are set correctly
- Make sure you created the resource first (job, company, etc.)

### Database Connection Error
- Make sure PostgreSQL is running
- Check DATABASE_URL in .env file
- Run: `npx prisma db push`

### Redis Connection Error
- Make sure Redis is running
- Windows: Download Redis from https://github.com/microsoftarchive/redis/releases
- Or use Docker: `docker run -d -p 6379:6379 redis`

---

## Testing Checklist

### ✅ Basic Flow
- [ ] Register Job Seeker
- [ ] Register Employer
- [ ] Register Admin
- [ ] Login as each user
- [ ] Verify tokens are saved

### ✅ Company Flow
- [ ] Create company profile (Employer)
- [ ] Upload company logo
- [ ] View company details
- [ ] Update company info

### ✅ Category Flow
- [ ] Create categories (Admin)
- [ ] View all categories (Public)
- [ ] View popular categories

### ✅ Job Flow
- [ ] Create job posting (Employer)
- [ ] View public job listings
- [ ] Search and filter jobs
- [ ] View job details
- [ ] Update job status

### ✅ Application Flow
- [ ] Upload resume (Job Seeker)
- [ ] Apply for job
- [ ] View my applications
- [ ] Employer views applications
- [ ] Employer updates status
- [ ] Check email notifications

### ✅ Admin Flow
- [ ] View all users
- [ ] View all applications
- [ ] Manage categories
- [ ] Send test emails
- [ ] View queue stats

---

## Next Steps

1. **Export Collection**: Save all requests as Postman collection
2. **Share Collection**: Export and share with team
3. **Create Tests**: Add more automated tests
4. **Document Edge Cases**: Test error scenarios
5. **Performance Testing**: Test with more data

---

**Happy Testing! 🚀**
