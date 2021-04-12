const Express = require("express");
const Mongoose = require("mongoose");
const User = require("../models/User");
const Boards = require("../models/Boards");
const Router = Express.Router();
const bcrypt = require("bcrypt-nodejs");
const http = require("http");
const cloudinary = require("cloudinary").v2;
const router = require("./auth");
const { boardDataFormater } = require("../helper/helper");

/**
 * takes boardURIs returns board info used in sublist
 * @name post/list
 * @function
 * @memberof routes/boards~boards
 * @inner
 */
Router.post("/list", (req, res) => {
  try {
    console.log(
      `\n ${req.session.passport.user} REQUESTED DATA FOR : ${req.body.data} \n`
    );
    Boards.find(
      { boardURI: { $in: req.body.data } },
      {
        posts: 0,
        password: 0,
      },
      (err, docs) => {
        res.send(boardDataFormater(docs));
      }
    ).collation({ locale: "en", strength: 2 });
  } catch (e) {
    console.log(`\n /board/list FAILED : ${e}\n`);
  }
});

/**
 * send a query item that gets searched through mongoDB and sent back as a Set
 * @name post/people-search
 * @function
 * @memberof routes/boards~boards
 * @inner
 */
Router.post("/people-search", (req, res) => {
  try {
    console.log(
      `\n ${req.session.passport.user} SEARCHED USER: ${req.body.data} \n`
    );
    User.find(
      {
        $or: [
          {
            $text: {
              $search: req.body.data,
              $diacriticSensitive: false,
              $caseSensitive: false,
            },
          },
          { _id: req.body.data.id },
        ],
      },
      { username: 1, img: 1 },
      (err, docs) => {
        // IDrequest is the callers ID should be equal to the id in the session then the id from
        const userData = docs;
        let filteredSearch = userData.filter(
          (x) => x._id !== req.session.passport.user
        );
        let data = {};
        for (let i = 0; i < filteredSearch.length; i++) {
          let { _id, username, img } = filteredSearch[i];
          data[_id] = { username, img };
        }

        // send object as data
        res.send(JSON.stringify(data));
      }
    ).catch((err) => console.log(err));
  } catch (e) {
    console.log(`\n /board/people-search FAILED : ${e}\n`);
  }
});

/**
 * create new board item
 * @name post/create
 * @function
 * @memberof routes/boards~boards
 * @inner
 */
Router.post("/create", (req, res) => {
  try {
    console.log(
      `\n ${req.session.passport.user} SEARCHED USER: ${req.body.data} \n`
    );
    const boardID = req.body.data.name;
    const password = req.body.data.password;
    bcrypt.hash(password, 2, (err, hash) => {
      cloudinary.uploader.upload(req.body.data.image, (error, result) => {
        if (error) {
          res
            .status(500)
            .send("ERROR : File Size too big? Image could not be uploaded");
        }
        let boardData = {
          ...req.body.data,
          boardURI: boardID,
          image: result.url,
          password: password ? hash : "",
          owner: req.session.passport.user,
          posts: [],
          background:
            "https://res.cloudinary.com/loghorizon/image/upload/v1615261547/firewatch_tvszj5.jpg",
        };

        Boards.create(boardData, () => {
          res.status(200).send({ message: "Board Created!", id: boardID });
        });
      });
    });
  } catch (e) {
    console.log(`\n /board/create FAILED : ${e}\n`);
  }
});

/**
 * checks the existence of given boardname
 * @name GET/check
 * @function
 * @memberof routes/boards~boards
 * @inner
 */
Router.post("/check", (req, res) => {
  try {
    Boards.findOne({ boardURI: req.body.data }, (err, result) => {
      console.log(
        `\n CHECK EXISTENCE of ${req.body.data} for ${
          req.session.passport.user
        } : ${result ? "TRUE" : "FALSE"} \n`
      );
      if (err) console.log(`boardURI check FAILED:  ${err}`);
      else res.send(result);
    }).collation({ locale: "en", strength: 2 });
  } catch (e) {
    console.log(`/board/check FAILED : ${e}`);
  }
  // collation is used to make searches case insensitive
});

/**
 * checks whether board is password protected then sends back board data
 * @name GET/login
 * @function
 * @memberof routes/boards~boards
 * @inner
 */
Router.post("/login", (req, res) => {
  try {
    Boards.findOne(
      { boardURI: req.body.data },
      { boardURI: 1, password: 1, image: 1 },
      (err, result) => {
        if (result) {
          // this is here to tell the client side whether board stores a password
          result.password = result.password
            ? "hash doesn't leave the server you're out of luck"
            : "";
          console.log(
            `LOGIN INFO TO ${req.body.data} for ${req.session.passport.user} : ${result}`
          );
          if (err) console.log(`/board/data FAILED: ${err}`);
          else res.send(result);
        } else {
          res.status(404).send(req.body.data);
        }
      }
    ).collation({ locale: "en", strength: 2 });
  } catch (e) {
    console.log(`/board/login FAILED : ${e}`);
  }
});

/**
 * checks the existence of given boardname
 * @name GET/check
 * @function
 * @memberof routes/boards~boards
 * @inner
 */
Router.post("/data", (req, res) => {
  try {
    Boards.findOne(
      { boardURI: req.body.data },
      { posts: 0, password: 0, image: 0, boardURI: 0 },
      (err, result) => {
        if (result) {
          result.password = result.password
            ? "You idiot u seriously think u can get the passwords just cause u figured out the endpoint"
            : "";
          console.log(
            `sending BOARD DATA of ${req.body.data} for ${req.session.passport.user} : ${result}`
          );
          if (err) console.log(`/board/data FAILED: ${err}`);
          else res.send(result);
        } else {
          res.status(404).send(req.body.data);
        }
      }
    ).collation({ locale: "en", strength: 2 });
  } catch (e) {
    console.log(`/board/data FAILED : ${e}`);
  }
});

/**
 * determine whether it's url or name and then test against encrypted password
 * @name GET/authorize
 * @function
 * @memberof routes/boards~boards
 * @inner
 */
Router.post("/authorize", (req, res) => {
  try {
    const { boardURI, password } = req.body.data;
    console.log(req.body.data);
    Boards.findOne(
      { boardURI },
      {
        password: 1,
        participents: 1,
        moderators: 1,
        owner: 1,
        blacklist: 1,
        whitelist: 1,
      },
      (err, docs) => {
        console.log(err);
        let user = req.session.passport.user;

        if (docs.blacklist.includes(user))
          res.status(401).send(" You have been banned ");
        else if (
          docs.whitelist &&
          !docs.participents.includes(user) &&
          !docs.moderators.includes(user) &&
          user !== docs.owner
        ) {
          res.status(402).send(" You aren't Whitelisted  ");
        } else {
          // level here is what level of clearence does the user get
          let plainText = password;
          bcrypt.compare(plainText, docs.password, (err, result) => {
            // NOTE this block makes sure code runs when both passwords are empty strings
            if (plainText === "" && docs.password === "") result = true;

            let level = 2;
            if (docs.owner === user) level = 0;
            else if (docs.moderators.includes(user)) level = 1;
            else if (!docs.participents.includes(user)) {
              // updates only if the two passwords are the same
              // console.log(result);
              if (result) {
                // update Boards and add new user
                Boards.findOneAndUpdate(
                  { boardURI },
                  { $push: { participents: user } },
                  (err, res) => {
                    if (err) console.log(err);
                  }
                ).collation({ locale: "en", strength: 2 });
              }
            }
            // adds the boardURI to list
            if (result && 0 <= level <= 2) {
              User.findOneAndUpdate(
                { _id: user },
                { $addToSet: { boardList: boardURI } },
                (err, res) =>
                  console.log(
                    err || ` \n ${boardURI} ADDED to ${user}'s "BoardList" \n`
                  )
              );
            }
            console.log(
              `\n ${user} is LEVEL ${level} & PASSWORD MATCH: ${result} \n`
            );
            // user will get a 403 that signigies password miss-match for no-passwords boards
            result
              ? res.send({ result, level })
              : res.status(403).send({ result, level });
          });
        }
      }
    ).collation({ locale: "en", strength: 2 });
  } catch (e) {
    console.log(`\n /board/authorize FAILED : ${e} \n`);
  }
});

/**
 * sends back 5 posts at a time
 * @name POST/load-posts
 * @function
 * @memberof routes/boards~boards
 * @inner
 */
Router.post("/load-posts", (req, res) => {
  try {
    console.log("load-posts" + req.body.data);
    let postLen = req.body.data.length;
    Boards.find(
      { boardURI: req.body.data.boardURI },
      { _id: 0, posts: 1 }
    ).exec((err, docs) => {
      res.send(
        docs[0].posts
          .slice(-5 - postLen, postLen === 0 ? undefined : -postLen + 1)
          .reduce((o, x) => {
            let { id, ...rest } = x;
            return { ...o, [id]: x };
          }, {})
      );
      if (err) console.log(`\n/board/load-posts FAILED FIND querry : ${err}\n`);
    });
  } catch (e) {
    console.log(`\n /board/load-posts FAILED : ${e}\n`);
  }
});

/**
 * sends back boards that belong to said category
 * @name POST/category
 * @function
 * @memberof routes/boards~boards
 * @inner
 */
Router.post("/category", (req, res) => {
  try {
    console.log(
      `\n ${req.session.passport.user} CATEGORIES ${req.body.data} \n`
    );
    if (req.body.data === undefined) {
      Boards.find(
        { visibility: "public" },
        { password: 0, posts: 0, visibility: 0 },
        (err, docs) => {
          if (err) console.log(err);

          res.send(boardDataFormater(docs));
        }
      );
    } else {
      Boards.find(
        { category: req.body.data, visibility: "public" },
        { password: 0, posts: 0, visibility: 0 },
        (err, docs) => {
          if (err) console.log(err);
          res.send(boardDataFormater(docs));
        }
      );
    }
  } catch (e) {
    console.log(`\n /board/category FAILED : ${e} \n`);
  }
});

/**
 * sends back 5 boards that has the highest number of users
 * @name POST/trending
 * @function
 * @memberof routes/boards~boards
 * @inner
 */
Router.get("/trending", (req, res) => {
  try {
    Boards.aggregate(
      [
        {
          $project: {
            boardURI: 1,
            image: 1,
            name: 1,
            participentLength: { $size: "$participents" },
          },
        },
        { $sort: { participentLength: -1 } },
        { $limit: 5 },
      ],
      (err, docs) => {
        if (err) console.log(err);
        console.log(`\n TRENDING: ${docs} \n `);
        res.send(docs);
      }
    );
  } catch (e) {
    console.log(`\n /board/trending FAILED : ${e} \n`);
  }
});
module.exports = Router;
