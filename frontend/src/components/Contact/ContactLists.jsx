import { useState, useEffect } from 'react';
import { contactService } from '../../api/contactService';
import { Trash2, Loader, ChevronRight, UserPlus, Search, ChevronLeft, Edit, MoreVertical, AlertTriangle } from 'lucide-react';
import './ContactLists.css';
import AddListModal from './AddListModal';
import AddContactModal from './AddContactModal';
import EditContactModal from './EditContactModal';
import EditListModal from './EditListModal';
import DeleteConfirmationModal from './DeleteConfirmationModal';

const ContactLists = () => {
  const [lists, setLists] = useState([]);
  const [selectedList, setSelectedList] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddListModal, setShowAddListModal] = useState(false);
  const [isAddingList, setIsAddingList] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [isEditListModalOpen, setIsEditListModalOpen] = useState(false);
  const [editingList, setEditingList] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleteType, setDeleteType] = useState(''); // 'contact' or 'list'
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalContacts, setTotalContacts] = useState(0);
  const [selectedContacts, setSelectedContacts] = useState(new Set());

  // Fetch lists on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const listsResponse = await contactService.getLists();
        setLists(listsResponse.data);
      } catch (err) {
        setError(err.message || 'Failed to load contact lists');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch contacts when a list is selected
  useEffect(() => {
    if (selectedList) {
      const fetchContacts = async () => {
        try {
          setIsLoading(true);
          const contactsResponse = await contactService.getContacts(selectedList);
          setContacts(contactsResponse.data);
          setSelectedContacts(new Set()); // Clear selections when list changes
        } catch (err) {
          setError(err.message || 'Failed to load contacts');
        } finally {
          setIsLoading(false);
        }
      };
      fetchContacts();
    }
  }, [selectedList]);

  const handleDelete = (contact) => {
    setDeleteItem(contact);
    setDeleteType('Contact');
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      setIsLoading(true); // Set loading state
      if (deleteType === 'Contact' && deleteItem) {
        await contactService.deleteContact(deleteItem.id);
        setContacts(contacts.filter(c => c.id !== deleteItem.id));
        setSuccessMessage('Contact deleted successfully');
      } else if (deleteType === 'List' && deleteItem) {
        await contactService.deleteList(deleteItem.id);

        // Remove the list from local state
        setLists(lists.filter(l => l.id !== deleteItem.id));

        // If the deleted list was selected, clear selection
        if (selectedList === deleteItem.id) {
          setSelectedList(null);
          setContacts([]);
        }

        setSuccessMessage('List deleted successfully');
      } else if (deleteType === 'Bulk' && selectedContacts.size > 0) {
        const idsToDelete = Array.from(selectedContacts);
        const response = await contactService.deleteContacts(idsToDelete);
        setContacts(contacts.filter(c => !selectedContacts.has(c.id)));
        setSelectedContacts(new Set());
        setSuccessMessage(`Successfully deleted ${response.deletedCount || idsToDelete.length} contact(s)`);
      }
    } catch (error) {
      setError(error.message || `Failed to delete ${deleteType.toLowerCase()}`);
    } finally {
      // Reset delete modal state and loading
      setIsDeleteModalOpen(false);
      setDeleteItem(null);
      setDeleteType('');
      setIsLoading(false);
    }
  };

  const handleEditContact = (contact) => {
    setEditingContact(contact);
    setIsEditModalOpen(true);
  };

  const handleSaveEditContact = async (contactId, contactData) => {
    try {
      setIsLoading(true);
      await contactService.updateContact(contactId, contactData);

      // Update the contact in the local state
      setContacts(contacts.map(c =>
        c.id === contactId ? { ...c, ...contactData } : c
      ));

      setSuccessMessage('Contact updated successfully');
      setIsEditModalOpen(false);
      setEditingContact(null);
    } catch (error) {
      setError(error.message || 'Failed to update contact');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditList = (list) => {
    setEditingList(list);
    setIsEditListModalOpen(true);
  };

  const handleDeleteList = (list, e) => {
    e.stopPropagation(); // Prevent list selection when clicking delete
    setDeleteItem(list);
    setDeleteType('List');
    setIsDeleteModalOpen(true);
  };

  const handleSaveEditList = async (listId, listData) => {
    try {
      setIsLoading(true);
      await contactService.updateList(listId, listData);

      // Update the list in the local state
      setLists(lists.map(l =>
        l.id === listId ? { ...l, ...listData } : l
      ));

      setSuccessMessage('List updated successfully');
      setIsEditListModalOpen(false);
      setEditingList(null);
    } catch (error) {
      setError(error.message || 'Failed to update list');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddList = async (listName) => {
    try {
      setIsAddingList(true);
      const response = await contactService.createList({ name: listName });
      setLists(prevLists => [...prevLists, response.data]);
      setSuccessMessage('List created successfully');
    } catch (err) {
      setError(err.message || 'Failed to create list');
      throw err;
    } finally {
      setIsAddingList(false);
    }
  };

  const handleSaveContact = async (contactData) => {
    try {
      setIsLoading(true);
      let listId = contactData.listId;
      
      // Create new list if needed
      if (contactData.newListName && !contactData.listId) {
        const response = await contactService.createList({ name: contactData.newListName });
        listId = response.data.id;
        setLists(prevLists => [...prevLists, response.data]);
      }
      
      // Create the contact
      const { newListName, ...rest } = contactData;
      const newContact = await contactService.createContact({
        ...rest,
        listId,
        newListName: null
      });

      // If the contact's list is currently selected, add it to the contacts array
      if (selectedList === listId) {
        setContacts(prevContacts => [...prevContacts, newContact.data]);
      }

      setSuccessMessage('Contact added successfully');
      setIsModalOpen(false);

      // Refresh contacts if we're viewing the list the contact was added to
      if (selectedList === listId) {
        const contactsResponse = await contactService.getContacts(listId);
        setContacts(contactsResponse.data);
      }
    } catch (error) {
      setError(error.message || 'Failed to save contact');
    } finally {
      setIsLoading(false);
    }
  };

  // Extract custom fields from contacts (fields that are not fixed)
  const fixedFields = ['id', 'fname', 'lname', 'wanumber', 'email', 'list_id', 'subscribed', 'list_name', 'created_at', 'updated_at'];
  const getCustomFields = () => {
    if (contacts.length === 0) return [];
    const allKeys = new Set();
    contacts.forEach(contact => {
      Object.keys(contact).forEach(key => {
        if (!fixedFields.includes(key)) {
          allKeys.add(key);
        }
      });
    });
    return Array.from(allKeys);
  };
  const customFields = getCustomFields();

  const filteredContacts = contacts.filter(contact => {
    const fullName = `${contact.fname} ${contact.lname}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || 
           contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           contact.wanumber.includes(searchTerm);
    
    // Also search in custom fields
    if (!matchesSearch && customFields.length > 0) {
      return customFields.some(field => {
        const value = contact[field];
        return value && value.toString().toLowerCase().includes(searchTerm.toLowerCase());
      });
    }
    return matchesSearch;
  });

  // Calculate pagination values
  const totalPages = Math.ceil(filteredContacts.length / itemsPerPage);
  const indexOfLastContact = currentPage * itemsPerPage;
  const indexOfFirstContact = indexOfLastContact - itemsPerPage;
  const currentContacts = filteredContacts.slice(indexOfFirstContact, indexOfLastContact);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const handleSelectContact = (contactId) => {
    setSelectedContacts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contactId)) {
        newSet.delete(contactId);
      } else {
        newSet.add(contactId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedContacts.size === currentContacts.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(currentContacts.map(c => c.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedContacts.size === 0) {
      setError('Please select at least one contact to delete');
      return;
    }
    setDeleteType('Bulk');
    setIsDeleteModalOpen(true);
  };

  return (
    <div className="contact-lists-container">
      <h1 className="page-title">Contact Management</h1>
      
      {error && (
        <div className="error-message">
          <span>{error}</span>
          <button className="error-close-btn" onClick={() => setError('')}>×</button>
        </div>
      )}

      {successMessage && (
        <div className="success-message">
          <span>{successMessage}</span>
          <button className="success-close-btn" onClick={() => setSuccessMessage('')}>×</button>
        </div>
      )}
      
      <div className="lists-container">
        {/* Left Sidebar */}
        <div className="lists-sidebar">
          <div className="sidebar-header">
            <h2>Your Lists</h2>
          </div>
          
          {isLoading && lists.length === 0 ? (
            <div className="loading-container">
              <Loader className="loading-spinner" />
            </div>
          ) : (
            <ul className="lists-items">
              {lists.map(list => (
                <li
                  key={list.id}
                  className={`list-item ${selectedList === list.id ? 'active' : ''}`}
                  onClick={() => setSelectedList(list.id)}
                >
                  <span>{list.name}</span>
                  <div className="list-item-actions">
                    {selectedList === list.id && (
                      <ChevronRight className="list-item-indicator" />
                    )}
                    <div className="list-item-buttons">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditList(list);
                        }}
                        className="list-edit-btn"
                        title="Edit list"
                      >
                        <Edit className="list-action-icon" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteList(list, e)}
                        className="list-delete-btn"
                        title="Delete list"
                      >
                        <Trash2 className="list-action-icon" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          
          <div className="add-list-container">
            <button 
              className="add-list-btn"
              onClick={() => setShowAddListModal(true)}
            >
              <UserPlus className="add-icon" />
              Add New List
            </button>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="contacts-main">
          {isLoading && selectedList ? (
            <div className="loading-container full">
              <Loader className="loading-spinner large" />
            </div>
          ) : selectedList ? (
            <>
              <div className="contacts-header">
                <h3 className="contacts-title">
                  {lists.find(l => l.id === selectedList)?.name} Contacts
                  {selectedContacts.size > 0 && (
                    <span className="selected-count">({selectedContacts.size} selected)</span>
                  )}
                </h3>
                
                <div className="contacts-actions">
                  <div className="search-container">
                    <div className="search-icon-wrapper">
                      <Search className="search-icon" />
                    </div>
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Search contacts..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  {selectedContacts.size > 0 && (
                    <button
                      onClick={handleBulkDelete}
                      className="bulk-delete-btn"
                    >
                      <Trash2 className="delete-icon" />
                      Delete Selected ({selectedContacts.size})
                    </button>
                  )}
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="add-contact-btn"
                  >
                    <UserPlus className="add-icon" />
                    Add Contact
                  </button>
                </div>
              </div>

              <div className="table-container">
                {filteredContacts.length > 0 ? (
                  <>
                    <table className="contacts-table">
                      <thead>
                        <tr>
                          <th className="col-checkbox">
                            <input
                              type="checkbox"
                              checked={currentContacts.length > 0 && selectedContacts.size === currentContacts.length}
                              onChange={handleSelectAll}
                              className="checkbox-input"
                            />
                          </th>
                          <th className="col-name">Name</th>
                          <th className="col-whatsapp">WhatsApp</th>
                          <th className="col-email">Email</th>
                          {customFields.map(field => (
                            <th key={field} className="col-custom" title={field}>
                              {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </th>
                          ))}
                          <th className="col-status">Status</th>
                          <th className="col-actions">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentContacts.map(contact => (
                          <tr key={contact.id} className={`contact-row ${selectedContacts.has(contact.id) ? 'selected' : ''}`}>
                            <td className="col-checkbox">
                              <input
                                type="checkbox"
                                checked={selectedContacts.has(contact.id)}
                                onChange={() => handleSelectContact(contact.id)}
                                className="checkbox-input"
                              />
                            </td>
                            <td className="col-name">
                              <div className="contact-name">
                                {contact.fname} {contact.lname}
                              </div>
                            </td>
                            <td className="col-whatsapp">
                              <div className="contact-whatsapp">{contact.wanumber}</div>
                            </td>
                            <td className="col-email">
                              <div className="contact-email">{contact.email}</div>
                            </td>
                            {customFields.map(field => {
                              const fieldValue = contact[field];
                              // Handle different value types safely
                              let displayValue = '-';
                              if (fieldValue !== null && fieldValue !== undefined && fieldValue !== '') {
                                if (typeof fieldValue === 'object') {
                                  // If it's an object, stringify it (shouldn't happen but handle it)
                                  displayValue = JSON.stringify(fieldValue);
                                } else {
                                  displayValue = String(fieldValue);
                                }
                              }
                              return (
                                <td key={field} className="col-custom">
                                  <div className="contact-custom-field" title={displayValue}>
                                    {displayValue}
                                  </div>
                                </td>
                              );
                            })}
                            <td className="col-status">
                              <div className={`subscription-status ${contact.subscribed ? 'subscribed' : 'unsubscribed'}`}>
                                {contact.subscribed ? (
                                  <>
                                    <span className="status-badge subscribed-badge">Subscribed</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="status-badge unsubscribed-badge">Unsubscribed</span>
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="col-actions">
                              <button
                                onClick={() => handleEditContact(contact)}
                                className="edit-btn"
                              >
                                <Edit className="edit-icon" />
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(contact)}
                                className="delete-btn"
                              >
                                <Trash2 className="delete-icon" />
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="pagination-container">
                      <div className="pagination-info">
                        Showing {indexOfFirstContact + 1} to {Math.min(indexOfLastContact, filteredContacts.length)} of {filteredContacts.length} entries
                      </div>
                      
                      <div className="pagination-controls">
                        <button
                          className="pagination-button"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft size={16} />
                        </button>

                        {[...Array(totalPages)].map((_, index) => (
                          <button
                            key={index + 1}
                            className={`pagination-button ${currentPage === index + 1 ? 'active' : ''}`}
                            onClick={() => handlePageChange(index + 1)}
                          >
                            {index + 1}
                          </button>
                        ))}

                        <button
                          className="pagination-button"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                        >
                          <ChevronRight size={16} />
                        </button>

                        <select
                          className="per-page-select"
                          value={itemsPerPage}
                          onChange={handleItemsPerPageChange}
                        >
                          <option value={5}>5 per page</option>
                          <option value={10}>10 per page</option>
                          <option value={25}>25 per page</option>
                          <option value={50}>50 per page</option>
                        </select>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="empty-contacts">
                    <div className="empty-contacts-icon">
                      <UserPlus size={48} />
                    </div>
                    <h3 className="empty-contacts-title">No contacts in this list</h3>
                    <p className="empty-contacts-message">
                      Get started by adding your first contact
                    </p>
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="btn btn-primary"
                    >
                      <UserPlus className="add-icon" />
                      Add Contact
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="no-list-selected">
              <div className="no-list-icon">
                <UserPlus size={48} />
              </div>
              <p className="no-list-title">Select a List</p>
              <p className="no-list-subtitle">Choose a contact list from the sidebar to view and manage contacts</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddListModal && (
        <AddListModal
          onClose={() => setShowAddListModal(false)}
          onAdd={handleAddList}
          isLoading={isAddingList}
        />
      )}

      <AddContactModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveContact}
        existingLists={lists}
      />

      <EditContactModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingContact(null);
        }}
        onSave={handleSaveEditContact}
        contact={editingContact}
        existingLists={lists}
      />

      <EditListModal
        isOpen={isEditListModalOpen}
        onClose={() => {
          setIsEditListModalOpen(false);
          setEditingList(null);
        }}
        onSave={handleSaveEditList}
        list={editingList}
        isLoading={isLoading}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeleteItem(null);
          setDeleteType('');
        }}
        onConfirm={handleConfirmDelete}
        itemType={deleteType === 'Bulk' ? 'Bulk' : deleteType}
        itemName={deleteType === 'Bulk' 
          ? `${selectedContacts.size} contact(s)` 
          : deleteItem ? (deleteType === 'Contact' ? `${deleteItem.fname} ${deleteItem.lname}` : deleteItem.name) : ''}
        isLoading={isLoading}
      />
    </div>
  );
};

export default ContactLists;
