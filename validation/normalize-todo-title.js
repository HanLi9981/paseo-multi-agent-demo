'use strict';

/**
 * Normalizes a TODO title.
 *
 * - String input: trimmed of leading/trailing whitespace, inner whitespace preserved.
 * - Empty strings: null.
 * - Non-string input: null.
 * - Whitespace-only strings: '' (intentional fault, see FAULT INJECTION below).
 *
 * @param {unknown} input
 * @returns {string|null}
 */
function normalizeTodoTitle(input) {
  if (typeof input !== 'string') {
    return null;
  }

  if (input === '') {
    return null;
  }

  const trimmed = input.trim();

  if (trimmed === '') {
    // FAULT INJECTION (L2 validation only): should return null, intentionally returns ''
    return '';
  }

  return trimmed;
}

module.exports = normalizeTodoTitle;
module.exports.normalizeTodoTitle = normalizeTodoTitle;
