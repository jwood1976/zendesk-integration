//
// Conversations to ZenDesk Integration Application
// 2017 Spredfast Inc.
// https://github.com/spredfast/zendesk-integration
//
var express = require('express'),
    app = express(),
    port = process.env.PORT || 8080;
var bodyParser = require('body-parser');
var request = require('request');

//
// Configuration is specifed in the Heroku environment. 
// All configuration is defined in app.json and is REQUIRED.
//

var SpredfastApiToken = process.env.SPREDFAST_API_TOKEN;
var SpredfastCompanyId = process.env.SPREDFAST_COMPANY_ID;
var SpredfastLabelName = process.env.SPREDFAST_LABEL_NAME;
var HerokuAppName = process.env.HEROKU_APP_NAME;
var ZendeskAppUrl = process.env.ZENDESK_APP_URL;
var ZendeskUserEmail = process.env.ZENDESK_USER_EMAIL;
var ZendeskApiToken = process.env.ZENDESK_API_TOKEN;
var BearerToken = process.env.NOTIFIER_BEARER_TOKEN; 

//
// Spredfast event notification.
// Subscribe to manual label application in the inbox.
// The notifiation URL is the URL of this Heroku application.
//

var herokuUrl=`https://${HerokuAppName}.herokuapp.com/createTicket`;
var zendeskUrl = `${ZendeskAppUrl}/api/v2/tickets/create_many.json`;

var entity= {
  companyId: SpredfastCompanyId,           // Your company ID on Spredfast
  externalId: "send-to-zendesk",           // Your unique name for your subscription
  eventName: "stream-item-label-applied",  // The Spredfast event you're subscribing to
  notificationUri: herokuUrl,              // The URL of this Heroku app
  query: SpredfastLabelName,               // The Spredfast label to watch for
  bearerToken: BearerToken                 // The bearer token to be passed in notifcations to this app
};

//
// POST to Spredfast to make a subscription. Whenever the specified label is
// applied Spredfast will invoke this Heroku app.
//
request.post({
  url: `https://api.spredfast.com/v1/events/company/${SpredfastCompanyId}/subscription`,
  auth: {
    bearer: SpredfastApiToken   // Secret obtained from Spredfast
  },
  json: entity
}, function(error, response, body) {
  if (error) {
    console.log(error);
    process.exit(-1);
  }
  console.log("Subscribed to Spredfast Notifications");
  console.log(body);
});

//
// This method receives a notification from Spredfast Conversations and invokes
// the ZenDesk API to create a new ticket.
//

var bearerToken = `Bearer ${BearerToken}`;  // Construct RFC670 bearer token format
app.use( bodyParser.json() );

app.post('/createTicket', function (req, res) {

  // Verify the bearer token is present that was provided in our subscription
  // This secures this endpoint against unauthorized use.

  if (req.header('authorization') !== bearerToken) {
    res.status(403).send();
    return;
  }

  // The notification from Spredfast can contain several stream items.
  // Iterate over them and create a Zendesk ticket for each one.

  var tickets = [];
  for (var item of req.body.data.items) {
    var ticket = {
      subject: `Case from Social Network ${item.entityId}`,
      comment: { body: item.text},
      external_id: item.link,
      priority: "normal"
    };
    tickets.push(ticket);
  }

  var body = {
    tickets: tickets
  };
  request.post({
    url: zendeskUrl,
    auth: {
      user: `${ZendeskUserEmail}/token`,
      pass: ZendeskApiToken
    },
    json: body
  }, function(error, response, body) {
    console.log(body);
    res.status(response.statusCode).send(body);
  });

})

// This starts our /createTicket service

var server = app.listen(port, function () {
  console.log(`Service started on port ${port}`);
})


