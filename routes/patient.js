const express = require('express');
const router = express.Router();
const app = express();
const Patient =  require('./../models/patient')
const Doctor = require('./../models/doctor')
const Appointment = require('./../models/appointment')
const { jwtAuthMiddleware, generateToken } = require('./../jwt');

router.get('/login', (req, res) => {
    console.log('Rendering patient login page');
    res.render('patientlogin');
});

router.get('/signup', (req, res) => {
    console.log('Rendering patient sign up page');
    res.render('patientsignup');
});

router.post('/see', async(req, res) => {
    try {
        const { email, password } = req.body
        const patient = await Patient.findOne({ email: email })
        if (!patient || !(await patient.comparePassword(password))) {
            return res.status(401).json({ error: 'Invalid email or password' })
        }

        const payload = {
            id: patient._id
        };
        const token = generateToken(payload)
        const today = new Date().toLocaleDateString('en-CA')
        console.log(today)
        await Doctor.updateMany(
            {},
            { $pull: { workingHours: { date: { $lt: today } } } } 
        )
        let availableDoctors = await Doctor.find({
            'workingHours.date': today,
            'workingHours.slots': { $exists: true, $not: { $size: 0 } }
        }).select('name gender specialization consultationFee workingHours')
        await Appointment.deleteMany({
            'workingHours': { $size: 0 }
        })
        const bookedAppointments = await Appointment.find({
            patientid: patient._id,
            date: today
        }).select('doctorid')
        if (bookedAppointments.length > 0) {
            const bookedDoctorIds = bookedAppointments.map(appt => appt.doctorid.toString())
            availableDoctors = availableDoctors.filter(
                (doctor) => !bookedDoctorIds.includes(doctor._id.toString())
            )
        }
        console.log({ availableDoctors })
        res.render('showdoctors', { patient,availableDoctors })
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Internal Error' })
    }
})

router.post('/slots', async (req, res) => {
    try {
        const { name, email, password } = req.body
        const patient = new Patient({ name, email, password })
        const response = await patient.save()
        console.log('Data saved')
        
        const payload = {
            id: response.id
        };
        console.log(JSON.stringify(payload))
        const token = generateToken(payload)
        console.log({token})
        const today = new Date().toLocaleDateString('en-CA')
        await Doctor.updateMany(
            {},
            { $pull: { workingHours: { date: { $lt: today } } } } 
        )
        let availableDoctors = await Doctor.find({
            'workingHours.date': today,
            'workingHours.slots': { $exists: true, $not: { $size: 0 } }
        }).select('name gender specialization consultationFee workingHours')
        const bookedAppointments = await Appointment.find({
            patientid: response.id,
            date: today
        }).select('doctorid')
        const bookedDoctorIds = bookedAppointments.map(appt => appt.doctorid.toString())
        availableDoctors = availableDoctors.filter(
            doctor => !bookedDoctorIds.includes(doctor._id.toString())
        )
        console.log({ availableDoctors })
        res.render('showdoctors', { patient,availableDoctors })
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Internal Error' })
    }
})

router.get('/details',async (req,res)=>{
    try{
    const doctorId = req.query.id
    const patientId = req.query.Id
    const doctor = await Doctor.findOne({_id: doctorId})
    const patient = await Patient.findOne({_id: patientId})
    const today = new Date().toLocaleDateString('en-CA')
    const availableDoctors = await Doctor.find({
        '_id':doctorId,
        'workingHours.date': today,
        'workingHours.slots': { $exists: true, $not: { $size: 0 } }
    }).select('workingHours')
    availableDoctors.forEach(async (doctors) => {
        doctors.workingHours.forEach(async (workingHour)=>{
                const updateSlots = workingHour.slots.filter(slot =>{
                    const startTime = slot.split('-')[0].trim()
                    const slotTime = new Date(`${workingHour.date}T${startTime}:00`)
                    const currentTime = new Date()
                if (slotTime < currentTime) {
                    return false
                }
                return true
            })
            workingHour.slots = updateSlots
            await doctors.save()
        })
    })
    res.render('doctorslots',{doctor,availableDoctors,patient})
    }
    catch(err)
    {
        console.error("Error fetching doctor details:", err);
        res.status(500).send("Internal Server Error");
    }
})


router.post('/book', async (req, res) => {
    try {
        const { patientId, doctorId, slotTime } = req.body
        const doctor = await Doctor.findOne({ _id: doctorId })
        const patient = await Patient.findOne({ _id: patientId })
        const today = new Date().toLocaleDateString('en-CA')
        const workingHoursToday = doctor.workingHours.find(slot => slot.date === today)
        await Appointment.deleteMany({ date: { $lt: today } })
        const existAppointment = await Appointment.findOne({
            patientid: patientId,
            doctorid: doctorId,
            date: today,
        })
        if (!existAppointment) {
            const appointment = new Appointment({
                patientid: patientId,
                doctorid: doctorId,
                workingHours: [{ slots: slotTime }],
            })
            await appointment.save()
        } else {
            existAppointment.workingHours.push({ slots: slotTime})
            await existAppointment.save()
        }
        if (workingHoursToday) {
            workingHoursToday.slots = workingHoursToday.slots.filter(slot => slot !== slotTime);
        }
        await doctor.save();
        let availableDoctors = await Doctor.find({
            'workingHours.date': today,
            'workingHours.slots': { $exists: true, $not: { $size: 0 } },
        }).select('name gender specialization consultationFee workingHours')
        const bookedAppointments = await Appointment.find({
            patientid: patientId,
            date: today,
        }).select('doctorid')
        const bookedDoctorIds = bookedAppointments.map(appt => appt.doctorid.toString());
        availableDoctors = availableDoctors.filter(
            doctor => !bookedDoctorIds.includes(doctor._id.toString())
        )
        availableDoctors.forEach(async (doctors) => {
            doctors.workingHours.forEach(async (workingHour)=>{
                    const updateSlots = workingHour.slots.filter(slot =>{
                        const startTime = slot.split('-')[0].trim()
                        const slotTime = new Date(`${workingHour.date}T${startTime}:00`)
                        const currentTime = new Date()
                    if (slotTime < currentTime) {
                        return false
                    }
                    return true
                })
                workingHour.slots = updateSlots
                await doctors.save()
            })
        })
        res.render('showdoctors', { availableDoctors, patient })
    } catch (err) {
        console.error(err)
        res.status(500).send('Internal Server Error')
    }
})

router.get('/profile',async (req,res)=>{
    try{
        const patientId = req.query.id.trim()
        const patient = await Patient.findOne({_id:patientId})
        const today = new Date().toLocaleDateString('en-CA')
        await Appointment.deleteMany({ date: { $lt: today } })
        const appointments = await Appointment.find({patientid: patientId,date: today}).exec()
                  var doctordetails = await Promise.all(appointments.map(async (appointment)=>{
                  const doctor = await Doctor.findById(appointment.doctorid)
                  const slot = appointment.workingHours.map(hour=>hour.slots)
                  const status = appointment.workingHours.map(s=>s.status)
                  const result = slot.map((s, index) => ({
                    slot: s,
                    status: status[index]
                  }))
                  return {
                     doctorid: doctor._id,
                     name: doctor.name,
                     workingHours: result
                  }
        }))
        res.render('profile', {doctordetails,patient})
    }
    catch(err)
    {
        console.error(err)
        res.status(500).send('Internal Server Error')
    }
})

router.get('/attend',async (req,res)=>{
    try{
    const today = new Date().toLocaleDateString('en-CA')
    const patientId = req.query.id.trim()
    const patient = await Patient.findOne({_id:patientId})
    const doctorId = req.query.Id.trim()
    const s = req.query.slot
    const appointment = await Appointment.findOne({
        patientid: patientId,
        doctorid: doctorId,
        date: today
    })
    appointment.workingHours = appointment.workingHours.filter((hour) => {
        return hour.slots.trim() !== s
    })    
    await appointment.save()
    const appointments = await Appointment.find({patientid: patientId,date: today}).exec()
        const doctordetails = await Promise.all(appointments.map(async (appointment)=>{
                  const doctor = await Doctor.findById(appointment.doctorid)
                  const slot = appointment.workingHours.map(hour=>hour.slots)
                  const status = appointment.workingHours.map(s=>s.status)
                  const result = slot.map((s, index) => ({
                    slot: s,
                    status: status[index]
                  }))
                  return {
                     doctorid: doctor._id,
                     name: doctor.name,
                     workingHours: result
                  }
        }))
        res.redirect(`/patient/profile?id=${patient._id}`);
   }
   catch(err)
   {
     console.log(err)
   }
})

router.get('/reschedule', async (req, res) => {
    try {
        const today = new Date().toLocaleDateString('en-CA')
        const patientId = req.query.id.trim()
        const doctorId = req.query.Id.trim()
        const slotToRemove = req.query.slot.trim()
        const doctor = await Doctor.findOne({_id:doctorId})
        const patient = await Patient.findOne({_id:patientId})
        console.log(slotToRemove)
        const availableDoctors = await Doctor.find({
            _id: doctorId,
            'workingHours.date': today,
            'workingHours.slots': { $exists: true, $not: { $size: 0 } },
        }).select('name gender specialization consultationFee workingHours')
        availableDoctors.forEach(async (doctors) => {
            doctors.workingHours.forEach(async (workingHour)=>{
                    const updateSlots = workingHour.slots.filter(slot =>{
                        const startTime = slot.split('-')[0].trim()
                        const slotTime = new Date(`${workingHour.date}T${startTime}:00`)
                        const currentTime = new Date()
                    if (slotTime < currentTime) {
                        return false
                    }
                    return true
                })
                    workingHour.slots = updateSlots
                    await doctors.save()
            })
        })
        res.render('reschedule', { availableDoctors,doctor,patient,slotToRemove});
    } 
    catch(err){
        res.status(500).send("An error occurred while rescheduling.")
    }
})

router.post('/selectSlot',async (req,res)=>{
    try{
        const {patientId,doctorId,slotTime,prevslot} = req.body
        const patient = await Patient.findOne({_id:patientId})
        const today = new Date().toLocaleDateString('en-CA')
        const doctor = await Doctor.findOne({ _id: doctorId })
        const workingHoursToday = doctor.workingHours.find(slot => slot.date === today)
        if (workingHoursToday) {
            workingHoursToday.slots = workingHoursToday.slots.filter(slot => slot !== slotTime)
        }
        await doctor.save()
        const appointment = await Appointment.findOne({
            patientid: patientId,
            doctorid: doctorId,
            date: new Date().toLocaleDateString('en-CA'),
          })
          appointment.workingHours = appointment.workingHours.filter(
            (hour) => hour.slots.trim() !== prevslot
          )
          appointment.workingHours.push({ slots: slotTime})
          await appointment.save()
          res.redirect(`/patient/profile?id=${patient._id}`);
    }
    catch(err)
    {
        console.error(err)
        res.status(500).send('Internal Server Error')
    }
})

module.exports = router