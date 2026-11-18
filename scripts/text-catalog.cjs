const acorn = require('acorn');
function catalog(html) {
  const source = html.slice(html.indexOf('const Ht ='), html.indexOf('</script>', html.indexOf('const Ht =')));
  const tree = acorn.parse(source, { ecmaVersion: 'latest' });
  const texts = new Set();
  const add = value => { if (typeof value === 'string' && /\p{L}/u.test(value) && value.length <= 3000) texts.add(value); };
  function collect(node) {
    if (!node) return;
    if (node.type === 'Literal') add(node.value);
    else if (node.type === 'TemplateLiteral') add(node.quasis.map((q, i) => q.value.cooked + (i < node.expressions.length ? `{${i}}` : '')).join(''));
    else if (node.type === 'ConditionalExpression') { collect(node.consequent); collect(node.alternate); }
    else if (node.type === 'ArrayExpression') node.elements.forEach(collect);
    else if (node.type === 'LogicalExpression') collect(node.right);
    // Object/call subtrees are visited separately, to exclude classes, IDs and URLs.
  }
  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'Property' && ['children', 'label', 'title', 'placeholder', 'aria-label'].includes(node.key.name || node.key.value)) collect(node.value);
    if (node.type === 'VariableDeclarator' && ['FRENCH_TEXT', 'ONL_REASON'].includes(node.id.name)) {
      for (const prop of node.init.properties) { if (node.id.name === 'FRENCH_TEXT') add(prop.key.value); collect(prop.value); }
    }
    if (node.type === 'CallExpression' && (node.callee.name === '$l' || node.callee.property?.name === 'confirm')) node.arguments.forEach(collect);
    if (node.type === 'CallExpression' && node.callee.name === 'Ll') collect(node.arguments[1]);
    if (node.type === 'AssignmentExpression' && node.left.property?.name === 'title') collect(node.right);
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === 'object') walk(value);
    }
  }
  add(html.match(/<title>([^<]*)<\/title>/)?.[1]);
  walk(tree);
  return [...texts].sort();
}
module.exports = catalog;
