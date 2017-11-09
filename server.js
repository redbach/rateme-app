var express        = require('express');  
var cookieParser   = require('cookie-parser');
var bodyParser     = require('body-parser');
var validator      = require('express-validator');
var ejs            = require('ejs');
var engine         = require('ejs-mate');
var session        = require('express-session');
var mongoose       = require('mongoose');
var MongoStore     = require('connect-mongo')(session);
var passport       = require('passport');
var flash          = require('connect-flash');
var _              = require('underscore');

var app = express(); //creates an instance of the express method 

// mongoose.Promise = require("bluebird"); // To get rid of Mongoose mpromise deprecation warning, in addition to doing a $ npm install bluebird --save
// mongoose.connect("mongodb://localhost/rateme-app", {useMongoClient: true});

mongoose.Promise = global.Promise;
// mongoose.connect('mongodb:localhost/rateme-app');
var url = ('mongodb://localhost/rateme-app');
mongoose.connect(url, {useMongoClient: true});

require('./config/passport');
require('./secret/secret');

app.use(express.static('public'));
app.engine('ejs', engine);
app.set('view engine', 'ejs');
app.use(cookieParser());

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.use(validator());

app.use(session({
  secret: 'Thisismytestkey',
  resave: false,
  saveUninitialized: false,
  store: new MongoStore({mongooseConnection: mongoose.connection})
}));

app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

app.locals._ = _;
// app.locals.moment = moment;

require('./routes/user')(app, passport);
require('./routes/company')(app);
require('./routes/review')(app);
require('./routes/message')(app);



app.listen (3000, function(){
   console.log('The rateme-app server is a go on port 3000!');
});