const Mongoose = require('mongoose');
const Schema = Mongoose.Schema

const newUser = new Schema({
    _id:{
        type: String,
        required: true
    },
    username:{
        type: String,
        text: true, 
        required: true
    },
    firstName:{
        type: String,
        text: true, 
        required: false
    },
    lastName:{
        type: String, 
        text: true, 
        required: false
    },
    img:{
        // link to where ever the image is being stored
        type: String,
        required: false,
    },
    friendsList:{
        type: Array,
        required: true

    },
    boardList:{
        type: Array,
        required: true

    },
    createdAt: {
        type: Date,
        default: Date.now
    }
})

const User = Mongoose.model('Users',newUser)

module.exports = User