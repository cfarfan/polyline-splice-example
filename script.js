angular.module('experiment',['ngRoute'])
  .constant('debug', true)
  .config( function ($routeProvider) {
    $routeProvider
      .when('/', {
        controller: 'mainCtrl',
        templateUrl: 'template.html',
        active: 'index'
      })
      .when('/mapmatching', {
        controller: 'mapMatchingCtrl',
        templateUrl: 'template.html',
        active: 'mapmatching'
      })
      .otherwise({
        redirectTo:'/'
      });
  })
  .controller('mainCtrl', function($scope,$route,$http,$timeout) {
    $scope.$route = $route

    L.mapbox.accessToken = config.mapbox.token
    var map = L.mapbox.map('map', 'mapbox.light')
        .setView([37.765015, -122.416363], 13)

    var waypoints = [[-122.423476,37.771970],[-122.428722,37.722392],[-122.475414,37.753887]]
    var waypoints_string = waypoints.join(';')

    //Mapbox Directions API ~ mda
    mda_config = {
      geometry: 'polyline',
      alternatives: false,
      instructions: 'text',
      profile: 'mapbox.driving',
      token: L.mapbox.accessToken
    }
    var query_template_url =
      'https://api.mapbox.com/v4/directions/'+mda_config.profile+'/{{waypoints}}.json?'
      +'alternatives='  +mda_config.alternatives
      +'&instructions=' +mda_config.instructions
      +'&geometry='     +mda_config.geometry
      +'&access_token=' +mda_config.token

    var query_url = query_template_url.replace('{{waypoints}}',waypoints_string)
    $http.get(query_url).then(function(response){
      console.info('Mapbox Directions API Data Response', response.data)
      var coords = polyline.decode(response.data.routes[0].geometry)
                           .map(function (e) {return [e[0]/10,e[1]/10]})

      var polyline_layer = L.polyline(coords)
      polyline_layer.addTo(map)
      map.fitBounds(polyline_layer.getBounds())

      var n_waypoints = [
        [-122.428892,37.731138],
        [-122.422382,37.725430],
        [-122.433604,37.717725],
        [-122.443625,37.718879],
        [-122.446393,37.723003]
      ]
      query_url = query_template_url.replace('{{waypoints}}',n_waypoints.join(';'))
      $http.get(query_url).then(function(r){
        var n_coords = polyline.decode(r.data.routes[0].geometry)
                               .map(function (e) {return [e[0]/10,e[1]/10]})

        $timeout(function(){
          n_coords.unshift(60)
          n_coords.unshift(100)
          var p2 = L.polyline(L.Polyline.prototype.spliceLatLngs.apply(polyline_layer, n_coords),{color: 'red', dashArray: 10})
                    .addTo(map)
          map.fitBounds(polyline_layer.getBounds())
        }, 1000)
      })
    })
  })
  .controller('mapMatchingCtrl',function($scope, $route, $http, $timeout){
    $scope.$route = $route

    L.mapbox.accessToken = config.mapbox.token
    var map = L.mapbox.map('map', 'mapbox.dark')
        .setView([37.765015, -122.416363], 13)

    var gpsdata = undefined
    var fixeddata = undefined
    var p = L.polyline([]).addTo(map)

    $http.get('data/gpsdata.json').then(function(response){
      gpsdata = response.data
      p.setLatLngs(gpsdata.map(function(e){return e.slice(0,2)}))

      map.fitBounds(p.getBounds())
      map.setZoom(16)

      return $http.get('data/fixeddata.json')
    }).then(function(response){
      fixeddata = response.data

      var start = 0
      for(var i = 0; i < fixeddata.length; i++)
        (function(index){
          $timeout(function(){
            if((index-1) == -1) {
              start = 0
            }
            else{
              start = _.findIndex(gpsdata, function(o) { return o[2] == fixeddata[index-1][2] })+1
            }

            var last = _.findIndex(gpsdata, function(o) { return o[2] > fixeddata[index][2] })-1
            gpsdata.splice(start,last-start,fixeddata[index])

            p.setLatLngs(gpsdata.map(function(e){return e.slice(0,2)}))
          },50*index)
        })(i)

    })

  })


