/**
 * Created by Skeksify on 19/01/2017.
 */

var crypto = require('crypto'),
    moment = require('moment'),
    mongoose = require("mongoose").connect('mongodb://localhost/Giver'),
    Schema = mongoose.Schema,
    db = mongoose.connection,
    userAccounts = db.collection('userAccounts');

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback() { cl("Connection to MongoDB Established.") });

exports.signup = function (postData, cb) {
    userAccounts.findOne({ username: postData.username }, function (e, o) {
        if (o) {
            tossError('username-taken', cb);
        } else {
            var newUser = {username: postData.username};
            newUser.password = saltAndHash(postData.password);
            newUser.signupDate = moment().format('DD/MM/YYYY, HH:mm:ss');
            newUser.signupDateUnix = moment().format('x');
            newUser.active = false;
            userAccounts.insert(newUser, {safe: true}, function () {
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
