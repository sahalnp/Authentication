import express from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { connectDB, collection } from "./db.js";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import passport from "passport";

connectDB();
dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 8080;

// middleware function
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect("/login");
}
app.use((req, res, next) => {
    req.passportRes = res;
    next();
});

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false },
    })
);
app.use(passport.initialize());
app.use(passport.session());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));
app.use(express.static(path.join(__dirname, "../public")));
passport.use(
    "google",
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/google/callback",
        userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
        passReqToCallback: true,
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          console.log("profile", profile);
  
          const google_user = await collection.findOne({ name: profile.displayName });
          if (google_user) {
            return done(null, { profile, existingUser: true });
          } else {
            return done(null, { profile, existingUser: false });
          }
        } catch (error) {
          console.log("The error is " + error);
          return done(error);
        }
      }
    )
  );
  
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

app.get(
    "/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] }),(req,res)=>{
    }
    
);
app.get(
    "/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/login" }),
    (req, res) => {
      if (req.user.existingUser) {
        res.render("home", { user: req.user.profile.displayName });
      } else {
        res.render("redirect-to-signup");
      }
    }
  );
  
// Route to display the login page
app.get("/login", async (req, res) => {
    if (req.session.user_name) {
        res.redirect("/");
    } else {
        res.render("login", {title:"login", user_exist: null });
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
        return res.render("login", {user_exist: "User does not exist. Please sign up.",
        });
    }

    const passwordMatches = await bcrypt.compare(
        loginDetails.password,
        user.password
    );
    if (passwordMatches) {
        req.session.user_name = user.name;
        res.redirect("/");
    } else {
        res.render("login", { user_exist: "Password is not correct." });
    }
});
// Route to display the signup page
app.get("/signup", (req, res) => {
    if (req.session.user_name) {
        res.redirect("/");
    } else {
        res.render("signup", {title:"signup", error: null });
    }
});
// Route to handle signup form submission
app.post("/signup", async (req, res) => {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const data = {
        name: req.body.username,
        password: hashedPassword,
        email: req.body.email,
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
    const userName = req.query.user
    if (req.session.user_name) {
        console.log("Logged in as:", req.session.user_name);
        res.render("home", {title:"Home", user: req.session.user_name, error: null });
    } else if (req.session.admin_name) {
        console.log("Logged in as:", req.session.admin_name);
        res.render("home", { user: req.session.admin_name, error });
    }else if(userName){
        console.log(userName)
    } 
    else {
        res.redirect("/login");
    }
});
// Route to logout the user
// we can simply use req.logout()
// res.redirect("/admin_login");

app.get("/logout", function (req, res) {
    if (req.session.admin_name) {
        req.logout((err)=>{
            if(err)console.log(err)
             res.redirect("/admin_login");
        });
       
    } else if (req.session.user_name) {
        req.session.auth = null;
        res.clearCookie("auth");
        req.session.destroy(function () {});
        res.redirect("/");
    } else {
        try {
            res.redirect("/");
        } catch (error) {
            console.log(error);
        }
    }
});
app.get("/admin_login", (req, res) => {
    if (req.session.admin_name) res.render("dashboard");
    else {
        res.render("admin_login", { title:'Admin login',send: null });
    }
});
app.post("/admin_login", async (req, res) => {
    const admin_user = await collection.findOne({ role: 1 });
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
    const results = await collection.find({ role: 0 });
    if (req.session.admin_name) {
        req.session.result = results;
        if (req.session.updated) {
            const results = req.session.updated;
        }
        res.render("dashboard", { title:"Dashboard",user: results });
    } else if (req.session.user_name) {
        res.redirect("/");
    } else {
        res.redirect("/admin_login");
    }
});
app.get("/user/:name", async (req, res) => {
    const user = await collection.findOne({ name: req.query.button });
    req.session.USER = user;
    res.render("user", { user: user });
});
app.post("/user/delete", async (req, res) => {
    const deletedUser = await collection.findOneAndDelete({
        name: req.session.USER.name,
    });
    res.redirect("/Dashboard");
});
app.post("/user/:edit", async (req, res) => {
    const { name, email } = req.body;
    if (!name || !email) {
        return res.status(400).json({ error: " name, and email are required" });
    }
    const updated = await collection.findOneAndUpdate(
        { email: req.body.email },
        { name: req.body.name },
        { new: true, runValidators: true }
    );
    req.session.updated = updated;
    res.redirect("/Dashboard");
});

// app.get('/search',async(req,res)=>{
//     console.log(req.body.search);
//     const search=await collection.findOne({name:req.body.search})
// })
app.listen(port, () => {
    console.log(`Server Started on http://localhost:${port}`);
});