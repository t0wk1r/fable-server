# Fable Server API

## 🚀 Project Overview

**Fable Server API** is the backend service that powers the Fable Ebook Marketplace Platform. It provides secure authentication, ebook management, purchase processing, user management, and API endpoints for the frontend application.

The server is designed using modern REST API principles and supports role-based access control for Admins, Writers, and Readers.

---

## 🌐 Live API URL

**Production API:**

```text
https://fable-client-blond.vercel.app
```

---

## 🎯 Purpose

The purpose of this backend application is to:

* Manage users and authentication
* Store and serve ebook data
* Handle ebook purchases
* Manage writer and admin operations
* Secure API access using authentication middleware
* Support Google Authentication
* Provide scalable REST APIs for frontend applications

---

## ✨ Core Features

### 🔐 Authentication & Authorization

* Better Auth Integration
* Google OAuth Login
* User Registration
* User Login
* Session Management
* Role-Based Access Control
* Protected Routes

---

### 👤 User Management

* Create User Account
* Login & Logout
* User Profile Management
* Role Management
* Reader, Writer, Admin Support

---

### 📚 Ebook Management

* Create Ebook
* Update Ebook
* Delete Ebook
* Get All Ebooks
* Get Single Ebook
* Upload Ebook Cover
* Upload Ebook File
* Ebook Ownership Validation

---

### 🛒 Purchase Management

* Purchase Ebook
* Verify Purchase
* Prevent Duplicate Purchases
* Purchased Ebook Library
* User Purchase History

---

### ✍️ Writer Features

* Publish New Ebook
* Update Published Ebook
* Delete Ebook
* View Own Ebooks
* Manage Content

---

### 🛠️ Admin Features

* Manage Users
* Manage Writers
* Manage Ebooks
* View Platform Statistics
* Moderate Content

---

## 🏗️ Technology Stack

### Backend Framework

```text
Node.js
Express.js
TypeScript
```

### Database

```text
MongoDB
Mongoose
```

### Authentication

```text
Better Auth
Google OAuth
```

### Security

```text
JWT / Session Authentication
CORS
Cookie Parser
Environment Variables
```

### File Upload

```text
Multer
Cloudinary / Local Storage
```

---

## 📦 NPM Packages Used

### Core Dependencies

```bash
express
typescript
dotenv
cors
cookie-parser
```

### Database

```bash
mongoose
mongodb
```

### Authentication

```bash
better-auth
```

### File Upload

```bash
multer
```

### Validation

```bash
zod
```

### Utilities

```bash
nodemon
ts-node-dev
```

---

## 📁 Project Structure

```text
src/
│
├── config/
├── controllers/
├── middlewares/
├── models/
├── routes/
├── services/
├── utils/
├── validations/
│
├── app.ts
└── server.ts
```

---

## 🔗 API Endpoints

### Authentication

```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/session
```

### Ebooks

```http
GET    /api/ebooks
GET    /api/ebooks/:id
POST   /api/ebooks
PATCH  /api/ebooks/:id
DELETE /api/ebooks/:id
```

### Purchases

```http
POST /api/purchases
GET  /api/purchases/my-purchases
```

### Users

```http
GET    /api/users
GET    /api/users/:id
PATCH  /api/users/:id
DELETE /api/users/:id
```

---

## ⚙️ Environment Variables

Create a `.env` file in the root directory:

```env
PORT=5000

DATABASE_URL=your_mongodb_connection_string

BETTER_AUTH_SECRET=your_secret_key
BETTER_AUTH_URL=http://localhost:5000

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

CLIENT_URL=http://localhost:3000
```

---

## 🚀 Installation

### Clone Repository

```bash
git clone <repository-url>
cd fable-server
```

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

### Build Project

```bash
npm run build
```

### Start Production Server

```bash
npm start
```

---

## 📊 User Roles

| Role   | Permissions            |
| ------ | ---------------------- |
| Admin  | Full Access            |
| Writer | Manage Own Ebooks      |
| Reader | Purchase & Read Ebooks |

---

## 🔒 Security Features

* Environment Variable Protection
* Secure Authentication
* Protected API Routes
* Role-Based Authorization
* Input Validation
* CORS Protection
* Secure Cookies

---

## 🔮 Future Enhancements

* Payment Gateway Integration
* Ebook Ratings & Reviews
* Author Profiles
* Reading Analytics
* Subscription Plans
* Email Notifications
* Ebook Recommendations
* Admin Reporting Dashboard

---

## 👨‍💻 Developer

**Md Abu Sayed**
Full Stack Web Developer

---

## 📄 License

This project is developed for educational, portfolio, and commercial use.

**© Fable Ebook Marketplace Platform. All Rights Reserved.**
