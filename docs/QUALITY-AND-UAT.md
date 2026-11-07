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

Production smoke checks completed: frontend returned HTTP 200 and served the latest role-selection UI; `/api/health` returned HTTP 200; unauthenticated `/api/students` returned HTTP 401; `/api/notices/public` returned HTTP 200; a deliberately invalid login returned HTTP 401. In the authenticated admin session, the dashboard loaded counts (2 students, 2 teachers, 1 class), and student, teacher, class, attendance, results, and user-account views loaded existing records. The account list showed linked student, teacher, and guardian roles. These checks verify admin authentication and live reads, but not sign-in as each role or production write operations.

Isolated Atlas integration suite run with `pnpm --filter server test:uat`: **77 backend checks passed**. It exercised admin register/login and settings, student/teacher/class/subject/routine/notice CRUD and search, dashboard totals, attendance, results and report card, notifications, audit history, promotion, creation/login of teacher/student/guardian accounts, linked portals, 403 denials, delete protections, and cleanup. The suite also reached the Cloudinary upload route, but the Cloudinary provider rejected the configured cloud name (HTTP 401); the API now returns an actionable HTTP 502 instead of a generic 500. A successful photo upload still needs valid Cloudinary credentials. SMTP is not configured locally; password reset correctly reports HTTP 503 until SMTP is set up. All school records in this run were synthetic; the uniquely named `school_uat_*` database was dropped afterward. The live school database was not written to.

Still pending: provide valid Cloudinary credentials to verify a successful photo upload; configure SMTP if email-based password recovery is required; complete faculty/representative acceptance testing. Production school records were only read, not changed. Do not describe the live production database as write-tested; CRUD/write assertions ran against the isolated UAT database.
