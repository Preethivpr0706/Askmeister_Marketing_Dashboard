import { useState, useEffect } from 'react';
import { contactService } from '../../api/contactService';
import { Loader, Search, UserX, UserCheck } from 'lucide-react';
import './ContactLists.css';

const UnsubscribedContacts = () => {
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchUnsubscribedContacts();
  }, []);

  const fetchUnsubscribedContacts = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await contactService.getUnsubscribedContacts();
      setContacts(response.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load unsubscribed contacts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResubscribe = async (contactId) => {
    try {
      setIsLoading(true);
      await contactService.resubscribeContact(contactId);
      setSuccessMessage('Contact resubscribed successfully');
      // Refresh the list
      await fetchUnsubscribedContacts();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to resubscribe contact');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter contacts based on search term
  const filteredContacts = contacts.filter(contact => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (contact.fname && contact.fname.toLowerCase().includes(searchLower)) ||
      (contact.lname && contact.lname.toLowerCase().includes(searchLower)) ||
      (contact.wanumber && contact.wanumber.includes(searchLower)) ||
      (contact.email && contact.email.toLowerCase().includes(searchLower))
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredContacts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentContacts = filteredContacts.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  return (
    <div className="contact-lists-container">
      <div className="page-header">
        <h1 className="page-title">Unsubscribed Contacts</h1>
        <p className="page-subtitle">Manage contacts who have opted out of receiving messages</p>
      </div>

      {error && (
        <div className="error-message">
          <span>{error}</span>
          <button onClick={() => setError('')} className="error-close-btn">×</button>
        </div>
      )}

      {successMessage && (
        <div className="success-message">
          <span>{successMessage}</span>
        </div>
      )}

      <div className="contacts-main">
        {isLoading ? (
          <div className="loading-container full">
            <Loader className="loading-spinner large" />
          </div>
        ) : (
          <>
            <div className="contacts-header">
              <h3 className="contacts-title">
                Unsubscribed Contacts ({filteredContacts.length})
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
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="table-container">
              {currentContacts.length > 0 ? (
                <>
                  <table className="contacts-table">
                    <thead>
                      <tr>
                        <th className="col-name">Name</th>
                        <th className="col-whatsapp">WhatsApp</th>
                        <th className="col-email">Email</th>
                        <th className="col-status">Status</th>
                        <th className="col-actions">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentContacts.map(contact => (
                        <tr key={contact.id} className="contact-row">
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
                          <td className="col-status">
                            <div className="subscription-status">
                              <span className="status-badge unsubscribed-badge">Unsubscribed</span>
                            </div>
                          </td>
                          <td className="col-actions">
                            <button
                              onClick={() => handleResubscribe(contact.id)}
                              className="resubscribe-btn"
                              title="Resubscribe contact"
                            >
                              <UserCheck className="resubscribe-icon" />
                              Resubscribe
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Pagination */}
                  <div className="pagination-container">
                    <div className="pagination-info">
                      Showing {startIndex + 1} to {Math.min(endIndex, filteredContacts.length)} of {filteredContacts.length} contacts
                    </div>
                    <div className="pagination-controls">
                      <button
                        className="pagination-button"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          className={`pagination-button ${currentPage === page ? 'active' : ''}`}
                          onClick={() => handlePageChange(page)}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        className="pagination-button"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </button>
                      <select
                        value={itemsPerPage}
                        onChange={handleItemsPerPageChange}
                        className="per-page-select"
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
                    <UserX size={48} />
                  </div>
                  <h3 className="empty-contacts-title">No unsubscribed contacts</h3>
                  <p className="empty-contacts-message">
                    All contacts are currently subscribed to receive messages
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UnsubscribedContacts;

