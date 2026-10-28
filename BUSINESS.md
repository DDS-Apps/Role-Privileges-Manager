# RPM — Business Overview

**Role & Privileges Manager (RPM)** is Dallah’s system for requesting, approving, and tracking **business application access** across group companies. It gives managers a single place to ask for the right roles for their teams, gives General Managers (GMs) clear accountability for who gets access, and connects approved changes to **IT Support** so privileges are applied in the real systems—not only on paper.

The application is available in **English and Arabic**, reflecting how Dallah operates day to day.

---

## The business problem RPM addresses

Large organizations struggle with access management because responsibilities are split across many parties:

| Challenge | What goes wrong without RPM |
|-----------|----------------------------|
| **Scattered requests** | Access is requested by email, chat, or informal tickets with incomplete detail (which module, which role, which company, which dates). |
| **Unclear ownership** | It is not always obvious which GM must approve when someone works in one company but needs access in another. |
| **Slow IT handoff** | Even after management agrees, IT may not receive a structured request with the exact roles to grant or remove. |
| **Weak traceability** | Auditors and management cannot easily answer: *Who approved this? When? For whom? For how long?* |
| **Cross-company access** | Employees from one legal entity often need privileges in another entity’s systems—this needs **two levels of GM sign-off**, not one. |
| **Temporary access** | Time-bound roles (start/end dates) are hard to track manually; revoking or reinstating access on schedule is error-prone. |

RPM turns these into a **controlled, repeatable process** with visibility for managers, GMs, administrators, and IT.

---

## Who uses RPM and why

### Line managers and business contacts
- Submit **grant** requests when an employee needs new application roles.
- Submit **remove (revoke)** requests when access should end—optionally with a future reinstatement date.
- See their team’s pending and completed requests.
- Work within a **selected company context** (the company where access is being granted or changed).

### General Managers (GMs)
- Receive **email notifications** when a request needs their approval.
- Approve or reject from the dashboard or directly from email (with optional comments on rejection).
- For **external employees** (home company ≠ access company), GMs follow a **two-step chain**: first the requester’s company GM, then the employee’s home company GM.
- Cannot approve their **own** requests—separation of duties is enforced.

### System administrators
- Maintain the **allow-list** of people who may use RPM and their company roles.
- Oversee all requests, import role catalogs from ERP exports, and support operational tasks (e.g. resending IT notifications, linking ServiceDesk tickets).
- Full visibility across companies and modules where policy allows.

### IT Support (ServiceDesk)
- Receives a structured fulfillment request **after final GM approval**.
- Implements access in backend systems; RPM tracks ticket progress and marks requests **complete** when IT confirms resolution.

### Auditors and compliance stakeholders
- Rely on a **central audit trail** of who submitted, approved, rejected, or fulfilled each change—supporting governance and internal control objectives.

---

## What RPM does (in business terms)

### 1. Defines access in business language
Access is organized the way the business thinks about systems:

**Company → Module → Function → Role**

Examples: Finance / Treasury Management / specific treasury tasks; HR / Employee Relations / specific HR capabilities. Managers pick from an approved catalog rather than inventing free-text requests.

### 2. Controls who can even enter the system
Only **pre-approved contacts** on Dallah’s allow-list can sign in—via **Microsoft corporate sign-in** or a controlled local account where needed. Being an employee in HR data alone does not grant RPM access; identity and authorization are deliberately separate.

### 3. Manages the full request lifecycle

| Stage | Business meaning |
|-------|------------------|
| **Pending** | Submitted; waiting for GM approval (step 1 and/or step 2 for external cases). |
| **In progress (awaiting IT)** | Management approved; IT Support is implementing the change. |
| **Complete (active)** | Access is in effect (or removal has been executed, per request type and dates). |
| **Rejected** | A GM declined the request; comments can explain why. |

### 4. Supports internal and external employees

- **Internal:** Employee’s home company matches the company where access is requested. Typically **one GM approval** (employee’s company GM), unless the submitter is already that GM—in which case eligible internal requests may proceed without a redundant approval step.
- **External:** Employee belongs to Company A but needs roles in Company B. RPM enforces **requester company GM first**, then **employee home company GM second**, so both entities agree before IT acts.

The **New request** screen helps managers find employees (search by ID or name in English/Arabic), filter by company, and flag **external** staff explicitly.

### 5. Notifies approvers by email
When a request is submitted or moves to the next approval step, relevant GMs receive an email summarizing:

- Who submitted the request  
- Which employee is affected  
- Home company and **access company** (for external cases)  
- Module, function, roles, effective dates  
- **Approve** and **Reject** actions (reject supports comments)

This reduces delays caused by approvers not knowing something is waiting in RPM.

### 6. Hands off cleanly to IT Support
After the last required GM approval, RPM sends a detailed message to **IT Support** so ServiceDesk can log and fulfill the work. RPM can follow up on ticket references and **resolved** notifications so the business sees when access is truly live—not just “approved on email.”

### 7. Handles removal and time-bound access
- **Delete (revoke) requests** follow the same approval discipline as grants.  
- **Start and end dates** support temporary access; scheduled processing supports reinstatement where configured.  
- Managers can see **current privileges** before requesting changes, reducing duplicate or conflicting requests.

### 8. Provides company-wide visibility
The **company access overview** shows who has which privileges inside a selected company—including **external users** who hold access there while belonging to another legal entity. Filters by module and search help operational reviews and access recertification conversations.

### 9. Records every important action
An **audit log** captures submissions, approvals, rejections, email notifications, and IT-related events. This supports accountability, incident review, and audit questions without reconstructing history from inboxes.

### 10. Scales with Dallah’s org structure
- **Multi-company users** can switch working company after login when their allow-list spans several entities.  
- **Module-scoped viewers** see only the business areas they are responsible for (e.g. Finance-only contacts).  
- **ERP user-role imports** (admin) help align the privilege catalog with roles already defined in enterprise systems—reducing manual catalog maintenance.

---

## End-to-end business flow (typical grant)

1. **Manager** signs in, selects the company where access is needed, finds an employee, and submits a **new privilege request** with roles and effective dates.  
2. **RPM** routes the request to the correct **GM(s)**—one or two steps depending on internal vs external employee rules.  
3. **GM(s)** approve or reject (with optional comments). Approvers may use the web app or email links.  
4. Upon **final approval**, RPM notifies **IT Support** with a structured fulfillment package.  
5. **IT** implements access in target systems and completes the ServiceDesk ticket.  
6. RPM marks the request **complete**; the employee’s access record in RPM reflects the change.  
7. **Audit** entries exist for the full path from submission to completion.

---

## Governance and control principles built into RPM

- **Allow-list only** — No anonymous or self-service registration; access to RPM itself is governed.  
- **No self-approval** — Submitters cannot approve their own requests.  
- **Dual GM control for cross-company access** — Protects both the granting company and the employee’s home company.  
- **Catalog-based requests** — Reduces ambiguous or oversized access asks.  
- **Separation between “approved by business” and “done by IT”** — Approval does not automatically imply technical completion; IT fulfillment is a distinct tracked stage.  
- **Bilingual operation** — Supports Arabic and English users and records in a consistent process regardless of language preference.

---

## Business outcomes RPM is designed to deliver

| Outcome | How RPM helps |
|---------|----------------|
| **Faster, clearer requests** | Structured forms, search, and catalogs instead of unstructured emails. |
| **Stronger GM accountability** | Explicit approval steps, notifications, and external-employee rules. |
| **Reliable IT execution** | Standard handoff to Support with role-level detail. |
| **Audit readiness** | Central history of access decisions and fulfillment. |
| **Cross-company clarity** | “Company” vs “Access to” visibility for external scenarios. |
| **Reduced access risk** | Time-bound access, revoke workflow, and visibility of current privileges before changes. |

---

## What RPM is—and is not

**RPM is** the **business workflow and system of record** for *who asked for what access, who approved it, and whether IT completed it* across Dallah group companies.

**RPM is not** a replacement for the underlying ERP, finance, HR, or other applications where privileges are technically enforced. IT still applies changes in those systems; RPM orchestrates the **business process** around those changes and keeps an aligned picture for managers and GMs.

---

## Summary

RPM resolves the gap between **“someone needs access”** and **“the right people approved it and IT applied it correctly.”** It gives Dallah a disciplined, transparent, and company-aware way to manage business user roles and privileges—especially where employees, GMs, and systems span more than one legal entity in the group.

For technical setup and deployment, see [README.md](README.md).
