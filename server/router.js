var fs, mailer, dbApi, _, cookieParser;

fs = require('fs');
mailer = require('./mailer');
dbApi = require('./dbApi');
_ = require('underscore');
cookieParser = require('cookie-parser');

module.exports = function (eApp) {
    var compiledHomepage;
    fs.readFile('index.html', 'utf8', function (err, contents) {
        err ? cl(err) : compiledHomepage = _.template(contents);
    });

    eApp.get('/', function (req, res) {
        // Not enough cookiez or logged in
        if (req.session.user || !req.cookies.username || !req.cookies.password) {
            res.send(compiledHomepage(makeTemplateParams(req)));
        } else { // Try by cookiez
            dbApi.autoLogin(req.cookies.username, req.cookies.password, function (o) {
                if (o) {
                    req.session.user = o;
                }
                cl(req.session.user, req.cookies.username, 'AutoLogin');
                res.send(compiledHomepage(makeTemplateParams(req)));
            });
        }
    });

    eApp.post('/signup', function (req, res) {
        dbApi.signup(req.body, function (err, user) {
            res.json(err || user);
        })
    })

    eApp.post('/login', function (req, res) {
        dbApi.login(req.body.username, req.body.password, function (e, o) {
            if (e) {
                res.json(e);
            } else {
                req.session.user = o;
                if (req.body.rm === 'true') {
                    res.cookie('username', o.username, {maxAge: 900000});
                    res.cookie('password', o.password, {maxAge: 900000});
                }
                res.json({success: true, initParams: makeInitParams(req)});
            }
        });
    });

    eApp.get( '/logout', function(req, res){
        req.session.destroy(function(){
            req.session = null;
            res.clearCookie('password');
            res.json({ success: true });
        });
    })
}

function makeInitParams(req) {
    var initParams = {
        isLogged: !!req.session.user,
    };

    if (initParams.isLogged) {
        initParams.username = req.session.user.username;
    }
    return initParams;
}

function makeTemplateParams(req) {
    result = {
        initParams: JSON.stringify(makeInitParams(req)),
        session: req.session // Don't send all
    }
    return result;
}

function cl() {
    console.log.apply(console.log, arguments);
}