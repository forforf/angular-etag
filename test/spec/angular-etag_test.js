
describe('angular-etag', function(){


  beforeEach(function(){
    module('AngularEtag');
  });

  it('sanity check', function(){
    expect(true).toBe(true);
  });

  describe('ehttp', function(){
    var _ehttp;
    var _httpBackend;
    var mockWindow;
    var _window;
    var localStorageItem;

    beforeEach(function(){
      localStorageItem = null;

      mockWindow = {
        localStorage: {
          getItem: function(k){
            return localStorageItem;
          },
          setItem: jasmine.createSpy('- setItem() - ')
        }
      };

      module(function($provide){
        $provide.value('$window', mockWindow);
      });
    });

    beforeEach(inject(function( $injector, $httpBackend, $window, ehttp){
      _ehttp = ehttp;
      _httpBackend = $httpBackend;
      _window = $window;

    }));

    it('sanity check', function(){
      expect(_ehttp).toBeDefined();
    });

    describe('.get', function(){
      describe('nominal cases', function(){
        describe('no etag in cache, no etag in response', function(){
          var urlOpts;
          var reqHeaders;
          var respStatus;
          var respData;


          beforeEach(function(){
            respData = undefined;
            reqHeaders = undefined;
            respData = undefined;

            _httpBackend
              .when('GET', /test1/)
              .respond(200, {"data":"fake"}, {});

            urlOpts = {url: 'test1'};

            localStorageItem = null;
            etagItem = localStorageItem;

            _ehttp.get(urlOpts)
              .then(function(resp){
                reqHeaders = urlOpts.headers;
                respData = resp.data;
                respStatus = resp.status;
              })
              .catch(function(e){
                console.error(e);
              });

          });

          it('does not send etag in request', function(){
            expect(respData).not.toBeDefined();
            expect(reqHeaders).not.toBeDefined();

            _httpBackend.flush();

            expect(reqHeaders).not.toBeDefined();
            expect(respData).toBeDefined();
          });

          it('does not cache response', function(){
            expect(_window.localStorage.setItem).not.toHaveBeenCalled();

            _httpBackend.flush();

            expect(respStatus).toEqual(200);
            expect(_window.localStorage.setItem).not.toHaveBeenCalled();
          });
        });

        describe('no etag in cache, etag in response', function(){
          var urlOpts;
          var reqHeaders;
          var respStatus;
          var respData;


          beforeEach(function(){
            respData = undefined;
            reqHeaders = undefined;
            respData = undefined;

            _httpBackend
              .when('GET', /test2/)
              .respond(200, {"data":"fake"}, {'ETag':'abcde'});

            urlOpts = {url: 'test2'};

            localStorageItem = null;
            etagItem = localStorageItem;

            _ehttp.get(urlOpts)
              .then(function(resp){
                //console.log('resp', resp, resp.headers());
                reqHeaders = urlOpts.headers;
                respData = resp.data;
                respStatus = resp.status;
              })
              .catch(function(e){
                console.error(e);
              });

          });

          it('does not send etag in request', function(){
            expect(reqHeaders).not.toBeDefined();
            expect(respData).not.toBeDefined();

            _httpBackend.flush();

            expect(reqHeaders).not.toBeDefined();
            expect(respData).toBeDefined();

          });

          it('caches response', function(){
            expect(_window.localStorage.setItem).not.toHaveBeenCalled();
            expect(respData).not.toBeDefined();

            _httpBackend.flush();

            expect(respStatus).toEqual(200);
            expect(respData).toBeDefined();
            expect(_window.localStorage.setItem).toHaveBeenCalled();
          });
        });

        describe('has etag in cache, 304 response', function(){
          var urlOpts;
          var reqUrlOpts;
          var respData;
          var reqHeaders;
          var respStatus;


          beforeEach(function(){
            respData = undefined;
            reqHeaders = undefined;
            respHeaders = undefined;
            respStatus = undefined;

            _httpBackend
              .when('GET', /test3/)
              .respond(304, {}, {});

            urlOpts = {url: 'test3'};

            localStorageItem = '{"etag":"abcde","opts":{"url":"/foo","method":"GET"},"response":{"data":{"data":"fake"},"status":203}}';
            etagItem = localStorageItem;

            _ehttp.get(urlOpts)
              .then(function(resp){
                respHeaders = resp.headers();
                reqHeaders = urlOpts.headers;
                respData = resp.data;
                respStatus = resp.status;
              })
              .catch(function(e){
                console.error(e);
              });

          });

          it('has content served from cache', function(){
            expect(reqHeaders).not.toBeDefined();
            expect(respData).not.toBeDefined();
            expect(respHeaders).not.toBeDefined();

            _httpBackend.flush();

            expect(reqHeaders['If-None-Match']).toEqual('abcde');
            expect(respData).toBeDefined();
            expect(respStatus).toEqual(203);
            expect(respHeaders['X-Local-Cache']).toEqual("Nothing sent to server");
          });
        });

        describe('etag in cache, 200 response (new etag)', function(){
          var urlOpts;
          var reqUrlOpts;
          var respData;
          var reqHeaders;
          var respStatus;


          beforeEach(function(){
            respData = undefined;
            reqHeaders = undefined;
            respHeaders = undefined;
            respStatus = undefined;

            _httpBackend
              .when('GET', /test4/)
              .respond(200, {data: "New fake"}, {'ETag':'fghijk'});

            urlOpts = {url: 'test4'};

            localStorageItem = '{"etag":"abcde","opts":{"url":"/foo","method":"GET"},"response":{"data":{"data":"fake"},"status":203}}';
            etagItem = localStorageItem;

            _ehttp.get(urlOpts)
              .then(function(resp){
                respHeaders = resp.headers();
                respData = resp.data;
                reqHeaders = urlOpts.headers;
                respStatus = resp.status;
              })
              .catch(function(e){
                console.error(e);
              });

          });

          it('sends etag but server has new data', function(){
            expect(reqHeaders).not.toBeDefined();
            expect(respData).not.toBeDefined();
            expect(respHeaders).not.toBeDefined();

            _httpBackend.flush();

            expect(reqHeaders['If-None-Match']).toEqual('abcde');
            expect(respData).toBeDefined();
            expect(Object.keys(respHeaders)).not.toContain('X-Local-Cache');
            });

          it('caches response', function(){
            expect(_window.localStorage.setItem).not.toHaveBeenCalled();
            expect(respData).not.toBeDefined();

            _httpBackend.flush();

            expect(respStatus).toEqual(200);
            expect(respData).toBeDefined();
            expect(_window.localStorage.setItem).toHaveBeenCalled();
          });
        });

        describe('server responds with  error status', function(){
          var urlOpts;
          var respData;
          var reqHeaders;
          var respStatus;
          var errorCaught;

          beforeEach(function(){
            respData = undefined;
            reqHeaders = undefined;
            respHeaders = undefined;
            respStatus = undefined;


            _httpBackend
              .when('GET', /test5/)
              .respond(400, {}, {});

            urlOpts = {url: 'test5'};


            _ehttp.get(urlOpts)
              .then(function(resp){
                respHeaders = resp.headers();
                respData = resp.data;
                reqHeaders = urlOpts.headers;
                respStatus = resp.status;
              })
              .catch(function(e){
                errorCaught = e;
              });

          });

          it('responds with error', function(){
            expect(reqHeaders).not.toBeDefined();
            expect(respData).not.toBeDefined();
            expect(respHeaders).not.toBeDefined();

            _httpBackend.flush();

            expect(errorCaught.status).toEqual(400);
          });

        });
      });
    })
  });
}) ;