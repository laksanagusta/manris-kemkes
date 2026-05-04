# Self-Registration With Superadmin Approval Design

**Date:** 2026-05-04  
**Status:** Draft — awaiting review  
**Author:** AI Assistant

## Overview

Add a public self-registration flow so internal staff can create their own `unit` account request, then wait for a superadmin to approve or reject it from the existing user management page. Approved users become active immediately and can log in with the password they chose during registration. Pending users cannot log in at all.

## Problem Statement

### Current State

- Authentication is login-only through `/login`
- New users can be created by admins from the management area
- The `users` domain already supports `pending_activation`, `active`, and `inactive` statuses
- The login use case still allows a limited setup session for `pending_activation` users
- The user management page already exposes status filtering, including `pending_activation`

### Product Need

- Internal users need a way to request access without waiting for manual account creation
- Superadmins must remain the approval gate before any new account can use the system
- The first release should stay simple: no email notifications, no multi-step approval workflow, and no separate registration request module

## Goals

1. Allow public self-registration for `unit` users only
2. Keep approval authority with `superadmin`
3. Prevent pending registrants from logging in before approval
4. Reuse the existing `users` table and admin user management page
5. Keep rejection simple and final so the applicant must submit a new registration

## Non-Goals

1. No self-registration for `reviewer`, `pimpinan`, or `superadmin`
2. No email verification or email notification in this phase
3. No inbox workflow or approval engine integration for registration
4. No applicant edit-and-resubmit flow after rejection
5. No partial login or onboarding session while waiting for approval

## Core Decision

**Use the existing `users` table as the registration store.** A public registration creates a `unit` user directly with `status = pending_activation`. Superadmin review happens from the existing users page. Approval switches the user to `active`. Rejection deletes the pending user record, forcing a brand-new registration attempt later.

This keeps the implementation small, matches the current domain model, and avoids introducing a second approval system for a one-step review process.

## User Experience

### Public Registration

- Add a new public route at `/register`
- Show a registration form with these fields:
  - `nama lengkap`
  - `email`
  - `username`
  - `password`
  - `konfirmasi password`
  - `unit/organisasi`
  - `NIP`
  - `jabatan`
  - `pangkat`
  - `phone number`
- All fields are collected during registration
- Required fields: `nama lengkap`, `email`, `username`, `password`, `konfirmasi password`, `unit/organisasi`, `NIP`, and `phone number`
- Optional fields collected in the same form: `jabatan` and `pangkat`
- The form submits only for `unit` role accounts
- After successful submission, show a confirmation state explaining that the account is waiting for superadmin approval and cannot be used yet

### Login Behavior

- Users with `status = pending_activation` cannot log in
- The login API returns a clear account-pending response instead of creating any limited session
- Approved users log in with the password they set during registration
- No forced password change is required after approval

### Superadmin Review

- Superadmin continues using the existing user management page
- Pending registrations appear in the same list through the existing `pending_activation` filter
- Add explicit review actions for pending users:
  - `Approve`: change `status` from `pending_activation` to `active`
  - `Reject`: delete the pending user record
- No separate approval queue or notification surface is introduced

## Architecture

### Data Model

Keep the `users` table as the source of truth for both pending and active users.

Required schema changes:

1. Add a `phone_number` column to `users`
2. Keep using:
   - `role = unit`
   - `status = pending_activation | active | inactive`
   - `must_change_password = false` for self-registered users

### Backend Changes

Add a public registration flow inside the existing auth/user domain split:

1. **Public registration endpoint**
   - New endpoint under auth routes, e.g. `POST /api/v1/auth/register`
   - Accept only the approved registration payload
   - Force `role = unit` on the server side
   - Validate uniqueness for at least `username`, `email`, and `NIP`
   - Validate `organizationId` against the organization repository
   - Persist the user with:
     - hashed password
     - `status = pending_activation`
     - `must_change_password = false`

2. **Login guard update**
   - Update login use case so `pending_activation` returns an account-pending error
   - Remove the setup-session path for waiting users

3. **Admin review actions**
   - Reuse or extend existing user update/delete capabilities
   - Approve should be a deliberate status transition to `active`
   - Reject should only delete users still in `pending_activation`
   - Active or inactive users must not be deletable through the reject action by mistake

### Frontend Changes

1. **Public registration page**
   - Add `/register` page in the public route group
   - Build a form aligned with the existing login visual language
   - Provide client-side validation for required fields and password confirmation
   - Show success and failure states clearly

2. **Login page**
   - Add a clear route entry to `/register`
   - Show pending-account error messages cleanly when returned by the API

3. **Admin users page**
   - Surface pending registrations more clearly
   - Add action controls for `Approve` and `Reject` only when the row status is `pending_activation`
   - Keep all existing filtering and pagination behavior

## API Sketch

### `POST /api/v1/auth/register`

Request body:

```json
{
  "name": "string",
  "email": "string",
  "username": "string",
  "password": "string",
  "confirmPassword": "string",
  "organizationId": "uuid",
  "nip": "string",
  "jabatan": "string | optional",
  "pangkat": "string | optional",
  "phoneNumber": "string"
}
```

Response behavior:

- `201 Created` for successful registration
- `400 Bad Request` for invalid payload, password mismatch, invalid organization, or duplicate identity data
- `409 Conflict` is also acceptable if the codebase already uses it for uniqueness collisions

### Admin Approval Actions

Preferred shape:

- Reuse `PUT /api/v1/users/:id` for approval if the page already performs updates through that endpoint
- Reuse `DELETE /api/v1/users/:id` for rejection only when the target user is still pending

If the current frontend/API ergonomics make that awkward, a dedicated action endpoint is acceptable, but reuse is preferred to keep scope down.

## Validation Rules

1. `name`, `email`, `username`, `password`, `confirmPassword`, `organizationId`, `NIP`, and `phoneNumber` are required
2. `password` and `confirmPassword` must match
3. `email` must be unique
4. `username` must be unique
5. `NIP` must be unique
6. `organizationId` must reference a real organization
7. `jabatan` and `pangkat` are optional text fields
8. Server ignores any client attempt to submit another role

## Error Handling

### Registration

- Duplicate `username`, `email`, or `NIP` should return clear field-level messages where possible
- Invalid organization should return a specific validation error
- Unexpected database failures should return the standard API error shape already used in the backend

### Login

- Pending users should see a message like: account is waiting for superadmin approval
- Inactive users should continue using the existing inactive-account error path

### Admin Actions

- Approve on a non-pending user should fail safely
- Reject on a non-pending user should fail safely
- Concurrent review should prefer idempotent, state-aware checks instead of blind update/delete

## Security Considerations

1. Passwords must continue using bcrypt hashing before persistence
2. Registration must not trust client-provided role values
3. Reject actions must be protected to `superadmin` only
4. Public registration should return generic enough errors to avoid leaking more than needed, while still being usable

## Testing Strategy

### Backend

1. Registration use case success path
2. Registration duplicate `username`
3. Registration duplicate `email`
4. Registration duplicate `NIP`
5. Registration invalid organization
6. Registration forces `role = unit`
7. Login rejects `pending_activation`
8. Approve changes pending user to active
9. Reject deletes only pending user
10. Reject or approve fails for already active or inactive users

### Frontend

1. Registration form renders all fields
2. Password confirmation validation works
3. Success state appears after registration
4. API errors map to visible form feedback
5. Login page links to registration page
6. Admin users page shows approve/reject actions only for pending rows

## Scope

### Files Likely Affected

- `backend/db/migrations/*` for `phone_number`
- `backend/internal/domain/entity/user.go`
- `backend/internal/domain/repository/user.go`
- `backend/internal/repository/postgres/user.go`
- `backend/internal/usecase/auth/*`
- `backend/internal/usecase/user/*`
- `backend/internal/handler/http/auth.go`
- `backend/internal/handler/http/user.go`
- `backend/cmd/server/*` route wiring
- `frontend/src/app/(public)/register/page.tsx`
- `frontend/src/components/login-screen.tsx`
- `frontend/src/contexts/auth-context.tsx`
- `frontend/src/lib/api/*`
- `frontend/src/app/(app)/admin/users/page.tsx`

### Out of Scope

- Email delivery
- CAPTCHA or bot mitigation
- Audit dashboard for registration history
- Self-service profile edits before approval

## Open Decisions Resolved

- Self-registration role: `unit` only
- Pending users can log in: `no`
- Required registration identity: include `NIP`
- Rejection flow: final, applicant must register again
- Superadmin notification: not required, review happens on users page
- Password after approval: use the password chosen at registration
