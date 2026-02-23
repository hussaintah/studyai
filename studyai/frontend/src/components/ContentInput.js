import { useState, useRef } from 'react';
import { API_URL } from '../lib/supabase';

export default function ContentInput({ value, onChange, placeholder, label = 'Study Content' }) {
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [dragover, setDragover] = useState(false);
  const fileRef = useRef();

  const handleFile = async (file) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && file.type !== 'text/plain') {
      setUploadMsg('Only PDF and TXT files supported');
      return;
    }
    setUploading(true);
    setUploadMsg('');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_URL}/api/upload/extract`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.text) {
        onChange(data.text);
        setUploadMsg(`✓ Extracted ${data.wordCount.toLocaleString()} words from "${data.filename}"`);
      } else {
        setUploadMsg(data.error || 'Extraction failed');
      }
    } catch {
      setUploadMsg('Upload failed — check your connection');
    }
    setUploading(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragover(false);
    handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
        <button className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? '⏳ Extracting...' : '📄 Upload PDF / TXT'}
        </button>
        <input ref={fileRef} type="file" accept=".pdf,.txt" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
      </div>

      <div
        className={`upload-zone ${dragover ? 'dragover' : ''}`}
        style={{ padding: value ? '0' : '24px', border: value ? 'none' : undefined }}
        onDragOver={(e) => { e.preventDefault(); setDragover(true); }}
        onDragLeave={() => setDragover(false)}
        onDrop={onDrop}
        onClick={() => !value && fileRef.current?.click()}
      >
        {!value ? (
          <>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
            <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 4 }}>Drop a PDF or TXT file here</p>
            <p style={{ fontSize: 12, color: 'var(--text3)' }}>or click to browse — or paste text below</p>
          </>
        ) : (
          <textarea
            className="content-area"
            style={{ minHeight: 200, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}
            placeholder={placeholder || 'Paste your lecture notes, textbook content, or study material...'}
            value={value}
            onChange={e => onChange(e.target.value)}
            onClick={e => e.stopPropagation()}
          />
        )}
      </div>

      {!value && (
        <textarea
          className="content-area"
          style={{ marginTop: 10, minHeight: 120 }}
          placeholder={placeholder || 'Or paste your study content directly here...'}
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      )}

      {uploadMsg && (
        <p style={{ marginTop: 6, fontSize: 12, color: uploadMsg.startsWith('✓') ? 'var(--emerald)' : 'var(--rose)' }}>
          {uploadMsg}
        </p>
      )}
      {value && (
        <div className="flex items-center justify-between mt-8">
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>{value.split(/\s+/).length.toLocaleString()} words loaded</span>
          <button className="btn btn-secondary btn-sm" onClick={() => { onChange(''); setUploadMsg(''); }}>Clear</button>
        </div>
      )}
    </div>
  );
}
