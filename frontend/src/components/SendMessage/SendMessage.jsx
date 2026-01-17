import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Users, Image, Video, Upload, Send, Calendar, Clock, AlertTriangle, Check, ChevronDown, ChevronUp } from 'lucide-react';
import FieldMapper from './FieldMapper';
import { templateService } from '../../api/templateService';
import { contactService } from '../../api/contactService';
import { messageService } from '../../api/messageService';
import MediaUploadModal from './MediaUploadModal';
import CampaignProgress from './CampaignProgress';
import './SendMessage.css';
import Papa from 'papaparse';
import { TemplateSelectionModal } from './TemplateSelectionModal';

function SendMessage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [contactLists, setContactLists] = useState([]);
  const [csvFields, setCsvFields] = useState([]);
  const [csvData, setCsvData] = useState([]);
  const [fileName, setFileName] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [showTemplateSelection, setShowTemplateSelection] = useState(false);
  const [csvListName, setCsvListName] = useState('');
  const [showProgress, setShowProgress] = useState(false);
  const [currentCampaignId, setCurrentCampaignId] = useState(null);
  const [availableFields, setAvailableFields] = useState([]);

  // Section completion states
  const [sectionStates, setSectionStates] = useState({
    template: { completed: false, expanded: true },
    audience: { completed: false, expanded: false },
    mapping: { completed: false, expanded: false },
    delivery: { completed: false, expanded: false }
  });

  const [formData, setFormData] = useState({
    templateId: '',
    audienceType: 'all',
    customAudience: '',
    contactList: '',
    scheduledTime: '',
    scheduledDate: '',
    sendNow: true,
    fieldMappings: {},
    campaignName: ''
  });

  const fileInputRef = useRef(null);
  const [listNameValidation, setListNameValidation] = useState({
    isChecking: false,
    isValid: null,
    message: ''
  });

  // Debounced function to check list name availability
  const checkListNameAvailability = useCallback(
    debounce(async (listName) => {
      if (!listName.trim()) {
        setListNameValidation({
          isChecking: false,
          isValid: null,
          message: ''
        });
        return;
      }

      setListNameValidation(prev => ({ ...prev, isChecking: true }));

      try {
        const response = await contactService.checkListNameAvailability(listName.trim());
        setListNameValidation({
          isChecking: false,
          isValid: response.available,
          message: response.message
        });
      } catch (error) {
        setListNameValidation({
          isChecking: false,
          isValid: null,
          message: 'Error checking list name'
        });
      }
    }, 500), // 500ms delay
    []
  );

  // Handle CSV list name change with validation
  const handleCsvListNameChange = (e) => {
    const value = e.target.value;
    setCsvListName(value);
    
    // Reset validation state immediately
    setListNameValidation({
      isChecking: false,
      isValid: null,
      message: ''
    });

    // Check availability after user stops typing
    if (value.trim()) {
      checkListNameAvailability(value);
    }
  };


  // Fetch templates and contacts
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [templatesRes, contactsRes, listsRes] = await Promise.all([
          templateService.getTemplates({ status: 'approved' }),
          contactService.getContacts(),
          contactService.getListsForSending()
        ]);
        
        setTemplates(templatesRes.data?.templates || []);
        setContacts(contactsRes.data || []);
        setContactLists(listsRes.data || []);
      } catch (err) {
        setError('Failed to load data: ' + (err.response?.data?.message || err.message));
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Fetch available fields when list is selected or audience type changes
  useEffect(() => {
    const fetchAvailableFields = async () => {
      try {
        let listId = null;
        
        if (formData.audienceType === 'list' && formData.contactList) {
          listId = formData.contactList;
        } else if (formData.audienceType === 'custom' && csvListName) {
          // For custom CSV, we'll use the fields from CSV
          return;
        }
        
        const response = await contactService.getAvailableFields(listId);
        if (response.success && response.data) {
          setAvailableFields(response.data);
        }
      } catch (err) {
        console.error('Failed to fetch available fields:', err);
        // Fallback to basic fields
        setAvailableFields([
          { field_name: 'fname', field_type: 'text', is_fixed: true },
          { field_name: 'lname', field_type: 'text', is_fixed: true },
          { field_name: 'wanumber', field_type: 'phone', is_fixed: true },
          { field_name: 'email', field_type: 'email', is_fixed: true }
        ]);
      }
    };

    if (formData.audienceType !== 'custom') {
      fetchAvailableFields();
    }
  }, [formData.audienceType, formData.contactList]);

  // Update section completion states
  useEffect(() => {
    updateSectionStates();
  }, [formData, csvData, contacts, templates]);

  const updateSectionStates = () => {
    const selectedTemplate = templates.find(t => t.id === formData.templateId);
    const templateVariables = selectedTemplate ? extractVariables(selectedTemplate.body_text) : [];
    
    setSectionStates(prev => ({
      ...prev,
      template: {
        ...prev.template,
        completed: !!formData.templateId
      },
      audience: {
        ...prev.audience,
        completed: validateAudience()
      },
      mapping: {
        ...prev.mapping,
        completed: validateMapping(templateVariables)
      },
      delivery: {
        ...prev.delivery,
        completed: validateDelivery()
      }
    }));
  };

  // Get variable samples from selected template
  const getVariableSamples = () => {
    const selectedTemplate = templates.find(t => t.id === formData.templateId);
    if (!selectedTemplate || !selectedTemplate.variables) return {};
    
    // Handle both string and object formats
    if (typeof selectedTemplate.variables === 'string') {
      try {
        return JSON.parse(selectedTemplate.variables);
      } catch (e) {
        console.error('Error parsing variable samples:', e);
        return {};
      }
    }
    return selectedTemplate.variables || {};
  };

  // Update the validateAudience function
  const validateAudience = () => {
    if (formData.audienceType === 'all') {
      return contacts.length > 0;
    } else if (formData.audienceType === 'list') {
      return !!formData.contactList;
    } else if (formData.audienceType === 'custom') {
      return csvData.length > 0 && 
             csvListName.trim() !== '' && 
             listNameValidation.isValid === true; // Must be explicitly valid
    }
    return false;
  };
const saveCSVContacts = async () => {
  if (!csvData.length || !csvListName.trim()) return null;
  
  try {
    // Create a File object from CSV data
    const csvContent = Papa.unparse(csvData.map(contact => ({
      fname: contact.fname || '',
      lname: contact.lname || '',
      wanumber: contact.wanumber,
      email: contact.email || ''
    })));
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const file = new File([blob], 'contacts.csv', { type: 'text/csv' });
    
    const formData = new FormData();
    formData.append('listName', csvListName);
    formData.append('csvFile', file); // Changed from 'file' to 'csvFile'
    
    const response = await contactService.importContacts(formData);
    return response.data.listId;
  } catch (error) {
    console.error('Failed to save CSV contacts:', error);
    throw new Error('Failed to save contacts to database');
  }
};

  const validateMapping = (templateVariables) => {
    if (templateVariables.length === 0) return true;
    return templateVariables.every(variable => 
      formData.fieldMappings[variable] && formData.fieldMappings[variable] !== ''
    );
  };

  const validateDelivery = () => {
    let isValid = !!formData.campaignName;
    if (!formData.sendNow) {
      isValid = isValid && !!formData.scheduledDate && !!formData.scheduledTime;
    }
    return isValid;
  };

  const toggleSection = (section) => {
    setSectionStates(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        expanded: !prev[section].expanded
      }
    }));
  };

  const expandNextIncompleteSection = () => {
    const sections = ['template', 'audience', 'mapping', 'delivery'];
    const currentStates = sectionStates;
    
    for (const section of sections) {
      if (!currentStates[section].completed) {
        setSectionStates(prev => ({
          ...prev,
          [section]: { ...prev[section], expanded: true }
        }));
        break;
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleTemplateSelect = (template) => {
  handleInputChange({
    target: { name: 'templateId', value: template.id }
  });
  
  setShowTemplateSelection(false);
  
  // Check if template has media header
  if (template.header_type === 'image' || template.header_type === 'video' || template.header_type === 'document') {
    setSelectedMedia(template.header_type);
    setShowMediaUpload(true);
  }
  
  // Auto-expand next section
  setTimeout(() => {
    setSectionStates(prev => ({
      ...prev,
      template: { ...prev.template, expanded: false },
      audience: { ...prev.audience, expanded: true }
    }));
  }, 500);
};

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setValidationErrors([]);
    setSuccessMessage('');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const { data, errors } = results;




        
        if (errors.length > 0) {
          setValidationErrors(errors.map(err => err.message));
          return;
        }

        const requiredFields = ['wanumber'];
        const validationErrors = [];
        const validData = data.filter(row => {
          const hasAllFields = requiredFields.every(field => row[field]);
          if (!hasAllFields) {
            validationErrors.push(`Row missing required field(s)`);
          }
          return hasAllFields;
        });

        if (validationErrors.length > 0) {
          setValidationErrors(validationErrors);
          return;
        }

        const transformedData = validData.map(row => ({
          id: row.id || `csv-${Math.random().toString(36).substr(2, 9)}`,
          wanumber: row.wanumber,
          fname: row.fname || '',
          lname: row.lname || '',
          email: row.email || '',
          list_id: row.list_id || null,
          list_name: row.list_name || 'CSV Import'
        }));

        setCsvFields(Object.keys(data[0]));
        setCsvData(transformedData);
        setSuccessMessage(`Successfully loaded ${transformedData.length} contacts`);
      },
      error: (error) => {
        setValidationErrors([`Error parsing CSV: ${error.message}`]);
      }
    });
  };

  const handleMediaUpload = async (file) => {
  try {
    setIsLoading(true);
    setUploadProgress(0);
    
    const response = await templateService.uploadMediaToWhatsApp(
      file,
      formData.templateId,
      selectedTemplate.header_type
    );

    setSelectedMedia({
      id:  response.whatsappMediaId,
      type: file.type.startsWith('image') ? 'image' : 'video',
      name: file.name
    });
    
    setShowMediaUpload(false);

    // After successful upload, expand the next section
    setTimeout(() => {
      setSectionStates(prev => ({
        ...prev,
        template: { ...prev.template, expanded: false },
        audience: { ...prev.audience, expanded: true }
      }));
    }, 500);

    setSuccessMessage(`${selectedTemplate.header_type} uploaded successfully!`);
  } catch (err) {
    setError('Failed to upload media: ' + (err.response?.data?.message || err.message));
  } finally {
    setIsLoading(false);
    setUploadProgress(0);
  }
};

  const handleMappingChange = (mappings) => {
    setFormData(prev => ({
      ...prev,
      fieldMappings: mappings
    }));
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Additional validation for custom audience
  if (formData.audienceType === 'custom') {
    if (!csvListName.trim()) {
      setError('Please enter a list name for your CSV contacts.');
      return;
    }
    
    if (listNameValidation.isValid === false) {
      setError('Please choose a different list name. The current name already exists.');
      return;
    }
    
    if (listNameValidation.isValid === null && csvListName.trim()) {
      setError('Please wait for list name validation to complete.');
      return;
    }
  }
  
  // Check if all sections are completed with specific error messages
  const incompleteSections = [];
  if (!sectionStates.template.completed) {
    incompleteSections.push('Template Selection');
  }
  if (!sectionStates.audience.completed) {
    incompleteSections.push('Audience Selection');
  }
  if (!sectionStates.mapping.completed) {
    incompleteSections.push('Field Mapping');
  }
  if (!sectionStates.delivery.completed) {
    incompleteSections.push('Delivery Settings');
  }
  
  if (incompleteSections.length > 0) {
    setError(`Please complete the following sections: ${incompleteSections.join(', ')}`);
    return;
  }
  
  try {
    setIsLoading(true);
    
    let targetContacts = [];
    let savedListId = null;
    
    if (formData.audienceType === 'all') {
      targetContacts = contacts;
    } else if (formData.audienceType === 'list') {
      targetContacts = contacts.filter(c => c.list_id === formData.contactList);
    } else if (formData.audienceType === 'custom') {
      // Save CSV contacts to database first
      savedListId = await saveCSVContacts();
      targetContacts = csvData.map(contact => ({
        ...contact,
        list_id: savedListId
      }));
    }
    
    const payload = {
      templateId: formData.templateId,
      campaignName: formData.campaignName,
      audience_type: formData.audienceType.toLowerCase(),
      contacts: targetContacts.map(c => ({
        id: c.id,
        wanumber: c.wanumber,
        fname: c.fname || '',
        lname: c.lname || '',
        email: c.email || '',
        list_id: c.list_id || savedListId
      })),
      fieldMappings: formData.fieldMappings,
      sendNow: formData.sendNow,
      scheduledAt: formData.sendNow ? null : 
        `${formData.scheduledDate}T${formData.scheduledTime}:00Z`,
      list_id: formData.audienceType === 'list' ? formData.contactList : savedListId,
      is_custom: formData.audienceType === 'custom',
      csvListName: formData.audienceType === 'custom' ? csvListName : null
    };

    const response = await messageService.sendBulkMessages(payload);
    
    // If sending now, show progress modal
    if (formData.sendNow && response.data?.campaignId) {
      setCurrentCampaignId(response.data.campaignId);
      setShowProgress(true);
      setIsLoading(false);
    } else {
      // For scheduled campaigns, navigate to campaigns page
      navigate('/campaigns', { 
        state: { success: 'Campaign scheduled successfully!' } 
      });
    }
  } catch (err) {
    const errorMsg = err.response?.data?.message || err.message || 'Failed to send messages';
    setError(errorMsg);
    console.error('Send error:', err.response?.data || err);
    setIsLoading(false);
  }
};

const handleProgressComplete = (progressData) => {
  // Navigate to campaigns page after completion
  setTimeout(() => {
    navigate('/campaigns', { 
      state: { 
        success: progressData.status === 'completed' 
          ? 'Messages sent successfully!' 
          : progressData.status === 'partial'
          ? 'Campaign completed with some failures'
          : 'Campaign failed'
      } 
    });
  }, 1000);
};

const handleCloseProgress = () => {
  setShowProgress(false);
  navigate('/campaigns');
};

 const handleSaveAsDraft = async () => {
  try {
    setIsDraftSaving(true);
    
    let targetContacts = [];
    let savedListId = null;
    
    if (formData.audienceType === 'all') {
      targetContacts = contacts;
    } else if (formData.audienceType === 'list') {
      targetContacts = contacts.filter(c => c.list_id === formData.contactList);
    } else if (formData.audienceType === 'custom') {
      // Save CSV contacts to database first
      savedListId = await saveCSVContacts();
      targetContacts = csvData.map(contact => ({
        ...contact,
        list_id: savedListId
      }));
    }
    
    const payload = {
      templateId: formData.templateId,
      campaignName: formData.campaignName,
      audience_type: formData.audienceType.toLowerCase(),
      contacts: targetContacts.map(c => ({
        id: c.id,
        wanumber: c.wanumber,
        fname: c.fname || '',
        lname: c.lname || '',
        email: c.email || '',
        list_id: c.list_id || savedListId
      })),
      fieldMappings: formData.fieldMappings,
      scheduledAt: formData.sendNow ? null : 
        `${formData.scheduledDate}T${formData.scheduledTime}:00Z`,
      csvListName: formData.audienceType === 'custom' ? csvListName : null
    };

    await messageService.saveDraft(payload);
    navigate('/campaigns', { 
      state: { success: 'Campaign saved as draft!' } 
    });
  } catch (err) {
    setError('Failed to save draft: ' + (err.message || 'Unknown error'));
  } finally {
    setIsDraftSaving(false);
  }
};

  const selectedTemplate = templates.find(t => t.id === formData.templateId);
  const templateVariables = selectedTemplate ? extractVariables(selectedTemplate.body_text) : [];
  
  // Determine contact fields based on audience type
  let contactFields = [];
  if (formData.audienceType === 'custom') {
    // For custom CSV, use CSV column names as fields
    contactFields = csvFields.map(field => ({
      field_name: field,
      field_type: 'text',
      is_fixed: ['fname', 'lname', 'wanumber', 'email'].includes(field.toLowerCase())
    }));
  } else {
    // Use available fields from API
    contactFields = availableFields.length > 0 
      ? availableFields 
      : (contacts.length > 0 
          ? Object.keys(contacts[0]).map(field => ({
              field_name: field,
              field_type: 'text',
              is_fixed: ['fname', 'lname', 'wanumber', 'email'].includes(field)
            }))
          : []);
  }

  if (isLoading && templates.length === 0) {
    return (
      <div className="send-message-container send-message-component">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading templates and contacts...</p>
        </div>
      </div>
    );
  }

  // Calculate progress percentage
  const completedSections = Object.values(sectionStates).filter(s => s.completed).length;
  const totalSections = Object.keys(sectionStates).length;
  const progressPercentage = (completedSections / totalSections) * 100;

  return (
    <div className="send-message-container send-message-component">
      {/* Hero Header Section */}
      <div className="send-message-header">
        <div className="header-content">
          <div className="header-badge">
            <Send size={18} />
            <span>Campaign Builder</span>
          </div>
          <h1 className="page-title">Create New Campaign</h1>
          <p className="page-description">Configure and send personalized WhatsApp messages to your contacts in just a few steps</p>
        </div>
        
        {/* Progress Indicator */}
        <div className="progress-indicator-wrapper">
          <div className="progress-header">
            <span className="progress-label">Campaign Progress</span>
            <span className="progress-percentage">{Math.round(progressPercentage)}%</span>
          </div>
          <div className="progress-bar-container">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <div className="progress-steps">
            {Object.entries(sectionStates).map(([key, state], index) => (
              <div key={key} className={`progress-step ${state.completed ? 'completed' : ''} ${state.expanded ? 'active' : ''}`}>
                <div className="step-indicator">
                  {state.completed ? <Check size={14} /> : <span>{index + 1}</span>}
                </div>
                <span className="step-label">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="alert alert-error slide-in">
          <AlertTriangle size={20} />
          <span>{error}</span>
          <button className="alert-close" onClick={() => setError(null)}>×</button>
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success slide-in">
          <Check size={20} />
          <span>{successMessage}</span>
          <button className="alert-close" onClick={() => setSuccessMessage('')}>×</button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="campaign-form">
        {/* Template Selection Section */}
        <div className={`form-section ${sectionStates.template.completed ? 'completed' : ''} ${!sectionStates.template.completed && sectionStates.template.expanded ? 'incomplete' : ''}`}>
          <div className="section-header" onClick={() => toggleSection('template')}>
            <div className="section-info">
              <div className={`section-icon ${sectionStates.template.completed ? 'icon-completed' : ''}`}>
                {sectionStates.template.completed ? <Check size={22} /> : <FileText size={22} />}
              </div>
              <div className="section-title">
                <div className="section-title-row">
                  <h3>1. Select Message Template</h3>
                  {sectionStates.template.completed && (
                    <span className="section-badge completed-badge">
                      <Check size={14} />
                      Completed
                    </span>
                  )}
                </div>
                <p>Choose a pre-approved template for your campaign</p>
                {!sectionStates.template.completed && sectionStates.template.expanded && (
                  <span className="section-error">
                    <AlertTriangle size={14} />
                    Template selection is required
                  </span>
                )}
              </div>
            </div>
            <div className="section-controls">
              {sectionStates.template.completed && selectedTemplate && (
                <span className="selected-item">
                  <FileText size={14} />
                  {selectedTemplate.name}
                </span>
              )}
              <div className={`section-toggle ${sectionStates.template.expanded ? 'expanded' : ''}`}>
                {sectionStates.template.expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
            </div>
          </div>

          {sectionStates.template.expanded && (
            <div className="section-content">
              <button 
                type="button"
                className="template-select-btn"
                onClick={() => setShowTemplateSelection(true)}
              >
                <FileText size={20} />
                {selectedTemplate ? 'Change Template' : 'Select Template'}
              </button>

{selectedTemplate && (
  <div className="template-preview-card">
    <div className="template-preview-header">
      <h4>Selected Template</h4>
      <span className="template-category">{selectedTemplate.category}</span>
    </div>
    <div className="template-preview-content">
      {selectedTemplate.header_type === 'text' && selectedTemplate.header_content && (
        <div className="template-header">{selectedTemplate.header_content}</div>
      )}
      {selectedTemplate.header_type === 'image' && (
        <div className="template-media-placeholder">
          <Image size={24} />
          <span>Image Header</span>
        </div>
      )}
      {selectedTemplate.header_type === 'video' && (
        <div className="template-media-placeholder">
          <Video size={24} />
          <span>Video Header</span>
        </div>
      )}
      {selectedTemplate.header_type === 'document' && (
        <div className="template-media-placeholder">
          <FileText size={24} />
          <span>Document Header</span>
          {selectedTemplate.header_filename && (
            <span className="document-filename">{selectedTemplate.header_filename}</span>
          )}
        </div>
      )}
      <div className="template-body">{selectedTemplate.body_text}</div>
      {selectedTemplate.footer_text && (
        <div className="template-footer">{selectedTemplate.footer_text}</div>
      )}
    </div>
  </div>
)}
            </div>
          )}
        </div>

        {/* Audience Selection Section */}
        <div className={`form-section ${sectionStates.audience.completed ? 'completed' : ''} ${!sectionStates.audience.completed && sectionStates.audience.expanded ? 'incomplete' : ''}`}>
          <div className="section-header" onClick={() => toggleSection('audience')}>
            <div className="section-info">
              <div className={`section-icon ${sectionStates.audience.completed ? 'icon-completed' : ''}`}>
                {sectionStates.audience.completed ? <Check size={22} /> : <Users size={22} />}
              </div>
              <div className="section-title">
                <div className="section-title-row">
                  <h3>2. Choose Your Audience</h3>
                  {sectionStates.audience.completed && (
                    <span className="section-badge completed-badge">
                      <Check size={14} />
                      Completed
                    </span>
                  )}
                </div>
                <p>Select who will receive this message</p>
                {!sectionStates.audience.completed && sectionStates.audience.expanded && (
                  <span className="section-error">
                    <AlertTriangle size={14} />
                    {formData.audienceType === 'custom' && csvData.length === 0 
                      ? 'Please upload a CSV file' 
                      : formData.audienceType === 'list' && !formData.contactList
                        ? 'Please select a contact list'
                        : 'Audience selection is required'
                    }
                  </span>
                )}
              </div>
            </div>
            <div className="section-controls">
              {sectionStates.audience.completed && (
                <span className="selected-item">
                  <Users size={14} />
                  {formData.audienceType === 'all' 
                    ? `All Contacts (${contacts.length})` 
                    : formData.audienceType === 'list'
                      ? `Contact List (${contactLists.find(l => l.id === formData.contactList)?.contactCount || 0})`
                      : `Custom CSV (${csvData.length})`
                  }
                </span>
              )}
              <div className={`section-toggle ${sectionStates.audience.expanded ? 'expanded' : ''}`}>
                {sectionStates.audience.expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
            </div>
          </div>

          {sectionStates.audience.expanded && (
            <div className="section-content">
              <div className="audience-options">
                <label className={`audience-option ${formData.audienceType === 'all' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="audienceType"
                    value="all"
                    checked={formData.audienceType === 'all'}
                    onChange={handleInputChange}
                  />
                  <div className="option-content">
                    <div className="option-title">All Contacts</div>
                    <div className="option-description">Send to all {contacts.length} contacts in your database</div>
                  </div>
                </label>

                <label className={`audience-option ${formData.audienceType === 'list' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="audienceType"
                    value="list"
                    checked={formData.audienceType === 'list'}
                    onChange={handleInputChange}
                  />
                  <div className="option-content">
                    <div className="option-title">Existing Contact List</div>
                    <div className="option-description">Choose from your saved contact lists</div>
                  </div>
                </label>

                <label className={`audience-option ${formData.audienceType === 'custom' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="audienceType"
                    value="custom"
                    checked={formData.audienceType === 'custom'}
                    onChange={handleInputChange}
                  />
                  <div className="option-content">
                    <div className="option-title">Upload CSV File</div>
                    <div className="option-description">Import contacts from a CSV file</div>
                  </div>
                </label>
              </div>

              {formData.audienceType === 'list' && (
                <div className="form-field">
                  <label htmlFor="contactList">Select Contact List</label>
                  <select
                    id="contactList"
                    name="contactList"
                    value={formData.contactList}
                    onChange={handleInputChange}
                    className="select-field"
                  >
                    <option value="">Choose a contact list</option>
                    {contactLists.map(list => (
                      <option key={list.id} value={list.id}>
                        {list.name} ({list.contactCount || 0} contacts)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.audienceType === 'custom' && (
        <div className="csv-upload-section">
          <div className="form-field">
            <label htmlFor="csvListName">
              List Name *
              {listNameValidation.isChecking && (
                <span className="validation-spinner">Checking...</span>
              )}
            </label>
            <div className="input-with-validation">
              <input
                type="text"
                id="csvListName"
                name="csvListName"
                value={csvListName}
                onChange={handleCsvListNameChange}
                placeholder="Enter a name for this contact list"
                className={`input-field ${
                  listNameValidation.isValid === false ? 'error' : 
                  listNameValidation.isValid === true ? 'success' : ''
                }`}
                required
              />
              <div className="validation-indicator">
                {listNameValidation.isChecking && (
                  <div className="spinner-small"></div>
                )}
                {listNameValidation.isValid === true && (
                  <Check size={16} className="validation-success" />
                )}
                {listNameValidation.isValid === false && (
                  <AlertTriangle size={16} className="validation-error" />
                )}
              </div>
            </div>
            {listNameValidation.message && (
              <div className={`validation-message ${
                listNameValidation.isValid === false ? 'error' : 'success'
              }`}>
                {listNameValidation.message}
              </div>
            )}
          </div>

    <div className="form-field">
      <label htmlFor="customAudience">Upload CSV File</label>
      <div className="file-upload-area">
        <input
          type="file"
          id="customAudience"
          name="customAudience"
          accept=".csv"
          onChange={handleFileUpload}
          ref={fileInputRef}
          className="file-input"
        />
        <div className="file-upload-content">
          <Upload size={24} />
          <div>
            <p className="upload-text">
              {fileName ? fileName : 'Drop your CSV file here or click to browse'}
            </p>
            <p className="upload-hint">Required fields: wanumber</p>
          </div>
        </div>
      </div>
    </div>

                  {validationErrors.length > 0 && (
                    <div className="alert alert-error">
                      <AlertTriangle size={16} />
                      <div>
                        <p>CSV Validation Errors:</p>
                        <ul>
                          {validationErrors.map((err, index) => (
                            <li key={index}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {csvFields.length > 0 && (
                    <div className="csv-preview">
                      <h4>CSV Preview</h4>
                      <p>Detected fields: {csvFields.join(', ')}</p>
                      <p className="contacts-loaded">{csvData.length} contacts loaded successfully</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Field Mapping Section */}
        {selectedTemplate && (
          <div className={`form-section ${sectionStates.mapping.completed ? 'completed' : ''} ${!sectionStates.mapping.completed && templateVariables.length > 0 && sectionStates.mapping.expanded ? 'incomplete' : ''}`}>
            <div className="section-header" onClick={() => toggleSection('mapping')}>
              <div className="section-info">
                <div className={`section-icon ${sectionStates.mapping.completed ? 'icon-completed' : ''}`}>
                  {sectionStates.mapping.completed ? <Check size={22} /> : <FileText size={22} />}
                </div>
                <div className="section-title">
                  <div className="section-title-row">
                    <h3>3. Map Template Variables</h3>
                    {sectionStates.mapping.completed && (
                      <span className="section-badge completed-badge">
                        <Check size={14} />
                        Completed
                      </span>
                    )}
                  </div>
                  <p>Connect template placeholders with contact data</p>
                  {!sectionStates.mapping.completed && templateVariables.length > 0 && sectionStates.mapping.expanded && (
                    <span className="section-error">
                      <AlertTriangle size={14} />
                      Please map all template variables to contact fields
                    </span>
                  )}
                </div>
              </div>
              <div className="section-controls">
                {sectionStates.mapping.completed && templateVariables.length > 0 && (
                  <span className="selected-item">
                    <FileText size={14} />
                    {templateVariables.length} variables mapped
                  </span>
                )}
                {templateVariables.length === 0 && (
                  <span className="selected-item">
                    <Check size={14} />
                    No variables to map
                  </span>
                )}
                <div className={`section-toggle ${sectionStates.mapping.expanded ? 'expanded' : ''}`}>
                  {sectionStates.mapping.expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>
            </div>

            {sectionStates.mapping.expanded && (
              <div className="section-content">
                {templateVariables.length > 0 ? (
                  <FieldMapper
                    templateVariables={templateVariables}
                    contactFields={formData.audienceType === 'custom' ? csvFields : contactFields}
                    onMappingChange={handleMappingChange}
                    initialMappings={formData.fieldMappings}
                    variableSamples={getVariableSamples()}
                  />
                ) : (
                  <div className="no-mapping-needed">
                    <div className="info-card">
                      <Check size={24} />
                      <div>
                        <h4>No Variable Mapping Required</h4>
                        <p>This template doesn't contain any variables that need to be mapped to contact fields.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Delivery Options Section */}
        <div className={`form-section ${sectionStates.delivery.completed ? 'completed' : ''} ${!sectionStates.delivery.completed && sectionStates.delivery.expanded ? 'incomplete' : ''}`}>
          <div className="section-header" onClick={() => toggleSection('delivery')}>
            <div className="section-info">
              <div className={`section-icon ${sectionStates.delivery.completed ? 'icon-completed' : ''}`}>
                {sectionStates.delivery.completed ? <Check size={22} /> : <Send size={22} />}
              </div>
              <div className="section-title">
                <div className="section-title-row">
                  <h3>4. Delivery Settings</h3>
                  {sectionStates.delivery.completed && (
                    <span className="section-badge completed-badge">
                      <Check size={14} />
                      Completed
                    </span>
                  )}
                </div>
                <p>Configure when and how to send your campaign</p>
                {!sectionStates.delivery.completed && sectionStates.delivery.expanded && (
                  <span className="section-error">
                    <AlertTriangle size={14} />
                    {!formData.campaignName 
                      ? 'Campaign name is required' 
                      : !formData.sendNow && (!formData.scheduledDate || !formData.scheduledTime)
                        ? 'Please set schedule date and time'
                        : 'Delivery settings are required'
                    }
                  </span>
                )}
              </div>
            </div>
            <div className="section-controls">
              {sectionStates.delivery.completed && (
                <span className="selected-item">
                  <Send size={14} />
                  {formData.sendNow ? 'Send Immediately' : `Scheduled for ${formData.scheduledDate} at ${formData.scheduledTime}`}
                </span>
              )}
              <div className={`section-toggle ${sectionStates.delivery.expanded ? 'expanded' : ''}`}>
                {sectionStates.delivery.expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
            </div>
          </div>

          {sectionStates.delivery.expanded && (
            <div className="section-content">
              <div className="form-field">
                <label htmlFor="campaignName">Campaign Name <span className="required">*</span></label>
                <input
                  type="text"
                  id="campaignName"
                  name="campaignName"
                  value={formData.campaignName}
                  onChange={handleInputChange}
                  placeholder="Enter a name for your campaign"
                  className={`input-field ${!formData.campaignName || formData.campaignName.trim() === '' ? 'error' : ''}`}
                  required
                />
                {(!formData.campaignName || formData.campaignName.trim() === '') && (
                  <p className="field-error">Campaign name is required</p>
                )}
              </div>

              <div className="delivery-timing">
                <label className={`timing-option ${formData.sendNow ? 'selected' : ''}`}>
                  <input
                    type="checkbox"
                    name="sendNow"
                    checked={formData.sendNow}
                    onChange={handleInputChange}
                  />
                  <div className="option-content">
                    <div className="option-title">Send Immediately</div>
                    <div className="option-description">Start sending messages right away</div>
                  </div>
                </label>

                {!formData.sendNow && (
                  <div className="schedule-fields">
                    <div className="form-row">
                      <div className="form-field">
                        <label htmlFor="scheduledDate">
                          <Calendar size={16} />
                          Date <span className="required">*</span>
                        </label>
                        <input
                          type="date"
                          id="scheduledDate"
                          name="scheduledDate"
                          value={formData.scheduledDate}
                          onChange={handleInputChange}
                          min={new Date().toISOString().split('T')[0]}
                          className={`input-field ${!formData.scheduledDate ? 'error' : ''}`}
                          required={!formData.sendNow}
                        />
                        {!formData.scheduledDate && !formData.sendNow && (
                          <p className="field-error">Schedule date is required</p>
                        )}
                      </div>

                      <div className="form-field">
                        <label htmlFor="scheduledTime">
                          <Clock size={16} />
                          Time <span className="required">*</span>
                        </label>
                        <input
                          type="time"
                          id="scheduledTime"
                          name="scheduledTime"
                          value={formData.scheduledTime}
                          onChange={handleInputChange}
                          className={`input-field ${!formData.scheduledTime ? 'error' : ''}`}
                          required={!formData.sendNow}
                        />
                        {!formData.scheduledTime && !formData.sendNow && (
                          <p className="field-error">Schedule time is required</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Campaign Summary */}
        {Object.values(sectionStates).some(section => section.completed) && (
          <div className="campaign-summary">
            <h3>Campaign Summary</h3>
            <div className="summary-grid">
              {selectedTemplate && (
                <div className="summary-item">
                  <FileText size={16} />
                  <div>
                    <span className="summary-label">Template</span>
                    <span className="summary-value">{selectedTemplate.name}</span>
                  </div>
                </div>
              )}
              
              {sectionStates.audience.completed && (
                <div className="summary-item">
                  <Users size={16} />
                  <div>
                    <span className="summary-label">Audience</span>
                    <span className="summary-value">
                      {formData.audienceType === 'all' 
                        ? `${contacts.length} contacts` 
                        : formData.audienceType === 'list'
                          ? `${contactLists.find(l => l.id === formData.contactList)?.contactCount || 0} contacts`
                          : `${csvData.length} contacts`
                      }
                    </span>
                  </div>
                </div>
              )}

              {sectionStates.delivery.completed && (
                <div className="summary-item">
                  <Send size={16} />
                  <div>
                    <span className="summary-label">Delivery</span>
                    <span className="summary-value">
                      {formData.sendNow ? 'Immediate' : `${formData.scheduledDate} at ${formData.scheduledTime}`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleSaveAsDraft}
            disabled={isLoading || isDraftSaving || !formData.templateId}
          >
            {isDraftSaving ? 'Saving...' : 'Save as Draft'}
          </button>
          
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading || !Object.values(sectionStates).every(section => section.completed)}
          >
            {isLoading ? 'Sending...' : 'Send Campaign'}
            <Send size={16} />
          </button>
        </div>
      </form>

      {/* Template Selection Modal */}
      {showTemplateSelection && (
        <TemplateSelectionModal
          templates={templates}
          onClose={() => setShowTemplateSelection(false)}
          onSelect={handleTemplateSelect}
        />
      )}

      {/* Campaign Progress Modal */}
      {showProgress && currentCampaignId && (
        <CampaignProgress
          campaignId={currentCampaignId}
          onComplete={handleProgressComplete}
          onClose={handleCloseProgress}
        />
      )}

      {/* Media Upload Modal */}
     <MediaUploadModal
  isOpen={showMediaUpload}
  onClose={() => setShowMediaUpload(false)}
  fileType={selectedMedia}
  progress={uploadProgress}
  onUpload={handleMediaUpload} // Add this prop
/>
    </div>
  );
}

// Helper function to extract variables from template text
function extractVariables(text) {
  if (!text) return [];
  const regex = /\{\{([^}]+)\}\}/g;
  const matches = [];
  let match;
  while (match = regex.exec(text)) {
    matches.push(match[1]);
  }
  return [...new Set(matches)];
}
// Debounce utility function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export default SendMessage;