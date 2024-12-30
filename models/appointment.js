const mongoose = require('mongoose')
const appointmentSchema = mongoose.Schema({
    patientid:{type:mongoose.Schema.Types.ObjectId,ref: 'patient',required: true},
    doctorid:{type:mongoose.Schema.Types.ObjectId,ref: 'doctor',required: true},
    workingHours: {
        type:[
               {
                  status:{
                    type: String,
                    enum: ['Booked','No-show'],
                    required: true,
                    default: 'Booked'
                  },
                  slots:{
                    type:String,
                    required: true
                  }
               }
        ],
        default:[]
    },
    date: {
        type: String,
        required: true, 
        default: () => new Date().toLocaleDateString('en-CA')
    }
})
const Appointment = mongoose.model('Appointment',appointmentSchema)
module.exports = Appointment