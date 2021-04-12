const express = require("express");
const passport = require("passport");
const router = express.Router();

//@ desc    Authenticate with google
//@ route   GET /auth/google
router.get("/google", passport.authenticate("google", { scope: ["profile"] }));

//@ desc    Authenticate with google
//@ route   GET /auth/google
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: process.env.CLIENT_SIDE_URL,
  }),
  (req, res) => {
    res.redirect(process.env.CLIENT_SIDE_URL + "/app");
  }
);

module.exports = router;
