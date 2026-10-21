# Quality, Evaluation & User Acceptance Plan

This plan makes the project's outcomes testable. It is a verification target, not a claim that every item has already passed in production.

## Success metrics

| Area | Acceptance target | How to verify |
| --- | --- | --- |
| Authentication | Valid credentials issue a JWT; invalid credentials are rejected; unauthenticated protected calls return 401 | Postman auth requests |
| Authorization | Admin can manage records; teacher/student/guardian accounts cannot call admin-only CRUD endpoints (403) | Run the same protected request with each role token |
| Core data | Student and teacher create/read/update/delete flows persist and can be searched by identifier/name | Postman CRUD sequence and UI smoke test |
| Academics | Attendance can be saved once per student/date; result percentages/grades are calculated and invalid marks rejected | Postman attendance/result requests; boundary checks |
| Dashboard | Student, teacher, class totals match database records | Compare dashboard summary with list endpoints |
| User experience | Main flows work at 360px mobile width and desktop width without horizontal page overflow | Browser viewport inspection |
| Reliability | Health endpoint returns HTTP 200 and `{ "status": "ok" }`; API failures return readable JSON | Postman health + negative tests |
| Deployment | Production frontend can call the configured API; login, dashboard, records and health checks work after deployment | Production smoke checklist |

## User-acceptance checklist

- [ ] Admin signs in and signs out; invalid password shows a useful error.
- [ ] Admin creates, searches, edits and deletes a student and teacher.
- [ ] Admin creates a class/section and sees accurate dashboard totals.
- [ ] Admin marks attendance and enters a result; invalid marks are blocked.
- [ ] Teacher account sees only its linked teaching workspace; it cannot access admin CRUD.
- [ ] Student/guardian sees only the linked student's portal data; it cannot access admin CRUD.
- [ ] Account settings, notices, reports and theme controls behave as described in the UI.
- [ ] Desktop and mobile layouts remain usable; empty/loading/error states are understandable.
- [ ] Production health check, login and one read/write smoke test pass using non-sensitive test data.

## Test execution

Run fast unit tests from the repository root:

```powershell
pnpm --filter server test
```

Build the frontend:

```powershell
pnpm --filter client build
```

Import `postman/School-Management-System.postman_collection.json` into Postman. Set collection variables `baseUrl`, `adminEmail`, and `adminPassword`; run **Admin login** first to populate `token`. Create `studentId` and `teacherId` variables for CRUD requests. Use a disposable test database/account for write tests.

## Scope and evaluation notes

- Fees, payments and automated SMS/email notifications remain explicitly out of scope, consistent with the proposal. Password-reset email requires separately configured SMTP credentials.
- Course-code discrepancy (proposal says CSE 200; project context may be CSE 300/Project 300) must be confirmed with faculty before changing official academic material.
- Do not publish real student personal data or credentials in screenshots, Postman exports, or the public demo.
