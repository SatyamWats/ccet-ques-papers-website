const express = require('express');
const mongoose = require('mongoose');
const ejs = require('ejs');
const Buffer = require('buffer').Buffer;
const axios = require('axios');
const http = require('http');
const bodyParser = require('body-parser');
const childProcess = require('child_process');
const multer = require('multer');
const session = require('express-session');
const fs = require('fs');
const upload = multer({
    dest: 'uploads/',
    timeout: 20000 // increase timeout to 20 seconds
});


const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.use(
    session({
      secret: 'your_secret_key',
      resave: false,
      saveUninitialized: true,
    })
);

function checkAuth(req, res, next) {
    if (req.session.authenticated) {
      next();
    } else {
      res.redirect('/login');
    }
}

mongoose.connect('mongodb://localhost:27017/authDB',{
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(()=>{
    console.log("connected");
});


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

app.get("/", function(req, res){
    res.render("index");
});
// --------------------get-docs------------------------------
app.get("/get-docs", (req, res) => {
    res.render("get-docs")
});

app.post('/view-pdf', (req, res) => {
    console.log("reached view pdf");
    const branch = req.body.branch;
    const sem = req.body.sem;
    const subject = req.body.subject;
    const year = req.body.year;
    const ptype = req.body.ptype;
    const URL = "http://localhost:3000/get-docs/?branch="+branch + "&sem="+sem +"&subject="+subject+"&year="+year+"&ptype="+ptype;

    axios.get(URL).then(function(pdfDoc){
        if(pdfDoc == 0) {
            res.redirect("/get-docs");
        } else {
            if(pdfDoc.data.pdfDocFound == 0) {
                res.send('Not Found');
            } else {
                const pdfBuffer = pdfDoc.data.buffer.data;
                const buffer = Buffer.from(pdfBuffer);
                res.setHeader('Content-Type', 'application/pdf');
                res.send(buffer);
            }
            
        }
    });

});
//----------------------------------upload-docs----------------------

app.get("/upload-docs", (req, res) => {
    res.render('upload-docs');
});

app.post('/upload-docs', upload.single('pdf'), (req, res) => {
    fs.readFile(req.file.path, (err, data) => {
        if (err) {
          // Handle the error
          res.send(err);
          return;
        }
        const branch = req.body.branch;
        const sem = req.body.sem;
        const subject = req.body.subject;
        const year = req.body.year;
        const ptype = req.body.ptype;

        const currentDoc = new adminDoc({
            _id: mongoose.Types.ObjectId(),
            branch: branch,
            sem: sem, 
            subject: subject,
            year: year,
            ptype: ptype,
            buffer: data
        });

        currentDoc.save()
          .then(() => {
            // Redirect the user to the success page
            res.redirect('/success');
          })
          .catch(err => {
            // Handle the error
            res.send(err);
          });
      });
});

app.get('/success', (req, res) => {
    res.render('success');
});

app.get('/login', (req,res) => {
    res.render('login');
});

app.post('/login', (req,res) => {
    const username = req.body.username;
    const password = req.body.password;
    const URL = "http://localhost:3000/login/?username="+username + "&password="+password;
    axios.get(URL).then(function(data){
        const ValidPassword = data.data.passwordValid
        if(ValidPassword == 1) {
            req.session.authenticated = true;
            console.log("here");
            res.redirect("/admin");
        } else {
            res.send('Invalid ID or Password');
        }
    });

});

app.get('/admin', checkAuth, function(req, res) {
    const URL = "http://localhost:3000/admin-docs";
    axios.get(URL).then(function(data){
        const adminDocListEmpty = data.data.adminDocListEmpty;
        const adminDocList = data.data.adminDocList;
        // console.log(adminDocListEmpty);
        if(adminDocListEmpty == 1) {
            res.render('admin',{adminDocListEmpty: 1});
        } else {
            res.render('admin', {adminDocList: adminDocList, adminDocListEmpty: 0});
        }
    })

});

app.post('/get-admin-specific-doc', (req, res) => {
    const branch = req.body.branch;
    const sem = req.body.sem;
    const subject = req.body.subject;
    const year = req.body.year;
    const ptype = req.body.ptype;
    console.log(req.body);
    console.log(branch, " ", year, " ", ptype, " ", subject);
    const URL = "http://localhost:3000/get-admin-specific-doc/?branch="+branch + "&sem="+sem +"&subject="+subject+"&year="+year+"&ptype="+ptype;

    axios.get(URL).then(function(pdfDoc){
        if(pdfDoc == 0) {
            res.redirect("/get-docs");
        } else {
            if(pdfDoc.data.pdfDocFound == 0) {
                res.send('Not Found');
            } else {
                const pdfBuffer = pdfDoc.data.buffer.data;
                const buffer = Buffer.from(pdfBuffer);
                res.setHeader('Content-Type', 'application/pdf');
                res.send(buffer);
            }
            
        }
    });
});

function deleteAdminDoc(branch, sem, subject, year, ptype) {
    adminDoc.findOneAndDelete({ branch:  branch, sem: sem, subject: subject, year: year, ptype: ptype}, (error, doc) => {
        if (error) {
            console.log('Error in deletion from admin');
            console.log(error);
        } else {
          console.log('Doc Deleted from Admin');
        }
    });
}

app.post('/approve', (req, res) => {
    const branch = req.body.branch;
    const sem = req.body.sem;
    const subject = req.body.subject;
    const year = req.body.year;
    const ptype = req.body.ptype;
    console.log(req.body);
    console.log(branch, " ", year, " ", ptype, " ", subject);
    const URL = "http://localhost:3000/approve/?branch="+branch + "&sem="+sem +"&subject="+subject+"&year="+year+"&ptype="+ptype;
    axios.get(URL).then(function(data){
        const documentCopied = data.data.documentCopied;
        if(documentCopied == 1) {
            deleteAdminDoc(branch, sem, subject, year, ptype);
            res.redirect('/admin');
        } else {
            res.send('Error in approving file, try again');
        }
    });
});

app.post('/deny', (req, res) => {
    const branch = req.body.branch;
    const sem = req.body.sem;
    const subject = req.body.subject;
    const year = req.body.year;
    const ptype = req.body.ptype;
    deleteAdminDoc(branch, sem, subject, year, ptype);
    res.redirect('/admin');
});

app.post('/logout', (req, res) => {
    req.session.authenticated = true;
    res.redirect('/');
});

app.listen(3001, (req, res) => {
    console.log("Server is up and running on port 3001");
});