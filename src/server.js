import express from 'express';
import session from 'express-session';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { connectDB,collection } from './db.js'; 
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';


connectDB();
dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 8080;

app.use(session({
    secret: process.env.SESSION_SECRET, 
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } 
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));
app.use(express.static(path.join(__dirname, "../public")));

// Route to display the login page
app.get("/login", (req, res) => {
    res.render("login", { user_exist: null });
});
// Route to handle login form submission
app.post("/login", async (req, res) => {
    const loginDetails = {
        name: req.body.Username,
        password: req.body.password,
    };
    const user = await collection.findOne({ name: loginDetails.name });
    if (!user) {
        return res.render("login", { user_exist: "User does not exist. Please sign up." });
    }

    const passwordMatches = await bcrypt.compare(loginDetails.password, user.password);
    if (passwordMatches) {
        req.session.user_name = user.name;
        res.redirect('/');
    } else {
        res.render("login", { user_exist: "Password is not correct." });
    }
});
app.get("/signup", (req, res) => {
    res.render("signup", { error: null });
});
app.post("/signup", async (req, res) => {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const data = {
        name: req.body.username,
        password: hashedPassword,
    };
    const existingUser = await collection.findOne({ name: data.name });
    if (existingUser) {
        return res.render("signup", { error: "User already exists" });
    } else {
        const newUser = await collection.create(data);
        console.log(newUser);
        res.redirect("/login");
    }
});
app.get("/", (req, res) => {
    if (req.session.user_name) {
        console.log("Logged in as:", req.session.user_name); 
        res.render("home", { user: req.session.user_name });
    } else {
        res.redirect('/login'); 
    }
});
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});