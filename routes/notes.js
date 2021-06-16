const express = require('express');
const router = express.Router();
const note = require('../models/notes_db');
const user = require('../models/users_db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const async = require('async');
const crypto = require('crypto');
const dotenv = require('dotenv').config();




let storage = multer.diskStorage({
    
    destination: 'public/img/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname)
    }
});

let upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        checkFileType(file, cb);
    },

    

});



function checkFileType(file, cb) {
    const fileTypes = /jpeg|jpg|png|gif/;
    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
    if (extname) {
        return cb(null, true);
    } else {
        cb('Hata! Yalnızca Resimler');
    }
}


function isAuthenticatedUser(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash('error_msg', 'Önce Giriş Yapmalısınız🐢');
    res.redirect('/login');
}




router.get('/', (req, res) => {
    if (req.isAuthenticated()) {
        res.redirect('/home');
    }
    res.redirect('/login');
});
router.get('/home', isAuthenticatedUser, (req, res) => {
    note.find({})
        .then(notes => {
            res.render('index', { notes: notes });
        })
        .catch(err => {
            req.flash('error_msg', 'ERROR: ' + err);

            res.redirect('back');
        })
});

router.get('/add', isAuthenticatedUser, (req, res) => {
    res.render('add');
});

router.get('/demo', isAuthenticatedUser, (req, res) => {
    res.render('demo');
});

router.get('/login', (req, res) => {
    res.render('login');
});

router.get('/logout', (req, res) => {
    req.logOut();
    req.flash('success_msg', 'Başarıyla Çıkış Yapıldı🐢');
    res.redirect('/login');
});

router.get('/signup', (req, res) => {
    res.render('signup');
});


router.get('/search', isAuthenticatedUser, (req, res) => {
    res.render('search', {
        notes: [],
        flag: false
    });
});

router.get('/note', isAuthenticatedUser, (req, res) => {
    let SearchQuery = req.query.noteTitle.replace('*', '');
    if (SearchQuery) {
        note.find({
            $or: [{
                note: {
                    $regex: new RegExp(req.query.noteTitle),
                    $options: 'i\m'
                }
            },
            {
                title: {
                    $regex: new RegExp(req.query.noteTitle),
                    $options: 'i\m'
                }
            },
            {
                tags: {
                    $regex: new RegExp(req.query.noteTitle),
                    $options: 'i\m'
                }
            }

            ]
        })
            .then(notes => {
                res.render('search', {
                    notes: notes,
                    flag: true
                });
            })
            .catch(err => {
                req.flash('error_msg', 'ERROR: ' + err);

                res.redirect('/home');
            })
    } else {
        res.redirect('/search');
    }
});

router.get('/edit/:id', isAuthenticatedUser, (req, res) => {
    let SearchQuery = {
        _id: req.params.id
    };
    note.findOne(SearchQuery)
        .then(notes => {
            res.render('edit', {
                notes: notes
            });
        })
        .catch(err => {
            req.flash('error_msg', 'ERROR: ' + err);
            res.redirect('/home');
        })
});

router.get('/noteView/:id', isAuthenticatedUser, function (req, res) {
    let SearchQuery = {
        _id: req.params.id
    };
    note.findOne(SearchQuery)
        .then(notes => {
            res.render('noteView', {
                note: notes
            });
        })
        .catch(err => {
            req.flash('error_msg', 'ERROR: ' + err);
            res.redirect('/home');
        })
});


router.get('*', function (req, res) {
    res.render('error');
});


router.post('/add', isAuthenticatedUser, upload.array('images'), (req, res, next) => {
    const files = req.files;
    let url = [];
    if (!files) {
        url = [];
    }
    files.forEach(file => {
        url.push(file.path.replace('public', ''));
    });
    let arr = [];
    let title = req.body.title;
    let notes = req.body.note;
    let author = [req.body.author];
    arr = req.body.tags.trim().split(",");
    arr = Array.from(new Set(arr));

    let newNote = {
        title: title,
        tags: arr,
        note: notes,
        imgUrl: url,
        author: author
    };


    note.create(newNote)
        .then(notes => {
            req.flash('success_msg', `${req.body.title} Başarıyla eklendi🐢`);
            res.redirect('/home')
        })
        .catch(err => {
            req.flash('error_msg', 'ERROR: ' + err);
            res.redirect('/home');
        })
});


router.post('/tag_delete/:id', isAuthenticatedUser, (req, res) => {
    let SearchQuery = {
        _id: req.params.id
    };
    let tag = req.body.tag;
    note.updateOne(SearchQuery, {
        $pull: {
            tags: tag
        }
    })
        .then(note => {
            res.redirect("back");
        })
        .catch(err => {
            req.flash('error_msg', 'ERROR: ' + err);
            res.redirect('back');
        })
});

router.post('/deleteimg/:id', isAuthenticatedUser, (req, res) => {
    let SearchQuery = {
        _id: req.params.id
    };
    let url = req.body.url;

    fs.unlink('./public/' + url, (err) => {
        if (err) {
            req.flash('error_msg', 'ERROR: ' + err);
            res.redirect('back');
        }
    })

    note.updateOne(SearchQuery, {
        $pull: {
            imgUrl: url
        }
    }
    )
        .then(() => { res.redirect('back'); })
        .catch(err => {
            req.flash('error_msg', 'ERROR: ' + err);
            res.redirect('back');
        })
});

router.post('/login', passport.authenticate('local', {
    successRedirect: '/home',
    failureRedirect: '/login',
    failureFlash: 'Geçersiz e-posta veya şifre. Tekrar deneyiniz🐢'
}));

router.post('/signup', (req, res) => {

    let user_id = req.body.user_id;
    let user_mail = req.body.email;
    let password = req.body.password;

    let userData = {
        name: user_id,
        email: user_mail
    };

    user.register(userData, password, (err, user) => {
        if (err) {
            req.flash('error_msg', 'ERROR:' + err)
            res.redirect('/signup');
        }
        passport.authenticate('local')(req, res, () => {
            req.flash('success_msg', `${userData.name} Başarıyla kayıt olundu🐢`);
            res.render('login');
        })
    })

});









router.put('/edit/:id', isAuthenticatedUser, upload.array('images'), (req, res) => {
    let url = [];
    let author = req.body.author;
    const files = req.files;
    let arr = [];
    arr = req.body.tags.trim().split(",");
    arr = Array.from(new Set(arr));

    let SearchQuery = {
        _id: req.params.id
    };
    // note.findOne(SearchQuery)
    //     .then((note) => {
    //            url = note.imgUrl;
    if (!files) {
        console.log('dosya eklenmedi');
    }
    files.forEach(file => {
        url.push(file.path.replace('public', ''));
    });
    //  })
    //  .then(() => {
    note.updateOne(SearchQuery, {
        $set: {
            title: req.body.title,
            tags: arr,
            note: req.body.note,
        },
        $push: {
            imgUrl: { $each: url }
        },
        $addToSet: {
            author: author
        }
    })
        .then(note => {
            req.flash('success_msg', `${req.body.title} Başarıyla güncellendi🐢`);
            res.redirect("/home");
        })
        .catch(err => {
            req.flash('error_msg', 'ERROR: ' + err);
            res.redirect('/home');
        })
})


//         .catch((err) => {
//             req.flash('error_msg', 'ERROR: ' + err);
//             res.redirect('/home');
//         });
// });






router.delete('/delete/:id', isAuthenticatedUser, (req, res) => {
    let SearchQuery = {
        _id: req.params.id
    };
    note.deleteOne(SearchQuery)
        .then(note => {
            req.flash('error_msg', `Başarıyla silindi🐢`);
            res.redirect("/home");
        })
        .catch(err => {
            req.flash('error_msg', 'ERROR: ' + err);
            res.redirect('/home');
        });
});



module.exports = router;
