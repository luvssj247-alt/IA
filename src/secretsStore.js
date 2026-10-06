// In-memory secrets store. Keys are NOT persisted to disk or logs.
let _key = null;

function setKey(k) {
  if (!k || typeof k !== 'string') return false;
  _key = k;
  return true;
}

function getKey() {
  return _key;
}

function hasKey() {
  return !!_key;
}

function getMaskedKey() {
  if (!_key) return null;
  if (_key.length <= 8) return _key.replace(/.(?=.{2})/g, '*');
  return `${_key.slice(0, 4)}...${_key.slice(-4)}`;
}

module.exports = { setKey, getKey, hasKey, getMaskedKey };
