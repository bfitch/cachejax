# cachejax
Load data from your Baobab model before making a remote request

#### Motivation

- Say you're writing a JS app with the URL `/messages`.
- When a user navigates to `/messages`, you need to load all the messages for the logged in user.
- Say you have another route: `messages/:id`.
- If you want to support linking in your application (and you should!), now you need to *re-fetch all the messages in that route*.
- This is wasteful and forfeits one of the nice things about 'rich client' JS apps: avoiding round trips to the server for data.

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
      root: 'message',
      batch: true
    }
  }
  ```
  
  `config` options:
  
  ```js
  {
    root:    Boolean || String, // default: true
    mapping: String,            // required
    batch:   Boolean            // default: false
  };
  ```
  
  - *root*    - does the response JSON have a root key? `{user: {...}}` or `{...}` or customize the key name `'user'`
  - *mapping* - associate a Baobab path with a URL to fetch data
  - *batch*   - will you make batched requests to this endpoint?

##### Initialize

  Pass `config` and your `baobab` instance to the `Cachejax` constructor:
  ```js
  import Cachejax from 'cachejax';

  const baobab = new Baobab({});
  const cachejax = Cachejax(baobab, config);
  ```

##### Call

  Use `cachejax` anywhere you would normally make an http request:
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

- #### cachejax.get(path||url, params, config) => Promise
  - `path` - a baobab path name to fetch data
  - `url` - a URL to fetch data from
  - `params` - url params, query params, or attributes to filter by in baobab
  - `config` - any overrides or customization to `Cachejax() base config`
  - `Promise` - returns a `then()`able object whether fetched from AJAX or baobab
  
  Examples:

  ```js
  let cachejax = Cachejax(model, config);
  ```
  
  - Using a baobab path `'conversations'`:
    ```js
    let config = { conversations: {mapping: 'http://app.com/api/v1/conversations'} }
    cachejax.get('conversations') // => baobab.get('conversations') or GET /api/v1/conversations 
    ```
  
  - baobab path with URL param (express.js style routes):
    ```js
    let config = { conversations: {mapping: 'http://app.com/api/v1/conversations:id'} }
    cachejax.get('conversations', {id: 3}) // => baobab.get('conversations') or GET /api/v1/conversations/3
    ```
  
  - baobab path with query param:
    ```js
    let config = { conversations: {mapping: 'http://app.com/api/v1/conversations'} }
    cachejax.get('conversations', {id: 3} // => baobab.get('conversations') or GET /api/v1/conversations?id=3
    ```
  - Normal AJAX call:
    
    ```js
    cachejax.get('http://www.google.com');
    ```


- #### cachejax.batch([data], mappingFunction) => [Promise]

  - `[data]` - an array of data, e.g. user_ids
  - `mappingFunction` - a function mapping data to a Request (Promise)
  - `[Promise]`: an array of fulfilled Promises

  Given the config:
  ```js
  messages: {
    mapping: 'http://app.com/api/v3/messages/:id',
    root: 'message',
    batch: true
  }
  ```

  cachejax will exectue each `get()` concurrently (delegating to axios.all):

  ```js
  let ids = [3,5,3,35,4]

  cachejax.batch(ids, (id) => cachejax.get('messages', {id: id}))
    .then((messages) => {
      // messages = [{id: 3,...},{id: 5,...}, {id: 35,...}...]
      baobab.set('messages', messages);
    })
  ```
- #### cachejax.setAuthorization(token)

  - Sets a bearer token `Authorization` header for all ajax requests

- #### [axios proxy methods](https://github.com/mzabriskie/axios#request-method-aliases)
  - cachejax.all()
  - cachejax.delete()
  - cachejax.head()
  - cachejax.post()
  - cachejax.put()
  - cachejax.patch()
