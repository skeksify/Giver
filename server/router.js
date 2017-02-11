var fs, mailer, dbApi, _, cookieParser, compiledHomepage,
    usersLastServedItem = {}, http, https;

http = require('http');
https = require('https');
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
                }
                makeTemplateParams(req, function (o) {
                    res.send(compiledHomepage(o));
                })
            });
        }
    });

    eApp.get('/list', function (req, res) {
        if (req.session.user) {
            makeInitParams(req, function (o) {
                res.json({success: true, initParams: o });
            }, req.query)
        } else {
            res.json({ success: false, error: 'not-logged-in' });
        }
    });
    
    eApp.get('/poll', function (req, res) {
        if (req.session.user) {
            poll(req, res);
        } else {
            res.json({ success: false, error: 'not-logged-in' });
        }
    });

    eApp.post('/archive', function (req, res) {
        if (req.session.user) {
            archive(req, res);
        } else {
            res.json({ success: false, error: 'not-logged-in' });
        }
    });

    eApp.post('/read', function (req, res) {
        if (req.session.user) {
            read(req, res);
        } else {
            res.json({ success: false, error: 'not-logged-in' });
        }
    });

    eApp.post('/give', function (req, res) {
        var url;
        if (req.session.user) {
            var cb = function (metaTags) {
                dbApi.give(req, metaTags, function (err, user) {
                    res.json(err || user);
                })
            }
            url = req.body.link.match(/(https?):\/\/([^\/]*)(.*)/);
            if (url) {
                httpRequest(url[1] === 'https', url[2], url[3], function (urlHtml) {
                    var metaTags = extractMetadataTag(urlHtml);
                    cb(metaTags);
                })
            } else {
                cb({});
            }
        } else {
            res.json({ success: false, error: 'not-logged-in' });
        }
    });

    eApp.post('/signup', function (req, res) {
        dbApi.signup(req.body, function (err, user) {
            res.json(err || user);
        })
    });

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
    });
}

function read(req, res) {
    var data = {
        user: req.session.user._id,
        item_id: req.body.id,
        read: req.body.read.is('true')
    };
    dbApi.read(data, function(result) {
        res.json(result);
    });
}

function archive(req, res) {
    var data = {
        user: req.session.user._id,
        item_id: req.body.id,
        archived: req.body.archived.is('true')
    }
    dbApi.archive(data, function(result) {
        res.json(result);
    });
}
function poll(req, res) {
    dbApi.getList(req.session.user._id, function (item) {
        if (item.length) {
            usersLastServedItem[req.session.user._id] = getLastEntry(item);
            res.json(item);
        } else {
            // setTimeout(poll.bind(poll, req, res), 7500);
            // No long polling, respond empty
            res.json([]);
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

function makeInitParams(req, cb, listSettings) {
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
        }, null, listSettings)
    } else {
        cb(initParams);        
    }
}

function makeTemplateParams(req, cb) {
    makeInitParams(req, function (o) {
        cb({
            initParams: JSON.stringify(o).replace(/\'/g, '\\\''),
            session: req.session // Don't send all
        })        
    })
}

function httpRequest(secure, host, path, cb) {
    (secure ? https : http).get({
        host: host,
        path: path,
        headers: {
            accept: '*/*'
        }
    }, function(response) {
        var body = [];
        response.on('data', function(d) {
            body.push(d);
        });
        response.on('end', function() {
            cb(body.join(''));
        });
    }).on('error', function (e) {
        cl('HTTP Error', e);
        cb();
    })
}

function cleanMarkup(html) {
    return html
        .toLowerCase()
        .substr(0, html.indexOf('>', html.lastIndexOf('meta')) + 1)
        .replace(/"/g,'\'')
        .replace(/\n/g,' ')
        .replace(/\s\s+/g,' ');
}

function getTitle(html) {
    var result = html.match(/<\s*title\s*>(.*)<\s*\/\s*title\s*>/);
    return result ? (result[1] || '') : '';
}

function extractMetadataTag(html) {
    var result = {};

    if (html && html.trim()) {
        cleanMarkup(html)
            .split('<')
            .filter(function (tag) {
                return tag.indexOf('meta') === 0;
            }) // Filter only meta tags
            .forEach(function (tag) {
                var name = tag.match(/name\s*=\s*'([^']*)'/),
                    property = tag.match(/property\s*=\s*'([^']*)'/),
                    content = tag.match(/content\s*=\s*'([^']*)'/),
                    key = name ? name[1] : (property ? property[1] : ''),
                    val = content ? content[1] : '',
                    catKey = key.split(':');

                if (catKey.length === 2) {
                    if (!result[catKey[0]]) {
                        result[catKey[0]] = {};
                    }
                    result[catKey[0]][catKey[1]] = val;
                } else {
                    result[key] = val;
                }
            })
        result.title = getTitle(html);
    }
    return result;
}

function cl() {
    for (var key in arguments) {
        console.log(JSON.stringify(arguments[key], null, 2));
    }
}