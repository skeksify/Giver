/**
 * Created by Skeksify on 19/01/2017.
 */
var crypto, moment, mongoose, db, userAccounts, givenItems,
    isLocal = 0,
    dbURI = !isLocal ? 'mongodb://main_dev:006befbc58fd8611725822895@ds129189.mlab.com:29189/giver' : 'mongodb://localhost/Giver';

crypto = require('crypto');
moment = require('moment');
mongoose = require("mongoose").connect(dbURI);
db = mongoose.connection;
userAccounts = db.collection('userAccounts');
givenItems = db.collection('givenItems');

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback() { cl("Connection to MongoDB Established.") });

exports.give = function (req, meta, cb) {
    if (!"DataValid") {
        tossError('invalid-data', cb);
    } else {
        var newGivenItem = {
            from: makeId(req.session.user._id),
            to: makeId(req.body.to_id),
            tags: req.body.tags,
            requires: req.body.requires,
            message: req.body.message,
            link: req.body.link,
            time: moment().format('DD/MM/YYYY, HH:mm:ss'),
            timeUnix: moment().format('x')
        };
        !!meta && (newGivenItem.metaTags = meta);

        givenItems.insert(newGivenItem, { safe: true }, function () {
            cb(null, { success: true/*, user: newUser._id */});
        });
    }
}

exports.getList = function (ownerId, cb, afterTime) {
    var match = { "to": makeId(ownerId) };
    if (afterTime) {
        match.timeUnix = { '$gt': afterTime };
    }
    givenItems.aggregate([
        { $match: match },
        { $sort : { timeUnix: 1 } },
        {
            $lookup: {
                from: "userAccounts",
                localField: "from",
                foreignField: "_id",
                as: "sender"
            }
        },
        { $project: {
            "message": 1,
            "requires": 1,
            "tags": 1,
            "link": 1,
            "time": 1,
            "timeUnix": 1,
            "sender._id": 1,
            "metaTags.title": 1,
            "metaTags.og.image": 1
        }}
    ], errOr(cb));
}


exports.getUsers = function (cb) {
    userAccounts.aggregate([
        { $project: {
            "username": 1
        }}
    ], errOr(cb));
}


exports.signup = function (postBody, cb) {
    userAccounts.findOne({ username: postBody.username }, function (e, o) {
        if (o) {
            tossError('username-taken', cb);
        } else {
            var newUser = {
                username: postBody.username,
                password: saltAndHash(postBody.password),
                signupDate: moment().format('DD/MM/YYYY, HH:mm:ss'),
                signupDateUnix: moment().format('x'),
                active: false
            };
            userAccounts.insert(newUser, { safe: true }, function () {
                cl('Added ', newUser);
                cb(null, {success: true/*, user: newUser._id */});
            });
        }
    });
}

exports.login = function (username, password, cb) {
    userAccounts.findOne({ username: username }, function (e, o) {
        if (o === null) {
            tossError('user-not-found', cb);
        } else {
            validatePassword(password, o.password, function (err, res) {
                if (res) {
                    cb(null, o);
                } else {
                    tossError('invalid-password', cb);
                }
            });
        }
    });
}

exports.autoLogin = function(username, password, cb){
    userAccounts.findOne({ username:username }, function(e, o) {
        cb((o && o.password === password) ? o : null);
    });
}

function tossError(str, cb) {
    cb({ success: false, error: str })
}
function cl() {
    console.log.apply(console.log, arguments);
}
function saltAndHash(pass) {
    var salt = generateSalt();
    return (salt + md5(pass + salt));
}
function generateSalt() {
    var set = '0123456789abcdefghijklmnopqurstuvwxyzABCDEFGHIJKLMNOPQURSTUVWXYZ';
    var salt = '';
    for (var i = 0; i < 10; i++) {
        var p = Math.floor(Math.random() * set.length);
        salt += set[p];
    }
    return salt;
}
function md5(str) {
    return crypto.createHash('md5').update(str).digest('hex');
}
function validatePassword(plainPass, hashedPass, callback) {
    var salt = hashedPass.substr(0, 10);
    var validHash = salt + md5(plainPass + salt);
    callback(null, hashedPass === validHash);
}
function errOr(cb) {
    return function (e, o) {
        (e ? cl : cb)(e || o);
    }
}
function makeId(idStr) {
    return mongoose.Types.ObjectId(idStr);
}
