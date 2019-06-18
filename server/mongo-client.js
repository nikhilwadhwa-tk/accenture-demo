const config = require('../config');
const mongoose = require('mongoose'); 

const client = module.exports = new MongoClient();

client.setup();

function MongoClient() {
  var _this = this;

  var User = { };
  var CreditCard = { };

  _this.setup = function() {
    mongoose.Promise = global.Promise;
    mongoose.connect(config.mongoDbUri);

    var db = mongoose.connection;

    var UserSchema = mongoose.Schema({
      userId: String,
      firstName: String,
      lastName: String,
      birthDate: Date,
      dlNumber: String,
      dlState: String,
      email: String,
      accountBalance: Number,
      creditCardApplication: String,
      gender: String
    });

    var CreditCardSchema = mongoose.Schema({
      userId: String,
      cardHash: String,
      lastFourDigits: String
    });

    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', function() {
      console.log('>>> mongo connected!');
      User = mongoose.model('User', UserSchema);
      CreditCard = mongoose.model('CreditCard', CreditCardSchema);
    });
  };

  _this.deleteUser = function(userId){
    var query = User.findOneAndRemove({userId: userId});

     _this.deleteCardsForUser(userId);

  return query.then(function(response){
         return response;

       
    });
  };

  _this.deleteCardsForUser = function(userId){
        var query = CreditCard.remove({userId: userId});

         return query.then(function(response){
           return response;
          });

  };

  _this.getUser = function (userId) {
    var p = new Promise(function(resolve, reject) {
      var query = User.findOne({userId: userId});
      
      query.then(function(user) {
        resolve(user);
      });

    });

    return p;
  };

  _this.saveCard = function(userId, cardHash, lastFourDigits) {
    var card = new CreditCard({
      userId: userId,
      cardHash: cardHash,
      lastFourDigits: lastFourDigits
    });

    _this.updateAccountBalance(userId,50);

    return card.save();
  };

  _this.userWithCard = function(cardHash) {
    return CreditCard.findOne({cardHash: cardHash})
      .then((card) => {
        if( !card ) {
          return null;
        }

        return User.findOne({userId: card.userId});
      });
  };

  _this.updateAccountBalance = function(userId, amount){

    var query = User.findOne({userId: userId});

    return query.then(function(user){

      user.accountBalance = user.accountBalance + amount;
      return user.save();
         
    });

  };

   _this.getCards = function (userId) {

        var p = new Promise(function (resolve, reject) {

            CreditCard.find({
                'userId': userId
            }
                , function (err, cards) {
                    resolve(cards);
                });


        });

        return p;

    };



    _this.updateCreditCardApplication = function(userAddress, url){

    var query = User.findOne({userAddress: userAddress});

    return query.then(function(user){

      user.creditCardApplication = url;
      console.log('saving cc app'+url);
      console.log(user);
      return user.save();
         
    });

  };

  _this.registerUser = function(info) {
    var newUser = new User(info);
    newUser.accountBalance = 100;
    console.log("saving user...");
    console.log(newUser);
    return newUser.save();
  };

}

