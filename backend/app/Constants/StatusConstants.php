<?php

namespace App\Constants;

/**
 * Centralized status constants for all EHS modules.
 *
 * Usage:  use App\Constants\StatusConstants;
 *         $model->status = StatusConstants::PERMIT_ACTIVE;
 *
 * Note: Validation rule strings (e.g. 'in:Draft,Active,...') are intentionally
 *       left as literal strings in controllers so they stay readable in one place.
 */
class StatusConstants
{
    // ─── Permit Statuses ───────────────────────────────
    const PERMIT_DRAFT     = 'Draft';
    const PERMIT_ACTIVE    = 'Active';
    const PERMIT_EXPIRED   = 'Expired';
    const PERMIT_CLOSED    = 'Closed';
    const PERMIT_CANCELLED = 'Cancelled';

    // ─── Observation Statuses ──────────────────────────
    const OBSERVATION_OPEN        = 'Open';
    const OBSERVATION_IN_PROGRESS = 'In Progress';
    const OBSERVATION_CLOSED      = 'Closed';
    const OBSERVATION_VERIFIED    = 'Verified';
    const OBSERVATION_OVERDUE     = 'Overdue';
    const OBSERVATION_REOPENED    = 'Reopened';

    // ─── Incident Statuses ─────────────────────────────
    const INCIDENT_REPORTED            = 'Reported';
    const INCIDENT_UNDER_INVESTIGATION = 'Under Investigation';
    const INCIDENT_ACTION_ASSIGNED     = 'Action Assigned';
    const INCIDENT_IN_PROGRESS         = 'In Progress';
    const INCIDENT_RESOLVED            = 'Resolved';
    const INCIDENT_CLOSED              = 'Closed';
    const INCIDENT_REOPENED            = 'Reopened';
    const INCIDENT_ESCALATED           = 'Escalated';

    // ─── Violation Statuses ────────────────────────────
    const VIOLATION_OPEN                 = 'Open';
    const VIOLATION_UNDER_INVESTIGATION  = 'Under Investigation';
    const VIOLATION_ACTION_ASSIGNED      = 'Action Assigned';
    const VIOLATION_IN_PROGRESS          = 'In Progress';
    const VIOLATION_RESOLVED             = 'Resolved';
    const VIOLATION_CLOSED               = 'Closed';
    const VIOLATION_REOPENED             = 'Reopened';
    const VIOLATION_ESCALATED            = 'Escalated';

    // ─── RAMS Document Statuses ────────────────────────
    const RAMS_DRAFT        = 'Draft';
    const RAMS_SUBMITTED    = 'Submitted';
    const RAMS_UNDER_REVIEW = 'Under Review';
    const RAMS_APPROVED     = 'Approved';
    const RAMS_REJECTED     = 'Rejected';
    const RAMS_SUPERSEDED   = 'Superseded';

    // ─── Mock Drill Statuses ───────────────────────────
    const DRILL_PLANNED   = 'Planned';
    const DRILL_SCHEDULED = 'Scheduled';
    const DRILL_CONDUCTED = 'Conducted';
    const DRILL_CLOSED    = 'Closed';
    const DRILL_CANCELLED = 'Cancelled';

    // ─── Campaign Statuses ─────────────────────────────
    const CAMPAIGN_DRAFT     = 'Draft';
    const CAMPAIGN_PLANNED   = 'Planned';
    const CAMPAIGN_ACTIVE    = 'Active';
    const CAMPAIGN_COMPLETED = 'Completed';
    const CAMPAIGN_CLOSED    = 'Closed';
    const CAMPAIGN_CANCELLED = 'Cancelled';

    // ─── MOM Statuses ──────────────────────────────────
    const MOM_OPEN = 'Open';

    // ─── MOM Point Statuses ────────────────────────────
    const MOM_POINT_OPEN             = 'Open';
    const MOM_POINT_IN_PROGRESS      = 'In Progress';
    const MOM_POINT_RESOLVED         = 'Resolved';
    const MOM_POINT_CLOSED           = 'Closed';
    const MOM_POINT_PENDING          = 'Pending';
    const MOM_POINT_BLOCKED          = 'Blocked';
    const MOM_POINT_DEFERRED         = 'Deferred';
    const MOM_POINT_CARRIED_FORWARD  = 'Carried Forward';

    // ─── Permit Amendment Statuses ─────────────────────
    const AMENDMENT_DRAFT                 = 'Draft';
    const AMENDMENT_SUBMITTED             = 'Submitted';
    const AMENDMENT_UNDER_REVIEW          = 'Under Review';
    const AMENDMENT_APPROVED              = 'Approved';
    const AMENDMENT_APPROVED_WITH_COMMENTS = 'Approved with Comments';
    const AMENDMENT_REJECTED              = 'Rejected';
    const AMENDMENT_CANCELLED             = 'Cancelled';

    // ─── Waste Manifest Statuses ─────────────────────────
    const WASTE_DRAFT      = 'Draft';
    const WASTE_DISPATCHED = 'Dispatched';
    const WASTE_RECEIVED   = 'Received';
    const WASTE_COMPLETED  = 'Completed';

    // ─── Environmental Statuses ──────────────────────────
    const ENV_CLOSED = 'Closed';

    // ─── Document Control Statuses ───────────────────────
    const DC_DRAFT        = 'Draft';
    const DC_UNDER_REVIEW = 'Under Review';

    // ─── ERP Statuses ────────────────────────────────────
    const ERP_DRAFT  = 'Draft';
    const ERP_ACTIVE = 'Active';

    // ─── Checklist Statuses ──────────────────────────────
    const CHECKLIST_ACTIVE = 'Active';

    // ─── Mockup Batch Statuses ───────────────────────────
    const MOCKUP_BATCH_PROCESSING = 'processing';
    const MOCKUP_BATCH_COMPLETED  = 'completed';

    // ─── Common Action Statuses (Incident/Violation) ──
    const ACTION_PENDING   = 'Pending';
    const ACTION_COMPLETED = 'Completed';

    // ─── Campaign Action Statuses ──────────────────────
    const CAMPAIGN_ACTION_OPEN      = 'Open';
    const CAMPAIGN_ACTION_COMPLETED = 'Completed';

    // ─── Drill Action Statuses ─────────────────────────
    const DRILL_ACTION_OPEN   = 'Open';
    const DRILL_ACTION_CLOSED = 'Closed';
}
