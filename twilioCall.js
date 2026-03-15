// Download the helper library from https://www.twilio.com/docs/node/install
import twilio from "twilio";
import dotenv from "dotenv";

dotenv.config({path:"config.env"})

// Find your Account SID and Auth Token at twilio.com/console
// and set the environment variables. See http://twil.io/secure
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

console.log(accountSid,authToken)
const client = twilio(accountSid, authToken);


async function createCall() {
  const call = await client.calls.create({
    from: "+17406743927",
    to: "+917439247036",
    twiml: "<Response><Say>Ahoy, World</Say></Response>",
  });

  console.log(call.sid);
}

createCall();