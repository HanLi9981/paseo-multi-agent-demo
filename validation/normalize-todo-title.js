'use strict';

/**
 * Normalizes a TODO title.
 *
 * - String input: trimmed of leading/trailing whitespace, inner whitespace preserved.
 * - Empty or whitespace-only strings: null.
 * - Non-string input: null.
 *
 * @param {unknown} input
 * @returns {string|null}
 */
function normalizeTodoTitle(input) {
  if (typeof input !== 'string') {
    return null;
  }

  const trimmed = input.trim();

  if (trimmed === '') {
    return null;
  }

  return trimmed;
}

module.exports = normalizeTodoTitle;
module.exports.normalizeTodoTitle = normalizeTodoTitle;
