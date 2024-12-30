const mongoose = require('mongoose')
require('dotenv').config()
const mongoUrl = process.env.MONGODB_URL
mongoose.connect(mongoUrl)
const db = mongoose.connection;
db.on('connected',()=>
{
    console.log('connected to mongodb')
})

db.on('disconnected',()=>
{
        console.log('disconnected to mongodb')
})

db.on('error',(error)=>
{
            console.log('connection error occured',error)
})
module.exports = db