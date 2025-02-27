const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { name, email } = body;

    if (!name || !email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing name or email" }),
      };
    }

    const createdAt = new Date().toISOString();

    const params = {
      TableName: "UserRecords",
      Item: {
        PK: "USER", 
        createdAt,  
        name,
        email,
      },
    };

    await docClient.send(new PutCommand(params));

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "User added", item: params.Item }),
    };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ message: "Internal error" }) };
  }
};
