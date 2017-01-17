var fs = require('fs'),
    mailer = require('./mailer');

module.exports = function(eApp) {
    eApp.get('/', function (req, res) {
        fs.readFile('index.html', 'utf8', function(err, contents) {
            res.send(contents);
        });
    });
    
    eApp.post('/send', function (req, res) {
        var mailResponse = mailer.mail({
            from: 'Fred Foo ✔ <foo@blurdybloop.com>', 
            to: 'ben.haran@gmail.com',
            subject: 'Hello ✔', 
            text: 'Hello world ✔',
            html: '<b>Hello ' + req.body.user + ' try ' + req.body.link + '✔</b>'
        }, function (result) {
            res.send(result);
        });
        return mailResponse;
    })
}