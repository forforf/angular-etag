'use strict';

var etagUtil = angular.module('etagUtil', []);

// Don't inject any dependencies
// These are just functions that can be easily ported
// between config, services or other Angular scopes
// Some services will decorate or alter the core angular services,
// So it is important that these utility
// functions have no dependencies themselves
etagUtil.factory('etagLocalStorageCache', function(){
  
  return function(_http, _window, _q){
    var STORAGE_PREFIX = 'eTagKey-';

    // wrapper for localStorage
    var storage = {};
    storage.save = function(key, obj){
      var val = JSON.stringify(obj);
      _window.localStorage.setItem(key, val);
    };
    storage.get = function(key){
      var val = _window.localStorage.getItem(key);
      return JSON.parse(val);
    };

    //generates key to use for localStorage
    function eTagKey(url){
      if(!url){ return null; }
      return STORAGE_PREFIX+url;
    }

    //creates the object to be cached in localStorage
    function makeCacheObj(etag, opts, response){
      return {
        etag: etag,
        opts: opts,
        response: response
      };
    }

    //caches the etag to local storage. Won't cache unless url exists in opts
    function cacheEtag(etag, opts, resp){
      if(opts && opts.url){
        if(resp){
          var cacheResponse = {};
          angular.extend(cacheResponse, resp);
          cacheResponse.status = 203;

          storage.save(eTagKey(opts.url), makeCacheObj(etag, opts, cacheResponse) );
        }
      }
    }

    //Wrapper for _http get
    return function ehttpGet(urlOpts){

      // Handlers for the server response
      var respFn = {};

      // cache the Etag prior to returning the reponse
      respFn.cacheEtag = function(resp){
        var etag = resp.headers().etag;
        if(etag){ cacheEtag(etag, urlOpts, resp); }
        return resp;
      };

      //304's are treated as exceptions in angular, so
      //catch it, reject to bubble up the error if not 304
      respFn.catchUnmodified =  function(resp){
        if(resp.status === 304){
          cacheObj.response.headers = function(){
            return {"X-Local-Cache": "Nothing sent to server"};
          };
          return cacheObj.response;

        } else {
          return _q.reject(resp);
        }
      };

      var url = urlOpts.url;

      var cacheObj = storage.get(eTagKey(url));

      if(cacheObj && cacheObj.etag){
        urlOpts.headers = urlOpts.headers || {};
        angular.extend( urlOpts.headers, {'If-None-Match': cacheObj.etag} );
      }

      angular.extend(urlOpts, {method: 'GET'});

      //_http decorated with etag
      //_http.etagGet(urlOpts);
      return _http(urlOpts)
        .then(respFn.cacheEtag)
        .catch(respFn.catchUnmodified);
    }

  }
});


angular.module('AngularEtag', [])

.provider('etagLocalStorageCache', function(){
    this.$get = function(){
      return function(_http, _window, _q){
        var STORAGE_PREFIX = 'eTagKey-';

        // wrapper for localStorage
        var storage = {};
        storage.save = function(key, obj){
          var val = JSON.stringify(obj);
          _window.localStorage.setItem(key, val);
        };
        storage.get = function(key){
          var val = _window.localStorage.getItem(key);
          return JSON.parse(val);
        };

        //generates key to use for localStorage
        function eTagKey(url){
          if(!url){ return null; }
          return STORAGE_PREFIX+url;
        }

        //creates the object to be cached in localStorage
        function makeCacheObj(etag, opts, response){
          return {
            etag: etag,
            opts: opts,
            response: response
          };
        }

        //caches the etag to local storage. Won't cache unless url exists in opts
        function cacheEtag(etag, opts, resp){
          if(opts && opts.url){
            if(resp){
              var cacheResponse = {};
              angular.extend(cacheResponse, resp);
              cacheResponse.status = 203;

              storage.save(eTagKey(opts.url), makeCacheObj(etag, opts, cacheResponse) );
            }
          }
        }

        //Wrapper for _http get
        return function ehttpGet(urlOpts){

          // Handlers for the server response
          var respFn = {}

          // cache the Etag prior to returning the reponse
          respFn.cacheEtag = function(resp){
            var etag = resp.headers().etag;
            if(etag){ cacheEtag(etag, urlOpts, resp); }
            return resp;
          };

          //304's are treated as exceptions in angular, so
          //catch it, reject to bubble up the error if not 304
          respFn.catchUnmodified =  function(resp){
            if(resp.status === 304){
              cacheObj.response.headers = function(){
                return {"X-Local-Cache": "Nothing sent to server"};
              };
              return cacheObj.response;

            } else {
              return _q.reject(resp);
            }
          };

          var url = urlOpts.url;

          var cacheObj = storage.get(eTagKey(url));

          if(cacheObj && cacheObj.etag){
            urlOpts.headers = urlOpts.headers || {};
            angular.extend( urlOpts.headers, {'If-None-Match': cacheObj.etag} );
          }

          angular.extend(urlOpts, {method: 'GET'});

          //_http decorated with etag
          //_http.etagGet(urlOpts);
          return _http(urlOpts)
            .then(respFn.cacheEtag)
            .catch(respFn.catchUnmodified);
        }
      }
    };
  })

.config(function($provide, etagLocalStorageCacheProvider){

    $provide.decorator('$http', function($delegate){
      $delegate.etagGetInit = etagLocalStorageCacheProvider.$get();
      return $delegate;
    });
  })

//ehttp drop in replacement for $http, with etagGet functionality
//note: with this service $http and ehttp are identical
.factory('ehttp', function($http, $window, $q){

  //I don't like this but I'm currently stumped on how to do it better
  // specifically I don't like directly changing $http here
  // maybe create a function in config/provider that adds the method?
  $http.etagGet = $http.etagGetInit($http, $window, $q);

  return $http;
});