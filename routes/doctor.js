const express = require('express')
const router = express.Router()
const { jwtAuthMiddleware, generateToken } = require('./../jwt')
const Patient = require('./../models/patient')
const Doctor = require('./../models/doctor')
const app = express()
router.post('/schedule',async (req,res)=>{
        try{
            const doctorId = req.body.doctorId
            const doctor = await Doctor.findById(doctorId)
            const { startTime, endTime } = req.body
            const todayDate = new Date().toLocaleDateString('en-CA')
            console.log(todayDate)
            const slot = `${startTime} - ${endTime}`
            let todayworkinghours = doctor.workingHours.find(w => w.date === todayDate)
            if(!todayworkinghours)
            {
                todayworkinghours = { date: todayDate, slots: []}
                todayworkinghours.slots.push(slot)
                doctor.workingHours.push(todayworkinghours)
            }
            else{
                if (todayworkinghours.slots.includes(slot))
                {
                    const check = true
                    return res.render('DoctorSchedule',{doctor,check})
                }
                todayworkinghours.slots.push(slot)
            }
            await doctor.save()
            res.redirect(`/doctor/doctors?doctorId=${doctorId}`)
        }
        catch(err)
        {
            console.log(err)
            res.status(500).json({ error: 'Internal server error' })
        }
})

router.get('/doctors', async (req, res) => {
    try {
        const check = false
        const doctorId = req.query.doctorId
        const doctor = await Doctor.findById(doctorId)
        res.render('DoctorSchedule', { doctor , check})
    } 
    catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Internal server error' })
    }
})


router.get('/login', async (req, res) => {
    console.log('Rendering doctor login page')
    res.render('doctorlogin')
});
router.get('/signup', (req, res) => {
    console.log('Rendering doctor sign up page')
    res.render('doctorsignup')
});
router.post('/doctors', async (req, res) => {
    try {
        const check = false
        const { email, password } = req.body
        const doctor = await Doctor.findOne({ email: email })
        if (!doctor || !(await doctor.comparePassword(password))) {
            return res.status(401).json({ error: 'invalid email or password' })
        }
        const payload = {
            id: doctor.id
        };
        const token = generateToken(payload)
        console.log({token})
        res.render('DoctorSchedule',{doctor,check})
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: 'Internal Error' })
    }
})



router.post('/signups', async (req, res) => {
    try {
        const { name, email, password, gender,specialization, consultationFee } = req.body
        const doctor = new Doctor({ name, email, password, gender,specialization, consultationFee })
        const check = false
        const response = await doctor.save()
        console.log('Data saved')
        const payload = {
            id: response.id
        };
        const token = generateToken(payload)
        res.render('DoctorSchedule',{doctor,check})
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: 'Internal Error' })
    }
})
router.get('/end',async (req,res)=>{
    res.redirect('/')
})
module.exports = router;
