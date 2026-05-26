/**
 * Shared identifiers for the integration test fixture.
 *
 * Both `packages/db/prisma/seed/test-seed.ts` (the seeder) and
 * `apps/web/server/trpc/test-utils/` (the caller factory + contract tests)
 * import these so the seed and the assertions agree on which entities exist.
 *
 * IDs are plain readable strings rather than CUIDs because Prisma's
 * `String @id @default(cuid())` only generates a value when the field is
 * omitted. Passing readable strings makes test failures easier to interpret.
 */

export const TEST_IDS = {
  org: 'test-org',

  sites: {
    hq: 'test-site-hq',
    branch: 'test-site-branch',
  },

  users: {
    /** Org-wide admin role. Sees everything in the org. */
    admin: 'test-user-admin',
    /** Org-wide executive role. Sees everything but no admin CRUD. */
    executive: 'test-user-exec',
    /** Site-scoped manager. Assigned to HQ only. */
    siteManager: 'test-user-mgr-hq',
    /** Site-scoped supervisor. Assigned to HQ. Manages the operator (ReBAC). */
    supervisor: 'test-user-sup-hq',
    /** Site-scoped operator. Assigned to HQ. Managed by the supervisor. */
    operator: 'test-user-op-hq',
    /** Site-scoped operator on a different site (cross-site isolation tests). */
    operatorBranch: 'test-user-op-branch',
  },

  tagCategories: {
    jobFunction: 'test-tagcat-jobfn',
    equipment: 'test-tagcat-equip',
  },

  tags: {
    jobFunctionForklift: 'test-tag-forklift',
    jobFunctionMaintenanceTech: 'test-tag-jf-maint',
    jobFunctionLineOperator: 'test-tag-jf-line-op',
    equipmentScanner: 'test-tag-scanner',
    equipmentLift: 'test-tag-lift',
  },

  procedureSeries: {
    safety: 'test-pseries-safety',
    /** Second series used by versioning tests that need a clean series with no draft/pending. */
    forklift: 'test-pseries-forklift',
    /** Series used by TEST-057: acknowledgments are version-specific. */
    versionAck: 'test-pseries-version-ack',
  },

  procedures: {
    /** Published procedure attached to HQ + Branch. Has 1 tag. */
    published: 'test-proc-published',
    /** Draft procedure attached to HQ. */
    draft: 'test-proc-draft',
    /** Pending-review procedure. */
    pending: 'test-proc-pending',
    /** Archived procedure. */
    archived: 'test-proc-archived',
    /** Soft-deleted procedure (deleted IS NOT NULL). */
    deleted: 'test-proc-deleted',
    /** Published procedure in its own series with one assigned acknowledger. Used by TEST-058. */
    forklift: 'test-proc-forklift',
    /**
     * TEST-057 fixture: archived v1 in the versionAck series. Supervisor is
     * assigned as acknowledger and has a ProcedureAcknowledgment row against
     * this version.
     */
    versionAckV1: 'test-proc-version-ack-v1',
    /**
     * TEST-057 fixture: published v2 in the versionAck series. Supervisor is
     * assigned as acknowledger but has NO acknowledgment row — asserts that
     * the v1 ack does not carry across versions.
     */
    versionAckV2: 'test-proc-version-ack-v2',
  },

  executions: {
    /** Active certification execution attached to HQ. */
    certification: 'test-exec-cert',
    /** Active training execution attached to HQ. */
    training: 'test-exec-training',
    /** Active observation execution attached to HQ. */
    observation: 'test-exec-observation',
    /** Active observation execution attached to HQ, used only by the
     *  manager-scoped task (executee = siteManager). Exists so operator
     *  visibility scoping tests can distinguish "tasks at my site" from
     *  "tasks where I'm the executee". */
    managerReview: 'test-exec-manager-review',
    /** Draft execution created by admin, attached to HQ.
     *  Used by TEST-030 to verify non-admin users cannot see drafts they
     *  did not create. */
    draft: 'test-exec-draft',
  },

  tasks: {
    pending: 'test-task-pending',
    inProgress: 'test-task-inprogress',
    completed: 'test-task-completed',
    cancelled: 'test-task-cancelled',
    /** HQ task where executee is the site manager (NOT the operator).
     *  Used to verify that operator-role users are scoped to tasks where
     *  they are the executee — they must not see this task even though
     *  it lives at their assigned site. See MEE-1536. */
    managerOnly: 'test-task-manager-only',
  },

  results: {
    /** Result for the completed task. */
    completed: 'test-result-completed',
  },

  comments: {
    parent: 'test-comment-parent',
    reply: 'test-comment-reply',
  },
} as const;

/** Email of each test user — used by tests that look users up by email. */
export const TEST_EMAILS = {
  admin: 'admin@test.local',
  executive: 'exec@test.local',
  siteManager: 'manager@test.local',
  supervisor: 'supervisor@test.local',
  operator: 'operator@test.local',
  operatorBranch: 'operator-branch@test.local',
} as const;
