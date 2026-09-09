/**
 * End-to-end test: HR manager external grant → 2-step GM → IT fulfillment queue
 * Run: node scripts/test-external-hr-flow.mjs
 */
import "dotenv/config";

const BASE = process.env.TEST_BASE_URL || "http://localhost:5000";
const PASSWORD = "password";

const USERS = {
  ahmad: "test-ahmad",
  gmRequester: "test-gm055",
  gmEmployee: "test-gm002",
};

const EMPLOYEE_ID = "85167"; // Shahad Abdulaziz — legalCompanyId 002
const COMPANY_ID = "055";    // access company (external vs legal 002)
const HR_PRIVILEGE_ID = "P_HR_ER_01";

function log(step, msg, extra) {
  console.log(`\n[${step}] ${msg}`);
  if (extra) console.log(JSON.stringify(extra, null, 2));
}

async function login(username) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password: PASSWORD }),
    redirect: "manual",
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Login failed for ${username}: ${res.status} ${err}`);
  }
  const setCookie = res.headers.getSetCookie?.() ?? [];
  const cookie = setCookie.map((c) => c.split(";")[0]).join("; ");
  const user = await res.json();
  return { cookie, user };
}

async function api(method, path, cookie, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function selectCompany(cookie, companyId) {
  return api("POST", "/api/auth/select-company", cookie, { companyId });
}

async function main() {
  console.log("=== RPM External HR Grant + IT Flow Test ===");
  console.log(`Target: ${BASE}`);

  // 1. Ahmad submits HR grant for external employee
  log("1", `Login as Ahmad (${USERS.ahmad})`);
  const ahmad = await login(USERS.ahmad);
  await selectCompany(ahmad.cookie, COMPANY_ID);

  const today = new Date().toISOString().split("T")[0];
  log("1b", "Create external HR grant request");
  const create = await api("POST", "/api/requests", ahmad.cookie, {
    managerId: ahmad.user.id,
    managerUserId: ahmad.user.userId,
    employeeId: EMPLOYEE_ID,
    companyId: COMPANY_ID,
    module: "HR",
    function: "Employee Relation",
    rolesSelected: [HR_PRIVILEGE_ID],
    requestType: "grant",
    startDate: today,
    endDate: null,
  });
  if (create.status !== 200 && create.status !== 201) {
    throw new Error(`Create request failed: ${create.status} ${JSON.stringify(create.data)}`);
  }
  const requestId = create.data.id;
  log("1c", "Request created", {
    id: requestId,
    status: create.data.status,
    approvalStage: create.data.approvalStage,
  });
  if (create.data.approvalStage !== "pending_requester_gm") {
    throw new Error(`Expected pending_requester_gm, got ${create.data.approvalStage}`);
  }

  // 2. Step 1 — GM of requester company (055)
  log("2", `Login as GM requester (${USERS.gmRequester}) — Step 1`);
  const gm1 = await login(USERS.gmRequester);
  const step1 = await api("PATCH", `/api/requests/${requestId}?adminId=${gm1.user.id}`, gm1.cookie, {
    status: "active",
    adminComments: "Step 1 test approval",
  });
  if (step1.status !== 200) {
    throw new Error(`Step 1 failed: ${step1.status} ${JSON.stringify(step1.data)}`);
  }
  log("2b", "After step 1", {
    status: step1.data.status,
    approvalStage: step1.data.approvalStage,
  });
  if (step1.data.status !== "pending" || step1.data.approvalStage !== "pending_target_gm") {
    throw new Error("Step 1 should leave request pending at pending_target_gm");
  }

  // 3. Step 2 — GM of employee legal company (002)
  log("3", `Login as GM employee company (${USERS.gmEmployee}) — Step 2 + IT queue`);
  const gm2 = await login(USERS.gmEmployee);
  const step2 = await api("PATCH", `/api/requests/${requestId}?adminId=${gm2.user.id}`, gm2.cookie, {
    status: "active",
    adminComments: "Step 2 test approval",
  });
  if (step2.status !== 200) {
    throw new Error(`Step 2 failed: ${step2.status} ${JSON.stringify(step2.data)}`);
  }
  log("3b", "After step 2 (IT queue)", {
    status: step2.data.status,
    approvalStage: step2.data.approvalStage,
    supportRequestTitle: step2.data.supportRequestTitle,
    itEmailSentAt: step2.data.itEmailSentAt,
  });
  if (step2.data.status !== "approved_pending_it") {
    throw new Error(`Expected approved_pending_it, got ${step2.data.status}`);
  }

  console.log("\n=== API test PASSED ===");
  console.log("\nNext manual steps:");
  console.log("  4. Check sales@dds.sa sent email to Support@dallah.com");
  console.log(`     Subject should be: ${step2.data.supportRequestTitle}`);
  console.log("  5. When ServiceDesk ack arrives (##RE-xxxxx##), poller links ticket OR");
  console.log("     Admin → Awaiting IT → Register ticket → Mark IT resolved");
  console.log(`\nRequest ID: ${requestId}`);
  console.log(`Admin mark resolved: POST /api/requests/${requestId}/mark-resolved`);
}

main().catch((err) => {
  console.error("\nTEST FAILED:", err.message);
  process.exit(1);
});
