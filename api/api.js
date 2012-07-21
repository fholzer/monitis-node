// testing constructs for simple/dumb monitis custom monitor implementation in JS

var https = require('https');
var querystring = require('querystring');

var api_config = require('./api_config.js').api_config();
var checksum = require('./auth.js').checksum;
var RequestParams = require('./request_params.js').RequestParams;


function format_query_params(params) {
  return querystring.stringify(params);
}

function get(host, path, call_params, res_cb) {
  var api_params = RequestParams(call_params);
  call_checksum = checksum(api_config['monitis_secretkey'],api_params);
  api_params['checksum'] = call_checksum;
  query = format_query_params(api_params);
  https.get({host: host, path: path + "?" + query}, res_cb)
    .on('error', function(e) {
      console.error(e);
    });
}

function post(host, path, call_params, res_cb) {
  var api_params = RequestParams(call_params);
  call_checksum = checksum(api_config['monitis_secretkey'],api_params);
  api_params['checksum'] = call_checksum;
  post_data = format_query_params(api_params);
  post_options = {
    host: host,
    path: path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': post_data.length
    }
  };
  
  var post_req = https.request(post_options, res_cb)
    .on('error', function(e) {
      console.error(e);
    });
  post_req.write(post_data);
  post_req.end();
}

function monitis_get(params, res_cb) {
  get(api_config['host'], api_config['path'], params, res_cb);
}

function monitis_post_timestamp() {
  var d = new Date();
  var pad = function(num) { return (num < 10 ? '0' : '') + num }
  
  // current datetime in GMT with yyyy-MM-dd HH:mm:ss format
  return d.getUTCFullYear() 
    + "-" + pad((parseInt(d.getUTCMonth()) + 1))
    + "-" + pad(d.getUTCDate())
    + " " + pad(d.getUTCHours())
    + ":" + pad(d.getUTCMinutes())
    + ":" + pad(d.getUTCSeconds())
}

function monitis_post(call_params, res_cb) {
  var api_params = RequestParams(call_params);
  api_params['timestamp'] = monitis_post_timestamp();
  post(api_config['host'], api_config['path'], api_params, res_cb);
}

function checktime() {
  // number of milliseconds since January 1, 1970, 00:00:00 GMT
  // aka epoch time
  return new Date().getTime();
}

function encode_results(params) {
  return querystring.stringify(params,';', ':');
}

// TODO determine best option for exporting names between files
module.exports.get_monitor_info = function(monitorId, res_cb) {
  monitis_get({action: 'getMonitorInfo', monitorId: monitorId},res_cb);
}

module.exports.get_monitors = function(tag, res_cb) {
  params = {action: 'getMonitors', tag: tag};
  monitis_get(params,res_cb);
}

module.exports.add_result = function(monitorId,results,res_cb) {
  // POST: action, monitorId, checktime, results
  monitis_post({
    action: 'addResult',
    monitorId: monitorId,
    checktime: checktime(),
    results: encode_results(results)
  },
  res_cb);
}

module.exports.add_result_by_name = function(name, results, res_cb) {
  // need to look up monitor name, and get monitorId
}

module.exports.post = monitis_post
module.exports.get = monitis_get
// module.exports.get_monitor_info = get_monitor_info

// Testing only if this files is run directly
if (!module.parent) {
  process.stdout.write(checksum('notReallyASecret',
                                {key2: 'foo', key1: 'bar'}) + "\n");
  process.stdout.write(
    "checktime() -> " + checktime() + "\n"
  );
  process.stdout.write(
    "encode_results: " + encode_results({"foo 2": 1.1, bar: "baz"}) + "\n"
  );
}
