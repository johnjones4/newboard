'use strict';

const async = require('async');
const request = require('request');
const querystring = require('querystring');
const config = require('./config');
const API_BASE = 'http://cloud.feedly.com';

function apiRequest(method,params,done) {
  request({
    'url': API_BASE + method + '?' + querystring.stringify(params),
    'json': true,
    'headers': {
      'Authorization': 'OAuth ' + config.feedly.token
    }
  },function(err,response) {
    done(err,response.body);
  })
}

function getContent(done) {
  async.waterfall([
    function(next) {
      apiRequest('/v3/categories',{},next);
    },
    function(categories,next) {
      if (categories.map) {
        async.parallel(
          categories.map(function(category) {
            return function(next1) {
              apiRequest('/v3/streams/contents',{'streamId':category.id},function(err,data) {
                if (data) {
                  data.category = category;
                }
                next1(err,data);
              });
            }
          }),
          next
        );
      } else {
        next(categories);
      }
    },
    function(content,next) {
      var allContent = [];
      content.forEach(function(category) {
        category.items.forEach(function(item) {
          allContent.push(item);
        });
      });
      allContent.sort(function(a,b) {
        return b.published - a.published;
      });
      next(null,allContent);
    }
  ],done)
}

function reload() {
  getContent(function(err,content) {
    if (err) {
      alert(JSON.stringify(err));
    } else {
      document.body.innerHTML = '';
      content.forEach(function(item) {
        var article = makeArticle(item);
        document.body.appendChild(article);
      })
    }
  })
}

function makeArticle(item) {
  var div = document.createElement('div');
  div.setAttribute('class','article');

  var divInner = document.createElement('div');
  divInner.setAttribute('class','article-inner');
  div.appendChild(divInner);

  var h1 = document.createElement('h1');
  h1.innerHTML = item.title ? item.title : '&nbsp;';
  divInner.appendChild(h1);

  var h2 = document.createElement('h2');
  h2.textContent = [item.categories[0].label,item.origin.title].join(' / ');
  divInner.appendChild(h2);

  return div;
}

reload();
setTimeout(reload,30000);
