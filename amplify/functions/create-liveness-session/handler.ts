import {
  CreateFaceLivenessSessionCommand,
  RekognitionClient,
} from "@aws-sdk/client-rekognition";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import { randomUUID } from "node:crypto";

const rekognition = new RekognitionClient({});
const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const respond = (statusCode: number, body: Record<string, unknown>): APIGatewayProxyResultV2 => ({
  statusCode,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  const userSub = event.requestContext.authorizer.jwt.claims.sub;
  const tableName = process.env.LIVENESS_TABLE_NAME;

  if (typeof userSub !== "string" || !userSub) {
    return respond(401, { error: "Autenticación requerida." });
  }
  if (!tableName) {
    throw new Error("LIVENESS_TABLE_NAME is not configured.");
  }

  try {
    const creation = await rekognition.send(
      new CreateFaceLivenessSessionCommand({ ClientRequestToken: randomUUID() }),
    );
    if (!creation.SessionId) {
      throw new Error("Rekognition did not return a session ID.");
    }

    await dynamodb.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          sessionId: creation.SessionId,
          userSub,
          createdAt: new Date().toISOString(),
          status: "CREATED",
        },
        ConditionExpression: "attribute_not_exists(sessionId)",
      }),
    );

    return respond(201, { sessionId: creation.SessionId });
  } catch (error) {
    console.error(
      "Failed to create Face Liveness session:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return respond(500, { error: "No se pudo crear la sesión de verificación." });
  }
};
