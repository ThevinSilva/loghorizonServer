const Mongoose = require('mongoose');

const connectDB = async ()  =>{
    
    try {
        const conn = await Mongoose.connect(process.env.MONGO_URI,{
            useNewUrlParser: true,
            useUnifiedTopology:true
        })
        console.log('connected to mongoDB')
    }
    catch(err){
        console.log(err)
        process.exit(1)
    }
}


module.exports = connectDB