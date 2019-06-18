const rp = require('request-promise');
const ClientOAuth2 = require('client-oauth2')
const Url = require('url');
const config = require('../config');
var database = require('./mongo-client');
const moment = require('moment');
const Jwt = require('./jwt-service');
 var urlencode = require('urlencode');

module.exports = {
    login: function (req, res) {
        const uri = loginClientPage.code.getUri();
        var email = req.fields.email;
        var message = 'Authenticate';
        var url = uri + '&login_hint=' + urlencode(email);
        console.log('redirecting to >>>', url);
        res.redirect(url);
    },

    loginToken: function (req, res, email) {
        const uri = loginClient.code.getUri();
        var url = uri + '&login_hint=' + urlencode(email);
        console.log('redirecting to >>>', url);
        res.redirect(url);
    },

    mobileLogin: function(req,res){
        const uri = loginClient.code.getUri()
        const email = req.query.email
        const url = uri + '&login_hint=' + urlencode(email)
      
        return rp({uri: url,
          method: 'GET',
          json: true})
           .then((response) =>{
            res.json({
              checksum: response.data.checksum,
              nonce: response.data.nonce
            })
           })
          .catch ( (e) =>{
              res.send(e)
          }) 
       },
       mobileLoginConfirm: function(req,res){
        return authorizeUser(req, res, false)
      },

    register: function (req, res) {
        var uri = registerClient.code.getUri();
        if (claims && claims.hasOwnProperty("userinfo")){
            uri = uri + '&claims=' + urlencode.encode(JSON.stringify(claims));
        }        
        console.log('redirecting to >>>', uri);
        res.redirect(uri);
    },

    oauthCallback: function (app) {
        app.get(config.authorizeCallbackRouteMobile, function (req, res) {
            const callback_error = req.query.error;
            const state = req.query.state;

            console.log('>>> callback hit', req.originalUrl);

             if (state === 'signature') {
                return handleSignature(req, res)
            }

            if (callback_error === 'access_denied') {
                res.render('access-denied.html');
                return;
            }

            if (state === 'register') {
                return registerUser(req, res);
            }

            if (state === 'login') {
                return authorizeUser(req, res, false);
            }

            if (state === 'loginPage') {
                return authorizeUser(req, res, true)
            }
        });

        app.get(config.authorizeCallbackRouteWeb, function (req, res) {
            const callback_error = req.query.error;
            const state = req.query.state;

            console.log('>>> callback hit', req.originalUrl);

             if (state === 'signature') {
                return handleSignature(req, res)
            }

            if (callback_error === 'access_denied') {
                res.render('access-denied.html');
                return;
            }

            if (state === 'register') {
                return registerUser(req, res);
            }

            if (state === 'login') {
                return authorizeUser(req, res, false);
            }

            if (state === 'loginPage') {
                return authorizeUser(req, res, true)
            }
        });
    },

    logout: function (req, res) {
        var accessToken = req.jwt.accessToken;
        const route = '/oauth/logout?access_token=' + accessToken + "&return_url=" + config.localUrl;
        const url = Url.resolve(config.walletServiceUrl, route);
        res.clearCookie('token');
        res.redirect(url);
    },

     signatureRequest: function (req, res, message, email) {
        const uri = signatureClient.code.getUri();
        var url = uri + '&login_hint=' + urlencode(email) + '&message=' + urlencode(message); //adding message and email to endpoint
        console.log('redirecting to >>>', url);
        res.redirect(url);
    }
};

const loginClient = OAuthClient('login', ['openid'], config.authorizeCallbackRouteMobile);
const loginClientPage = OAuthClient('loginPage', ['openid'], config.authorizeCallbackRouteWeb);
const registerClient = OAuthClient('register', ['openid', 'profile', 'email', 'documentID'], config.authorizeCallbackRouteWeb);
const signatureClient = OAuthClient('signature', ['openid'], config.authorizeCallbackRouteWeb);

// Request individual claims
const claims = {
    "userinfo":
    {
        "https://auth.trustedkey.com/publicKey": null,
        "given_name": {
            "essential": false
        },
        "gender": {
            "essential": false
        },        
        "address": {
            "essential": true
        }
    }
};

function OAuthClient(state, scopes, callbackRoute) {
    const client = new ClientOAuth2({
        clientId: config.oauthClientId,
        clientSecret: config.oauthClientSecret,
        accessTokenUri: Url.resolve(config.walletServiceUrl, '/oauth/token'),
        authorizationUri: Url.resolve(config.walletServiceUrl, '/oauth/authorize'),
        redirectUri: Url.resolve(config.localUrl, callbackRoute),
        scopes: scopes,
        state: state
    });

    return client;
}


function handleSignature(req, res) {
    const callback_error = req.query.error;
    const state = req.query.state;

    var merchUrl = 'https://merchanttks.azurewebsites.net/confirmation?approved=';

             if (callback_error === 'access_denied') {
                 res.redirect(merchUrl+'denied'+'&userName=');
              return;
              }


    // get access token from code
    signatureClient.code.getToken(req.originalUrl).then((response) => {
        console.log('>>> got access token', response.accessToken);

        accessToken = response;

        return oauthRequest('/oauth/user', accessToken);
    })

        // request user information from wallet
        .then((response) => {
            console.log('>>> wallet info received', response);

            ////// failed to identify user, exit -- //
            if (!response) {
                res.json({error: 'profile request failed from wallet service'})
                return;
            }

            userId = response.sub;
            return database.getUser(userId);
        })

        // create JWT token and send response
        .then((dbuser) => {
            if (!dbuser) {
                console.log('account does not exist, please register');
                res.status(403).json('no account with id exists')
                return;
            }

             

              res.redirect(merchUrl+'signed'+'&userName='+dbuser.firstName+" "+dbuser.lastName);

        })

        .catch((err) => {
            console.warn('>>> exception thrown in callback', err);
            res.sendStatus(500, 'error');
        });

}


function authorizeUser(req, res, showPage) {
    var accessToken;
    var userId;
    var client;

    if (showPage) {
        client = loginClientPage;
    } else {
        client = loginClient;
    }

    // get access token from code
    client.code.getToken(req.originalUrl).then((response) => {
        console.log('>>> got access token', response.accessToken);

        accessToken = response;

        return oauthRequest('/oauth/user', accessToken);
    })

        // request user information from wallet
        .then((response) => {
            console.log('>>> wallet info received', response);

            ////// failed to identify user, exit -- //
            if (!response) {
                res.json({error: 'profile request failed from wallet service'})
                return;
            }

            userId = response.sub;

            return database.getUser(userId);
        })

        // create JWT token and send response
        .then((dbuser) => {
            if (!dbuser) {
                console.log('account does not exist, please register');
                res.status(403).json('no account with id exists')
                return;
            }

            const walletToken = accessToken.accessToken;
            const jwtToken = createJwtToken(dbuser, walletToken);

            if (jwtToken) {
                addJwtToResponse(res, jwtToken);
                //show page instead
                if (showPage) {
                    res.redirect('/account');
                } else {
                    res.json({success: 'success'})
                }
            } else {
                res.json('failed to create jwt token')
                database.deleteUser(dbUser.userId);
            }
        })

        .catch((err) => {
            console.warn('>>> exception thrown in callback', err);
            res.json({error: err})
        });

}

function registerUser(req, res) {
    var accessToken;
    var wallet_userInfo;
    var local_userInfo;

    // get access token from code
    registerClient.code.getToken(req.originalUrl).then((response) => {
        console.log('>>> got access token', response.accessToken);

        accessToken = response;
        return oauthRequest('/oauth/user', accessToken);
    })

        // request user information from wallet
        .then((response) => {
            console.log('>>> wallet info received', response);

            wallet_userInfo = response;
            ////// failed to identify user, exit -- //
            if (!wallet_userInfo) {
                res.json({error: 'profile request failed from wallet service'})
                return;
            }

            return database.getUser(wallet_userInfo.user_id);
        })

        // register new user
        .then((dbUser) => {
            console.log('>>> registering new user');

            // user already exists!
            if (dbUser) {
                console.log('>>> user with id already exists!', wallet_userInfo.user_id);
                return dbUser;
            }


            const newUser = {

                userId: wallet_userInfo.user_id,

                userAddress: wallet_userInfo.root_address,

                firstName: wallet_userInfo.given_name,

                lastName: wallet_userInfo.family_name,

                email: wallet_userInfo.email,

                dlNumber: wallet_userInfo.document_id,

                birthDate: wallet_userInfo.birthdate,

                gender: wallet_userInfo.gender,

                creditCardApplication: null

            };

            return database.registerUser(newUser);
        })

        // create JWT token and send response
        .then((dbuser) => {
            if (!dbuser) {
                console.log('failed to create user');
                res.send(500, 'internal server error.');
                return;
            }

            const walletToken = accessToken.accessToken;
            const jwtToken = createJwtToken(dbuser, walletToken);

            if (jwtToken) {
                addJwtToResponse(res, jwtToken);
               res.render('registration-success.html');
            } else {
                res.send(500, 'failed to create jwt token');
                database.deleteUser(dbUser.userId);
            }
        })

        .catch((err) => {
            console.warn('>>> exception thrown in callback', err);
            res.send(500, 'error');
        });

}

function createJwtToken(user, accessToken) {
    if (!user) {
        console.log('failed to create token with user', user);
        return null;
    }

    if (!accessToken) {
        console.log('failed to create JWT token with accessToken', accessToken);
        return null;
    }

    const expires = moment().add(1, 'days').valueOf();
    const jwtToken = Jwt.createToken({
        userId: user.userId,
        expires: expires,
        accessToken: accessToken
    });

    return jwtToken;
}

function addJwtToResponse(res, jwtToken) {
    const expires = moment().add(1, 'days').valueOf();
    const jwtCookie = [
        'token=' + jwtToken,
        'expires=' + expires,
        'path=/'].join(';');

    console.log('>>>>> sending jwt token to client');
    res.set({
        'Set-Cookie': jwtCookie,
        'X-Auth-Token': jwtToken
    });
}

function oauthRequest(route, token) {
    var options = token.sign({
        method: 'GET', url: Url.resolve(config.walletServiceUrl, route)
    });

    return rp({
        uri: options.url,
        method: options.method,
        headers: options.headers,
        json: true
    });

}