require('dotenv').config();
const express = require('express');
const postgraphql = require('postgraphql').postgraphql;
const pg = require('pg');
const authorizeEmail = require('./authorizeEmail');

const TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
  process.env.USERPROFILE) + '/.credentials/';
const TOKEN_PATH = TOKEN_DIR + 'gmail-nodejs-quickstart.json';

const postgresConfig = {
  user: process.env.POSTGRES_USERNAME,
  password: process.env.POSTGRES_PASSWORD,
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  database: process.env.POSTGRES_DATABASE
}

const client = new pg.Client(postgresConfig);

function sendEmail(firstName, lastName, emailAddress, activationCode) {
  let to = emailAddress;
  let from = process.env.FROM_EMAIL;
  let subject = "Activate your Miski Account";
  let message = `Hey there, ${firstName} ${lastName}!\n\nYou can't do anything with it right now, but your activation code is: ${activationCode}`;

  authorizeEmail.createAuthorizedClient('gmail_client_secret.json')
    .then(oauth2client => {
      let email = authorizeEmail.createEmail(to, from, subject, message);
      authorizeEmail.sendMessage(email, oauth2client);
    }).catch(error => {
      console.error(error);
    });
}

function findUserById(id, client) {
  return client.query(`
SELECT
  first_name,
  last_name
FROM auth_public.user
WHERE auth_public.user.id = ${id}
;`);
}

client.connect(function (err) {
  if (err) throw err;

  client.on('notification', function (notification) {
    let payloadString = notification.payload;
    let payload = JSON.parse(payloadString);
    let userId = payload.user_id;
    let email = payload.email;
    let activationCode = payload.activation_code;

    findUserById(userId, client)
      .then(result => {
        if (result.rows.length != 1) {
          console.error("Expected a single row for user ID " + userId + ", but found " + result.rows.length);
        }

        sendEmail(result.rows[0].first_name, result.rows[0].last_name, email, activationCode);
      }).catch(error => console.error(error));
  });

  client.query("LISTEN sign_ups");
});

const app = express()

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use(postgraphql(
  postgresConfig,
  process.env.POSTGRAPHQL_SCHEMA, {
    graphiql: true,
    watchPg: true,
    jwtPgTypeIdentifier: `${process.env.POSTGRAPHQL_SCHEMA}.jwt`,
    jwtSecret: process.env.JWT_SECRET,
    pgDefaultRole: process.env.POSTGRAPHQL_DEFAULT_ROLE
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