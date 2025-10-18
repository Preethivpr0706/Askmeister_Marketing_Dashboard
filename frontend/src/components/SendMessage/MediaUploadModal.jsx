import { useState, useRef } from 'react';
import { X, UploadCloud, Image as ImageIcon, Video as VideoIcon, AlertTriangle, FileText } from 'lucide-react';
import './MediaUploadModal.css';

function MediaUploadModal({ isOpen, onClose, onUpload, fileType, progress }) {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);


  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    
    if (!selectedFile) return;
    
    // Validate file type according to WhatsApp Business API supported formats
    const supportedTypes = {
      image: ['image/jpeg', 'image/jpg', 'image/png'],
      video: ['video/mp4', 'video/3gpp', 'video/avi', 'video/mov'],
      document: ['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    };
    
    if (!supportedTypes[fileType].includes(selectedFile.type)) {
      const typeNames = {
        image: 'JPEG, PNG',
        video: 'MP4, 3GPP, AVI, MOV',
        document: 'PDF, Excel, Word, TXT'
      };
      setError(`Please select a supported ${fileType} file (${typeNames[fileType]})`);
      return;
    }
    
    // Validate file size according to WhatsApp Business API limits
    const maxSizes = {
      image: 5 * 1024 * 1024, // 5MB for images
      video: 16 * 1024 * 1024, // 16MB for videos
      document: 100 * 1024 * 1024 // 100MB for documents
    };
    
    if (selectedFile.size > maxSizes[fileType]) {
      setError(`File size must be less than ${maxSizes[fileType] / (1024 * 1024)}MB (WhatsApp limit)`);
      return;
    }
    
    setError('');
    setFile(selectedFile);
  };

  const handleUpload = () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }
    
    onUpload(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange({ target: { files: e.dataTransfer.files } });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="media-upload-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-content">
            <div className="header-icon">
              {fileType === 'image' ? <ImageIcon size={24} /> : 
               fileType === 'video' ? <VideoIcon size={24} /> : 
               <FileText size={24} />}
            </div>
            <div className="header-text">
              <h3>Upload {fileType === 'image' ? 'Image' : fileType === 'video' ? 'Video' : 'Document'}</h3>
              <p>Add media to your template header</p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className="modal-body">
          <div 
            className={`upload-area ${file ? 'has-file' : ''} ${error ? 'error' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept={
                fileType === 'image' ? 'image/jpeg,image/jpg,image/png' : 
                fileType === 'video' ? 'video/mp4,video/3gpp,video/avi,video/mov' : 
                'application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
              }
              style={{ display: 'none' }}
            />
            
            {file ? (
              <div className="file-preview">
                <div className="file-icon">
                  {fileType === 'image' ? <ImageIcon size={32} /> : 
                   fileType === 'video' ? <VideoIcon size={32} /> : 
                   <FileText size={32} />}
                </div>
                <div className="file-details">
                  <div className="file-name">{file.name}</div>
                  <div className="file-size">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </div>
                </div>
                <button 
                  className="remove-file-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setError('');
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="upload-prompt">
                <div className="upload-icon">
                  <UploadCloud size={48} />
                </div>
                <div className="upload-text">
                  <h4>Drop your {fileType} here</h4>
                  <p>or click to browse files</p>
                </div>
                <div className="upload-requirements">
                  <div className="requirement-item">
                    <span className="requirement-label">Max size:</span>
                    <span className="requirement-value">
                      {fileType === 'image' ? '5MB' : fileType === 'video' ? '16MB' : '100MB'}
                    </span>
                  </div>
                  <div className="requirement-item">
                    <span className="requirement-label">Formats:</span>
                    <span className="requirement-value">
                      {fileType === 'image' ? 'JPEG, PNG' : 
                       fileType === 'video' ? 'MP4, 3GPP, AVI, MOV' : 
                       'PDF, Excel, Word, TXT'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {progress > 0 && progress < 100 && (
            <div className="upload-progress">
              <div className="progress-header">
                <span>Uploading...</span>
                <span>{progress}%</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}
          
          {error && (
            <div className="error-message">
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}
        </div>
        
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          {!file && (
            <button 
              className="btn btn-outline" 
              onClick={() => fileInputRef.current.click()}
            >
              <UploadCloud size={16} />
              Select File
            </button>
          )}
          {file && (
            <button 
              className="btn btn-primary" 
              onClick={handleUpload}
              disabled={progress > 0}
            >
              {progress > 0 ? (
                <>
                  <div className="spinner"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <UploadCloud size={16} />
                  Upload
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default MediaUploadModal;