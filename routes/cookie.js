const express = require("express");
const Router = express.Router();
const cookieParser = require("cookie-parser");
const User = require("../models/User");

Router.get("/", cookieParser(process.env.COOKIE_SECRET), (req, res) => {
  /**
   * @desc that provides decrypted session info from a cookie
   * @route /cookie-parser
   */

  if (req.session.passport) {
    User.findById(req.session.passport.user)
      .then((data) =>
        res.send({
          isAuthenticated: true,
          data,
        })
      )
      .catch((err) => console.log(err));
  }
  console.log(req.isAuthenticated());
});

module.exports = Router;
