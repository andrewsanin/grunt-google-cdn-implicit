'use strict';

var path = require('path');

var googleCdnPrefix = '//ajax.googleapis.com/ajax/libs/';
var cdnMap = {
  'angular-latest': 'angularjs/{ver}/angular.min.js',
  'dojo': 'dojo/{ver}/dojo/dojo.js',
  'jquery': 'jquery/{ver}/jquery.min.js',
  'jquery-mobile': 'jquerymobile/{ver}/jquery.mobile.min.js',
  'jquery.ui': 'jqueryui/{ver}/jquery-ui.min.js',
  'mootools': 'mootools/{ver}/mootools-yui-compressed.js',
  'swfobject': 'swfobject/{ver}/swfobject.js',
  'webfontloader': 'webfont/{ver}/webfont.js'
}

module.exports = function (grunt) {

  grunt.registerMultiTask('cdnify', 'add specified Google CDN script refs to html', function () {
    // get specific js files
    var jsToCdn = this.data.components;
    // collect files
    var files = grunt.file.expand({ filter: 'isFile' }, this.data.html);
    var compJson = grunt.file.readJSON(this.data.bowerConfig);
    var depsToCdn = [];

    for (var dependency in compJson.dependencies) {
      if (jsToCdn.indexOf(dependency) != -1) {
        depsToCdn.push({name: dependency, version: compJson.dependencies[dependency]});
      }
    }

    if (depsToCdn.length == 0) {
      return;
    }

    grunt.log.writeln('Going through ' + grunt.log.wordlist(files) + ' to update script refs');

    files = files.map(function (filepath) {
      return {
        path: filepath,
        body: grunt.file.read(filepath)
      };
    });

    files.forEach(function (file) {
      var content = file.body;
      var scriptsRefStr = '';

      depsToCdn.forEach(function (dep) {
        if (!(dep.name in cdnMap)) {
          grunt.fail.warn('"' + dep.name + '" is unknown bower component. I know only ' + Object.keys(cdnMap));
          return;
        }

        var ver = dep.version.replace('~', '').replace('>=', '').replace('^', '').replace('x', '0');
        var cdnUrl = googleCdnPrefix + cdnMap[dep.name].replace('{ver}', ver);
        scriptsRefStr += '    <script src="' + cdnUrl + '"></script>\r\n';
      });
      
      content = content.replace('    <!-- build:cdn -->\r\n', scriptsRefStr)
      grunt.file.write(file.path, content);
    });
  });
};
