# Face Liveness backend (Amplify Gen 2)

The `amplify/` directory defines two Lambda functions, a DynamoDB session table,
and an HTTP API protected by the existing Cognito User Pool. The table is kept
in a separate stack from the API to avoid a CloudFormation dependency cycle:
the function stacks depend on the table, and the API stack depends on the
functions. The User Pool is referenced by ID; this backend does not create a
replacement User Pool.

## AWS resources already configured manually

The current backend configuration uses:

- Region: `us-east-1`
- Cognito User Pool: `us-east-1_cOYZI8sXt`
- Public Android App Client: `7imprt2clma951aoh3brk3dkeo`

Update these constants in `amplify/backend.ts` when using a different AWS
environment. Do not configure a client secret in the Android app.

The Cognito Identity Pool is separate and remains manually managed. Its
authenticated IAM role must allow `rekognition:StartFaceLivenessSession`.
Do not grant that operation to unauthenticated/guest identities. The two
backend Lambda roles receive only their respective create-session and
get-results Rekognition actions from the Gen 2 definition.

## Deploy a development sandbox

1. Configure AWS credentials locally with an AWS CLI profile that can deploy
   Amplify/CDK resources in `us-east-1`. Never paste access keys into source
   code, chat, or Android.
2. Run `npm run ampx:sandbox` from the repository root. If using a named AWS
   profile, pass it through to `ampx sandbox`.
3. After deployment, find the `LivenessApiEndpoint` CloudFormation output.
   The API exposes:
   - `POST /liveness/sessions`
   - `GET /liveness/sessions/{sessionId}`
4. In Android, sign in with Cognito and send the ID token in the `Authorization`
   header as a Bearer token to both API routes. Use the returned `sessionId`
   with the Android Face Liveness component, then call the result route after
   capture completes.

The create-session function records the Cognito `sub` for each session. The
result function checks that ownership before querying Rekognition. Results
include status, confidence, and feedback when available; the service does not
make a business approval decision or return face images.

The DynamoDB table uses a retained removal policy. Review its retention and
data-handling requirements before deploying a production environment.

## Face Liveness through the existing local Express API

The existing Express server also exposes the same routes locally, without
calling API Gateway:

- `POST http://<computer-ip>:3000/liveness/sessions`
- `GET http://<computer-ip>:3000/liveness/sessions/<sessionId>`

These Express routes use the JWT returned by this backend's `POST /api/login`
endpoint. They do not accept a Cognito token because the current
`requireAuth` middleware validates the backend's own JWT. Android must send
that login token in the `Authorization` header.

The local Node process uses the AWS SDK default credential chain. For
development, configure a local AWS profile with only
`rekognition:CreateFaceLivenessSession` and
`rekognition:GetFaceLivenessSessionResults` permissions, then set
`AWS_PROFILE` and `AWS_REGION=us-east-1` in the local environment. Never put
AWS access keys in Android or source control. The authenticated Cognito
Identity Pool role used by the Android Liveness component separately requires
`rekognition:StartFaceLivenessSession`.

The `liveness_sessions` table is created by Sequelize sync and associates each
Rekognition session with the authenticated local user. The result endpoint
checks ownership before querying Rekognition. Once liveness succeeds, Express
compares Rekognition's reference image with that user's stored profile photo
using `CompareFaces` and returns the highest similarity score. It deliberately
does not make an automatic identity approval decision; calibrate a threshold
with representative data and a human-reviewed test set before using one.
`CompareFaces` accepts JPEG/PNG here; unsupported profile image formats are
reported in the response rather than silently treated as a mismatch.

## EC2 + RDS deployment (temporary HTTP testing)

The EC2 deployment uses the Express routes above, not the separate Amplify
Gen 2 API Gateway. Configure the Android app to call the EC2 address at
`http://<elastic-ip>:3000`. This is HTTP and is only suitable for a controlled
test environment; use HTTPS before production.

### AWS setup

1. Attach an EC2 instance role with the policy in
   `deploy/ec2/rekognition-liveness-policy.json` in `us-east-1`. Do not put IAM
   access keys on the instance. The role should trust the EC2 service.
2. Allocate and associate an Elastic IP so the test address does not change.
3. Configure the EC2 security group to allow TCP 3000 only from trusted test
   sources where practical, and SSH only from your administrator IP. Do not
   expose PostgreSQL port 5432 to the internet.
4. Configure the RDS security group to allow PostgreSQL traffic from the EC2
   security group. Create the application database and a least-privilege
   database user in RDS before starting the container.
5. Keep RDS and EC2 in a network configuration that permits the EC2 instance
   to reach the RDS endpoint. Prefer private RDS networking.

### Start the backend

1. Install Docker Engine and the Docker Compose plugin on EC2.
2. Copy the application to EC2 and create `.env.production` from
   `.env.production.example`. Fill in the RDS endpoint, database, user,
   password, and a new stable `JWT_SECRET`. Do not commit or share this file.
   `DB_CREATE_IF_MISSING=false` prevents the app from trying to connect as a
   PostgreSQL administrator or create databases on RDS.
3. Start the service:

   ```bash
   docker compose -f compose.ec2.yaml up -d --build
   ```

4. Check health from the instance with
   `curl http://127.0.0.1:3000/health`, then test externally using the
   Elastic IP. The health endpoint verifies the database connection.
5. In Android, use the Elastic IP URL and a JWT from the Express `/api/login`
   endpoint for the Express routes. Cognito/Identity Pool authentication is
   still separately required by the Android Face Liveness detector.

Do not use the test HTTP endpoint for real user credentials or production
traffic. For production, put the service behind HTTPS with a DNS name and
certificate, or use another managed HTTPS endpoint. An EC2 public IP by itself
is not a DNS domain for a normal ACM public certificate.