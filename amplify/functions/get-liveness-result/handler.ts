import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import {
  GetFaceLivenessSessionResultsCommand,
  RekognitionClient,
} from "@aws-sdk/client-rekognition";
import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from "aws-lambda";

const rekognition = new RekognitionClient({});
const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const respond = (
  statusCode: number,
  body: Record<string, unknown>,
): APIGatewayProxyResultV2 => ({
  statusCode,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  const userSub = event.requestContext.authorizer.jwt.claims.sub;
  const sessionId = event.pathParameters?.sessionId;
  const tableName = process.env.LIVENESS_TABLE_NAME;

  if (typeof userSub !== "string" || !userSub) {
    return respond(401, { error: "Autenticación requerida." });
  }
  if (!sessionId) {
    return respond(400, { error: "Se requiere sessionId." });
  }
  if (!tableName) {
    throw new Error("LIVENESS_TABLE_NAME is not configured.");
  }

  try {
    const storedSession = await dynamodb.send(
      new GetCommand({
        TableName: tableName,
        Key: { sessionId },
        ConsistentRead: true,
      }),
    );

    if (!storedSession.Item) {
      return respond(404, { error: "La sesión no existe." });
    }
    if (storedSession.Item.userSub !== userSub) {
      return respond(403, { error: "No tienes acceso a esta sesión." });
    }

    const result = await rekognition.send(
      new GetFaceLivenessSessionResultsCommand({ SessionId: sessionId }),
    );
    const status = result.Status ?? "UNKNOWN";

    if (status === "SUCCEEDED" || status === "FAILED") {
      await dynamodb.send(
        new UpdateCommand({
          TableName: tableName,
          Key: { sessionId },
          UpdateExpression: "SET #status = :status",
          ExpressionAttributeNames: { "#status": "status" },
          ExpressionAttributeValues: { ":status": status },
        }),
      );
    }

    return respond(status === "CREATED" || status === "IN_PROGRESS" ? 202 : 200, {
      sessionId,
      status,
      ...(result.Confidence !== undefined ? { confidence: result.Confidence } : {}),
      ...(result.Feedback ? { feedback: result.Feedback } : {}),
    });
  } catch (error) {
    console.error(
      "Failed to retrieve Face Liveness result:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return respond(500, { error: "No se pudo consultar el resultado de la verificación." });
  }
};
