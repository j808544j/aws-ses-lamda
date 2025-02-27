const cdk = require('aws-cdk-lib');
const { Stack, Duration } = cdk;
const dynamodb = require('aws-cdk-lib/aws-dynamodb');
const lambda = require('aws-cdk-lib/aws-lambda');
const apigateway = require('aws-cdk-lib/aws-apigateway');
const events = require('aws-cdk-lib/aws-events');
const targets = require('aws-cdk-lib/aws-events-targets');
const iam = require('aws-cdk-lib/aws-iam');

class MyUserAppStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const userTable = new dynamodb.Table(this, 'UserTable', {
      tableName: 'UserRecords',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    const addUserFunction = new lambda.Function(this, 'AddUserFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'add-user.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        TABLE_NAME: userTable.tableName,
      },
    });

    userTable.grantWriteData(addUserFunction);

    const api = new apigateway.RestApi(this, 'UserApi', {
      restApiName: 'User Service',
    });
    const addUserResource = api.root.addResource('addUser');
    addUserResource.addMethod('POST', new apigateway.LambdaIntegration(addUserFunction));

    const sendEmailFunction = new lambda.Function(this, 'SendEmailFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'send-email.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        TABLE_NAME: userTable.tableName,
        TARGET_EMAIL: 'dineshj808544j@gmail.com',
        SENDER_EMAIL: 'j808544j@gmail.com',
      },
    });



    sendEmailFunction.role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonDynamoDBReadOnlyAccess')
    );
    
    sendEmailFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ["ses:SendEmail", "ses:SendRawEmail"],
      resources: ["*"], 
    }));

    const rule = new events.Rule(this, 'EmailScheduleRule', {
      schedule: events.Schedule.rate(Duration.minutes(1)),
    });
    rule.addTarget(new targets.LambdaFunction(sendEmailFunction));
  }
}

module.exports = { MyUserAppStack };
