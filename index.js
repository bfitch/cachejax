import axios from 'axios';
import pathToRegexp from 'path-to-regexp';

export default function Cachejax(model, config, axios=axios) {
  return {
    get: function(path, params={}, options={}, extraParams={}) {
      this.path        = path;
      const forceFetch = options.forceFetch || false;
      const data       = cachedData(path, model, params, config);

      if (data && (data.length || Object.keys(data).length) && !forceFetch) {
        // console.log(`CACHE - ${path}`);

        return new Promise((resolve, reject) => {
          return resolve(cachedResponse(path, config, options, data));
        });

      } else {
        // console.log(`FETCH - ${path}`);

        return axios.get(...request(path, params, config, extraParams));
      }
    },

    batch: function(collection, request) {
      let promises = collection.map(request);

      return axios.all(promises).then((responses) => {
        let root = rootConfig(this.path, config);
        return responses.map(res => res.data[root]);
      });
    },

    setAuthorization: function(token) {
      axios.interceptors.request.use(function (axiosConfig) {
        axiosConfig.headers = {'Authorization': `Bearer ${token}`};
        return axiosConfig;
      });
    },

    // axios proxy methods
    all:    function(...args) { return axios.all(...args); },
    delete: function(...args) { return axios.delete(...args); },
    head:   function(...args) { return axios.head(...args); },
    post:   function(...args) { return axios.post(...args); },
    put:    function(...args) { return axios.put(...args); },
    patch:  function(...args) { return axios.patch(...args); }
  };

  function cachedData(path, model, params, config) {
    const attr  = Object.keys(params)[0];
    const value = params[attr];
    const data  = model.get(path);
    
    // is this an array?, is it empty?, is param in the first object in the array?
    if (Array.isArray(data) && data.length && (data[0][attr] != undefined)) {

      // TODO: check cached data by all params (attrs) passed in, not just first!
      let cachedData = data.filter((item) => item[attr] === value);

      return baseConfig(path, config).batch ? cachedData[0] : cachedData;
    } else {
      return data;
    }
  }

  function cachedResponse(path, config, options, data) {
    const root = rootConfig(path, config, options);
    return root ? {data: {[root]: data}} : {data: data};
  }

  function request(path, params, config, extraParams) {
    const mappedUrl = baseConfig(path, config).mapping;

    if (isExpressStyleRoute(mappedUrl)) {
      // (/conversations/:id', {id: 1})
      let toPath = pathToRegexp.compile(mappedUrl);
      let query  = Object.keys(extraParams).length ? {params: extraParams} : {}
      return [toPath(params), query]

    } else if (mappedUrl) {
      // ('convesations', {id: 1})
      return [mappedUrl, merge({params: params}, extraParams)]

    } else {
      // ('http://app.com/conversations', {id: 1})
      return [path, merge({params: params}, extraParams)]
    }
  }

  function isExpressStyleRoute(url) {
    return /:\w/.test(url);
  }

  function baseConfig(path, config) {
    let nullConfig = {
      root:    undefined,
      mapping: undefined,
      batch:   undefined
    };
    return config[path] || nullConfig;
  }

  function rootConfig(path, config, options={}) {
    if (options.root && typeof options.root === 'string') {
      // passed in at call time: cachejax.get('', {root: 'foo'})
      return options.root;

    } else if (options.root && (typeof options.root === 'boolean') && !options.root) {
      // passed in at call time: cachejax.get('', {root: false})
      return false;

    } else if (typeof baseConfig(path, config).root === 'string') {
      // base config: Cachejax(model, {'currentUser': {root: 'foo'}})
      return baseConfig(path, config).root;

    } else if (typeof baseConfig(path, config).root === 'boolean' && !baseConfig(path, config).root) {
      // base config: Cachejax(model, {'currentUser': {root: false}})
      return false;

    } else if (typeof baseConfig(path, config).root === 'undefined') {
      // base config: Cachejax(model, {'currentUser': {})
      return path;
    }
  }

  function merge(obj, objToCopy) {
    Object.keys(objToCopy).forEach((key) => { obj[key] = objToCopy[key] });
    return obj;
  }
}
