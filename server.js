const express = require('express')
const app = express()
const db = require('./db')
const bodyParser = require('body-parser')
const path = require('path')
const patientRoute = require('./routes/patient')
const doctorRoute = require('./routes/doctor')
app.use(bodyParser.json())
app.use(express.urlencoded({ extended: true })); 
app.use(express.json());
require('dotenv').config()
app.set('view engine','ejs')
app.set('views', path.join(__dirname, 'views'));
app.use('/css', express.static(path.join(__dirname, 'assets/css')));
app.use('/img', express.static(path.join(__dirname, 'assets/img')));
const port = process.env.PORT
const Patient =  require('./models/patient')
const Doctor = require('./models/doctor')
const Appointment = require('./models/appointment')
const cron = require('node-cron')
const nodemailer = require('nodemailer')
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS  
    },
    logger: true, 
    debug: true
})
async function sendEmail(patientEmail, subject, text) {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: patientEmail,
        subject: subject,
        text: text
    };

    try {
        console.log(`Sending email to: ${patientEmail}`);
        await transporter.sendMail(mailOptions);
        console.log('Email sent to:', patientEmail);
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

cron.schedule('* * * * *', async () => {
    try {
        console.log('Running cron job to check for no-shows and send emails...');
        const appointments = await Appointment.find({
            date: new Date().toLocaleDateString('en-CA'),
            'workingHours.status': 'Booked'
        })
        console.log(`Found ${appointments.length} appointments.`)
        const currentTime = new Date();
        for (const appointment of appointments) {
            for (const slot of appointment.workingHours) {
                const startTime = slot.slots.split(' - ')[0];
                const slotTime = new Date(`${appointment.date}T${startTime}:00`);
                const timeDifference = currentTime - slotTime;
                const gracePeriod = 2 * 60 * 1000;
                console.log(`Processing slot: ${slot.slots}`);
                console.log('Current Time:', currentTime);
                console.log('Slot Time:', slotTime);
                console.log('Time Difference (ms):', timeDifference);
                console.log('Grace Period (ms):', gracePeriod);
                if (timeDifference > gracePeriod) {
                    slot.status = 'No-show'
                    const patient = await Patient.findById(appointment.patientid);
                    const doctor = await Doctor.findById(appointment.doctorid);
                    if (!patient) {
                        console.error(`Patient not found for ID: ${appointment.patientid}`);
                        continue;
                    }
                    const subject = 'Dsa App Appointment Missed Notification';
                    const text = `
Dear ${patient.name},

We noticed that you missed your scheduled appointment with Dr. ${doctor.name}. 
The appointment was scheduled for ${slot.slots} on ${appointment.date}. 

Please contact us to reschedule at your earliest convenience. 

You can:
            - Reply to this email.
            - Visit our rescheduling portal at 
                    https://das-app-9b93.onrender.com to choose a new time slot.

We look forward to seeing you soon.

Best regards,  
Your Das App
`;
                    console.log(`Sending email to: ${patient.email}`);
                    await appointment.save();
                    await sendEmail(patient.email, subject, text)
                }
            }
        }
    } catch (err) {
        console.error('Error running cron job:', err)
    }
})

app.get('/',(req,res)=>{
    res.render('main')
})
app.use('/patient',patientRoute)
app.use('/doctor',doctorRoute)
app.listen(port,()=>{
    console.log(`listen on port ${port}`)
})