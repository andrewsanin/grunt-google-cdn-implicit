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
    var jsToCdn = this.data.components;
    var almond = this.data.almond;
    var options = this.data.options || {};
    options = {
      localFallback: options.localFallback,
      bowerJson: options.bowerJson || 'bower.json',
      bowerDir: options.bowerDir || 'bower_components'
    };

    // collect files
    var files = grunt.file.expand({ filter: 'isFile' }, this.data.html);
    var compJson = grunt.file.readJSON(options.bowerJson);
    var depsToCdn = [];

    for (var dependency in compJson.dependencies) {
      if (dependency in jsToCdn) {
        var localPath = jsToCdn[dependency].localPath;

        if (options.localFallback && !localPath) {
          var depDir = options.bowerDir + '/' + dependency;
          var depBowerJson = grunt.file.readJSON(depDir + '/bower.json');
          localPath = depDir + '/' + depBowerJson.main;
        }
        
        depsToCdn.push({
          name: dependency,
          version: compJson.dependencies[dependency],
          localPath: localPath,
          success: jsToCdn[dependency].success
        });
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

      // almond support
      if (almond && compJson.dependencies['almond']) {
        scriptsRefStr += '    <script src="/' + almond + '"></script>\r\n';
      }

      depsToCdn.forEach(function (dep) {
        if (!(dep.name in cdnMap)) {
          grunt.fail.warn('"' + dep.name + '" is unknown bower component. I know only ' + Object.keys(cdnMap));
          return;
        }

        var ver = dep.version.replace('~', '').replace('>=', '').replace('^', '').replace('x', '0');
        var cdnUrl = googleCdnPrefix + cdnMap[dep.name].replace('{ver}', ver);
        scriptsRefStr += '    <script src="' + cdnUrl + '"></script>\r\n';

        if (options.localFallback) {
          if (!dep.success) {
            dep.success = 'window.' + dep.name;
            grunt.log.writeln('CDN load success expression for "' + dep.name + '" component is not specified. Using "' + dep.success + '" expression.');
          }

          scriptsRefStr += '    <script>(' + dep.success + ')||document.write(\'<script src="/' + dep.localPath + '"><\\/script>\')</script>\r\n';
        }
      });
      
      content = content.replace('    <!-- build:cdn -->\r\n', scriptsRefStr);

      grunt.file.write(file.path, content);
    });
  });
};
