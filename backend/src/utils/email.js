const nodemailer = require('nodemailer');

function createTransporter() {
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  return null;
}

const transporter = createTransporter();

async function sendNewTaskEmail(tasks, recipient) {
  if (!tasks || tasks.length === 0) return;

  const subject = 'New Task Alert';
  const lines = tasks.map((t) => `- ${t.title}${t.description ? ': ' + t.description : ''}`);
  const text = `New tasks created in the last 5 minutes:\n\n${lines.join('\n')}`;

  const toAddress = recipient || process.env.EMAIL_USER;

  if (transporter) {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: toAddress,
      subject,
      text,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.info('Email sent to', toAddress, info.response || info.messageId);
    } catch (err) {
      console.error('Error sending email to', toAddress, 'falling back to console log', err);
      console.log(text);
    }
  } else {
    console.log('No email credentials provided. New tasks for', toAddress, ':');
    console.log(text);
  }
}

module.exports = { sendNewTaskEmail };
