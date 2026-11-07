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
- Course code is CSE 300, as confirmed by the student. The submitted proposal PDF may still show CSE 200; correct the official copy if faculty requires it.
- Do not publish real student personal data or credentials in screenshots, Postman exports, or the public demo.

## Verification record

Date: 2026-11-07 (Asia/Dhaka)

Automated checks completed locally: server tests passed (6/6), frontend production build passed, and the Postman collection JSON parsed successfully.

Production read-only smoke checks completed: frontend returned HTTP 200 and served the latest role-selection UI; `/api/health` returned HTTP 200; unauthenticated `/api/students` returned HTTP 401; `/api/notices/public` returned HTTP 200; a deliberately invalid login returned HTTP 401. These checks confirm the live API responds and its database-backed public/login paths are reachable, but they do not prove successful authentication or write operations.

Still pending: valid administrator sign-in, student/teacher/guardian sign-in and role-isolation checks, production CRUD/attendance/results write-and-cleanup test, and faculty/representative UAT. Do not mark the acceptance checklist as passed until those tests are actually performed with authorized test accounts and non-sensitive test data.
