<?php

namespace App\Services\Import;

/**
 * Normalizes status values from imported documents to match
 * the application's internal status values per module.
 */
class StatusNormalizer
{
    /**
     * Valid statuses per module (matching actual DB enum/defaults).
     */
    protected array $validStatuses = [
        'observations' => ['Open', 'Assigned', 'Closed', 'Verified'],
        'permits' => ['Draft', 'Active', 'Expired', 'Closed', 'Cancelled'],
        'mockups' => ['Draft', 'Submitted for Review', 'Approved', 'Approved with Comments', 'Comments Resolved', 'Rejected'],
        'mom_points' => ['Open', 'In Progress', 'Resolved', 'Closed', 'Carried Forward', 'Pending', 'Blocked'],
        'training' => ['Valid', 'Expired', 'Expiring Soon', 'Pending', 'Not Required'],
        'checklists' => ['Active', 'Out of Service', 'Removed from Site'],
        'tracker' => ['Active', 'Inactive', 'Out of Service', 'Quarantined', 'Removed from Site', 'Under Maintenance'],
        'incidents' => ['Open', 'Under Investigation', 'Closed'],
        'rams' => ['Draft', 'Submitted', 'Approved', 'Rejected'],
        'workers' => ['Active', 'Inactive', 'Demobilised', 'Suspended'],
        'inspection_result' => ['Pass', 'Fail', 'Pass with Issues', 'Requires Action'],
        'health_condition' => ['Good', 'Fair', 'Poor', 'Out of Service', 'Quarantined'],
    ];

    /**
     * Mapping of raw status variations to normalized values.
     */
    protected array $statusAliases = [
        // Completed / Closed group
        'completed' => 'Closed', 'complete' => 'Closed', 'done' => 'Closed',
        'finished' => 'Closed', 'closed' => 'Closed', 'resolved' => 'Resolved',
        'fixed' => 'Resolved', 'addressed' => 'Resolved',

        // Open / Active group
        'open' => 'Open', 'new' => 'Open', 'not started' => 'Open',
        'active' => 'Active', 'valid' => 'Valid', 'current' => 'Active',
        'live' => 'Active',

        // In Progress group
        'in progress' => 'In Progress', 'in-progress' => 'In Progress',
        'ongoing' => 'In Progress', 'wip' => 'In Progress',
        'work in progress' => 'In Progress', 'working' => 'In Progress',
        'under review' => 'In Progress', 'under investigation' => 'In Progress',

        // Pending / Draft group
        'pending' => 'Pending', 'awaiting' => 'Pending', 'waiting' => 'Pending',
        'draft' => 'Draft', 'on hold' => 'Pending', 'hold' => 'Pending',

        // Approval group
        'approved' => 'Approved', 'accepted' => 'Approved',
        'rejected' => 'Rejected', 'declined' => 'Rejected', 'denied' => 'Rejected',
        'submitted' => 'Submitted', 'submitted for review' => 'Submitted for Review',
        'approved with comments' => 'Approved with Comments',
        'comments resolved' => 'Comments Resolved',

        // Special statuses
        'expired' => 'Expired', 'overdue' => 'Open', // Overdue is a flag, not status
        'upcoming' => 'Open', 'planned' => 'Draft',
        'cancelled' => 'Cancelled', 'canceled' => 'Cancelled',
        'carried forward' => 'Carried Forward', 'carry forward' => 'Carried Forward',
        'blocked' => 'Blocked', 'stuck' => 'Blocked',

        // Condition/Health statuses
        'good' => 'Good', 'fair' => 'Fair', 'poor' => 'Poor',
        'out of service' => 'Out of Service', 'oos' => 'Out of Service',
        'quarantined' => 'Quarantined', 'removed' => 'Removed from Site',

        // Inspection results
        'pass' => 'Pass', 'passed' => 'Pass', 'ok' => 'Pass',
        'fail' => 'Fail', 'failed' => 'Fail', 'not ok' => 'Fail',
        'satisfactory' => 'Pass', 'unsatisfactory' => 'Fail',

        // Inactive
        'inactive' => 'Inactive', 'disabled' => 'Inactive',
        'demobilised' => 'Demobilised', 'demobilized' => 'Demobilised',
        'suspended' => 'Suspended',
    ];

    /**
     * Normalize a raw status string for a given module.
     */
    public function normalize(string $rawStatus, string $module): string
    {
        $raw = strtolower(trim($rawStatus));

        if (empty($raw)) {
            return $this->getDefaultStatus($module);
        }

        // Direct match from aliases
        $normalized = $this->statusAliases[$raw] ?? null;

        if ($normalized === null) {
            // Try partial matching
            $normalized = $this->partialMatch($raw);
        }

        if ($normalized === null) {
            // Return raw status capitalized as fallback
            return ucwords($rawStatus);
        }

        // Validate against module's valid statuses
        return $this->mapToModuleStatus($normalized, $module);
    }

    /**
     * Try partial matching for status variations.
     */
    protected function partialMatch(string $raw): ?string
    {
        foreach ($this->statusAliases as $alias => $mapped) {
            if (str_contains($raw, $alias) || str_contains($alias, $raw)) {
                return $mapped;
            }
        }
        return null;
    }

    /**
     * Map a normalized status to the closest valid status for a module.
     */
    protected function mapToModuleStatus(string $normalized, string $module): string
    {
        $validList = $this->validStatuses[$module] ?? [];

        if (empty($validList)) {
            return $normalized;
        }

        // Direct match
        if (in_array($normalized, $validList)) {
            return $normalized;
        }

        // Cross-module mapping
        $crossMap = [
            'observations' => [
                'Resolved' => 'Closed', 'Completed' => 'Closed', 'Active' => 'Open',
                'In Progress' => 'Assigned', 'Pending' => 'Open', 'Draft' => 'Open',
            ],
            'permits' => [
                'Open' => 'Active', 'Completed' => 'Closed', 'Resolved' => 'Closed',
                'In Progress' => 'Active', 'Pending' => 'Draft', 'Submitted' => 'Active',
                'Approved' => 'Active',
            ],
            'mockups' => [
                'Open' => 'Draft', 'Active' => 'Submitted for Review',
                'In Progress' => 'Submitted for Review', 'Closed' => 'Approved',
                'Completed' => 'Approved', 'Pending' => 'Draft',
            ],
            'mom_points' => [
                'Active' => 'Open', 'Completed' => 'Closed', 'Draft' => 'Open',
                'Submitted' => 'Open', 'Approved' => 'Closed',
                'Expired' => 'Open', 'Cancelled' => 'Closed',
            ],
            'training' => [
                'Open' => 'Pending', 'Active' => 'Valid', 'Completed' => 'Valid',
                'Closed' => 'Valid', 'In Progress' => 'Pending', 'Draft' => 'Pending',
            ],
            'checklists' => [
                'Good' => 'Active', 'Fair' => 'Active', 'Poor' => 'Out of Service',
                'Open' => 'Active', 'Closed' => 'Removed from Site',
            ],
            'tracker' => [
                'Good' => 'Active', 'Fair' => 'Active', 'Poor' => 'Out of Service',
                'Open' => 'Active', 'Closed' => 'Inactive',
            ],
            'incidents' => [
                'Active' => 'Open', 'In Progress' => 'Under Investigation',
                'Resolved' => 'Closed', 'Completed' => 'Closed',
                'Pending' => 'Open', 'Draft' => 'Open',
            ],
            'rams' => [
                'Open' => 'Draft', 'Active' => 'Submitted',
                'In Progress' => 'Submitted', 'Closed' => 'Approved',
                'Completed' => 'Approved', 'Pending' => 'Draft',
            ],
        ];

        $moduleMap = $crossMap[$module] ?? [];
        if (isset($moduleMap[$normalized])) {
            return $moduleMap[$normalized];
        }

        // Last resort: return the first valid status (default)
        return $this->getDefaultStatus($module);
    }

    /**
     * Get default status for a module.
     */
    public function getDefaultStatus(string $module): string
    {
        $defaults = [
            'observations' => 'Open',
            'permits' => 'Draft',
            'mockups' => 'Draft',
            'mom_points' => 'Open',
            'training' => 'Pending',
            'checklists' => 'Active',
            'tracker' => 'Active',
            'incidents' => 'Open',
            'rams' => 'Draft',
            'workers' => 'Active',
        ];

        return $defaults[$module] ?? 'Open';
    }

    /**
     * Get valid statuses for a module.
     */
    public function getValidStatuses(string $module): array
    {
        return $this->validStatuses[$module] ?? [];
    }
}
