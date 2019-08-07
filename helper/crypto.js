const jwt = require('jsonwebtoken');

const crypto = {
  decode: message => {
    try {
      // if (key === process.env.SECRET) {
      const decodeRS = jwt.verify(message, process.env.SECRET || 'very_secret_key');
      console.log('decode success: ', decodeRS);
      return decodeRS;
      // } else {
      //   return null;
      // }
    } catch (error) {
      console.log('decode error: ', error);
      return error;
    }
  },
  // eslint-disable-next-line require-jsdoc
  encode: message => {
    try {
      const encodeRS = jwt.sign(message, process.env.SECRET || 'very_secret_key', { algorithm: 'HS256' });
      console.log('encode success: ', encodeRS);
      // const decodeRS = jwt.verify(encodeRS, process.env.SECRET || 'very_secret_key');
      // console.log('decodeRS success: ', decodeRS);
      return encodeRS;
    } catch (error) {
      console.log('encode error: ', error);
      return null;
    }
  }
};

module.exports = crypto;
