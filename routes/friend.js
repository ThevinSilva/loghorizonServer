/** Express router providing user related routes
 * @module routes/friends
 * @requires express
 */

const User = require("../models/User");
const Express = require("express");
/**
 * @type {object}
 * @const
 * @namespace friend
 */
const Router = Express.Router();
const Friend = require("../models/Friends");
const path = require("path");
const fs = require("fs");

/**
 * takes a list containing user ids then returns db querry of images
 * username and id  for each id in a list
 * @name post/list
 * @function
 * @memberof routes/friends~friend
 * @inner
 */
Router.post("/list", (req, res) => {
  try {
    console.log(
      `\n${req.session.passport.user} REQUESTED friends : ${req.body.data}\n`
    );

    User.find(
      {
        _id: { $in: req.body.data },
      },
      (err, docs) => res.send(docs)
    );
  } catch (e) {
    console.log(`\n /friend/list FAILED : ${e}\n`);
  }
});

/**
 * either an id or a username is used to querry and find potential
 * matches
 * @name post/search
 * @function
 * @memberof routes/friends~friend
 * @inner
 */
Router.post("/search", (req, res) => {
  try {
    console.log(
      `\n${req.session.passport.user} SEARCHED friends USING: ${req.body.data.query}\n`
    );

    User.find(
      {
        $or: [
          {
            $text: {
              $search: req.body.data.query,
              $diacriticSensitive: false,
              $caseSensitive: false,
            },
          },
          { _id: req.body.data.query },
        ],
      },
      { username: 1, img: 1 },
      (err, docs) => {
        // IDrequest is the callers ID should be equal to the id in the session then the id from
        const userData = docs;
        Friend.find({ IDRequested: req.session.passport.user }, (err, docs) => {
          const friendData = docs;
          let temp = Array.from(friendData, (e) => e.IDRecipient);
          res.send(
            userData.filter(
              (x) =>
                ![
                  ...req.body.data.list,
                  ...temp,
                  req.session.passport.user,
                ].includes(x._id)
            )
          );
        });
      }
    ).catch((err) =>
      console.log(`\n /friend/search FIND QUERRY FAILED : ${err} \n`)
    );
  } catch (e) {
    console.log(`\n /friend/search FAILED : ${e} \n`);
  }
});

/**
 * send the person a request to be added as a friend
 * @name get/request/:id
 * @function
 * @memberof routes/friends~friend
 * @inner
 */
Router.get("/request/:id", (req, res) => {
  try {
    console.log(
      `friends request from: ${req.session.passport.user} to 
        ${req.params.id}`
    );
    let friendQuery = {
      $and: [
        {
          IDRequested: req.params.id,
        },
        {
          IDRecipient: req.session.passport.user,
        },
        {
          status: "requested",
        },
      ],
    };

    Friend.find(friendQuery, (err, docs) => {
      // if the recipient has already sent a request then we don't bother creating another

      if (docs.length === 0) {
        Friend.create({
          IDRequested: req.session.passport.user,
          IDRecipient: req.params.id,
          status: "requested",
        });
      } else {
        Friend.findOneAndUpdate(friendQuery, { status: "accepted" }, () => {
          User.findOneAndUpdate(
            { _id: req.session.passport.user },
            { $push: { friendsList: req.params.id } },
            (err, res) => console.log(res)
          );
          User.findOneAndUpdate(
            { _id: req.params.id },
            { $push: { friendsList: req.session.passport.user } },
            (err, res) => console.log(res)
          );
        });
      }
    });
  } catch (e) {
    console.log(`\n /friend/request/:id FAILED : ${e} \n`);
  }
});

/**
 * filter the friends database based on "requested" status with
 * IDRecepient as the session user
 * @name get/pending
 * @function
 * @memberof routes/friends~friend
 * @inner
 */
Router.get("/pending", (req, res) => {
  try {
    console.log(`\n${req.session.passport.user} REQUESTED pending list\n`);
    Friend.find(
      {
        $and: [
          { IDRecipient: req.session.passport.user },
          { status: "requested" },
        ],
      },
      (err, docs) => {
        res.send(docs);

        if (err)
          console.log(`\n /friend/pending FIND QUERRY FAILED : ${err} \n`);
      }
    );
  } catch (e) {
    console.log(`\n /friend/pending FAILED: ${e} \n`);
  }
});

/**
 * filter the friends database based on "requested" status with
 * IDRequested as the session user
 * @name get/sent
 * @function
 * @memberof routes/friends~friend
 * @inner
 */
Router.get("/sent", (req, res) => {
  try {
    console.log(`\n${req.session.passport.user} REQUESTED sent list\n`);
    Friend.find(
      {
        $and: [
          { IDRequested: req.session.passport.user },
          { status: "requested" },
        ],
      },
      (err, docs) => {
        if (err)
          console.log(`\n /friend/pending FIND QUERRY FAILED : ${err} \n`);
        res.send(docs);
      }
    );
  } catch (e) {
    console.log(`\n /friend/sent FAILED : ${e} \n`);
  }
});

/**
 * checks whether accepted or rejected then adds to list
 * @name post/check
 * @function
 * @memberof routes/friends~friend
 * @inner
 */
Router.post("/check", (req, res) => {
  try {
    console.log(
      `\n ${req.session.passport.user} CHECKED OUT ${req.body.from}'s request and ${req.body.status} \n`
    );
    // status :
    //  1. requested
    //  2. accepted
    //  1. rejected
    // update status in Friends collection
    Friend.findOneAndUpdate(
      {
        $and: [
          { IDRequested: req.body.from },
          { IDRecipient: req.session.passport.user },
        ],
      },
      { status: req.body.status },
      (err, res) => console.log(res)
    );
    if (req.body.status === "accepted") {
      User.findOneAndUpdate(
        { _id: req.session.passport.user },
        { $push: { friendsList: req.body.from } },
        (err, res) => console.log(res)
      );
      User.findOneAndUpdate(
        { _id: req.body.from },
        { $push: { friendsList: req.session.passport.user } },
        (err, res) => console.log(res)
      );
    }
  } catch (e) {
    console.log(`\n /friend/check FAILED : ${e} \n`);
  }
});

/**
 *  JSON docs download button
 * @name get/docs
 * @function
 * @memberof routes/friends~friend
 * @inner
 */
Router.get("/docs", (req, res) => {
  // req.body.data.id - search query or id
  try {
    console.log(
      `\n  ${req.session.passport.user} requested user data DOWNLOAD \n`
    );
    User.find({ _id: req.session.passport.user }, (err, docs) => {
      //file path using fs library incase dirrectory changes later on
      const filePath = path.join(
        __dirname,
        "cache",
        `${req.session.passport.user}.json`
      );
      fs.writeFileSync(filePath, JSON.stringify(docs[0]), { flag: "w" });

      res.download(filePath, "download.json", (e) => fs.unlinkSync(filePath));
    }).catch((err) => console.log(err));
  } catch (e) {
    console.log(`\n /friend/docs FAILED : ${e} \n`);
  }
});

module.exports = Router;
