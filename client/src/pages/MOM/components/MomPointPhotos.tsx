import { useState, useRef } from 'react';
import { Camera, X as XIcon, Trash2, Loader2, Image, Download, ZoomIn } from 'lucide-react';
import type { PointPhoto } from '../hooks/useMom';

interface Props {
  photos: PointPhoto[];
  momId: string;
  pointId: number;
  onUpload: (momId: string, pointId: number, files: File[], caption?: string) => Promise<{ photos: PointPhoto[] }>;
  onDelete: (momId: string, pointId: number, photoId: number) => Promise<void>;
  compact?: boolean;
}

export function MomPointPhotos({ photos, momId, pointId, onUpload, onDelete, compact = false }: Props) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [viewPhoto, setViewPhoto] = useState<PointPhoto | null>(null);
  const [localPhotos, setLocalPhotos] = useState<PointPhoto[]>(photos);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setUploading(true);
    try {
      const result = await onUpload(momId, pointId, Array.from(files));
      if (result?.photos) {
        setLocalPhotos(prev => [...result.photos, ...prev]);
      }
    } catch (err) {
      console.error('Photo upload failed:', err);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDelete = async (photoId: number) => {
    setDeleting(photoId);
    try {
      await onDelete(momId, pointId, photoId);
      setLocalPhotos(prev => prev.filter(p => p.id !== photoId));
    } catch (err) {
      console.error('Photo delete failed:', err);
    } finally {
      setDeleting(null);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  if (compact) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {localPhotos.map(photo => (
          <div key={photo.id}
            onClick={() => setViewPhoto(photo)}
            style={{
              width: 36, height: 36, borderRadius: 'var(--radius-sm)', overflow: 'hidden', cursor: 'pointer',
              border: '1px solid var(--color-border)', position: 'relative',
            }}>
            <img src={photo.url} alt={photo.original_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ))}
        <label style={{
          width: 36, height: 36, borderRadius: 'var(--radius-sm)', cursor: 'pointer',
          border: '1px dashed var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--color-text-tertiary)', fontSize: 11,
        }}>
          <input ref={fileRef} type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt" multiple onChange={handleFileChange} style={{ display: 'none' }} />
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
        </label>

        {/* Lightbox */}
        {viewPhoto && (
          <div onClick={() => setViewPhoto(null)} style={{
            position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <img src={viewPhoto.url} alt={viewPhoto.original_name}
              style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8, objectFit: 'contain' }}
              onClick={e => e.stopPropagation()} />
            <button onClick={() => setViewPhoto(null)} style={{
              position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.2)',
              border: 'none', borderRadius: '50%', width: 36, height: 36, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}>
              <XIcon size={20} />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Photos {localPhotos.length > 0 && `(${localPhotos.length})`}
        </span>
        <label style={{
          display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600,
          color: 'var(--color-primary-600)', cursor: 'pointer', padding: '4px 8px',
          borderRadius: 'var(--radius-sm)', background: 'var(--color-primary-50)',
        }}>
          <input ref={fileRef} type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt" multiple onChange={handleFileChange} style={{ display: 'none' }} />
          {uploading ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
          Add File
        </label>
      </div>

      {localPhotos.length === 0 && !uploading && (
        <div style={{
          padding: '16px', textAlign: 'center', color: 'var(--color-text-tertiary)',
          border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 12,
        }}>
          <Image size={20} style={{ margin: '0 auto 6px', opacity: 0.5 }} />
          No photos attached yet
        </div>
      )}

      {localPhotos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
          {localPhotos.map(photo => (
            <div key={photo.id} style={{
              borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-border)',
              position: 'relative', aspectRatio: '1',
            }}>
              <img src={photo.url} alt={photo.original_name}
                onClick={() => setViewPhoto(photo)}
                style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} />
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, padding: '4px 6px',
                background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: 9, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {photo.original_name}
                </span>
                <button onClick={() => handleDelete(photo.id)}
                  disabled={deleting === photo.id}
                  style={{
                    background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 4,
                    color: '#fff', cursor: 'pointer', padding: 2, flexShrink: 0,
                  }}>
                  {deleting === photo.id ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {viewPhoto && (
        <div onClick={() => setViewPhoto(null)} style={{
          position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <img src={viewPhoto.url} alt={viewPhoto.original_name}
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8, objectFit: 'contain' }}
            onClick={e => e.stopPropagation()} />
          <div style={{
            position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.6)', padding: '6px 16px', borderRadius: 20, color: '#fff', fontSize: 12,
          }}>
            {viewPhoto.original_name} — {formatSize(viewPhoto.file_size)}
            {viewPhoto.uploaded_by_name && ` — by ${viewPhoto.uploaded_by_name}`}
          </div>
          <button onClick={() => setViewPhoto(null)} style={{
            position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.2)',
            border: 'none', borderRadius: '50%', width: 36, height: 36, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <XIcon size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
