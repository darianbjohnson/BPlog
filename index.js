/**
    Copyright 2014-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved.
    Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at
        http://aws.amazon.com/apache2.0/
    or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
*/


/**
 * App ID for the skill
 */
var APP_ID = undefined; //replace with 'amzn1.echo-sdk-ams.app.[your-unique-value-here]';

var https = require('https');

var AWS = require('aws-sdk'); 
var sns = new AWS.SNS();
var ddb = new AWS.DynamoDB();
/**
 * The AlexaSkill Module that has the AlexaSkill prototype and helper functions
 */
var AlexaSkill = require('./AlexaSkill');

var MQTT_Clinet_ARN = 'Update with the TOPIC ARN for you Mystic Mirror'

/**
 * MysticMirrorSkill is a child of AlexaSkill.
 * To read more about inheritance in JavaScript, see the link below.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Introduction_to_Object-Oriented_JavaScript#Inheritance
 */
var MysticMirrorSkill = function() {
    AlexaSkill.call(this, APP_ID);
};

// Extend AlexaSkill
MysticMirrorSkill.prototype = Object.create(AlexaSkill.prototype);
MysticMirrorSkill.prototype.constructor = MysticMirrorSkill;

//var accessToken = ""

var sessionAttributes = {}; 
var monthNames = ["January", "February", "March", "April", "May", "June",
                      "July", "August", "September", "October", "November", "December"
    ];
	

MysticMirrorSkill.prototype.eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {
    console.log("MysticMirrorSkill onSessionStarted requestId: " + sessionStartedRequest.requestId
        + ", sessionId: " + session.sessionId);
	
    // any session init logic would go here
};

MysticMirrorSkill.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    console.log("MysticMirrorSkill onLaunch requestId: " + launchRequest.requestId + ", sessionId: " + session.sessionId);
    getWelcomeResponse(response);
};

MysticMirrorSkill.prototype.eventHandlers.onSessionEnded = function (sessionEndedRequest, session) {
    console.log("onSessionEnded requestId: " + sessionEndedRequest.requestId
        + ", sessionId: " + session.sessionId);

    // any session cleanup logic would go here
};

MysticMirrorSkill.prototype.intentHandlers = {
	
	"LogBP": function (intent, session, response) {
		
			logBP(intent, session, response);
		
    },
	
	"AverageBP": function (intent, session, response) {
		
			averageBP(intent, session, response);
		
    },
	
	"HistoricalBP": function (intent, session, response) {
		
			historicalBP(intent, session, response);
		
    },
	

    "AMAZON.HelpIntent": function (intent, session, response) {
        var speechText = "The Blood Pressure Log allows you to record your blood pressure readings by day. " +
		"You can tell me your current blood pressure, in the format of systolic over diastolic. " +
		"You can also ask me to provide your average blood pressure. This command will provide an average of the last ten readings. " + 
		"Finally, you can ask me to export your most recent recordings to a card in your Alexa app, by saying 'Export History' ." +
		"To get started tell me your current blood pressure, such as one twenty over eighty."
        var repromptText = "Can you tell me your current blood pressure, in the format of systolic over diastolic?";
        var speechOutput = {
            speech: speechText,
            type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };
        var repromptOutput = {
            speech: repromptText,
            type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };
        response.ask(speechOutput, repromptOutput);
    },

    "AMAZON.StopIntent": function (intent, session, response) {
        var speechOutput = {
                speech: "Goodbye",
                type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };
        response.tell(speechOutput);
    },

    "AMAZON.CancelIntent": function (intent, session, response) {
        var speechOutput = {
                speech: "Goodbye",
                type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };
        response.tell(speechOutput);
    }
};

/**
 * Function to handle the onLaunch skill behavior
 */

function getWelcomeResponse(response) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    var cardTitle = "The Blood Pressure Log";
    var repromptText = "The Blood Pressure Log allows you to save your blood pressure readings by day. " +
	"These readings can be averaged to give you a composite view of your blood pressure over a period of time. " +
	"To get started, just tell me your current blood pressure, in the format of systolic over diastolic, such as one twenty over eighty?";
    var speechText = "Tell me what your current blood pressure reading is, such as one twenty over eighty.";
    var cardOutput = "The Blood Pressure Log: Tell me what your current blood pressure reading is, such as one twenty over eighty.";
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.

    var speechOutput = {
        speech: "<speak>" + speechText + "</speak>",
        type: AlexaSkill.speechOutputType.SSML
    };
    var repromptOutput = {
        speech: repromptText,
        type: AlexaSkill.speechOutputType.PLAIN_TEXT
    };
    response.askWithCard(speechOutput, repromptOutput, cardTitle, cardOutput);
}


function logBP(intent, session, response) {
	//console.log('acct linked: ' + sessionAttributes.accountLinked);
	
	autheticateUser(session, response, function (result) {
		
		var systolicSlot = intent.slots.systolic;
		var diastolicSlot = intent.slots.diastolic;

		var systolicValue;
		var diastolicValue;
		

		var date = new Date();
		var DateString = monthNames[date.getMonth()] + " " + date.getDate() + ", " + date.getFullYear();
		sessionAttributes.DateString = DateString;
			
		var standardizeDate = new Date (date.getFullYear(), date.getMonth(), date.getDate());
		var getTime = standardizeDate.getTime();
		sessionAttributes.DateOrder = getTime;
			

		session.attributes = sessionAttributes;

		//Blood Pressure Readings
		if (systolicSlot && isNumeric(systolicSlot.value) && diastolicSlot && isNumeric(diastolicSlot.value) ) {
				systolicValue = parseInt(systolicSlot.value);
				diastolicValue = parseInt(diastolicSlot.value);
				sessionAttributes.systolicValue = systolicValue;
				sessionAttributes.diastolicValue = diastolicValue;

		}else{

			var speechText = "Either I didn't understand you, or you did not tell me a validate blood pressure reading. " +
			"Can you please tell me your blood pressure, in the form of systolic over diastolic, such as one twenty over eighty?" ;

			var speechOutput = {
				speech: "<speak>" + speechText + "</speak>",
				type: AlexaSkill.speechOutputType.SSML
			};
			
			response.ask(speechOutput);	
		}
			
		session.attributes = sessionAttributes;
		
		// If we wanted to initialize the session to have some attributes we could add those here.
		var cardTitle = "Your Blood Pressure for " + sessionAttributes.DateString;
		var repromptText = "Your blood pressure reading was recorded as " + systolicValue + " over " + diastolicValue + ".";
		var speechText = "I've recorded your blood pressure on " + sessionAttributes.DateString + " as " + systolicValue + " over " + diastolicValue + "."
		var cardOutput = "Your blood pressure reading was recorded as " + systolicValue + " over " + diastolicValue + ".";

		var speechOutput = {
			speech: "<speak>" + speechText + "</speak>",
			type: AlexaSkill.speechOutputType.SSML
		};
		var repromptOutput = {
			speech: repromptText,
			type: AlexaSkill.speechOutputType.PLAIN_TEXT
		};
				
		savetoDB(sessionAttributes.email, sessionAttributes.DateString, systolicValue, diastolicValue, sessionAttributes.DateOrder, function (results){
			console.log(results);
			session.attributes = sessionAttributes;			


			getAverageBP(sessionAttributes.email,function (records){
				var payload = JSON.stringify({'intent': 'bp','payload':records})
				var sns_message = JSON.stringify({'topic': sessionAttributes.email + '/' + 'display' ,'payload':payload})
				
				sendSNS(sns_message,function (SNS_results){
					console.log(SNS_results);
					response.tell(speechOutput);		
				});
	
			});

						
		});
				

	});		
		
}

function averageBP(intent, session, response) {
	
	autheticateUser(session, response, function (result) {
		
		
		getAverageBP(sessionAttributes.email,function (records){
				console.log(records);
				
			if (records.length > 0){
				
				var AvgReadingsInt = records.length-1;
				
				var i = 0;
				var cardlist = "";
				while (i < AvgReadingsInt) {
					cardlist += records[i].RecordDate + " : " + records[i].Systolic + "/" + records[i].Diastolic + "\n";
					i++;
				}
				
		
				var cardTitle = "Your Average Blood Pressure is " + records[AvgReadingsInt].Systolic + " over " + records[AvgReadingsInt].Diastolic + ".";
				var speechText = "Your average blood pressure is " + records[AvgReadingsInt].Systolic + " over " + records[AvgReadingsInt].Diastolic + ".";
				var cardContent = "Your most recent blood pressure readings are as follows:\n" + cardlist
				
				var speechOutput = {
					speech: "<speak>" + speechText + "</speak>",
					type: AlexaSkill.speechOutputType.SSML
				};
				
				response.tellWithCard(speechOutput, cardTitle, cardContent);
				
			}else{
				
				var speechText = "You do not have any saved blood pressure recordings.";
				var speechOutput = {
					speech: "<speak>" + speechText + "</speak>",
					type: AlexaSkill.speechOutputType.SSML
				};
				response.tell(speechOutput);
				
			}
				
	
		});
		
	
	});	
	
}


function historicalBP(intent, session, response) {
	
	autheticateUser(session, response, function (result) {
		
		
		getAverageBP(sessionAttributes.email,function (records){
				console.log(records);
				
			if (records.length > 0){
				
				var AvgReadingsInt = records.length-1;
				
				var i = 0;
				var cardlist = "";
				while (i < AvgReadingsInt) {
					cardlist += records[i].RecordDate + " : " + records[i].Systolic + "/" + records[i].Diastolic + "\n";
					i++;
				}
				
		
				var cardTitle = "Your Historical Blood Pressure Records";
				var speechText = "Your most recent records have been exported to a card in your Alexa App.";
				var cardContent = "Your most recent blood pressure readings are as follows:\n" + cardlist
				
				var speechOutput = {
					speech: "<speak>" + speechText + "</speak>",
					type: AlexaSkill.speechOutputType.SSML
				};
				
				response.tellWithCard(speechOutput, cardTitle, cardContent);
				
			}else{
				
				var speechText = "You do not have any saved blood pressure recordings.";
				var speechOutput = {
					speech: "<speak>" + speechText + "</speak>",
					type: AlexaSkill.speechOutputType.SSML
				};
				response.tell(speechOutput);
				
			}
				
	
		});
		
	
	});	
	
}



function getEmailfromGoogle(auth_token, eventCallback) {
    var url = 'https://www.googleapis.com/oauth2/v2/userinfo?access_token=' + auth_token

    https.get(url, function(res) {
        var body = '';

        res.on('data', function (chunk) {
            body += chunk;
        });

        res.on('end', function () {
            //var stringResult = parseJson(body);
			//console.log('body:' + body)
            eventCallback(JSON.parse(body));
        });
    }).on('error', function (e) {
        console.log("Got error: ", e);
    });
}


function sendSNS(message, eventCallback) {
    
	sns.publish({
			Message: message,
			TargetArn: MQTT_Clinet_ARN
		  }, function(err, data) {
			if (err) {
			  console.log(err.stack);
			  return;
			}

			eventCallback(data);
	});
	
}

function savetoDB(email, savedate, systolic, diastolic, getTime, eventCallback) {
	
	var docClient = new AWS.DynamoDB.DocumentClient();

	var table = "Magic_Mirror_BP";

	var params = {
		TableName:table,
		Item:{
			"Email": email,
			"RecordDate": savedate,
			"Systolic": systolic,
			"Diastolic": diastolic,
			"DateOrder" : getTime
		}
	};

	docClient.put(params, function(err, data) {

		if (err) {
			console.log(err);
			console.log(err.stack);
			return;
		} else{
			console.log(data);
			eventCallback(data);
			
		}
		
		
	});

	
}

function getAverageBP(email, eventCallback){
	
	var docClient = new AWS.DynamoDB.DocumentClient();
	
	var params = {
		TableName: "Magic_Mirror_BP",
		KeyConditionExpression: "Email = :email",
		ExpressionAttributeValues: {
			":email": email
		},
		Limit: 10,
		ScanIndexForward: false
	};

	docClient.query(params, function(err, data) {
		if (err)
			console.log(JSON.stringify(err, null, 2));
		else
			var recordcount = data.Items.length;
			var maxrecords;
			var i = 0;
			var BPHistory = [];
			var avgSystolic = 0;
			var avgDiastolic = 0;
			
		
			if (recordcount>0){
				data.Items.forEach(function(item) {
					console.log(item.RecordDate);
					BPHistory.push({RecordDate: item.RecordDate, Systolic: item.Systolic, Diastolic: item.Diastolic }); 
					avgSystolic = avgSystolic + item.Systolic;
					avgDiastolic = avgDiastolic + item.Diastolic;
				});
				avgSystolic = parseInt(avgSystolic/recordcount);
				avgDiastolic = parseInt(avgDiastolic/recordcount);
				BPHistory.push({RecordDate: 'Average', Systolic: avgSystolic, Diastolic: avgDiastolic }); 
				console.log(avgSystolic);
				
			}
			console.log(BPHistory);
			//console.log(JSON.stringify(BPHistory));
			eventCallback(BPHistory);
	});
	
	
}

function autheticateUser(session, response, eventCallback) {
	
	if (typeof session.user.accessToken === 'undefined') {
        console.log ("no token");
		
		var cardTitle = "Link Account";
		var cardContent = "You will need to link to your Google account to enable this skill.";
		var speechText = "You will need to link to your Google account to enable this skill. Go to the Alexa app to do this.";
		var cardType = "LinkAccount"
    	
		var speechOutput = {
			speech: "<speak>" + speechText + "</speak>",
			type: AlexaSkill.speechOutputType.SSML
		};
	
		response.linkWithCard(speechOutput, cardTitle, cardContent, cardType);
		
    } else {
		var accessToken = session.user.accessToken
        console.log ("has a token:" + accessToken + " is the token.");
		
		getEmailfromGoogle(accessToken, function (result) {
			//console.log('result:' + result);
			if (typeof result.email === 'undefined'){
				var cardTitle = "Re-enable Account";
				var cardContent = "You will need to disable and re-link the skill.";
				var speechText = "I am having problems authenticating you. Please disabe the skill, re-ebale it, and re-link to your Google Account.";
				
				var speechOutput = {
					speech: "<speak>" + speechText + "</speak>",
					type: AlexaSkill.speechOutputType.SSML
				};
			
				response.tellWithCard(speechOutput, cardTitle, cardContent);

				
			} else{
				sessionAttributes.authenticated = true;
				sessionAttributes.accountLinked = true;
				sessionAttributes.email = result.email;
				
				eventCallback('cotinue');
				
				
			}
		});

	}
	
	
}

function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}


// Create the handler that responds to the Alexa Request.
exports.handler = function (event, context) {
    // Create an instance of the HistoryBuff Skill.
    var skill = new MysticMirrorSkill();
    skill.execute(event, context);
};
