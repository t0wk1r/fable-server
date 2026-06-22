require("dotenv").config();
const { auth } = require("./auth");
const { toNodeHandler } = require("better-auth/node");

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const bcrypt = require("bcrypt");
//const Stripe = require("stripe");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);


require("dotenv").config();

const verifyToken = require("./middleware/verifyToken");
const verifyAdmin = require("./middleware/verifyAdmin");
const verifyWriter = require("./middleware/verifyWriter");

const app = express();
const port = process.env.PORT || 5000;


const allowedOrigins = [
    "http://localhost:3000",
    process.env.CLIENT_URL,
].filter(Boolean);

app.use(
    cors({
        origin: allowedOrigins,
        credentials: true,
    })
);

app.use(express.json());
app.all(/^\/api\/auth\/.*$/, toNodeHandler(auth));



const client = new MongoClient(process.env.MONGODB_URI, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

app.get("/", (req, res) => {
    res.send("Fable Server Running with MongoDB");
});

async function run() {
    try {
        await client.connect();

        const db = client.db(process.env.DB_NAME);
        const usersCollection = db.collection("users");
        const ebooksCollection = db.collection("ebooks");
        const bookmarksCollection = db.collection("bookmarks");
        const purchasesCollection = db.collection("purchases");
        const transactionsCollection = db.collection("transactions");
        const writerPaymentsCollection = db.collection("writerPayments");

        app.get("/test-users", async (req, res) => {
            const users = await usersCollection.find().toArray();
            res.send(users);
        });

        app.post("/jwt", async (req, res) => {
            const user = req.body;

            const token = jwt.sign(user, process.env.JWT_SECRET, {
                expiresIn: "7d",
            });

            res.send({ token });
        });

        app.post("/users", async (req, res) => {
            const user = req.body;

            const existingUser = await usersCollection.findOne({
                email: user.email,
            });

            if (existingUser) {
                return res.status(409).send({
                    success: false,
                    message: "Email already exists",
                });
            }

            const hashedPassword = await bcrypt.hash(user.password, 10);

            const newUser = {
                name: user.name,
                email: user.email,
                password: hashedPassword,
                photoURL: user.photoURL || "",
                role: user.role || "user",
                isVerifiedWriter: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const result = await usersCollection.insertOne(newUser);

            res.send({
                success: true,
                message: "User registered successfully",
                insertedId: result.insertedId,
            });
        });

        app.post("/login", async (req, res) => {
            const { email, password } = req.body;

            const user = await usersCollection.findOne({ email });

            if (!user) {
                return res.status(404).send({
                    success: false,
                    message: "User not found",
                });
            }

            const isPasswordMatched = await bcrypt.compare(password, user.password);

            if (!isPasswordMatched) {
                return res.status(401).send({
                    success: false,
                    message: "Invalid password",
                });
            }

            const token = jwt.sign(
                {
                    email: user.email,
                    role: user.role,
                    id: user._id,
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: "7d",
                }
            );

            res.send({
                success: true,
                message: "Login successful",
                token,
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    photoURL: user.photoURL,
                    role: user.role,
                    isVerifiedWriter: user.isVerifiedWriter,
                },
            });
        });


        // google login 
        app.post("/google-login", async (req, res) => {
            const { name, email, photoURL } = req.body;

            if (!email) {
                return res.status(400).send({
                    success: false,
                    message: "Email is required",
                });
            }

            let user = await usersCollection.findOne({ email });

            if (!user) {
                const newUser = {
                    name: name || "Google User",
                    email,
                    photoURL: photoURL || "",
                    role: "user",
                    provider: "google",
                    isVerifiedWriter: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };

                const result = await usersCollection.insertOne(newUser);

                user = {
                    _id: result.insertedId,
                    ...newUser,
                };
            }

            const token = jwt.sign(
                {
                    email: user.email,
                    role: user.role,
                    id: user._id,
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: "7d",
                }
            );

            res.send({
                success: true,
                message: "Google login successful",
                token,
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    photoURL: user.photoURL,
                    role: user.role,
                    isVerifiedWriter: user.isVerifiedWriter,
                },
            });
        });

        app.get("/private", verifyToken, async (req, res) => {
            res.send({
                success: true,
                message: "Private Route Access Granted",
                user: req.decoded,
            });
        });

        app.get("/admin-only", verifyToken, verifyAdmin, async (req, res) => {
            res.send({
                success: true,
                message: "Welcome Admin",
            });
        });

        app.get("/writer-only", verifyToken, verifyWriter, async (req, res) => {
            res.send({
                success: true,
                message: "Welcome Writer",
            });
        });

        app.post("/ebooks", verifyToken, verifyWriter, async (req, res) => {
            const ebook = req.body;

            const writer = await usersCollection.findOne({
                email: req.decoded.email,
            });

            if (!writer?.isVerifiedWriter) {
                return res.status(403).send({
                    success: false,
                    message: "Please complete writer verification payment first",
                });
            }

            const newEbook = {
                title: ebook.title,
                writerId: req.decoded.id,
                writerName: ebook.writerName,
                coverImage: ebook.coverImage,
                genre: ebook.genre,
                description: ebook.description,
                content: ebook.content,
                price: Number(ebook.price),
                //status: "published",
                status: ebook.status || "published",
                totalSales: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const result = await ebooksCollection.insertOne(newEbook);

            res.send({
                success: true,
                message: "Ebook added successfully",
                insertedId: result.insertedId,
            });
        });


        // Get Writer Own Ebooks
        app.get("/my-ebooks", verifyToken, verifyWriter, async (req, res) => {
            const writerId = req.decoded.id;

            const ebooks = await ebooksCollection
                .find({ writerId: writerId })
                .sort({ createdAt: -1 })
                .toArray();

            res.send({
                success: true,
                data: ebooks,
            });
        });

        // Update Writer Own Ebook
        app.patch("/ebooks/:id", verifyToken, verifyWriter, async (req, res) => {
            const id = req.params.id;
            const updateData = req.body;

            if (!ObjectId.isValid(id)) {
                return res.status(400).send({
                    success: false,
                    message: "Invalid ebook ID",
                });
            }

            const filter = {
                _id: new ObjectId(id),
                writerId: req.decoded.id,
            };

            const updatedDoc = {
                $set: {
                    title: updateData.title,
                    writerName: updateData.writerName,
                    coverImage: updateData.coverImage,
                    genre: updateData.genre,
                    description: updateData.description,
                    content: updateData.content,
                    price: Number(updateData.price),
                    status: updateData.status,
                    updatedAt: new Date(),
                },
            };

            const result = await ebooksCollection.updateOne(filter, updatedDoc);

            res.send({
                success: true,
                message: "Ebook updated successfully",
                modifiedCount: result.modifiedCount,
            });
        });

        // Add Bookmark
        app.post("/bookmarks", verifyToken, async (req, res) => {
            const { ebookId } = req.body;

            if (!ObjectId.isValid(ebookId)) {
                return res.status(400).send({
                    success: false,
                    message: "Invalid ebook ID",
                });
            }

            const ebook = await ebooksCollection.findOne({
                _id: new ObjectId(ebookId),
                status: "published",
            });

            if (!ebook) {
                return res.status(404).send({
                    success: false,
                    message: "Ebook not found or unpublished",
                });
            }

            const existingBookmark = await bookmarksCollection.findOne({
                ebookId,
                userEmail: req.decoded.email,
            });

            if (existingBookmark) {
                return res.status(409).send({
                    success: false,
                    message: "Already bookmarked",
                });
            }

            const bookmark = {
                ebookId,
                userEmail: req.decoded.email,
                createdAt: new Date(),
            };

            const result = await bookmarksCollection.insertOne(bookmark);

            res.send({
                success: true,
                message: "Bookmark added successfully",
                insertedId: result.insertedId,
            });
        });

        // Check Bookmark Status
        app.get("/bookmarks/check/:ebookId", verifyToken, async (req, res) => {
            const { ebookId } = req.params;

            const bookmark = await bookmarksCollection.findOne({
                ebookId,
                userEmail: req.decoded.email,
            });

            res.send({
                success: true,
                bookmarked: !!bookmark,
            });
        });

        // Get My Bookmarks
        app.get("/bookmarks", verifyToken, async (req, res) => {
            const bookmarks = await bookmarksCollection
                .find({
                    userEmail: req.decoded.email,
                })
                .sort({ createdAt: -1 })
                .toArray();

            const ebookIds = bookmarks
                .filter((bookmark) => ObjectId.isValid(bookmark.ebookId))
                .map((bookmark) => new ObjectId(bookmark.ebookId));

            const ebooks = await ebooksCollection
                .find({
                    _id: { $in: ebookIds },
                    status: "published",
                })
                .toArray();

            const data = bookmarks
                .map((bookmark) => {
                    const ebook = ebooks.find(
                        (item) => item._id.toString() === bookmark.ebookId
                    );

                    if (!ebook) return null;

                    return {
                        _id: bookmark._id,
                        ebookId: ebook._id.toString(),
                        title: ebook.title,
                        writerName: ebook.writerName,
                        coverImage: ebook.coverImage,
                        genre: ebook.genre,
                        price: ebook.price,
                    };
                })
                .filter(Boolean);

            res.send({
                success: true,
                data,
            });
        });

        // Remove Bookmark
        app.delete("/bookmarks/:ebookId", verifyToken, async (req, res) => {
            const ebookId = req.params.ebookId;

            const result = await bookmarksCollection.deleteOne({
                ebookId,
                userEmail: req.decoded.email,
            });

            res.send({
                success: true,
                message: "Bookmark removed successfully",
                deletedCount: result.deletedCount,
            });
        });

        // Purchase Ebook Manually
        app.post("/purchases", verifyToken, async (req, res) => {
            const { ebookId } = req.body;

            if (!ObjectId.isValid(ebookId)) {
                return res.status(400).send({
                    success: false,
                    message: "Invalid ebook ID",
                });
            }

            const ebook = await ebooksCollection.findOne({
                _id: new ObjectId(ebookId),
            });

            if (!ebook) {
                return res.status(404).send({
                    success: false,
                    message: "Ebook not found",
                });
            }

            if (ebook.writerId === req.decoded.id) {
                return res.status(403).send({
                    success: false,
                    message: "You cannot purchase your own ebook",
                });
            }

            const existingPurchase = await purchasesCollection.findOne({
                ebookId,
                buyerEmail: req.decoded.email,
            });

            if (existingPurchase) {
                return res.status(409).send({
                    success: false,
                    message: "Already purchased",
                });
            }

            const buyer = await usersCollection.findOne({
                email: req.decoded.email,
            });

            const purchase = {
                ebookId,
                ebookTitle: ebook.title,
                writerId: ebook.writerId,
                writerName: ebook.writerName,

                buyerId: buyer?._id?.toString(),
                buyerName: buyer?.name || req.decoded.email,
                buyerEmail: req.decoded.email,

                amount: ebook.price,
                status: "paid",
                purchaseDate: new Date(),
            };

            const result = await purchasesCollection.insertOne(purchase);

            await transactionsCollection.insertOne({
                type: "ebook_purchase",
                ebookId,
                ebookTitle: ebook.title,
                buyerEmail: req.decoded.email,
                writerId: ebook.writerId,
                writerName: ebook.writerName,
                amount: ebook.price,
                status: "paid",
                createdAt: new Date(),
            });

            await ebooksCollection.updateOne(
                { _id: new ObjectId(ebookId) },
                {
                    $inc: {
                        totalSales: 1,
                    },
                    $set: {
                        updatedAt: new Date(),
                    },
                }
            );

            res.send({
                success: true,
                message: "Ebook purchased successfully",
                insertedId: result.insertedId,
            });
        });


        // My Purchase History
        app.get("/my-purchases", verifyToken, async (req, res) => {
            const purchases = await purchasesCollection
                .aggregate([
                    {
                        $match: {
                            buyerEmail: req.decoded.email,
                        },
                    },
                    {
                        $addFields: {
                            ebookObjectId: {
                                $toObjectId: "$ebookId",
                            },
                        },
                    },
                    {
                        $lookup: {
                            from: "ebooks",
                            localField: "ebookObjectId",
                            foreignField: "_id",
                            as: "ebook",
                        },
                    },
                    {
                        $unwind: {
                            path: "$ebook",
                            preserveNullAndEmptyArrays: true,
                        },
                    },
                    {
                        $addFields: {
                            writerName: {
                                $ifNull: ["$writerName", "$ebook.writerName"],
                            },
                            coverImage: "$ebook.coverImage",
                        },
                    },
                    {
                        $project: {
                            ebook: 0,
                            ebookObjectId: 0,
                        },
                    },
                    {
                        $sort: {
                            purchaseDate: -1,
                        },
                    },
                ])
                .toArray();

            res.send({
                success: true,
                data: purchases,
            });
        });


        // Purchased Ebook Details
        app.get("/purchased-ebook/:id", verifyToken, async (req, res) => {
            const ebookId = req.params.id;

            if (!ObjectId.isValid(ebookId)) {
                return res.status(400).send({
                    success: false,
                    message: "Invalid ebook ID",
                });
            }

            const purchase = await purchasesCollection.findOne({
                ebookId,
                buyerEmail: req.decoded.email,
            });

            if (!purchase) {
                return res.status(403).send({
                    success: false,
                    message: "You have not purchased this ebook",
                });
            }

            const ebook = await ebooksCollection.findOne({
                _id: new ObjectId(ebookId),
            });

            res.send({
                success: true,
                data: ebook,
            });
        });

        // Writer Sales History
        app.get("/writer-sales", verifyToken, verifyWriter, async (req, res) => {
            const sales = await purchasesCollection
                .find({
                    writerId: req.decoded.id,
                })
                .sort({ purchaseDate: -1 })
                .toArray();

            res.send({
                success: true,
                data: sales,
            });
        });

        // Admin Get All Users
        app.get("/admin/users", verifyToken, verifyAdmin, async (req, res) => {
            const users = await usersCollection
                .find()
                .project({ password: 0 })
                .sort({ createdAt: -1 })
                .toArray();

            res.send({
                success: true,
                data: users,
            });
        });

        // Admin Change User Role
        app.patch("/admin/users/role/:id", verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const { role } = req.body;

            if (!ObjectId.isValid(id)) {
                return res.status(400).send({
                    success: false,
                    message: "Invalid user ID",
                });
            }

            if (!["user", "writer", "admin"].includes(role)) {
                return res.status(400).send({
                    success: false,
                    message: "Invalid role",
                });
            }

            const result = await usersCollection.updateOne(
                { _id: new ObjectId(id) },
                {
                    $set: {
                        role,
                        updatedAt: new Date(),
                    },
                }
            );

            res.send({
                success: true,
                message: "User role updated successfully",
                modifiedCount: result.modifiedCount,
            });
        });

        // Admin Delete User
        app.delete("/admin/users/:id", verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;

            if (!ObjectId.isValid(id)) {
                return res.status(400).send({
                    success: false,
                    message: "Invalid user ID",
                });
            }

            const result = await usersCollection.deleteOne({
                _id: new ObjectId(id),
            });

            res.send({
                success: true,
                message: "User deleted successfully",
                deletedCount: result.deletedCount,
            });
        });

        // Admin Get All Ebooks
        app.get("/admin/ebooks", verifyToken, verifyAdmin, async (req, res) => {
            const ebooks = await ebooksCollection
                .find()
                .sort({ createdAt: -1 })
                .toArray();

            res.send({
                success: true,
                data: ebooks,
            });
        });

        // Admin Change Ebook Status
        app.patch("/admin/ebooks/status/:id", verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const { status } = req.body;

            if (!ObjectId.isValid(id)) {
                return res.status(400).send({
                    success: false,
                    message: "Invalid ebook ID",
                });
            }

            if (!["published", "unpublished"].includes(status)) {
                return res.status(400).send({
                    success: false,
                    message: "Invalid status",
                });
            }

            const result = await ebooksCollection.updateOne(
                { _id: new ObjectId(id) },
                {
                    $set: {
                        status,
                        updatedAt: new Date(),
                    },
                }
            );

            res.send({
                success: true,
                message: "Ebook status updated successfully",
                modifiedCount: result.modifiedCount,
            });
        });

        // Admin Delete Any Ebook
        app.delete("/admin/ebooks/:id", verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;

            if (!ObjectId.isValid(id)) {
                return res.status(400).send({
                    success: false,
                    message: "Invalid ebook ID",
                });
            }

            const result = await ebooksCollection.deleteOne({
                _id: new ObjectId(id),
            });

            res.send({
                success: true,
                message: "Ebook deleted successfully",
                deletedCount: result.deletedCount,
            });
        });


        // Admin Get All Transactions
        app.get("/admin/transactions", verifyToken, verifyAdmin, async (req, res) => {
            const transactions = await transactionsCollection
                .find()
                .sort({ createdAt: -1 })
                .toArray();

            res.send({
                success: true,
                data: transactions,
            });
        });


        // Admin Analytics
        app.get("/admin/analytics", verifyToken, verifyAdmin, async (req, res) => {
            const totalUsers = await usersCollection.countDocuments({
                role: "user",
            });

            const totalWriters = await usersCollection.countDocuments({
                role: "writer",
            });

            const totalEbooks = await ebooksCollection.countDocuments();

            const totalSold = await purchasesCollection.countDocuments();

            const transactions = await transactionsCollection.find().toArray();

            const totalRevenue = transactions.reduce(
                (sum, item) => sum + Number(item.amount || 0),
                0
            );

            const monthlySales = await transactionsCollection
                .aggregate([
                    {
                        $match: {
                            status: "paid",
                        },
                    },
                    {
                        $group: {
                            _id: {
                                year: { $year: "$createdAt" },
                                month: { $month: "$createdAt" },
                            },
                            sales: { $sum: 1 },
                            revenue: { $sum: "$amount" },
                        },
                    },
                    {
                        $sort: {
                            "_id.year": 1,
                            "_id.month": 1,
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            month: {
                                $concat: [
                                    { $toString: "$_id.month" },
                                    "/",
                                    { $toString: "$_id.year" },
                                ],
                            },
                            sales: 1,
                            revenue: 1,
                        },
                    },
                ])
                .toArray();

            const ebooksByGenre = await ebooksCollection
                .aggregate([
                    {
                        $group: {
                            _id: "$genre",
                            count: { $sum: 1 },
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            genre: "$_id",
                            count: 1,
                        },
                    },
                    {
                        $sort: {
                            count: -1,
                        },
                    },
                ])
                .toArray();

            res.send({
                success: true,
                data: {
                    totalUsers,
                    totalWriters,
                    totalEbooks,
                    totalSold,
                    totalRevenue,
                    monthlySales,
                    ebooksByGenre,
                },
            });
        });

        // Top Writers
        app.get("/top-writers", async (req, res) => {
            const writers = await ebooksCollection
                .aggregate([
                    {
                        $group: {
                            _id: "$writerId",
                            writerName: { $first: "$writerName" },
                            totalSales: {
                                $sum: "$totalSales",
                            },
                        },
                    },
                    {
                        $sort: {
                            totalSales: -1,
                        },
                    },
                    {
                        $limit: 3,
                    },
                ])
                .toArray();

            res.send({
                success: true,
                data: writers,
            });
        });


        // Writer Verification Payment Manual
        app.post("/writer-verification", verifyToken, verifyWriter, async (req, res) => {
            const amount = 20;

            const existingPayment = await writerPaymentsCollection.findOne({
                writerEmail: req.decoded.email,
                status: "paid",
            });

            if (existingPayment) {
                return res.status(409).send({
                    success: false,
                    message: "Writer already verified",
                });
            }

            const payment = {
                writerId: req.decoded.id,
                writerEmail: req.decoded.email,
                amount,
                status: "paid",
                createdAt: new Date(),
            };

            const result = await writerPaymentsCollection.insertOne(payment);

            await usersCollection.updateOne(
                { email: req.decoded.email },
                {
                    $set: {
                        isVerifiedWriter: true,
                        updatedAt: new Date(),
                    },
                }
            );

            await transactionsCollection.insertOne({
                type: "writer_verification",
                userEmail: req.decoded.email,
                amount,
                status: "paid",
                createdAt: new Date(),
            });

            res.send({
                success: true,
                message: "Writer verified successfully",
                insertedId: result.insertedId,
            });
        });

        // Get Current Logged In User
        app.get("/me", verifyToken, async (req, res) => {
            const user = await usersCollection.findOne(
                { email: req.decoded.email },
                { projection: { password: 0 } }
            );

            if (!user) {
                return res.status(404).send({
                    success: false,
                    message: "User not found",
                });
            }

            res.send({
                success: true,
                data: user,
            });
        });

        // Delete Writer Own Ebook
        app.delete("/ebooks/:id", verifyToken, verifyWriter, async (req, res) => {
            const id = req.params.id;

            if (!ObjectId.isValid(id)) {
                return res.status(400).send({
                    success: false,
                    message: "Invalid ebook ID",
                });
            }

            const filter = {
                _id: new ObjectId(id),
                writerId: req.decoded.id,
            };

            const result = await ebooksCollection.deleteOne(filter);

            res.send({
                success: true,
                message: "Ebook deleted successfully",
                deletedCount: result.deletedCount,
            });
        });

        // Publish / Unpublish Writer Own Ebook
        app.patch("/ebooks/status/:id", verifyToken, verifyWriter, async (req, res) => {
            const id = req.params.id;
            const { status } = req.body;

            if (!ObjectId.isValid(id)) {
                return res.status(400).send({
                    success: false,
                    message: "Invalid ebook ID",
                });
            }

            if (!["published", "unpublished"].includes(status)) {
                return res.status(400).send({
                    success: false,
                    message: "Invalid status",
                });
            }

            const filter = {
                _id: new ObjectId(id),
                writerId: req.decoded.id,
            };

            const result = await ebooksCollection.updateOne(filter, {
                $set: {
                    status,
                    updatedAt: new Date(),
                },
            });

            res.send({
                success: true,
                message: "Ebook status updated successfully",
                modifiedCount: result.modifiedCount,
            });
        });

        // Get All Published Ebooks with Search, Filter, Sort
        app.get("/ebooks", async (req, res) => {
            const {
                search,
                genre,
                minPrice,
                maxPrice,
                sort,
                page = 1,
                limit = 8,
            } = req.query;

            const query = {
                status: "published",
            };

            if (search) {
                query.$or = [
                    { title: { $regex: search, $options: "i" } },
                    { writerName: { $regex: search, $options: "i" } },
                ];
            }

            if (genre) {
                query.genre = genre;
            }

            if (minPrice || maxPrice) {
                query.price = {};


                if (minPrice) query.price.$gte = Number(minPrice);
                if (maxPrice) query.price.$lte = Number(maxPrice);


            }

            let sortOption = { createdAt: -1 };

            if (sort === "price-low-high") {
                sortOption = { price: 1 };
            }

            if (sort === "price-high-low") {
                sortOption = { price: -1 };
            }

            const currentPage = Number(page);
            const perPage = Number(limit);
            const skip = (currentPage - 1) * perPage;

            const total = await ebooksCollection.countDocuments(query);

            const ebooks = await ebooksCollection
                .find(query)
                .sort(sortOption)
                .skip(skip)
                .limit(perPage)
                .toArray();

            res.send({
                success: true,
                data: ebooks,
                pagination: {
                    total,
                    page: currentPage,
                    limit: perPage,
                    totalPages: Math.ceil(total / perPage),
                },
            });
        });


        // Get Single Ebook By ID
        app.get("/ebooks/:id", async (req, res) => {
            const id = req.params.id;

            if (!ObjectId.isValid(id)) {
                return res.status(400).send({
                    success: false,
                    message: "Invalid ebook ID",
                });
            }

            const ebook = await ebooksCollection.findOne({
                _id: new ObjectId(id),
            });

            if (!ebook) {
                return res.status(404).send({
                    success: false,
                    message: "Ebook not found",
                });
            }

            res.send({
                success: true,
                data: ebook,
            });
        });



        // Writer verification checkout
        app.post("/create-writer-verification-session", verifyToken, async (req, res) => {
            try {
                if (!process.env.STRIPE_SECRET_KEY) {
                    return res.status(500).send({
                        success: false,
                        message: "STRIPE_SECRET_KEY missing",
                    });
                }

                if (!process.env.CLIENT_URL) {
                    return res.status(500).send({
                        success: false,
                        message: "CLIENT_URL missing",
                    });
                }

                const existingPayment = await writerPaymentsCollection.findOne({
                    writerEmail: req.decoded.email,
                    status: "paid",
                });

                if (existingPayment) {
                    return res.status(409).send({
                        success: false,
                        message: "Writer already verified",
                    });
                }

                const session = await stripe.checkout.sessions.create({
                    payment_method_types: ["card"],
                    mode: "payment",
                    customer_email: req.decoded.email,
                    line_items: [
                        {
                            price_data: {
                                currency: "usd",
                                product_data: {
                                    name: "Fable Writer Verification",
                                },
                                unit_amount: 500,
                            },
                            quantity: 1,
                        },
                    ],
                    success_url: `${process.env.CLIENT_URL}/dashboard/writer/payment-success?session_id={CHECKOUT_SESSION_ID}`,
                    cancel_url: `${process.env.CLIENT_URL}/dashboard/writer/add-ebook`,
                    metadata: {
                        email: req.decoded.email,
                        type: "writer_verification",
                    },
                });

                res.send({
                    success: true,
                    url: session.url,
                });
            } catch (error) {
                console.log("Stripe session error:", error.message);

                res.status(400).send({
                    success: false,
                    message: error.message,
                });
            }
        });


        // Payment Success
        app.get("/writer-payment-success", verifyToken, async (req, res) => {
            try {
                const { session_id } = req.query;

                if (!session_id) {
                    return res.status(400).send({
                        success: false,
                        message: "Session ID missing",
                    });
                }

                const session = await stripe.checkout.sessions.retrieve(session_id);

                if (session.payment_status !== "paid") {
                    return res.status(400).send({
                        success: false,
                        message: "Payment not completed",
                    });
                }

                const email = session.metadata?.email || req.decoded.email;
                const amount = session.amount_total / 100;

                const existingPayment = await writerPaymentsCollection.findOne({
                    stripeSessionId: session_id,
                });

                if (existingPayment) {
                    return res.send({
                        success: true,
                        message: "Writer already verified",
                    });
                }

                await usersCollection.updateOne(
                    { email },
                    {
                        $set: {
                            isVerifiedWriter: true,
                            updatedAt: new Date(),
                        },
                    }
                );

                await writerPaymentsCollection.insertOne({
                    writerEmail: email,
                    amount,
                    status: "paid",
                    stripeSessionId: session_id,
                    createdAt: new Date(),
                });

                const existingTransaction = await transactionsCollection.findOne({
                    stripeSessionId: session_id,
                    type: "writer_verification",
                });

                if (!existingTransaction) {
                    await transactionsCollection.insertOne({
                        type: "writer_verification",
                        userEmail: email,
                        amount,
                        status: "paid",
                        stripeSessionId: session_id,
                        createdAt: new Date(),
                    });
                }

                res.send({
                    success: true,
                    message: "Writer verified successfully",
                });
            } catch (error) {
                res.status(500).send({
                    success: false,
                    message: error.message,
                });
            }
        });


        // Create Ebook Purchase Checkout Session
        app.post("/create-ebook-checkout-session", verifyToken, async (req, res) => {
            try {
                const { ebookId } = req.body;

                if (!ObjectId.isValid(ebookId)) {
                    return res.status(400).send({
                        success: false,
                        message: "Invalid ebook ID",
                    });
                }

                const ebook = await ebooksCollection.findOne({
                    _id: new ObjectId(ebookId),
                    status: "published",
                });

                if (!ebook) {
                    return res.status(404).send({
                        success: false,
                        message: "Ebook not found or unpublished",
                    });
                }

                if (ebook.writerId === req.decoded.id) {
                    return res.status(403).send({
                        success: false,
                        message: "You cannot purchase your own ebook",
                    });
                }

                const existingPurchase = await purchasesCollection.findOne({
                    ebookId,
                    buyerEmail: req.decoded.email,
                });

                if (existingPurchase) {
                    return res.status(409).send({
                        success: false,
                        message: "Already purchased",
                    });
                }

                const session = await stripe.checkout.sessions.create({
                    payment_method_types: ["card"],
                    mode: "payment",
                    customer_email: req.decoded.email,
                    line_items: [
                        {
                            price_data: {
                                currency: "usd",
                                product_data: {
                                    name: ebook.title,
                                    images: ebook.coverImage ? [ebook.coverImage] : [],
                                },
                                unit_amount: Math.round(Number(ebook.price) * 100),
                            },
                            quantity: 1,
                        },
                    ],
                    //success_url: `${process.env.CLIENT_URL}/ebooks/payment-success?session_id={CHECKOUT_SESSION_ID}`,
                    success_url: `${process.env.CLIENT_URL}/ebook-payment-success?session_id={CHECKOUT_SESSION_ID}`,
                    cancel_url: `${process.env.CLIENT_URL}/ebooks/${ebookId}`,
                    metadata: {
                        ebookId,
                        buyerEmail: req.decoded.email,
                        type: "ebook_purchase",
                    },
                });

                res.send({
                    success: true,
                    url: session.url,
                });
            } catch (error) {
                res.status(500).send({
                    success: false,
                    message: error.message,
                });
            }
        });


        // Ebook Payment Success
        app.get("/ebook-payment-success", verifyToken, async (req, res) => {
            try {
                const { session_id } = req.query;

                if (!session_id) {
                    return res.status(400).send({
                        success: false,
                        message: "Session ID missing",
                    });
                }

                const session = await stripe.checkout.sessions.retrieve(session_id);

                if (session.payment_status !== "paid") {
                    return res.status(400).send({
                        success: false,
                        message: "Payment not completed",
                    });
                }

                const ebookId = session.metadata.ebookId;
                const buyerEmail = session.metadata.buyerEmail;

                const existingPurchase = await purchasesCollection.findOne({
                    stripeSessionId: session_id,
                });

                if (existingPurchase) {
                    return res.send({
                        success: true,
                        message: "Already processed",
                    });
                }

                const ebook = await ebooksCollection.findOne({
                    _id: new ObjectId(ebookId),
                });

                const buyer = await usersCollection.findOne({
                    email: buyerEmail,
                });

                const purchase = {
                    ebookId,
                    ebookTitle: ebook.title,
                    writerId: ebook.writerId,
                    writerName: ebook.writerName,
                    buyerId: buyer?._id?.toString(),
                    buyerName: buyer?.name || buyerEmail,
                    buyerEmail,
                    amount: ebook.price,
                    status: "paid",
                    stripeSessionId: session_id,
                    purchaseDate: new Date(),
                };

                await purchasesCollection.insertOne(purchase);

                await transactionsCollection.insertOne({
                    type: "ebook_purchase",
                    ebookId,
                    ebookTitle: ebook.title,
                    buyerName: buyer?.name || buyerEmail,
                    buyerEmail,
                    writerId: ebook.writerId,
                    writerName: ebook.writerName,
                    amount: ebook.price,
                    status: "paid",
                    stripeSessionId: session_id,
                    createdAt: new Date(),
                });

                await ebooksCollection.updateOne(
                    { _id: new ObjectId(ebookId) },
                    {
                        $inc: { totalSales: 1 },
                        $set: { updatedAt: new Date() },
                    }
                );

                res.send({
                    success: true,
                    message: "Ebook purchased successfully",
                });
            } catch (error) {
                res.status(500).send({
                    success: false,
                    message: error.message,
                });
            }
        });

        console.log("MongoDB Connected Successfully");
    } catch (error) {
        console.error(error);
    }
}

run().catch(console.dir);

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});