const fs = require('fs');
const readline = require('readline');
const google = require('googleapis');
const googleAuth = require('google-auth-library');
const Base64 = require('js-base64').Base64;

const SCOPES = ['https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.send'
];

const TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
  process.env.USERPROFILE) + '/.credentials/';
const TOKEN_PATH = TOKEN_DIR + 'gmail-nodejs-quickstart.json';

/**
 * Read the contents of the client secret JSON file
 * 
 * @param {String} filename - name of the file containing the client secrets
 */
function readClientSecret(filename) {
  return new Promise((resolve, reject) => {
    fs.readFile(filename, (err, content) => {
      if (err) {
        return reject('Error loading client secret from ' + filename +
          ' due to ' + err);
      }
      return resolve(content);
    });
  });
}

/**
 * Create an OAuth2 client with the given credentials
 *
 * @param {Object} credentials The authorization client credentials.
 */
function authorize(credentials) {
  let clientSecret = credentials.installed.client_secret;
  let clientId = credentials.installed.client_id;
  let redirectUrl = credentials.installed.redirect_uris[0];
  let auth = new googleAuth();
  let oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  return new Promise((resolve, reject) => {
    // Try reading the existing token
    fs.readFile(TOKEN_PATH, function (err, token) {
      if (err) {
        // If there isn't an existing token, get a new one
        resolve(getNewToken(oauth2Client));
      } else {
        oauth2Client.credentials = JSON.parse(token);
        resolve(oauth2Client);
      }
    });
  });
}

/**
 * Get and store new token after prompting for user authorization, then return
 * authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 */
function getNewToken(oauth2Client) {
  let authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });

  console.log('Authorize this app by visiting this url: ', authUrl);

  let readlineInterface = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve, reject) => {
    readlineInterface.question('Enter the code from that page here: ',
      (code) => {
        readlineInterface.close();
        oauth2Client.getToken(code, (err, token) => {
          if (err) {
            return reject('Error while trying to retrieve access token', err);
          }

          oauth2Client.credentials = token;
          storeToken(token);
          return resolve(oauth2Client);
        });
      });
  });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code != 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token));
  console.log('Token stored to ' + TOKEN_PATH);
}

/**
 * Build an email as an RFC 5322 formatted, Base64 encoded string
 * 
 * @param {String} to email address of the receiver
 * @param {String} from email address of the sender
 * @param {String} subject email subject
 * @param {String} message body of the email message
 */
function createEmail(to, from, subject, message) {
  let email = ["Content-Type: text/plain; charset=\"UTF-8\"\n",
    "MIME-Version: 1.0\n",
    "Content-Transfer-Encoding: 7bit\n",
    "to: ", to, "\n",
    "from: ", from, "\n",
    "subject: ", subject, "\n\n",
    message
  ].join('');

  return Base64.encodeURI(email);
}

/**
 * Send Message.
 *
 * @param  {String} userId User's email address. The special value 'me'
 * can be used to indicate the authenticated user.
 * @param  {String} email RFC 5322 formatted, Base64 encoded string.
 * @param {google.auth.OAuth2} oauth2Client The authorized OAuth2 client
 */
function sendMessage(email, oauth2Client) {
  let request = google.oauth2("v2").google.gmail('v1').users.messages.send({
    auth: oauth2Client,
    userId: 'me',
    'resource': {
      'raw': email
    }
  });
}

var createAuthorizedClient = (filename) => {
  return readClientSecret(filename)
    .then(clientSecretJson => {
      let clientSecret = JSON.parse(clientSecretJson);
      return authorize(clientSecret);
    });
}

exports.createAuthorizedClient = createAuthorizedClient;
exports.createEmail = createEmail;
exports.sendMessage = sendMessage;