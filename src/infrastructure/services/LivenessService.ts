import {
  CompareFacesCommand,
  CreateFaceLivenessSessionCommand,
  GetFaceLivenessSessionResultsCommand,
  RekognitionClient,
} from "@aws-sdk/client-rekognition";
import { LivenessSession } from "../models/LivenessSessionModel.js";
import { UserProfile } from "../models/UserProfileModel.js";

const rekognition = new RekognitionClient({
  region: process.env.AWS_REGION ?? "us-east-1",
});

type FaceComparison =
  | { status: "COMPARED"; similarity: number | null }
  | { status: "NO_PROFILE_PHOTO" }
  | { status: "UNSUPPORTED_PROFILE_IMAGE_FORMAT" };

export interface LivenessResult {
  sessionId: string;
  status: string;
  confidence?: number;
  feedback?: Array<{ code?: string; message?: string }>;
  faceComparison?: FaceComparison;
}

export class LivenessService {
  async createSession(userId: number): Promise<{ sessionId: string }> {
    const creation = await rekognition.send(new CreateFaceLivenessSessionCommand({}));
    if (!creation.SessionId) {
      throw new Error("Rekognition did not return a Face Liveness session ID.");
    }

    await LivenessSession.create({
      session_id: creation.SessionId,
      user_id: userId,
      status: "CREATED",
    });

    return { sessionId: creation.SessionId };
  }

  async getResult(userId: number, sessionId: string): Promise<LivenessResult | null> {
    const session = await LivenessSession.findByPk(sessionId);
    if (!session) {
      return null;
    }
    if (session.user_id !== userId) {
      throw new LivenessSessionAccessError();
    }

    const result = await rekognition.send(
      new GetFaceLivenessSessionResultsCommand({ SessionId: sessionId }),
    );
    const status = result.Status ?? "UNKNOWN";

    if (status !== session.status) {
      session.status = status;
      await session.save();
    }

    const response: LivenessResult = {
      sessionId,
      status,
      ...(result.Confidence !== undefined ? { confidence: result.Confidence } : {}),
      ...(result.Feedback
        ? {
            feedback: result.Feedback.map((item) => ({
              ...(item.Code ? { code: item.Code } : {}),
              ...(item.Message ? { message: item.Message } : {}),
            })),
          }
        : {}),
    };

    if (status !== "SUCCEEDED") {
      return response;
    }

    const profile = await UserProfile.findOne({
      where: { user_id: userId },
      attributes: ["bitmap"],
    });
    if (!profile?.bitmap) {
      response.faceComparison = { status: "NO_PROFILE_PHOTO" };
      return response;
    }

    const profileImage = Buffer.from(profile.bitmap);
    if (!isJpegOrPng(profileImage)) {
      response.faceComparison = { status: "UNSUPPORTED_PROFILE_IMAGE_FORMAT" };
      return response;
    }

    if (!result.ReferenceImage?.Bytes) {
      throw new Error("Rekognition returned no reference image for the completed session.");
    }

    const comparison = await rekognition.send(
      new CompareFacesCommand({
          SourceImage: { Bytes: result.ReferenceImage.Bytes },
          TargetImage: { Bytes: profileImage },
          SimilarityThreshold: 0,
      }),
    );
    const similarities = comparison.FaceMatches
      ?.map((match) => match.Similarity)
      .filter((similarity): similarity is number => similarity !== undefined) ?? [];

    response.faceComparison = {
      status: "COMPARED",
      similarity: similarities.length > 0 ? Math.max(...similarities) : null,
    };
    return response;
  }
}

const isJpegOrPng = (image: Buffer): boolean =>
  (image.length >= 3 && image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff) ||
  (image.length >= 8 &&
    image[0] === 0x89 &&
    image[1] === 0x50 &&
    image[2] === 0x4e &&
    image[3] === 0x47 &&
    image[4] === 0x0d &&
    image[5] === 0x0a &&
    image[6] === 0x1a &&
    image[7] === 0x0a);

export class LivenessSessionAccessError extends Error {
  constructor() {
    super("The authenticated user does not own this liveness session.");
    this.name = "LivenessSessionAccessError";
  }
}
