var   nodemailer     = require('nodemailer'),
      smtpTransport  = require('nodemailer-smtp-transport'),
      async          = require('async'),
      crypto         = require('crypto'),
      User           = require('../models/user'),
      Company        = require('../models/company'),
      secret         = require('../secret/secret');

module.exports = (app, passport) => {

   app.get('/', (req, res, next) => {

      if(req.session.cookie.originalMaxAge !== null){
         res.redirect('/home');
      } else {
         Company.find({}, (err, result) => {
            res.render('index', {title: 'Index || RateMe', data:result});
         });
      }
   });

   app.get('/signup', (req, res) => {
      var errors = req.flash('error');
      // console.log('Sign up route errors: '+errors);
      res.render('user/signup', {title: 'Sign Up || RateMe', messages: errors, hasErrors: errors.length > 0});
   });

   app.post('/signup', validate, passport.authenticate('local.signup', {
      successRedirect: '/home',
      failureRedirect: '/signup',
      failureFlash : true
   }));

   app.get('/login', (req, res) => {
      var errors = req.flash('error');
      res.render('user/login', {title: 'Login || RateMe', messages: errors, hasErrors: errors.length > 0});
   });

   app.post('/login', loginValidation, passport.authenticate('local.login', {
//        successRedirect: '/home',
      failureRedirect: '/login',
      failureFlash : true
   }), (req, res) => {
      if(req.body.rememberme){
         req.session.cookie.maxAge = 24*60*60*1000;  //24 hours
      } else {
         req.session.cookie.expires = null;
      }
      res.redirect('/home');
   });

   app.get('/auth/facebook', passport.authenticate('facebook', {scope: 'email'}));
    
   app.get('/auth/facebook/callback', passport.authenticate('facebook', {
      successRedirect: '/home',
      failureRedirect: '/login',
      failureFlash: true
   }));   

   app.get('/home', (req, res) => {
      res.render('home', {title: 'Home || RateMe', user: req.user});
   });

   app.get('/forgot', (req, res) => {
      var errors = req.flash('error');

      var info = req.flash('info');

      res.render('user/forgot', {title: 'Password Reset Request', messages: errors, hasErrors: errors.length > 0, info: info, noErrors: info.length > 0});
   });

   app.post('/forgot', (req, res, next) => {
      async.waterfall([
         function(callback){
            crypto.randomBytes(20, (err, buf) => {
               var rand = buf.toString('hex');
               callback(err, rand);
            });
         },

         function(rand, callback){
            User.findOne({'email':req.body.email}, (err, user) => {
               if(!user){
                  req.flash('error', 'No account with that email was found OR the email address provided was invalid.');
                  return res.redirect('/forgot');
               }

               user.passwordResetToken = rand;
               user.passwordResetExpires = Date.now() + 60*60*1000;
                    
               user.save((err) => {
                  callback(err, rand, user);
               });
            });
         },

         function(rand, user, callback){
            var smtpTransport = nodemailer.createTransport({
               service: 'Gmail',
                  auth: {
                     user: secret.auth.user,
                     pass: secret.auth.pass
                  }
            });

            var mailOptions = {
               to: user.email,         //or you could use to: req.body.email, instead
               from: 'RateMe '+'<'+secret.auth.user+'>',
               subject: 'Password reset request',
               text: 'Greetings, '+user.fullname+'!\n\n'+
                  'You requested a PASSWORD RESET at RateMe. Please click on the link below to complete the process:\n'+
                  'http://localhost:3000/reset/'+rand+'\n\n'
            }; 

            smtpTransport.sendMail(mailOptions, (err, response) => {
               req.flash('info', 'A password RESET TOKEN has been sent to: '+user.email);
                  return callback(err, user);
            });           
         }
      ], (err) => {
         if(err){
            return next(err);
         }  

         res.redirect('/forgot');
      });
   });

   app.get('/reset/:token', (req, res) => {

      User.findOne({passwordResetToken:req.params.token, passwordResetExpires: {$gt: Date.now()}}, (err, user) => {
            if(!user){
               req.flash('error', 'Password reset token has expired OR is invalid. Request a new token.');
               return res.redirect('/forgot');
            }
            var errors = req.flash('error');
            var success = req.flash('success');

            res.render('user/reset', {title: 'Password Reset || RateMe', messages: errors, hasErrors: errors.length > 0, success:success, noErrors:success.length > 0});
      });
   });

   app.post('/reset/:token', (req, res) => {
      async.waterfall([
         function(callback){
            User.findOne({passwordResetToken:req.params.token, passwordResetExpires: {$gt: Date.now()}}, (err, user) => {
               if(!user){
                  req.flash('error', 'This password reset token has expired OR is invalid. Request a new token.');
                  return res.redirect('/forgot');
               }

               req.checkBody('password', 'Password is required').notEmpty();
               req.checkBody('password', 'Password must contain a minimum of 8 characters').isLength({min:8});
               req.check('password', 'Password must contain at least 1 number').matches(/^(?=.*\d)(?=.*[a-z])[0-9a-z]{8,}$/, "i");

               var errors = req.validationErrors();

               if(req.body.password == req.body.cpassword){
                  if(errors){
                     var messages = [];
                     errors.forEach((error) => {
                        messages.push(error.msg);
                  });
                            
                  var error = req.flash('error');  //was var errors = req.flash('error');
                  res.redirect('/reset/'+req.params.token);
               } else {
                  user.password = user.encryptPassword(req.body.password);
                  user.passwordResetToken = undefined;
                  user.passwordResetExpires = undefined;
                            
                  user.save((err) => {
                     req.flash('success', 'Your password has been successfully updated.');
                     callback(err, user);
                  });
               }
            } else {
               req.flash('error', 'You did not enter the same password twice. Please try again.');
               res.redirect('/reset/'+req.params.token);
            }
         });
      },



      function(user, callback){
         var smtpTransport = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
               user: secret.auth.user,
               pass: secret.auth.pass
            }
         });
                
         var mailOptions = {
               to: user.email,
               from: 'RateMe '+'<'+secret.auth.user+'>',
               subject: 'Password reset',
               text: 'Greetings again, '+user.fullname+'!\n\n'+
                  'This is confirmation that you successfully reset the password for '+user.email+'.'
            };
                
            smtpTransport.sendMail(mailOptions, (err, response) => {
               callback(err, user);
                 
               var error = req.flash('error');
               var success = req.flash('success');
                 
               res.render('user/reset', {title: 'Password Reset', messages: error, hasErrors: error.length > 0, success:success, noErrors:success.length > 0});
            });
         }
      ]);
   });

   app.get('/logout', (req, res) => {
      req.logout();
      req.session.destroy((err) => {
         res.redirect('/');
      });
   });
};
    
function validate(req, res, next){
   req.checkBody('fullname', 'Your full name is required').notEmpty();
   req.checkBody('fullname', 'Full name should not be less than 5 characters').isLength({min:5});
   req.checkBody('email', 'Email is required').notEmpty();
   req.checkBody('email', 'That email address is invalid').isEmail();
   req.checkBody('password', 'Password is required').notEmpty();
   req.checkBody('password', 'Password must contain a minimum of 8 characters').isLength({min:8});
   req.check("password", "Password must contain at least 1 number").matches(/^(?=.*\d)(?=.*[a-z])[0-9a-z]{8,}$/, "i");

   var errors = req.validationErrors();

   if(errors){
      var messages = [];
      errors.forEach((error) => {
         messages.push(error.msg);
      });

      req.flash('error', messages);
      res.redirect('/signup');
   }else{
      return next();
   }
}

function loginValidation(req, res, next){
   req.checkBody('email', 'Email is required').notEmpty();
   req.checkBody('email', 'That email address is invalid').isEmail();
   req.checkBody('password', 'Password is required').notEmpty();
   // req.checkBody('password', 'Password and/or email is invalid').isLength({min:8});
   req.check('password', 'Password and/or email is invalid').matches(/^(?=.*\d)(?=.*[a-z])[0-9a-z]{8,}$/, 'i');

   var loginErrors = req.validationErrors();

   if(loginErrors){
      var messages = [];
      loginErrors.forEach((error) => {
         messages.push(error.msg);
      });

      req.flash('error', messages);
      res.redirect('/login');
   }else{
      return next();
   }
}

