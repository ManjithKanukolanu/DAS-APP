const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const doctorSchema = mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    password: {
        type: String,
        required: true,
    },
    specialization: {
        type: String,
        required: true
    },
    consultationFee: {
        type: Number,
        required: true
    },
    gender:{
        type: String,
        enum:['male','female'],
        required: true
    },
    workingHours: {
        type: [
            {
                date: {
                    type: String,
                    required: true, 
                    default: () => new Date().toLocaleDateString('en-CA')
                },
                slots: {
                    type: [String], 
                    required: true
                }
            }
        ],
        default: []
    }
})
doctorSchema.methods.comparePassword = async function (pass) {
    try{
        const ismatch = await bcrypt.compare(pass,this.password)
        return ismatch
    }
    catch(err)
    {
        throw err
    }
}
doctorSchema.pre('save',async function (next) {
    const doctor = this
    try{
          if(doctor.isModified('password'))
          {
              const salt = await bcrypt.genSalt(10)
              const hashedpassword = await bcrypt.hash(doctor.password,salt)
              doctor.password = hashedpassword
          }
          next()
    }
    catch(err)
    {
        return next(err)
    }
})
const Doctor = mongoose.model('Doctor',doctorSchema)
module.exports = Doctor