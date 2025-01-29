const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require("uuid");
const app = express();
const port = 5500;
app.use(cors());

const mongoUrl = "mongodb+srv://vetha:vetha@cluster0.4tigb.mongodb.net/BookLibrary";

mongoose.connect(mongoUrl)
    .then(() => {
        console.log("Database connected successfully");
        app.listen(port, () => {
            console.log(`Server is running at port ${port}`);
        });
    })
    .catch((err) => console.log(err));

const bookSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    author: { type: String, required: true },
    genre: { type: String },
    year: { type: Number }
});

const bookModel = mongoose.model("Book", bookSchema);

app.use(express.json());

// GET all books
app.get("/api/books", async (req, res) => {
    try {
        const books = await bookModel.find();
        res.status(200).json(books);
    } catch (error) {
        console.error("Failed to fetch books:", error);
        res.status(500).json({ message: "Failed to fetch books" });
    }
});

// GET a book by ID
app.get("/api/books/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const book = await bookModel.findOne({ id });
        if (!book) {
            return res.status(404).json({ message: "Book not found" });
        }
        res.status(200).json(book);
    } catch (error) {
        console.error("Error fetching book:", error);
        res.status(500).json({ message: "Error fetching book" });
    }
});

// POST a new book
app.post("/api/books", async (req, res) => {
    try {
        const { title, author, genre, year } = req.body;

        const newBook = new bookModel({
            id: uuidv4(),
            title,
            author,
            genre,
            year
        });

        const savedBook = await newBook.save();
        res.status(201).json(savedBook);
    } catch (error) {
        console.error("Error saving book:", error);
        res.status(500).json({ message: "Error saving book", error: error.message });
    }
});

// PUT (update) a book by ID
app.put("/api/books/:id", async (req, res) => {
    const { id } = req.params;
    const { title, author, genre, year } = req.body;

    try {
        const updatedBook = await bookModel.findOneAndUpdate(
            { id },
            { title, author, genre, year },
            { new: true }
        );

        if (!updatedBook) {
            return res.status(404).json({ message: "Book not found" });
        }
        res.status(200).json(updatedBook);
    } catch (error) {
        console.error("Error updating book:", error);
        res.status(500).json({ message: "Error updating book", error: error.message });
    }
});

// DELETE a book by ID
app.delete("/api/books/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const deletedBook = await bookModel.findOneAndDelete({ id });

        if (!deletedBook) {
            return res.status(404).json({ message: "Book not found" });
        }

        res.status(200).json({ message: "Book deleted successfully", deletedBook });
    } catch (error) {
        console.error("Error deleting book:", error);
        res.status(500).json({ message: "Error deleting book", error: error.message });
    }
});

const userSchema=new mongoose.Schema({
    username:{type:String,required:true,unique:true},
    password:{type:String,required:true}
});
const user=mongoose.model("user",userSchema);

app.post("/api/register",async(req,res)=>{
    const {username,password}=req.body;
    const hashedPassword=await bcrypt.hash(password,10);
    const newUser=new user({
        username,
        password:hashedPassword
    });
    const savedUser=await newUser.save();
    res.status(200).json({message:"User registered successfully",user:savedUser});
});

app.post("/api/login",async(req,res)=>{
    const {username,password}=req.body;
    const userData=await user.findOne({username});
    
    const isValidPassword=await bcrypt.compare(password,userData.password);
    if(!isValidPassword)
    {
        return res.status(400).json({message:"Invalid credentials"});
    }

    const token=jwt.sign({username:userData.username},"my-key",{expiresIn:"1h"});
    res.status(200).json({message:"Login successful",token});
});

const authorize=(req,res,next)=>{
    const token=req.headers["authorization"]?.split(" ")[1];
    console.log({token});
    if(!token)
    {
        return res.status(401).json({message:"No token provided"});
    }
    jwt.verify(token,"my-key",(error,userInfo)=>{
        if(error)
        {
            return res.status(401).json({message:"Unauthorized"});
        }
        req.user=userInfo;
        next();
    });
}

app.get("/api/secured",authorize,(req,res)=>{
    res.json({message:"Access granted",user:req.user});
});

