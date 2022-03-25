/**
 * Remove ANSI colors/styles
 *
 * @param {string} text
 * @returns {string} The text which has no ANSI colors/styles
 */
function removeColors (text) {
  // https://stackoverflow.com/questions/25245716/remove-all-ansi-colors-styles-from-strings
  return text.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, ''); // eslint-disable-line no-control-regex
}

export { removeColors };
