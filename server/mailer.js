/**
 * Created by Skeksify on 12/1/14.
 * **** 18/1/17
 */

var nodemailer = require('nodemailer');


function mail(mailOptions, cb){
    // create reusable transporter object using SMTP transport
    var transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: 'ben.prototype.haran@gmail.com',
            pass: 'Decapitator99'
        }
    });

    // No need to recreate the transporter object.

    // send mail with defined transport object
    transporter.sendMail(mailOptions, function(error, info){
        console.log(error || 'Message sent: ' + info.response);
        cb(!error);
    });

    return 'Mailed this guy: \'' + mailOptions.to + '\'';
}

exports.mail = mail;