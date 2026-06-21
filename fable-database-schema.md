# Fable Ebook Sharing Platform

## Database Schema Documentation

---

# Collections Overview

The application uses the following MongoDB collections:

1. users
2. ebooks
3. purchases
4. bookmarks
5. transactions

---

# 1. users Collection

Purpose:
Store all registered users including Readers, Writers, and Admins.

```js
{
  _id: ObjectId,

  name: String,
  email: String,
  password: String,

  photoURL: String,

  role: "user" | "writer" | "admin",

  isVerifiedWriter: Boolean,

  createdAt: Date,
  updatedAt: Date
}
```

Example:

```js
{
  name: "John Doe",
  email: "john@example.com",
  password: "hashed_password",
  photoURL: "https://...",
  role: "user",
  isVerifiedWriter: false,
  createdAt: new Date(),
  updatedAt: new Date()
}
```

---

# 2. ebooks Collection

Purpose:
Store all ebook information uploaded by writers.

```js
{
  _id: ObjectId,

  title: String,

  writerId: ObjectId,
  writerName: String,

  coverImage: String,

  genre: String,

  description: String,

  content: String,

  price: Number,

  status: "published" | "unpublished",

  totalSales: Number,

  createdAt: Date,
  updatedAt: Date
}
```

Example:

```js
{
  title: "The Lost Kingdom",
  writerId: ObjectId("123"),
  writerName: "Alice Smith",
  coverImage: "https://...",
  genre: "Fantasy",
  description: "Short preview...",
  content: "Full ebook content...",
  price: 15,
  status: "published",
  totalSales: 12,
  createdAt: new Date(),
  updatedAt: new Date()
}
```

---

# 3. purchases Collection

Purpose:
Track ebook purchases made by users.

```js
{
  _id: ObjectId,

  ebookId: ObjectId,

  buyerId: ObjectId,
  buyerEmail: String,

  writerId: ObjectId,

  amount: Number,

  transactionId: String,

  purchaseDate: Date
}
```

Example:

```js
{
  ebookId: ObjectId("123"),
  buyerId: ObjectId("456"),
  buyerEmail: "user@gmail.com",
  writerId: ObjectId("789"),
  amount: 20,
  transactionId: "pi_123456789",
  purchaseDate: new Date()
}
```

---

# 4. bookmarks Collection

Purpose:
Store ebooks bookmarked by users.

```js
{
  _id: ObjectId,

  userId: ObjectId,

  ebookId: ObjectId,

  createdAt: Date
}
```

Example:

```js
{
  userId: ObjectId("111"),
  ebookId: ObjectId("222"),
  createdAt: new Date()
}
```

---

# 5. transactions Collection

Purpose:
Store all financial transactions.

```js
{
  _id: ObjectId,

  userEmail: String,

  amount: Number,

  type: "purchase" | "writer_verification",

  transactionId: String,

  status: "pending" | "paid",

  createdAt: Date
}
```

Example:

```js
{
  userEmail: "user@gmail.com",
  amount: 25,
  type: "purchase",
  transactionId: "txn_123456",
  status: "paid",
  createdAt: new Date()
}
```

---

# Relationships

users (1) -------- (Many) ebooks

users (1) -------- (Many) purchases

ebooks (1) ------- (Many) purchases

users (1) -------- (Many) bookmarks

ebooks (1) ------- (Many) bookmarks

users (1) -------- (Many) transactions

---

# Roles

Admin:

* Manage Users
* Manage Ebooks
* Manage Transactions
* View Analytics

Writer:

* Add Ebook
* Edit Ebook
* Delete Ebook
* Publish/Unpublish Ebook
* View Sales History

User:

* Browse Ebook
* Purchase Ebook
* Bookmark Ebook
* View Purchase History

---

# Database Name

fableDB

---

# MongoDB Collections

users

ebooks

purchases

bookmarks

transactions