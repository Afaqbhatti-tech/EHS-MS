<?php

namespace App\Http\Controllers;

use App\Http\Traits\ExportsData;
use App\Models\Poster;
use App\Models\PosterLink;
use App\Models\PosterMedia;
use App\Models\PosterTemplate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class PosterController extends Controller
{
    use ExportsData;

    /* ══════════════════════════════════════════════════
     *  TEMPLATES
     * ══════════════════════════════════════════════════ */

    public function templates()
    {
        $templates = PosterTemplate::active()
            ->orderBy('sort_order')
            ->orderBy('category')
            ->get();

        return response()->json($templates);
    }

    public function destroyTemplate(PosterTemplate $template)
    {
        // Check if any posters use this template
        $usageCount = Poster::where('template_id', $template->id)->count();
        if ($usageCount > 0) {
            return response()->json([
                'message' => "Cannot delete template: {$usageCount} poster(s) are using it.",
            ], 422);
        }

        $template->delete();

        return response()->json(['message' => 'Template deleted successfully.']);
    }

    /* ══════════════════════════════════════════════════
     *  INDEX — list posters with filters & pagination
     * ══════════════════════════════════════════════════ */

    public function index(Request $request)
    {
        $query = Poster::with(['template:id,name,layout_type,category', 'createdBy:id,full_name', 'links'])
            ->withCount('media');

        // ── Text search ───────────────────────────────
        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('poster_code', 'like', "%{$search}%")
                  ->orWhere('headline', 'like', "%{$search}%")
                  ->orWhere('topic', 'like', "%{$search}%");
            });
        }

        // ── Exact filters ─────────────────────────────
        foreach (['category', 'poster_type', 'topic', 'status', 'priority', 'language', 'target_audience'] as $f) {
            if ($v = $request->get($f)) {
                $query->where($f, $v);
            }
        }

        // ── Partial filters ───────────────────────────
        foreach (['site', 'area', 'zone', 'department'] as $f) {
            if ($v = $request->get($f)) {
                $query->where($f, 'like', "%{$v}%");
            }
        }

        // ── Template filter ───────────────────────────
        if ($tid = $request->get('template_id')) {
            $query->where('template_id', $tid);
        }

        // ── Campaign link filter ──────────────────────
        if ($cid = $request->get('linked_campaign_id')) {
            $query->whereHas('links', fn ($q) => $q->where('linked_campaign_id', $cid));
        }

        // ── Date range filters ────────────────────────
        if ($df = $request->get('date_from')) {
            $query->whereDate('created_at', '>=', $df);
        }
        if ($dt = $request->get('date_to')) {
            $query->whereDate('created_at', '<=', $dt);
        }
        if ($ef = $request->get('effective_from')) {
            $query->whereDate('effective_date', '>=', $ef);
        }
        if ($et = $request->get('effective_to')) {
            $query->whereDate('effective_date', '<=', $et);
        }

        // ── Period shortcut ───────────────────────────
        if ($period = $request->get('period')) {
            $query->period($period);
        }

        // ── Sorting ───────────────────────────────────
        $allowed = ['created_at', 'title', 'status', 'view_count', 'download_count', 'published_at', 'poster_code'];
        $sortBy  = in_array($request->get('sort_by'), $allowed) ? $request->get('sort_by') : 'created_at';
        $sortDir = in_array($request->get('sort_dir'), ['asc', 'desc']) ? $request->get('sort_dir') : 'desc';
        $query->orderBy($sortBy, $sortDir);

        // ── Paginate ──────────────────────────────────
        $perPage = min(500, max(1, (int) $request->get('per_page', 20)));
        $result  = $query->paginate($perPage);

        return response()->json([
            'data'      => $result->items(),
            'total'     => $result->total(),
            'page'      => $result->currentPage(),
            'per_page'  => $result->perPage(),
            'last_page' => $result->lastPage(),
        ]);
    }

    /* ══════════════════════════════════════════════════
     *  STORE — create a new poster
     * ══════════════════════════════════════════════════ */

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title'             => 'required|string|max:500',
            'category'          => 'required|string|max:200',
            'poster_type'       => 'required|string|max:200',
            'subtitle'          => 'nullable|string|max:500',
            'topic'             => 'nullable|string|max:200',
            'description'       => 'nullable|string',
            // Content
            'headline'          => 'nullable|string|max:500',
            'subheadline'       => 'nullable|string|max:500',
            'main_body_text'    => 'nullable|string',
            'bullet_points'     => 'nullable|array',
            'bullet_points.*'   => 'string|max:300',
            'warning_text'      => 'nullable|string|max:1000',
            'call_to_action'    => 'nullable|string|max:500',
            'footer_text'       => 'nullable|string|max:500',
            'quote_or_slogan'   => 'nullable|string|max:500',
            // Design
            'template_id'       => 'nullable|integer|exists:poster_templates,id',
            'layout_type'       => 'nullable|string|max:100',
            'orientation'       => 'nullable|in:Portrait,Landscape',
            'theme_key'         => 'nullable|string|max:50',
            'background_color'  => 'nullable|string|max:20',
            'accent_color'      => 'nullable|string|max:20',
            'font_style'        => 'nullable|string|max:100',
            'font_size'         => 'nullable|in:Small,Medium,Large,Extra Large',
            'text_alignment'    => 'nullable|in:Left,Center,Right',
            'print_size'        => 'nullable|string|max:50',
            // Classification
            'target_audience'   => 'nullable|string|max:255',
            'priority'          => 'nullable|in:Low,Medium,High,Critical',
            'language'          => 'nullable|string|max:50',
            'site'              => 'nullable|string|max:255',
            'project'           => 'nullable|string|max:255',
            'area'              => 'nullable|string|max:200',
            'zone'              => 'nullable|string|max:200',
            'department'        => 'nullable|string|max:200',
            'contractor_name'   => 'nullable|string|max:200',
            'effective_date'    => 'nullable|date',
            'expiry_date'       => 'nullable|date',
            'version'           => 'nullable|string|max:20',
            // Media (file uploads)
            'main_image'        => 'nullable|image|max:10240',
            'secondary_image'   => 'nullable|image|max:10240',
            'background_image'  => 'nullable|image|max:10240',
            'company_logo'      => 'nullable|image|max:5120',
            // Links
            'linked_campaign_id'    => 'nullable|integer|exists:campaigns,id',
            'linked_mock_drill_id'  => 'nullable|integer|exists:mock_drills,id',
            'linked_erp_id'         => 'nullable|integer|exists:erps,id',
            'linked_mom_id'         => 'nullable|string|max:36',
            'linked_permit_id'      => 'nullable|string|max:36',
            'linked_rams_id'        => 'nullable|string|max:36',
            'linked_module_type'    => 'nullable|string|max:100',
            'linked_module_id'      => 'nullable|string|max:36',
            'link_notes'            => 'nullable|string',
        ]);

        return DB::transaction(function () use ($request, $validated) {
            $year = now()->year;

            // Build fillable data (exclude file/link fields)
            $linkFields = [
                'linked_campaign_id', 'linked_mock_drill_id', 'linked_erp_id',
                'linked_mom_id', 'linked_permit_id', 'linked_rams_id',
                'linked_module_type', 'linked_module_id', 'link_notes',
                'main_image', 'secondary_image', 'background_image', 'company_logo',
            ];
            $posterData = collect($validated)->except($linkFields)->toArray();
            $posterData['created_by'] = auth()->id();
            $posterData['status'] = $posterData['status'] ?? 'Draft';

            // Handle image uploads
            $imageSlots = [
                'main_image'       => ['path_field' => 'main_image_path',       'media_type' => 'Main Image'],
                'secondary_image'  => ['path_field' => 'secondary_image_path',  'media_type' => 'Secondary Image'],
                'background_image' => ['path_field' => 'background_image_path', 'media_type' => 'Background'],
                'company_logo'     => ['path_field' => 'company_logo_path',     'media_type' => 'Logo'],
            ];

            foreach ($imageSlots as $inputName => $meta) {
                if ($request->hasFile($inputName)) {
                    $file     = $request->file($inputName);
                    $fileName = 'pst-' . time() . '-' . Str::random(6) . '.' . $file->getClientOriginalExtension();
                    $dir      = storage_path("app/public/posters/{$year}/images");
                    if (!is_dir($dir)) {
                        mkdir($dir, 0755, true);
                    }
                    $file->move($dir, $fileName);
                    $posterData[$meta['path_field']] = "posters/{$year}/images/{$fileName}";
                }
            }

            $poster = Poster::create($posterData);

            // Create PosterMedia records for uploaded images
            foreach ($imageSlots as $inputName => $meta) {
                if ($request->hasFile($inputName)) {
                    $file = $request->file($inputName);
                    PosterMedia::create([
                        'poster_id'        => $poster->id,
                        'media_type'       => $meta['media_type'],
                        'file_path'        => $poster->{$meta['path_field']},
                        'original_name'    => $file->getClientOriginalName(),
                        'file_type'        => $file->getClientOriginalExtension(),
                        'file_size_kb'     => (int) round($file->getSize() / 1024),
                        'uploaded_by'      => auth()->id(),
                        'uploaded_by_name' => auth()->user()?->full_name ?? auth()->user()?->email,
                        'created_at'       => now(),
                    ]);
                }
            }

            // Create PosterLink if any link field provided
            $linkData = collect($validated)->only([
                'linked_campaign_id', 'linked_mock_drill_id', 'linked_erp_id',
                'linked_mom_id', 'linked_permit_id', 'linked_rams_id',
                'linked_module_type', 'linked_module_id', 'link_notes',
            ])->filter()->toArray();

            PosterLink::create(array_merge(['poster_id' => $poster->id], $linkData));

            $poster->logHistory('Poster Created', null, 'Draft');

            return response()->json(
                $poster->fresh(['template', 'links', 'media', 'createdBy:id,full_name']),
                201
            );
        });
    }

    /* ══════════════════════════════════════════════════
     *  SHOW — single poster detail
     * ══════════════════════════════════════════════════ */

    public function show($id)
    {
        $poster = Poster::with([
            'template', 'media', 'links',
            'logs' => fn ($q) => $q->orderByDesc('created_at'),
            'logs.performer:id,full_name',
            'createdBy:id,full_name',
        ])->findOrFail($id);

        $poster->incrementStat('view_count');

        $poster->append(['main_image_url', 'secondary_image_url', 'background_image_url',
                          'company_logo_url', 'preview_url', 'pdf_url', 'theme']);

        return response()->json($poster);
    }

    /* ══════════════════════════════════════════════════
     *  UPDATE
     * ══════════════════════════════════════════════════ */

    public function update(Request $request, $id)
    {
        $poster = Poster::findOrFail($id);

        if (in_array($poster->status, ['Published', 'Archived'])) {
            $userRole = auth()->user()?->role;
            if (!in_array($userRole, ['master', 'system_admin'])) {
                return response()->json([
                    'message' => 'Published posters cannot be edited. Archive first or contact admin.',
                ], 422);
            }
        }

        $validated = $request->validate([
            'title'             => 'sometimes|required|string|max:500',
            'category'          => 'sometimes|required|string|max:200',
            'poster_type'       => 'sometimes|required|string|max:200',
            'subtitle'          => 'nullable|string|max:500',
            'topic'             => 'nullable|string|max:200',
            'description'       => 'nullable|string',
            'headline'          => 'nullable|string|max:500',
            'subheadline'       => 'nullable|string|max:500',
            'main_body_text'    => 'nullable|string',
            'bullet_points'     => 'nullable|array',
            'bullet_points.*'   => 'string|max:300',
            'warning_text'      => 'nullable|string|max:1000',
            'call_to_action'    => 'nullable|string|max:500',
            'footer_text'       => 'nullable|string|max:500',
            'quote_or_slogan'   => 'nullable|string|max:500',
            'template_id'       => 'nullable|integer|exists:poster_templates,id',
            'layout_type'       => 'nullable|string|max:100',
            'orientation'       => 'nullable|in:Portrait,Landscape',
            'theme_key'         => 'nullable|string|max:50',
            'background_color'  => 'nullable|string|max:20',
            'accent_color'      => 'nullable|string|max:20',
            'font_style'        => 'nullable|string|max:100',
            'font_size'         => 'nullable|in:Small,Medium,Large,Extra Large',
            'text_alignment'    => 'nullable|in:Left,Center,Right',
            'print_size'        => 'nullable|string|max:50',
            'target_audience'   => 'nullable|string|max:255',
            'priority'          => 'nullable|in:Low,Medium,High,Critical',
            'language'          => 'nullable|string|max:50',
            'site'              => 'nullable|string|max:255',
            'project'           => 'nullable|string|max:255',
            'area'              => 'nullable|string|max:200',
            'zone'              => 'nullable|string|max:200',
            'department'        => 'nullable|string|max:200',
            'contractor_name'   => 'nullable|string|max:200',
            'effective_date'    => 'nullable|date',
            'expiry_date'       => 'nullable|date',
            'version'           => 'nullable|string|max:20',
            'qr_code_data'      => 'nullable|string',
            'main_image'        => 'nullable|image|max:10240',
            'secondary_image'   => 'nullable|image|max:10240',
            'background_image'  => 'nullable|image|max:10240',
            'company_logo'      => 'nullable|image|max:5120',
            'linked_campaign_id'    => 'nullable|integer|exists:campaigns,id',
            'linked_mock_drill_id'  => 'nullable|integer|exists:mock_drills,id',
            'linked_erp_id'         => 'nullable|integer|exists:erps,id',
            'linked_mom_id'         => 'nullable|string|max:36',
            'linked_permit_id'      => 'nullable|string|max:36',
            'linked_rams_id'        => 'nullable|string|max:36',
            'linked_module_type'    => 'nullable|string|max:100',
            'linked_module_id'      => 'nullable|string|max:36',
            'link_notes'            => 'nullable|string',
        ]);

        return DB::transaction(function () use ($request, $poster, $validated) {
            $year = now()->year;
            $linkFields = [
                'linked_campaign_id', 'linked_mock_drill_id', 'linked_erp_id',
                'linked_mom_id', 'linked_permit_id', 'linked_rams_id',
                'linked_module_type', 'linked_module_id', 'link_notes',
                'main_image', 'secondary_image', 'background_image', 'company_logo',
            ];
            $posterData = collect($validated)->except($linkFields)->toArray();
            $posterData['updated_by'] = auth()->id();

            // Handle image replacements
            $imageSlots = [
                'main_image'       => ['path_field' => 'main_image_path',       'media_type' => 'Main Image'],
                'secondary_image'  => ['path_field' => 'secondary_image_path',  'media_type' => 'Secondary Image'],
                'background_image' => ['path_field' => 'background_image_path', 'media_type' => 'Background'],
                'company_logo'     => ['path_field' => 'company_logo_path',     'media_type' => 'Logo'],
            ];

            foreach ($imageSlots as $inputName => $meta) {
                if ($request->hasFile($inputName)) {
                    // Delete old file
                    $oldPath = $poster->{$meta['path_field']};
                    if ($oldPath) {
                        Storage::disk('public')->delete($oldPath);
                    }

                    $file     = $request->file($inputName);
                    $fileName = 'pst-' . time() . '-' . Str::random(6) . '.' . $file->getClientOriginalExtension();
                    $dir      = storage_path("app/public/posters/{$year}/images");
                    if (!is_dir($dir)) {
                        mkdir($dir, 0755, true);
                    }
                    $file->move($dir, $fileName);
                    $posterData[$meta['path_field']] = "posters/{$year}/images/{$fileName}";

                    PosterMedia::create([
                        'poster_id'        => $poster->id,
                        'media_type'       => $meta['media_type'],
                        'file_path'        => $posterData[$meta['path_field']],
                        'original_name'    => $file->getClientOriginalName(),
                        'file_type'        => $file->getClientOriginalExtension(),
                        'file_size_kb'     => (int) round($file->getSize() / 1024),
                        'uploaded_by'      => auth()->id(),
                        'uploaded_by_name' => auth()->user()?->full_name ?? auth()->user()?->email,
                        'created_at'       => now(),
                    ]);
                }
            }

            $poster->update($posterData);

            // Update or create links
            $linkData = collect($validated)->only([
                'linked_campaign_id', 'linked_mock_drill_id', 'linked_erp_id',
                'linked_mom_id', 'linked_permit_id', 'linked_rams_id',
                'linked_module_type', 'linked_module_id', 'link_notes',
            ])->toArray();

            if (!empty($linkData)) {
                PosterLink::updateOrCreate(
                    ['poster_id' => $poster->id],
                    $linkData
                );
            }

            $poster->logHistory('Content Updated');

            return response()->json(
                $poster->fresh(['template', 'links', 'media', 'createdBy:id,full_name'])
            );
        });
    }

    /* ══════════════════════════════════════════════════
     *  DESTROY — soft delete (Draft/Archived only)
     * ══════════════════════════════════════════════════ */

    public function destroy($id)
    {
        $poster = Poster::findOrFail($id);

        if (!in_array($poster->status, ['Draft', 'Archived'])) {
            return response()->json([
                'message' => 'Only Draft or Archived posters can be deleted.',
            ], 422);
        }

        $poster->deleted_by = Auth::user()?->full_name ?? 'System';
        $poster->save();
        $poster->logHistory('Poster Deleted');
        $poster->delete();
        RecycleBinController::logDeleteAction('poster', $poster);

        return response()->json(['message' => 'Poster deleted.']);
    }

    /* ══════════════════════════════════════════════════
     *  CHANGE STATUS — workflow transitions
     * ══════════════════════════════════════════════════ */

    public function changeStatus(Request $request, $id)
    {
        $poster = Poster::findOrFail($id);

        $request->validate([
            'status' => 'required|in:Draft,Under Review,Approved,Published,Archived',
            'notes'  => 'nullable|string',
        ]);

        $newStatus = $request->input('status');
        $oldStatus = $poster->status;

        // Guard transitions
        $allowed = match ($newStatus) {
            'Under Review' => ['Draft'],
            'Approved'     => ['Under Review', 'Draft'],
            'Published'    => ['Approved'],
            'Archived'     => ['Published', 'Approved'],
            'Draft'        => ['Under Review'],
            default        => [],
        };

        if (!in_array($oldStatus, $allowed)) {
            return response()->json([
                'message' => "Cannot transition from {$oldStatus} to {$newStatus}.",
            ], 422);
        }

        $updateData = ['status' => $newStatus];

        if ($newStatus === 'Published') {
            $updateData['published_at'] = now();
            $updateData['published_by'] = auth()->user()?->full_name ?? auth()->user()?->email;
        }

        if ($newStatus === 'Approved') {
            $updateData['approved_by'] = auth()->user()?->full_name ?? auth()->user()?->email;
        }

        if ($newStatus === 'Under Review') {
            $updateData['reviewed_by'] = auth()->user()?->full_name ?? auth()->user()?->email;
        }

        $poster->update($updateData);
        $poster->logHistory('Status Changed', $oldStatus, $newStatus, $request->input('notes'));

        return response()->json($poster->fresh());
    }

    /* ══════════════════════════════════════════════════
     *  UPLOAD MEDIA — additional media per poster
     * ══════════════════════════════════════════════════ */

    public function uploadMedia(Request $request, $id)
    {
        $poster = Poster::findOrFail($id);

        $request->validate([
            'files'      => 'required|array',
            'files.*'    => 'required|file|mimes:jpg,jpeg,png,gif,webp,svg,pdf,doc,docx,xls,xlsx,ppt,pptx|max:15360',
            'media_type' => 'nullable|in:Main Image,Secondary Image,Background,Logo,Icon,QR Code,Preview,PDF Output,Other',
            'caption'    => 'nullable|string|max:500',
        ]);

        $uploaded = [];
        $user = auth()->user();

        foreach ($request->file('files') as $file) {
            $originalName = $file->getClientOriginalName();
            $originalExt  = $file->getClientOriginalExtension();
            $fileSize     = $file->getSize();
            $fileName = 'pst-' . time() . '-' . Str::random(6) . '.' . $originalExt;
            $dir      = storage_path("app/public/posters/{$poster->id}/media");
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }
            $file->move($dir, $fileName);

            $media = PosterMedia::create([
                'poster_id'        => $poster->id,
                'media_type'       => $request->input('media_type', 'Other'),
                'file_path'        => "posters/{$poster->id}/media/{$fileName}",
                'original_name'    => $originalName,
                'file_type'        => $originalExt,
                'file_size_kb'     => (int) round($fileSize / 1024),
                'caption'          => $request->input('caption'),
                'uploaded_by'      => $user?->id,
                'uploaded_by_name' => $user?->full_name ?? $user?->email,
                'created_at'       => now(),
            ]);

            $uploaded[] = $media;
        }

        $poster->logHistory('Media Uploaded', null, null, count($uploaded) . ' file(s) uploaded');

        return response()->json($uploaded, 201);
    }

    /* ══════════════════════════════════════════════════
     *  REMOVE MEDIA
     * ══════════════════════════════════════════════════ */

    public function removeMedia($id, $mediaId)
    {
        $poster = Poster::findOrFail($id);
        $media  = PosterMedia::where('poster_id', $poster->id)->findOrFail($mediaId);

        Storage::disk('public')->delete($media->file_path);
        $media->delete();

        return response()->json(['message' => 'Media removed.']);
    }

    /* ══════════════════════════════════════════════════
     *  SAVE LINK
     * ══════════════════════════════════════════════════ */

    public function saveLink(Request $request, $id)
    {
        $poster = Poster::findOrFail($id);

        $validated = $request->validate([
            'linked_campaign_id'    => 'nullable|integer|exists:campaigns,id',
            'linked_mock_drill_id'  => 'nullable|integer|exists:mock_drills,id',
            'linked_erp_id'         => 'nullable|integer|exists:erps,id',
            'linked_mom_id'         => 'nullable|string|max:36',
            'linked_permit_id'      => 'nullable|string|max:36',
            'linked_rams_id'        => 'nullable|string|max:36',
            'linked_module_type'    => 'nullable|string|max:100',
            'linked_module_id'      => 'nullable|string|max:36',
            'link_notes'            => 'nullable|string',
        ]);

        $link = PosterLink::updateOrCreate(
            ['poster_id' => $poster->id],
            $validated
        );

        $poster->logHistory('Module Link Updated');

        return response()->json($link);
    }

    /* ══════════════════════════════════════════════════
     *  TRACK DOWNLOAD
     * ══════════════════════════════════════════════════ */

    public function trackDownload($id)
    {
        $poster = Poster::findOrFail($id);
        $poster->incrementStat('download_count');
        $poster->logHistory('Downloaded', null, null, 'Downloaded by ' . (auth()->user()?->full_name ?? 'Unknown'));

        return response()->json(['download_count' => $poster->fresh()->download_count]);
    }

    /* ══════════════════════════════════════════════════
     *  TRACK PRINT
     * ══════════════════════════════════════════════════ */

    public function trackPrint($id)
    {
        $poster = Poster::findOrFail($id);
        $poster->incrementStat('print_count');
        $poster->logHistory('Printed');

        return response()->json(['print_count' => $poster->fresh()->print_count]);
    }

    /* ══════════════════════════════════════════════════
     *  SAVE PDF — client-side generated PDF/preview
     * ══════════════════════════════════════════════════ */

    public function savePdfPath(Request $request, $id)
    {
        $poster = Poster::findOrFail($id);

        $request->validate([
            'pdf_base64'     => 'required|string',
            'preview_base64' => 'nullable|string',
        ]);

        $dir = storage_path("app/public/posters/{$poster->id}/output");
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        // Save PDF
        $pdfData = base64_decode($request->input('pdf_base64'));
        $pdfName = 'poster-' . $poster->poster_code . '.pdf';
        file_put_contents("{$dir}/{$pdfName}", $pdfData);
        $poster->pdf_file_path = "posters/{$poster->id}/output/{$pdfName}";

        PosterMedia::create([
            'poster_id'        => $poster->id,
            'media_type'       => 'PDF Output',
            'file_path'        => $poster->pdf_file_path,
            'original_name'    => $pdfName,
            'file_type'        => 'pdf',
            'file_size_kb'     => (int) round(strlen($pdfData) / 1024),
            'uploaded_by'      => auth()->id(),
            'uploaded_by_name' => auth()->user()?->full_name ?? auth()->user()?->email,
            'created_at'       => now(),
        ]);

        // Save preview image
        if ($preview = $request->input('preview_base64')) {
            $previewData = base64_decode($preview);
            $previewName = 'preview-' . $poster->poster_code . '.jpg';
            file_put_contents("{$dir}/{$previewName}", $previewData);
            $poster->preview_file_path = "posters/{$poster->id}/output/{$previewName}";

            PosterMedia::create([
                'poster_id'        => $poster->id,
                'media_type'       => 'Preview',
                'file_path'        => $poster->preview_file_path,
                'original_name'    => $previewName,
                'file_type'        => 'jpg',
                'file_size_kb'     => (int) round(strlen($previewData) / 1024),
                'uploaded_by'      => auth()->id(),
                'uploaded_by_name' => auth()->user()?->full_name ?? auth()->user()?->email,
                'created_at'       => now(),
            ]);
        }

        $poster->save();
        $poster->logHistory('PDF Output Generated');

        return response()->json([
            'pdf_url'     => $poster->pdf_url,
            'preview_url' => $poster->preview_url,
        ]);
    }

    /* ══════════════════════════════════════════════════
     *  STATS
     * ══════════════════════════════════════════════════ */

    public function stats(Request $request)
    {
        $year = (int) ($request->get('year') ?: now()->year);

        $kpis = DB::selectOne("
            SELECT
                COUNT(*) AS total_posters,
                SUM(status = 'Published') AS published,
                SUM(status = 'Draft') AS draft,
                SUM(status = 'Under Review') AS under_review,
                SUM(status = 'Approved') AS approved,
                SUM(status = 'Archived') AS archived,
                SUM(CASE WHEN MONTH(last_used_at) = MONTH(CURDATE()) AND YEAR(last_used_at) = YEAR(CURDATE()) THEN download_count ELSE 0 END) AS downloaded_this_month,
                SUM(CASE WHEN MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE()) THEN 1 ELSE 0 END) AS created_this_month
            FROM posters
            WHERE deleted_at IS NULL AND YEAR(created_at) = ?
        ", [$year]);

        $byCategory = DB::select("
            SELECT category, COUNT(*) AS count
            FROM posters WHERE deleted_at IS NULL AND YEAR(created_at) = ?
            GROUP BY category ORDER BY count DESC
        ", [$year]);

        $byTopic = DB::select("
            SELECT topic, COUNT(*) AS count
            FROM posters WHERE deleted_at IS NULL AND topic IS NOT NULL AND YEAR(created_at) = ?
            GROUP BY topic ORDER BY count DESC
        ", [$year]);

        $byStatus = DB::select("
            SELECT status, COUNT(*) AS count
            FROM posters WHERE deleted_at IS NULL AND YEAR(created_at) = ?
            GROUP BY status
        ", [$year]);

        $monthlyTrend = DB::select("
            SELECT
                DATE_FORMAT(created_at, '%Y-%m') AS month,
                COUNT(*) AS created,
                SUM(status = 'Published') AS published
            FROM posters
            WHERE deleted_at IS NULL AND created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
            GROUP BY month ORDER BY month
        ");

        $topDownloaded = DB::select("
            SELECT poster_code, title, category, download_count
            FROM posters WHERE deleted_at IS NULL
            ORDER BY download_count DESC LIMIT 10
        ");

        $topViewed = DB::select("
            SELECT poster_code, title, category, view_count
            FROM posters WHERE deleted_at IS NULL
            ORDER BY view_count DESC LIMIT 10
        ");

        $bySite = DB::select("
            SELECT site, COUNT(*) AS count
            FROM posters WHERE deleted_at IS NULL AND site IS NOT NULL AND site != '' AND YEAR(created_at) = ?
            GROUP BY site ORDER BY count DESC
        ", [$year]);

        return response()->json([
            'kpis' => [
                'total_posters'      => (int) ($kpis->total_posters ?? 0),
                'published'          => (int) ($kpis->published ?? 0),
                'draft'              => (int) ($kpis->draft ?? 0),
                'under_review'       => (int) ($kpis->under_review ?? 0),
                'approved'           => (int) ($kpis->approved ?? 0),
                'archived'           => (int) ($kpis->archived ?? 0),
                'downloaded_this_month' => (int) ($kpis->downloaded_this_month ?? 0),
                'created_this_month' => (int) ($kpis->created_this_month ?? 0),
            ],
            'by_category'    => array_map(fn ($r) => ['category' => $r->category, 'count' => (int) $r->count], $byCategory),
            'by_topic'       => array_map(fn ($r) => ['topic' => $r->topic, 'count' => (int) $r->count], $byTopic),
            'by_status'      => array_map(fn ($r) => ['status' => $r->status, 'count' => (int) $r->count], $byStatus),
            'monthly_trend'  => array_map(fn ($r) => ['month' => $r->month, 'created' => (int) $r->created, 'published' => (int) $r->published], $monthlyTrend),
            'top_downloaded' => array_map(fn ($r) => ['poster_code' => $r->poster_code, 'title' => $r->title, 'category' => $r->category, 'download_count' => (int) $r->download_count], $topDownloaded),
            'top_viewed'     => array_map(fn ($r) => ['poster_code' => $r->poster_code, 'title' => $r->title, 'category' => $r->category, 'view_count' => (int) $r->view_count], $topViewed),
            'by_site'        => array_map(fn ($r) => ['site' => $r->site, 'count' => (int) $r->count], $bySite),
        ]);
    }

    /* ══════════════════════════════════════════════════
     *  EXPORT — CSV/XLSX/PDF/DOCX
     * ══════════════════════════════════════════════════ */

    public function export(Request $request)
    {
        $query = Poster::query();

        if ($cat = $request->get('category'))    $query->where('category', $cat);
        if ($type = $request->get('poster_type')) $query->where('poster_type', $type);
        if ($st = $request->get('status'))        $query->where('status', $st);
        if ($df = $request->get('date_from'))     $query->whereDate('created_at', '>=', $df);
        if ($dt = $request->get('date_to'))       $query->whereDate('created_at', '<=', $dt);

        $records = $query->with('createdBy:id,full_name')->orderByDesc('created_at')->get();

        $headers = [
            'Code', 'Title', 'Category', 'Type', 'Topic', 'Status',
            'Priority', 'Theme', 'Orientation', 'Print Size',
            'Site', 'Area', 'Department', 'Target Audience',
            'Headline', 'Version',
            'Created By', 'Created At', 'Published At',
            'Views', 'Downloads', 'Prints',
        ];

        $rows = $records->map(fn ($p) => [
            $p->poster_code,
            $p->title,
            $p->category,
            $p->poster_type,
            $p->topic,
            $p->status,
            $p->priority,
            $p->theme_key,
            $p->orientation,
            $p->print_size,
            $p->site,
            $p->area,
            $p->department,
            $p->target_audience,
            $p->headline,
            $p->version,
            $p->createdBy?->full_name,
            $p->created_at?->format('Y-m-d'),
            $p->published_at?->format('Y-m-d'),
            $p->view_count,
            $p->download_count,
            $p->print_count,
        ])->toArray();

        $format = $request->get('format', 'csv');
        return $this->exportAs($headers, $rows, 'Posters', $format);
    }
}
