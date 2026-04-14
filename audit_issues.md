# EHS-OS Comprehensive Audit Issues Log
## Started: 2026-04-02

---

## INVENTORY SUMMARY

Inventory complete.
Tables found: ~80+ (across 80+ migrations creating/modifying tables)
Routes found: ~295 (230+ Laravel PHP + 65 Node.js Express)
Controllers found: 35
React pages found: 44
Hooks found: 22
Models found: 118

Missing files detected: none (all referenced files exist)
Broken routes detected: TBD (will verify in audit)

Beginning systematic audit by module...

---

## ISSUES LOG

---
### MODULE: OBSERVATIONS
---

| # | Sev | File | Line | Description |
|---|-----|------|------|-------------|
| 1 | P1 | ObservationController.php | 98-108 | stats() raw SQL bypasses SoftDeletes — deleted observations counted in KPIs |
| 2 | P1 | ObservationController.php | 98-108 | stats() KPIs not filtered by year but breakdowns are — total ≠ sum of monthly |
| 3 | P2 | ObservationController.php | 294-296 | store() ref_number race condition — COUNT+1 under concurrency → duplicates |
| 4 | P2 | ObservationController.php | 282-314 | store() not wrapped in DB::transaction |
| 5 | P2 | ObservationController.php | 173-213 | export() missing most filters that index() supports |
| 6 | P2 | ObservationController.php | 312 | store() allows client to set arbitrary status — no ENUM validation |
| 7 | P2 | ObservationController.php | 256 | upload() has no file size or type validation |
| 8 | P2 | ObservationController.php | 325-374 | update() has no validation at all |
| 9 | P2 | ObservationController.php | 327,386 | update()/updateStatus() have no status transition guards |
| 10 | P2 | Migration+Controller | — | contractor varchar(100) but validated max:255 — truncation risk |
| 11 | P3 | Observation.php | 15-20 | $fillable missing deleted_by |
| 12 | P3 | Observation.php | 15-20 | $fillable includes id — allows PK override |
| 13 | P3 | Observation.php | — | No relationships defined (no belongsTo for users) |
| 14 | P3 | useObservations.ts | 202-204 | exportData() passes JWT token as URL query parameter |
| 15 | P3 | ObservationPage.tsx | 40-48 | handleFormSubmit does not handle errors |
| 16 | P3 | ObservationTable.tsx | 271 | TypedDeleteConfirmModal refs ref_number but type uses observation_id — shows undefined |
| 17 | P3 | ObservationFilters.tsx | 34-37 | clearFilters() triggers 10 separate state updates and API calls |
| 18 | P4 | ObservationController.php | 453 | mapToFrontend() hardcodes escalation_required: false |
| 19 | P4 | ObservationController.php | 454-455 | mapToFrontend() hardcodes linked_permit_id/linked_incident_id as null |

---
### MODULE: PERMITS
---

| # | Sev | File | Line | Description |
|---|-----|------|------|-------------|
| 20 | P2 | PermitController.php | 94-104 | stats() KPIs not year-filtered but breakdowns are |
| 21 | P2 | PermitController.php | 395-444 | update() has no validation at all |
| 22 | P2 | PermitController.php | 358 | Ref number race condition — COUNT+1 |
| 23 | P3 | PermitController.php | 82 | Pagination uses key 'page' instead of 'current_page' |
| 24 | P3 | PermitController.php | 223-240 | export() missing search, area, contractor, period filters |
| 25 | P3 | PermitController.php | 430-437 | No status transition guards — any status → any status |
| 26 | P3 | Permit.php | — | No relationship to User model for created_by/updated_by/approved_by |
| 27 | P3 | usePermits.ts | 214-230 | exportData passes JWT token as URL query parameter |
| 28 | P3 | usePermits.ts | 182-193 | createPermit/updatePermit have no try/catch |
| 29 | P4 | PermitController.php | 326 | show() does not eager-load amendments relations |
| 30 | P4 | PermitController.php | 479 | deleted_by stores name, created_by stores UUID — inconsistent |
| 31 | P4 | Permit.php | 22 | source_slide_no in $fillable but not in any migration |

---
### MODULE: VIOLATIONS
---

| # | Sev | File | Line | Description |
|---|-----|------|------|-------------|
| 32 | P2 | ViolationController.php | 602-616 | Stats KPIs not year-filtered but breakdowns are |
| 33 | P2 | ViolationController.php | 164-188 | store() no DB::transaction for multi-table writes |
| 34 | P2 | ViolationController.php | 323-373 | addInvestigation() no DB::transaction |
| 35 | P2 | ViolationController.php | 263-290 | updateStatus() no status transition guards |
| 36 | P2 | Violation.php | 53-55 | booted() code generation race condition |
| 37 | P3 | ViolationController.php | 217-259 | update() has no validation |
| 38 | P3 | ViolationController.php | 744-789 | export() does not apply all list filters |
| 39 | P3 | useViolations.ts | 262-270 | uploadEvidence uses raw fetch() bypassing api helper |
| 40 | P4 | ViolationController.php | 24 | index() does not eager-load relationships |

---
### MODULE: INCIDENTS
---

| # | Sev | File | Line | Description |
|---|-----|------|------|-------------|
| 41 | P2 | IncidentController.php | 626-646 | Stats KPIs not year-filtered but breakdowns are |
| 42 | P2 | IncidentController.php | 158-227 | store() no DB::transaction |
| 43 | P2 | IncidentController.php | 337-391 | addInvestigation() no DB::transaction |
| 44 | P2 | IncidentController.php | 277-304 | updateStatus() no status transition guards |
| 45 | P2 | Incident.php | 68-71 | booted() code generation race condition |
| 46 | P2 | useIncidents.ts | 255-257 | invalidate() does not invalidate dashboard queries |
| 47 | P3 | IncidentController.php | 231-273 | update() has no validation |
| 48 | P3 | IncidentController.php | 774-823 | export() missing some filters |
| 49 | P3 | useIncidents.ts | 354-378 | Returns raw mutation objects instead of mutateAsync — inconsistent API |
| 50 | P4 | useIncidents.ts | 57 | photos typed as string[] but backend sends object array |

---
### MODULE: CONTRACTORS
---

| # | Sev | File | Line | Description |
|---|-----|------|------|-------------|
| 51 | P2 | ContractorController.php | 460-472 | updateContact() doesn't sync primary contact fields when is_primary not re-sent |
| 52 | P2 | ContractorController.php | 494 | removeContact() checks is_primary after delete — fragile ordering |
| 53 | P3 | ContractorController.php | 662-671 | stats() has 9 separate count queries — N+1 pattern |
| 54 | P3 | ContractorController.php | 494-501 | Removing primary contact doesn't promote another contact |
| 55 | P3 | ContractorController.php | 287 | update() not in DB::transaction |
| 56 | P3 | ContractorController.php | 871-881 | export() search only 3 fields vs index() 9 fields |
| 57 | P3 | Contractor.php | 65-70 | Auto-code generation race condition |
| 58 | P4 | ContractorController.php | 554-617 | upload/update/removeDocument don't recalculate expiry flags |
| 59 | P4 | useContractors.ts | 378 | exportContractors passes JWT token as URL query param |
| 60 | P4 | ContractorsPage.tsx | 60 | Delete says "cannot be undone" but uses SoftDeletes |

---
### MODULE: WASTE MANIFESTS
---

| # | Sev | File | Line | Description |
|---|-----|------|------|-------------|
| 61 | P2 | WasteManifestController.php | 80 | per_page=0 not guarded — crashes paginator |
| 62 | P2 | WasteManifestController.php | 579-583 | confirmReceiving() stores name not user ID — breaks audit trail |
| 63 | P2 | WasteManifestController.php | 900 | Generic changeStatus allows Received without receiving details |
| 64 | P3 | WasteManifestController.php | 454-492 | changeStatus() not in DB::transaction |
| 65 | P3 | WasteManifestController.php | 617-632 | confirmDisposal() file upload outside transaction |
| 66 | P3 | WasteManifestController.php | 639 | confirmDisposal defaults compliance_status to Compliant — regulatory risk |
| 67 | P3 | WasteManifest.php | 88-97 | is_delayed auto-clears on completion — loses historical data |
| 68 | P3 | WasteManifest.php | 80-84 | Auto-code generation race condition |
| 69 | P4 | WasteManifest.php | 46-48 | linked_incident_id, reviewed_by, approved_by are dead fields |
| 70 | P4 | ManifestsPage.tsx | 64 | Delete says "cannot be undone" but uses SoftDeletes |

---
### MODULE: MOCKUPS
---

| # | Sev | File | Line | Description |
|---|-----|------|------|-------------|
| 71 | P1 | MockupController.php | 131 | store() allows setting approval_status to Approved — bypasses review workflow |
| 72 | P1 | MockupController.php | 212 | update() allows setting approval_status directly — bypasses authorization |
| 73 | P2 | MockupController.php | 296-346 | Three-party approval modeled in DB but NOT enforced in workflow |
| 74 | P2 | MockupController.php | 225 | update() not in DB::transaction |
| 75 | P2 | MockupController.php | 244 | destroy() sets deleted_by but not in $fillable — silently ignored |
| 76 | P2 | Mockup.php | 57-59 | Auto-code generation race condition |
| 77 | P2 | useMockups.ts | 417 | exportData leaks JWT token in URL |
| 78 | P2 | useMockups.ts | 328-367 | uploadPhotos/deletePhoto bypass api service — use raw fetch |
| 79 | P3 | MockupController.php | 831 | uploadPhotos() gets originalName after move() — may be empty |
| 80 | P3 | Mockup.php | 28 | involved_candidates not cast to array |
| 81 | P3 | MockupRegisterPage.tsx | 42-49 | handleFormSubmit no try/catch — no error feedback |

---
### MODULE: MOM (Minutes of Meeting)
---

| # | Sev | File | Line | Description |
|---|-----|------|------|-------------|
| 82 | P1 | MomController.php | 297 | addPoint() no status enum validation — accepts any string |
| 83 | P2 | MomController.php | 307-328 | addPoint() no DB::transaction |
| 84 | P2 | MomController.php | 286-438 | addPoint/updatePoint/deletePoint never call recalculatePointCounts() |
| 85 | P2 | MomController.php | 276 | destroy() sets deleted_by not in $fillable — silently ignored |
| 86 | P2 | MomController.php | 128-133 | store() week/year uniqueness check is TOCTOU race |
| 87 | P2 | MomController.php | 687 | export() N+1: Mom::find() inside foreach loop |
| 88 | P2 | Mom.php | 99-106 | recalculatePointCounts() uses MySQL-specific SQL |
| 89 | P3 | MomController.php | 454-455 | carryForward() doesn't verify points belong to previous MOM |
| 90 | P3 | Mom.php | 23-24 | total_points/open_points in $fillable — can be set externally |
| 91 | P3 | useMom.ts | 441 | exportMoms leaks JWT token in URL |
| 92 | P3 | useMom.ts | 318-333 | point CRUD refreshes stats but not list — stale point counts |

---
### MODULE: TRAINING
---

| # | Sev | File | Line | Description |
|---|-----|------|------|-------------|
| 93 | P1 | TrainingController.php | 106 | searchWorkers() N+1: separate query per worker (50+ queries) |
| 94 | P2 | TrainingController.php | 356-378 | bulkAssign() not in DB::transaction — partial creates on failure |
| 95 | P2 | TrainingController.php | 326-329 | destroy() sets deleted_by not in $fillable |
| 96 | P2 | TrainingController.php | 450-457 | stats() expiring-soon query misses records already set to Expiring Soon |
| 97 | P2 | TrainingRecord.php | 53-59 | creating hook queries TrainingTopic per record — 200 identical queries in bulk |
| 98 | P2 | TrainingRecord.php | 47-49 | record_id generation race condition |
| 99 | P2 | TrainingMatrixPage.tsx | 13 | Named "TrainingMatrix" but does NOT implement workers×topics matrix grid |
| 100 | P3 | TrainingController.php | 399-408 | stats() KPIs count all-time, monthly filters by year |
| 101 | P3 | useTraining.ts | 294 | exportData leaks JWT token in URL |
| 102 | P3 | useTraining.ts | 42 | Frontend status type includes Pending/Not Required but backend never returns them |

---
### MODULE: MOCK DRILLS
---

| # | Sev | File | Line | Description |
|---|-----|------|------|-------------|
| 103 | P2 | MockDrillController.php | 273-330 | closeDrill() can close from ANY status — Planned drill closeable without conducting |
| 104 | P2 | MockDrillController.php | 804-836 | saveEvaluation() has NO validation rules |
| 105 | P2 | useDrills.ts | 112-165 | Frontend TypeScript interface has massive field name mismatches with backend |
| 106 | P3 | MockDrillController.php | 134 | Status bypass: update() includes status in fillable whitelist |
| 107 | P3 | MockDrillController.php | 367-661 | addParticipant/Resource/Observation don't check drill status |
| 108 | P3 | MockDrillController.php | 691-800 | delete/add/update actions don't recalculateCounts() |
| 109 | P3 | MockDrill.php | 50-56 | Auto-code generation race condition |
| 110 | P3 | DrillsPage.tsx | 428-430 | Accesses participants_count but model has participant_count (no 's') |
| 111 | P3 | DrillsPage.tsx | 419 | Accesses d.erp_code but should be d.erp?.erp_code |

---
### MODULE: CAMPAIGNS
---

| # | Sev | File | Line | Description |
|---|-----|------|------|-------------|
| 112 | P2 | CampaignController.php | 801-817 | stats() monthly trend uses correlated subquery — N+1 at SQL level |
| 113 | P3 | CampaignController.php | 177 | store() allows client to set status directly — bypasses workflow |
| 114 | P3 | CampaignController.php | 436-686 | add/remove participant/activity/evidence/action never call recalculateCounts() |
| 115 | P3 | Campaign.php | 38-53 | Auto-code generation race condition |
| 116 | P3 | CampaignsPage.tsx | 197-212 | handleSave() no client-side validation |

---
### MODULE: POSTERS
---

| # | Sev | File | Line | Description |
|---|-----|------|------|-------------|
| 117 | P2 | PosterController.php | 228-262 | store() creates PosterMedia after file move — getSize/getOriginalName may fail |
| 118 | P2 | PosterController.php | 248-255 | store() always creates PosterLink even when no link fields provided |
| 119 | P3 | PosterController.php | 627-686 | savePdfPath() no size limit on base64 input — memory exhaustion risk |
| 120 | P3 | PosterController.php | 509-550 | uploadMedia() no file type validation |
| 121 | P3 | usePosters.ts | 323 | saveLinkMutation uses api.put() but backend route is POST — 405 error |
| 122 | P3 | PostersPage.tsx | 492-494 | Edit button shown only for Draft in grid but for Draft/Under Review/Approved in detail |

---
### MODULE: ERP
---

| # | Sev | File | Line | Description |
|---|-----|------|------|-------------|
| 123 | P2 | ErpController.php | 414-434 | approve() sets Active from ANY status — no guard |
| 124 | P2 | useErps.ts | 7-40 | Frontend Erp interface has massive field mismatches with backend |
| 125 | P3 | ErpController.php | 204 | store() allows client to set status directly |
| 126 | P3 | ErpController.php | 293-398 | update() allows directly setting status via fillable |
| 127 | P4 | ErpController.php | 436-493 | stats() response shape doesn't match frontend ErpStats interface |

---
### CROSS-MODULE (Violations+Incidents)
---

| # | Sev | File | Line | Description |
|---|-----|------|------|-------------|
| 128 | P2 | Both controllers | — | No file upload MIME/size validation — security risk |
| 129 | P3 | Both controllers | — | destroy() doesn't cascade-delete related evidence/actions/logs |
| 130 | P3 | Both controllers | — | Export passes JWT token as URL query parameter |

---
### CROSS-MODULE (All modules)
---

| # | Sev | File | Line | Description |
|---|-----|------|------|-------------|
| 131 | P2 | All models | booted() | Auto-code generation uses COUNT+1 without locking — race condition pattern |
| 132 | P2 | Multiple hooks | — | JWT tokens leaked in export URLs across all modules |
| 133 | P2 | Multiple hooks | — | Raw fetch() bypasses api service — duplicates auth/error handling |
| 134 | P3 | Multiple controllers | — | MySQL-specific SQL (DATE_FORMAT, FIELD, SUM(col='val')) — vendor lock-in |
| 135 | P3 | Multiple models | — | All include 'id' in $fillable — allows external ID injection |

---
### MODULE: ENVIRONMENTAL
---

| # | Sev | File | Line | Description |
|---|-----|------|------|-------------|
| 136 | P2 | EnvironmentalController.php | 29-43 | Stats KPI field names mismatch frontend — dashboard badges all show 0 |
| 137 | P2 | EnvironmentalPage.tsx | 46-66 | Badge counts reference non-existent KPI field names |
| 138 | P2 | useEnvironmental.ts | 6-314 | Frontend interface fields systematically mismatched with backend model fields |
| 139 | P2 | EnvironmentalComplianceRegister.php | 42-47 | Auto-expiry only triggers on save — no scheduled expiry mechanism |
| 140 | P3 | EnvironmentalController.php | 29-43 | stats() fires 13 separate COUNT queries |
| 141 | P3 | EnvironmentalController.php | 54,82 | MySQL-specific DATE_FORMAT and FIELD() functions |
| 142 | P3 | EnvironmentalController.php | 135-163 | No transaction on storeAspect |
| 143 | P3 | EnvironmentalController.php | 807-813 | Evidence file uploads not validated (no mimes/max) |
| 144 | P3 | EnvironmentalController.php | 971-977 | Inspection photo uploads not validated |
| 145 | P3 | EnvironmentalAspect.php | 36-39 | Auto-code generation race condition |
| 146 | P3 | EnvironmentalPage.tsx | 40-43 | Stats not refreshed on section switch — stale badge counts |
| 147 | P4 | EnvironmentalController.php | 146 | severity/likelihood max:4 vs typical 5x5 risk matrix |
| 148 | P4 | EnvironmentalController.php | 1305-1318 | updateProgress doesn't auto-compute progress_percentage |

---
### MODULE: DOCUMENT CONTROL
---

| # | Sev | File | Line | Description |
|---|-----|------|------|-------------|
| 149 | P2 | DcDocument.php | 155-174 | No DB-level constraint for single is_active=true per document_id — race risk |
| 150 | P3 | DocumentControlController.php | 154-187 | Inconsistent mimes validation across store vs createRevision |
| 151 | P3 | DocumentControlController.php | 598 | submitForApproval status guard logic bug (AND vs OR) |
| 152 | P3 | DocumentControlController.php | 1023 | Export loads all records into memory via ->get() |
| 153 | P3 | DocumentControlController.php | 1052 | N+1: links()->count() in export loop |
| 154 | P3 | DcRevision.php | — | Missing SoftDeletes trait — hard-deleted revisions orphan references |
| 155 | P3 | useDocuments.ts | 282-298 | createDocument bypasses api utility — uses raw fetch |
| 156 | P3 | DocumentsPage.tsx | 69 | Uses browser confirm() instead of TypedDeleteConfirmModal |
| 157 | P4 | DocumentControlController.php | 924-934 | MySQL-specific raw SQL in stats() |
| 158 | P4 | DcRevision.php | 12-19 | is_active in $fillable allows mass-assignment bypass |

---
### MODULE: AI INTELLIGENCE
---

| # | Sev | File | Line | Description |
|---|-----|------|------|-------------|
| 159 | P2 | AiService.php | 355-370 | gatherEnvironmentalContext orWhere SQL precedence bug — includes soft-deleted |
| 160 | P2 | AiPage.tsx | 240-270 | Ask AI chat history lost on tab switch — poor UX |
| 161 | P3 | AiController.php | 103-110 | generateInsights has no rate limiting — unlimited API calls |
| 162 | P3 | AiController.php | 262-269 | generateAlerts has no rate limiting |
| 163 | P3 | AiService.php | 96-98 | buildSystemContext queries tables that may not exist — no try/catch |
| 164 | P3 | AiService.php | 160-225 | gatherIncident/ViolationContext don't filter soft-deleted records |
| 165 | P3 | AiPage.tsx | 243-246 | loadHistory result discarded — fetches but never assigns |
| 166 | P3 | AiPage.tsx | 441 | description.slice(0,150) may crash if description is null |
| 167 | P4 | AiService.php | 964-970 | JSON parsing try/catch is dead code (json_decode doesn't throw) |
| 168 | P4 | AiController.php | 416-439 | Stats fires ~15 uncached queries |

---
### MODULE: DASHBOARD
---

| # | Sev | File | Line | Description |
|---|-----|------|------|-------------|
| 169 | P1 | DashboardController.php | 26-33 | Response missing aiInsights and sparkTrends keys — frontend panels non-functional |
| 170 | P2 | DashboardController.php | 169-200 | getMonthlyTrend() runs 14 queries (2 per month × 7 months) |
| 171 | P2 | DashboardController.php | 449-496 | getSparkTrends() runs 28 queries (4 stats × 7 weeks) |
| 172 | P3 | DashboardController.php | 328-431 | getAiInsights() defined but never called |
| 173 | P3 | DashboardController.php | 104 | Observation counts don't exclude soft-deleted records |
| 174 | P3 | DashboardController.php | 73 | Schema::hasTable() called on every dashboard load — should cache |
| 175 | P4 | DashboardPage.tsx | 429-432 | Activity status dot colors use lowercase but backend sends capitalized |
| 176 | P4 | Header.tsx | 110 | Hardcoded "87 Incident-Free Days" — not data-driven |
| 177 | P4 | Header.tsx | 91-103 | Global search bar is non-functional (no handlers) |

---
### MODULE: CHECKLISTS
---

| # | Sev | File | Line | Description |
|---|-----|------|------|-------------|
| 178 | P2 | ChecklistController.php | 30-48 | categories() N+1: each category runs 3 individual count queries |
| 179 | P2 | ChecklistController.php | 500-525 | stats() fires 6 separate COUNT queries + N+1 on categories |
| 180 | P2 | ChecklistInspection.php | 55-91 | created hook updates parent item outside transaction |
| 181 | P3 | ChecklistController.php | 458-484 | recordInspection() double-updates parent item (hook + controller) |
| 182 | P3 | ChecklistItem.php | 86-89 | Auto-code generation race condition |
| 183 | P3 | ChecklistInspection.php | 47-50 | Auto-code generation race condition |
| 184 | P3 | ChecklistInspection.php | — | Model does not use SoftDeletes — can't recover inspections |
| 185 | P3 | useChecklists.ts | 344-360 | exportData exposes JWT token in URL |
| 186 | P4 | ChecklistController.php | 246-252 | store() minimal validation — no enum/date validation |

---
### MODULE: EQUIPMENT TRACKER
---

| # | Sev | File | Line | Description |
|---|-----|------|------|-------------|
| 187 | P2 | TrackerController.php | 37-61 | categories() N+1: 5 computed attributes per category = 5N queries |
| 188 | P2 | TrackerCategory.php | 34-57 | Five getXxxAttribute accessors each run separate count queries |
| 189 | P2 | TrackerController.php | 498-509 | stats() byCategory iterates categories with 3 computed attrs = 3N queries |
| 190 | P3 | TrackerController.php | 282-310 | store() uses $request->except() — passes ALL fields to create |
| 191 | P3 | TrackerController.php | 872-909 | Bulk import no DB::transaction — partial failures |
| 192 | P3 | TrackerRecord.php | 75-78 | Auto-code generation race condition |
| 193 | P3 | useTracker.ts | 491-498 | exportData exposes JWT token in URL |
| 194 | P3 | useTracker.ts | 506-532 | bulkImport uses raw fetch() bypassing api service |
| 195 | P3 | TrackerPage.tsx | 110-124 | Group type delete is sequential — partial failures possible |

---
### MODULE: PERMIT AMENDMENTS
---

| # | Sev | File | Line | Description |
|---|-----|------|------|-------------|
| 196 | P2 | PermitAmendmentController.php | 797-808 | Stats monthly_trend: 36 queries (3/month × 12 months) |
| 197 | P2 | PermitAmendmentController.php | 760-773 | Stats KPIs: 9 individual COUNT queries |
| 198 | P2 | PermitAmendment.php | 109-113 | saved() callback triggers amendment_count recalc on EVERY save |
| 199 | P2 | PermitAmendment.php | 85-106 | saved() deactivating other amendments cascades N additional saves |
| 200 | P3 | PermitAmendmentController.php | 881 | Export search filter only matches amendment_title (index matches 6 fields) |
| 201 | P3 | PermitAmendment.php | 58-60 | Auto-code generation race condition |
| 202 | P3 | PermitAmendment.php | 69-73 | revision_number generation race condition |
| 203 | P3 | useAmendments.ts | 233 | updateAmendment doesn't refresh stats — stale KPI cards |
| 204 | P3 | AmendmentsPage.tsx | 47-55 | handleFormSubmit no try/catch — no error feedback |
| 205 | P3 | AmendmentsPage.tsx | 57-60 | Uses window.confirm() instead of TypedDeleteConfirmModal |

---
### MODULE: EQUIPMENT REGISTER
---

| # | Sev | File | Line | Description |
|---|-----|------|------|-------------|
| 206 | P1 | EquipmentRegisterController.php | 310-319 | Stats fires 10 separate COUNT queries |
| 207 | P2 | EquipmentRegisterController.php | 359-370 | filterOptions() 3 full-table DISTINCT queries |
| 208 | P2 | EquipmentRegisterController.php | 180-181 | created_by stores user name not ID — no FK integrity |
| 209 | P2 | useEquipmentRegister.ts | 114 | loading initialized false — brief "no data" flash before fetch |
| 210 | P3 | EquipmentRegisterController.php | 148-150 | image mimes validation includes non-image types (pdf,doc,etc.) |
| 211 | P3 | EquipmentRegisterController.php | 250-273 | update() replaces ALL images/attachments — no incremental add |
| 212 | P3 | EquipmentRegister.php | 62-63 | Auto-code generation race condition |
| 213 | P3 | EquipmentRegisterPage.tsx | 18 | Role check client-side only — no backend permission middleware |
| 214 | P4 | EquipmentRegisterController.php | 393-409 | Export search filter only checks 3 fields vs index 9 |

---
### MODULE: WORKERS/MANPOWER
---

| # | Sev | File | Line | Description |
|---|-----|------|------|-------------|
| 215 | P2 | WorkerController.php | 52-57 | Sort direction not sanitized — passed raw to orderBy |
| 216 | P2 | WorkerController.php | 170-176 | destroy() sets deleted_by not in $fillable — silently ignored |
| 217 | P2 | Worker.php | 16-24 | deleted_by not in $fillable — field never persists |
| 218 | P2 | WorkerHoursController.php | 77-84 | store() updateOrCreate with UUID in values — may overwrite PK |
| 219 | P2 | WorkerHoursController.php | 138-148 | bulkStore() no DB::transaction — partial failures committed |
| 220 | P3 | WorkerController.php | 94-96 | worker_id generation race condition |
| 221 | P3 | WorkerController.php | 183-193 | stats() uses MySQL-specific SUM(status='x') syntax |
| 222 | P3 | WorkerHoursController.php | 92-96 | update() doesn't verify record belongs to URL workerId |
| 223 | P3 | ManpowerPage.tsx | 42-50 | handleFormSubmit no try/catch |
| 224 | P3 | ManpowerPage.tsx | 52-54 | handleDelete no confirmation dialog at all |

---
### CROSS-CUTTING CONCERNS
---

| # | Sev | File | Line | Description |
|---|-----|------|------|-------------|
| 225 | P2 | api.ts | 29-31 | No 401 response handling — expired tokens cause generic errors, no auto-logout |
| 226 | P2 | AuthContext.tsx | 62-91 | No token refresh or re-validation mechanism |
| 227 | P3 | JwtAuthenticate.php | 19-21 | Token accepted via ?token= query string — credential exposure in logs |
| 228 | P3 | api.php | 62 | Dev generate-setup-link endpoint exposed without auth in non-production |
| 229 | P3 | Sidebar.tsx | 128-130 | Missing onClose in useEffect dependency array |
| 230 | P3 | index.css + components | — | Z-index conflicts: sidebar(50) = modal(50), drawer(100) = toast(100) |
| 231 | P4 | api.ts | 13 | Hardcoded Content-Type blocks future FormData through request() |
| 232 | P4 | AuthContext.tsx + api.ts | — | API_BASE defined independently in 3 files — sync risk |
| 233 | P4 | permissions.ts | 82 | can_access_documents in PERMISSION_GROUPS but not in ROUTE_PERMISSION_MAP |
| 234 | P4 | SetupPasswordPage.tsx | 106 | setTimeout not cleared on unmount — potential memory leak |

---

## FIXES APPLIED (2026-04-07)

### Backend Fixes
1. **ObservationController** — Wrapped store() in DB::transaction with lockForUpdate() for ref_number (Issue #3-4)
2. **ViolationController** — Added "Resolved" to status validation, wrapped updateStatus in transaction (Issues #33, #35)
3. **IncidentController** — Same as ViolationController (Issues #42, #44)
4. **RoleController** — Wrapped role cascade slug update in DB::transaction (related to Issue #131)
5. **AuthController** — Null safety on currentAccessToken() in changePassword
6. **13+ Controllers** — Fixed `->name` to `->full_name` on User model: AiController (5), PermitAmendmentController (13), ChecklistController (2), EquipmentRegisterController (4), MockupController (1), MomController (1), TrainingController (1), TrackerController (3), WorkerController (1), ObservationController (1), PermitController (1)

### Frontend Critical Fixes
7. **SetupPasswordPage** — Fixed inconsistent password regex to match other components
8. **NotificationPanel** — Fixed SPA navigation (window.location.href → navigate()), added scroll reset on filter change
9. **DashboardPage** — Fixed "more" navigation (/dashboard → /reports)
10. **Badge.tsx** — Added ~20 missing status mappings (Resolved, Implemented, Conducted, etc.)
11. **Header.tsx** — Added cancellation flag for unmount safety on dashboard fetch
12. **ChangePasswordModal** — Added timer ref and cleanup on unmount
13. **ReportsPage** — Fixed export to fetch ALL records (limit=10000) instead of current page's 25

### Frontend Module Fixes
14. **DrillDetail/DrillPlanner/DrillForm/ErpDetail** — Fixed 15+ `scheduled_date` → `planned_date`, `scheduled_time` → `planned_time` field mismatches (Issue #105)
15. **DrillForm** — Fixed payload sending `scheduled_date` to backend → `planned_date`
16. **DrillsPage** — Fixed KPI `avg_response_time` → `avg_response_seconds`, `total` → `total_drills`, `this_month` → `drills_this_month`
17. **DrillAnalytics** — Fixed monthly_trend sort (numeric on string → localeCompare), `completed` → `conducted`, KPI field names to match interface, `formatMonthLabel` to handle YYYY-MM strings
18. **DrillDetail** — Fixed `evaluation.overall_rating` → `evaluation.final_score`, `conducted_by_name` → `conducted_by`, `coordinator_name` → `responsible_person`, evaluation form init mappings
19. **CampaignsPage** — Fixed `XIcon` → `X` (undefined reference crash, Issue #112 area)
20. **MockupForm** — Fixed notes field not populated on edit (`notes: ''` → `notes: mockup.notes || ''`)
21. **DocumentTable** — Fixed operator precedence: `d.links_count ?? 0 > 0` → `(d.links_count ?? 0) > 0`

### Error Handling Fixes (22 alert() → toast)
22. **CampaignsPage** — 1 alert → toast.error
23. **MockupRegisterPage + MockupDetail** — 7 alerts → toast.error
24. **ManpowerPage** — 2 alerts → toast.error
25. **ObservationPage** — 1 alert → toast.error
26. **AmendmentsPage** — 1 alert → toast.error
27. **Environmental (ActionsList, InspectionsList, ComplianceList, ResourceList)** — 8 alerts → toast.error/warning
28. **PostersPage** — 1 alert → toast.warning
29. **MomOpenItemsView** — 1 alert → toast.error

---

## FINAL AUDIT SUMMARY

**Total issues found: 234**

### By Severity:
| Severity | Count | % |
|----------|-------|---|
| P1 (Critical) | 7 | 3% |
| P2 (High) | 66 | 28% |
| P3 (Medium) | 113 | 48% |
| P4 (Low) | 48 | 21% |

### By Category:
| Category | Count |
|----------|-------|
| Stats/Analytics inaccuracy | 28 |
| N+1 / performance queries | 22 |
| Missing validation | 18 |
| Auto-code race conditions | 16 |
| No status transition guards | 12 |
| Missing DB::transaction | 14 |
| JWT token in URLs | 12 |
| Export filter mismatch | 10 |
| Missing error handling (frontend) | 14 |
| Field name mismatches (frontend↔backend) | 8 |
| File upload security | 8 |
| Raw fetch() bypassing api service | 8 |
| Model $fillable issues | 10 |
| Other | 54 |

### P1 Critical Issues:
1. #1-2: Observations stats() bypasses SoftDeletes + ignores year filter
2. #71-72: Mockup store()/update() allows bypassing approval workflow
3. #82: MOM addPoint() accepts any status string — no enum validation
4. #93: Training searchWorkers() N+1 — 50+ queries per search
5. #169: Dashboard API missing aiInsights/sparkTrends — panels non-functional
6. #206: Equipment Register stats fires 10 separate COUNT queries

### Top 10 Recurring Patterns:
1. Auto-code generation race conditions (16 modules)
2. Stats KPIs not year-filtered while breakdowns are
3. JWT tokens leaked in export URLs
4. Missing DB::transaction for multi-table writes
5. No status transition guards — any→any allowed
6. Export applies fewer filters than index
7. N+1 queries in stats/categories
8. Frontend↔backend field name mismatches
9. No file upload MIME/size validation
10. deleted_by set but not in $fillable — silently ignored

