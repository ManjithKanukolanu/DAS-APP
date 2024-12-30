const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const patientSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    }
})
patientSchema.methods.comparePassword = async function (pass) {
    try {
        const ismatch = await bcrypt.compare(pass, this.password); 
        return ismatch;
    } catch (err) {
        throw err; 
    }
};
patientSchema.pre('save', async function (next) {
    const patient = this;
    try {
        if (patient.isModified('password')) {  
            const salt = await bcrypt.genSalt(10);
            const hashedpassword = await bcrypt.hash(patient.password, salt);
            patient.password = hashedpassword; 
        }
        next();  
    } catch (err) {
        return next(err);  
    }
});
const Patient = mongoose.model('Patient', patientSchema);
module.exports = Patient;
