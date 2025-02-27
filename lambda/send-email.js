const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");

const dynamoClient = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const sesClient = new SESClient({ region: "ap-south-1" });

exports.handler = async () => {
  try {
    const params = {
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: {
        ":pk": "USER",
      },
      ScanIndexForward: false, 
      Limit: 10,
    };

    const result = await docClient.send(new QueryCommand(params));
    const items = result.Items || [];

    let emailBody;
    if (items.length === 0) {
      emailBody = "No new records found.";
    } else {
      emailBody = items
        .map(
          (item) =>
            `Name: ${item.name || "N/A"}, Email: ${item.email || "N/A"}, CreatedAt: ${item.createdAt || "N/A"}`
        )
        .join("\n");
    }

    const emailParams = {
      Destination: {
        ToAddresses: [process.env.TARGET_EMAIL],
      },
      Message: {
        Body: {
          Text: {
            Charset: "UTF-8",
            Data: emailBody,
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: "Latest 10 User Records",
        },
      },
      Source: process.env.SENDER_EMAIL, 
    };

    await sesClient.send(new SendEmailCommand(emailParams));
    console.log("Email sent successfully.");

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Email sent successfully." }),
    };
  } catch (error) {
    console.error("Error sending email:", error.message || error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
    };
  }
};
