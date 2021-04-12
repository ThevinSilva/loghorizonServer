const Express = require("express");
const Socket = require("socket.io");
const http = require("http");
const Morgan = require("morgan");
const Session = require("express-session");
const passport = require("passport");
const cors = require("cors");
const connectDB = require("./config/db");
const mongoose = require("mongoose");
const MongoStore = require("connect-mongo")(Session);
const cloudinary = require("cloudinary").v2;
const { formatAMPM } = require("./helper/helper");
const Boards = require("./models/Boards");

//---------------------------------- CONSTANTS ----------------------------------

const PORT = process.env.PORT || 8080;

//---------------------------------- UTILITY ----------------------------------
const {
  addUser,
  removeUser,
  getUser,
  getUserInRoom,
} = require("./controller/userController");

const boardManager = require("./controller/boardController");
const User = require("./models/User");

//----------------------------------CONFIGERATION ----------------------------------

//cloudinary
require("dotenv").config();
cloudinary.config({
  cloud_name: "loghorizon",
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});
require("./config/passport")(passport);

//MongoDB
connectDB();

//---------------------------------- SERVER ----------------------------------
const app = Express();
const httpServer = http.createServer(app);
const io = Socket(httpServer, {
  cors: {
    origin: process.env.CLIENT_SIDE_URL,
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true,
  },
});

app.use(
  cors({
    origin: process.env.CLIENT_SIDE_URL, // allow to server to accept request from different origin
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true, // allow session cookie from browser to pass through
  })
);

//----------------------------------  MIDDLEWARE ----------------------------------
// increase bandwidth to allow for base64 strings
app.use(Express.json({ limit: "40mb", extended: true }));
app.use(Express.urlencoded({ limit: "40mb", extended: true }));
app.set("trust proxy", 1);
app.use(
  Session({
    name: "LHsession",
    secret: process.env.COOKIE_SECRET,
    resave: true,
    store: new MongoStore({ mongooseConnection: mongoose.connection }),
    cookie: {
      sameSite: false,
      maxAge: 8.64e7,
      secure: false,
      httpOnly: false,
    },
  })
);
// utility for monitoring requests
app.use(Morgan("dev"));

//---------------------------------- Pasport config ----------------------------------
app.use(passport.initialize());
app.use(passport.session());

//---------------------------------- SOCKETS ----------------------------------

/**
 * reserved event listener for when a page connects
 * {@link https://socket.io/docs/v4/emit-cheatsheet/}
 * {@link client\src\Dashboard\Dashboard.js}
 * {@link client\src\Friends\chat\chat.js}
 * {@link client\src\Friends\Boards\viewBoard.js}
 * @listens io#connection
 */
io.on("connection", (socket) => {
  //------------------ CHAT ------------------

  /**
   * listens to when a user joins chat
   * {@link }
   * @listens socket#joinChat
   */
  socket.on("joinChat", ({ id, name, room }) => {
    console.log(
      `\n USER JOINED CHAT \n - userId:${id}\n - name:${name}\n - room:${room}  \n`
    );
    const { error, user } = addUser({ id, name, room });

    if (!user) throw new Error(error);

    /**
     * lets chat participent know when user joins the chat
     * @event@fires socket#message
     * @property {string} user name of the user sending message
     * @property {string} text message sent
     */
    socket.broadcast.to(user.room).emit("message", {
      user: "admin",
      text: `${user.name}, has joined!`,
    });

    /**
     * socket get's subscribed to this board
     *{@link https://socket.io/docs/v4/server-api/#socket-join-room}
     */
    socket.join(user.room);
  });

  //  MESSAGE TIMER
  /**
   * @note current solution very clunky. This prevents time stamps from being
   * printed in a row. For every one time stamp it ignores the next
   */
  let timer = true;
  let timeSpan = 300000; //ms

  /**
   * listens to when a message is sent from client side
   * @listens socket#sendMessage
   */
  socket.on("sendMessage", ({ id, message }) => {
    /**
     * @type {user} contains room number in which the other
     *    member is also a part of
     */
    const user = getUser(id);

    console.log(
      `\nMESSAGE from ${user.name} in ${user.room}:\n   "${message}"`
    );

    if (timer === true) {
      /**
       * @bug 0001
       * @event@fires socket#message
       * @property {string} type type of message that's being sent
       * @property {string} user name of the user sending message
       * @property {string} text message sent
       */
      io.to(user.room).emit("message", {
        type: "time",
        user: user.name,
        text: +new Date(),
        id,
      });
      timer = false;
      // sets a timer that makes it so timestamps can be re sent after
      // cetain amount of time when someone sends a message
      setTimeout(() => {
        timer = true;
      }, timeSpan);
    }
    /**
     * @bug 0001
     * @event@fires socket#message
     * @property {string} user name of the user sending message
     * @property {string} text message sent
     */
    io.to(user.room).emit("message", { user: user.name, text: message, id });
    // temporary send server time which may not be client time
  });

  /**
   * not a reserved keyword for when user disconnects
   * @listens socket#disconnected
   */
  socket.on("chatDisconnect", (id) => {
    console.log("disconnected");
    const user = removeUser(id);

    if (user) {
      /**
       * sends user left channel message
       * @event@fires socket#message
       * @property {string} user name of the user sending message
       * @property {string} text message sent
       */
      io.to(user.room).emit("message", {
        user: "admin",
        text: `${user.name} has left.`,
      });
    }
  });

  //------------------ BOARD ------------------

  /**
   * listens to when a user joins a board
   * @listens socket#joinBoard
   * {@link client\src\Friends\Boards\viewBoard.js}
   */
  socket.on("joinBoard", ({ boardURI, userObj }) => {
    boardManager.addUser(boardURI, userObj._id);

    /**
     * socket get's subscribed to this board
     *{@link https://socket.io/docs/v4/server-api/#socket-join-room}
     */
    socket.join(boardURI);

    socket.broadcast.emit("userJoined", userObj);
  });
  // --------------------------- POST OFFICE ---------------------------
  // Get it. I'm so Funny. kekw
  /**
   * listens for posts sent from client side
   * @listens socket#postToServer
   * {@link client\src\Friends\Boards\viewBoard.js}
   */
  socket.on("postToServer", ({ boardURI, ...post }) => {
    //adds extra properties before it gets boardcasted
    post.votes = 0;
    post.voteList = [];
    post.comments = [];
    post.date = formatAMPM(new Date());
    post.pin = false;
    post.edited = false;

    //UPDATE BOARD COLLECTION
    Boards.findOneAndUpdate(
      { boardURI },
      { $addToSet: { posts: post } },
      (err, res) => {
        if (!err) console.log(`\n ${boardURI} had a POST ADDED \n`);
        else console.log(`\nERROR : post was not added -  ${err} \n`);
      }
    );

    const { username, name, img, date } = post;

    /**
     * iterates over all users under the boardURI
     * @bug 0002
     */
    for (let item of boardManager.getUsers(boardURI)) {
      io.to(item).emit("dashboardClient", {
        username,
        name,
        img,
        boardURI,
        /**
         *  parse data so less mark down perhaps
         * @bug 0003
         */
        post: post.post,
        date,
      });
    }
    // EMITTER [postToServer] - fires when authorization process is complete
    console.log(`\nPOST in ${boardURI} by ${username}: \n "${post.post}" \n`);
    /**
     * @event@fires socket#postToClient
     * @property {post} id id of the post is requested to be deleted
     */
    io.to(boardURI).emit("postToClient", post);
  });

  /**
   * updates image
   * @listens socket#updateImage
   * {@link client\src\Friends\Boards\viewBoard.js}
   */
  socket.on("updateImage", ({ data, boardURI }) => {
    cloudinary.uploader.upload(data, (err, result) => {
      Boards.findOneAndUpdate(
        { boardURI },
        { background: result.url },
        (err) => {
          if (err)
            console.log(`\n UPDATE IMAGE FAILED IN ${boardURI}: ${err} \n`);
          else console.log(`\n UPDATE IMAGE SUCCESFUL IN ${boadURI} \n`);
        }
      ).collation({
        locale: "en",
        strength: 2,
      });
    });
  });

  /**
   * listens for request to delete post
   * @listens socket#deletePost
   * {@link client\src\Friends\Boards\viewBoard.js}
   */
  socket.on("deletePost", ({ id, boardURI }) => {
    console.log(id, boardURI);
    // UPDATE BOARDS COLLECTION BY SETTING ALMOST ALL VALUES TO NULL
    Boards.findOneAndUpdate(
      { boardURI, "posts.id": id },
      {
        $set: {
          "posts.$.post": null,
          "posts.$.comments": null,
          "posts.$.voteList": null,
          "posts.$.pin": false,
          "posts.$.vote": null,
        },
      },
      (err) => {
        if (err) console.log(`\n POST ${id} was DELETED in ${boardURI}\n`);
        else console.log(`\n POST ${id} DELETE FAILED in ${boardURI}\n`);
      }
    );
    /**
     * @event@fires socket#deletePostClient
     * @property {string} id id of the post is requested to be deleted
     */
    io.to(boardURI).emit("deletePostClient", id);
  });

  /**
   * increments vote property in specified post
   * @listens socket#upVote
   * {@link client\src\Friends\Boards\viewBoard.js}
   */
  socket.on("upVote", ({ id, boardURI, usernameID }) => {
    // update Boards collection to add 1 to vote
    Boards.findOneAndUpdate(
      { boardURI, "posts.id": id },
      {
        $inc: { "posts.$.votes": 1 },
        $addToSet: { "posts.$.voteList": usernameID },
      },
      (err, res) => {
        if (err) console.log(`\n UPVOTE FAILED: ${err} \n`);
        else {
          console.log(`\n ${usernameID} UPVOTED ${id} in ${boardURI}`);
          io.to(boardURI).emit("upVoteClient", { id, usernameID });
        }
      }
    );

    /**
     * @event@fires socket#upVoteClient
     * @property {string} id id of the post
     * @property {string} usernameID Google API ID of the user who upvoted
     */
  });

  /**
   * decrements vote property in specified post
   * @listens socket#downVote
   * {@link client\src\Friends\Boards\viewBoard.js}
   */
  socket.on("downVote", ({ id, boardURI, usernameID }) => {
    Boards.findOneAndUpdate(
      { boardURI, "posts.id": id },
      {
        $inc: { "posts.$.votes": -1 },
        $addToSet: { "posts.$.voteList": usernameID },
      },
      (err, res) => {
        if (err) console.log(`\n DOWNVOTE FAILED: ${err} \n`);
        else {
          console.log(`\n ${usernameID} DOWNVOTED ${id} in ${boardURI}`);
          // update mongoose collection to minus 1 to vote

          /**
           * @event@fires socket#downVoteClient
           * @property {string} id id of the post
           * @property {string} usernameID Google API ID of the user who upvoted
           */
          io.to(boardURI).emit("downVoteClient", { id, usernameID });
        }
      }
    );
  });

  /**
   * listens for posts sent from client side
   * @listens socket#deletePost
   * {@link client\src\Friends\Boards\viewBoard.js}
   */
  socket.on("pin", ({ boardURI, id, pin }) => {
    Boards.findOneAndUpdate(
      { boardURI, "posts.id": id },
      { $set: { "posts.$.pin": pin } },
      (err) => console.log(`\n DOWNVOTE FAILED: ${err} \n`)
    );
    io.to(boardURI).emit("pinClient", id);
  });

  socket.on("reply", ({ boardURI, ...replyObj }) => {
    const { id } = replyObj;
    Boards.findOneAndUpdate(
      { boardURI, "posts.id": id },
      { $push: { "posts.$.comments": replyObj } },
      (err) => console.log(err)
    );
    io.to(boardURI).emit("replyClient", replyObj);
  });

  socket.on("edit", ({ id, post, boardURI }) => {
    //mongoose
    console.log(post);
    date = formatAMPM(new Date());
    Boards.findOneAndUpdate(
      {
        boardURI,
        "posts.id": id,
      },
      {
        $set: { "posts.$.post": post, "posts.$.edited": true },
      },
      (err, res) => {
        console.log(err);
      }
    );

    io.to(boardURI).emit("editClient", { id, post, date });
  });

  socket.on("boardNameChange", ({ boardURI, boardName }) => {
    Boards.findOneAndUpdate({ boardURI }, { name: boardName }, (err, res) =>
      console.log(`\nchanged board name of ${boardURI} to ${boardName} \n`, err)
    );
  });

  socket.on("promoteServer", ({ id, boardURI }) => {
    io.to(boardURI).emit("promoteClient", id);

    Boards.findOneAndUpdate(
      { boardURI },
      {
        $addToSet: { moderators: id },
        $pull: { participents: id },
      },
      (err, docs) => {
        if (err) console.log(err);
        // else console.log(docs);
      }
    );
  });
  socket.on("banServer", ({ id, boardURI }) => {
    console.log(`\n ${id} has been banned from ${boardURI}\n`);

    // send remove event
    io.to(boardURI).emit("banClient", id);

    //
    boardManager.removeUser(boardURI, id);

    Boards.findOneAndUpdate(
      { boardURI },
      {
        $addToSet: { blacklist: id },
        $pull: { participents: id, moderators: id },
      },
      (err, docs) => {
        if (err) console.log(err);
        // else console.log(docs);
      }
    );
  });

  socket.on("addToServer", ({ id, boardURI }) => {
    Boards.findOneAndUpdate(
      { boardURI },
      {
        $addToSet: { participents: id },
        $pull: { blacklist: id },
      },
      (err, docs) => {
        if (err) console.log(err);
        // else console.log(docs);
      }
    );
  });

  //-------------------- DASHBOARD ----------------------------

  //  unlikely chance that someone creates a board with the same uri
  socket.on("dashboard", (id) => {
    socket.join(id);
  });
});

// Routes
app.use("/auth", require("./routes/auth"));
app.use("/cookie-parse", require("./routes/cookie"));
app.use("/friend", require("./routes/friend"));
app.use("/board", require("./routes/board"));
app.use("/dev", require("./routes/dev"));

httpServer.listen(PORT, () =>
  console.log(`Server is listening on port : ${PORT}`)
);
