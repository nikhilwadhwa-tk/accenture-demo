var express = require('express');
var ejs = require('ejs');
var config = require('./config');
var formidable = require('express-formidable');

var app = express();
app.use(express.static('./public'));
app.listen(config.port);

app.use(formidable({
    encoding: 'utf-8',
    uploadDir: './public/documents',
    multiples: false,
    keepExtensions: true 
}));

app.set('views', 'public' + '/views');
app.engine('html', require('ejs-locals'));

var oauthClient = require('./server/oauth-client');
var bankService = require('./server/bank-endpoints');
var routes = require('./server/routes');
var docSig = require('./server/docSig');

routes(app);
oauthClient.oauthCallback(app);
bankService(app);
docSig(app);