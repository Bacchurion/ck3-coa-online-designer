export function parseCoatScript(input) {
  let i = 0;
  const s = input;

  const isSpace = c => /\s/.test(c);
  const isDigit = c => /[0-9]/.test(c);
  const isIdentStart = c => /[A-Za-z_]/.test(c);
  const isIdentChar  = c => /[A-Za-z0-9_\-]/.test(c);

  function skipWS() { while (i < s.length && isSpace(s[i])) i++; }

  function expect(ch) {
    skipWS();
    if (s[i] !== ch) throw new Error(`Expected '${ch}' at ${i}, got '${s[i] || 'EOF'}'`);
    i++;
  }

  function readString() {
    expect('"');
    let out = '';
    while (i < s.length && s[i] !== '"') {
      // (pas de gestion d’échappement nécessaire ici)
      out += s[i++];
    }
    expect('"');
    return out;
  }

  function readIdent() {
    skipWS();
    if (!isIdentStart(s[i])) throw new Error(`Identifier expected at ${i}`);
    let out = s[i++];
    while (i < s.length && isIdentChar(s[i])) out += s[i++];
    return out;
  }

  function readNumberMaybe() {
    skipWS();
    const start = i;
    if (s[i] === '+' || s[i] === '-') i++;
    let hasDigit = false;
    while (i < s.length && isDigit(s[i])) { hasDigit = true; i++; }
    if (s[i] === '.') {
      i++;
      while (i < s.length && isDigit(s[i])) { hasDigit = true; i++; }
    }
    if (!hasDigit) { i = start; return null; }
    const num = Number(s.slice(start, i));
    return Number.isNaN(num) ? null : num;
  }

  function readNumbersUntilCloseBrace() {
    const arr = [];
    while (true) {
      skipWS();
      if (s[i] === '}') { i++; break; }
      const n = readNumberMaybe();
      if (n === null) throw new Error(`Number expected inside {...} at ${i}`);
      arr.push(n);
    }
    return arr;
  }

  function parseArrayOrObject() {
    // on est sur '{'
    i++; // consume '{'
    // Tentative "tableau simple de nombres"
    const save = i;
    try {
      const arr = readNumbersUntilCloseBrace();
      return arr;
    } catch (_) {
      // pas un tableau de nombres → objet
      i = save;
    }

    const obj = {};
    while (true) {
      skipWS();
      if (s[i] === '}') { i++; break; }
      const key = readIdent();
      skipWS();
      expect('=');
      const val = parseValue();

      if (obj[key] === undefined) obj[key] = val;
      else obj[key] = Array.isArray(obj[key]) ? (obj[key].push(val), obj[key]) : [obj[key], val];
    }
    return obj;
  }

  function parseTypedBlock(typeIdent) {
    skipWS();
    expect('{');
    const values = readNumbersUntilCloseBrace();
    return { type: typeIdent, value: values };
  }

  function parseValue() {
    skipWS();
    const ch = s[i];

    if (ch === '"') return readString();
    if (ch === '{')  return parseArrayOrObject();

    // nombre ?
    const numTry = readNumberMaybe();
    if (numTry !== null) return numTry;

    // ident / bool / typed-block / mot nu (ex: red)
    const ident = readIdent();
    if (ident === 'yes') return true;
    if (ident === 'no')  return false;

    skipWS();
    if (s[i] === '{') {
      // bloc typé: ident{ ... }
      return parseTypedBlock(ident);
    }

    // mot non quoté (ex: 'red')
    return ident;
  }

  function parsePairsInto(target) {
    while (i < s.length) {
      skipWS();
      if (i >= s.length) break;

      // fin “implicite” si on rencontre '}' (géré en amont)
      if (s[i] === '}') break;

      const key = readIdent();
      skipWS();
      expect('=');
      const val = parseValue();

      if (target[key] === undefined) target[key] = val;
      else target[key] = Array.isArray(target[key]) ? (target[key].push(val), target[key]) : [target[key], val];
    }
    return target;
  }

  // entrée : généralement `custom_coat={ ... }`
  const result = {};
  parsePairsInto(result);

  const keys = Object.keys(result);
  return result[keys[0]];
}
