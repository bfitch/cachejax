# cachejax
Load data from your Baobab model before making a remote request

#### Motivation

- Say you're writing a JS app with the URL `/messages`.
- When a user navigates to `/messages`, you need to load all the messages for the logged in user.
- Say you have another route: `messages/:id`.
- If you want to support linking in your application (and you should!), now you need to *re-fetch all the messages in that route*.
- This is wasteful and forefits one of the nice things about 'rich client' JS apps: avoiding round trips to the server for data.

**cachejax** is a small wrapper around the [axios](https://github.com/mzabriskie/axios) ajax library that supports data caching with [baobab](https://github.com/Yomguithereal/baobab). It decides whether to fetch data directly from the client (baobab) or make a remote request.

It's designed to be used with [cerebral](https://github.com/christianalfoni/cerebral) and was extracted from a cerebral project, but can be used with only baobab.

### Install
-------------
`npm install cachejax`

### Usage
--------------
##### Config

  Supply a `config` object mapping paths to ajax endpoints:
  ```js
  const config = {
    currentUser: {
      mapping: 'http://oath.dev/api/v1/me.json',
      root: false
    },
    messages: {
      mapping: 'http://app.com/api/messages/v3/messages/:id', // you can use express style routes
      rootKey: 'message',
      batch: true
    }
  }
  ```
  `config` options:
  - *root*    - does the response JSON have a root key? `{user: {...}}` or `{...}`
  - *rootKey* - if the root key name is different than your baobab path name, supply it here
  - *mapping* - associate a Baobab path with a URL to fetch data
  - *batch*   - will you make batched requests to this endpoint?
  
  ```js
  {
    root:    Bool,   // default: true
    rootKey: String, // default: undefined
    mapping: String, // required
    batch:   Bool    // default: false
  };
  ```

##### Initialize

  Pass `config` and your `baobab` instance to the cachejax constructor:
  ```js
  import Cachejax from 'cachejax';

  const baobab = new Baobab({});
  const cachejax = Cachejax(baobab, config);
  ```

##### Call

  Use *cachejax* anywhere you would normally make an http request:
  ```js
  cachejax.get('currentUser')
      .then((response) => {
        // response.data
      })
      .catch((response) => {
        // handle error
      });
  ```

  - `cachejax.get()` will check if data exists at `baobab.get('currentUser')` if not, it will fetch the data from `http://oath.dev/api/v1/me.json`
  - `get()` always returns a Promise whether data is found on the client or fetched from the server.
  - data is available at `response.data`. The full [axios response object](https://github.com/mzabriskie/axios#response-api) will, however,  be returned when a remote request is made.

### API
-------------

- #### cachejax.get(path|url, params, options) => Promise
  
  ```js
    config = { conversations: {mapping: 'http://app.com/api/v1/conversations'} }
  
    cachejax.get('conversations')  => GET /api/v1/convesations
  ```
  
  ```js
    config = { conversations: {mapping: 'http://app.com/api/v1/conversations:id'} }
  
    cachejax.get('conversations', {id: 3}  => GET /api/v1/convesations/3
  ```
  
  ```js
    config = { conversations: {mapping: 'http://app.com/api/v1/conversations'} }
  
    cachejax.get('conversations', {id: 3}  => GET /api/v1/convesations?id=3
  ```
  
- #### cachejax.batch([data], mappingFunction) => [Promise]

  - `data` - an array of data, e.g. user_ids
  - `mappingFunction` - a function mapping data to a Request (Promise)
  - Returns: an array of fulfilled Promises
  
  Given the config:
  ```js
  messages: {
    mapping: 'http://app.com/api/v3/messages/:id',
    rootKey: 'message',
    batch: true
  }
  ```
  
  cachejax will exectue each `get()` concurrently (delegating to axios.all):
  
  ```js
  let ids = [3,5,3,35,4]
  
   cachejax.batch(ids, (id) => cachejax.get('messages', {id: id}))
    .then((messages) => {
      // messages = [{message 3},{message 5}, {message_35}...] 
      baobab.set('messages', messages);
    })
  ```
- #### cachejax.setAuthorization(token)

  - Sets a bearer token `Authorization` header for all ajax requests
  
  ##### [axios proxy methods](https://github.com/mzabriskie/axios#request-method-aliases)
  -------------------------

  - cachejax.all()
  - cachejax.delete()
  - cachejax.head()
  - cachejax.post()
  - cachejax.put()
  - cachejax.patch()
