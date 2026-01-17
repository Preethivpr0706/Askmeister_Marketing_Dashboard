/**
 * Phone number normalization utility
 * Normalizes phone numbers to a consistent format for matching
 * Removes +, spaces, and ensures consistent format
 */
function normalizePhoneNumber(phoneNumber) {
  if (!phoneNumber) return null;
  
  // Convert to string and remove all non-digit characters except +
  let normalized = String(phoneNumber).trim();
  
  // Remove leading + if present
  if (normalized.startsWith('+')) {
    normalized = normalized.substring(1);
  }
  
  // Remove all non-digit characters
  normalized = normalized.replace(/\D/g, '');
  
  return normalized || null;
}

/**
 * Compare two phone numbers after normalization
 */
function comparePhoneNumbers(phone1, phone2) {
  const normalized1 = normalizePhoneNumber(phone1);
  const normalized2 = normalizePhoneNumber(phone2);
  
  if (!normalized1 || !normalized2) return false;
  
  return normalized1 === normalized2;
}

module.exports = {
  normalizePhoneNumber,
  comparePhoneNumbers
};
