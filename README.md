angular-etag
============
for AngularJS
-------------

Angular module that wraps $http with etag caching. It uses browser local storage as the cache for $http calls.

Currently only supports GET requests.

### Current Build Status from Travis-CI
[![Build Status](https://travis-ci.org/forforf/angular-etag.png)](https://travis-ci.org/forforf/angular-etag)


Install
-------

Git Clone: `git clone git@github.com:forforf/angular-etag.git`

or

Bower: `bower install git@github.com:forforf/angular-etag.git`


Usage
-----

Include the script in the appropriate place for you angular app.

`<script src="bower_components/angular-etag/angular-etag.js"></script>`


Inject the dependency into your module.

`angular.module('YourModule', ['AngularEtag'])`


Inject and use the 'ehttp' object in your controller or services. `ehttp.get` isn't quite a drop in replacement for `$http.get`, yet, but it's quite similar.

    function YourCtrl($scope, ehhtp){
      var urlOpts = {url: 'http://some.etag.server.com'};
      ehttp.get(urlOpts).then( function(resp){ /* handle response as you normally would */ });
    }


Cached Responses are stored in the browser's localStorage.


If you need a more robust libary with full REST, etag and other suppot you can checkout  [restangular](https://github.com/mgonto/restangular)

Restangular was overkill for my needs, where I just needed a way to cache 304 etag requests, specifically for the github API.


Design discussion
-----------------

### Why not use `$http` and set `{cache: true}`? 
There's no way to know on the client side if the server data has changed or not. With Etags, you ask the server if your cached response is still valid (using the etag id the server provided in its intial response), and the server response with either a 304 with no response body (meaning the cache is still valid), or a 200 OK with a new reponse body. Since you always check with the server, it seemed eaiser to decorate $http directly rather than try and work out how to do that in a new cache factory.

