const Express = require("express");
const Router = Express.Router();
const Dev = require("../models/Dev");

Router.post("/post", (req, res) => {
  console.log(req.body);
  Dev.create({ ...req.body }, () => {
    console.log(`\n DEVLOG HAS BEEN ADDED \n`);
    res.status(200).send("\n DEVLOG HAS BEEN ADDED \n");
  });
});

Router.get("/dashboard", (req, res) => {
  Dev.find()
    .sort({ $natural: -1 })
    .limit(4)
    .exec((err, docs) => {
      if (!err) {
        res.send(docs);
        console.log(docs);
      } else console.log(err);
    });
});

Router.get("/log", (req, res) => {
  //  this has no limit
  Dev.find()
    .sort({ $natural: -1 })
    .exec((err, docs) => {
      if (!err) {
        res.send(docs);
        console.log(docs);
      } else console.log(err);
    });
});

module.exports = Router;
