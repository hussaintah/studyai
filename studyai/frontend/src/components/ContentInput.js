import { useState, useRef } from 'react';
import { API_URL } from '../lib/supabase';

export default function ContentInput({ value, onChange, placeholder, label = 'Study Content' }) {
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState([]);
  const [dragover, setDragover] = useState(false);
  const fileRef = useRef();

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList).filter(f => f.type === 'application/pdf' || f.type === 'text/plain');
    if (files.length === 0) {
      setResults([{ filename: '', success: false, error: 'Only PDF and TXT files are supported' }]);
      return;
    }
    setUploading(true);
    setResults([]);
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    try {
      const res = await fetch(`${API_URL}/api/upload/extract`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.text) {
        onChange(value ? value + '\n\n' + data.text : data.text);
        setResults(data.results || [{ filename: 'Files', success: true, wordCount: data.wordCount }]);
      } else {
        setResults([{ filename: '', success: false, error: data.error || 'Extraction failed' }]);
      }
    } catch {
      setResults([{ filename: '', success: false, error: 'Upload failed — check your connection' }]);
    }
    setUploading(false);
  };

  const onDrop = (e) => {
    e.preventDefault(); setDragover(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
        <button className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? '⏳ Uploading...' : '📄 Upload Files'}
        </button>
        {/* multiple + no size limit on frontend — backend enforces 100MB */}
        <input ref={fileRef} type="file" accept=".pdf,.txt" multiple style={{ display: 'none' }}
          onChange={e => handleFiles(e.target.files)} />
      </div>

      {!value && (
        <div className={`upload-zone ${dragover ? 'dragover' : ''}`} style={{ marginBottom: 10 }}
          onDragOver={e => { e.preventDefault(); setDragover(true); }}
          onDragLeave={() => setDragover(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
        >
          <div style={{ fontSize: 30, marginBottom: 8 }}>📂</div>
          <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 3 }}>Drop files here or click to browse</p>
          <p style={{ fontSize: 12, color: 'var(--text3)' }}>Multiple PDF / TXT files · Up to 100MB each · Content is merged automatically</p>
        </div>
      )}

      <textarea
        className="content-area"
        style={{ minHeight: value ? 200 : 100 }}
        placeholder={placeholder || 'Or paste your study content directly here...'}
        value={value}
        onChange={e => onChange(e.target.value)}
        onDragOver={e => { e.preventDefault(); setDragover(true); }}
        onDragLeave={() => setDragover(false)}
        onDrop={onDrop}
      />

      {results.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {results.map((r, i) => (
            <p key={i} style={{ fontSize: 12, color: r.success ? 'var(--emerald)' : 'var(--rose)' }}>
              {r.success
                ? `✓ ${r.filename} — ${r.wordCount?.toLocaleString()} words extracted`
                : `✗ ${r.filename ? r.filename + ': ' : ''}${r.error}`}
            </p>
          ))}
        </div>
      )}

      {value && (
        <div className="flex items-center justify-between mt-6">
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>
            {value.split(/\s+/).filter(Boolean).length.toLocaleString()} words loaded
          </span>
          <div className="flex gap-8">
            <button className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              + Add More Files
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => { onChange(''); setResults([]); }}>Clear</button>
          </div>
        </div>
      )}
    </div>
  );
}
