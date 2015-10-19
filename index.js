import axios from 'axios';
import pathToRegexp from 'path-to-regexp';

export default function Cachejax(model, config) {
  return {
    get: function(path, params={}, options={}, extraParams={}) {
      this.path        = path;
      const forceFetch = options.forceFetch || false;
      const data       = cachedData(path, model, params, config);

      if (data && (data.length || Object.keys(data).length) && !forceFetch) {
        console.log(`CACHE - ${path}`);

        return new Promise((resolve, reject) => {
          return resolve(cachedResponse(path, config, options, data));
        });

      } else {
        console.log(`FETCH - ${path}`);

        return axios.get(...request(path, params, config, extraParams));
      }
    },

    batch: function(collection, request) {
      let promises = collection.map(request);

      return axios.all(promises).then((responses) => {
        let rootKey = rootKeyConfig(this.path,config);
        return responses.map(res => res.data[rootKey]);
      });
    },

    // axios proxy methods
    all:    function(...args) { return axios.all(...args); },
    delete: function(...args) { return axios.delete(...args); },
    head:   function(...args) { return axios.head(...args); },
    post:   function(...args) { return axios.post(...args); },
    put:    function(...args) { return axios.put(...args); },
    patch:  function(...args) { return axios.patch(...args); },

    setAuthorization: function(token) {
      axios.interceptors.request.use(function (axiosConfig) {
        axiosConfig.headers = {'Authorization': `Bearer ${token}`};
        return axiosConfig;
      });
    }
  };

  function cachedData(path, model, params, config) {
    const attr  = Object.keys(params)[0];
    const value = params[attr];
    const data  = model.get(path);
    
    // is this an array?, is it empty?, is param in the first object in the array?
    if (Array.isArray(data) && data.length && (data[0][attr] != undefined)) {
      let cachedData = data.filter((item) => item[attr] === value);
      return baseConfig(path, config).batch ? cachedData[0] : cachedData;
    } else {
      return data;
    }
  }

  function cachedResponse(path, config, options, data) {
    const root    = rootConfig(path, config, options);
    const rootKey = rootKeyConfig(path, config, options);
    return root ? {data: {[rootKey]: data}} : {data: data};
  }

  function rootKeyConfig(path, config, options={}) {
    return options.rootKey || baseConfig(path, config).rootKey || path;
  }
  
  function request(path, params, config, extraParams) {
    const mappedUrl = baseConfig(path, config).mapping;

    if (/:\w/.test(mappedUrl)) {
      // ('http://app.com/conversations/:id', {id: 1})

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

  function rootConfig(path, config, options) {
    if (typeof options.root != 'undefined') {
      return options.root;
    } else if (typeof baseConfig(path, config).root != 'undefined') {
      return baseConfig(path, config).root;
    } else {
      return true;
    }
  }

  function baseConfig(path, config) {
    let nullConfig = {
      root:    undefined,
      rootKey: undefined,
      mapping: undefined,
      batch:   undefined
    };
    return config[path] || nullConfig;
  }

  function merge(obj, objToCopy) {
    Object.keys(objToCopy).forEach((key) => { obj[key] = objToCopy[key] });
    return obj;
  }
}
