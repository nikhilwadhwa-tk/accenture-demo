const jwt = require("jwt-simple");
const config = require('../config');

module.exports = {
  createToken: createToken,
  authorizeRequest: authorizeRequest
};

function createToken(info) {
  var token = jwt.encode(info, config.jwtTokenSecret);
  return token;
}

function authorizeRequest(req, res, next) {
  var xAuthtoken = req.headers['x-auth-token'];
  var cookieToken = req.headers.cookie;

  if(cookieToken) {
    cookieToken = cookieToken.replace(/.*token=([^;]*).*/, "$1");
  }

  var token = xAuthtoken || cookieToken;

  if( !token ) {
    res.send(403, 'not authorized');
    return;
  }

  var session = decodeJwt(token);
  if( !session ) {
    res.send(403, 'not authorized');
    return;
  }

  req.jwt = session;
  next();
}

function decodeJwt(token) {
  try {
    return jwt.decode(token, config.jwtTokenSecret);
  } catch (err) {
    return null;
  }
}
