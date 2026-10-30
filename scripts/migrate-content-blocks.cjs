// Conservative, repeatable migration of literal grouped View surfaces only.
// No handler, condition, data expression or native input is modified.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const write = process.argv.includes('--write');
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory()
  ? (e.name === '__tests__' ? [] : walk(path.join(dir, e.name))) : [path.join(dir, e.name)]);
const outer = { margin:'margin', marginTop:'marginTop', marginBottom:'marginBottom', marginHorizontal:'marginHorizontal', marginVertical:'marginVertical', flex:'flex', flexGrow:'grow', flexShrink:'shrink', alignSelf:'alignSelf', maxWidth:'maxWidth', width:'width' };
const inner = { gap:'gap', flexDirection:'dir', alignItems:'align', justifyContent:'justify', flexWrap:'wrap' };
const cosmetics = new Set(['backgroundColor','borderRadius','borderCurve','borderWidth','borderColor','shadowColor','shadowOpacity','shadowRadius','shadowOffset','elevation','overflow','padding','paddingHorizontal','paddingVertical']);
const attr = (name, p, sf) => name === 'wrap' ? 'wrap' : `${name}={${p.initializer.getText(sf)}}`;
for (const file of walk('src/screens').concat(walk('src/components')).filter(f => f.endsWith('.tsx') && !f.includes('.stories.') && !['ContentBlock.tsx','ActionBlock.tsx','TabDock.tsx'].includes(path.basename(f)))) {
  const source = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits = [];
  let usesWrapper = false;
  let usesContent = false;
  let usesAction = false;
  function visit(n) {
    if (ts.isJsxElement(n) && ['View','Pressable'].includes(n.openingElement.tagName.getText(sf))) {
      const action = n.openingElement.tagName.getText(sf) === 'Pressable';
      const attrs = n.openingElement.attributes.properties;
      const style = attrs.find(a => ts.isJsxAttribute(a) && a.name.getText(sf) === 'style');
      let expr = style?.initializer?.expression;
      if (action && expr && ts.isArrowFunction(expr)) expr = ts.isParenthesizedExpression(expr.body) ? expr.body.expression : expr.body;
      if (expr && ts.isObjectLiteralExpression(expr) && expr.properties.every(p => ts.isPropertyAssignment(p))) {
        const props = Object.fromEntries(expr.properties.map(p => [p.name.getText(sf), p]));
        const keys = Object.keys(props);
        const others = attrs.filter(a => a !== style);
        if (props.backgroundColor?.initializer.getText(sf) === 'T.cardBg'
          && Number(props.borderRadius?.initializer.getText(sf)) >= 10
          && others.every(a => ts.isJsxAttribute(a) && (action ? ['key','onPress','disabled','accessibilityLabel','accessibilityHint','accessibilityRole'] : ['key','accessibilityLiveRegion']).includes(a.name.getText(sf)))
          && keys.every(k => cosmetics.has(k) || k in outer || k in inner || (action && k === 'opacity') || (k === 'minWidth' && props[k].initializer.getText(sf) === '0'))
          && ['padding','paddingHorizontal','paddingVertical'].every(k => !props[k] || /^\d+$/.test(props[k].initializer.getText(sf)))
          && (!props.borderColor || ['T.cardBorder','T.separator'].includes(props.borderColor.initializer.getText(sf)))
        ) {
          const out = keys.filter(k => k in outer).map(k => attr(outer[k],props[k],sf));
          const inside = keys.filter(k => k in inner).map(k => attr(inner[k],props[k],sf));
          const key = others.find(a => a.name.getText(sf) === 'key');
          const live = others.find(a => a.name.getText(sf) === 'accessibilityLiveRegion');
          const pad = Number(props.padding?.initializer.getText(sf) ?? props.paddingHorizontal?.initializer.getText(sf) ?? props.paddingVertical?.initializer.getText(sf) ?? 0);
          const size = pad === 0 ? 'flush' : pad < 16 ? 'compact' : 'regular';
          const wrap = out.length > 0;
          if (key && wrap) out.push(key.getText(sf));
          const blockAttrs = [`size="${size}"`, ...(file.includes('/map/') ? ['elevated'] : []), ...(key && !wrap ? [key.getText(sf)] : []), ...(live ? [live.getText(sf)] : []), ...(action ? others.filter(a => a !== key).map(a => a.getText(sf)) : [])];
          const component = action ? 'ActionBlock' : 'ContentBlock';
          const open = `${wrap ? `<Wrapper ${out.join(' ')}>` : ''}<${component} ${blockAttrs.join(' ')}>${inside.length ? `<Wrapper ${inside.join(' ')}>` : ''}`;
          const close = `${inside.length ? '</Wrapper>' : ''}</${component}>${wrap ? '</Wrapper>' : ''}`;
          edits.push({ start: n.openingElement.getStart(sf), end: n.openingElement.end, text: open });
          edits.push({ start: n.closingElement.getStart(sf), end: n.closingElement.end, text: close });
          usesWrapper ||= wrap || inside.length > 0;
          usesContent ||= !action;
          usesAction ||= action;
        }
      }
    }
    ts.forEachChild(n, visit);
  }
  visit(sf);
  if (!edits.length) continue;
  let result = source;
  for (const e of edits.sort((a,b) => b.start - a.start)) result = result.slice(0,e.start) + e.text + result.slice(e.end);
  const relative = path.relative(path.dirname(file), 'src/components');
  const base = relative ? relative + '/' : './';
  if (usesContent && !/import\s*\{[^}]*\bContentBlock\b[^}]*\}/.test(source)) result = `import { ContentBlock } from '${base}ContentBlock';\n` + result;
  if (usesAction && !/import\s*\{[^}]*\bActionBlock\b[^}]*\}/.test(source)) result = `import { ActionBlock } from '${base}ActionBlock';\n` + result;
  if (usesWrapper && !/import\s*\{[^}]*\bWrapper\b[^}]*\}/.test(source)) result = `import { Wrapper } from '${base}Wrapper';\n` + result;
  console.log(`${file}: ${edits.length / 2} surfaces`);
  if (write) fs.writeFileSync(file, result);
}
