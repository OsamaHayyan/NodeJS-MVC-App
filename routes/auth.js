const express = require('express');

const { body } = require('express-validator')

const authController = require('../controllers/auth');
const User = require('../models/user');

const router = express.Router();

router.get('/signup', authController.getSignup)

router.post('/signup',
  [
    body('email')
      .isEmail()
      .withMessage('Please Enter a valid email')
      .custom((value) => {
        return User.findOne({ email: value })
          .then(user => {
            if (user)
              return Promise.reject('E-mail already in use');
          })
      })
      .normalizeEmail(),
    body('password', 'The Password should contain numbers, characters and symbols with at least 8 char length')
      .matches(/^(?=.*[a-z])(?=.*[0-9])(?=.*[!@#\$%\^&\*\_])(?=.{8,})/),
    body('confirmPassword').custom((value, { req }) => {
      if (value !== req.body.password) {
        return Promise.reject('Password confirmation does not match password');
      }
      return true;
    })
  ],
  authController.postSignup)

router.get('/login', authController.getlogin)

router.post('/login',
  [
    body('email')
      .isEmail()
      .withMessage(`Email or Password isn't valied`)
      .normalizeEmail(),
    body('password', `Email or Password isn't valied`)
      .matches(/^(?=.*[a-z])(?=.*[0-9])(?=.*[!@#\$%\^&\*\_])(?=.{8,})/),
  ], authController.postlogin)

router.post('/logout', authController.postLogout)

router.get('/reset', authController.getReset)

router.post('/reset', authController.postReset)

router.get('/reset/:token', authController.getNewPassword)

router.post('/new-password', authController.postNewPassword)

module.exports = router