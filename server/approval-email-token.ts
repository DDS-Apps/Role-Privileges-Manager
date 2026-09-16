import { SignJWT, jwtVerify } from "jose";
import type { ApprovalStage } from "@shared/schema";

export type EmailApprovalAction = "approve" | "reject";

export interface ApprovalEmailTokenPayload {
  requestId: string;
  action: EmailApprovalAction;
  approverContactId: string;
  approverEmail: string;
  stage: ApprovalStage;
}

function getSecretKey() {
  const secret = process.env.SESSION_SECRET || process.env.APPROVAL_EMAIL_SECRET || "";
  if (!secret) {
    throw new Error("SESSION_SECRET is required for approval email links");
  }
  return new TextEncoder().encode(secret);
}

export async function signApprovalEmailToken(
  payload: ApprovalEmailTokenPayload,
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("14d")
    .sign(getSecretKey());
}

export async function verifyApprovalEmailToken(
  token: string,
): Promise<ApprovalEmailTokenPayload> {
  const { payload } = await jwtVerify(token, getSecretKey());
  const requestId = String(payload.requestId || "");
  const action = payload.action as EmailApprovalAction;
  const approverContactId = String(payload.approverContactId || "");
  const approverEmail = String(payload.approverEmail || "").toLowerCase();
  const stage = payload.stage as ApprovalStage;

  if (!requestId || !approverContactId || !approverEmail) {
    throw new Error("Invalid approval token");
  }
  if (action !== "approve" && action !== "reject") {
    throw new Error("Invalid approval action");
  }
  if (!["none", "pending_requester_gm", "pending_target_gm"].includes(stage)) {
    throw new Error("Invalid approval stage");
  }

  return { requestId, action, approverContactId, approverEmail, stage };
}
