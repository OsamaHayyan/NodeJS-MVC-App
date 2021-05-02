const path = require("path");
const MONGODB_URI = "mongodb://localhost/shop";

const cron = require("node-cron");

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const csurf = require("csurf");
const flash = require("connect-flash");
const multer = require("multer");

const MongoDBStore = require("connect-mongodb-session")(session);

const errorController = require("./controllers/error");
const User = require("./models/user");

const app = express();

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./public/images");
  },
  filename: (req, file, cb) => {
    cb(
      null,
      file.originalname.split(".")[0] +
        "-" +
        new Date().toISOString().replace(/:/g, "-") +
        path.extname(file.originalname)
    );
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

app.set("view engine", "ejs");
app.set("views", "views");

const adminRoutes = require("./routes/admin");
const shopRoutes = require("./routes/shop");
const authRoutes = require("./routes/auth");

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single("image")
);
app.use("/public", express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "my secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: MONGODB_URI,
      collectionName: "sessions",
      stringify: false,
    }),
  })
);

app.use(csurf());
app.use(flash());

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  next();
});

app.use((req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
    //outside a promise "in synchronous code place"you should can the error without next() to execute Express error handle middleware
    // like this ==> throw new Error('dummy');
    .then((user) => {
      if (!user) {
        return next();
      }
      req.user = user;
      next();
    })
    .catch((err) => {
      //inside a promise, catch block or callbacks you should use the error inside next() to execute Express error handle middleware
      return next(new Error(err));
    });
});

app.use("/admin", adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.get("/500", errorController.get500);

app.use(errorController.get404);

app.use((error, req, res, next) => {
  console.log("first error" + error);
  try {
    res.status(500).render("500", {
      pageTitle: "Error!",
      path: "/500",
      isAuthenticated: req.session.isLoggedIn,
    });
  } catch (error) {
    console.log("another error" + error);
  }
});

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
  })
  .then(() => {
    console.log("connected");
    app.listen(3000);
  })
  .catch((err) => {
    console.log(err);
  });
