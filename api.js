const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const crypto = require('crypto');
const jsonParser = bodyParser.json();
const key="password";
const algo = "aes256";
const app = express();

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());
app.use(
    session({
      secret: 'your_secret_key',
      resave: false,
      saveUninitialized: true,
    })
);

// database connection
mongoose.connect('mongodb://localhost:27017/authDB',{
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(()=>{
    console.log("connected");
});

const userSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    username: String,
    password: String
});

const User = new mongoose.model('User', userSchema);

const documentSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    branch: String,
    sem: String,
    subject: String,
    year: String,
    ptype: String,
    buffer: Buffer
});

const Document = new mongoose.model('Document', documentSchema);

const adminDocSchema = new mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    branch: String,
    sem: String,
    subject: String,
    year: String,
    ptype: String,
    buffer: Buffer
});
  
  // Create a model for the PDF file
const adminDoc = mongoose.model('adminDoc', adminDocSchema);

function checkAuth(req, res, next) {
    if (req.session.authenticated) {
      next();
    } else {
      res.redirect('/login');
    }
}

// app.get('/login', jsonParser, (req, res) => {
//     User.findOne({username : req.body.username}).then((data) => {
//         const decipher = crypto.createDecipher(algo,key);
//         const decrypted = decipher.update(data.password, 'hex', 'utf8') + decipher.final('utf8');
        
//         if(decrypted == req.body.password) {
//             req.session.authenticated = true;
//             // redirect to home page
//             res.redirect('/home');
//         } else {
//             res.send('Invalid ID or password');
//         }

//     });
// });

app.get('/login', (req, res) => {
    const username = req.query.username;
    const password = req.query.password;
    User.findOne({username: username}).then((data) => {
        
        const actualPassword = data.password;

        if(password == actualPassword) {
            console.log(username, ' ', password);
            console.log(actualPassword);
            res.send({passwordValid: 1})
        } else {
            res.send({passwordValid: 0});
        }

    });

});
// branch: branch, year: year, ptype: ptype, 
app.get('/get-docs', (req, res) => {
    const branch = req.query.branch;
    const sem = req.query.sem;
    const subject = req.query.subject;
    const year = req.query.year;
    const ptype = req.query.ptype;
    console.log(branch, " ", year, " ", ptype, " ", subject);
    Document.findOne({branch: branch, year: year, ptype: ptype, subject: subject }, (error, pdfDoc) => {
        if (error) {
          console.log(error);
        } else {
            if(pdfDoc) {
                console.log(typeof pdfDoc);
                res.send(pdfDoc);
            } else {
                res.send({pdfDocFound: 0});
            }
        }
    });
});

app.get('/admin-docs', (req, res) => {
    adminDoc.find({}, (err, adminDocList) => {
        if(err) {
            res.send(err);
        } else {
            if(!adminDocList) {
                res.send({adminDocListEmpty: 1});
            } else {
                res.send({adminDocListEmpty: 0, adminDocList: adminDocList});
            }
        }
    });
});

app.get('/get-admin-specific-doc', (req, res) => {
    const branch = req.query.branch;
    const sem = req.query.sem;
    const subject = req.query.subject;
    const year = req.query.year;
    const ptype = req.query.ptype;
    console.log(branch, " ", year, " ", ptype, " ", subject);
    adminDoc.findOne({branch: branch, year: year, ptype: ptype, subject: subject }, (error, pdfDoc) => {
        if (error) {
          console.log(error);
        } else {
            if(pdfDoc) {
                console.log(typeof pdfDoc);
                res.send(pdfDoc);
            } else {
                res.send({pdfDocFound: 0});
            }
        }
    });
});

app.get('/home', checkAuth, function(req, res) {
    res.send('Welcome to the home page!');
});

app.get('/approve', (req, res) => {
    const branch = req.query.branch;
    const sem = req.query.sem;
    const subject = req.query.subject;
    const year = req.query.year;
    const ptype = req.query.ptype; 

    adminDoc.findOne({branch: branch, sem: sem, subject: subject, year: year, ptype: ptype}, function(err, resultDoc){
        if(err) {
            res.send(err);
        } else {
            const approvedDoc = new Document({
                _id: mongoose.Types.ObjectId(),
                branch: branch,
                sem: sem, 
                subject: subject,
                year: year,
                ptype: ptype,
                buffer: resultDoc.buffer
            });
            approvedDoc.save(function(err){
                if(err) {
                    console.log('Error in saving copied document');
                    res.send({documentCopied: 0});
                } else {
                    res.send({documentCopied: 1});
                }
            });
        }
    });

});

// start server
const port = 3000;
app.listen(port, function() {
  console.log('Server listening on port ' + port);
});
