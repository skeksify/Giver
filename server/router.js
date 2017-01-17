function route(pathname) {
    //console.log("About to route a request for " + pathname);
    var res = null;
    switch (pathname){
        case '/send_mail':
            res = 'mail';
            break;
        case '/':
        case '':
            res = 'homepage';
        default :
            break;
    }
    return res;
}

exports.route = route;