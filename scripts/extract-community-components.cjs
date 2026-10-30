// One-time mechanical extraction. Rendering and callback expressions are preserved.
const fs = require('node:fs');
const ts = require('typescript');
const sourcePath = 'src/screens/community/CommunityHomeScreen.tsx';
let source = fs.readFileSync(sourcePath, 'utf8');
const names = { Loading:'ContentLoading', EmptyOrError:'ContentEmptyState', ActiveChallengeCard:'ActiveChallengeCard', PersonalActivityCard:'PersonalActivityCard', ChallengeCard:'CommunityChallengeCard', HomeFeed:'CommunityFeed', ChallengesTab:'CommunityChallenges', TripCardH:'CommunityTripCard', TripsTab:'CommunityTrips', MeetupsTab:'CommunityMeetups', SportTab:'CommunitySport', ChannelTab:'CommunityChannels', ChannelRow:'CommunityChannelRow' };
for (const [oldName,newName] of Object.entries(names)) source = source.replace(new RegExp(`\\b${oldName}\\b`, 'g'),newName);
const sf = ts.createSourceFile(sourcePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const funcs = sf.statements.filter(n => ts.isFunctionDeclaration(n) && Object.values(names).includes(n.name?.text));
if (!funcs.length) { console.log('Already extracted'); process.exit(0); }
const imports = sf.statements.filter(ts.isImportDeclaration);
const navType = "type Nav = NativeStackScreenProps<CommunityStackParams, 'CommunityHome'>['navigation'];";
const hero = sf.statements.find(n => ts.isVariableStatement(n) && n.getText(sf).includes('const HERO_TEXT_SHADOW'));
for (const fn of funcs) {
  const name = fn.name.text;
  let body = 'export ' + fn.getText(sf);
  const ids = new Set();
  const collect = n => { if (ts.isIdentifier(n)) ids.add(n.text); ts.forEachChild(n, collect); };
  collect(fn);
  if (ids.has('Nav')) { ids.add('NativeStackScreenProps'); ids.add('CommunityStackParams'); }
  const kept = [];
  for (const imp of imports) {
    const clause = imp.importClause;
    if (!clause) continue;
    const parts = [];
    if (clause.name && (clause.name.text === 'React' || ids.has(clause.name.text))) parts.push(clause.name.text);
    if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings) && ids.has(clause.namedBindings.name.text)) parts.push(clause.namedBindings.getText(sf));
    if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
      const list = clause.namedBindings.elements.filter(e => ids.has(e.name.text));
      if (list.length) parts.push('{ ' + list.map(e => e.getText(sf)).join(', ') + ' }');
    }
    if (parts.length) {
      const mod = imp.moduleSpecifier.text.replace('../../components/', './').replace(/^\.\.\/\.\.\//,'../');
      kept.push(`import ${parts.join(', ')} from '${mod}';`);
    }
  }
  for (const other of Object.values(names)) if (other !== name && ids.has(other)) kept.push(`import { ${other} } from './${other}';`);
  fs.writeFileSync(`src/components/${name}.tsx`, kept.join('\n') + '\n\n' + (ids.has('Nav') ? navType + '\n' : '') + (ids.has('HERO_TEXT_SHADOW') ? hero.getText(sf) + '\n' : '') + body + '\n');
}
const cut = [...funcs,hero].filter(Boolean).sort((a,b) => b.getFullStart()-a.getFullStart());
for(const n of cut) source = source.slice(0,n.getFullStart()) + source.slice(n.end);
const used = Object.values(names).filter(name => new RegExp(`\\b${name}\\b`).test(source));
source = used.map(name => `import { ${name} } from '../../components/${name}';`).join('\n') + '\n' + source;
fs.writeFileSync(sourcePath,source);
console.log(`Extracted ${funcs.length} components`);
