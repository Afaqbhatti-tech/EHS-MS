<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    // ─── Notification type constants ───────────────────
    const TYPE_OBSERVATION  = 'observation';
    const TYPE_PERMIT       = 'permit';
    const TYPE_INCIDENT     = 'incident';
    const TYPE_VIOLATION    = 'violation';
    const TYPE_DRILL        = 'drill';
    const TYPE_MOM          = 'mom';
    const TYPE_CAMPAIGN     = 'campaign';
    const TYPE_AMENDMENT    = 'amendment';
    const TYPE_ASSIGNMENT   = 'assignment';
    const TYPE_OVERDUE      = 'overdue';
    const TYPE_SYSTEM       = 'system';
    const TYPE_MOCKUP       = 'mockup';
    const TYPE_RAMS         = 'rams';
    const TYPE_DOCUMENT     = 'document';
    const TYPE_ENVIRONMENTAL = 'environmental';
    const TYPE_WASTE_MANIFEST = 'waste_manifest';
    const TYPE_CONTRACTOR   = 'contractor';
    const TYPE_TRAINING     = 'training';
    const TYPE_TRACKER      = 'tracker';

    // ─── Core: send to a specific user ────────────────
    public static function send(
        string $userId,
        string $type,
        string $title,
        ?string $body = null,
        string $severity = 'info',
        ?string $icon = null,
        ?string $link = null,
        ?string $refModule = null,
        ?string $refId = null,
        ?string $dedupAction = null,
    ): ?Notification {
        try {
            // Build dedup key: same event for same user on same record today = skip
            $dedupKey = null;
            if ($dedupAction && $refModule && $refId) {
                $dedupKey = implode(':', [$refModule, $refId, $dedupAction, $userId, date('Ymd')]);
                if (Notification::where('dedup_key', $dedupKey)->exists()) {
                    return null;
                }
            }

            return Notification::create([
                'user_id'    => $userId,
                'type'       => $type,
                'title'      => $title,
                'body'       => $body,
                'icon'       => $icon,
                'severity'   => $severity,
                'link'       => $link,
                'ref_module' => $refModule,
                'ref_id'     => $refId,
                'dedup_key'  => $dedupKey,
            ]);
        } catch (\Throwable $e) {
            Log::warning('NotificationService::send failed', [
                'user_id' => $userId,
                'type'    => $type,
                'error'   => $e->getMessage(),
            ]);
            return null;
        }
    }

    // ─── Broadcast: send to multiple users ────────────
    public static function broadcast(
        array $userIds,
        string $type,
        string $title,
        ?string $body = null,
        string $severity = 'info',
        ?string $icon = null,
        ?string $link = null,
        ?string $refModule = null,
        ?string $refId = null,
    ): void {
        foreach (array_unique($userIds) as $uid) {
            static::send($uid, $type, $title, $body, $severity, $icon, $link, $refModule, $refId);
        }
    }

    // ─── Notify by role: send to all users with given roles ──
    public static function notifyRoles(
        array $roles,
        string $type,
        string $title,
        ?string $body = null,
        string $severity = 'info',
        ?string $icon = null,
        ?string $link = null,
        ?string $refModule = null,
        ?string $refId = null,
        ?string $excludeUserId = null,
    ): void {
        $userIds = User::whereIn('role', $roles)
            ->when($excludeUserId, fn ($q) => $q->where('id', '!=', $excludeUserId))
            ->pluck('id')
            ->toArray();

        static::broadcast($userIds, $type, $title, $body, $severity, $icon, $link, $refModule, $refId);
    }

    // ═══════════════════════════════════════════════════
    //  Module-specific helper methods
    // ═══════════════════════════════════════════════════

    // ─── Observations ─────────────────────────────────

    public static function observationCreated(object $obs, string $creatorId): void
    {
        $ref = $obs->ref_number ?? 'OBS';

        // Notify EHS managers & safety officers
        static::notifyRoles(
            ['master', 'system_admin', 'ehs_manager', 'safety_officer'],
            self::TYPE_OBSERVATION,
            'New Observation Reported',
            "Observation {$ref} has been submitted" . ($obs->zone ? " in {$obs->zone}" : '') . ".",
            $obs->priority === 'Critical' ? 'danger' : ($obs->priority === 'High' ? 'warning' : 'info'),
            'eye',
            '/observations',
            'observations',
            $ref,
            $creatorId,
        );
    }

    public static function observationAssigned(object $obs, string $assigneeUserId): void
    {
        $ref = $obs->ref_number ?? 'OBS';

        static::send(
            $assigneeUserId,
            self::TYPE_ASSIGNMENT,
            'Observation Assigned to You',
            "Observation {$ref}" . ($obs->zone ? " in {$obs->zone}" : '') . " has been assigned to you for follow-up.",
            'warning',
            'eye',
            '/observations',
            'observations',
            $ref,
        );
    }

    public static function observationStatusChanged(object $obs, string $newStatus, string $changedBy): void
    {
        $ref = $obs->ref_number ?? 'OBS';

        static::notifyRoles(
            ['master', 'system_admin', 'ehs_manager', 'safety_officer'],
            self::TYPE_OBSERVATION,
            "Observation {$newStatus}",
            "Observation {$ref} status changed to {$newStatus}.",
            $newStatus === 'Closed' ? 'success' : 'info',
            'eye',
            '/observations',
            'observations',
            $ref,
            $changedBy,
        );
    }

    // ─── Permits ──────────────────────────────────────

    public static function permitCreated(object $permit, string $creatorId): void
    {
        $ref = $permit->ref_number ?? 'PTW';

        static::notifyRoles(
            ['master', 'system_admin', 'ehs_manager', 'safety_officer'],
            self::TYPE_PERMIT,
            'New Permit to Work Created',
            "{$permit->permit_type} permit {$ref} has been created" . ($permit->zone ? " for {$permit->zone}" : '') . ".",
            'info',
            'clipboard-check',
            '/permits',
            'permits',
            $ref,
            $creatorId,
        );
    }

    public static function permitStatusChanged(object $permit, string $newStatus, string $changedBy): void
    {
        $ref = $permit->ref_number ?? 'PTW';

        $severityMap = [
            'Approved' => 'success', 'Active' => 'success',
            'Expired' => 'warning', 'Suspended' => 'danger',
            'Closed' => 'info', 'Rejected' => 'danger',
        ];

        static::notifyRoles(
            ['master', 'system_admin', 'ehs_manager', 'safety_officer'],
            self::TYPE_PERMIT,
            "Permit {$newStatus}",
            "{$permit->permit_type} permit {$ref} has been {$newStatus}.",
            $severityMap[$newStatus] ?? 'info',
            'clipboard-check',
            '/permits',
            'permits',
            $ref,
            $changedBy,
        );

        // Notify the permit creator about the decision
        if (in_array($newStatus, ['Approved', 'Rejected', 'Expired', 'Suspended']) && $permit->created_by && $permit->created_by !== $changedBy) {
            static::send(
                $permit->created_by,
                self::TYPE_PERMIT,
                "Your Permit was {$newStatus}",
                "{$permit->permit_type} permit {$ref} has been {$newStatus}.",
                $severityMap[$newStatus] ?? 'info',
                'clipboard-check',
                '/permits',
                'permits',
                $ref,
                'decision_feedback',
            );
        }
    }

    // ─── Incidents ────────────────────────────────────

    public static function incidentReported(object $incident, string $reporterId): void
    {
        $ref = $incident->incident_code ?? 'INC';

        // Incidents always go to all management-level roles
        static::notifyRoles(
            ['master', 'system_admin', 'ehs_manager', 'safety_officer', 'site_engineer'],
            self::TYPE_INCIDENT,
            'Incident Reported',
            "A {$incident->incident_type} incident {$ref} was reported" . ($incident->location ? " at {$incident->location}" : '') . " — investigation required.",
            $incident->severity === 'Critical' || $incident->severity === 'Major' ? 'danger' : 'warning',
            'alert-triangle',
            '/incidents',
            'incidents',
            $ref,
            $reporterId,
        );
    }

    public static function incidentStatusChanged(object $incident, string $newStatus, string $changedBy): void
    {
        $ref = $incident->incident_code ?? 'INC';

        static::notifyRoles(
            ['master', 'system_admin', 'ehs_manager', 'safety_officer'],
            self::TYPE_INCIDENT,
            "Incident {$newStatus}",
            "Incident {$ref} status changed to {$newStatus}.",
            $newStatus === 'Closed' ? 'success' : 'info',
            'alert-triangle',
            '/incidents',
            'incidents',
            $ref,
            $changedBy,
        );

        // Notify the reporter about status change
        if ($incident->created_by && $incident->created_by !== $changedBy) {
            static::send(
                $incident->created_by,
                self::TYPE_INCIDENT,
                "Your Incident is now {$newStatus}",
                "Incident {$ref} status changed to {$newStatus}.",
                $newStatus === 'Closed' ? 'success' : 'info',
                'alert-triangle',
                '/incidents',
                'incidents',
                $ref,
                'status_feedback',
            );
        }
    }

    // ─── Violations ───────────────────────────────────

    public static function violationReported(object $violation, string $reporterId): void
    {
        $ref = $violation->violation_code ?? 'VIO';

        static::notifyRoles(
            ['master', 'system_admin', 'ehs_manager', 'safety_officer'],
            self::TYPE_VIOLATION,
            'New Violation Reported',
            "Violation {$ref} ({$violation->violation_type}) reported" . ($violation->location ? " at {$violation->location}" : '') . ".",
            $violation->severity === 'Critical' || $violation->severity === 'Major' ? 'danger' : 'warning',
            'shield',
            '/violations',
            'violations',
            $ref,
            $reporterId,
        );
    }

    public static function violationStatusChanged(object $violation, string $newStatus, string $changedBy): void
    {
        $ref = $violation->violation_code ?? 'VIO';

        static::notifyRoles(
            ['master', 'system_admin', 'ehs_manager', 'safety_officer'],
            self::TYPE_VIOLATION,
            "Violation {$newStatus}",
            "Violation {$ref} status changed to {$newStatus}.",
            $newStatus === 'Closed' ? 'success' : 'info',
            'shield',
            '/violations',
            'violations',
            $ref,
            $changedBy,
        );

        // Notify the reporter about status change
        if ($violation->created_by && $violation->created_by !== $changedBy) {
            static::send(
                $violation->created_by,
                self::TYPE_VIOLATION,
                "Your Violation Report is now {$newStatus}",
                "Violation {$ref} status changed to {$newStatus}.",
                $newStatus === 'Closed' ? 'success' : 'info',
                'shield',
                '/violations',
                'violations',
                $ref,
                'status_feedback',
            );
        }
    }

    // ─── Mock Drills ──────────────────────────────────

    public static function drillCreated(object $drill, string $creatorId): void
    {
        $ref = $drill->drill_code ?? 'DRL';

        static::notifyRoles(
            ['master', 'system_admin', 'ehs_manager', 'safety_officer', 'site_engineer'],
            self::TYPE_DRILL,
            'New Mock Drill Planned',
            "Mock drill {$ref} \"{$drill->title}\" has been planned" . ($drill->location ? " at {$drill->location}" : '') . ".",
            'info',
            'alert-triangle',
            '/mock-drills',
            'mock_drills',
            $ref,
            $creatorId,
        );

        // Notify responsible person if set
        if ($drill->responsible_person_id && $drill->responsible_person_id !== $creatorId) {
            static::send(
                $drill->responsible_person_id,
                self::TYPE_ASSIGNMENT,
                'Mock Drill Assigned to You',
                "You have been assigned as responsible person for mock drill {$ref} \"{$drill->title}\".",
                'warning',
                'alert-triangle',
                '/mock-drills',
                'mock_drills',
                $ref,
            );
        }
    }

    public static function drillStatusChanged(object $drill, string $newStatus, string $changedBy): void
    {
        $ref = $drill->drill_code ?? 'DRL';

        static::notifyRoles(
            ['master', 'system_admin', 'ehs_manager', 'safety_officer'],
            self::TYPE_DRILL,
            "Mock Drill {$newStatus}",
            "Mock drill {$ref} \"{$drill->title}\" is now {$newStatus}.",
            $newStatus === 'Completed' ? 'success' : 'info',
            'alert-triangle',
            '/mock-drills',
            'mock_drills',
            $ref,
            $changedBy,
        );
    }

    // ─── MOM (Minutes of Meeting) ─────────────────────

    public static function momCreated(object $mom, string $creatorId): void
    {
        static::notifyRoles(
            ['master', 'system_admin', 'ehs_manager', 'safety_officer', 'site_engineer'],
            self::TYPE_MOM,
            'New Weekly MOM Published',
            "Weekly MOM \"{$mom->title}\" for Week {$mom->week_number} has been created.",
            'info',
            'file-text',
            '/weekly-mom',
            'moms',
            (string) $mom->id,
            $creatorId,
        );
    }

    // ─── Campaigns ────────────────────────────────────

    public static function campaignCreated(object $campaign, string $creatorId): void
    {
        $ref = $campaign->campaign_code ?? 'CMP';

        static::notifyRoles(
            ['master', 'system_admin', 'ehs_manager', 'safety_officer'],
            self::TYPE_CAMPAIGN,
            'New Campaign Created',
            "Campaign {$ref} \"{$campaign->title}\" ({$campaign->campaign_type}) has been created.",
            'info',
            'bar-chart-3',
            '/campaigns',
            'campaigns',
            $ref,
            $creatorId,
        );

        // Notify owner if different from creator
        if ($campaign->owner_id && $campaign->owner_id !== $creatorId) {
            static::send(
                $campaign->owner_id,
                self::TYPE_ASSIGNMENT,
                'Campaign Assigned to You',
                "You have been assigned as owner of campaign {$ref} \"{$campaign->title}\".",
                'warning',
                'bar-chart-3',
                '/campaigns',
                'campaigns',
                $ref,
            );
        }
    }

    public static function campaignStatusChanged(object $campaign, string $newStatus, string $changedBy): void
    {
        $ref = $campaign->campaign_code ?? 'CMP';

        static::notifyRoles(
            ['master', 'system_admin', 'ehs_manager', 'safety_officer'],
            self::TYPE_CAMPAIGN,
            "Campaign {$newStatus}",
            "Campaign {$ref} \"{$campaign->title}\" is now {$newStatus}.",
            $newStatus === 'Completed' ? 'success' : 'info',
            'bar-chart-3',
            '/campaigns',
            'campaigns',
            $ref,
            $changedBy,
        );
    }

    // ─── Permit Amendments ────────────────────────────

    public static function amendmentCreated(object $amendment, string $creatorId, ?string $permitRef = null): void
    {
        $ref = $amendment->amendment_code ?? 'AMD';

        static::notifyRoles(
            ['master', 'system_admin', 'ehs_manager', 'safety_officer'],
            self::TYPE_AMENDMENT,
            'Permit Amendment Requested',
            "Amendment {$ref} has been requested" . ($permitRef ? " for permit {$permitRef}" : '') . ".",
            'warning',
            'file-text',
            '/permit-amendments',
            'permit_amendments',
            $ref,
            $creatorId,
        );
    }

    public static function amendmentStatusChanged(object $amendment, string $newStatus, string $changedBy, ?string $permitRef = null): void
    {
        $ref = $amendment->amendment_code ?? 'AMD';
        $severityMap = [
            'Approved' => 'success', 'Rejected' => 'danger',
            'Pending' => 'warning', 'Implemented' => 'success',
        ];

        static::notifyRoles(
            ['master', 'system_admin', 'ehs_manager', 'safety_officer'],
            self::TYPE_AMENDMENT,
            "Amendment {$newStatus}",
            "Amendment {$ref}" . ($permitRef ? " for permit {$permitRef}" : '') . " has been {$newStatus}.",
            $severityMap[$newStatus] ?? 'info',
            'file-text',
            '/permit-amendments',
            'permit_amendments',
            $ref,
            $changedBy,
        );

        // Notify the creator about the decision
        if (in_array($newStatus, ['Approved', 'Rejected', 'Approved with Comments']) && $amendment->created_by && $amendment->created_by !== $changedBy) {
            static::send(
                $amendment->created_by,
                self::TYPE_AMENDMENT,
                "Your Amendment was {$newStatus}",
                "Amendment {$ref}" . ($permitRef ? " for permit {$permitRef}" : '') . " has been {$newStatus}.",
                $severityMap[$newStatus] ?? 'info',
                'file-text',
                '/permit-amendments',
                'permit_amendments',
                $ref,
                'decision_feedback',
            );
        }
    }

    // ─── Mock-Up Register ───────────────────────────

    public static function mockupSubmitted(object $mockup, string $submitterId): void
    {
        $ref = $mockup->ref_number ?? 'MU';

        static::notifyRoles(
            ['master', 'system_admin', 'ehs_manager', 'safety_officer'],
            self::TYPE_MOCKUP,
            'Mock-Up Submitted for Review',
            "Mock-Up {$ref} \"{$mockup->title}\" has been submitted for client/consultant review.",
            'warning',
            'clipboard-check',
            '/mockup-register',
            'mockups',
            $ref,
            $submitterId,
        );
    }

    public static function mockupDecision(object $mockup, string $decision, string $decidedBy): void
    {
        $ref = $mockup->ref_number ?? 'MU';
        $severityMap = [
            'Approved' => 'success',
            'Rejected' => 'danger',
            'Approved with Comments' => 'warning',
        ];

        // Notify management roles
        static::notifyRoles(
            ['master', 'system_admin', 'ehs_manager', 'safety_officer'],
            self::TYPE_MOCKUP,
            "Mock-Up {$decision}",
            "Mock-Up {$ref} \"{$mockup->title}\" has been {$decision}.",
            $severityMap[$decision] ?? 'info',
            'clipboard-check',
            '/mockup-register',
            'mockups',
            $ref,
            $decidedBy,
        );

        // Notify the creator (submitter feedback)
        if ($mockup->created_by && $mockup->created_by !== $decidedBy) {
            static::send(
                $mockup->created_by,
                self::TYPE_MOCKUP,
                "Your Mock-Up was {$decision}",
                "Mock-Up {$ref} \"{$mockup->title}\" has been {$decision}.",
                $severityMap[$decision] ?? 'info',
                'clipboard-check',
                '/mockup-register',
                'mockups',
                $ref,
                'decision_feedback',
            );
        }
    }

    // ─── RAMS ───────────────────────────────────────

    public static function ramsSubmitted(object $doc, string $submitterId): void
    {
        $ref = $doc->ref_number ?? 'RAMS';

        static::notifyRoles(
            ['master', 'system_admin', 'ehs_manager', 'safety_officer'],
            self::TYPE_RAMS,
            'RAMS Document Submitted',
            "RAMS document {$ref} \"{$doc->title}\" has been submitted for review.",
            'warning',
            'file-text',
            '/rams-board',
            'rams_documents',
            $ref,
            $submitterId,
        );
    }

    public static function ramsStatusChanged(object $doc, string $newStatus, string $changedBy): void
    {
        $ref = $doc->ref_number ?? 'RAMS';
        $severityMap = [
            'Approved' => 'success', 'Rejected' => 'danger',
            'Under Review' => 'warning', 'Superseded' => 'info',
        ];

        static::notifyRoles(
            ['master', 'system_admin', 'ehs_manager', 'safety_officer'],
            self::TYPE_RAMS,
            "RAMS Document {$newStatus}",
            "RAMS document {$ref} \"{$doc->title}\" is now {$newStatus}.",
            $severityMap[$newStatus] ?? 'info',
            'file-text',
            '/rams-board',
            'rams_documents',
            $ref,
            $changedBy,
        );

        // Notify the submitter about approval/rejection
        if (in_array($newStatus, ['Approved', 'Rejected']) && $doc->submitted_by && $doc->submitted_by !== $changedBy) {
            static::send(
                $doc->submitted_by,
                self::TYPE_RAMS,
                "Your RAMS Document was {$newStatus}",
                "RAMS document {$ref} \"{$doc->title}\" has been {$newStatus}." .
                    ($newStatus === 'Rejected' && $doc->rejected_reason ? " Reason: {$doc->rejected_reason}" : ''),
                $severityMap[$newStatus] ?? 'info',
                'file-text',
                '/rams-board',
                'rams_documents',
                $ref,
                'decision_feedback',
            );
        }
    }

    // ─── Document Control ───────────────────────────

    public static function documentSubmittedForReview(object $document, string $submitterId): void
    {
        $ref = $document->document_code ?? 'DOC';

        static::notifyRoles(
            ['master', 'system_admin', 'ehs_manager', 'safety_officer'],
            self::TYPE_DOCUMENT,
            'Document Submitted for Review',
            "Document {$ref} \"{$document->title}\" has been submitted for review.",
            'warning',
            'file-text',
            '/document-control',
            'dc_documents',
            $ref,
            $submitterId,
        );
    }

    public static function documentApprovalDecision(object $document, string $decision, string $decidedBy): void
    {
        $ref = $document->document_code ?? 'DOC';
        $severityMap = [
            'Approved' => 'success', 'Rejected' => 'danger',
            'Approved with Comments' => 'warning',
        ];

        static::notifyRoles(
            ['master', 'system_admin', 'ehs_manager', 'safety_officer'],
            self::TYPE_DOCUMENT,
            "Document {$decision}",
            "Document {$ref} \"{$document->title}\" has been {$decision}.",
            $severityMap[$decision] ?? 'info',
            'file-text',
            '/document-control',
            'dc_documents',
            $ref,
            $decidedBy,
        );

        // Notify the document creator
        if ($document->created_by && $document->created_by !== $decidedBy) {
            static::send(
                $document->created_by,
                self::TYPE_DOCUMENT,
                "Your Document was {$decision}",
                "Document {$ref} \"{$document->title}\" has been {$decision}.",
                $severityMap[$decision] ?? 'info',
                'file-text',
                '/document-control',
                'dc_documents',
                $ref,
                'decision_feedback',
            );
        }
    }

    public static function documentActivated(object $document, string $activatedBy): void
    {
        $ref = $document->document_code ?? 'DOC';

        // Notify the document owner
        if ($document->owner_id && $document->owner_id !== $activatedBy) {
            static::send(
                $document->owner_id,
                self::TYPE_DOCUMENT,
                'Document Revision Activated',
                "A new revision of document {$ref} \"{$document->title}\" has been activated.",
                'success',
                'file-text',
                '/document-control',
                'dc_documents',
                $ref,
                'activated',
            );
        }
    }

    // ─── Environmental ──────────────────────────────

    public static function environmentalAspectAssigned(object $aspect, string $assignedBy): void
    {
        if (!$aspect->responsible_id || $aspect->responsible_id === $assignedBy) {
            return;
        }

        $ref = $aspect->aspect_code ?? 'ENV';

        static::send(
            $aspect->responsible_id,
            self::TYPE_ASSIGNMENT,
            'Environmental Aspect Assigned to You',
            "Environmental aspect {$ref}" . ($aspect->aspect_name ? " \"{$aspect->aspect_name}\"" : '') . " has been assigned to you.",
            'warning',
            'settings',
            '/environmental',
            'environmental_aspects',
            $ref,
            'assigned',
        );
    }

    public static function environmentalActionOverdue(object $action, string $userId): void
    {
        $ref = $action->action_code ?? (string) $action->id;

        static::send(
            $userId,
            self::TYPE_OVERDUE,
            'Environmental Action Overdue',
            ($action->title ?? 'An environmental action') . " is overdue since " .
                ($action->due_date ? \Carbon\Carbon::parse($action->due_date)->format('d M Y') : 'unknown') . ".",
            'danger',
            'alert-triangle',
            '/environmental',
            'environmental_actions',
            $ref,
            'overdue',
        );
    }

    // ─── Waste Manifests ────────────────────────────

    public static function wasteManifestCreated(object $manifest, string $creatorId): void
    {
        $ref = $manifest->manifest_code ?? 'WMF';

        static::notifyRoles(
            ['master', 'system_admin', 'ehs_manager', 'safety_officer'],
            self::TYPE_WASTE_MANIFEST,
            'New Waste Manifest Created',
            "Waste manifest {$ref} ({$manifest->waste_type}) has been created.",
            'info',
            'file-text',
            '/environmental/waste-manifests',
            'waste_manifests',
            $ref,
            $creatorId,
        );
    }

    public static function wasteManifestStatusChanged(object $manifest, string $oldStatus, string $newStatus, string $changedBy): void
    {
        $ref = $manifest->manifest_code ?? 'WMF';
        $severityMap = [
            'Completed' => 'success', 'Rejected' => 'danger', 'Cancelled' => 'danger',
            'Dispatched' => 'warning', 'In Transit' => 'warning', 'Received' => 'success',
        ];

        static::notifyRoles(
            ['master', 'system_admin', 'ehs_manager', 'safety_officer'],
            self::TYPE_WASTE_MANIFEST,
            "Waste Manifest {$newStatus}",
            "Waste manifest {$ref} status changed from {$oldStatus} to {$newStatus}.",
            $severityMap[$newStatus] ?? 'info',
            'file-text',
            '/environmental/waste-manifests',
            'waste_manifests',
            $ref,
            $changedBy,
        );

        // Notify the creator about rejection
        if (in_array($newStatus, ['Rejected', 'Cancelled']) && $manifest->created_by && $manifest->created_by !== $changedBy) {
            static::send(
                $manifest->created_by,
                self::TYPE_WASTE_MANIFEST,
                "Your Waste Manifest was {$newStatus}",
                "Waste manifest {$ref} has been {$newStatus}.",
                'danger',
                'file-text',
                '/environmental/waste-manifests',
                'waste_manifests',
                $ref,
                'decision_feedback',
            );
        }
    }

    // ─── Contractors ────────────────────────────────

    public static function contractorCreated(object $contractor, string $creatorId): void
    {
        $ref = $contractor->contractor_code ?? 'CON';

        static::notifyRoles(
            ['master', 'system_admin', 'ehs_manager', 'safety_officer'],
            self::TYPE_CONTRACTOR,
            'New Contractor Registered',
            "Contractor {$ref} \"{$contractor->contractor_name}\" has been registered.",
            'info',
            'settings',
            '/environmental/contractor-records',
            'contractors',
            $ref,
            $creatorId,
        );

        // Notify assigned supervisor
        if ($contractor->assigned_supervisor_id && $contractor->assigned_supervisor_id !== $creatorId) {
            static::send(
                $contractor->assigned_supervisor_id,
                self::TYPE_ASSIGNMENT,
                'Contractor Assigned to You',
                "You have been assigned as supervisor for contractor {$ref} \"{$contractor->contractor_name}\".",
                'warning',
                'settings',
                '/environmental/contractor-records',
                'contractors',
                $ref,
                'assigned',
            );
        }
    }

    public static function contractorStatusChanged(object $contractor, string $oldStatus, string $newStatus, string $changedBy): void
    {
        $ref = $contractor->contractor_code ?? 'CON';
        $severityMap = [
            'Approved' => 'success', 'Active' => 'success',
            'Suspended' => 'danger', 'Blacklisted' => 'danger',
            'Rejected' => 'danger', 'Expired' => 'warning',
        ];

        static::notifyRoles(
            ['master', 'system_admin', 'ehs_manager', 'safety_officer'],
            self::TYPE_CONTRACTOR,
            "Contractor {$newStatus}",
            "Contractor {$ref} \"{$contractor->contractor_name}\" status changed to {$newStatus}.",
            $severityMap[$newStatus] ?? 'info',
            'settings',
            '/environmental/contractor-records',
            'contractors',
            $ref,
            $changedBy,
        );

        // Notify the creator about the decision
        if (in_array($newStatus, ['Approved', 'Rejected', 'Suspended', 'Blacklisted']) && $contractor->created_by && $contractor->created_by !== $changedBy) {
            static::send(
                $contractor->created_by,
                self::TYPE_CONTRACTOR,
                "Contractor {$newStatus}: {$contractor->contractor_name}",
                "Contractor {$ref} \"{$contractor->contractor_name}\" has been {$newStatus}.",
                $severityMap[$newStatus] ?? 'info',
                'settings',
                '/environmental/contractor-records',
                'contractors',
                $ref,
                'decision_feedback',
            );
        }
    }

    // ─── Training ───────────────────────────────────

    public static function trainingExpiring(string $userId, object $record, int $daysLeft): void
    {
        $ref = $record->record_id ?? (string) $record->id;
        $topicName = $record->topic?->label ?? $record->training_topic_key ?? 'Training';

        static::send(
            $userId,
            self::TYPE_TRAINING,
            'Training Certificate Expiring',
            "{$topicName} expires in {$daysLeft} days on " .
                \Carbon\Carbon::parse($record->expiry_date)->format('d M Y') . ".",
            $daysLeft <= 7 ? 'danger' : 'warning',
            'clock',
            '/training-matrix',
            'training_records',
            $ref,
            'expiring',
        );
    }

    public static function trainingExpired(string $userId, object $record): void
    {
        $ref = $record->record_id ?? (string) $record->id;
        $topicName = $record->topic?->label ?? $record->training_topic_key ?? 'Training';

        static::send(
            $userId,
            self::TYPE_TRAINING,
            'Training Certificate Expired',
            "{$topicName} has expired on " .
                \Carbon\Carbon::parse($record->expiry_date)->format('d M Y') . ". Renewal required.",
            'danger',
            'alert-triangle',
            '/training-matrix',
            'training_records',
            $ref,
            'expired',
        );
    }

    // ─── Tracker / Equipment ────────────────────────

    public static function trackerDefectFound(object $record, string $inspectorId): void
    {
        $ref = $record->record_code ?? (string) $record->id;
        $categoryName = $record->category?->name ?? 'Equipment';

        static::notifyRoles(
            ['master', 'system_admin', 'ehs_manager', 'safety_officer'],
            self::TYPE_TRACKER,
            'Equipment Defect Found',
            "{$categoryName} item {$ref} has an open defect reported during inspection.",
            'warning',
            'alert-triangle',
            '/tracker',
            'tracker_records',
            $ref,
            $inspectorId,
        );
    }
}
