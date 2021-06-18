const express = require('express');
const mongoose = require('mongoose');
const app = express();
const path = require('path');
const multer = require('multer');
const dotenv = require('dotenv').config();
const bodyParser = require('body-parser');
const notesRoute = require('./routes/notes');
const methodOverride = require('method-override');
const session = require('express-session');
const flash = require('connect-flash');
const user = require('./models/users_db');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;


app.use(flash());

app.use(session({
    secret: process.env.SECRET,
    resave: true,
    saveUninitialized: true
}));


app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy({usernameField: 'email'}, user.authenticate()),);
passport.serializeUser(user.serializeUser());
passport.deserializeUser(user.deserializeUser());
// passport.use(new FacebookStrategy({
//         clientID: process.env.ID,
//         clientSecret: process.env.CSECRET,
//         callbackURL: process.env.CBURL,
//         profileFields: ['id', 'displayName', 'name', 'gender', 'picture.type(large)', 'email']
//     },
//     function (accessToken, refreshToken, profile, cb) {
//         console.log(profile)
//         process.nextTick(function () {
//             user.findOne({'facebook.id': profile.id}, function (err, user) {
//                 if (err) return cb(err)
//                 if (user) {
//                     return cb(null, user)
//                 } else {
//                     let id = profile.id;
//                     let token = profile.token;
//                     let name = profile.name.givenName + ' ' + profile.name.familyName;
//                     let email = profile.emails[0].value;
//                     let newUser =  user
//                     newUser.facebook.id = id;
//                     newUser.facebook.token = token
//                     newUser.facebook.name = name
//                     newUser.facebook.email = email
//
//
//                     user.create(newUser)
//
//
//                     newUser.save(function (err) {
//                         if (err) {
//                             throw  err;
//
//                         }
//                         return cb(null, newUser)
//                     })
//                 }
//             })
//         })
//
//     }
// ));
// app.get('/auth/facebook',passport.authenticate('facebook',{scope:'email'}))
// app.get('facebook/callback',passport.authenticate('facebook',{
//     successRedirect : '/home',
//     failureRedirect : '/login'
//
// }))
// app.get('/auth/facebook',
//     passport.authenticate('facebook'));
//
// app.get('/auth/facebook/callback',
//     passport.authenticate('facebook', {failureRedirect: '/login'}),
//     function (req, res) {
//         // Successful authentication, redirect home.
//         res.redirect('/');
//     });
app.use((req, res, next) => {
    res.locals.success_msg = req.flash(('success_msg'));
    res.locals.error_msg = req.flash(('error_msg'));
    res.locals.error = req.flash(('error'));
    res.locals.currentUser = req.user;
    next();
});
app.use(methodOverride('_method'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));
app.set('view engine', 'ejs');
const databaseUrl = process.env.DATABASE;

mongoose.connect(databaseUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true

})
    .then(conn => {
        console.log('database connection established');
    });


app.use(notesRoute);

const port = process.env.PORT;

app.listen(port, () => {
    console.log(`PORT active on ${port}`);
})

module.exports = app;

