Note: This project is mostly taken from the wonderful [PostGraphile tutorial](https://github.com/graphile/postgraphile/blob/master/examples/forum/TUTORIAL.md#authentication-and-authorization).

# What is it?

A minimal authentication and authorization enabled Express server with PostGraphile middleware creating a GraphQL server from a PostgreSQL schema.

## Email account activation

See the [this branch](https://github.com/tobymurray/postgraphile-login/tree/feature/email-activation) for an integration of email activation. This workflow creates users that are not "activated" until they provide their activation code from their email.

# Get it running

1. Clone this repository
    - `git clone https://github.com/tobymurray/postgraphile-login.git`
1. Install dependencies
    - `yarn` or `npm install`
1. Ensure you have a PostgreSQL server running somewhere. If you don't, start one.
    - E.g.: `docker run --restart=always -p 5432:5432 --name postgres -e POSTGRES_PASSWORD=password -d postgres:alpine`
1. Fill out the `.env` file with the relevant connection details
    - Note that if you change values, you may have to update `provision.sql`
1. Load the contents of `provision.sql` into your PostgreSQL server
    - E.g.: `psql -h localhost -U postgres -f provision.sql`
    - NOTE: If you're using docker, you need to specify the host explicilty (PSQL tries the socket by default, which fails)
1. Start the server
    - `yarn start`

# Try it out
1. Navigate to Graph<i>i</i>QL the port you've configured (3000 by default)
    - e.g. http://localhost:3000/graphiql

## Create a user
2. Register a user via GraphQL mutation
    - e.g.
```
mutation {
  registerUser(input: {
    firstName: "Genghis"
    lastName: "Khan"
    email: "Genghis@khan.mn"
    password: "Genghis1162"
  }) {
    user {
      id
      firstName
      lastName
      createdAt
    }
  }
}
```
3. Observe the response
    - e.g.
```
{
  "data": {
    "registerUser": {
      "user": {
        "id": 2,
        "firstName": "Genghis",
        "lastName": "Khan",
        "createdAt": "2017-06-11T06:17:39.084578"
      }
    }
  }
}
```

# Observe authentication working
4. Try authenticating with a different GraphQL mutation
    - e.g.
```
mutation {
  authenticate(input: {
    email: "Genghis@khan.mn"
    password: "Genghis1162"
  }) {
    jwt 
  }
}
```
5. Observe the response
    - e.g.:
```
{
  "data": {
    "authenticate": {
      "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYXV0aF9hdXRoZW50aWNhdGVkIiwidXNlcl9pZCI6MiwiaWF0IjoxNDk3MTYyMTIyLCJleHAiOjE0OTcyNDg1MjIsImF1ZCI6InBvc3RncmFwaHFsIiwiaXNzIjoicG9zdGdyYXBocWwifQ.hLZ7p3vJs3UYW9IKB7u8tbXONUl_tZoWhiAAD1-OPQg"
    }
  }
}
```

## Try making an unauthenticated request when authentication is necessary
6. `currentUser` is protected, so query that
```
query {
  currentUser{
    id
    firstName
    lastName
    createdAt
  }
}
```
7. Observe the not-particularly-friendly response
```
{
  "errors": [
    {
      "message": "unrecognized configuration parameter \"jwt.claims.user_id\"",
      "locations": [
        {
          "line": 2,
          "column": 3
        }
      ],
      "path": [
        "currentUser"
      ]
    }
  ],
  "data": {
    "currentUser": null
  }
}
```

## Try making an authenticated request when authentication is necessary
8. You'll need the ability to send your JWT to the server, which unfortunately isn't possible with vanilla Graph<i>i</i>QL.
    - If you're in Chrome you can try [ModHeader](https://chrome.google.com/webstore/detail/modheader/idgpnmonknjnojddfkpgkljpfnnfcklj/related)
    - If you're in Firefox you can try [Modify Headers](https://addons.mozilla.org/en-US/firefox/addon/modify-headers/)
    - If you're in another browser, you can try Chrome or Firefox
9. Set an authorization header by copy/pasting the value out of the `jwt` field in the `authenticate` response in step 5.
    - `Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYXV0aF9hdXRoZW50aWNhdGVkIiwidXNlcl9pZCI6MSwiaWF0IjoxNDk3MTYwNzA3LCJleHAiOjE0OTcyNDcxMDcsImF1ZCI6InBvc3RncmFwaHFsIiwiaXNzIjoicG9zdGdyYXBocWwifQ.aInZvEVhhDfi9yQDWRzvmSaE7Mk2PufbBrY3rxGlEt8`
    - Don't forget the `Bearer` on the right side of the header, otherwise you'll likely see `Authorization header is not of the correct bearer scheme format.`
10. Submit the query with the authorization header attached
```
query {
  currentUser{
    nodeId
    id
    firstName
    lastName
    createdAt
  }
}
```
11. Observe your now successful response
```
{
  "data": {
    "currentUser": {
      "nodeId": "WyJ1c2VycyIsMl0=",
      "id": 2,
      "firstName": "Genghis",
      "lastName": "Khan",
      "createdAt": "2017-06-11T06:17:39.084578"
    }
  }
}
```
# Observe authorization working
12. With the authorization header set, try updating Genghis
```
mutation {
  updateUser(input: {
    nodeId: "WyJ1c2VycyIsMl0="
    userPatch: {
      lastName: "NotKhan"
    }
  }) {
    user {
      nodeId
      id
      firstName
      lastName
      createdAt
    }
  }
}
```
13. Observe that it works:
```
{
  "data": {
    "updateUser": {
      "user": {
        "nodeId": "WyJ1c2VycyIsMl0=",
        "id": 2,
        "firstName": "Ghengis",
        "lastName": "NotKhan",
        "createdAt": "2017-06-11T06:17:39.084578"
      }
    }
  }
}
```
14. Add a friend
```
mutation {
  registerUser(input: {
    firstName: "Serena"
    lastName: "Williams"
    email: "Serena@Williams.ca"
    password: "NotGhengis"
  }) {
    user {
      nodeId
      id
      firstName
      lastName
      createdAt
    }
  }
}
```
15. Keeping Genghis' JWT, try modifying your friend
    - Note this is Serena's `nodeId`
```
mutation {
  updateUser(input: {
    nodeId: "WyJ1c2VycyIsM10="
    userPatch: {
      lastName: "KhanMaybe?"
    }
  }) {
    user {
      nodeId
      id
      firstName
      lastName
      createdAt
    }
  }
}
```
16. Get rejected
```
{
  "errors": [
    {
      "message": "No values were updated in collection 'users' using key 'id' because no values were found.",
      "locations": [
        {
          "line": 2,
          "column": 3
        }
      ],
      "path": [
        "updateUser"
      ]
    }
  ],
  "data": {
    "updateUser": null
  }
}
```

# Activate user

Running the server on [this branch](https://github.com/tobymurray/postgraphile-login/tree/feature/email-activation) for the first time will prompt you to integrate with Gmail. Subsequent times, your client key should be cached. Once Gmail integration is set up, create a user with a real email address you control.

```
mutation {
  registerUser(input: {
    firstName: "Firstname"
    lastName: "Lastname"
    email: "realemail@gmail.com"
    password: "doesNotMatter"
  }) {
    user {
      id
      firstName
      lastName
      createdAt
    }
  }
}
```

There's nothing particularly notable about the response here, so you can ignore it.

## Activate with the wrong code

```
mutation {
  activateUser(input: {
    email: "realemail@gmail.com",
    activationCode: "00000000-0000-0000-0000-000000000000"
  }) {
    boolean
  }
}
```

Observe the response:

```
{
  "data": {
    "activateUser": {
      "boolean": false
    }
  }
}
```

## Activate with the right code

```
mutation {
  activateUser (input:{
    email: "realemail@gmail.com",
    activationCode: "e0df9b6b-ef0f-417c-823a-6e871f5c7d43"
  }) {
    boolean
  }
}
```
And observe the successful activation!

```
{
  "data": {
    "activateUser": {
      "boolean": true
    }
  }
}
```

## Note if you actually use this
Move or remove the `.env` file and add `.env` to the `.gitignore`, then bring your `.env` back. This will ensure your environment variables (in particular your application server secret) are not added to version control and ultimately shared.

# Why write this up?

I like to build largely disposable web apps in my spare time, and almost every one needs authentication and authorization to be at all usable. Auth is hard and boring and generally not value added, so I plan on using this as something of a seed for weekend projects. 
