var fs, mailer, dbApi, _, cookieParser, compiledHomepage,
    usersLastServedItem = {};

fs = require('fs');
mailer = require('./mailer');
dbApi = require('./dbApi');
_ = require('underscore');
cookieParser = require('cookie-parser');

function loadIndexFile() {
    fs.readFile('index.html', 'utf8', function (err, contents) {
        err ? cl(err) : compiledHomepage = _.template(contents);
    });
}

loadIndexFile();

module.exports = function (eApp) {
    eApp.get('/', function (req, res) {
        loadIndexFile(); // Load every call for DEV, take out (Asynch, might need another refresh)
        // Not enough cookiez or logged in
        if (req.session.user || !req.cookies.username || !req.cookies.password) {
            makeTemplateParams(req, function (o) {                
                res.send(compiledHomepage(o));                
            })
        } else { // Try by cookiez
            dbApi.autoLogin(req.cookies.username, req.cookies.password, function (o) {
                if (o) {
                    req.session.user = o;
                    cl(req.session.user, req.cookies.username, 'AutoLogin');
                }
                makeTemplateParams(req, function (o) {
                    res.send(compiledHomepage(o));
                })
            });
        }
    });

    eApp.get('/update', function (req, res) {
        if (req.session.user) {
            poll(req, res);
        } else {
            res.json({ success: false, error: 'not-logged-in' });
        }
    })

    eApp.post('/give', function (req, res) {
        if (req.session.user) {
            dbApi.give(req, function (err, user) {
                res.json(err || user);
            })
        } else {
            res.json({ success: false, error: 'not-logged-in' });
        }
    })

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
                makeInitParams(req, function (o) {
                    res.json({success: true, initParams: o });
                })
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

function poll(req, res) {
    cl('Polling')
    dbApi.getList(req.session.user._id, function (item) {
        if (item.length) {
            usersLastServedItem[req.session.user._id] = getLastEntry(item);
            res.json(item);
        } else { // Nothing new? Recurse, soon
            setTimeout(poll.bind(poll, req, res), 7500);
        }
    }, usersLastServedItem[req.session.user._id]) // After last served
}

function getLastEntry(list) {
    var i, result;
    for (i = 0; i<list.length; i++) {
        if (!result || list[i].timeUnix > result) {
            result = list[i].timeUnix;
        }
    }
    return result;
}

function makeInitParams(req, cb) {
    var initParams = { isLogged: !!req.session.user };

    if (initParams.isLogged) {
        initParams.username = req.session.user.username;
        dbApi.getList(req.session.user._id, function (queriedList) {
            usersLastServedItem[req.session.user._id] = getLastEntry(queriedList);
            initParams.list = queriedList;
            dbApi.getUsers(function (queriedUsers) {
                initParams.users = queriedUsers;
                cb(initParams);                
            })
        })
    } else {
        cb(initParams);        
    }
}

function makeTemplateParams(req, cb) {
    makeInitParams(req, function (o) {
        cb({
            initParams: JSON.stringify(o),
            session: req.session // Don't send all
        })        
    })
}

function cl() {
    for (var key in arguments) {
        console.log(JSON.stringify(arguments[key], null, 2));
    }
}