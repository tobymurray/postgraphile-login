require('dotenv').config();
const express = require("express");
const { postgraphile } = require("postgraphile");

const app = express()

const postgresConfig = {
  user: process.env.POSTGRES_USERNAME,
  password: process.env.POSTGRES_PASSWORD,
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  database: process.env.POSTGRES_DATABASE
}

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use(postgraphile(
  postgresConfig,
  process.env.POSTGRAPHILE_SCHEMA, {
    graphiql: true,
    watchPg: true,
    jwtPgTypeIdentifier: `${process.env.POSTGRAPHILE_SCHEMA}.jwt`,
    jwtSecret: process.env.JWT_SECRET,
    pgDefaultRole: process.env.POSTGRAPHILE_DEFAULT_ROLE
  }))

app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

app.use(function (err, req, res, next) {
  res.send('Error! ', err.message, ' ', (req.app.get('env') === 'development' ? err : {}));
});

app.listen(process.env.PORT);

