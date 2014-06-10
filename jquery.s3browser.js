/**
 * jQuery Plugin: S3 Browser
 *
 * A simple and lightweight jQuery plugin to generate a directly
 * listing of an Amazon S3 Bucket.
 *
 * @author Aidan Lister <aidan@php.net>
 * @author GreenJello <f.bagnardi@gmail.com>
 * @version 1.1.0
 */
(function ( $ ) {
    $.fn.s3browser = function(options) {
        var prefix = $(this).attr('data-prefix');
        var settings = $.extend({
            bucket: $(this).attr('data-bucket'),
            prefix: prefix,
        }, options);

        var s3 = new AWS.S3({params: {Bucket: settings.bucket}});

        var S3params = {
          Bucket: settings.bucket,
          Prefix: settings.prefix
        }

        var context = this
        s3.listObjects(S3params, function(error, data) {

          // Write any error to the context element
          if (error !== null) {
            context.text(error);
            return;
          }

          // Check for empty result
          if (data.Contents.length == 0) {
            context.text('No files found.');
            return;
          }

          // Our algorithm relies on files coming before folders
          data.Contents.sort(function(a, b) {
              return a.Key.split("/").length > b.Key.split("/").length;
          });

          // Build the heirarchical file map
          var fileStructure = {}
          jQuery.each(data.Contents, function(index, s3obj) {
              var pathSegments = s3obj.Key.substring(prefix.length).split("/");
              parseSegments(fileStructure, pathSegments, s3obj);
          });

          // Write the HTML
          var markup = createMarkup(fileStructure);
          context.html(markup);
        });


        // Recursively iterate all of the path segments in a single filename
        function parseSegments(fileStructure, rest, s3obj) {
            if (rest.length <= 2) {
                pushTo(fileStructure, rest[0], rest[1], s3obj);
            }
            else {
                var subStructure = fileStructure[rest[0]] || {};
                fileStructure[rest[0]] = subStructure;
                parseSegments(subStructure, rest.slice(1), s3obj);
            }
        }

        // Small wrapper to emulate a defaultdict
        function pushTo(fileStructure, key, value, s3obj) {
            if (!fileStructure[key]) {
                fileStructure[key] = [];
            }
            if (value) {
                fileStructure[key].push({
                  'label': value,
                  's3item': s3obj
                });
            }
        }

        // Recursive function to generate the folder markup.
        function createMarkup(folder) {
            var markup = '<ul>';
            for (var key in folder) {
                markup += '<li>';
                if ('label' in folder[key]) {
                  var s3item = folder[key]['s3item']
                  var url = s3.getSignedUrl('getObject', {Bucket: settings.bucket, Key: s3item.Key});
                  var size = (s3item.Size / 1024).toFixed(1)
                  markup += '<a href="'+url+'">'+folder[key]['label']+'</a> ('+size+'kb)';
                } else {
                  markup += key;
                  markup += createMarkup(folder[key]);
                }
                markup += '</li>';
            }
            markup += '</ul>';
            return markup;
        }

        return this;
    };
}( jQuery ));
