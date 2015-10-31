var mocha          = require('mocha');
var chai           = require('chai');
var sinon          = require('sinon');
var sinonChai      = require('sinon-chai');
chai.use(sinonChai);

var describe = mocha.describe;
var it       = mocha.it;
var expect   = chai.expect;

var axios    = require('axios');
var Cachejax = require('../dist/index.js');

describe ('Cachejax', function() {
  var state;
  var model = { get: function(key){ return state[key];} };

  describe ('get', function() {
    var axiosGet = sinon.stub(axios, 'get');

    describe ('path and no root', function() {
      var cachejax;
      var config = {
        currentUser: {
          mapping: 'http://oath.dev/api/v1/me.json',
          root: false
        }
      }

      beforeEach (function() {
        cachejax = Cachejax(model, config, axios);
      });

      describe ('currentUser is in cache', function() {
        it ('returns data from the cache', function() {
          state = { currentUser: {name: 'bob'}};

          expect(axiosGet).to.not.have.been.called

          return cachejax.get('currentUser').then(function(result) {
            expect(result).to.deep.equal({ data: { name: 'bob' } });
          });
        });
      });

      describe ('currentUser not in cache', function() {
        it ('makes an ajax request', function() {
          state = {};
          cachejax.get('currentUser');

          expect(axiosGet).to.have.been.calledWith(
            'http://oath.dev/api/v1/me.json'
          );
        });
      });
    });

    describe ('express style URL and customized root name', function() {
      var cachejax;
      var config = {
        messages: {
          mapping: 'http://app.com/api/messages/v3/messages/:id',
          root: 'messages'
        }
      }

      beforeEach (function() {
        cachejax = Cachejax(model, config, axios);
      });

      describe ('message is in cache', function() {
        it ('returns data from the cache', function() {
          state = { messages: [{id: 1}] };

          expect(axiosGet).to.have.callCount(1);

          return cachejax.get('messages').then(function(result) {
            expect(result).to.deep.equal({
              data: { messages: [{id: 1}] }
            });
          });
        });
      });

      describe ('message not in cache', function() {
        it ('makes an ajax request with an URL param', function() {
          state = {};
          cachejax.get('messages', {id: 2});

          expect(axiosGet).to.have.been.calledWith(
            'http://app.com/api/messages/v3/messages/2'
          );
        });
      });
    });

    describe ('query params and a path', function() {
      var cachejax;
      var config = {
        messages: {
          mapping: 'http://app.com/api/messages/v3/messages',
          root: 'messages'
        }
      }

      beforeEach (function() {
        cachejax = Cachejax(model, config, axios);
      });

      describe ('message is in cache', function() {
        it ('returns data from the cache filtered by param', function() {
          state = { messages: [{id: 1}, {id: 2}] };

          expect(axiosGet).to.have.callCount(2);

          return cachejax.get('messages', {id: 2}).then(function(result) {
            expect(result).to.deep.equal({
              data: { messages: [{id: 2}] }
            });
          });
        });
      });

      describe ('message not in cache', function() {
        it ('makes an ajax request with query params', function() {
          state = {};
          cachejax.get('messages', {id: 2});

          expect(axiosGet).to.have.callCount(3);
          expect(axiosGet).to.have.been.calledWith(
            'http://app.com/api/messages/v3/messages', {params: {id: 2} }
          );
        });
      });
    });

    describe ('forcing a fetch', function() {
      var cachejax;
      var config = {
        currentUser: {
          mapping: 'http://oath.dev/api/v1/me.json',
          root: false
        }
      }

      beforeEach (function() {
        cachejax = Cachejax(model, config, axios);
      });

      describe ('currentUser is in cache', function() {
        it ('it still makes an ajax request', function() {
          state = { currentUser: {name: 'bob'}};
          cachejax.get('currentUser',{}, {forceFetch: true});

          expect(axiosGet).to.have.callCount(4);
        });
      });
    });

    describe ('data is in baboab but empty', function() {
      var cachejax;
      var config = {
        messages: {
          mapping: 'http://app.com/api/messages/v3/messages',
          root: 'messages'
        }
      }

      beforeEach (function() {
        cachejax = Cachejax(model, config, axios);
      });

      describe ('empty array', function() {
        it ('makes an ajax request', function() {
          state = { messages: [] };
          cachejax.get('messages');

          expect(axiosGet).to.have.callCount(5);
          expect(axiosGet).to.have.been.calledWith(
            'http://app.com/api/messages/v3/messages'
          );
        });
      });

      describe ('empty object', function() {
        it ('makes an ajax request', function() {
          state = { messages: {} };
          cachejax.get('messages');

          expect(axiosGet).to.have.callCount(6);
          expect(axiosGet).to.have.been.calledWith(
            'http://app.com/api/messages/v3/messages'
          );
        });
      });
    });
  });

  describe ('batch', function() {
    var cachejax;
    var config = {
      messages: {
        mapping: 'http://app.com/api/v3/messages/:id',
        root: 'message',
        batch: true
      }
    }

    beforeEach (function() {
      cachejax = Cachejax(model, config, axios);
    });

    it ('conforms to the Promise interface', function() {
      // var ids = [3, 5, 3, 35, 4]
      // var stubbedPromiseMappingFunction = function(id) {
      //   return Promise.resolve({data: {message: {id: id}}});
      // };
      // var promises = ids.map(stubbedPromiseMappingFunction);
      //
      // sinon.stub(axios, 'all').returns(Promise.resolve(promises));
      //
      // return cachejax.batch(ids, stubbedPromiseMappingFunction)
      //   .then(function(messages) {
      //     return expect(messages).to.deep.equal([
      //       {id: 3}
      //     ]);
      //   });
    });
  });
});
