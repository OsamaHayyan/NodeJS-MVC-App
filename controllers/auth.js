const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');
const { validationResult } = require('express-validator')


const User = require('../models/user');

const transport = nodemailer.createTransport(sendgridTransport({
  auth: {
    api_key: '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'
  }
}))

exports.getlogin = (req, res, next) => {
  let message = req.flash('error');
  if (message.length > 0) {
    message = message[0]
  } else {
    message = null;
  }
  res.render('auth/login', {
    path: '/login',
    pageTitle: 'Login',
    errorMessage: message,
    oldInput: {
      email: '',
      password: '',
    }
  });
};



exports.postlogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400)
      .render('auth/login', {
        path: '/login',
        pageTitle: 'Login',
        errorMessage: errors.array()[0].msg,
        oldInput: {
          email: email,
          password: password,
        }
      });
  }

  User.findOne({ email: email })
    .then(user => {
      if (!user) {
        return res.status(400)
          .render('auth/login', {
            path: '/login',
            pageTitle: 'Login',
            errorMessage: 'Invalid Email or Password',
            oldInput: {
              email: email,
              password: password,
            }
          });
      }
      bcrypt
        .compare(password, user.password)
        .then(doMatch => {
          if (doMatch) {
            req.session.isLoggedIn = true;
            req.session.user = user;
            return req.session.save((err) => {
              console.log(err);
              return res.redirect('/');
            });
          }
          return res.status(400)
            .render('auth/login', {
              path: '/login',
              pageTitle: 'Login',
              errorMessage: 'Invalid Email or Password',
              oldInput: {
                email: email,
                password: password,
              }
            });
        })
        .catch(err => {
          console.log(err);
          res.redirect('/login')
        })

    })
    .catch(err => console.log(err));
};

exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => {
    console.log(err);
    res.redirect('/')
  })
}


exports.getSignup = (req, res, next) => {
  let message = req.flash('error');
  if (message.length > 0) {
    message = message[0]
  } else {
    message = null;
  }
  res.render('auth/signup', {
    path: '/signup',
    pageTitle: 'Signup',
    errorMessage: message,
    oldInput: {
      email: '',
      password: '',
      confirmPassword: ''
    },
    validationError: []
  });
};
exports.postSignup = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400)
      .render('auth/signup', {
        path: '/signup',
        pageTitle: 'Signup',
        errorMessage: errors.array()[0].msg,
        oldInput: {
          email: email,
          password: password,
          confirmPassword: confirmPassword
        },
        validationError: errors.array()
      });;
  }

  User.findOne({ email: email })
    .then(() => {
      bcrypt.hash(password, 12)
        .then((hasedPassword) => {
          const user = new User({
            email: email,
            password: hasedPassword,
            cart: { items: [] }
          });
          return user.save()
        })
        .then((result) => {
          res.redirect('/login');
          transport.sendMail({
            to: email,
            from: 'sonikx2011@gmail.com',
            subject: 'succeded',
            html: '<h1>You Succesfully signed Up</h1>'
          })
        })
        .catch(err => {
          console.log(err);
        });
    })
    .catch(err => {
      console.log(err);
    });


}

exports.getReset = (req, res, next) => {
  let message = req.flash('error');
  if (message.length > 0) {
    message = message[0]
  } else {
    message = null;
  }
  res.render('auth/reset', {
    path: '/reset',
    pageTitle: 'Reset Password',
    errorMessage: message
  });
}

exports.postReset = (req, res, next) => {
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.log(err);
      return res.redirect('/reset');
    }
    const token = buffer.toString('hex');
    User.findOne({ email: req.body.email })
      .then(user => {
        if (!user) {
          req.flash('error', 'No account with that email found')
          return res.redirect('/reset')
        }
        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + 36000000
        return user.save()
      })
      .then(result => {
        res.redirect('/');
        transport.sendMail({
          to: req.body.email,
          from: 'sonikx2011@gmail.com',
          subject: 'Password Reset',
          html: `
                        <p>You requseted a password reset </p>
                        <p>Click this <a href="http://localhost:3000/reset/${token}">link</a> to set a new password </p>
                    `
        })
      })
      .catch(err => {
        console.log(err);
      })
  })
};

exports.getNewPassword = (req, res, next) => {
  const token = req.params.token;
  User.findOne({ resetToken: token, resetTokenExpiration: { $gt: Date.now() } })
    .then(user => {
      let message = req.flash('error');
      if (message.length > 0) {
        message = message[0]
      } else {
        message = null;
      }
      res.render('auth/new-password', {
        path: '/new-password',
        pageTitle: 'New Password',
        errorMessage: message,
        userId: user._id.toString(),
        passwordToken: token
      });
    })
    .catch(err => {
      console.log(err);
    })
};

exports.postNewPassword = (req, res, next) => {
  const newPassword = req.body.password;
  const userId = req.body.userId;
  const passwordToken = req.body.passwordToken;
  let resetUser;
  User.findOne({ resetToken: passwordToken, resetTokenExpiration: { $gt: Date.now() }, _id: userId })
    .then((user) => {
      resetUser = user;
      return bcrypt.hash(newPassword, 12);

    })
    .then(hashedPassword => {
      resetUser.password = hashedPassword;
      resetUser.resetToken = undefined;
      resetUser.resetTokenExpiration = undefined;
      return resetUser.save();
    })
    .then(() => {
      res.redirect('/login')
    })
    .catch(err => {
      console.log(err);
    })

}