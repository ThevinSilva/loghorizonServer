const mongoose = require("mongoose");

const Dev = new mongoose.Schema({
  post: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  byLine: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Dev", Dev);
