'use strict';

const Hapi = require('hapi'),
redis = require('redis'),
cfenv = require('cfenv');
const Boom = require('boom');
const Path = require('path');

let client

if (process.env.VCAP_SERVICES){
  const VCAP_SERVICES = JSON.parse(process.env.VCAP_SERVICES)

  const credentials  = VCAP_SERVICES.rediscloud[0].credentials
  client = redis.createClient(
    credentials.port,
    credentials.hostname,
    {password: credentials.password}
  )
  console.log(credentials)
}else{
  client = redis.createClient()
}

const server = new Hapi.Server()
server.connection({ port: process.env.PORT || 3000, host: '0.0.0.0' });


server.register(require('inert'), (err) => {

    if (err) {
        throw err;
    }

    server.route({
        method: 'GET',
        path: '/',
        handler: function (request, reply) {
            reply.file('static/index.html');
        }
    });
    server.route({
        method: 'GET',
        path: '/script.js',
        handler: function (request, reply) {
            reply.file('static/script.js');
        }
    });


server.route({
    method: 'POST',
    path: '/get',
    handler: function (request, reply) {
      const code = `product:qty:${request.payload.code}`

      client.decr(code, function(err, val){
        if (val < 0){
          const error = Boom.badRequest(`Product ${code} not found`);
          error.reformat();
          client.del(code, function(){
            return reply(error);
          })
        }else{
          reply({qty: val})
        }
      })
    }
});

server.route({
    method: 'POST',
    path: '/store',
    handler: function (request, reply) {
      const code = request.payload.code
      const qty = request.payload.qty
      client.hset(`product:all`, code, true)
      client.set(`product:name:${code}`, request.payload.name)
      client.incrby(`product:qty:${code}`, qty, function(err, val){
        reply({qty: val})
      })
    }
});


server.route({
    method: 'GET',
    path: '/store',
    handler: function (request, reply) {
      client.hkeys('product:all', function(err, codes){
        const multi = client.multi([
          ['mget', codes.map(code => `product:name:${code}`)],
          ['mget', codes.map(code => `product:qty:${code}`)]
        ]).exec(function(err, ret){
          return reply(codes.map(function(code, i){
            return {code, name: ret[0][i], qty: ret[1][i]}
          }))
        })
      })
    }
});


server.start((err) => {
    if (err) {
        throw err;
    }
    console.log(`Server running at: ${server.info.uri}`);
});
});
