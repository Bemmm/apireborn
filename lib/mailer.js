import nodemailer from "nodemailer";
import sgTransport from 'nodemailer-sendgrid-transport';

const smtpTransport = nodemailer.createTransport(sgTransport({
    service: 'SendGrid',
    auth: {
        api_user: 'misha275',
        api_key: 'esetnod321'
    }
}));

let mailOptions = {
    from: "no-reply@lexterr.com",
};

exports.send = function(email, subject, body, from, attachments) {

    let sender = from || mailOptions.from;
    mailOptions.from = sender;

    mailOptions.to = email;
    mailOptions.subject = subject;
    mailOptions.html = body;
    if (attachments) mailOptions.attachments = attachments;

    console.log(mailOptions);

    smtpTransport.sendMail(mailOptions, function(err, response) {
        if (err) return console.error(err);
        console.log("Message sent: " + email + ' ' + response.message);
    });
};