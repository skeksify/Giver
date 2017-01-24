var http, url, express, eApp, session, bodyParser, cookieParser,
    upperDir = __dirname.substr(0, __dirname.lastIndexOf('\\'));

cl(__dirname, upperDir, '@@@');

http = require("http");
url = require("url");
express = require('express');
eApp = express();
session = require('express-session');
bodyParser = require('body-parser');
cookieParser = require('cookie-parser');

eApp.set('port', process.env.PORT || 8888);
eApp.use('/rj', express.static(upperDir + '/scripts'));
eApp.use('/rs', express.static(upperDir + '/style'));

eApp.use(session({secret: 'Teleki', resave: false, saveUninitialized: true}));
eApp.set('view engine', 'html');

eApp.use(cookieParser());
eApp.use(bodyParser.urlencoded({ extended: true }));

function start(router) {
    router(eApp);
    http.createServer(eApp).listen(eApp.get('port'), function(){
        cl("Express server listening on port " + eApp.get('port') + '@@');
        cl(__dirname, upperDir, '@@@');
    })
}

exports.start = start;

function die(msg) {
    msg && console.error(msg);
    process.exit(1);
}
function errHandler(err) {
    if (err) return handleError(err);
}
function cl(val){
    console.log(val);
}