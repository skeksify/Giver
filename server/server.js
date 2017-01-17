var http = require("http");
var url = require("url");
var mongoose = require("mongoose");
mongoose.connect('mongodb://localhost/bendb');
var Schema = mongoose.Schema;
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () { cl("Connection to MongoDB Established.") });

function start(route) {
    function onRequest(request, response) {
        var pathname = url.parse(request.url).pathname;
        var queryName = url.parse(request.url).query;
        if(pathname=='/favicon.ico')
            return;
        cl("Request for " + pathname + " received.");
        var page = route(pathname);
        var body = '';
        var pages = {
            'mail': function(){
                var mailer = require("./mailer");
                var mailResponse = mailer.mail({
                    from: 'Fred Foo ✔ <foo@blurdybloop.com>', // sender address
                    to: 'ben.haran@gmail.com', // list, of, receivers
                    subject: 'Hello ✔', // Subject line
                    text: 'Hello world ✔', // plaintext body
                    html: '<b>Hello world ✔</b>' // html body
                });
                return mailResponse;
            },
            'homepage': function(){
                var schema = new Schema({
                    name: String,
                    age: Number,
                    thoughts: Schema.Types.Mixed
                });
                var Men = mongoose.model('Men', schema);

                var Ben = new Men({
                    name: 'Ben Haran',
                    age: 30
                });
                var res = Ben.save(errHandler);
                cl('Saved BEN! Returned:');
                cl(res);
                return 'Ha!';
            }
        };

        fPrepared = pages[page];
        
        body = typeof(fPrepared) === 'function' ? fPrepared() : "Super awesome Node.js Error";

        response.writeHead(200, {"Content-Type": "text/plain"});
        response.write(body);
        response.end();
    }

    http.createServer(onRequest).listen(8888);
    cl("Server has started.");
}

exports.start = start;

function pp(x){
	ha = '';
	for(var Key in x)
		if(typeof(x[Key])=='string' || typeof(x[Key])=='number')
			ha += "\r\n'"+Key+"':'"+x[Key]+"'";
	return ha;
}

var die = function(msg){
    if(msg)
        console.error(msg)
    process.exit(1);
}

var errHandler = function (err) {
    if (err) return handleError(err);
    // saved!
};

function cl(val){
    console.log(val);
}