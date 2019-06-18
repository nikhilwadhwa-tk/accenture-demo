const config = require('../config');
const oauth = require('./oauth-client');
const authorizeRequest = require('./jwt-service').authorizeRequest;
var database = require('./mongo-client');

module.exports = Routes;

function Routes(app) {

    app.get('/', function (req, res) {
        res.render('login.html');
    });

    app.post('/login', function (req, res) {
        oauth.login(req, res);
    });

    app.get('/register', function (req, res) {
        oauth.register(req, res);
    });

    app.get('/registrationPage', function (req, res) {
        res.render('register.html');
    });

      app.get('/docSigPage', function (req, res) {
        res.render('docSig.html');
    });


    app.get('/account', authorizeRequest, function (req, res) {
        database.getUser(req.jwt.userId).then((dbuser) => {

            database.getCards(dbuser.userId).then((cards) => {

            res.render('home-screen.html', {
                profile: {
                    email: dbuser.email, accountBalance: dbuser.accountBalance,
                    firstName: dbuser.firstName, lastName: dbuser.lastName, birthDate: dbuser.birthDate, gender: dbuser.gender, dlNumber: dbuser.dlNumber, creditCardApplication: dbuser.creditCardApplication, cards: cards
                }
            });

        })
        
        });
    });

}