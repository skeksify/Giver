/**
 * Created by Skeksify on 12/1/14.
 */

var nodemailer = require('nodemailer');


function mail(mailOptions){
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
        if(error){
            console.log(error);
        }else{
            console.log('Message sent: ' + info.response);
        }
    });

    return 'Mailed this guy: \'' + mailOptions.to + '\'';
}

exports.mail = mail;