const mongoose = require("mongoose");
const Schema = mongoose.Schema;
// ✔️signifies managed in the front end

const Posts = new Schema({
  usernameID: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  level: {
    type: Number,
    required: true,
  },
  id: {
    required: true,
    type: String,
  },
  img: {
    required: true,
    type: String,
  },
  votes: {
    required: true,
    type: Number,
  },
  voteList: {
    required: true,
    type: Array,
  },
  comments: {
    required: true,
    type: Array,
  },
  date: {
    required: true,
    type: String,
  },

  pin: {
    required: true,
    type: Boolean,
  },
  post: {
    required: true,
    type: String,
  },
  edited: {
    required: true,
    type: Boolean,
  },
});

const Boards = new Schema({
  boardURI: {
    type: String,
    required: true,
    index: {
      // case insensitive
      unique: true,
      collation: { locale: "en", strength: 2 },
    },
  },
  // must be saved into a photo bucket
  image: {
    type: String,
    required: true,
  },
  // ✔️
  name: {
    type: String,
    required: true,
  },
  // ✔️
  visibility: {
    type: String,
    required: true,
  },
  owner: {
    type: String,
    required: true,
  },
  // ✔️
  description: {
    type: String,
    required: true,
  },
  // ✔️
  participents: {
    type: Array,
    required: true,
    ref: "participents",
  },
  // banning some one from the board
  // ✔️
  whitelist: {
    type: Boolean,
    required: true,
  },
  // ✔️
  blacklist: {
    type: Array,
    required: true,
  },
  // ✔️
  category: {
    type: String,
    required: true,
  },
  //  contains a list within for comments
  // ✔️
  posts: [Posts],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // ✔️
  moderators: {
    type: Array,
    required: true,
  },
  // it's presence means it's private board
  // ✔️
  // must encrypted
  password: {
    type: String,
    required: false,
  },
  background: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("Boards", Boards);
