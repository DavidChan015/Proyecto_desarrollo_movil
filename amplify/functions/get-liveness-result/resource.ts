import { defineFunction } from "@aws-amplify/backend";

export const getLivenessResult = defineFunction({
  name: "get-liveness-result",
  entry: "./handler.ts",
});
