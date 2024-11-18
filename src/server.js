import express from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { connectDB,collection } from "./db.js";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

connectDB();
dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 8080;

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false },
    })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));
app.use(express.static(path.join(__dirname, "../public")));

// Route to display the login page
app.get("/login",async (req, res) => {

    if (req.session.user_name) {
        res.redirect("/");
    } else {
        res.render("login", { user_exist: null });
    }
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
// Route to display the signup page
app.get("/signup",(req, res) => {
    if (req.session.user_name) {
        res.redirect("/");
    } else {
        res.render("signup", { error: null });
    }
    
});
// Route to handle signup form submission
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
// Route to display the home page
app.get("/", (req, res) => {
    req.session.logedin = "loggedin";
    if (req.session.user_name) {
        console.log("Logged in as:", req.session.user_name);
        res.render("home", { user: req.session.user_name, error:null });
    } else if (req.session.admin_name) {
        console.log("Logged in as:", req.session.admin_name);
        res.render("home", { user: req.session.admin_name,error });
    } else {
        res.redirect("/login");
    }
});
// Route to logout the user
app.get("/logout", function (req, res) {
    if (req.session.admin_name) {
        req.session.auth = null;
        res.clearCookie("auth");
        req.session.destroy(function () {});
        res.redirect("/admin_login");
    } 
    else if(req.session.user_name){
        req.session.auth = null;
        res.clearCookie("auth");
        req.session.destroy(function () {});
        res.redirect("/");
    }
    else {
        
        try {
            res.redirect("/");
        } catch (error) {
            console.log(error);
        }
    }
});
app.get("/admin_login", (req, res) => {
    if(req.session.admin_name)
        res.render('dashboard');
    else{
        res.render('admin_login', { send: null })
    }
});
app.post("/admin_login", async (req, res) => { 
    const admin_user = await collection.findOne({ role:1 });
    console.log(admin_user);
    
    const password_match = await bcrypt.compare(
        req.body.password,
        admin_user.password
    );
    req.session.admin_name = admin_user.name;
    if (req.body.username === admin_user.name && password_match) {
        res.redirect("/Dashboard");
    } else if (!password_match) {
        res.render("admin_login", { send: "password is not correct" });
    } else {
        res.render("admin_login", { send: "Admin can only login" });
    }
});
app.get("/Dashboard", async (req, res) => {
        const results = await collection.find({ admin: { $exists: false } });
        if (req.session.admin_name) 
            res.render("dashboard", { user: results });
        else {
            res.redirect("/admin_login");
        }
});
app.listen(port, () => {
    console.log(`Server Started on http://localhost:${port}`);
});
