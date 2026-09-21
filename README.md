# College Communication & Student Support Portal

A complete, production-ready college ERP-style chat and student care grievance portal built from scratch using the MERN stack with Socket.IO real-time channels and strict RBAC authorization controls.

---

## 1. MONGODB ATLAS DATABASE SETUP

Follow these steps to configure your MongoDB Atlas cluster:

### Step 1: Create a MongoDB Atlas Cluster
1. Sign up/Log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Click **Create** to deploy a new database.
3. Select **M0 Shared Free Tier** (or higher depending on your deployment requirements).
4. Select your preferred Cloud Provider (e.g., AWS) and Region closest to your users.
5. Click **Create Deployment**.

### Step 2: Create a Database User
1. Navigate to **Database Access** under the Security section in the left sidebar.
2. Click **Add New Database User**.
3. Select authentication method **Password**.
4. Enter a Username (e.g., `college_admin`) and a secure Password.
5. Under **Database User Privileges**, select **Read and write to any database** (or restrict to your specific database).
6. Click **Add User**.

### Step 3: Configure Network Access (IP Whitelisting)
1. Navigate to **Network Access** under the Security section in the left sidebar.
2. Click **Add IP Address**.
3. To allow access from anywhere (e.g., dynamic server IPs or local testing), click **Allow Access From Anywhere** (adds `0.0.0.0/0`). For maximum security in production, add only your server's static IP address.
4. Click **Confirm** and wait for the status to become active.

### Step 4: Retrieve Connection String
1. Go back to the **Database Clusters** screen.
2. Click **Connect** next to your cluster.
3. Select **Drivers** (under "Connect to your application").
4. Copy the connection string. It will look like:
   `mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/?retryWrites=true&w=majority`
5. Replace `<username>` and `<password>` with the database credentials created in Step 2. Keep this URI confidential.

---

## 2. PROJECT INSTALLATION & EXECUTION

### Step 1: Clone or Copy Workspace
Ensure you have Node.js (version 18+ recommended) and npm installed.

### Step 2: Configure Environment Variables
Inside the `server/` folder, create a `.env` file from the template:

```bash
# In server/ folder
cp .env.example .env
```

Edit the `.env` file and replace the placeholders:
* Set `MONGO_URI` to your MongoDB Atlas connection string (obtained in Step 4 above).
* Set `JWT_SECRET` to a long random security phrase.
* For **Cloudinary** integration, specify `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`. If left as `mock_cloudinary`, the application will simulate attachment uploads using secure placeholder resources, allowing you to test file workflows immediately.

### Step 3: Run Database Seeding Script
Populate your MongoDB Atlas cluster with realistic test accounts (1 Admin, 5 Faculty, 2 Care Officers, 10 Students, 5 Departments, and academic and ticket messages):

```bash
cd server
npm run seed
```

*Note: The script outputs one-click logins for all seeded accounts.*

### Step 4: Run Backend Development Server
From the `server/` directory:

```bash
# Install dependencies (if not already done)
npm install

# Start Express & Socket.IO server
npm run dev
```
The server will boot up on port `5000` (by default) and output connection logs.

### Step 5: Run Frontend Client
Open a new terminal session, navigate to the `client/` directory, and launch the Vite development server:

```bash
cd client
# Install dependencies
npm install --legacy-peer-deps

# Start Vite React app
npm run dev
```
The client will run on `http://localhost:5173`. Open this URL in your web browser.

---

## 3. USER ROLES & CREDENTIALS

Log in using the following seeded testing credentials (all passwords default to `password123`):

1. **Student Account (Academic Chat & Care grievance)**
   * Email: `student1@college.edu`
   * Role: `STUDENT`
2. **Faculty Account (Academic inquiries resolution)**
   * Email: `alan@college.edu`
   * Role: `FACULTY`
3. **Student Care Officer Account (Complaints triage & chat)**
   * Email: `officer1@college.edu`
   * Role: `STUDENT_CARE_OFFICER`
4. **Admin Account (User CRUD, Audit trails)**
   * Email: `admin@college.edu`
   * Role: `ADMIN`

---

## 4. PRODUCTION DEPLOYMENT

### Backend Deployment (e.g., Render, Heroku)
1. Set the environment variable `NODE_ENV` to `production`.
2. Configure all secret values (`MONGO_URI`, `JWT_SECRET`, etc.) inside your hosting provider's environment settings.
3. Configure `CLIENT_URL` to point to the address of your hosted React application.
4. Execute `npm start` in the `server` directory to launch the server listener.

### Frontend Deployment (e.g., Vercel, Netlify)
1. Run `npm run build` in the `client` directory to compile optimized bundles in the `dist/` folder.
2. Deploy the static contents of the `dist/` directory.
3. Set the environment variable `VITE_API_URL` to point to your hosted backend API URL (e.g., `https://api.yourcollege.com/api`).
4. Set `VITE_SOCKET_URL` to point to your hosted socket domain (e.g., `https://api.yourcollege.com`).
