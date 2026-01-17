import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Camera, Video, ExternalLink, Phone, Copy, Plus, X, RefreshCw, File, FileText, Workflow } from 'lucide-react';
import { toast } from 'react-toastify';
import { templateService } from '../../api/templateService';
import { businessService } from '../../api/businessService';
import FlowSelector from '../Templates/FlowSelector';
import './CreateTemplate.css';

function CreateTemplate() {
  const { id } = useParams(); // For editing existing templates
  const { state } = useLocation(); // For draft templates
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('header');
  const [headerType, setHeaderType] = useState('none');
  const [formData, setFormData] = useState({
    name: '',
    category: 'marketing',
    language: 'en_US',
    headerText: '',
    headerType: 'none',
    bodyText: '',
    footerText: '',
    buttons: [],
    variableSamples: {},
    flowId: null,
  });
  const [headerFile, setHeaderFile] = useState(null);
  const [headerFilePreview, setHeaderFilePreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [nameValidationStatus, setNameValidationStatus] = useState(null); // 'checking', 'valid', 'invalid'
  const [nameValidationMessage, setNameValidationMessage] = useState('');
  const [showFlowSelector, setShowFlowSelector] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState(null);
  const [phoneButtonError, setPhoneButtonError] = useState('');
  const fileInputRef = useRef(null);
  const nameValidationTimeoutRef = useRef(null);
  const errorRef = useRef(null);

  // Debounced name validation
  const validateTemplateName = async (name) => {
    if (!name || name.length < 2) {
      setNameValidationStatus(null);
      setNameValidationMessage('');
      return;
    }

    if (!/^[a-z0-9_]+$/.test(name)) {
      setNameValidationStatus('invalid');
      setNameValidationMessage('Template name must contain only lowercase letters, numbers, and underscores');
      return;
    }

    setNameValidationStatus('checking');
    setNameValidationMessage('Checking availability...');

    try {
      const response = await templateService.checkTemplateNameAvailability(name);
      setNameValidationStatus('valid');
      setNameValidationMessage('Template name is available');
    } catch (error) {
      setNameValidationStatus('invalid');
      setNameValidationMessage(error.message);
    }
  };

  // Extract variables from text
  const extractVariables = (text) => {
    const matches = text.match(/{{(\w+)}}/g) || [];
    const uniqueVariables = [...new Set(matches.map(match => 
      match.replace(/[{}]/g, ''))
    )];
    
    return uniqueVariables.sort((a, b) => {
      const aIsNumber = !isNaN(a);
      const bIsNumber = !isNaN(b);
      if (aIsNumber && bIsNumber) return Number(a) - Number(b);
      if (aIsNumber) return -1;
      if (bIsNumber) return 1;
      return a.localeCompare(b);
    });
  };

  // Load template data
  useEffect(() => {
  const loadTemplateData = async () => {
    try {
      setIsLoading(true);
      
      if (id) {
        // Editing existing template
        const response = await templateService.getTemplateById(id);
        const template = response.data.template;
        loadTemplateIntoForm(template);
      } else if (state?.draftTemplate) {
        // Continuing draft template
        loadTemplateIntoForm(state.draftTemplate);
      }
      
      setError(null);
    } catch (err) {
      setError('Failed to load template: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTemplateIntoForm = (template) => {
    const variables = extractVariables(template.body_text);
    const variableSamples = {};
    
    variables.forEach(varName => {
      variableSamples[varName] = template.variables?.[varName] || '';
    });
    
    setFormData({
      name: template.name,
      category: template.category,
      language: template.language,
      headerType: template.header_type,
      headerText: template.header_type === 'text' ? template.header_content : '',
      headerContent: template.header_content,
      bodyText: template.body_text,
      footerText: template.footer_text || '',
      buttons: template.buttons || [],
      variableSamples,
      flowId: template.flow_id || null,
    });
    
    setHeaderType(template.header_type);
    
    // Set file preview if it's a media header
    // Set file preview if it's a media header
  if (template.header_type === 'document' && template.header_content) {
    // Create a dummy file object for the preview
    setHeaderFilePreview({ 
      name: 'Uploaded Document', 
      type: 'application/pdf' 
    });
  }

  };

  loadTemplateData();
}, [id, state?.draftTemplate]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (nameValidationTimeoutRef.current) {
        clearTimeout(nameValidationTimeoutRef.current);
      }
    };
  }, []);

  // Check if all required fields are filled
  const isFormValid = () => {
    // Check template name
    if (!formData.name || !/^[a-z0-9_]+$/.test(formData.name) || nameValidationStatus === 'invalid' || nameValidationStatus === 'checking') {
      return false;
    }

    // Check body text
    if (!formData.bodyText || formData.bodyText.trim() === '') {
      return false;
    }

    // Check placeholder samples
    const variables = extractVariables(formData.bodyText);
    const missingSamples = variables.filter(varName => 
      !formData.variableSamples[varName] || formData.variableSamples[varName].trim() === ''
    );
    if (missingSamples.length > 0) {
      return false;
    }

    // Check button fields
    for (const button of formData.buttons) {
      if (!button.text || button.text.trim() === '') {
        return false;
      }
      if ((button.type === 'url' || button.type === 'phone_number') && (!button.value || button.value.trim() === '')) {
        return false;
      }
    }

    return true;
  };

  // File handling functions
  const handleFileSelect = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  const isDocument = file.type === 'application/pdf';
  const maxSize = 
    headerType === 'video' ? 16 * 1024 * 1024 : 
    headerType === 'document' ? 100 * 1024 * 1024 : 
    5 * 1024 * 1024;

  if (headerType === 'image' && !isImage) {
    setError('Please select an image file (JPEG, PNG)');
    return;
  }

  if (headerType === 'video' && !isVideo) {
    setError('Please select a video file (MP4)');
    return;
  }

  if (headerType === 'document' && !isDocument) {
    setError('Please select a PDF document');
    return;
  }

  if (file.size > maxSize) {
    setError(`File size exceeds the limit (${maxSize / (1024 * 1024)}MB)`);
    return;
  }

  setHeaderFile(file);
  if (headerType === 'document') {
    setHeaderFilePreview(file); // Store the file object directly for documents
  } else {
    const reader = new FileReader();
    reader.onloadend = () => setHeaderFilePreview(reader.result);
    reader.readAsDataURL(file);
  }
};

const uploadFile = async (file) => {
  if (!file) return null;
  
  try {
    setIsUploading(true);
    setUploadProgress(0);
    
    const sessionResponse = await templateService.createUploadSession({
      fileType: file.type,
      fileName: file.name,
      fileSize: file.size
    });
    
    if (!sessionResponse?.data?.data?.id) {
      throw new Error('Failed to create upload session');
    }

    const sessionId = sessionResponse.data.data.id;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileSize', file.size.toString());

    // For documents, add filename if not PDF
    if (headerType === 'document' && !file.name.endsWith('.pdf')) {
      formData.append('filename', `${file.name}.pdf`);
    }

    const uploadResponse = await templateService.uploadFileToSession(
      sessionId, 
      formData,
      (progressEvent) => {
        if (progressEvent.lengthComputable) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        }
      }
    );
    
    const mediaHandle = uploadResponse?.data?.data?.h;
    if (!mediaHandle) {
      throw new Error('Upload completed but no media handle received');
    }

    return mediaHandle;
  } catch (error) {
    console.error('Upload error:', error);
    setError(`File upload failed: ${error.response?.data?.message || error.message}`);
    return null;
  } finally {
    setIsUploading(false);
  }
};

  // Form handling functions
  const handleHeaderTypeChange = (type) => {
    setHeaderType(type);
    setFormData(prev => ({
      ...prev,
      headerType: type,
      headerContent: type === 'text' ? prev.headerText : '',
      headerText: type === 'none' ? '' : prev.headerText
    }));
    // Clear header file when switching to none or other types
    if (type === 'none' || type !== headerType) {
      setHeaderFile(null);
      setHeaderFilePreview(null);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'name') {
      // Validate template name: only lowercase letters and underscores
      const validatedValue = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
      setFormData(prev => ({
        ...prev,
        [name]: validatedValue,
      }));

      // Clear previous timeout
      if (nameValidationTimeoutRef.current) {
        clearTimeout(nameValidationTimeoutRef.current);
      }

      // Set new timeout for debounced validation
      nameValidationTimeoutRef.current = setTimeout(() => {
        validateTemplateName(validatedValue);
      }, 500);
    } else if (name === 'bodyText') {
      const variables = extractVariables(value);
      const newSamples = { ...formData.variableSamples };
      
      Object.keys(newSamples).forEach(key => {
        if (!variables.includes(key)) delete newSamples[key];
      });
      
      variables.forEach(varName => {
        if (!newSamples[varName]) newSamples[varName] = '';
      });
      
      setFormData(prev => ({
        ...prev,
        [name]: value,
        variableSamples: newSamples,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // Button validation function
  const validateButtons = (buttons) => {
    // Check maximum buttons limit
    if (buttons.length > 3) {
      return 'Maximum 3 buttons are allowed per template';
    }

    // Count button types
    const phoneButtons = buttons.filter(btn => btn.type === 'phone_number');
    const urlButtons = buttons.filter(btn => btn.type === 'url');
    const flowButtons = buttons.filter(btn => btn.type === 'flow');

    // Check phone button limit
    if (phoneButtons.length > 1) {
      return 'Only one phone number button is allowed per template';
    }

    // Check URL button limit (maximum 2 URL buttons)
    if (urlButtons.length > 2) {
      return 'Maximum 2 URL buttons are allowed per template';
    }

    // Check for duplicate button text
    const buttonTexts = buttons.map(btn => btn.text?.trim().toLowerCase()).filter(text => text);
    const duplicateTexts = buttonTexts.filter((text, index) => buttonTexts.indexOf(text) !== index);
    if (duplicateTexts.length > 0) {
      const uniqueDuplicates = [...new Set(duplicateTexts)];
      return `Button text must be unique. The following text is used multiple times: "${uniqueDuplicates[0]}"`;
    }

    // Validate each button
    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i];

      // Check button text
      if (!button.text || button.text.trim() === '') {
        return `Button ${i + 1}: Button text is required`;
      }

      // Check button text length
      if (button.text.length > 25) {
        return `Button ${i + 1}: Button text cannot exceed 25 characters (current: ${button.text.length})`;
      }

      // Check URL button
      if (button.type === 'url') {
        if (!button.value || button.value.trim() === '') {
          return `Button ${i + 1}: URL is required for URL buttons`;
        }
        // Basic URL validation
        try {
          new URL(button.value);
        } catch (e) {
          return `Button ${i + 1}: Please enter a valid URL`;
        }
      }

      // Check phone button
      if (button.type === 'phone_number') {
        if (!button.value || button.value.trim() === '') {
          return `Button ${i + 1}: Phone number is required for phone buttons`;
        }
        // Basic phone validation (E.164 format)
        if (!/^\+[1-9]\d{1,14}$/.test(button.value.trim())) {
          return `Button ${i + 1}: Phone number must include country code (e.g., +1234567890 for US, +919876543210 for India)`;
        }
      }

      // Check flow button
      if (button.type === 'flow') {
        if (!button.whatsapp_flow_id || button.whatsapp_flow_id.trim() === '') {
          return `Button ${i + 1}: WhatsApp Flow ID is required for flow buttons`;
        }
      }

      // Check quick reply button (no additional validation needed beyond text)
    }

    return null; // No errors
  };

  // Button handling
  const addButton = (type) => {
    // Check if we're trying to add a phone number button and one already exists
    if (type === 'phone_number' && formData.buttons.some(btn => btn.type === 'phone_number')) {
      setPhoneButtonError('Only one phone number button is allowed per template');
      return;
    }

    // Check URL button limit (maximum 2 URL buttons)
    if (type === 'url' && formData.buttons.filter(btn => btn.type === 'url').length >= 2) {
      setPhoneButtonError('Maximum 2 URL buttons are allowed per template');
      return;
    }

    // Check maximum buttons limit
    if (formData.buttons.length >= 3) {
      setPhoneButtonError('Maximum 3 buttons are allowed per template');
      return;
    }

    const defaultValues = {
      phone_number: { text: 'To contact us', value: '' },
      url: { text: 'Click here', value: 'https://example.com' },
      quick_reply: { text: 'Quick reply', value: 'Quick reply' }, // Same value for quick reply
      flow: { text: 'View Flow', flow_id: '', icon: 'default' }
    };
    
    setFormData(prev => ({
      ...prev,
      buttons: [...prev.buttons, { 
        type,
        text: defaultValues[type].text,
        value: defaultValues[type].value,
        flow_id: defaultValues[type].flow_id,
        flow_name: defaultValues[type].flow_name,
        icon: defaultValues[type].icon
      }]
    }));
    
    // Clear any previous phone button error when adding a new button
    if (phoneButtonError) {
      setPhoneButtonError('');
    }
  };

  const removeButton = (index) => {
    const updatedButtons = [...formData.buttons];
    updatedButtons.splice(index, 1);
    setFormData(prev => ({
      ...prev,
      buttons: updatedButtons
    }));
  };

  const handleButtonChange = (index, field, value) => {
    const updatedButtons = [...formData.buttons];
    updatedButtons[index] = {
      ...updatedButtons[index],
      [field]: value
    };

    // For quick reply buttons, keep text and value in sync
    if (updatedButtons[index].type === 'quick_reply' && field === 'text') {
      updatedButtons[index].value = value;
    }

    // Enforce 25 character limit on button text
    if (field === 'text' && value.length > 25) {
      setPhoneButtonError(`Button text cannot exceed 25 characters (current: ${value.length})`);
      return;
    }

    // Check for duplicate button text
    if (field === 'text') {
      const buttonTexts = updatedButtons.map(btn => btn.text?.trim().toLowerCase()).filter(text => text);
      const duplicateTexts = buttonTexts.filter((text, idx) => buttonTexts.indexOf(text) !== idx);
      if (duplicateTexts.length > 0) {
        const uniqueDuplicates = [...new Set(duplicateTexts)];
        setPhoneButtonError(`Button text must be unique. "${uniqueDuplicates[0]}" is used multiple times.`);
      } else if (phoneButtonError && (phoneButtonError.includes('25 characters') || phoneButtonError.includes('unique'))) {
        setPhoneButtonError('');
      }
    }

    setFormData(prev => ({
      ...prev,
      buttons: updatedButtons
    }));
  };

  // Form submission
  const handleSaveAsDraft = async () => {
  try {
    setIsLoading(true);
    setError(null);
    
    // Validate template name
    if (!formData.name || !/^[a-z0-9_]+$/.test(formData.name)) {
      setError('Template name must contain only lowercase letters, numbers, and underscores');
      setIsLoading(false);
      return;
    }

    // Check if name validation is still in progress or invalid
    if (nameValidationStatus === 'checking') {
      setError('Please wait for template name validation to complete');
      setIsLoading(false);
      return;
    }

    if (nameValidationStatus === 'invalid') {
      setError(nameValidationMessage || 'Template name is not valid');
      setIsLoading(false);
      return;
    }

    // Validate required fields
    if (!formData.bodyText || formData.bodyText.trim() === '') {
      setError('Body text is required');
      setIsLoading(false);
      return;
    }

    // Validate placeholder sample values
    const variables = extractVariables(formData.bodyText);
    const missingSamples = variables.filter(varName => 
      !formData.variableSamples[varName] || formData.variableSamples[varName].trim() === ''
    );
    
    if (missingSamples.length > 0) {
      setError(`Please provide sample values for all placeholders: ${missingSamples.join(', ')}`);
      setIsLoading(false);
      return;
    }

    // Validate buttons
    const buttonValidationError = validateButtons(formData.buttons);
    if (buttonValidationError) {
      setError(buttonValidationError);
      setIsLoading(false);
      return;
    }
    
    const templateData = {
      name: formData.name,
      category: formData.category,
      language: formData.language,
      headerType: formData.headerType === 'none' ? null : formData.headerType,
      headerText: headerType === 'text' ? formData.headerText : '',
      headerContent: headerType === 'text' ? formData.headerText : (headerType === 'none' ? '' : formData.headerContent),
      bodyText: formData.bodyText,
      footerText: formData.footerText,
      buttons: formData.buttons,
      variableSamples: formData.variableSamples,
      flowId: formData.flowId
    };
    
    // Upload file if needed (for image, video, or document)
    if (headerType !== 'none' && headerType !== 'text' && (headerType === 'image' || headerType === 'video' || headerType === 'document') && 
        headerFile && !templateData.headerContent) {
      const mediaHandle = await uploadFile(headerFile);
      if (mediaHandle) {
        templateData.headerContent = mediaHandle;
      }
    }

    let response;
    if (id || state?.draftTemplate?.id) {
      // Update existing draft
      templateData.id = id || state.draftTemplate.id;
      response = await templateService.updateDraftTemplate(templateData.id, templateData);
    } else {
      // Create new draft
      response = await templateService.saveAsDraft(templateData);
    }
    
    navigate('/templates', {
      state: { successMessage: 'Template saved as draft successfully!' }
    });
  } catch (err) {
    setError('Error saving draft: ' + err.message);
  } finally {
    setIsLoading(false);
  }
};

 const handleSubmitToWhatsApp = async () => {
  try {
    setIsLoading(true);
    setError(null);
    
    // Validate template name
    if (!formData.name || !/^[a-z0-9_]+$/.test(formData.name)) {
      setError('Template name must contain only lowercase letters, numbers, and underscores');
      setIsLoading(false);
      return;
    }

    // Check if name validation is still in progress or invalid
    if (nameValidationStatus === 'checking') {
      setError('Please wait for template name validation to complete');
      setIsLoading(false);
      return;
    }

    if (nameValidationStatus === 'invalid') {
      setError(nameValidationMessage || 'Template name is not valid');
      setIsLoading(false);
      return;
    }

    // Validate required fields
    if (!formData.bodyText || formData.bodyText.trim() === '') {
      setError('Body text is required');
      setIsLoading(false);
      return;
    }

    // Validate placeholder sample values
    const variables = extractVariables(formData.bodyText);
    const missingSamples = variables.filter(varName => 
      !formData.variableSamples[varName] || formData.variableSamples[varName].trim() === ''
    );
    
    if (missingSamples.length > 0) {
      setError(`Please provide sample values for all placeholders: ${missingSamples.join(', ')}`);
      setIsLoading(false);
      return;
    }

    // Validate buttons
    const buttonValidationError = validateButtons(formData.buttons);
    if (buttonValidationError) {
      setError(buttonValidationError);
      setIsLoading(false);
      return;
    }
    
    let headerContent = formData.headerContent;
    
    // Upload file if needed (for image, video, or document)
    if (headerType !== 'none' && headerType !== 'text' && (headerType === 'image' || headerType === 'video' || headerType === 'document') && 
        headerFile && !headerContent) {
      headerContent = await uploadFile(headerFile);
      if (!headerContent) {
        setError(`Failed to upload ${headerType}. Please try again.`);
        setIsLoading(false);
        return;
      }
    }
    
    const templateData = {
      name: formData.name,
      category: formData.category,
      language: formData.language,
      headerType: formData.headerType === 'none' ? null : formData.headerType,
      headerText: headerType === 'text' ? formData.headerText : '',
      headerContent: headerType === 'text' ? formData.headerText : (headerType === 'none' ? '' : headerContent),
      bodyText: formData.bodyText,
      footerText: formData.footerText,
      buttons: formData.buttons,
      variableSamples: formData.variableSamples,
      flowId: formData.flowId
    };

    let response;
    if (id || state?.draftTemplate?.id) {
      // Submit existing template (draft or previously submitted)
      const templateId = id || state.draftTemplate.id;
      response = await templateService.submitDraftTemplate(templateId, templateData);
    } else {
      // Create and submit new template
      response = await templateService.createTemplate(templateData);
    }
    
    // Check if submission failed
    if (!response || !response.success) {
      // API returned failure
      const errorMessage = response?.error || response?.message || 'Template submission failed';
      toast.error(`Template submission failed: ${errorMessage}`, {
        position: 'top-right',
        autoClose: 7000,
      });
      setError(`Submission failed: ${errorMessage}`);
      // Don't navigate away - keep user on page to fix issues
      return;
    }

    // Check if WhatsApp submission failed (backend returns success: true but includes error field)
    if (response.error) {
      // WhatsApp API submission failed, but template was saved
      const errorMessage = response.error || 'WhatsApp API submission failed';
      toast.error(`Template saved but WhatsApp submission failed: ${errorMessage}`, {
        position: 'top-right',
        autoClose: 7000,
      });
      setError(`WhatsApp submission failed: ${errorMessage}`);
      // Don't navigate away - keep user on page to fix issues
      return;
    }
    
    // Success - navigate to templates page
    toast.success('Template submitted to WhatsApp successfully!', {
      position: 'top-right',
      autoClose: 3000,
    });
    navigate('/templates', {
      state: { successMessage: 'Template submitted to WhatsApp successfully!' }
    });
  } catch (err) {
    // Handle API errors (network errors, validation errors, etc.)
    const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to submit template';
    toast.error(`Error submitting template: ${errorMessage}`, {
      position: 'top-right',
      autoClose: 7000,
    });
    setError('Error submitting template: ' + errorMessage);
  } finally {
    setIsLoading(false);
  }
};

   // Flow selection handlers
  const handleFlowSelect = (flow) => {
    if (flow) {
      setSelectedFlow(flow);
      setFormData(prev => ({
        ...prev,
        flowId: flow.id
      }));
    } else {
      setSelectedFlow(null);
      setFormData(prev => ({
        ...prev,
        flowId: null
      }));
    }
  };

  // Flow selection for buttons
  const handleButtonFlowSelect = (flow) => {
    if (flow) {
      // Find the flow button and update it
      const updatedButtons = formData.buttons.map(button => {
        if (button.type === 'flow' && !button.flow_id) {
          return {
            ...button,
            flow_id: flow.id,
            flow_name: flow.name,
            whatsapp_flow_id: flow.whatsapp_flow_id
          };
        }
        return button;
      });
      
      setFormData(prev => ({
        ...prev,
        buttons: updatedButtons
      }));
    }
    setShowFlowSelector(false);
  };

  // Auto-scroll to error when it appears
  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start',
        inline: 'nearest'
      });
    }
  }, [error]);

  // Add new state for business details
   const [businessDetails, setBusinessDetails] = useState({
    name: 'Your Business',
    profileImage: null
  });
  
  useEffect(() => {
    const fetchBusinessDetails = async () => {
      try {
        const response = await businessService.getBusinessDetails();
        setBusinessDetails({
          name: response.data.business.name || 'Your Business',
          profileImage: response.data.business.profile_image_url || null
        });
      } catch (error) {
        console.error('Failed to fetch business details:', error);
      }
    };
  
    fetchBusinessDetails();
  }, []);


  // Render functions for each section
  const renderHeaderSection = () => (
    <div className="header-section">
      <div className="header-type-selector">
        <button
          type="button"
          className={`type-option ${headerType === 'none' ? 'active' : ''}`}
          onClick={() => handleHeaderTypeChange('none')}
        >
          None
        </button>
        <button
          type="button"
          className={`type-option ${headerType === 'text' ? 'active' : ''}`}
          onClick={() => handleHeaderTypeChange('text')}
        >
          Text
        </button>
        <button
          type="button"
          className={`type-option ${headerType === 'image' ? 'active' : ''}`}
          onClick={() => handleHeaderTypeChange('image')}
        >
          <Camera size={16} />
          <span>Image</span>
        </button>
        <button
          type="button"
          className={`type-option ${headerType === 'video' ? 'active' : ''}`}
          onClick={() => handleHeaderTypeChange('video')}
        >
          <Video size={16} />
          <span>Video</span>
        </button>
        <button
        type="button"
        className={`type-option ${headerType === 'document' ? 'active' : ''}`}
        onClick={() => handleHeaderTypeChange('document')}
      >
        <File size={16} />
        <span>Document</span>
      </button>
      </div>
      
      {headerType === 'none' && (
        <div className="form-field">
          <p className="field-helper">No header will be added to this template.</p>
        </div>
      )}
      
      {headerType === 'text' && (
        <div className="form-field">
          <label htmlFor="header-text">Header Text</label>
          <input
            type="text"
            id="header-text"
            name="headerText"
            value={formData.headerText}
            onChange={handleInputChange}
            placeholder="Enter header text"
            maxLength="60"
          />
          <div className="character-counter">
            {formData.headerText.length}/60
          </div>
        </div>
      )}
      
      {headerType === 'image' && (
        <div className="media-upload">
          <div className={`upload-area ${headerFilePreview ? 'has-preview' : ''}`}>
            {headerFilePreview ? (
              <>
                <div className="file-preview">
                  <img src={headerFilePreview} alt="Header preview" />
                </div>
                <div className="file-actions">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => {
                      setHeaderFile(null);
                      setHeaderFilePreview(null);
                      setFormData(prev => ({...prev, headerContent: ''}));
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    Remove Image
                  </button>
                </div>
              </>
            ) : (
              <>
                <Camera size={24} />
                <p>Upload an image</p>
                <span>PNG or JPG (max 5MB)</span>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/png"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? `Uploading ${uploadProgress}%` : 'Select File'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
      
      {headerType === 'video' && (
        <div className="media-upload">
          <div className={`upload-area ${headerFilePreview ? 'has-preview' : ''}`}>
            {headerFilePreview ? (
              <>
                <div className="file-preview">
                  <video src={headerFilePreview} controls width="100%" />
                </div>
                <div className="file-actions">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => {
                      setHeaderFile(null);
                      setHeaderFilePreview(null);
                      setFormData(prev => ({...prev, headerContent: ''}));
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    Remove Video
                  </button>
                </div>
              </>
            ) : (
              <>
                <Video size={24} />
                <p>Upload a video</p>
                <span>MP4 (max 16MB)</span>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="video/mp4"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? `Uploading ${uploadProgress}%` : 'Select File'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {/* Add document upload section */}
    {headerType === 'document' && (
  <div className="media-upload">
    <div className={`upload-area ${headerFilePreview ? 'has-preview' : ''}`}>
      {headerFilePreview ? (
        <>
          <div className="file-preview">
            <FileText size={48} />
            <span>{headerFilePreview.name}</span>
          </div>
          <div className="file-actions">
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={() => {
                setHeaderFile(null);
                setHeaderFilePreview(null);
                setFormData(prev => ({...prev, headerContent: ''}));
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            >
              Remove Document
            </button>
          </div>
        </>
      ) : (
        <>
          <FileText size={24} />
          <p>Upload a document</p>
          <span>PDF (max 100MB)</span>
          <input
            type="file"
            ref={fileInputRef}
            accept="application/pdf"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? `Uploading ${uploadProgress}%` : 'Select File'}
          </button>
        </>
      )}
    </div>
  </div>
)}
    </div>
  );

  const renderBodySection = () => {
    const renderBodyWithVariables = () => {
      if (!formData.bodyText) return null;
      
      const parts = [];
      let text = formData.bodyText;
      let match;
      const regex = /{{(\w+)}}/g;
      let lastIndex = 0;
      
      while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          parts.push(text.substring(lastIndex, match.index));
        }
        const varName = match[1];
        const sample = formData.variableSamples[varName] || `Sample for ${varName}`;
        parts.push(<span key={match.index} className="variable">{sample}</span>);
        lastIndex = regex.lastIndex;
      }
      
      if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
      }
      
      return parts.length ? parts : text;
    };

    return (
      <div className="body-section">
        <div className="form-field">
          <label htmlFor="body-text">Body Text <span className="required">*</span></label>
          <textarea
            id="body-text"
            name="bodyText"
            value={formData.bodyText}
            onChange={handleInputChange}
            placeholder="Enter message body. Use {{1}}, {{2}} or {{name}}, {{date}} for variables."
            rows="5"
            maxLength="1024"
            required
            className={!formData.bodyText || formData.bodyText.trim() === '' ? 'error' : ''}
          />
          <div className="character-counter">
            {formData.bodyText.length}/1024
          </div>
          {(!formData.bodyText || formData.bodyText.trim() === '') && (
            <p className="field-error">Body text is required</p>
          )}
        </div>
        
        <div className="variables-helper">
          <h4>Variables</h4>
          <p>You can use variables in your template with the format {'{{number}}'} or {'{{name}}'}:</p>
          <ul>
            <li><code>{'{{1}}'}</code> or <code>{'{{name}}'}</code> – Variables will be replaced with actual values</li>
            <li>Numbered variables sort first in samples</li>
          </ul>
          <div className="example-text">
            <p><strong>Example:</strong> Hello {'{{name}}'}, your order {'{{1}}'} will be delivered on {'{{date}}'}.</p>
          </div>
        </div>

        {Object.keys(formData.variableSamples).length > 0 && (
          <div className="variable-samples">
            <h4>Variable Samples <span className="required">*</span></h4>
            <p>Provide example values for each variable used in your template:</p>
            
            {Object.entries(formData.variableSamples)
              .sort(([a], [b]) => {
                const aIsNumber = !isNaN(a);
                const bIsNumber = !isNaN(b);
                if (aIsNumber && bIsNumber) return Number(a) - Number(b);
                if (aIsNumber) return -1;
                if (bIsNumber) return 1;
                return a.localeCompare(b);
              })
              .map(([varName, sampleValue]) => (
                <div className="form-field" key={`var-${varName}`}>
                  <label>Sample for {'{{' + varName + '}}'} <span className="required">*</span></label>
                  <input
                    type="text"
                    value={sampleValue}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      variableSamples: {
                        ...prev.variableSamples,
                        [varName]: e.target.value,
                      },
                    }))}
                    placeholder={`Example value for ${varName}`}
                    required
                    className={!sampleValue || sampleValue.trim() === '' ? 'error' : ''}
                  />
                  {(!sampleValue || sampleValue.trim() === '') && (
                    <p className="field-error">Sample value is required for {'{{' + varName + '}}'}</p>
                  )}
                </div>
              ))
            }
          </div>
        )}
      </div>
    );
  };

  const renderFooterSection = () => (
    <div className="footer-section">
      <div className="form-field">
        <label htmlFor="footer-text">Footer Text (Optional)</label>
        <input
          type="text"
          id="footer-text"
          name="footerText"
          value={formData.footerText}
          onChange={handleInputChange}
          placeholder="Enter footer text"
          maxLength="60"
        />
        <div className="character-counter">
          {formData.footerText.length}/60
        </div>
      </div>
    </div>
  );

  const renderButtonsSection = () => (
    <div className="buttons-section">
      <div className="buttons-header">
        <h4>Add Buttons (Optional)</h4>
        <div className="buttons-info">
          <p><strong>Button Limits:</strong></p>
          <ul style={{ marginTop: '8px', marginBottom: '8px', paddingLeft: '20px' }}>
            <li>Maximum <strong>3 buttons</strong> total per template</li>
            <li>Maximum <strong>2 URL buttons</strong> allowed</li>
            <li>Maximum <strong>1 phone number button</strong> allowed</li>
            <li>Button text: <strong>25 characters</strong> maximum</li>
          </ul>
          <p style={{ marginTop: '8px', fontSize: '0.9em', color: '#666' }}>
            <strong>Note:</strong> Buttons help users take quick actions. URL buttons open websites, phone buttons initiate calls, 
            quick reply buttons send predefined responses, and flow buttons open interactive flows.
          </p>
        </div>
        {phoneButtonError && (
          <div className="error-message" style={{ marginTop: '8px' }}>{phoneButtonError}</div>
        )}
      </div>
      
      <div className="buttons-container">
        {formData.buttons.map((button, index) => (
          <div key={index} className="button-item card">
            <div className="button-header">
              <span>Button {index + 1}</span>
              <button 
                type="button" 
                className="remove-button"
                onClick={() => removeButton(index)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="form-field">
              <label>Button Text <span className="required">*</span></label>
              <input
                type="text"
                value={button.text}
                onChange={(e) => handleButtonChange(index, 'text', e.target.value)}
                placeholder="Enter button text"
                maxLength="25"
                required
                className={!button.text || button.text.trim() === '' ? 'error' : ''}
              />
              {(!button.text || button.text.trim() === '') && (
                <p className="field-error">Button text is required</p>
              )}
            </div>
            {button.type === 'url' && (
              <div className="form-field">
                <label>URL <span className="required">*</span></label>
                <input
                  type="url"
                  value={button.value}
                  onChange={(e) => handleButtonChange(index, 'value', e.target.value)}
                  placeholder="https://example.com"
                  required
                  className={!button.value || button.value.trim() === '' ? 'error' : ''}
                />
                {(!button.value || button.value.trim() === '') && (
                  <p className="field-error">URL is required</p>
                )}
              </div>
            )}
            {button.type === 'phone_number' && (
              <div className="form-field">
                <label>Phone Number <span className="required">*</span></label>
                <input
                  type="tel"
                  value={button.value}
                  onChange={(e) => handleButtonChange(index, 'value', e.target.value)}
                  placeholder="+1234567890"
                  required
                  className={!button.value || button.value.trim() === '' ? 'error' : ''}
                />
                {(!button.value || button.value.trim() === '') && (
                  <p className="field-error">Phone number is required</p>
                )}
              </div>
            )}
            {button.type === 'quick_reply' && (
  <div className="form-field">
    <p className="field-helper">This text will be used for both display and value</p>
  </div>
)}
            {button.type === 'flow' && (
              <>
                <div className="form-field">
                  <label>Flow Selection <span className="required">*</span></label>
                  <div className="flow-selection">
                    {button.flow_id ? (
                      <div className="selected-flow-info">
                        <span className="flow-name">{button.flow_name || 'Selected Flow'}</span>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setShowFlowSelector(true)}
                        >
                          Change Flow
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setShowFlowSelector(true)}
                      >
                        <Workflow size={16} />
                        Select Flow
                      </button>
                    )}
                  </div>
                </div>
                <div className="form-field">
                  <label>Button Icon</label>
                  <select
                    value={button.icon || 'default'}
                    onChange={(e) => handleButtonChange(index, 'icon', e.target.value)}
                  >
                    <option value="default">Default</option>
                    <option value="document">Document</option>
                    <option value="link">Link</option>
                    <option value="calendar">Calendar</option>
                    <option value="phone">Phone</option>
                    <option value="mail">Mail</option>
                  </select>
                </div>
              </>
            )}
          </div>
        ))}
        
        {formData.buttons.length < 3 && (
          <div className="button-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => addButton('url')}
              disabled={formData.buttons.length >= 3 || formData.buttons.filter(btn => btn.type === 'url').length >= 2}
            >
              <ExternalLink size={16} />
              <span>Add URL Button</span>
            </button>
            
            
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => addButton('phone_number')}
                disabled={formData.buttons.length >= 3 || formData.buttons.some(btn => btn.type === 'phone_number')}
              >
                <Phone size={16} />
                <span>Add Phone Button</span>
              </button>
              {(phoneButtonError || (error && error.includes('Button'))) && (
                <div className="error-message">{phoneButtonError || error}</div>
              )}
            
            
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => addButton('quick_reply')}
              disabled={formData.buttons.length >= 3}
            >
              <Copy size={16} />
              <span>Add Quick Reply</span>
            </button>
            
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => addButton('flow')}
              disabled={formData.buttons.length >= 3}
            >
              <Workflow size={16} />
              <span>Add Flow Button</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderFlowSection = () => (
    <div className="flow-section">
      <div className="flow-header">
        <h4>WhatsApp Flow Integration (Optional)</h4>
        <p>Add an interactive flow to your template for enhanced user engagement</p>
      </div>
      
      <div className="flow-content">
        {selectedFlow ? (
          <div className="selected-flow-card">
            <div className="flow-info">
              <div className="flow-header-info">
                <h5>{selectedFlow.name}</h5>
                <span className="flow-status">{selectedFlow.status}</span>
              </div>
              <p className="flow-description">
                {selectedFlow.description || 'No description available'}
              </p>
              <div className="flow-meta">
                <span className="flow-category">{selectedFlow.category}</span>
                <span className="flow-version">v{selectedFlow.version}</span>
                {selectedFlow.flow_data?.screens && (
                  <span className="flow-screens">
                    {selectedFlow.flow_data.screens.length} screen{selectedFlow.flow_data.screens.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
            <div className="flow-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowFlowSelector(true)}
              >
                <Workflow size={16} />
                Change Flow
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => handleFlowSelect(null)}
              >
                <X size={16} />
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="no-flow-selected">
            <div className="no-flow-content">
              <Workflow size={48} className="no-flow-icon" />
              <h5>No Flow Selected</h5>
              <p>Add an interactive WhatsApp flow to enhance your template</p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowFlowSelector(true)}
              >
                <Workflow size={16} />
                Select Flow
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderPreview = () => {
    const renderBodyWithVariables = () => {
      if (!formData.bodyText) return null;
      
      const parts = [];
      let text = formData.bodyText;
      let match;
      const regex = /{{(\w+)}}/g;
      let lastIndex = 0;
      
      while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          parts.push(text.substring(lastIndex, match.index));
        }
        const varName = match[1];
        const sample = formData.variableSamples[varName] || `Sample for ${varName}`;
        parts.push(<span key={match.index} className="wa-template-variable">{sample}</span>);
        lastIndex = regex.lastIndex;
      }
      
      if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
      }
      
      return parts.length ? parts : text;
    };
  
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
    return (
      <div className="template-preview">
        <h3>Template Preview</h3>
        <div className="wa-phone-container">
          <div className="wa-phone-header">
            <div className="wa-phone-notch"></div>
          </div>
          <div className="wa-phone-content">
            <div className="wa-chat-header">
              <div className="wa-chat-profile">
              <div className="wa-chat-avatar">
                  {businessDetails.profileImage ? (
                    <img 
                      src={businessDetails.profileImage} 
                      alt="Business Logo" 
                      className="wa-business-dp"
                      onError={(e) => {
                        e.target.onerror = null; 
                        e.target.src = '/default-business-icon.png';
                      }}
                    />
                  ) : (
                    <div className="wa-business-dp-fallback">
                      {businessDetails.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="wa-chat-info">
                  <div className="wa-chat-name">{businessDetails.name}</div>
                  <div className="wa-chat-status">Online</div>
                </div>
              </div>
            </div>
            
            <div className="wa-chat-messages">
              <div className="wa-template-message">
                <div className="wa-template-container">
                  {/* Header Media or Text */}
                  {headerType === 'image' && (
                    <div className="wa-template-media">
                      {headerFilePreview ? (
                        <img src={headerFilePreview} alt="Header" />
                      ) : (
                        <div className="wa-media-placeholder">
                          <Camera size={24} color="#8696a0" />
                          <span>Image</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {headerType === 'video' && (
                    <div className="wa-template-media">
                      {headerFilePreview ? (
                        <video src={headerFilePreview} controls />
                      ) : (
                        <div className="wa-media-placeholder">
                          <Video size={24} color="#8696a0" />
                          <span>Video</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {headerType === 'text' && formData.headerText && (
                    <div className="wa-template-header">{formData.headerText}</div>
                  )}
                  {headerType === 'document' && (
                <div className="wa-template-media">
                  {headerFilePreview ? (
                    <div className="wa-document-preview">
                      <FileText size={48} />
                      <span>{headerFilePreview.name}</span>
                    </div>
                  ) : (
                    <div className="wa-media-placeholder">
                      <FileText size={24} color="#8696a0" />
                      <span>Document</span>
                    </div>
                  )}
                </div>
              )}
                  
                  {/* Message Body */}
                  {formData.bodyText && (
                    <div className="wa-template-body">
                      {renderBodyWithVariables()}
                    </div>
                  )}
                  
                  {/* Footer */}
                  {formData.footerText && (
                    <div className="wa-template-footer">{formData.footerText}</div>
                  )}
                  
                  {/* Buttons */}
                  {formData.buttons.length > 0 && (
                    <div className="wa-template-buttons">
                      {formData.buttons.map((button, index) => (
                        <div key={index} className="wa-template-button">
                          {button.type === 'url' && <ExternalLink size={16} />}
                          {button.type === 'phone_number' && <Phone size={16} />}
                          {button.type === 'quick_reply' && <Copy size={16} />}
                          {button.type === 'flow' && <Workflow size={16} />}
                          <span>{button.text || `Button ${index + 1}`}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Flow Integration */}
                  {selectedFlow && (
                    <div className="wa-template-flow">
                      <div className="wa-flow-indicator">
                        <Workflow size={16} />
                        <span>Interactive Flow: {selectedFlow.name}</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Message Time with Check marks */}
                  <div className="wa-template-time">
                    {currentTime}
                    <svg viewBox="0 0 16 15" width="14" height="14">
                      <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="create-template">
      <div className="page-header">
        <button 
          className="back-link"
          onClick={() => navigate('/templates')}
        >
          <ArrowLeft size={16} />
          <span>Back to Templates</span>
        </button>
        <h2>
          {id ? 'Edit Template' : 
           state?.draftTemplate ? 'Continue Draft Template' : 'Create Message Template'}
        </h2>
      </div>
      
      {error && (
        <div ref={errorRef} className="error-alert sticky-error">
          <div className="error-content">
            <span className="error-icon">⚠️</span>
            <span className="error-text">{error}</span>
          </div>
          <button 
            type="button"
            className="error-close"
            onClick={() => setError(null)}
            aria-label="Close error"
          >
            <X size={18} />
          </button>
        </div>
      )}
      
      <div className="template-form-container">
        <form className="template-form card">
          <div className="form-section">
            <h3>Template Information</h3>
            <div className="form-fields">
              <div className="form-field">
                <label htmlFor="template-name">Template Name</label>
                <div className="input-with-validation">
                  <input
                    type="text"
                    id="template-name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter template name (lowercase letters and underscores only)"
                    required
                    pattern="[a-z0-9_]+"
                    title="Template name must contain only lowercase letters, numbers, and underscores"
                    className={nameValidationStatus === 'invalid' ? 'error' : nameValidationStatus === 'valid' ? 'valid' : ''}
                  />
                  {nameValidationStatus === 'checking' && (
                    <div className="validation-indicator checking">
                      <div className="spinner"></div>
                    </div>
                  )}
                  {nameValidationStatus === 'valid' && (
                    <div className="validation-indicator valid">✓</div>
                  )}
                  {nameValidationStatus === 'invalid' && (
                    <div className="validation-indicator invalid">✗</div>
                  )}
                </div>
                <p className="field-helper">
                  Internal name for your template. Only lowercase letters, numbers, and underscores are allowed.
                </p>
                {nameValidationMessage && (
                  <p className={`field-message ${nameValidationStatus === 'valid' ? 'success' : 'error'}`}>
                    {nameValidationMessage}
                  </p>
                )}
              </div>
              
              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="template-category">Category</label>
                  <select
                    id="template-category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                  >
                    <option value="marketing">Marketing</option>
                    <option value="utility">Utility</option>
                  </select>
                </div>
                
                <div className="form-field">
                  <label htmlFor="template-language">Language</label>
                  <select
                    id="template-language"
                    name="language"
                    value={formData.language}
                    onChange={handleInputChange}
                  >
                    <option value="en">English</option>
                    <option value="en_US">English (US)</option>
                    <option value="es_ES">Spanish (Spain)</option>
                    <option value="fr_FR">French (France)</option>
                    <option value="pt_BR">Portuguese (Brazil)</option>
                    <option value="ta">Tamil</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          
          <div className="form-section">
            <div className="section-tabs">
              <button
                type="button"
                className={`section-tab ${activeTab === 'header' ? 'active' : ''}`}
                onClick={() => handleTabChange('header')}
              >
                Header
              </button>
              <button
                type="button"
                className={`section-tab ${activeTab === 'body' ? 'active' : ''}`}
                onClick={() => handleTabChange('body')}
              >
                Body
              </button>
              <button
                type="button"
                className={`section-tab ${activeTab === 'footer' ? 'active' : ''}`}
                onClick={() => handleTabChange('footer')}
              >
                Footer
              </button>
              <button
                type="button"
                className={`section-tab ${activeTab === 'buttons' ? 'active' : ''}`}
                onClick={() => handleTabChange('buttons')}
              >
                Buttons
              </button>
              <button
                type="button"
                className={`section-tab ${activeTab === 'flow' ? 'active' : ''}`}
                onClick={() => handleTabChange('flow')}
              >
                Flow
              </button>
            </div>
            
            <div className="section-content">
              {activeTab === 'header' && renderHeaderSection()}
              {activeTab === 'body' && renderBodySection()}
              {activeTab === 'footer' && renderFooterSection()}
              {activeTab === 'buttons' && renderButtonsSection()}
              {activeTab === 'flow' && renderFlowSection()}
            </div>
          </div>
          
          <div className="form-actions">
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={handleSaveAsDraft}
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save as Draft'}
            </button>
            <button 
              type="button" 
              className="btn btn-primary"
              onClick={handleSubmitToWhatsApp}
              disabled={isLoading || !isFormValid()}
            >
              {isLoading ? 'Submitting...' : 'Submit to WhatsApp'}
            </button>
          </div>
        </form>
        
        {renderPreview()}
      </div>

      {/* Flow Selector Modal */}
      <FlowSelector
        isOpen={showFlowSelector}
        onClose={() => setShowFlowSelector(false)}
        onSelect={handleButtonFlowSelect}
        selectedFlowId={selectedFlow?.id}
      />
    </div>
  );
}

export default CreateTemplate;