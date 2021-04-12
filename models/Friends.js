const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const Friends = new Schema({
    IDRequested:{
        type: String,
        required:true
    },
    IDRecipient:{
        type:String,
        required: true
    },
    status:{
        type:String,
        required:true
    }
})

module.exports = mongoose.model("Friends", Friends )