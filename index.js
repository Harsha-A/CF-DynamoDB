const AWS = require('aws-sdk');
const cloudformation = new AWS.CloudFormation();
const sns = new AWS.SNS();

exports.handler = async (event, context) => {
  try {
    const { TableName } = JSON.parse(event.body);

    if (!TableName) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Table name is required in the request body.' }),
      };
    }

    // Define the CloudFormation stack name
    const stackName = 'MyDynamoDBStack';

    // Create a CloudFormation template for the DynamoDB table
    const cfTemplate = {
      AWSTemplateFormatVersion: '2010-09-09',
      Resources: {
        DynamoDBTable: {
          Type: 'AWS::DynamoDB::Table',
          Properties: {
            TableName,
            AttributeDefinitions: [
              {
                AttributeName: 'id',
                AttributeType: 'N',
              },
            ],
            KeySchema: [
              {
                AttributeName: 'id',
                KeyType: 'HASH',
              },
            ],
            ProvisionedThroughput: {
              ReadCapacityUnits: 5,
              WriteCapacityUnits: 5,
            },
          },
        },
      },
    };

    // Convert the CF template to a JSON string
    const cfTemplateBody = JSON.stringify(cfTemplate);

    // Create or update the CloudFormation stack
    const stackExists = await cloudformation.describeStacks({ StackName: stackName }).promise();

    if (stackExists.Stacks.length > 0) {
      // Stack exists, update it
      await cloudformation.updateStack({ StackName: stackName, TemplateBody: cfTemplateBody }).promise();
    } else {
      // Stack doesn't exist, create it
      await cloudformation.createStack({ StackName: stackName, TemplateBody: cfTemplateBody }).promise();
    }

    // Send an SNS notification
    const snsParams = {
      TopicArn: 'SNS-TOPIC-NAME',
      Subject: 'CloudFormation Stack Deployment',
      Message: `CloudFormation stack deployed successfully in account ${process.env.AWS_ACCOUNT_ID} and region ${process.env.AWS_REGION}`,
    };

    await sns.publish(snsParams).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'CloudFormation stack deployment successful.' }),
    };
  } catch (err) {
    console.error('Error deploying CloudFormation stack:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error deploying CloudFormation stack.' }),
    };
  }
};
