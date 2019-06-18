const config = module.exports = {}

config.debug = process.env.DEBUG ? true : false;
config.port = process.env.PORT || 3000;
config.jwtTokenSecret = 'fcc2c420-e519-4185-a76f-9eddc1926e24';
config.walletServiceUrl = 'https://wallet.trustedkey.com'
config.issuerServiceUrl = 'https://issuer.trustedkey.com'
/*

I will get rid of these secrets and ids before making repo public - Alvin

*/

config.mongoDbUri = 'mongodb://heroku_gp2x0d5k:dinf3f4q3fkgnrfjdobbeqd0hk@ds255332.mlab.com:55332/heroku_gp2x0d5k';
    config.oauthClientId = 'f4ad7c0a0cda6382bea78eac7bbb95e6';
    config.oauthClientSecret = '8c3bb8a5fc9160acebbb682c9ca4bc30';
    config.authorizeCallbackRouteWeb = '/web/callback'
    config.authorizeCallbackRouteMobile = '/mobile/callback'

if (config.debug) {
    console.log('development!');
    config.localUrl = 'http://localhost:3000';
} else {
    console.log('production!');
    config.localUrl = 'https://nwcu.herokuapp.com';
}
