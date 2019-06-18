const config = require('../config');
const Utils = require('./utils');
const rp = require('request-promise');
const Querystring = require('querystring');
const Url = require('url');
var formidable = require('formidable');
var fs = require('fs');
var database = require('./mongo-client');

module.exports = docSig;

function docSig(app) {

    app.get('/docSig/:filename', function (req, response, next) {
        console.log('here...');
        var filename = req.params.filename;
        console.log(filename);
        var tempFile = "./public/documents/" + filename;
        fs.readFile(tempFile, function (err, data) {
            response.contentType("application/pdf");
            response.send(data);
        });
    });

    app.post('/docSig/sign', function (req, res) {

        var filePath = req.files.doc.path.substring(6).replace(/\\/g,'/');
        console.log(filePath);
        console.log(req.files.doc.path);
        console.log(req.fields.username);

        var username = req.fields.username;


        var signatoryEmail = username;// 'aneesh.verenkar@gmail.com';//req.body.username;
        var documentUrl = config.localUrl + filePath;
        console.log(documentUrl);//'https://admit.washington.edu/sites/default/files/UW2015_FroshApp.pdf';//'http://daal.deltaschools.com/content/fever-online-book.pdf'; //

        var objectIds = ['2.5.4.3'];

        return signRequest(signatoryEmail, config.localUrl + '/docsig/callback', documentUrl, objectIds)

            .then((response) => {
                console.log(response);
                res.render('docSigCodeMatch.html', { codeMatch: response.data.checksum });
            });

    });

    app.post('/docsig/callback', function (req, res) {
        console.log('>>>>>>>>>>>>> doc sig callback hit');
        console.log(req.files.file.path.substring(17));
        console.log(req.query.address);

        database.updateCreditCardApplication(req.query.address, req.files.file.path.substring(17)).then(() => {
            console.log('success');
        })
            .catch((err) => {
                console.log(err);
                //res.send(500, 'error saving card');
            });
    });

    function signRequest(signatoryEmail, callbackUrl, documentUrl, objectIds) {
        const appId = 'f4ad7c0a0cda6382bea78eac7bbb95e6';
        const appSecret = '8c3bb8a5fc9160acebbb682c9ca4bc30';

        const payload = {
            iss: appId,
            signatory: signatoryEmail,
            callbackUrl: callbackUrl,
            documentUrl: documentUrl,
            objectIds: objectIds
        }

        // const payload = {
        //     objectIds: '2.5.4.3',
        //     nonce: 'test',
        //     emails: signatoryEmail,
        //     callbackUrl: callbackUrl,
        //     documentUrl: documentUrl,
        // }

        const header = { typ: 'JWT', iss: appId }
        const jwt = Utils.createHmacJws(payload, appSecret, header);
        //console.log(jwt);
        // return this.httpClient.post('newDocumentSignRequest?jwt=' + jwt)
        // var querystr = Querystring.stringify(jwt);
        // console.log(querystr);
        var path = '/newDocumentSignRequest?jwt=';
        const url = Url.resolve(config.walletServiceUrl, '/newDocumentSignRequest?jwt=' + jwt);
        //const url =  config.walletServiceUrl + path + '?' + Querystring.stringify(jwt)
        //   const url = config.walletServiceUrl;
        // const headers = {}

        // if(this.appId && this.appSecret) {
        //     headers['Authorization'] = getAuthHeader(this.backendUrl + url, this.appId, this.appSecret)
        // }

        const authAppId = 'f4ad7c0a0cda6382bea78eac7bbb95e6';
        const authAppSecret = '8c3bb8a5fc9160acebbb682c9ca4bc30';
        var backendUrl = url;

        const parameters = {
            iss: authAppId,
            aud: backendUrl,
        }

        const authHeader = { typ: 'JWT', iss: authAppId, exp: Utils.getUnixTime() + 300 }
        var authorization = 'Bearer ' + Utils.createHmacJws(parameters, authAppSecret, authHeader);
        console.log(url);
        console.log(authorization);


        return rp({
            uri: url,
            method: 'POST',
            headers: { 'Authorization': authorization },
            json: true
        });

        // rp.post({
        //     uri: url,
        //     json: true,
        //     headers: { 'Authorization': authorization }
        // }).then((response) => {
        //     console.log(status);
        // });
    }

}