const config = require('../config');
const oauth = require('./oauth-client');
const database = require('./mongo-client');
const authorizeRequest = require('./jwt-service').authorizeRequest;


module.exports = BankEndpoints;

function BankEndpoints(app) {

    var RP_AASA = {
        "applinks": {
          "apps": [],
          "details": [
            {
              "appID": "ZYW2EGN42G.com.trustedkey.demobank",
              "paths": ["*"]
            }
          ]
        }
      }
      app.get('/apple-app-site-association', function(req, res, next) {
          //  res.set('Content-Type', 'application/json');
           res.json(RP_AASA);
      });

    app.get('/getLoginToken', function (req, res) {
        var email = req.query.userName;
        oauth.loginToken(req, res, email);
    });

    app.get('/logout', authorizeRequest, function (req, res) {
        oauth.logout(req, res);
    });

    app.get('/getUser', authorizeRequest, (req, res) => {
        database.getUser(req.jwt.userId).then((user) => {
            res.status(200).send(user);
        });

    });

    app.get('/mobileLogin', (req,res) =>{
        oauth.mobileLogin(req,res)
      })
       app.get('/mobileLoginConfirm', (req,res) =>{
        oauth.mobileLoginConfirm(req,res)
      })

    app.get('/deleteUser', authorizeRequest, (req, res) => {
        database.deleteUser(req.jwt.userId).then((status) => {
            res.sendStatus(200);
        }).catch((err) => {
            console.log(err);
            res.send(500, 'error deleting user');
        });

    });

    app.get('/save-card', authorizeRequest, (req, res) => {
        var userId = req.jwt.userId;
        var cardHash = req.query.hash;
        var lastFourDigits = req.query.lastFourDigits;

        database.saveCard(userId, cardHash, lastFourDigits)
            .then(() => {
                res.sendStatus(200);
            })
            .catch((err) => {
                console.log(err);
                res.send(500, 'error saving card');
            });
    });

    app.get('/fraud/credit-card', (req, res) => {
        var cardHash = req.query.hash;
        var amount = req.query.amount;
        var merchant = req.query.merchant;
        var message = merchant + " is requesting a payment of $" + amount;
        var name = "";

         var merchErrorUrl = 'https://merchanttks.azurewebsites.net/error?errorMsg=';

        database.userWithCard(cardHash).then((user) => {
           
             oauth.signatureRequest(req, res, message, user.email);
        }).catch((err) =>{
             console.log(err);
             res.redirect(merchErrorUrl+'No User with this card found');
        })
        
    });

}
