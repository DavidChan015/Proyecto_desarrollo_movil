import { defineBackend } from "@aws-amplify/backend";
import { HttpApi, HttpMethod } from "aws-cdk-lib/aws-apigatewayv2";
import { HttpJwtAuthorizer } from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import { CfnFunction } from "aws-cdk-lib/aws-lambda";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { CfnOutput, RemovalPolicy } from "aws-cdk-lib";
import { createLivenessSession } from "./functions/create-liveness-session/resource";
import { getLivenessResult } from "./functions/get-liveness-result/resource";

const region = "us-east-1";
const userPoolId = "us-east-1_cOYZI8sXt";
const appClientId = "7imprt2clma951aoh3brk3dkeo";
const issuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;

const backend = defineBackend({
  createLivenessSession,
  getLivenessResult,
});

const sessionDataStack = backend.createStack("liveness-session-data-stack");
const sessionsTable = new Table(sessionDataStack, "LivenessSessions", {
  partitionKey: { name: "sessionId", type: AttributeType.STRING },
  billingMode: BillingMode.PAY_PER_REQUEST,
  removalPolicy: RemovalPolicy.RETAIN,
});

const createFunction = backend.createLivenessSession.resources.lambda;
const createFunctionResource = createFunction.node.defaultChild;
if (!(createFunctionResource instanceof CfnFunction)) {
  throw new Error("Unable to find the CloudFormation resource for create-liveness-session.");
}
createFunctionResource.addPropertyOverride(
  "Environment.Variables.LIVENESS_TABLE_NAME",
  sessionsTable.tableName,
);
createFunction.addToRolePolicy(
  new PolicyStatement({
    actions: ["rekognition:CreateFaceLivenessSession"],
    resources: ["*"],
  }),
);
createFunction.addToRolePolicy(
  new PolicyStatement({
    actions: ["dynamodb:PutItem"],
    resources: [sessionsTable.tableArn],
  }),
);

const resultFunction = backend.getLivenessResult.resources.lambda;
const resultFunctionResource = resultFunction.node.defaultChild;
if (!(resultFunctionResource instanceof CfnFunction)) {
  throw new Error("Unable to find the CloudFormation resource for get-liveness-result.");
}
resultFunctionResource.addPropertyOverride(
  "Environment.Variables.LIVENESS_TABLE_NAME",
  sessionsTable.tableName,
);
resultFunction.addToRolePolicy(
  new PolicyStatement({
    actions: ["rekognition:GetFaceLivenessSessionResults"],
    resources: ["*"],
  }),
);
resultFunction.addToRolePolicy(
  new PolicyStatement({
    actions: ["dynamodb:GetItem", "dynamodb:UpdateItem"],
    resources: [sessionsTable.tableArn],
  }),
);

const apiStack = backend.createStack("liveness-api-stack");
const api = new HttpApi(apiStack, "LivenessApi", {
  apiName: "face-liveness-api",
});
const authorizer = new HttpJwtAuthorizer("CognitoJwtAuthorizer", issuer, {
  jwtAudience: [appClientId],
});

api.addRoutes({
  path: "/liveness/sessions",
  methods: [HttpMethod.POST],
  integration: new HttpLambdaIntegration("CreateLivenessSessionIntegration", createFunction),
  authorizer,
});
api.addRoutes({
  path: "/liveness/sessions/{sessionId}",
  methods: [HttpMethod.GET],
  integration: new HttpLambdaIntegration("GetLivenessResultIntegration", resultFunction),
  authorizer,
});

new CfnOutput(apiStack, "LivenessApiEndpoint", {
  value: api.apiEndpoint,
});
