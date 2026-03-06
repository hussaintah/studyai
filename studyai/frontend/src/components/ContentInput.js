import { useState, useRef } from 'react';
import { API_URL } from '../lib/supabase';

export default function ContentInput({ value, onChange, placeholder, label = 'Study Content' }) {
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState([]);
  const [dragover, setDragover] = useState(false);
  const fileRef = useRef();

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList).filter(f => f.type === 'application/pdf' || f.type === 'text/plain');
    if (files.length === 0) { setResults([{ filename: '', success: false, error: 'Only PDF and TXT files are supported' }]); return; }
    setUploading(true); setResults([]);
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    try {
      const res = await fetch(`${API_URL}/api/upload/extract`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.text) {
        onChange(value ? value + '\n\n' + data.text : data.text);
        setResults(data.results || [{ filename: 'Files', success: true, wordCount: data.wordCount }]);
      } else { setResults([{ filename: '', success: false, error: data.error || 'Extraction failed' }]); }
    } catch { setResults([{ filename: '', success: false, error: 'Upload failed — check your connection' }]); }
    setUploading(false);
  };

  const onDrop = (e) => { e.preventDefault(); setDragover(false); if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files); };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <span className="sec-label" style={{ marginBottom: 0 }}>{label}</span>
        <button className="btn-secondary btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? 'Uploading...' : 'Upload Files'}
        </button>
        <input ref={fileRef} type="file" accept=".pdf,.txt" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
      </div>

      {!value && (
        <div
          className={`upload-zone${dragover ? ' dragover' : ''}`} style={{ marginBottom: 10 }}
          onDragOver={e => { e.preventDefault(); setDragover(true); }}
          onDragLeave={() => setDragover(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
        >
          <div className="upload-icon">
            <svg viewBox="0 0 20 20"><path d="M10 3v10M6 7l4-4 4 4"/><path d="M3 14v2a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2"/></svg>
          </div>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-2)', marginBottom: 4 }}>Drop files here or click to browse</p>
          <p style={{ fontSize: '0.76rem', color: 'var(--text-3)' }}>Multiple PDF / TXT files · Up to 100MB each · Content is merged automatically</p>
        </div>
      )}

      <textarea
        className="content-area"
        style={{ minHeight: value ? 180 : 90 }}
        placeholder={placeholder || 'Or paste your study content directly here...'}
        value={value}
        onChange={e => onChange(e.target.value)}
        onDragOver={e => { e.preventDefault(); setDragover(true); }}
        onDragLeave={() => setDragover(false)}
        onDrop={onDrop}
      />

      {results.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {results.map((r, i) => (
            <p key={i} style={{ fontSize: '0.78rem', color: r.success ? 'var(--lime)' : '#f43f5e', fontFamily: 'DM Mono, monospace' }}>
              {r.success ? `${r.filename} — ${r.wordCount?.toLocaleString()} words extracted` : `Error: ${r.error}`}
            </p>
          ))}
        </div>
      )}

      {value && (
        <div className="flex items-center justify-between mt-6">
          <span style={{ fontSize: '0.72rem', color: 'var(--text-4)', fontFamily: 'DM Mono, monospace' }}>
            {value.split(/\s+/).filter(Boolean).length.toLocaleString()} words loaded
          </span>
          <div className="flex gap-8">
            <button className="btn-secondary btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>+ Add More Files</button>
            <button className="btn-secondary btn-sm" onClick={() => { onChange(''); setResults([]); }}>Clear</button>
          </div>
        </div>
      )}
    </div>
  );
}
