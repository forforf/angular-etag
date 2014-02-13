'use strict';

angular.module('AngularEtag', [])


.factory('ehttp', function($http, $window, $q){
  var STORAGE_PREFIX = 'eTagKey-';

  var storage = {};
  storage.save = function(key, obj){
    var val = JSON.stringify(obj);
    //console.log('savign', val);
    $window.localStorage.setItem(key, val);
  };

  storage.get = function(key){
    var val = $window.localStorage.getItem(key);
    console.log('val', val);
    return JSON.parse(val);
  };

  function eTagKey(url){
    if(!url){ return null; }
    return STORAGE_PREFIX+url;
  }

  function makeCacheObj(etag, opts, response){
    return {
      etag: etag,
      opts: opts,
      response: response
    };
  }

  function cacheEtag(etag, opts, resp){
    console.log('caching etag', etag, opts, resp);
    if(opts && opts.url){
      if(resp){
        var cacheResponse = {};
        angular.extend(cacheResponse, resp);
        cacheResponse.status = 203;

        console.log('saving', eTagKey(opts.url), makeCacheObj(etag, opts, cacheResponse));
        storage.save(eTagKey(opts.url), makeCacheObj(etag, opts, cacheResponse) );
        console.log('saved');
      }
    }
  }

  function ehttpGet(urlOpts){
    var url = urlOpts.url;

    var cacheObj = storage.get(eTagKey(url));
    console.log('cacheObj', cacheObj);

    //var eTag = "\"060d3cf9dff002a0f3c7cdaf7ed7ec39\"";
    if(cacheObj && cacheObj.etag){
      urlOpts.headers = urlOpts.headers || {};
      angular.extend( urlOpts.headers, {'If-None-Match': cacheObj.etag} );
    }
    angular.extend(urlOpts, {method: 'GET'});

    console.log('reqOpts', urlOpts);

    return $http(urlOpts)
      .then(function(resp){
        console.log('respSuccess', resp.headers(), resp.status);
        var etag = resp.headers().etag;
        if(etag){ cacheEtag(etag, urlOpts, resp); }
        return resp;
      })
      .catch(function(resp){
        console.log('respCatch', resp.headers(), resp.status);
        if(resp.status === 304){
          console.log('fetch from cache');
          console.log(storage.get( cacheObj ));
          cacheObj.response.headers = function(){
            return {"X-Local-Cache": "Nothing sent to server"};
          };
          return cacheObj.response;
        } else {
          return $q.reject(resp);
        }
      });
  }


  return {
    get: ehttpGet
  };
});